# 數位化專案管理系統 - 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一套完整的軟體開發專案管理系統，支援需求管理、任務看板、Bug 追蹤，並建立需求-任務-測試-Bug 的追溯鏈。

**Architecture:** 單體應用，前端 Vue 3 SPA + 後端 Node.js Express REST API，Prisma ORM + SQLite，前後端分開目錄管理。

**Tech Stack:** Vue 3, TypeScript, Naive UI, Pinia, Vue Router, Node.js, Express, Prisma, SQLite, Docker Compose

---

## 檔案結構總覽

```
數位化專案管理系統/
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── middlewares/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── projectRoutes.ts
│   │   │   ├── requirementRoutes.ts
│   │   │   ├── taskRoutes.ts
│   │   │   └── bugRoutes.ts
│   │   └── services/
│   │       └── prisma.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── stores/
│   │   │   ├── auth.ts
│   │   │   ├── project.ts
│   │   │   ├── requirement.ts
│   │   │   └── task.ts
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── Dashboard.vue
│   │   │   ├── ProjectList.vue
│   │   │   ├── ProjectDetail.vue
│   │   │   ├── RequirementBoard.vue
│   │   │   └── TaskBoard.vue
│   │   └── components/
│   │       ├── AppHeader.vue
│   │       ├── Sidebar.vue
│   │       └── KanbanBoard.vue
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docker-compose.yml
└── .gitignore
```

---

## Task 1: 後端專案初始化

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/.env`
- Create: `backend/.gitignore`

- [ ] **Step 1: 建立 backend/package.json**

```json
{
  "name": "digital-pm-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.7.0",
    "prisma": "^5.22.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: 建立 backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "prisma/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 建立 backend/.env**

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="digital-pm-secret-key-change-in-production"
PORT=3000
```

- [ ] **Step 4: 建立 backend/.gitignore**

```gitignore
node_modules/
dist/
.env.local
*.log
prisma/dev.db
prisma/dev.db-journal
prisma/migrations/
```

- [ ] **Step 5: 安裝依賴**

```bash
cd backend && npm install
```

- [ ] **Step 6: 初始化 Prisma**

```bash
cd backend && npx prisma init
```

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "chore: initialize backend project structure"
```

---

## Task 2: Prisma Schema 與資料庫

**Files:**
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: 撰寫 Prisma Schema**

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  PM
  DEVELOPER
  TESTER
  VIEWER
}

enum UserStatus {
  ACTIVE
  INACTIVE
}

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  name      String
  password  String
  role      UserRole   @default(DEVELOPER)
  status    UserStatus @default(ACTIVE)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

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
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requirements Requirement[]
  tasks        Task[]
  testCases    TestCase[]
  bugs         Bug[]
  releases     Release[]
}

model Requirement {
  id          String   @id @default(uuid())
  projectId   String
  reqCode     String   @unique
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
}

model Task {
  id            String    @id @default(uuid())
  projectId     String
  taskCode      String    @unique
  title         String
  description   String?
  type          String    @default("DEVELOPMENT")
  status        String    @default("TODO")
  priority      String    @default("P2")
  requirementId String?
  assigneeId    String?

  project       Project       @relation(fields: [projectId], references: [id], onDelete: Cascade)
  requirement   Requirement?  @relation(fields: [requirementId], references: [id])
  assignee      User?         @relation("TaskAssignee", fields: [assigneeId], references: [id])
  bugs          Bug[]

  plannedHours  Float?
  actualHours   Float?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model TestCase {
  id             String   @id @default(uuid())
  projectId      String
  tcCode         String   @unique
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
}

model TestExecution {
  id          String   @id @default(uuid())
  testCaseId  String
  result      String
  actualResult String?
  executedBy  String
  executedAt  DateTime @default(now())
  bugId       String?

  testCase TestCase @relation(fields: [testCaseId], references: [id], onDelete: Cascade)
  bug      Bug?     @relation(fields: [bugId], references: [id])
}

model Bug {
  id            String   @id @default(uuid())
  projectId     String
  bugCode       String   @unique
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
}

model Release {
  id         String   @id @default(uuid())
  projectId  String
  version    String
  name       String
  status     String   @default("PLANNING")
  releasedAt DateTime?

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: 建立 Seed 腳本**

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 建立預設使用者
  const admin = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      name: '系統管理員',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: 'pm@company.com',
      name: '專案經理',
      password: hashedPassword,
      role: 'PM',
    },
  });

  const dev = await prisma.user.create({
    data: {
      email: 'dev@company.com',
      name: '開發人員',
      password: hashedPassword,
      role: 'DEVELOPER',
    },
  });

  const tester = await prisma.user.create({
    data: {
      email: 'tester@company.com',
      name: '測試人員',
      password: hashedPassword,
      role: 'TESTER',
    },
  });

  // 建立預設專案
  const project = await prisma.project.create({
    data: {
      code: 'PROJ-001',
      name: '數位化專案管理系統',
      description: '內部使用的專案管理系統開發',
      status: 'ACTIVE',
    },
  });

  // 建立預設需求
  const req = await prisma.requirement.create({
    data: {
      projectId: project.id,
      reqCode: 'REQ-001',
      title: '使用者登入功能',
      description: '使用者可使用帳號密碼登入系統',
      priority: 'P0',
      status: 'APPROVED',
      type: 'FUNCTIONAL',
      createdById: pm.id,
    },
  });

  // 建立預設任務
  await prisma.task.create({
    data: {
      projectId: project.id,
      taskCode: 'TASK-001',
      title: '設計登入 API',
      description: '設計並實作登入相關 API',
      type: 'DEVELOPMENT',
      status: 'DONE',
      priority: 'P0',
      requirementId: req.id,
      assigneeId: dev.id,
      plannedHours: 8,
      actualHours: 6,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      taskCode: 'TASK-002',
      title: '實作登入 UI',
      description: '實作登入頁面介面',
      type: 'DEVELOPMENT',
      status: 'IN_PROGRESS',
      priority: 'P0',
      requirementId: req.id,
      assigneeId: dev.id,
      plannedHours: 8,
      actualHours: 4,
    },
  });

  // 建立預設 Bug
  await prisma.bug.create({
    data: {
      projectId: project.id,
      bugCode: 'BUG-001',
      title: '密碼錯誤時無提示訊息',
      description: '當使用者輸入錯誤密碼時，頁面沒有顯示任何錯誤提示',
      severity: 'HIGH',
      priority: 'P1',
      status: 'CONFIRMED',
      requirementId: req.id,
      taskId: null,
      createdById: tester.id,
      assigneeId: dev.id,
    },
  });

  console.log('Seed completed!');
  console.log('Users:', { admin: admin.email, pm: pm.email, dev: dev.email, tester: tester.email });
  console.log('Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: 執行 Migration 和 Seed**

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/
git commit -m "feat: add Prisma schema and seed data"
```

---

## Task 3: 後端認證系統

**Files:**
- Create: `backend/src/services/prisma.ts`
- Create: `backend/src/middlewares/auth.ts`
- Create: `backend/src/routes/authRoutes.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: 建立 Prisma 單例**

```typescript
// backend/src/services/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 2: 建立 JWT 認證中介層**

```typescript
// backend/src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'digital-pm-secret-key';

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Step 3: 建立認證路由**

```typescript
// backend/src/routes/authRoutes.ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'digital-pm-secret-key';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
```

- [ ] **Step 4: 建立 Express 主入口**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 5: 測試登入 API**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"password123"}'
```

Expected: `{"token":"...","user":{"id":"...","email":"admin@company.com","name":"系統管理員","role":"ADMIN"}}`

- [ ] **Step 6: Commit**

```bash
git add backend/src/
git commit -m "feat: add JWT authentication system"
```

---

## Task 4: 後端 CRUD API（專案 / 需求 / 任務 / Bug）

**Files:**
- Create: `backend/src/routes/projectRoutes.ts`
- Create: `backend/src/routes/requirementRoutes.ts`
- Create: `backend/src/routes/taskRoutes.ts`
- Create: `backend/src/routes/bugRoutes.ts`

- [ ] **Step 1: 建立專案路由**

```typescript
// backend/src/routes/projectRoutes.ts
import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

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
    const { code, name, description } = req.body;
    const project = await prisma.project.create({
      data: { code, name, description },
    });
    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: 建立需求路由**

```typescript
// backend/src/routes/requirementRoutes.ts
import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/requirements
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const requirements = await prisma.requirement.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true, bugs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requirements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/requirements
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { reqCode, title, description, priority, type } = req.body;
    const userId = (req as any).user?.userId;

    const count = await prisma.requirement.count({ where: { projectId } });
    const code = reqCode || `REQ-${String(count + 1).padStart(3, '0')}`;

    const requirement = await prisma.requirement.create({
      data: {
        projectId,
        reqCode: code,
        title,
        description,
        priority: priority || 'P2',
        type: type || 'FUNCTIONAL',
        createdById: userId,
      },
    });
    res.status(201).json(requirement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/requirements/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requirement = await prisma.requirement.update({
      where: { id },
      data: req.body,
    });
    res.json(requirement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 3: 建立任務路由**

```typescript
// backend/src/routes/taskRoutes.ts
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
    });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 4: 建立 Bug 路由**

```typescript
// backend/src/routes/bugRoutes.ts
import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/bugs
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const bugs = await prisma.bug.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true } },
        task: { select: { id: true, taskCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bugs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/bugs
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, severity, priority, requirementId, taskId } = req.body;
    const userId = (req as any).user?.userId;

    const count = await prisma.bug.count({ where: { projectId } });
    const code = `BUG-${String(count + 1).padStart(3, '0')}`;

    const bug = await prisma.bug.create({
      data: {
        projectId,
        bugCode: code,
        title,
        description,
        severity: severity || 'MEDIUM',
        priority: priority || 'P2',
        requirementId,
        taskId,
        createdById: userId,
      },
    });
    res.status(201).json(bug);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/bugs/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bug = await prisma.bug.update({
      where: { id },
      data: req.body,
    });
    res.json(bug);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 5: 更新 Express 主入口，加入所有路由**

```typescript
// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import requirementRoutes from './routes/requirementRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import bugRoutes from './routes/bugRoutes.js';

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
app.use('/api/projects/:projectId/requirements', requirementRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/bugs', bugRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/
git commit -m "feat: add CRUD APIs for projects, requirements, tasks, and bugs"
```

---

## Task 5: 前端專案初始化

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tsconfig.node.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/.gitignore`

- [ ] **Step 1: 建立 frontend/package.json**

```json
{
  "name": "digital-pm-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "pinia": "^2.1.0",
    "naive-ui": "^2.38.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.0.0"
  }
}
```

- [ ] **Step 2: 建立 frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 建立 frontend/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: 建立 frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: 建立 frontend/index.html**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>數位化專案管理系統</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: 建立 frontend/.gitignore**

```gitignore
node_modules/
dist/
.env.local
*.log
.DS_Store
```

- [ ] **Step 7: 安裝依賴**

```bash
cd frontend && npm install
```

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "chore: initialize Vue frontend project"
```

---

## Task 6: 前端類型定義與 API 服務

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/services/api.ts`

- [ ] **Step 1: 建立類型定義**

```typescript
// frontend/src/types/index.ts

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
  startDate?: string;
  endDate?: string;
  createdAt: string;
  _count?: {
    requirements: number;
    tasks: number;
    bugs: number;
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
  assignee?: { id: string; name: string };
  requirement?: { id: string; reqCode: string; title: string };
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

- [ ] **Step 2: 建立 API 服務**

```typescript
// frontend/src/services/api.ts
import axios from 'axios';
import type { LoginResponse, Project, Requirement, Task, Bug } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 請求攔截器：自動附加 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 響應攔截器：401 時自動登出
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

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<{ user: import('../types').User }>('/auth/me'),
};

// Projects
export const projectApi = {
  getAll: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
};

// Requirements
export const requirementApi = {
  getAll: (projectId: string) =>
    api.get<Requirement[]>(`/projects/${projectId}/requirements`),
  create: (projectId: string, data: Partial<Requirement>) =>
    api.post<Requirement>(`/projects/${projectId}/requirements`, data),
  update: (projectId: string, id: string, data: Partial<Requirement>) =>
    api.put<Requirement>(`/projects/${projectId}/requirements/${id}`, data),
};

// Tasks
export const taskApi = {
  getAll: (projectId: string) =>
    api.get<Task[]>(`/projects/${projectId}/tasks`),
  create: (projectId: string, data: Partial<Task>) =>
    api.post<Task>(`/projects/${projectId}/tasks`, data),
  update: (projectId: string, id: string, data: Partial<Task>) =>
    api.put<Task>(`/projects/${projectId}/tasks/${id}`, data),
};

// Bugs
export const bugApi = {
  getAll: (projectId: string) =>
    api.get<Bug[]>(`/projects/${projectId}/bugs`),
  create: (projectId: string, data: Partial<Bug>) =>
    api.post<Bug>(`/projects/${projectId}/bugs`, data),
  update: (projectId: string, id: string, data: Partial<Bug>) =>
    api.put<Bug>(`/projects/${projectId}/bugs/${id}`, data),
};

export default api;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/ frontend/src/services/
git commit -m "feat: add TypeScript types and API service layer"
```

---

## Task 7: 前端 Pinia Store

**Files:**
- Create: `frontend/src/stores/auth.ts`
- Create: `frontend/src/stores/project.ts`

- [ ] **Step 1: 建立 Auth Store**

```typescript
// frontend/src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types';
import { authApi } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));

  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    token.value = newToken;
    user.value = userData;
  }

  async function fetchUser() {
    try {
      const response = await authApi.me();
      user.value = response.data.user;
    } catch {
      logout();
    }
  }

  function logout() {
    localStorage.removeItem('token');
    token.value = null;
    user.value = null;
    window.location.href = '/login';
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    fetchUser,
    logout,
  };
});
```

- [ ] **Step 2: 建立 Project Store**

```typescript
// frontend/src/stores/project.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Project } from '../types';
import { projectApi } from '../services/api';

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([]);
  const currentProject = ref<Project | null>(null);
  const loading = ref(false);

  async function fetchProjects() {
    loading.value = true;
    try {
      const response = await projectApi.getAll();
      projects.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchProject(id: string) {
    loading.value = true;
    try {
      const response = await projectApi.get(id);
      currentProject.value = response.data;
    } finally {
      loading.value = false;
    }
  }

  return {
    projects,
    currentProject,
    loading,
    fetchProjects,
    fetchProject,
  };
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/
git commit -m "feat: add Pinia stores for auth and project"
```

---

## Task 8: 前端路由與主入口

**Files:**
- Create: `frontend/src/router/index.ts`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`

- [ ] **Step 1: 建立路由配置**

```typescript
// frontend/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/ProjectList.vue'),
        },
        {
          path: 'projects/:id',
          name: 'ProjectDetail',
          component: () => import('../views/ProjectDetail.vue'),
        },
      ],
    },
  ],
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
```

- [ ] **Step 2: 建立主入口**

```typescript
// frontend/src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import naive from 'naive-ui';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(naive);

app.mount('#app');
```

- [ ] **Step 3: 建立 App.vue**

```vue
<!-- frontend/src/App.vue -->
<template>
  <n-config-provider :theme="darkTheme">
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { darkTheme } from 'naive-ui';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a;
  color: #fff;
}
</style>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/router/ frontend/src/main.ts frontend/src/App.vue
git commit -m "feat: add Vue Router and app entry point"
```

---

## Task 9: 前端頁面實作（Login + Dashboard + 專案列表）

**Files:**
- Create: `frontend/src/views/Login.vue`
- Create: `frontend/src/views/Dashboard.vue`
- Create: `frontend/src/views/ProjectList.vue`

- [ ] **Step 1: 建立 Login.vue**

```vue
<!-- frontend/src/views/Login.vue -->
<template>
  <div class="login-container">
    <n-card class="login-card" title="數位化專案管理系統">
      <n-form :model="form" :rules="rules" ref="formRef">
        <n-form-item path="email" label="帳號">
          <n-input v-model:value="form.email" placeholder="請輸入帳號" />
        </n-form-item>
        <n-form-item path="password" label="密碼">
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="請輸入密碼"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item>
          <n-button
            type="primary"
            :loading="loading"
            block
            size="large"
            @click="handleLogin"
          >
            登入
          </n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const formRef = ref();
const loading = ref(false);

const form = ref({
  email: 'admin@company.com',
  password: 'password123',
});

const rules = {
  email: { required: true, message: '請輸入帳號' },
  password: { required: true, message: '請輸入密碼' },
};

async function handleLogin() {
  try {
    loading.value = true;
    await authStore.login(form.value.email, form.value.password);
    message.success('登入成功');
    router.push('/');
  } catch (error) {
    message.error('登入失敗，請檢查帳號密碼');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
}

.login-card {
  width: 400px;
}
</style>
```

- [ ] **Step 2: 建立 Dashboard.vue（主佈局）**

```vue
<!-- frontend/src/views/Dashboard.vue -->
<template>
  <n-layout has-sider class="dashboard">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="200"
      show-trigger
    >
      <div class="logo">PM</div>
      <n-menu
        :options="menuOptions"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        @update:value="handleMenuSelect"
      />
    </n-layout-sider>

    <n-layout>
      <n-layout-header bordered class="header">
        <div class="header-left">
          <span>{{ authStore.user?.name }}</span>
          <n-tag size="small" type="info">{{ authStore.user?.role }}</n-tag>
        </div>
        <n-button text @click="authStore.logout">
          <template #icon>
            <n-icon><logout-icon /></n-icon>
          </template>
          登出
        </n-button>
      </n-layout-header>

      <n-layout-content class="content">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { h } from 'vue';
import { useRouter } from 'vue-router';
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
  NMenu, NButton, NTag, NIcon,
} from 'naive-ui';
import {
  FolderOpenOutline as ProjectIcon,
  LogOutOutline as LogoutIcon,
} from '@vicons/ionicons5';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const menuOptions = [
  {
    label: '專案總覽',
    key: '/',
    icon: renderIcon(ProjectIcon),
  },
];

function handleMenuSelect(key: string) {
  router.push(key);
}
</script>

<style scoped>
.dashboard {
  height: 100vh;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content {
  padding: 24px;
}
</style>
```

- [ ] **Step 3: 建立 ProjectList.vue**

```vue
<!-- frontend/src/views/ProjectList.vue -->
<template>
  <div>
    <n-h2>專案總覽</n-h2>
    <n-data-table
      :columns="columns"
      :data="projectStore.projects"
      :loading="projectStore.loading"
      :pagination="{ pageSize: 10 }"
      @update:page="handlePageChange"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { useProjectStore } from '../stores/project';
import type { Project } from '../types';

const router = useRouter();
const projectStore = useProjectStore();

const columns: DataTableColumns<Project> = [
  { title: '代碼', key: 'code' },
  { title: '名稱', key: 'name' },
  { title: '狀態', key: 'status' },
  {
    title: '需求數',
    key: '_count.requirements',
    render: (row) => row._count?.requirements || 0,
  },
  {
    title: '任務數',
    key: '_count.tasks',
    render: (row) => row._count?.tasks || 0,
  },
  {
    title: 'Bug 數',
    key: '_count.bugs',
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

function handlePageChange(page: number) {
  console.log('Page changed:', page);
}
</script>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/
git commit -m "feat: add login page, dashboard layout, and project list"
```

---

## Task 10: Docker Compose 部署配置

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`

- [ ] **Step 1: 建立後端 Dockerfile**

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

- [ ] **Step 2: 建立前端 Dockerfile**

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
```

- [ ] **Step 3: 建立 docker-compose.yml**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./prisma/dev.db
      - JWT_SECRET=digital-pm-secret-key-change-in-production
      - PORT=3000
    volumes:
      - ./backend/prisma:/app/prisma
      - backend_node_modules:/app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - frontend_node_modules:/app/node_modules

volumes:
  backend_node_modules:
  frontend_node_modules:
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml backend/Dockerfile frontend/Dockerfile
git commit -m "chore: add Docker Compose deployment configuration"
```

---

## 實作順序總結

```
Task 1  →  後端專案初始化
Task 2  →  Prisma Schema + 資料庫 + Seed
Task 3  →  JWT 認證系統
Task 4  →  CRUD API（專案/需求/任務/Bug）
Task 5  →  前端專案初始化
Task 6  →  TypeScript 類型 + API 服務
Task 7  →  Pinia Store
Task 8  →  Vue Router + 主入口
Task 9  →  頁面實作（Login + Dashboard + 專案列表）
Task 10 →  Docker Compose 部署
```

---

## 預估時間

| Task | 說明 | 預估時間 |
|------|------|----------|
| 1 | 後端專案初始化 | 10 分鐘 |
| 2 | Prisma Schema + Seed | 20 分鐘 |
| 3 | JWT 認證 | 15 分鐘 |
| 4 | CRUD API | 30 分鐘 |
| 5 | 前端專案初始化 | 10 分鐘 |
| 6 | 類型 + API 服務 | 15 分鐘 |
| 7 | Pinia Store | 15 分鐘 |
| 8 | Router + 主入口 | 10 分鐘 |
| 9 | 頁面實作 | 40 分鐘 |
| 10 | Docker Compose | 10 分鐘 |
| **Total** | | **約 3 小時** |

---

*Plan created on 2026-05-29*
