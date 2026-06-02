# GitHub Webhook 整合設計文件

> 接收 GitHub push / pull_request / workflow_run 事件，自動關聯任務並發送通知。

---

## 目標

讓開發活動（代碼推送、PR、CI 結果）自動反映到專案管理系統中：
- push → 自動更新任務的 gitCommit
- pull_request → 自動更新任務的 gitPr
- workflow_run → CI 完成時自動通知負責人

---

## 架構

### 數據模型

**新增 `WebhookEvent` 模型：**

```prisma
model WebhookEvent {
  id        String   @id @default(uuid())
  projectId String
  eventType String        // push / pull_request / workflow_run
  action    String?       // opened / closed / completed / etc
  payload   String        // 原始 JSON payload（截斷至 10KB）
  status    String   @default("PENDING") // PENDING / PROCESSED / ERROR
  errorMsg  String?
  taskIds   String?       // 關聯到的任務 ID，逗號分隔
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, createdAt])
  @@index([status])
}
```

**在 `Project` 模型中添加關係：**

```prisma
model Project {
  // ... 現有字段
  webhookEvents WebhookEvent[]
}
```

### 後端路由

| 路由 | 認證 | 說明 |
|------|------|------|
| `POST /api/webhooks/github` | 無（簽名驗證） | 接收 GitHub Webhook 事件 |
| `GET /api/projects/:projectId/webhook-events` | JWT | 查詢該專案的 webhook 事件日誌（ADMIN/PM） |

**注意：** `/api/webhooks/github` 在 `index.ts` 中獨立註冊，不掛在 `/api/projects` 下，因為它不需要 JWT 認證。

### 簽名驗證中間件（混合模式）

```typescript
function verifyGitHubSignature(req, res, next) {
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  const signature = req.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return res.status(401).json({ error: 'Missing signature or secret' });
  }
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
}
```

### 事件處理流程

#### push 事件

1. 從每個 commit 的 message 中提取 `[TASK-XXX]`
2. 查找對應任務（`taskCode = 提取的代碼`）
3. 更新任務的 `gitCommit` 為最新 commit SHA
4. 發送通知：`GIT_COMMIT` 類型給任務負責人
5. 記錄 WebhookEvent（status = PROCESSED）

#### pull_request 事件

1. 從 PR title 中提取 `[TASK-XXX]`
2. 查找對應任務
3. 根據 action 更新：
   - `opened` / `synchronize` → 更新 `gitPr` 為 PR URL
   - `closed` + merged=true → 更新 `gitPr` 為 PR URL，發送 `GIT_PR_MERGED` 通知
   - `closed` + merged=false → 發送 `GIT_PR_CLOSED` 通知
4. 記錄 WebhookEvent

#### workflow_run 事件

1. 從 workflow run 的 head_commit message 中提取 `[TASK-XXX]`
2. 查找對應任務
3. 根據結論發送通知：
   - `success` → `CI_SUCCESS` 通知
   - `failure` → `CI_FAILED` 通知
4. 記錄 WebhookEvent

### 任務關聯正則

```typescript
const TASK_CODE_REGEX = /\[TASK-(\d{3,})\]/g;

function extractTaskCodes(text: string): string[] {
  const matches = text.matchAll(TASK_CODE_REGEX);
  return Array.from(matches).map(m => `TASK-${m[1]}`);
}
```

### 通知內容

| 事件 | 通知類型 | 標題 | 內容 |
|------|---------|------|------|
| push | `GIT_COMMIT` | 任務有新的 commit | `{commit message} by {author}` |
| PR 創建 | `GIT_PR_CREATED` | 任務有新的 PR | PR #{number}: {title} |
| PR 合併 | `GIT_PR_MERGED` | PR 已合併 | PR #{number} 已合併到 {branch} |
| CI 成功 | `CI_SUCCESS` | CI 通過 | Workflow "{name}" 成功完成 |
| CI 失敗 | `CI_FAILED` | CI 失敗 | Workflow "{name}" 失敗，請查看詳情 |

---

## 前端設計

### WebhookEvent 日誌 Tab

在專案詳情頁新增「Webhook 日誌」Tab，顯示最近收到的事件：

- 時間列（createdAt）
- 事件類型（eventType + action）
- 狀態（PENDING / PROCESSED / ERROR）
- 關聯任務（taskIds）
- 錯誤信息（如 status=ERROR）

使用 `n-data-table` 展示，按時間倒序排列。

---

## 文件清單

| 文件 | 操作 | 說明 |
|------|------|------|
| `backend/prisma/schema.prisma` | 修改 | 新增 WebhookEvent 模型，Project 添加關係 |
| `backend/src/routes/webhookRoutes.ts` | 創建 | Webhook 接收端點 + 事件處理邏輯 |
| `backend/src/middlewares/githubWebhook.ts` | 創建 | 簽名驗證中間件 |
| `backend/src/services/webhookProcessor.ts` | 創建 | 事件處理器（push/PR/workflow） |
| `backend/src/index.ts` | 修改 | 註冊 webhook 路由 |
| `frontend/src/types/index.ts` | 修改 | 新增 WebhookEvent 接口 |
| `frontend/src/services/api.ts` | 修改 | 新增 webhookEvents API |
| `frontend/src/views/ProjectDetail.vue` | 修改 | 新增「Webhook 日誌」Tab |
| `frontend/src/components/WebhookEventLog.vue` | 創建 | Webhook 事件日誌表格 |

---

## GitHub Webhook 配置說明

用戶需要在 GitHub repo 的 Settings → Webhooks 中配置：

- **Payload URL:** `https://your-app.com/api/webhooks/github`
- **Content type:** `application/json`
- **Secret:** 設置與 `GITHUB_WEBHOOK_SECRET` 環境變數相同的值
- **Events:** 勾選 `Pushes`、`Pull requests`、`Workflow runs`
