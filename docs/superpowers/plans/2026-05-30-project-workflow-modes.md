# 專案管理模式（瀑布/敏捷/混合）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓系統支援三種專案管理模式（瀑布式/敏捷式/混合型），建立專案時選擇模式，自動生成對應階段，動態看板依模式渲染，並根據當前階段限制任務類型。

**Architecture:** 資料層擴充 `Project.mode` 與 `ProjectPhase` 模型，Task 新增 `phaseId` 標記所屬階段。後端在建立專案時依模式自動生成預設階段，Task API 依當前活躍階段驗證任務類型。前端 TaskBoard 依模式動態決定欄位（瀑布式按 phase 分組，敏捷/混合按 status 分組），並全面改為淺色主題。

**Tech Stack:** Vue 3 + Naive UI (frontend), Express + Prisma + SQLite (backend)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `backend/prisma/schema.prisma` | 擴充 Project.mode、ProjectPhase 模型、Task.phaseId |
| `backend/src/routes/projectRoutes.ts` | 建立專案時接受 mode，自動生成預設 phases，GET 包含 phases |
| `backend/src/routes/phaseRoutes.ts` | **新建** Phase CRUD + 階段推進 API |
| `backend/src/routes/taskRoutes.ts` | 創建任務時依當前 phase 驗證類型，自動設 phaseId |
| `backend/src/index.ts` | 註冊 phaseRoutes |
| `frontend/src/types/index.ts` | 新增 ProjectPhase 介面，Project 新增 mode |
| `frontend/src/services/api.ts` | 新增 phaseApi |
| `frontend/src/views/ProjectList.vue` | 新增專案模式下拉選擇，表格顯示模式標籤 |
| `frontend/src/views/ProjectDetail.vue` | 顯示階段流程/當前階段/推進按鈕，動態過濾任務類型 |
| `frontend/src/components/TaskBoard.vue` | 重構為模式感知的動態看板 + 淺色主題 |

---

## Task 1: Prisma Schema 擴充

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: 修改 schema.prisma 擴充模型**

在 `Project` 模型中新增 `mode` 欄位與 `phases` 關聯；新增 `ProjectPhase` 模型；在 `Task` 模型中新增 `phaseId` 與 `phase` 關聯。

完整修改後的 `schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      String   @default("DEVELOPER")
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  createdRequirements Requirement[] @relation("RequirementCreator")
  assignedTasks       Task[]        @relation("TaskAssignee")
  createdBugs         Bug[]         @relation("BugCreator")
  assignedBugs        Bug[]         @relation("BugAssignee")
}

model Project {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  status      String   @default("PLANNING")
  mode        String   @default("HYBRID")
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requirements Requirement[]
  tasks        Task[]
  testCases    TestCase[]
  bugs         Bug[]
  phases       ProjectPhase[]
}

model ProjectPhase {
  id               String   @id @default(uuid())
  projectId        String
  name             String
  order            Int
  status           String   @default("PENDING")
  startedAt        DateTime?
  completedAt      DateTime?
  allowedTaskTypes String?

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks    Task[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([projectId, order])
}

model Requirement {
  id          String   @id @default(uuid())
  projectId   String
  reqCode     String
  title       String
  description String?
  priority    String   @default("P2")
  status      String   @default("DRAFT")
  type        String   @default("FUNCTIONAL")
  createdById String

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdBy User    @relation("RequirementCreator", fields: [createdById], references: [id])
  tasks     Task[]
  bugs      Bug[]
  testCases TestCase[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, reqCode])
}

model Task {
  id            String    @id @default(uuid())
  projectId     String
  taskCode      String
  title         String
  description   String?
  type          String    @default("DEVELOPMENT")
  status        String    @default("TODO")
  priority      String    @default("P2")
  requirementId String?
  assigneeId    String?
  phaseId       String?

  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requirement   Requirement?  @relation(fields: [requirementId], references: [id])
  assignee      User?         @relation("TaskAssignee", fields: [assigneeId], references: [id])
  phase         ProjectPhase? @relation(fields: [phaseId], references: [id])
  bugs          Bug[]

  plannedHours  Float?
  actualHours   Float?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([projectId, taskCode])
}

model TestCase {
  id             String   @id @default(uuid())
  projectId      String
  tcCode         String
  title          String
  precondition   String?
  steps          String
  expectedResult String
  requirementId  String?

  project     Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requirement Requirement?  @relation(fields: [requirementId], references: [id])
  executions  TestExecution[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, tcCode])
}

model TestExecution {
  id           String   @id @default(uuid())
  testCaseId   String
  result       String
  actualResult String?
  executedBy   String
  executedAt   DateTime @default(now())
  bugId        String? @unique

  testCase TestCase @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
  bug      Bug?     @relation(fields: [bugId], references: [id])
}

model Bug {
  id            String   @id @default(uuid())
  projectId     String
  bugCode       String
  title         String
  description   String
  severity      String   @default("MEDIUM")
  priority      String   @default("P2")
  status        String   @default("NEW")
  requirementId String?
  taskId        String?
  createdById   String
  assigneeId    String?

  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requirement   Requirement?  @relation(fields: [requirementId], references: [id])
  task          Task?         @relation(fields: [taskId], references: [id])
  createdBy     User          @relation("BugCreator", fields: [createdById], references: [id])
  assignee      User?         @relation("BugAssignee", fields: [assigneeId], references: [id])
  testExecution TestExecution?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([projectId, bugCode])
}
```

- [ ] **Step 2: 執行 Prisma migration**

```bash
cd /Users/hwte/.claude/projects/數位化專案管理系統/backend
npx prisma migrate dev --name add_project_mode_and_phases
```

Expected output: Migration created and applied successfully.

- [ ] **Step 3: 重新生成 Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 4: Commit**

```bash
cd /Users/hwte/.claude/projects/數位化專案管理系統
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add Project.mode, ProjectPhase model, Task.phaseId"
```

---

## Task 2: 後端 Project API — 模式選擇與自動生成階段

**Files:**
- Modify: `backend/src/routes/projectRoutes.ts`

- [ ] **Step 1: 修改 POST /api/projects 接受 mode 並自動生成階段**

完整替換 `backend/src/routes/projectRoutes.ts`：

```typescript
import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

// 各模式的預設階段配置
const DEFAULT_PHASES: Record<string, Array<{ name: string; allowedTaskTypes: string | null }>> = {
  WATERFALL: [
    { name: '需求分析', allowedTaskTypes: 'REQUIREMENT_DOC,DOCUMENTATION' },
    { name: '系統設計', allowedTaskTypes: 'DESIGN,DOCUMENTATION' },
    { name: '開發實作', allowedTaskTypes: 'DEVELOPMENT,BUG_FIX' },
    { name: '測試驗證', allowedTaskTypes: 'TESTING,BUG_FIX' },
    { name: '發布上線', allowedTaskTypes: 'DOCUMENTATION,OPERATION' },
  ],
  AGILE: [
    { name: 'Sprint 迭代', allowedTaskTypes: null },
  ],
  HYBRID: [
    { name: '需求分析', allowedTaskTypes: 'REQUIREMENT_DOC,DOCUMENTATION' },
    { name: '系統設計', allowedTaskTypes: 'DESIGN,DOCUMENTATION' },
    { name: '迭代開發', allowedTaskTypes: null },
    { name: '驗收測試', allowedTaskTypes: 'TESTING,BUG_FIX' },
    { name: '發布上線', allowedTaskTypes: 'DOCUMENTATION,OPERATION' },
  ],
};

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { requirements: true, tasks: true, bugs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        requirements: true,
        tasks: true,
        bugs: true,
        phases: { orderBy: { order: 'asc' } },
      },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { code, name, description, mode } = req.body;
    const projectMode = (mode || 'HYBRID').toUpperCase();

    // 驗證 mode 值
    if (!['WATERFALL', 'AGILE', 'HYBRID'].includes(projectMode)) {
      return res.status(400).json({ error: 'Invalid project mode. Must be WATERFALL, AGILE, or HYBRID.' });
    }

    // 建立專案（使用 transaction）
    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: { code, name, description, mode: projectMode },
      });

      // 自動生成預設階段
      const phases = DEFAULT_PHASES[projectMode];
      for (let i = 0; i < phases.length; i++) {
        const phaseData = phases[i];
        await tx.projectPhase.create({
          data: {
            projectId: proj.id,
            name: phaseData.name,
            order: i + 1,
            status: i === 0 ? 'ACTIVE' : 'PENDING',
            startedAt: i === 0 ? new Date() : null,
            allowedTaskTypes: phaseData.allowedTaskTypes,
          },
        });
      }

      return proj;
    });

    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: 測試 — 建立一個瀑布式專案並檢查階段是否生成**

```bash
# 啟動後端（如果還沒啟動）
cd /Users/hwte/.claude/projects/數位化專案管理系統/backend
npm run dev &

# 等待服務啟動
sleep 3

# 測試建立瀑布式專案（需要先登入取得 token，或直接用測試 token）
# 如果無法直接測試，手動在瀏覽器中測試
```

手動測試方式：啟動前後端後，在瀏覽器中登入，進入專案列表，新增專案時選擇「瀑布式」，然後查看該專案詳情頁面確認有 5 個階段顯示。

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/projectRoutes.ts
git commit -m "feat(api): project creation accepts mode and auto-generates phases"
```

---

## Task 3: 後端 Phase API

**Files:**
- Create: `backend/src/routes/phaseRoutes.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: 新建 phaseRoutes.ts**

建立 `backend/src/routes/phaseRoutes.ts`：

```typescript
import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/phases
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
    res.json(phases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/phases/current
router.get('/current', async (req, res) => {
  try {
    const { projectId } = req.params;
    const phase = await prisma.projectPhase.findFirst({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { order: 'asc' },
    });
    if (!phase) {
      return res.status(404).json({ error: 'No active phase found' });
    }
    res.json(phase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/phases/:id/advance
// 將當前階段標記為完成，並啟動下一階段
router.post('/:id/advance', async (req, res) => {
  try {
    const { projectId, id } = req.params;

    const currentPhase = await prisma.projectPhase.findFirst({
      where: { id, projectId, status: 'ACTIVE' },
    });

    if (!currentPhase) {
      return res.status(400).json({ error: 'Phase is not active or does not exist' });
    }

    const nextPhase = await prisma.projectPhase.findFirst({
      where: { projectId, order: { gt: currentPhase.order }, status: 'PENDING' },
      orderBy: { order: 'asc' },
    });

    if (!nextPhase) {
      return res.status(400).json({ error: 'No next phase available. This is the final phase.' });
    }

    // 更新當前階段為完成，啟動下一階段
    await prisma.$transaction([
      prisma.projectPhase.update({
        where: { id: currentPhase.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      prisma.projectPhase.update({
        where: { id: nextPhase.id },
        data: { status: 'ACTIVE', startedAt: new Date() },
      }),
    ]);

    const updatedPhases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    res.json({ phases: updatedPhases, message: `Advanced from "${currentPhase.name}" to "${nextPhase.name}"` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: 在 index.ts 中註冊 phase 路由**

修改 `backend/src/index.ts`，在現有路由註冊後新增 phase 路由：

```typescript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import requirementRoutes from './routes/requirementRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import bugRoutes from './routes/bugRoutes.js';
import userRoutes from './routes/userRoutes.js';
import phaseRoutes from './routes/phaseRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/phases', phaseRoutes);
app.use('/api/projects/:projectId/requirements', requirementRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/bugs', bugRoutes);
app.use('/api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/phaseRoutes.ts backend/src/index.ts
git commit -m "feat(api): add phase routes — list, current, advance"
```

---

## Task 4: 後端 Task API — 階段限制

**Files:**
- Modify: `backend/src/routes/taskRoutes.ts`

- [ ] **Step 1: 修改 POST 任務時依當前階段驗證類型並自動設 phaseId**

完整替換 `backend/src/routes/taskRoutes.ts`：

```typescript
import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/tasks
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/tasks
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { taskCode, title, description, type, priority, requirementId, assigneeId, plannedHours } = req.body;

    // 取得專案資訊與當前活躍階段
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: {
          where: { status: 'ACTIVE' },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const activePhase = project.phases[0];

    // 如果有活躍階段且有限制，驗證任務類型
    if (activePhase && activePhase.allowedTaskTypes) {
      const allowedTypes = activePhase.allowedTaskTypes.split(',');
      const taskType = (type || 'DEVELOPMENT').toUpperCase();
      if (!allowedTypes.includes(taskType)) {
        return res.status(400).json({
          error: `Task type "${taskType}" is not allowed in phase "${activePhase.name}". Allowed types: ${allowedTypes.join(', ')}`,
        });
      }
    }

    const count = await prisma.task.count({ where: { projectId } });
    const code = taskCode || `TASK-${String(count + 1).padStart(3, '0')}`;

    const task = await prisma.task.create({
      data: {
        projectId,
        taskCode: code,
        title,
        description,
        type: type || 'DEVELOPMENT',
        priority: priority || 'P2',
        requirementId,
        assigneeId,
        plannedHours,
        phaseId: activePhase?.id || null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.update({
      where: { id },
      data: req.body,
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
    });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/taskRoutes.ts
git commit -m "feat(api): validate task type against current phase, auto-assign phaseId"
```

---

## Task 5: 前端 Types 與 API 服務

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: 更新 types/index.ts**

完整替換 `frontend/src/types/index.ts`：

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  mode: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  phases?: ProjectPhase[];
  _count?: {
    requirements: number;
    tasks: number;
    bugs: number;
  };
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  order: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  allowedTaskTypes?: string;
  _count?: {
    tasks: number;
  };
}

export interface Requirement {
  id: string;
  projectId: string;
  reqCode: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  type: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    bugs: number;
  };
}

export interface Task {
  id: string;
  projectId: string;
  taskCode: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  requirementId?: string;
  assigneeId?: string;
  phaseId?: string;
  assignee?: { id: string; name: string };
  requirement?: { id: string; reqCode: string; title: string };
  phase?: { id: string; name: string };
  plannedHours?: number;
  actualHours?: number;
  createdAt: string;
}

export interface Bug {
  id: string;
  projectId: string;
  bugCode: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  requirementId?: string;
  taskId?: string;
  createdById: string;
  assigneeId?: string;
  assignee?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
```

- [ ] **Step 2: 更新 api.ts 新增 phaseApi**

完整替換 `frontend/src/services/api.ts`：

```typescript
import axios from 'axios';
import type { LoginResponse, Project, ProjectPhase, Requirement, Task, Bug, User } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<{ user: import('../types').User }>('/auth/me'),
};

export const projectApi = {
  getAll: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
};

export const phaseApi = {
  getAll: (projectId: string) =>
    api.get<ProjectPhase[]>(`/projects/${projectId}/phases`),
  getCurrent: (projectId: string) =>
    api.get<ProjectPhase>(`/projects/${projectId}/phases/current`),
  advance: (projectId: string, phaseId: string) =>
    api.post<{ phases: ProjectPhase[]; message: string }>(`/projects/${projectId}/phases/${phaseId}/advance`),
};

export const requirementApi = {
  getAll: (projectId: string) =>
    api.get<Requirement[]>(`/projects/${projectId}/requirements`),
  create: (projectId: string, data: Partial<Requirement>) =>
    api.post<Requirement>(`/projects/${projectId}/requirements`, data),
  update: (projectId: string, id: string, data: Partial<Requirement>) =>
    api.put<Requirement>(`/projects/${projectId}/requirements/${id}`, data),
};

export const taskApi = {
  getAll: (projectId: string) =>
    api.get<Task[]>(`/projects/${projectId}/tasks`),
  create: (projectId: string, data: Partial<Task>) =>
    api.post<Task>(`/projects/${projectId}/tasks`, data),
  update: (projectId: string, id: string, data: Partial<Task>) =>
    api.put<Task>(`/projects/${projectId}/tasks/${id}`, data),
};

export const bugApi = {
  getAll: (projectId: string) =>
    api.get<Bug[]>(`/projects/${projectId}/bugs`),
  create: (projectId: string, data: Partial<Bug>) =>
    api.post<Bug>(`/projects/${projectId}/bugs`, data),
  update: (projectId: string, id: string, data: Partial<Bug>) =>
    api.put<Bug>(`/projects/${projectId}/bugs/${id}`, data),
};

export const userApi = {
  getAll: () => api.get<User[]>('/users'),
};

export default api;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/services/api.ts
git commit -m "feat(types): add ProjectPhase, Project.mode, phaseApi"
```

---

## Task 6: 前端 ProjectList — 模式選擇與標籤

**Files:**
- Modify: `frontend/src/views/ProjectList.vue`

- [ ] **Step 1: 修改 ProjectList.vue 新增模式選擇與顯示**

完整替換 `frontend/src/views/ProjectList.vue`：

```vue
<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <n-h2 style="margin: 0;">專案總覽</n-h2>
      <n-button type="primary" @click="showModal = true">+ 新增專案</n-button>
    </div>
    <n-data-table
      :columns="columns"
      :data="projectStore.projects"
      :loading="projectStore.loading"
      :pagination="{ pageSize: 10 }"
    />

    <n-modal v-model:show="showModal" title="新增專案" preset="card" style="width: 500px;">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item label="專案代碼" path="code">
          <n-input v-model:value="form.code" placeholder="例如：PROJ-002" />
        </n-form-item>
        <n-form-item label="專案名稱" path="name">
          <n-input v-model:value="form.name" placeholder="請輸入專案名稱" />
        </n-form-item>
        <n-form-item label="專案模式" path="mode">
          <n-select v-model:value="form.mode" :options="modeOptions" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="form.description" type="textarea" placeholder="請輸入專案描述" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleSubmit">確定</n-button>
            <n-button @click="showModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { NButton, NH2, NDataTable, NModal, NForm, NFormItem, NInput, NSpace, NSelect, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useProjectStore } from '../stores/project';
import { projectApi } from '../services/api';
import type { Project } from '../types';

const router = useRouter();
const message = useMessage();
const projectStore = useProjectStore();

const showModal = ref(false);
const submitting = ref(false);
const formRef = ref();
const form = ref({
  code: '',
  name: '',
  description: '',
  mode: 'HYBRID',
});

const modeOptions = [
  { label: '瀑布式', value: 'WATERFALL' },
  { label: '敏捷式', value: 'AGILE' },
  { label: '混合型', value: 'HYBRID' },
];

const rules = {
  code: { required: true, message: '請輸入專案代碼' },
  name: { required: true, message: '請輸入專案名稱' },
  mode: { required: true, message: '請選擇專案模式' },
};

async function handleSubmit() {
  try {
    await formRef.value?.validate();
    submitting.value = true;
    await projectApi.create(form.value);
    message.success('專案建立成功');
    showModal.value = false;
    form.value = { code: '', name: '', description: '', mode: 'HYBRID' };
    await projectStore.fetchProjects();
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

function modeTag(mode: string) {
  const map: Record<string, { text: string; color: string; bg: string }> = {
    WATERFALL: { text: '瀑布式', color: '#3b82f6', bg: '#3b82f620' },
    AGILE: { text: '敏捷式', color: '#10b981', bg: '#10b98120' },
    HYBRID: { text: '混合型', color: '#8b5cf6', bg: '#8b5cf620' },
  };
  return map[mode] || { text: mode, color: '#64748b', bg: '#64748b20' };
}

const columns: DataTableColumns<Project> = [
  { title: '代碼', key: 'code' },
  { title: '名稱', key: 'name' },
  {
    title: '模式',
    key: 'mode',
    width: 100,
    render: (row) => {
      const m = modeTag(row.mode);
      return h(NTag, { size: 'small', style: { background: m.bg, color: m.color, borderColor: m.color + '40' } }, { default: () => m.text });
    },
  },
  {
    title: '狀態',
    key: 'status',
    render: (row) => {
      const statusMap: Record<string, { text: string; color: string }> = {
        ACTIVE: { text: '進行中', color: '#3b82f6' },
        COMPLETED: { text: '已完成', color: '#22c55e' },
        PLANNING: { text: '規劃中', color: '#f59e0b' },
      };
      const s = statusMap[row.status] || { text: row.status, color: '#94a3b8' };
      return h('span', { style: `color: ${s.color};` }, s.text);
    },
  },
  {
    title: '需求數',
    key: 'reqCount',
    render: (row) => row._count?.requirements || 0,
  },
  {
    title: '任務數',
    key: 'taskCount',
    render: (row) => row._count?.tasks || 0,
  },
  {
    title: 'Bug 數',
    key: 'bugCount',
    render: (row) => row._count?.bugs || 0,
  },
  {
    title: '操作',
    key: 'actions',
    render: (row) =>
      h(
        NButton,
        { type: 'primary', size: 'small', onClick: () => router.push(`/projects/${row.id}`) },
        () => '查看'
      ),
  },
];

onMounted(() => {
  projectStore.fetchProjects();
});
</script>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/ProjectList.vue
git commit -m "feat(ui): project creation form with mode selection, mode badge in list"
```

---

## Task 7: 前端 ProjectDetail — 階段顯示與推進

**Files:**
- Modify: `frontend/src/views/ProjectDetail.vue`

- [ ] **Step 1: 修改 ProjectDetail.vue 新增階段流程顯示與推進按鈕**

完整替換 `frontend/src/views/ProjectDetail.vue`：

```vue
<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <n-h2 style="margin: 0;">
        {{ project?.name || '專案詳情' }}
        <n-tag :type="statusType" size="small">{{ statusText }}</n-tag>
        <n-tag
          v-if="project?.mode"
          size="small"
          :style="modeTagStyle"
          style="margin-left: 8px;"
        >
          {{ modeLabel }}
        </n-tag>
      </n-h2>
      <n-button @click="$router.push('/')">返回列表</n-button>
    </div>

    <!-- 階段流程（瀑布式/混合型） -->
    <n-card v-if="showPhasePipeline" title="專案階段" style="margin-bottom: 20px;">
      <div class="phase-pipeline">
        <template v-for="(phase, index) in phases" :key="phase.id">
          <div
            class="phase-step"
            :class="{
              'phase-active': phase.status === 'ACTIVE',
              'phase-completed': phase.status === 'COMPLETED',
              'phase-pending': phase.status === 'PENDING',
            }"
          >
            <div class="phase-dot">{{ index + 1 }}</div>
            <div class="phase-name">{{ phase.name }}</div>
            <div class="phase-status-text">{{ phaseStatusText(phase.status) }}</div>
            <div v-if="phase._count?.tasks" class="phase-task-count">{{ phase._count.tasks }} 任務</div>
          </div>
          <div v-if="index < phases.length - 1" class="phase-connector" :class="{ 'connector-active': phase.status === 'COMPLETED' }" />
        </template>
      </div>
      <div v-if="canAdvancePhase" style="margin-top: 16px; text-align: right;">
        <n-button type="primary" :loading="advancing" @click="handleAdvancePhase">
          推進至下一階段
        </n-button>
      </div>
    </n-card>

    <n-card title="基本資訊" style="margin-bottom: 20px;">
      <n-descriptions :columns="3" bordered>
        <n-descriptions-item label="專案代碼">{{ project?.code }}</n-descriptions-item>
        <n-descriptions-item label="狀態">{{ statusText }}</n-descriptions-item>
        <n-descriptions-item label="模式">{{ modeLabel }}</n-descriptions-item>
        <n-descriptions-item label="建立時間">{{ formatDate(project?.createdAt) }}</n-descriptions-item>
        <n-descriptions-item label="當前階段" :span="2">{{ currentPhaseName }}</n-descriptions-item>
      </n-descriptions>
      <n-p style="margin-top: 12px; color: #64748b;">{{ project?.description || '無描述' }}</n-p>
    </n-card>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
      <n-statistic label="需求數" :value="requirements.length" />
      <n-statistic label="任務數" :value="tasks.length" />
      <n-statistic label="Bug 數" :value="bugs.length" />
    </div>

    <n-tabs type="line" v-model:value="activeTab">
      <!-- 需求 Tab -->
      <n-tab-pane name="requirements" tab="需求">
        <div style="margin-bottom: 16px;">
          <n-button type="primary" @click="showReqModal = true">+ 新增需求</n-button>
        </div>
        <n-data-table :columns="reqColumns" :data="requirements" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>

      <!-- 任務 Tab -->
      <n-tab-pane name="tasks" tab="任務">
        <div style="margin-bottom: 16px;">
          <n-button type="primary" @click="openTaskModal">+ 新增任務</n-button>
        </div>
        <TaskBoard :tasks="tasks" :mode="project?.mode" :phases="phases" @update-status="handleUpdateTaskStatus" />
      </n-tab-pane>

      <!-- Bug Tab -->
      <n-tab-pane name="bugs" tab="Bug">
        <div style="margin-bottom: 16px;">
          <n-button type="primary" @click="openBugModal">+ 新增 Bug</n-button>
        </div>
        <n-data-table :columns="bugColumns" :data="bugs" :pagination="{ pageSize: 10 }" />
      </n-tab-pane>
    </n-tabs>

    <!-- 新增需求 Modal -->
    <n-modal v-model:show="showReqModal" title="新增需求" preset="card" style="width: 600px;">
      <n-form :model="reqForm" :rules="reqRules" ref="reqFormRef">
        <n-form-item label="標題" path="title">
          <n-input v-model:value="reqForm.title" placeholder="請輸入需求標題" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="reqForm.description" type="textarea" :rows="4" placeholder="請輸入需求描述" />
        </n-form-item>
        <n-form-item label="優先級" path="priority">
          <n-select v-model:value="reqForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="類型" path="type">
          <n-select v-model:value="reqForm.type" :options="reqTypeOptions" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateRequirement">確定</n-button>
            <n-button @click="showReqModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 新增任務 Modal -->
    <n-modal v-model:show="showTaskModal" title="新增任務" preset="card" style="width: 600px;">
      <n-form :model="taskForm" :rules="taskRules" ref="taskFormRef">
        <n-alert v-if="currentPhase" type="info" :show-icon="false" style="margin-bottom: 16px;">
          當前階段：<strong>{{ currentPhase.name }}</strong>
          <span v-if="currentPhase.allowedTaskTypes">
            — 允許任務類型：{{ allowedTaskTypeLabels }}
          </span>
          <span v-else> — 任務類型不受限制</span>
        </n-alert>
        <n-form-item label="標題" path="title">
          <n-input v-model:value="taskForm.title" placeholder="請輸入任務標題" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="taskForm.description" type="textarea" :rows="3" placeholder="請輸入任務描述" />
        </n-form-item>
        <n-form-item label="類型" path="type">
          <n-select v-model:value="taskForm.type" :options="filteredTaskTypeOptions" />
        </n-form-item>
        <n-form-item label="優先級" path="priority">
          <n-select v-model:value="taskForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="關聯需求" path="requirementId">
          <n-select
            v-model:value="taskForm.requirementId"
            :options="requirementOptions"
            placeholder="選擇關聯需求（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item label="指派人" path="assigneeId">
          <n-select
            v-model:value="taskForm.assigneeId"
            :options="userOptions"
            placeholder="選擇指派人（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item label="預估工時（小時）" path="plannedHours">
          <n-input-number v-model:value="taskForm.plannedHours" :min="0" :precision="1" placeholder="例如：8" />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateTask">確定</n-button>
            <n-button @click="showTaskModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 新增 Bug Modal -->
    <n-modal v-model:show="showBugModal" title="新增 Bug" preset="card" style="width: 600px;">
      <n-form :model="bugForm" :rules="bugRules" ref="bugFormRef">
        <n-form-item label="標題" path="title">
          <n-input v-model:value="bugForm.title" placeholder="請輸入 Bug 標題" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="bugForm.description" type="textarea" :rows="4" placeholder="請描述 Bug 的現象、重現步驟、預期結果" />
        </n-form-item>
        <n-form-item label="嚴重程度" path="severity">
          <n-select v-model:value="bugForm.severity" :options="severityOptions" />
        </n-form-item>
        <n-form-item label="優先級" path="priority">
          <n-select v-model:value="bugForm.priority" :options="priorityOptions" />
        </n-form-item>
        <n-form-item label="關聯需求" path="requirementId">
          <n-select
            v-model:value="bugForm.requirementId"
            :options="requirementOptions"
            placeholder="選擇關聯需求（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item label="關聯任務" path="taskId">
          <n-select
            v-model:value="bugForm.taskId"
            :options="taskOptions"
            placeholder="選擇關聯任務（可選）"
            clearable
          />
        </n-form-item>
        <n-form-item>
          <n-space>
            <n-button type="primary" :loading="submitting" @click="handleCreateBug">確定</n-button>
            <n-button @click="showBugModal = false">取消</n-button>
          </n-space>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute } from 'vue-router';
import { useMessage } from 'naive-ui';
import { NTag, NButton, NSpace, NAlert } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { projectApi, phaseApi, requirementApi, taskApi, bugApi, userApi } from '../services/api';
import type { Project, ProjectPhase, Requirement, Task, Bug, User } from '../types';
import TaskBoard from '../components/TaskBoard.vue';

const route = useRoute();
const message = useMessage();
const projectId = route.params.id as string;

const project = ref<Project | null>(null);
const phases = ref<ProjectPhase[]>([]);
const requirements = ref<Requirement[]>([]);
const tasks = ref<Task[]>([]);
const bugs = ref<Bug[]>([]);
const users = ref<User[]>([]);
const activeTab = ref('requirements');
const submitting = ref(false);
const advancing = ref(false);

// Modals
const showReqModal = ref(false);
const showTaskModal = ref(false);
const showBugModal = ref(false);

// Form refs
const reqFormRef = ref();
const taskFormRef = ref();
const bugFormRef = ref();

// 需求表單
const reqForm = ref({
  title: '',
  description: '',
  priority: 'P2',
  type: 'FUNCTIONAL',
});

// 任務表單
const taskForm = ref({
  title: '',
  description: '',
  type: 'DEVELOPMENT',
  priority: 'P2',
  requirementId: null as string | null,
  assigneeId: null as string | null,
  plannedHours: null as number | null,
});

// Bug 表單
const bugForm = ref({
  title: '',
  description: '',
  severity: 'MEDIUM',
  priority: 'P2',
  requirementId: null as string | null,
  taskId: null as string | null,
});

// 選項
const priorityOptions = [
  { label: 'P0 - 緊急', value: 'P0' },
  { label: 'P1 - 高', value: 'P1' },
  { label: 'P2 - 中', value: 'P2' },
  { label: 'P3 - 低', value: 'P3' },
];

const reqTypeOptions = [
  { label: '功能性需求', value: 'FUNCTIONAL' },
  { label: '非功能性需求', value: 'NON_FUNCTIONAL' },
  { label: 'Bug 修復', value: 'BUG_FIX' },
  { label: '技術債', value: 'TECH_DEBT' },
];

const allTaskTypeOptions = [
  { label: '開發', value: 'DEVELOPMENT' },
  { label: '設計', value: 'DESIGN' },
  { label: '測試', value: 'TESTING' },
  { label: '文件', value: 'DOCUMENTATION' },
  { label: 'Bug 修復', value: 'BUG_FIX' },
  { label: '需求文件', value: 'REQUIREMENT_DOC' },
  { label: '運維', value: 'OPERATION' },
];

const severityOptions = [
  { label: '嚴重', value: 'CRITICAL' },
  { label: '高', value: 'HIGH' },
  { label: '中', value: 'MEDIUM' },
  { label: '低', value: 'LOW' },
];

// 下拉選項（動態）
const requirementOptions = computed(() =>
  requirements.value.map((r) => ({ label: `${r.reqCode} - ${r.title}`, value: r.id }))
);

const taskOptions = computed(() =>
  tasks.value.map((t) => ({ label: `${t.taskCode} - ${t.title}`, value: t.id }))
);

const userOptions = computed(() =>
  users.value.map((u) => ({ label: `${u.name} (${u.role})`, value: u.id }))
);

// 表單驗證規則
const reqRules = {
  title: { required: true, message: '請輸入需求標題', trigger: 'blur' },
};

const taskRules = {
  title: { required: true, message: '請輸入任務標題', trigger: 'blur' },
};

const bugRules = {
  title: { required: true, message: '請輸入 Bug 標題', trigger: 'blur' },
  description: { required: true, message: '請輸入 Bug 描述', trigger: 'blur' },
};

// 狀態顯示
const statusMap: Record<string, { text: string; type: string }> = {
  ACTIVE: { text: '進行中', type: 'info' },
  COMPLETED: { text: '已完成', type: 'success' },
  PLANNING: { text: '規劃中', type: 'warning' },
};

const statusText = computed(() => statusMap[project.value?.status || '']?.text || project.value?.status || '');
const statusType = computed(() => statusMap[project.value?.status || '']?.type as any || 'default');

// 模式相關
const modeLabel = computed(() => {
  const map: Record<string, string> = {
    WATERFALL: '瀑布式',
    AGILE: '敏捷式',
    HYBRID: '混合型',
  };
  return map[project.value?.mode || ''] || project.value?.mode || '';
});

const modeTagStyle = computed(() => {
  const map: Record<string, { color: string; bg: string }> = {
    WATERFALL: { color: '#3b82f6', bg: '#3b82f620' },
    AGILE: { color: '#10b981', bg: '#10b98120' },
    HYBRID: { color: '#8b5cf6', bg: '#8b5cf620' },
  };
  const m = map[project.value?.mode || ''] || { color: '#64748b', bg: '#64748b20' };
  return { background: m.bg, color: m.color, borderColor: m.color + '40' };
});

// 階段相關
const showPhasePipeline = computed(() => {
  return project.value?.mode === 'WATERFALL' || project.value?.mode === 'HYBRID';
});

const currentPhase = computed(() => {
  return phases.value.find((p) => p.status === 'ACTIVE') || null;
});

const currentPhaseName = computed(() => {
  return currentPhase.value?.name || '無';
});

const canAdvancePhase = computed(() => {
  if (!currentPhase.value) return false;
  // 檢查是否還有下一個 PENDING 階段
  const activeIndex = phases.value.findIndex((p) => p.status === 'ACTIVE');
  return activeIndex >= 0 && activeIndex < phases.value.length - 1;
});

function phaseStatusText(status: string): string {
  const map: Record<string, string> = {
    PENDING: '未開始',
    ACTIVE: '進行中',
    COMPLETED: '已完成',
  };
  return map[status] || status;
}

// 動態過濾任務類型
const filteredTaskTypeOptions = computed(() => {
  if (!currentPhase.value || !currentPhase.value.allowedTaskTypes) {
    return allTaskTypeOptions;
  }
  const allowed = currentPhase.value.allowedTaskTypes.split(',');
  return allTaskTypeOptions.filter((opt) => allowed.includes(opt.value));
});

const allowedTaskTypeLabels = computed(() => {
  if (!currentPhase.value?.allowedTaskTypes) return '所有類型';
  const allowed = currentPhase.value.allowedTaskTypes.split(',');
  return allTaskTypeOptions
    .filter((opt) => allowed.includes(opt.value))
    .map((opt) => opt.label)
    .join('、');
});

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString('zh-TW') : '-';
}

// 表格欄位
const reqColumns: DataTableColumns<Requirement> = [
  { title: '編號', key: 'reqCode' },
  { title: '標題', key: 'title' },
  { title: '優先級', key: 'priority' },
  {
    title: '狀態',
    key: 'status',
    render: (row) => h(NTag, { type: 'default', size: 'small' }, { default: () => row.status }),
  },
];

const bugColumns: DataTableColumns<Bug> = [
  { title: '編號', key: 'bugCode' },
  { title: '標題', key: 'title' },
  { title: '嚴重程度', key: 'severity' },
  { title: '優先級', key: 'priority' },
  { title: '狀態', key: 'status' },
];

// 載入資料
async function loadData() {
  try {
    const [projRes, phaseRes, reqRes, taskRes, bugRes, userRes] = await Promise.all([
      projectApi.get(projectId),
      phaseApi.getAll(projectId),
      requirementApi.getAll(projectId),
      taskApi.getAll(projectId),
      bugApi.getAll(projectId),
      userApi.getAll(),
    ]);
    project.value = projRes.data;
    phases.value = phaseRes.data;
    requirements.value = reqRes.data;
    tasks.value = taskRes.data;
    bugs.value = bugRes.data;
    users.value = userRes.data;
  } catch (error) {
    console.error('Failed to load project details:', error);
    message.error('載入專案資料失敗');
  }
}

// 階段推進
async function handleAdvancePhase() {
  if (!currentPhase.value) return;
  try {
    advancing.value = true;
    const res = await phaseApi.advance(projectId, currentPhase.value.id);
    message.success(res.data.message);
    phases.value = res.data.phases;
  } catch (error: any) {
    message.error(error?.response?.data?.error || '推進階段失敗');
  } finally {
    advancing.value = false;
  }
}

// 開啟任務 Modal
function openTaskModal() {
  // 根據當前階段設置預設任務類型
  const defaultType = filteredTaskTypeOptions.value.length > 0
    ? filteredTaskTypeOptions.value[0].value
    : 'DEVELOPMENT';

  taskForm.value = {
    title: '',
    description: '',
    type: defaultType,
    priority: 'P2',
    requirementId: null,
    assigneeId: null,
    plannedHours: null,
  };
  showTaskModal.value = true;
}

// 開啟 Bug Modal
function openBugModal() {
  bugForm.value = {
    title: '',
    description: '',
    severity: 'MEDIUM',
    priority: 'P2',
    requirementId: null,
    taskId: null,
  };
  showBugModal.value = true;
}

// 新增需求
async function handleCreateRequirement() {
  try {
    await reqFormRef.value?.validate();
    submitting.value = true;
    await requirementApi.create(projectId, reqForm.value);
    message.success('需求建立成功');
    showReqModal.value = false;
    reqForm.value = { title: '', description: '', priority: 'P2', type: 'FUNCTIONAL' };
    const res = await requirementApi.getAll(projectId);
    requirements.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

// 新增任務
async function handleCreateTask() {
  try {
    await taskFormRef.value?.validate();
    submitting.value = true;
    const data = {
      ...taskForm.value,
      requirementId: taskForm.value.requirementId || undefined,
      assigneeId: taskForm.value.assigneeId || undefined,
      plannedHours: taskForm.value.plannedHours || undefined,
    };
    await taskApi.create(projectId, data);
    message.success('任務建立成功');
    showTaskModal.value = false;
    const res = await taskApi.getAll(projectId);
    tasks.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

// 更新任務狀態（看板拖拽）
async function handleUpdateTaskStatus(taskId: string, newStatus: string) {
  try {
    await taskApi.update(projectId, taskId, { status: newStatus });
    message.success('狀態已更新');
    const res = await taskApi.getAll(projectId);
    tasks.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    } else {
      message.error('更新狀態失敗');
    }
  }
}

// 新增 Bug
async function handleCreateBug() {
  try {
    await bugFormRef.value?.validate();
    submitting.value = true;
    const data = {
      ...bugForm.value,
      requirementId: bugForm.value.requirementId || undefined,
      taskId: bugForm.value.taskId || undefined,
    };
    await bugApi.create(projectId, data);
    message.success('Bug 建立成功');
    showBugModal.value = false;
    const res = await bugApi.getAll(projectId);
    bugs.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    }
  } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.phase-pipeline {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  overflow-x: auto;
  padding: 8px 0;
}

.phase-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  text-align: center;
}

.phase-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  border: 2px solid;
  transition: all 0.2s;
}

.phase-pending .phase-dot {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #94a3b8;
}

.phase-active .phase-dot {
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  border-color: #3b82f6;
  color: white;
}

.phase-completed .phase-dot {
  background: #22c55e;
  border-color: #22c55e;
  color: white;
}

.phase-name {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 4px;
}

.phase-status-text {
  font-size: 11px;
  color: #64748b;
}

.phase-task-count {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.phase-connector {
  flex: 1;
  min-width: 24px;
  height: 2px;
  background: #e2e8f0;
  margin-top: 16px;
  transition: background 0.2s;
}

.phase-connector.connector-active {
  background: #22c55e;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/ProjectDetail.vue
git commit -m "feat(ui): project detail with phase pipeline, advance button, dynamic task type filtering"
```

---

## Task 8: 前端 TaskBoard — 動態看板與淺色主題

**Files:**
- Modify: `frontend/src/components/TaskBoard.vue`

- [ ] **Step 1: 重構 TaskBoard.vue 為模式感知的動態看板 + 淺色主題**

完整替換 `frontend/src/components/TaskBoard.vue`：

```vue
<template>
  <div class="kanban-board">
    <div
      v-for="column in displayColumns"
      :key="column.key"
      class="kanban-column"
      :class="{ 'drag-over': dragOverColumn === column.key }"
      @dragover.prevent="handleDragOver(column.key)"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop(column.key)"
    >
      <div class="kanban-column-header" :style="{ borderColor: column.color }">
        <span class="kanban-column-title">{{ column.title }}</span>
        <n-tag
          size="small"
          :style="{ background: column.color + '15', color: column.color, borderColor: column.color + '30' }"
        >
          {{ columnTasks(column.key).length }}
        </n-tag>
      </div>
      <div class="kanban-column-body">
        <div
          v-for="task in columnTasks(column.key)"
          :key="task.id"
          class="kanban-card"
          draggable="true"
          @dragstart="handleDragStart(task)"
        >
          <div class="kanban-card-header">
            <span class="kanban-card-code">{{ task.taskCode }}</span>
            <n-tag
              size="tiny"
              :type="priorityType(task.priority)"
              :style="{ fontSize: '10px' }"
            >
              {{ task.priority }}
            </n-tag>
          </div>
          <div class="kanban-card-title">{{ task.title }}</div>
          <div v-if="task.phase?.name" class="kanban-card-phase">
            {{ task.phase.name }}
          </div>
          <div class="kanban-card-footer">
            <span v-if="task.assignee" class="kanban-card-assignee">
              {{ task.assignee.name }}
            </span>
            <span v-else class="kanban-card-unassigned">未指派</span>
            <span v-if="task.plannedHours" class="kanban-card-hours">
              {{ task.plannedHours }}h
            </span>
          </div>
        </div>
        <div v-if="!columnTasks(column.key).length" class="kanban-empty">
          暫無任務
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NTag } from 'naive-ui';
import type { Task, ProjectPhase } from '../types';

interface Props {
  tasks: Task[];
  mode?: string;
  phases?: ProjectPhase[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update-status', taskId: string, newStatus: string): void;
}>();

const dragOverColumn = ref<string | null>(null);
const draggedTask = ref<Task | null>(null);

// 瀑布式看板欄位：按 phase 分組
const waterfallColumns = computed(() => {
  if (!props.phases?.length) return [];
  const colors = ['#64748b', '#3b82f6', '#8b5cf6', '#f59e0b', '#22c55e', '#ec4899'];
  return props.phases.map((phase, idx) => ({
    key: phase.id,
    title: phase.name,
    color: colors[idx % colors.length],
  }));
});

// 敏捷式/混合型看板欄位：按 status 分組
const agileColumns = [
  { key: 'TODO', title: '待辦', color: '#94a3b8' },
  { key: 'IN_PROGRESS', title: '進行中', color: '#3b82f6' },
  { key: 'CODE_REVIEW', title: 'Code Review', color: '#8b5cf6' },
  { key: 'TESTING', title: '測試中', color: '#f59e0b' },
  { key: 'DONE', title: '完成', color: '#22c55e' },
];

const displayColumns = computed(() => {
  if (props.mode === 'WATERFALL') {
    return waterfallColumns.value;
  }
  return agileColumns;
});

function columnTasks(columnKey: string): Task[] {
  if (props.mode === 'WATERFALL') {
    // 瀑布式：按 phaseId 分組
    return props.tasks.filter((t) => t.phaseId === columnKey);
  }
  // 敏捷式/混合型：按 status 分組
  return props.tasks.filter((t) => (t.status || 'TODO') === columnKey);
}

function priorityType(priority: string): string {
  const map: Record<string, string> = {
    P0: 'error',
    P1: 'warning',
    P2: 'default',
    P3: 'default',
  };
  return map[priority] || 'default';
}

function handleDragStart(task: Task) {
  draggedTask.value = task;
}

function handleDragOver(key: string) {
  dragOverColumn.value = key;
}

function handleDragLeave() {
  dragOverColumn.value = null;
}

function handleDrop(key: string) {
  dragOverColumn.value = null;
  if (!draggedTask.value) return;

  if (props.mode === 'WATERFALL') {
    // 瀑布式：拖拽變更 phaseId（通過 status 欄位傳遞 phaseId）
    if (draggedTask.value.phaseId !== key) {
      emit('update-status', draggedTask.value.id, key);
    }
  } else {
    // 敏捷式/混合型：拖拽變更 status
    if (draggedTask.value.status !== key) {
      emit('update-status', draggedTask.value.id, key);
    }
  }
  draggedTask.value = null;
}
</script>

<style scoped>
.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.kanban-column {
  flex: 1;
  min-width: 240px;
  max-width: 320px;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.kanban-column.drag-over {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px #3b82f615;
}

.kanban-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 2px solid;
  font-weight: 600;
  font-size: 14px;
}

.kanban-column-title {
  color: #1e293b;
}

.kanban-column-body {
  padding: 12px;
  flex: 1;
  min-height: 120px;
}

.kanban-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: grab;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}

.kanban-card:hover {
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kanban-card:active {
  cursor: grabbing;
}

.kanban-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.kanban-card-code {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
}

.kanban-card-title {
  font-size: 13px;
  color: #1e293b;
  line-height: 1.4;
  margin-bottom: 8px;
  word-break: break-word;
  font-weight: 500;
}

.kanban-card-phase {
  font-size: 11px;
  color: #8b5cf6;
  background: #8b5cf610;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 8px;
}

.kanban-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
}

.kanban-card-assignee {
  color: #64748b;
}

.kanban-card-unassigned {
  color: #cbd5e1;
  font-style: italic;
}

.kanban-card-hours {
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.kanban-empty {
  text-align: center;
  color: #cbd5e1;
  font-size: 12px;
  padding: 24px 0;
}
</style>
```

注意：瀑布式看板拖拽時會傳遞 phaseId 作為 "status"，需要在 ProjectDetail.vue 的 `handleUpdateTaskStatus` 中處理。修改 ProjectDetail.vue 中的 `handleUpdateTaskStatus`：

```typescript
async function handleUpdateTaskStatus(taskId: string, newStatus: string) {
  try {
    // 判斷是瀑布式（傳遞 phaseId）還是敏捷式（傳遞 status）
    const isPhaseKey = project.value?.mode === 'WATERFALL' && phases.value.some((p) => p.id === newStatus);
    const updateData = isPhaseKey ? { phaseId: newStatus } : { status: newStatus };

    await taskApi.update(projectId, taskId, updateData);
    message.success(isPhaseKey ? '階段已更新' : '狀態已更新');
    const res = await taskApi.getAll(projectId);
    tasks.value = res.data;
  } catch (error: any) {
    if (error?.response?.data?.error) {
      message.error(error.response.data.error);
    } else {
      message.error('更新失敗');
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/TaskBoard.vue frontend/src/views/ProjectDetail.vue
git commit -m "feat(ui): mode-aware TaskBoard with dynamic columns, light theme, waterfall phase grouping"
```

---

## Task 9: 整合測試與驗證

**Files:**
- All modified files

- [ ] **Step 1: 驗證 Schema 與 Migration**

```bash
cd /Users/hwte/.claude/projects/數位化專案管理系統/backend
npx prisma migrate status
```

Expected: Migration "add_project_mode_and_phases" should be applied.

- [ ] **Step 2: 啟動後端並驗證 API**

```bash
npm run dev
```

在另一個 terminal：
```bash
# 測試健康檢查
curl http://localhost:3000/health

# 測試登入取得 token（使用既有帳號）
# 如果沒有帳號，先建立一個
```

- [ ] **Step 3: 啟動前端並端到端驗證**

```bash
cd /Users/hwte/.claude/projects/數位化專案管理系統/frontend
npm run dev
```

開啟瀏覽器訪問 http://localhost:5173

驗證清單：
1. 登入後進入專案列表
2. 點擊「新增專案」
3. 確認有「專案模式」下拉選單（瀑布式/敏捷式/混合型）
4. 選擇「瀑布式」，建立專案
5. 進入該專案詳情頁面
6. 確認顯示 5 個階段流程（需求分析 → 系統設計 → 開發實作 → 測試驗證 → 發布上線）
7. 確認第一個階段「需求分析」為 ACTIVE（高亮顯示）
8. 切換到「任務」Tab
9. 點擊「新增任務」
10. 確認任務類型下拉只顯示「需求文件」「文件」（依當前階段限制）
11. 建立一個「需求文件」類型的任務
12. 確認任務出現在「需求分析」階段欄位下
13. 回到專案詳情，點擊「推進至下一階段」
14. 確認階段變為「系統設計」ACTIVE
15. 再次新增任務，確認類型只顯示「設計」「文件」
16. 建立一個「混合型」專案，確認流程類似但「迭代開發」階段不限制任務類型

- [ ] **Step 4: 最終 Commit**

```bash
cd /Users/hwte/.claude/projects/數位化專案管理系統
git add -A
git commit -m "feat: project workflow modes — waterfall, agile, hybrid with dynamic kanban and phase restrictions"
```

---

## Spec Coverage Check

| Spec 需求 | 實作任務 |
|-----------|----------|
| Project.mode 欄位 | Task 1 |
| ProjectPhase 模型 | Task 1 |
| Task.phaseId 關聯 | Task 1 |
| 建立專案時選擇模式 | Task 2, Task 6 |
| 自動生成預設階段 | Task 2 |
| 瀑布式 5 階段線性推進 | Task 2, Task 3, Task 7 |
| 敏捷式 Sprint 自由類型 | Task 2, Task 4 |
| 混合型大階段 + Sprint | Task 2, Task 7 |
| 動態看板欄位（瀑布按 phase，敏捷按 status） | Task 8 |
| 任務類型依階段動態限制 | Task 4, Task 7 |
| 階段推進功能 | Task 3, Task 7 |
| 淺色主題 UI | Task 6, Task 7, Task 8 |
| 模式標籤與配色 | Task 6, Task 7 |

---

## Placeholder Scan

- 無 TBD / TODO / "implement later" / "fill in details"
- 無 "Add appropriate error handling" 等模糊指令
- 每個步驟包含完整程式碼
- 無 "Similar to Task N" 引用

---

## Type Consistency Check

| 類型/欄位 | 定義位置 | 使用位置 | 狀態 |
|-----------|----------|----------|------|
| `Project.mode` | schema.prisma, types/index.ts | projectRoutes.ts, ProjectList.vue, ProjectDetail.vue, TaskBoard.vue | 一致 |
| `ProjectPhase` | schema.prisma, types/index.ts | phaseRoutes.ts, api.ts, ProjectDetail.vue, TaskBoard.vue | 一致 |
| `Task.phaseId` | schema.prisma, types/index.ts | taskRoutes.ts, types/index.ts, TaskBoard.vue | 一致 |
| `phaseApi` | api.ts | ProjectDetail.vue | 一致 |
| `modeOptions` | ProjectList.vue | — | 與 Project.mode 值域一致 |
| `filteredTaskTypeOptions` | ProjectDetail.vue | — | 與 allTaskTypeOptions + allowedTaskTypes 一致 |
