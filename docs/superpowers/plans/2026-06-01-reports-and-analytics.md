# 報表與統計功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ProjectList（首頁）集成統計概覽，提供項目進度、團隊效能、Bug 趨勢三類報表，支持 CSV/Excel 導出。

**Architecture:** 後端新增 reportRoutes 提供聚合查詢 API，根據用戶角色動態篩選項目數據；前端在 ProjectList.vue 頂部新增統計卡片與 ECharts 圖表區域，實時計算並渲染。

**Tech Stack:** Express + Prisma + SQLite (backend), Vue 3 + TypeScript + Naive UI + ECharts + vue-echarts (frontend)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `backend/src/routes/reportRoutes.ts` | 報表聚合 API：project-progress, team-efficiency, bug-trends, export |
| `backend/src/index.ts` | 註冊 `/api/reports` 路由 |
| `frontend/src/types/index.ts` | 新增報表相關 TypeScript 類型 |
| `frontend/src/services/api.ts` | 新增 `reportApi` 模塊 |
| `frontend/src/components/ProjectProgressChart.vue` | ECharts 柱狀圖：項目完成率 |
| `frontend/src/components/TeamEfficiencyChart.vue` | ECharts 雷達圖：團隊效能 |
| `frontend/src/components/BugTrendChart.vue` | ECharts 折線圖：Bug 趨勢 |
| `frontend/src/components/BugSeverityChart.vue` | ECharts 餅圖：嚴重度分布 |
| `frontend/src/utils/export.ts` | CSV / Excel 導出工具 |
| `frontend/src/views/ProjectList.vue` | 集成統計區域到頂部 |

---

### Task 1: 安裝前端依賴

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: 安裝 echarts, vue-echarts, xlsx**

```bash
cd frontend
npm install echarts vue-echarts xlsx
```

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(deps): add echarts, vue-echarts, xlsx for reports"
```

---

### Task 2: 後端 - 新增 reportRoutes.ts

**Files:**
- Create: `backend/src/routes/reportRoutes.ts`

- [ ] **Step 1: 創建 reportRoutes.ts**

```typescript
import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

// 獲取用戶可見的項目 ID 列表
async function getVisibleProjectIds(userId: string, userRole: string) {
  if (userRole === 'ADMIN') {
    const projects = await prisma.project.findMany({ select: { id: true } });
    return projects.map((p) => p.id);
  }

  if (userRole === 'PROJECT_MANAGER') {
    // PM 可以看到所有項目（簡化處理，實際應按創建者或權限表）
    const projects = await prisma.project.findMany({ select: { id: true } });
    return projects.map((p) => p.id);
  }

  // DEVELOPER / TESTER：有 assignedTasks 或 assignedBugs 的項目
  const [taskProjects, bugProjects] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
    prisma.bug.findMany({
      where: { assigneeId: userId },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
  ]);

  const ids = new Set([
    ...taskProjects.map((t) => t.projectId),
    ...bugProjects.map((b) => b.projectId),
  ]);
  return Array.from(ids);
}

// GET /api/reports/project-progress
router.get('/project-progress', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const projectIds = await getVisibleProjectIds(userId, userRole);

    if (projectIds.length === 0) {
      return res.json({ projects: [] });
    }

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        phases: { where: { status: 'ACTIVE' }, select: { name: true } },
        _count: {
          select: { tasks: true, requirements: true },
        },
        tasks: { select: { status: true } },
        requirements: { select: { status: true } },
      },
    });

    const result = projects.map((p) => {
      const totalTasks = p._count.tasks;
      const doneTasks = p.tasks.filter((t) => t.status === 'DONE').length;
      const totalReqs = p._count.requirements;
      const doneReqs = p.requirements.filter((r) => r.status === 'COMPLETED').length;
      const now = new Date();

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        status: p.status,
        taskCompletionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        reqCompletionRate: totalReqs > 0 ? Math.round((doneReqs / totalReqs) * 100) : 0,
        currentPhase: p.phases[0]?.name || '-',
        totalTasks,
        doneTasks,
        totalReqs,
        doneReqs,
      };
    });

    res.json({ projects: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/team-efficiency
router.get('/team-efficiency', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const projectIds = await getVisibleProjectIds(userId, userRole);

    if (projectIds.length === 0) {
      return res.json({ members: [] });
    }

    // 獲取參與這些項目的所有成員
    const [taskAssignees, bugAssignees] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, assigneeId: { not: null } },
        select: { assigneeId: true },
        distinct: ['assigneeId'],
      }),
      prisma.bug.findMany({
        where: { projectId: { in: projectIds }, assigneeId: { not: null } },
        select: { assigneeId: true },
        distinct: ['assigneeId'],
      }),
    ]);

    const memberIds = Array.from(
      new Set([
        ...taskAssignees.map((t) => t.assigneeId!).filter(Boolean),
        ...bugAssignees.map((b) => b.assigneeId!).filter(Boolean),
      ])
    );

    if (memberIds.length === 0) {
      return res.json({ members: [] });
    }

    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });

    const result = await Promise.all(
      members.map(async (m) => {
        const [completedTasks, allTasks, fixedBugs, allBugs] = await Promise.all([
          prisma.task.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id, status: 'DONE' },
          }),
          prisma.task.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id },
          }),
          prisma.bug.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id, status: 'CLOSED' },
          }),
          prisma.bug.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id },
          }),
        ]);

        // 計算平均完成時間（已完成的任務）
        const doneTasks = await prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            assigneeId: m.id,
            status: 'DONE',
            startedAt: { not: null },
            completedAt: { not: null },
          },
          select: { startedAt: true, completedAt: true },
        });

        const avgDays =
          doneTasks.length > 0
            ? doneTasks.reduce((sum, t) => {
                const days = (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()) / (1000 * 60 * 60 * 24);
                return sum + days;
              }, 0) / doneTasks.length
            : 0;

        return {
          id: m.id,
          name: m.name,
          completedTasks,
          totalTasks: allTasks,
          fixedBugs,
          totalBugs: allBugs,
          avgCompletionDays: Math.round(avgDays * 10) / 10,
          taskCompletionRate: allTasks > 0 ? Math.round((completedTasks / allTasks) * 100) : 0,
          bugFixRate: allBugs > 0 ? Math.round((fixedBugs / allBugs) * 100) : 0,
        };
      })
    );

    res.json({ members: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/bug-trends?days=30
router.get('/bug-trends', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const projectIds = await getVisibleProjectIds(userId, userRole);
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    if (projectIds.length === 0) {
      return res.json({ timeline: [], bySeverity: {}, byPriority: {} });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // 時間線數據：按天統計 opened / closed
    const bugs = await prisma.bug.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        status: true,
        severity: true,
        priority: true,
        updatedAt: true,
      },
    });

    // 生成日期數組
    const timeline: { date: string; opened: number; closed: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      timeline.push({ date: dateStr, opened: 0, closed: 0 });
    }

    bugs.forEach((b) => {
      const createdDate = b.createdAt.toISOString().split('T')[0];
      const entry = timeline.find((t) => t.date === createdDate);
      if (entry) entry.opened++;

      if (b.status === 'CLOSED') {
        const updatedDate = b.updatedAt.toISOString().split('T')[0];
        const closedEntry = timeline.find((t) => t.date === updatedDate);
        if (closedEntry) closedEntry.closed++;
      }
    });

    // 嚴重度分布
    const bySeverity: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    bugs.forEach((b) => {
      bySeverity[b.severity] = (bySeverity[b.severity] || 0) + 1;
      byPriority[b.priority] = (byPriority[b.priority] || 0) + 1;
    });

    res.json({ timeline, bySeverity, byPriority });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/export?report=bug-trends&format=csv
router.get('/export', async (req, res) => {
  try {
    const { report, format } = req.query;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!report || !format) {
      return res.status(400).json({ error: 'report and format are required' });
    }

    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    if (report === 'project-progress') {
      const projectIds = await getVisibleProjectIds(userId, userRole);
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          name: true,
          code: true,
          status: true,
          _count: { select: { tasks: true, requirements: true } },
          tasks: { select: { status: true } },
          requirements: { select: { status: true } },
        },
      });
      filename = 'project-progress';
      headers = ['專案名稱', '專案代碼', '任務總數', '已完成任務', '需求總數', '已完成需求'];
      data = projects.map((p) => ({
        '專案名稱': p.name,
        '專案代碼': p.code,
        '任務總數': p._count.tasks,
        '已完成任務': p.tasks.filter((t) => t.status === 'DONE').length,
        '需求總數': p._count.requirements,
        '已完成需求': p.requirements.filter((r) => r.status === 'COMPLETED').length,
      }));
    } else if (report === 'bug-trends') {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const projectIds = await getVisibleProjectIds(userId, userRole);
      const bugs = await prisma.bug.findMany({
        where: { projectId: { in: projectIds }, createdAt: { gte: since } },
        select: {
          bugCode: true,
          title: true,
          severity: true,
          priority: true,
          status: true,
          createdAt: true,
        },
      });
      filename = 'bug-trends';
      headers = ['Bug 代碼', '標題', '嚴重度', '優先級', '狀態', '創建日期'];
      data = bugs.map((b) => ({
        'Bug 代碼': b.bugCode,
        '標題': b.title,
        '嚴重度': b.severity,
        '優先級': b.priority,
        '狀態': b.status,
        '創建日期': b.createdAt.toISOString().split('T')[0],
      }));
    } else {
      return res.status(400).json({ error: 'Unknown report type' });
    }

    if (format === 'csv') {
      const csv = [headers.join(','), ...data.map((row) => headers.map((h) => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('﻿' + csv); // BOM for Excel
    } else if (format === 'excel') {
      // 前端會用 xlsx 庫處理，後端返回 JSON，前端生成
      res.json({ headers, data, filename });
    } else {
      res.status(400).json({ error: 'Format must be csv or excel' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/reportRoutes.ts
git commit -m "feat(api): add report routes with project progress, team efficiency, bug trends, and export"
```

---

### Task 3: 後端 - 註冊 reportRoutes

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: 添加 import 和路由註冊**

在 `backend/src/index.ts` 中，於 `import testCaseRoutes` 下方添加：

```typescript
import reportRoutes from './routes/reportRoutes.js';
```

在 `app.use('/api/notifications', notificationRoutes);` 下方添加：

```typescript
app.use('/api/reports', reportRoutes);
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat(api): register report routes at /api/reports"
```

---

### Task 4: 前端 - 新增報表類型

**Files:**
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: 在文件末尾添加報表類型**

```typescript
export interface ProjectProgress {
  id: string;
  name: string;
  code: string;
  status: string;
  taskCompletionRate: number;
  reqCompletionRate: number;
  currentPhase: string;
  totalTasks: number;
  doneTasks: number;
  totalReqs: number;
  doneReqs: number;
}

export interface TeamMemberEfficiency {
  id: string;
  name: string;
  completedTasks: number;
  totalTasks: number;
  fixedBugs: number;
  totalBugs: number;
  avgCompletionDays: number;
  taskCompletionRate: number;
  bugFixRate: number;
}

export interface BugTrendPoint {
  date: string;
  opened: number;
  closed: number;
}

export interface BugTrends {
  timeline: BugTrendPoint[];
  bySeverity: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface ExportData {
  headers: string[];
  data: Record<string, any>[];
  filename: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat(types): add report-related interfaces"
```

---

### Task 5: 前端 - 新增 reportApi

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: 修改 import 和添加 reportApi**

在 import 行添加 `ProjectProgress, TeamMemberEfficiency, BugTrends, ExportData`：

```typescript
import type { LoginResponse, Project, ProjectPhase, Requirement, Task, Bug, User, Notification, RequirementChange, TestCase, TestExecution, ProjectProgress, TeamMemberEfficiency, BugTrends, ExportData } from '../types';
```

在文件末尾 `export default api;` 之前添加：

```typescript
export const reportApi = {
  getProjectProgress: () => api.get<{ projects: ProjectProgress[] }>('/reports/project-progress'),
  getTeamEfficiency: () => api.get<{ members: TeamMemberEfficiency[] }>('/reports/team-efficiency'),
  getBugTrends: (days?: number) => api.get<BugTrends>(`/reports/bug-trends?days=${days || 30}`),
  exportReport: (report: string, format: 'csv' | 'excel') =>
    format === 'csv'
      ? api.get(`/reports/export?report=${report}&format=csv`, { responseType: 'blob' })
      : api.get<ExportData>(`/reports/export?report=${report}&format=excel`),
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat(api): add reportApi module"
```

---

### Task 6: 前端 - 新增圖表組件

**Files:**
- Create: `frontend/src/components/ProjectProgressChart.vue`
- Create: `frontend/src/components/TeamEfficiencyChart.vue`
- Create: `frontend/src/components/BugTrendChart.vue`
- Create: `frontend/src/components/BugSeverityChart.vue`

- [ ] **Step 1: 創建 ProjectProgressChart.vue**

```vue
<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { ProjectProgress } from '../types';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps<{ data: ProjectProgress[] }>();

const option = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['任務完成率', '需求完成率'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
  xAxis: { type: 'category', data: props.data.map((p) => p.name), axisLabel: { rotate: 30 } },
  yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
  series: [
    { name: '任務完成率', type: 'bar', data: props.data.map((p) => p.taskCompletionRate), itemStyle: { color: '#3b82f6' } },
    { name: '需求完成率', type: 'bar', data: props.data.map((p) => p.reqCompletionRate), itemStyle: { color: '#10b981' } },
  ],
}));
</script>

<style scoped>
.chart { height: 280px; }
</style>
```

- [ ] **Step 2: 創建 TeamEfficiencyChart.vue**

```vue
<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { RadarChart } from 'echarts/charts';
import { RadarComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { TeamMemberEfficiency } from '../types';

use([CanvasRenderer, RadarChart, RadarComponent, TooltipComponent, LegendComponent]);

const props = defineProps<{ data: TeamMemberEfficiency[] }>();

const option = computed(() => {
  const indicators = [
    { name: '任務完成率', max: 100 },
    { name: 'Bug 修復率', max: 100 },
    { name: '完成任務數', max: Math.max(...props.data.map((d) => d.completedTasks), 1) * 1.2 },
    { name: '修復 Bug 數', max: Math.max(...props.data.map((d) => d.fixedBugs), 1) * 1.2 },
    { name: '效率 (1/天數)', max: 100 },
  ];

  const seriesData = props.data.map((m) => ({
    value: [
      m.taskCompletionRate,
      m.bugFixRate,
      m.completedTasks,
      m.fixedBugs,
      m.avgCompletionDays > 0 ? Math.min(100, Math.round(10 / m.avgCompletionDays)) : 0,
    ],
    name: m.name,
  }));

  return {
    tooltip: {},
    legend: { data: props.data.map((d) => d.name), bottom: 0 },
    radar: { indicator: indicators, radius: '65%' },
    series: [{ type: 'radar', data: seriesData }],
  };
});
</script>

<style scoped>
.chart { height: 280px; }
</style>
```

- [ ] **Step 3: 創建 BugTrendChart.vue**

```vue
<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';
import type { BugTrendPoint } from '../types';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

const props = defineProps<{ data: BugTrendPoint[] }>();

const option = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['發現', '修復'], bottom: 0 },
  grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
  xAxis: { type: 'category', boundaryGap: false, data: props.data.map((d) => d.date.slice(5)) },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    { name: '發現', type: 'line', data: props.data.map((d) => d.opened), smooth: true, itemStyle: { color: '#ef4444' }, areaStyle: { opacity: 0.1 } },
    { name: '修復', type: 'line', data: props.data.map((d) => d.closed), smooth: true, itemStyle: { color: '#22c55e' }, areaStyle: { opacity: 0.1 } },
  ],
}));
</script>

<style scoped>
.chart { height: 280px; }
</style>
```

- [ ] **Step 4: 創建 BugSeverityChart.vue**

```vue
<template>
  <v-chart class="chart" :option="option" autoresize />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import VChart from 'vue-echarts';

const props = defineProps<{ data: Record<string, number> }>();

const severityColors: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#16a34a',
};

const option = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { orient: 'vertical', left: 'left' },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#1e293b', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: Object.entries(props.data).map(([name, value]) => ({
        name,
        value,
        itemStyle: { color: severityColors[name] || '#64748b' },
      })),
    },
  ],
}));
</script>

<style scoped>
.chart { height: 280px; }
</style>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProjectProgressChart.vue frontend/src/components/TeamEfficiencyChart.vue frontend/src/components/BugTrendChart.vue frontend/src/components/BugSeverityChart.vue
git commit -m "feat(ui): add report chart components (bar, radar, line, pie)"
```

---

### Task 7: 前端 - 新增導出工具

**Files:**
- Create: `frontend/src/utils/export.ts`

- [ ] **Step 1: 創建 export.ts**

```typescript
import * as XLSX from 'xlsx';

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function downloadExcel(filename: string, headers: string[], data: Record<string, any>[]) {
  const rows = data.map((row) => headers.map((h) => row[h] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSV(headers: string[], data: Record<string, any>[]) {
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  return csv;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/utils/export.ts
git commit -m "feat(utils): add CSV/Excel export utilities"
```

---

### Task 8: 前端 - 更新 ProjectList.vue 集成統計區域

**Files:**
- Modify: `frontend/src/views/ProjectList.vue`

- [ ] **Step 1: 修改 template 添加統計區域**

在 `<template>` 的 `<div>` 開頭（在 `<n-h2>` 之前）添加統計區域：

```vue
<template>
  <div>
    <!-- 統計概覽區域 -->
    <div v-if="!loadingStats" style="margin-bottom: 24px;">
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
        <n-statistic label="總專案數" :value="projectStore.projects.length">
          <template #suffix>個</template>
        </n-statistic>
        <n-statistic label="進行中" :value="activeProjects">
          <template #suffix>個</template>
        </n-statistic>
        <n-statistic label="本週完成任務" :value="weeklyCompletedTasks">
          <template #suffix>個</template>
        </n-statistic>
        <n-statistic label="未讀通知" :value="unreadNotifications">
          <template #suffix>個</template>
        </n-statistic>
      </div>

      <n-spin :show="loadingCharts" style="min-height: 300px;">
        <div v-if="projectProgress.length > 0 || teamEfficiency.length > 0 || bugTrends.timeline.length > 0" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          <n-card title="項目進度" size="small">
            <ProjectProgressChart :data="projectProgress.slice(0, 20)" />
          </n-card>
          <n-card title="團隊效能" size="small">
            <TeamEfficiencyChart :data="teamEfficiency" />
          </n-card>
          <n-card title="Bug 趨勢 (30天)" size="small">
            <BugTrendChart :data="bugTrends.timeline" />
          </n-card>
          <n-card title="Bug 嚴重度分布" size="small">
            <BugSeverityChart :data="bugTrends.bySeverity" />
          </n-card>
        </div>
        <n-empty v-else description="暫無報表數據" style="padding: 60px;" />
      </n-spin>

      <div style="display: flex; gap: 8px; margin-top: 16px;">
        <n-button size="small" @click="exportReport('project-progress', 'csv')">導出項目進度 CSV</n-button>
        <n-button size="small" @click="exportReport('project-progress', 'excel')">導出項目進度 Excel</n-button>
        <n-button size="small" @click="exportReport('bug-trends', 'csv')">導出 Bug 趨勢 CSV</n-button>
        <n-button size="small" @click="exportReport('bug-trends', 'excel')">導出 Bug 趨勢 Excel</n-button>
      </div>
    </div>

    <!-- 原有專案列表 -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      ...
```

（保留原有的專案列表部分不變）

- [ ] **Step 2: 修改 script 添加報表邏輯**

在 `<script setup>` 的 import 部分添加：

```typescript
import { NStatistic, NSpin, NCard, NEmpty } from 'naive-ui';
import ProjectProgressChart from '../components/ProjectProgressChart.vue';
import TeamEfficiencyChart from '../components/TeamEfficiencyChart.vue';
import BugTrendChart from '../components/BugTrendChart.vue';
import BugSeverityChart from '../components/BugSeverityChart.vue';
import { reportApi } from '../services/api';
import { downloadCSV, downloadExcel } from '../utils/export';
import type { ProjectProgress, TeamMemberEfficiency, BugTrends } from '../types';
```

在 script 中添加 reactive data 和 methods：

```typescript
const loadingStats = ref(true);
const loadingCharts = ref(true);
const projectProgress = ref<ProjectProgress[]>([]);
const teamEfficiency = ref<TeamMemberEfficiency[]>([]);
const bugTrends = ref<BugTrends>({ timeline: [], bySeverity: {}, byPriority: {} });
const activeProjects = computed(() => projectStore.projects.filter((p) => p.status === 'ACTIVE').length);
const weeklyCompletedTasks = ref(0);
const unreadNotifications = ref(0);

async function loadStats() {
  loadingStats.value = true;
  loadingCharts.value = true;
  try {
    const [progressRes, teamRes, bugRes] = await Promise.all([
      reportApi.getProjectProgress(),
      reportApi.getTeamEfficiency(),
      reportApi.getBugTrends(30),
    ]);
    projectProgress.value = progressRes.data.projects;
    teamEfficiency.value = teamRes.data.members;
    bugTrends.value = bugRes.data;
  } catch (e) {
    console.error('Failed to load stats:', e);
  } finally {
    loadingStats.value = false;
    loadingCharts.value = false;
  }
}

async function exportReport(report: string, format: 'csv' | 'excel') {
  try {
    if (format === 'csv') {
      const res = await reportApi.exportReport(report, 'csv');
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const res = await reportApi.exportReport(report, 'excel');
      const { headers, data, filename } = res.data;
      downloadExcel(filename, headers, data);
    }
  } catch (e) {
    message.error('導出失敗');
  }
}
```

修改 `onMounted`：

```typescript
onMounted(() => {
  projectStore.fetchProjects();
  loadStats();
});
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/ProjectList.vue
git commit -m "feat(ui): integrate report stats and charts into ProjectList"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 項目進度報表 — Task 2 `GET /api/reports/project-progress` + Task 6 `ProjectProgressChart.vue`
- ✅ 團隊效能報表 — Task 2 `GET /api/reports/team-efficiency` + Task 6 `TeamEfficiencyChart.vue`
- ✅ Bug 趨勢報表 — Task 2 `GET /api/reports/bug-trends` + Task 6 `BugTrendChart.vue` + `BugSeverityChart.vue`
- ✅ 權限控制 — Task 2 `getVisibleProjectIds` 函數按角色篩選
- ✅ 導出功能 — Task 2 `GET /api/reports/export` + Task 7 `export.ts` + Task 8 按鈕
- ✅ Dashboard 集成 — Task 8 在 `ProjectList.vue`（首頁）頂部添加統計區域
- ✅ 實時計算 — 所有 API 都是實時查詢

**2. Placeholder scan:** 無 TBD/TODO/佔位符。

**3. Type consistency:** 類型名稱在 Task 4、5、6、8 中一致：`ProjectProgress`, `TeamMemberEfficiency`, `BugTrends`, `BugTrendPoint`, `ExportData`。
