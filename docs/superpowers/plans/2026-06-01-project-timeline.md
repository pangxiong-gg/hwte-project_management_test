# 專案時間線（Timeline）實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在專案詳情頁新增「時間線」Tab，以混合視圖（里程碑 + 甘特圖）展示任務時間分佈。

**Architecture:** 後端擴展 Task 模型新增 `dueDate` 字段並更新 API；前端新增 ProjectTimeline 組件，純 CSS Flexbox 渲染甘特圖，集成到 ProjectDetail.vue 的 Tab 中。

**Tech Stack:** Vue 3 + TypeScript + Naive UI / Express + Prisma + SQLite

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/prisma/schema.prisma` | Modify | Task 模型新增 `dueDate` 字段 |
| `backend/src/routes/taskRoutes.ts` | Modify | 創建/更新接口支持 `dueDate`、`startedAt`、`completedAt` |
| `frontend/src/types/index.ts` | Modify | Task 接口添加 `dueDate`、`startedAt`、`completedAt` |
| `frontend/src/components/ProjectTimeline.vue` | Create | 時間線主組件（里程碑條 + 甘特圖 + 時間軸） |
| `frontend/src/views/ProjectDetail.vue` | Modify | 新增「時間線」Tab，傳入 project/tasks/phases/users |

---

## Task 1: Prisma Schema — 新增 Task.dueDate

**Files:**
- Modify: `backend/prisma/schema.prisma`

**Context:** Task 模型已有 `startedAt`、`completedAt`、`plannedHours`，需要新增 `dueDate` 讓用戶手動設定任務截止日。

- [ ] **Step 1: 在 Task 模型新增 `dueDate` 字段**

在 `backend/prisma/schema.prisma` 的 Task 模型中，`actualHours` 字段下方添加：

```prisma
model Task {
  // ... 現有字段不變
  plannedHours  Float?
  actualHours   Float?
  dueDate       DateTime?  // 新增：任務截止日
  startedAt     DateTime?
  completedAt   DateTime?
  // ...
}
```

- [ ] **Step 2: 執行資料庫遷移**

```bash
cd backend
npx prisma migrate dev --name add_task_due_date
```

Expected: 遷移成功創建，SQLite 資料庫更新。

- [ ] **Step 3: 重新生成 Prisma Client**

```bash
npx prisma generate
```

Expected: Prisma Client 類型更新，包含 `dueDate`。

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): add dueDate to Task model"
```

---

## Task 2: 後端 API — Task 路由支持日期字段

**Files:**
- Modify: `backend/src/routes/taskRoutes.ts`

**Context:** 當前 `POST /` 創建接口接收的字段列表中缺少 `dueDate`、`startedAt`、`completedAt`；`PUT /:id` 使用 `req.body` 直接更新，已經會自動傳入 Prisma，但需要確保前端傳來的日期字符串能被正確處理。

- [ ] **Step 1: 在 POST 接口的解構中添加 `dueDate`、`startedAt`、`completedAt`**

修改 `backend/src/routes/taskRoutes.ts` 第 33 行：

```typescript
// 原代碼：
const { taskCode, title, description, type, priority, requirementId, assigneeId, plannedHours, gitBranch, gitCommit, gitPr } = req.body;

// 改為：
const { taskCode, title, description, type, priority, requirementId, assigneeId, plannedHours, dueDate, startedAt, completedAt, gitBranch, gitCommit, gitPr } = req.body;
```

- [ ] **Step 2: 在 `prisma.task.create()` 的 data 對象中加入新字段**

修改創建數據對象（約第 68-84 行），在 `plannedHours` 後添加：

```typescript
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
    dueDate: dueDate ? new Date(dueDate) : null,      // 新增
    startedAt: startedAt ? new Date(startedAt) : null, // 新增
    completedAt: completedAt ? new Date(completedAt) : null, // 新增
    phaseId: activePhase?.id || null,
    gitBranch,
    gitCommit,
    gitPr,
  },
  // ... include 不變
});
```

- [ ] **Step 3: 驗證 PUT 接口已正確處理日期字段**

PUT 接口使用 `data: req.body` 直接更新（第 136 行），Prisma 會自動將 ISO 日期字符串轉為 DateTime。無需修改代碼，但需要確認前端傳送的日期格式正確。

- [ ] **Step 4: 重啟後端服務驗證**

```bash
cd backend
npm run dev
```

用 curl 測試創建帶 dueDate 的任務：

```bash
curl -X POST http://localhost:3000/api/projects/<project-id>/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"測試任務","dueDate":"2026-07-01T00:00:00Z","plannedHours":40}'
```

Expected: 返回的 task 對象中包含 `dueDate` 字段。

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/taskRoutes.ts
git commit -m "feat(api): support dueDate, startedAt, completedAt in task create"
```

---

## Task 3: 前端類型 — Task 接口補全日期字段

**Files:**
- Modify: `frontend/src/types/index.ts`

**Context:** 當前 `Task` 接口缺少 `dueDate`、`startedAt`、`completedAt`，後端已經返回這些字段但 TypeScript 不知道。

- [ ] **Step 1: 在 Task 接口中添加日期字段**

在 `frontend/src/types/index.ts` 的 Task 接口中，`plannedHours` 下方添加：

```typescript
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
  dueDate?: string;        // 新增
  startedAt?: string;      // 新增（後端已有但前端未定義）
  completedAt?: string;    // 新增（後端已有但前端未定義）
  gitBranch?: string;
  gitCommit?: string;
  gitPr?: string;
  createdAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(types): add dueDate, startedAt, completedAt to Task interface"
```

---

## Task 4: 前端組件 — ProjectTimeline.vue

**Files:**
- Create: `frontend/src/components/ProjectTimeline.vue`

**Context：** 這是核心組件，接收 project + tasks + phases + users，渲染里程碑條和甘特圖。純 CSS Flexbox 實現，不引入新圖表庫。

- [ ] **Step 1: 創建 ProjectTimeline.vue**

```vue
<template>
  <div class="timeline-container">
    <!-- 時間範圍信息 -->
    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
      <n-text depth="3" style="font-size: 13px;">
        📅 {{ formatDateRange }}
      </n-text>
      <n-text depth="3" style="font-size: 12px;">
        共 {{ validTasks.length }} 個任務
      </n-text>
    </div>

    <!-- 里程碑條 -->
    <div v-if="milestones.length > 0" class="milestone-bar">
      <div class="milestone-label">🎯 里程碑</div>
      <div class="timeline-track">
        <div
          v-for="ms in milestones"
          :key="ms.id"
          class="milestone-marker"
          :style="{ left: ms.position + '%' }"
        >
          <n-tooltip>
            <template #trigger>
              <div class="milestone-dot" :class="ms.type">
                {{ ms.type === 'deadline' ? '🔴' : '🟢' }}
              </div>
            </template>
            {{ ms.name }} — {{ formatDate(ms.date) }}
          </n-tooltip>
        </div>
      </div>
    </div>

    <!-- 時間軸刻度 -->
    <div class="time-axis">
      <div class="time-axis-label">任務</div>
      <div class="time-axis-track">
        <div
          v-for="tick in timeTicks"
          :key="tick.value"
          class="time-tick"
          :style="{ left: tick.position + '%' }"
        >
          {{ tick.label }}
        </div>
      </div>
    </div>

    <!-- 甘特圖主體 -->
    <div class="gantt-body">
      <div
        v-for="task in validTasks"
        :key="task.id"
        class="gantt-row"
      >
        <!-- 任務名稱 + 負責人 -->
        <div class="gantt-row-label">
          <n-avatar
            v-if="task.assignee"
            :style="{ backgroundColor: stringToColor(task.assignee.name) }"
            size="small"
            class="assignee-avatar"
          >
            {{ task.assignee.name.charAt(0) }}
          </n-avatar>
          <n-avatar v-else size="small" class="assignee-avatar" style="background: #e2e8f0; color: #94a3b8;">
            ?
          </n-avatar>
          <n-tooltip>
            <template #trigger>
              <span class="task-name">{{ task.title }}</span>
            </template>
            {{ task.title }}
            <br />
            負責人: {{ task.assignee?.name || '未指派' }}
            <br />
            開始: {{ formatDate(task.startedAt) || '未開始' }}
            <br />
            截止: {{ formatDate(task.dueDate) || '未設定' }}
          </n-tooltip>
        </div>

        <!-- 任務條軌道 -->
        <div class="gantt-track">
          <!-- 今天線 -->
          <div
            v-if="todayPosition >= 0 && todayPosition <= 100"
            class="today-line"
            :style="{ left: todayPosition + '%' }"
          >
            <div class="today-label">今天</div>
          </div>

          <!-- 任務條 -->
          <div
            v-if="getTaskBar(task)"
            class="task-bar"
            :class="{
              'task-completed': task.completedAt,
              'task-in-progress': task.startedAt && !task.completedAt,
              'task-pending': !task.startedAt,
            }"
            :style="{
              left: getTaskBar(task)!.left + '%',
              width: getTaskBar(task)!.width + '%',
              backgroundColor: getTaskColor(task.type),
            }"
            @click="$emit('view-task', task)"
          >
            <span class="task-bar-text">{{ taskProgressText(task) }}</span>
          </div>
        </div>
      </div>

      <!-- 無任務提示 -->
      <n-empty v-if="validTasks.length === 0" description="沒有時間信息完整的任務" style="padding: 40px;" />
    </div>

    <!-- 圖例 -->
    <div class="timeline-legend">
      <span class="legend-item"><span class="legend-dot" style="background: #3b82f6;"></span>開發</span>
      <span class="legend-item"><span class="legend-dot" style="background: #8b5cf6;"></span>設計</span>
      <span class="legend-item"><span class="legend-dot" style="background: #ef4444;"></span>測試</span>
      <span class="legend-item"><span class="legend-dot" style="background: #22c55e;"></span>文檔</span>
      <span class="legend-item"><span class="legend-dot" style="background: #64748b;"></span>其他</span>
      <span class="legend-item" style="margin-left: 16px;">|</span>
      <span class="legend-item"><span class="legend-line completed"></span>已完成</span>
      <span class="legend-item"><span class="legend-line in-progress"></span>進行中</span>
      <span class="legend-item"><span class="legend-line pending"></span>未開始</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Task, Project, ProjectPhase } from '../types';
import { NTooltip, NAvatar, NText, NEmpty } from 'naive-ui';

const props = defineProps<{
  project: Project | null;
  tasks: Task[];
  phases: ProjectPhase[];
}>();

defineEmits<{
  (e: 'view-task', task: Task): void;
}>();

// 任務類型顏色映射
const taskTypeColors: Record<string, string> = {
  DEVELOPMENT: '#3b82f6',
  DESIGN: '#8b5cf6',
  TESTING: '#ef4444',
  DOCUMENTATION: '#22c55e',
};

function getTaskColor(type: string): string {
  return taskTypeColors[type?.toUpperCase()] || '#64748b';
}

// 字符串轉顏色（給頭像用）
function stringToColor(str: string): string {
  const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f59e0b', '#06b6d4', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// 格式化日期
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 計算專案時間範圍
const timeRange = computed(() => {
  const tasksWithDates = props.tasks.filter(t => t.startedAt || t.dueDate);
  if (tasksWithDates.length === 0) return null;

  const dates: Date[] = [];
  tasksWithDates.forEach(t => {
    if (t.startedAt) dates.push(new Date(t.startedAt));
    if (t.dueDate) dates.push(new Date(t.dueDate));
  });

  // 也考慮專案本身的 startDate / endDate
  if (props.project?.startDate) dates.push(new Date(props.project.startDate));
  if (props.project?.endDate) dates.push(new Date(props.project.endDate));

  const start = new Date(Math.min(...dates.map(d => d.getTime())));
  const end = new Date(Math.max(...dates.map(d => d.getTime())));

  // 確保至少有 7 天的範圍
  const minEnd = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (end < minEnd) return { start, end: minEnd };

  return { start, end };
});

const formatDateRange = computed(() => {
  if (!timeRange.value) return '暫無時間數據';
  const { start, end } = timeRange.value;
  return `${start.getFullYear()}/${start.getMonth() + 1}/${start.getDate()} ~ ${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`;
});

// 時間範圍總天數
const totalDays = computed(() => {
  if (!timeRange.value) return 1;
  return Math.max(1, (timeRange.value.end.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24));
});

// 今天位置
const todayPosition = computed(() => {
  if (!timeRange.value) return -1;
  const today = new Date();
  const daysSinceStart = (today.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24);
  return (daysSinceStart / totalDays.value) * 100;
});

// 時間刻度
const timeTicks = computed(() => {
  if (!timeRange.value) return [];
  const ticks: { label: string; position: number; value: number }[] = [];
  const days = totalDays.value;
  const tickCount = Math.min(7, Math.max(3, Math.floor(days / 3)));

  for (let i = 0; i <= tickCount; i++) {
    const dayOffset = (days / tickCount) * i;
    const date = new Date(timeRange.value.start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    ticks.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      position: (dayOffset / days) * 100,
      value: date.getTime(),
    });
  }
  return ticks;
});

// 有效任務（有 startedAt 或 dueDate）
const validTasks = computed(() => {
  return props.tasks.filter(t => t.startedAt || t.dueDate);
});

// 里程碑
const milestones = computed(() => {
  const ms: { id: string; name: string; date: Date; position: number; type: 'complete' | 'deadline' }[] = [];
  if (!timeRange.value) return ms;

  // 階段完成里程碑
  props.phases.forEach(phase => {
    if (phase.completedAt) {
      const date = new Date(phase.completedAt);
      const daysSinceStart = (date.getTime() - timeRange.value!.start.getTime()) / (1000 * 60 * 60 * 24);
      ms.push({
        id: `phase-${phase.id}`,
        name: phase.name,
        date,
        position: Math.min(100, Math.max(0, (daysSinceStart / totalDays.value) * 100)),
        type: 'complete',
      });
    }
  });

  // 專案截止日
  if (props.project?.endDate) {
    const date = new Date(props.project.endDate);
    const daysSinceStart = (date.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24);
    ms.push({
      id: 'project-end',
      name: '專案截止',
      date,
      position: Math.min(100, Math.max(0, (daysSinceStart / totalDays.value) * 100)),
      type: 'deadline',
    });
  }

  return ms.sort((a, b) => a.position - b.position);
});

// 計算任務條位置和寬度
function getTaskBar(task: Task): { left: number; width: number } | null {
  if (!timeRange.value) return null;

  const start = task.startedAt
    ? new Date(task.startedAt)
    : task.dueDate
      ? new Date(new Date(task.dueDate).getTime() - (task.plannedHours || 8) * 60 * 60 * 1000)
      : null;

  const end = task.dueDate
    ? new Date(task.dueDate)
    : task.startedAt && task.plannedHours
      ? new Date(new Date(task.startedAt).getTime() + task.plannedHours * 60 * 60 * 1000)
      : null;

  if (!start && !end) return null;

  const barStart = start || end!;
  const barEnd = end || start!;

  const daysSinceStart = (barStart.getTime() - timeRange.value.start.getTime()) / (1000 * 60 * 60 * 24);
  const duration = (barEnd.getTime() - barStart.getTime()) / (1000 * 60 * 60 * 24);

  const left = (daysSinceStart / totalDays.value) * 100;
  const width = Math.max(2, (duration / totalDays.value) * 100); // 最小寬度 2%

  return {
    left: Math.max(0, Math.min(98, left)),
    width: Math.max(2, Math.min(100 - left, width)),
  };
}

// 任務進度文字
function taskProgressText(task: Task): string {
  if (task.completedAt) return '✓';
  if (task.startedAt) return '進行中';
  return '待開始';
}
</script>

<style scoped>
.timeline-container {
  padding: 8px 0;
}

.milestone-bar {
  margin-bottom: 16px;
  padding: 10px 12px;
  background: #fefce8;
  border: 1px solid #fef08a;
  border-radius: 8px;
}

.milestone-label {
  font-size: 12px;
  font-weight: 600;
  color: #854d0e;
  margin-bottom: 8px;
}

.timeline-track {
  position: relative;
  height: 24px;
  background: #fef9c3;
  border-radius: 4px;
}

.milestone-marker {
  position: absolute;
  top: 2px;
  transform: translateX(-50%);
}

.milestone-dot {
  font-size: 14px;
  cursor: pointer;
}

.time-axis {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e2e8f0;
}

.time-axis-label {
  width: 160px;
  font-size: 11px;
  color: #94a3b8;
  flex-shrink: 0;
}

.time-axis-track {
  flex: 1;
  position: relative;
  height: 20px;
}

.time-tick {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 10px;
  color: #94a3b8;
}

.gantt-body {
  min-height: 100px;
}

.gantt-row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f1f5f9;
}

.gantt-row-label {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #334155;
}

.assignee-avatar {
  flex-shrink: 0;
}

.task-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 110px;
}

.gantt-track {
  flex: 1;
  position: relative;
  height: 24px;
  background: #f8fafc;
  border-radius: 4px;
}

.today-line {
  position: absolute;
  top: -6px;
  bottom: -6px;
  width: 2px;
  background: #ef4444;
  border-left: 1px dashed #ef4444;
  z-index: 10;
}

.today-label {
  position: absolute;
  top: -16px;
  left: -14px;
  font-size: 9px;
  color: #ef4444;
  background: #fef2f2;
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
}

.task-bar {
  position: absolute;
  top: 3px;
  height: 18px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s;
  min-width: 24px;
}

.task-bar:hover {
  opacity: 0.85;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.task-bar-text {
  font-size: 9px;
  color: white;
  font-weight: 500;
  white-space: nowrap;
}

.task-completed {
  opacity: 0.9;
}

.task-in-progress {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 4px,
    rgba(255,255,255,0.15) 4px,
    rgba(255,255,255,0.15) 8px
  );
}

.task-pending {
  opacity: 0.5;
}

.timeline-legend {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #64748b;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.legend-line {
  width: 16px;
  height: 8px;
  border-radius: 2px;
}

.legend-line.completed {
  background: #64748b;
  opacity: 0.9;
}

.legend-line.in-progress {
  background: repeating-linear-gradient(
    45deg,
    #64748b,
    #64748b 2px,
    transparent 2px,
    transparent 4px
  );
}

.legend-line.pending {
  background: #64748b;
  opacity: 0.4;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ProjectTimeline.vue
git commit -m "feat(ui): ProjectTimeline component with milestone bar and gantt chart"
```

---

## Task 5: ProjectDetail.vue — 集成「時間線」Tab

**Files:**
- Modify: `frontend/src/views/ProjectDetail.vue`

**Context：** 當前 ProjectDetail.vue 有 requirements、tasks、bugs、tests、cicd、documents 等 Tab，需要新增 timeline Tab。

- [ ] **Step 1: 在 imports 中添加 ProjectTimeline 導入**

在 `<script setup>` 的 import 區域添加：

```typescript
import ProjectTimeline from '../components/ProjectTimeline.vue';
```

- [ ] **Step 2: 在 n-tabs 中添加「時間線」Tab pane**

找到 `<n-tabs type="line" v-model:value="activeTab">` 區域，在最後一個 `n-tab-pane` 後面添加：

```vue
<!-- 時間線 Tab -->
<n-tab-pane name="timeline" tab="時間線">
  <ProjectTimeline
    :project="project"
    :tasks="tasks"
    :phases="phases"
    @view-task="handleViewTaskFromTimeline"
  />
</n-tab-pane>
```

- [ ] **Step 3: 添加 view-task 事件處理函數**

在 `<script setup>` 中添加：

```typescript
function handleViewTaskFromTimeline(task: Task) {
  // 切換到任務 Tab 並打開編輯模態框
  activeTab.value = 'tasks';
  // 可選：打開任務詳情 modal（如果已有相關邏輯）
  // 如果沒有現成的任務詳情 modal，簡單用 message 提示
  message.info(`任務：${task.title} — 負責人：${task.assignee?.name || '未指派'}`);
}
```

需要確認 script 中已有 `message` 的 import。如果沒有：

```typescript
import { useMessage } from 'naive-ui';
const message = useMessage();
```

- [ ] **Step 4: 驗證前端編譯**

```bash
cd frontend
npm run build
```

Expected: 編譯成功，無 TypeScript 錯誤。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/ProjectDetail.vue
git commit -m "feat(ui): add timeline tab to ProjectDetail"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| Spec 需求 | 對應 Task |
|-----------|-----------|
| Task 新增 `dueDate` | Task 1 |
| 後端 API 支持日期字段 | Task 2 |
| 前端類型補全 | Task 3 |
| 里程碑條渲染 | Task 4 (ProjectTimeline.vue) |
| 甘特圖渲染 | Task 4 (ProjectTimeline.vue) |
| 今天線 | Task 4 (todayPosition computed) |
| 任務顏色按類型 | Task 4 (getTaskColor) |
| 負責人頭像 | Task 4 (n-avatar) |
| 進度狀態標識 | Task 4 (task-completed/in-progress/pending class) |
| 集成到 ProjectDetail | Task 5 |

**無遺漏。**

### 2. Placeholder Scan

- 無 TBD/TODO
- 無 "implement later"
- 所有步驟包含實際代碼
- 無 "Similar to Task N"

### 3. Type Consistency

- `dueDate`、`startedAt`、`completedAt` 在前端類型、後端接口、Prisma schema 中名稱一致
- `Task` 接口與組件 props 類型一致

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-01-project-timeline.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
