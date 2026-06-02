# GitHub Webhook 整合實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接收 GitHub push / pull_request / workflow_run 事件，自動關聯任務並發送通知，前端顯示 Webhook 事件日誌。

**Architecture:** 後端新增 Webhook 接收端點（帶簽名驗證）+ 事件處理器（提取任務代碼、更新字段、發送通知）+ WebhookEvent 日誌；前端新增 Webhook 日誌 Tab。

**Tech Stack:** Vue 3 + TypeScript + Naive UI / Express + Prisma + SQLite / crypto (HMAC-SHA256)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modify | 新增 WebhookEvent 模型，Project 添加關係 |
| `backend/src/middlewares/githubWebhook.ts` | Create | HMAC-SHA256 簽名驗證中間件（混合模式） |
| `backend/src/services/webhookProcessor.ts` | Create | 事件處理器：提取任務代碼、更新 Task、記錄日誌 |
| `backend/src/services/notifications.ts` | Modify | 新增 5 個 webhook 通知函數 |
| `backend/src/routes/webhookRoutes.ts` | Create | Webhook 接收端點 + 事件分發 |
| `backend/src/index.ts` | Modify | 註冊 webhook 路由（使用 express.raw 保留原始 body） |
| `frontend/src/types/index.ts` | Modify | 新增 WebhookEvent 接口 |
| `frontend/src/services/api.ts` | Modify | 新增 webhookEvents API |
| `frontend/src/components/WebhookEventLog.vue` | Create | Webhook 事件日誌表格 |
| `frontend/src/views/ProjectDetail.vue` | Modify | 新增「Webhook 日誌」Tab |

---

## Task 1: Prisma Schema — 新增 WebhookEvent 模型

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: 在 schema 底部新增 WebhookEvent 模型**

在 `backend/prisma/schema.prisma` 的 `Document` 模型之後添加：

```prisma
model WebhookEvent {
  id        String   @id @default(uuid())
  projectId String
  eventType String
  action    String?
  payload   String
  status    String   @default("PENDING")
  errorMsg  String?
  taskIds   String?
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt])
  @@index([status])
}
```

- [ ] **Step 2: 在 Project 模型添加關係**

在 `Project` 模型的 `documents Document[]` 下方添加：

```prisma
  webhookEvents WebhookEvent[]
```

- [ ] **Step 3: 執行遷移和生成**

```bash
cd backend
npx prisma migrate dev --name add_webhook_event
npx prisma generate
```

Expected: 遷移成功，SQLite 資料庫更新，Prisma Client 重新生成。

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add WebhookEvent model"
```

---

## Task 2: 簽名驗證中間件 — githubWebhook.ts

**Files:**
- Create: `backend/src/middlewares/githubWebhook.ts`

**Context：** GitHub Webhook 使用 HMAC-SHA256 簽名驗證。開發環境跳過驗證，生產環境嚴格驗證。

**注意：** Express 的 `express.json()` 會將原始 body 轉為對象，導致無法驗證簽名。Webhook 路由必須使用 `express.raw({ type: 'application/json' })` 先保留原始 body，再在中間件中手動解析 JSON。

- [ ] **Step 1: 創建簽名驗證中間件**

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

export function verifyGitHubWebhook(req: Request, res: Response, next: NextFunction) {
  // 開發環境跳過驗證
  if (process.env.NODE_ENV === 'development') {
    req.body = JSON.parse(req.body);
    return next();
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  if (!GITHUB_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  req.body = JSON.parse(req.body);
  next();
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/middlewares/githubWebhook.ts
git commit -m "feat(webhook): add GitHub webhook signature verification middleware"
```

---

## Task 3: 事件處理器 — webhookProcessor.ts

**Files:**
- Create: `backend/src/services/webhookProcessor.ts`

**Context：** 處理三種事件（push / pull_request / workflow_run），提取 `[TASK-XXX]` 關聯任務，更新 Task 字段，發送通知，記錄 WebhookEvent 日誌。

- [ ] **Step 1: 創建事件處理器**

```typescript
import { prisma } from './prisma.js';
import * as notifications from './notifications.js';

const TASK_CODE_REGEX = /\[TASK-(\d{3,})\]/g;

function extractTaskCodes(text: string): string[] {
  const matches = text.matchAll(TASK_CODE_REGEX);
  return Array.from(matches).map(m => `TASK-${m[1]}`);
}

async function findProjectByRepo(repoFullName: string) {
  return prisma.project.findFirst({
    where: { githubRepo: repoFullName },
    select: { id: true },
  });
}

async function findTasksByCodes(projectId: string, codes: string[]) {
  return prisma.task.findMany({
    where: { projectId, taskCode: { in: codes } },
    include: { assignee: { select: { id: true, name: true } } },
  });
}

async function recordWebhookEvent(data: {
  projectId: string;
  eventType: string;
  action?: string;
  payload: string;
  status: string;
  errorMsg?: string;
  taskIds?: string;
}) {
  return prisma.webhookEvent.create({ data });
}

// ─── push 事件處理 ───
export async function handlePush(payload: any) {
  const repo = payload.repository?.full_name;
  if (!repo) return;

  const project = await findProjectByRepo(repo);
  if (!project) return;

  const commits = payload.commits || [];
  const allCodes = new Set<string>();
  const latestCommitByCode: Record<string, { sha: string; message: string; author: string }> = {};

  for (const commit of commits) {
    const codes = extractTaskCodes(commit.message);
    for (const code of codes) {
      allCodes.add(code);
      latestCommitByCode[code] = {
        sha: commit.id?.slice(0, 7) || '',
        message: commit.message,
        author: commit.author?.name || '',
      };
    }
  }

  const codes = Array.from(allCodes);
  if (codes.length === 0) {
    await recordWebhookEvent({
      projectId: project.id,
      eventType: 'push',
      payload: JSON.stringify(payload).slice(0, 10000),
      status: 'PROCESSED',
      taskIds: '',
    });
    return;
  }

  const tasks = await findTasksByCodes(project.id, codes);
  for (const task of tasks) {
    const commit = latestCommitByCode[task.taskCode];
    if (commit) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gitCommit: commit.sha },
      });
      if (task.assigneeId) {
        await notifications.notifyGitCommit(project.id, task.id, task.title, commit.sha, commit.message, commit.author, task.assigneeId);
      }
    }
  }

  await recordWebhookEvent({
    projectId: project.id,
    eventType: 'push',
    payload: JSON.stringify(payload).slice(0, 10000),
    status: 'PROCESSED',
    taskIds: tasks.map(t => t.id).join(','),
  });
}

// ─── pull_request 事件處理 ───
export async function handlePullRequest(payload: any) {
  const repo = payload.repository?.full_name;
  const action = payload.action;
  const pr = payload.pull_request;
  if (!repo || !pr) return;

  const project = await findProjectByRepo(repo);
  if (!project) return;

  const codes = extractTaskCodes(pr.title);
  const tasks = codes.length > 0 ? await findTasksByCodes(project.id, codes) : [];

  for (const task of tasks) {
    const prUrl = pr.html_url;
    if (['opened', 'synchronize', 'reopened'].includes(action)) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gitPr: prUrl },
      });
      if (task.assigneeId) {
        await notifications.notifyGitPrCreated(project.id, task.id, task.title, pr.number, pr.title, task.assigneeId);
      }
    } else if (action === 'closed' && pr.merged) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gitPr: prUrl },
      });
      if (task.assigneeId) {
        await notifications.notifyGitPrMerged(project.id, task.id, task.title, pr.number, pr.merged_commit_sha?.slice(0, 7) || '', task.assigneeId);
      }
    }
  }

  await recordWebhookEvent({
    projectId: project.id,
    eventType: 'pull_request',
    action,
    payload: JSON.stringify(payload).slice(0, 10000),
    status: 'PROCESSED',
    taskIds: tasks.map(t => t.id).join(',') || '',
  });
}

// ─── workflow_run 事件處理 ───
export async function handleWorkflowRun(payload: any) {
  const repo = payload.repository?.full_name;
  const run = payload.workflow_run;
  if (!repo || !run) return;

  const project = await findProjectByRepo(repo);
  if (!project) return;

  // 從 head_commit message 提取任務代碼
  const codes = extractTaskCodes(run.head_commit?.message || '');
  const tasks = codes.length > 0 ? await findTasksByCodes(project.id, codes) : [];

  const conclusion = run.conclusion;
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    if (conclusion === 'success') {
      await notifications.notifyCiSuccess(project.id, task.id, task.title, run.name, run.html_url, task.assigneeId);
    } else if (conclusion === 'failure') {
      await notifications.notifyCiFailed(project.id, task.id, task.title, run.name, run.html_url, task.assigneeId);
    }
  }

  await recordWebhookEvent({
    projectId: project.id,
    eventType: 'workflow_run',
    action: run.conclusion || run.status,
    payload: JSON.stringify(payload).slice(0, 10000),
    status: 'PROCESSED',
    taskIds: tasks.map(t => t.id).join(',') || '',
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/webhookProcessor.ts
git commit -m "feat(webhook): add event processor for push/PR/workflow_run"
```

---

## Task 4: 新增通知函數

**Files:**
- Modify: `backend/src/services/notifications.ts`

**Context：** 在現有通知服務基礎上新增 5 個 webhook 相關通知函數。

- [ ] **Step 1: 在 notifications.ts 底部添加新函數**

```typescript
export async function notifyGitCommit(projectId: string, taskId: string, taskTitle: string, commitSha: string, commitMessage: string, author: string, notifyUserId: string) {
  await createNotification({
    userId: notifyUserId,
    type: 'GIT_COMMIT',
    title: '任務有新的 commit',
    content: `${commitMessage} by ${author}`,
    relatedType: 'TASK',
    relatedId: taskId,
    projectId,
  });
}

export async function notifyGitPrCreated(projectId: string, taskId: string, taskTitle: string, prNumber: number, prTitle: string, notifyUserId: string) {
  await createNotification({
    userId: notifyUserId,
    type: 'GIT_PR_CREATED',
    title: '任務有新的 PR',
    content: `PR #${prNumber}: ${prTitle}`,
    relatedType: 'TASK',
    relatedId: taskId,
    projectId,
  });
}

export async function notifyGitPrMerged(projectId: string, taskId: string, taskTitle: string, prNumber: number, commitSha: string, notifyUserId: string) {
  await createNotification({
    userId: notifyUserId,
    type: 'GIT_PR_MERGED',
    title: 'PR 已合併',
    content: `PR #${prNumber} 已合併 (commit: ${commitSha})`,
    relatedType: 'TASK',
    relatedId: taskId,
    projectId,
  });
}

export async function notifyCiSuccess(projectId: string, taskId: string, taskTitle: string, workflowName: string, runUrl: string, notifyUserId: string) {
  await createNotification({
    userId: notifyUserId,
    type: 'CI_SUCCESS',
    title: 'CI 通過',
    content: `Workflow "${workflowName}" 成功完成`,
    relatedType: 'TASK',
    relatedId: taskId,
    projectId,
  });
}

export async function notifyCiFailed(projectId: string, taskId: string, taskTitle: string, workflowName: string, runUrl: string, notifyUserId: string) {
  await createNotification({
    userId: notifyUserId,
    type: 'CI_FAILED',
    title: 'CI 失敗',
    content: `Workflow "${workflowName}" 失敗，請查看詳情`,
    relatedType: 'TASK',
    relatedId: taskId,
    projectId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/services/notifications.ts
git commit -m "feat(webhook): add notification functions for git/CI events"
```

---

## Task 5: Webhook 接收路由 — webhookRoutes.ts

**Files:**
- Create: `backend/src/routes/webhookRoutes.ts`
- Modify: `backend/src/index.ts`

**Context：** 創建接收端點，分發事件到對應處理器。需要獨立於其他路由註冊（不需要 JWT 認證）。

- [ ] **Step 1: 創建 webhook 路由**

```typescript
import { Router } from 'express';
import { verifyGitHubWebhook } from '../middlewares/githubWebhook.js';
import { handlePush, handlePullRequest, handleWorkflowRun } from '../services/webhookProcessor.js';

const router = Router();

// POST /api/webhooks/github
router.post('/github', verifyGitHubWebhook, async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'] as string;
    const payload = req.body;

    switch (eventType) {
      case 'push':
        await handlePush(payload);
        break;
      case 'pull_request':
        await handlePullRequest(payload);
        break;
      case 'workflow_run':
        await handleWorkflowRun(payload);
        break;
      default:
        // 忽略不關心的事件
        break;
    }

    res.status(200).json({ message: 'OK' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: 在 index.ts 中註冊 webhook 路由**

在 `backend/src/index.ts` 中，在 `app.use(cors(...))` 之後、其他 API 路由之前添加：

```typescript
// Webhook routes (raw body needed for signature verification)
import webhookRoutes from './routes/webhookRoutes.js';

app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRoutes);
```

**注意：** `express.raw()` 必須在 `express.json()` **之前**註冊，否則 webhook 路由的 body 會被 `express.json()` 先解析為對象。

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/webhookRoutes.ts backend/src/index.ts
git commit -m "feat(webhook): add GitHub webhook receiver endpoint"
```

---

## Task 6: Webhook 事件日誌 API

**Files:**
- Create: `backend/src/routes/webhookEventRoutes.ts`

**Context：** 讓前端查詢專案的 webhook 事件日誌。需要 JWT 認證。

- [ ] **Step 1: 創建路由**

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { prisma } from '../services/prisma.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/webhook-events
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const events = await prisma.webhookEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: 在 index.ts 註冊**

在 `backend/src/index.ts` 的 `/api/projects/:projectId/cicd` 路由下方添加：

```typescript
import webhookEventRoutes from './routes/webhookEventRoutes.js';
// ...
app.use('/api/projects/:projectId/webhook-events', webhookEventRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/webhookEventRoutes.ts backend/src/index.ts
git commit -m "feat(webhook): add webhook event log API"
```

---

## Task 7: 前端類型和 API

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: 在 types/index.ts 新增 WebhookEvent 接口**

```typescript
export interface WebhookEvent {
  id: string;
  projectId: string;
  eventType: string;
  action?: string;
  payload: string;
  status: string;
  errorMsg?: string;
  taskIds?: string;
  createdAt: string;
}
```

- [ ] **Step 2: 在 services/api.ts 新增 API**

```typescript
export const webhookApi = {
  getEvents: (projectId: string) =>
    api.get<WebhookEvent[]>(`/projects/${projectId}/webhook-events`),
};
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts
git commit -m "feat(webhook): add WebhookEvent type and API"
```

---

## Task 8: 前端組件 — WebhookEventLog.vue

**Files:**
- Create: `frontend/src/components/WebhookEventLog.vue`

- [ ] **Step 1: 創建組件**

```vue
<template>
  <div>
    <n-data-table
      :columns="columns"
      :data="events"
      :pagination="{ pageSize: 10 }"
      size="small"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WebhookEvent } from '../types';
import { NDataTable, NTag } from 'naive-ui';
import { h } from 'vue';

const props = defineProps<{
  events: WebhookEvent[];
}>();

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    push: 'Push',
    pull_request: 'Pull Request',
    workflow_run: 'Workflow Run',
  };
  return map[type] || type;
}

function eventTypeTagType(type: string) {
  const map: Record<string, string> = {
    push: 'info',
    pull_request: 'warning',
    workflow_run: 'success',
  };
  return map[type] || 'default';
}

function statusTagType(status: string) {
  const map: Record<string, string> = {
    PROCESSED: 'success',
    PENDING: 'warning',
    ERROR: 'error',
  };
  return map[status] || 'default';
}

const columns = [
  {
    title: '時間',
    key: 'createdAt',
    width: 120,
    render(row: WebhookEvent) {
      return formatDate(row.createdAt);
    },
  },
  {
    title: '事件',
    key: 'eventType',
    width: 130,
    render(row: WebhookEvent) {
      return h(NTag, { type: eventTypeTagType(row.eventType), size: 'small' }, {
        default: () => eventTypeLabel(row.eventType),
      });
    },
  },
  {
    title: '動作',
    key: 'action',
    width: 100,
    render(row: WebhookEvent) {
      return row.action || '-';
    },
  },
  {
    title: '狀態',
    key: 'status',
    width: 100,
    render(row: WebhookEvent) {
      return h(NTag, { type: statusTagType(row.status), size: 'small' }, {
        default: () => row.status,
      });
    },
  },
  {
    title: '關聯任務',
    key: 'taskIds',
    render(row: WebhookEvent) {
      return row.taskIds || '-';
    },
  },
  {
    title: '錯誤',
    key: 'errorMsg',
    render(row: WebhookEvent) {
      return row.errorMsg || '-';
    },
  },
];
</script>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/WebhookEventLog.vue
git commit -m "feat(webhook): add WebhookEventLog component"
```

---

## Task 9: ProjectDetail 集成 Webhook 日誌 Tab

**Files:**
- Modify: `frontend/src/views/ProjectDetail.vue`

- [ ] **Step 1: 添加 import**

```typescript
import WebhookEventLog from '../components/WebhookEventLog.vue';
import { webhookApi } from '../services/api';
```

- [ ] **Step 2: 添加數據和加載邏輯**

在 `<script setup>` 中添加：

```typescript
const webhookEvents = ref<WebhookEvent[]>([]);

async function loadWebhookEvents() {
  if (!project.value) return;
  try {
    const res = await webhookApi.getEvents(project.value.id);
    webhookEvents.value = res.data;
  } catch (e) {
    // 忽略錯誤
  }
}
```

在 `loadProject` 函數末尾調用 `loadWebhookEvents()`（與其他數據加載一起）。

- [ ] **Step 3: 添加 Tab pane**

在 `<n-tabs>` 的 timeline Tab 之後添加：

```vue
<!-- Webhook 日誌 Tab -->
<n-tab-pane name="webhooks" tab="Webhook 日誌">
  <WebhookEventLog :events="webhookEvents" />
</n-tab-pane>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/ProjectDetail.vue
git commit -m "feat(webhook): add webhook event log tab to ProjectDetail"
```

---

## Self-Review

### 1. Spec Coverage

| Spec 需求 | 對應 Task |
|-----------|-----------|
| WebhookEvent 模型 | Task 1 |
| 簽名驗證（混合模式） | Task 2 |
| push 事件處理 | Task 3 |
| pull_request 事件處理 | Task 3 |
| workflow_run 事件處理 | Task 3 |
| 通知函數 | Task 4 |
| Webhook 接收端點 | Task 5 |
| 事件日誌 API | Task 6 |
| WebhookEvent 類型 | Task 7 |
| WebhookEventLog 組件 | Task 8 |
| ProjectDetail 集成 | Task 9 |

**無遺漏。**

### 2. Placeholder Scan

- 無 TBD/TODO
- 無 "implement later"
- 所有步驟包含實際代碼
- 無 "Similar to Task N"

### 3. Type Consistency

- `WebhookEvent` 在前端類型、後端 Prisma、API 返回中名稱一致
- `webhookApi.getEvents` 返回 `WebhookEvent[]`
- `WebhookEventLog` 接收 `WebhookEvent[]`

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-02-github-webhook-integration.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
