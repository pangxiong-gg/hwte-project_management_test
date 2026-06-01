# 报表与统计功能设计文档

## 日期
2026-06-01

## 背景
系统已具备完整的项目管理基础功能（项目/需求/任务/Bug/测试用例/用户管理）。为帮助管理者和团队成员快速了解项目状态，需要新增报表与统计功能。

## 目标
在 Dashboard 页面集成统计概览，提供项目进度、团队效能、Bug 趋势三类报表，支持 CSV/Excel 导出。

## 架构

### 后端
- 新增 `backend/src/routes/reportRoutes.ts` — 聚合查询 API
- 在 `backend/src/index.ts` 注册 `/api/reports`
- 复用 `authMiddleware` + `roleMiddleware` 做权限校验
- 路由内部根据用户角色动态筛选项目数据

### 前端
- `Dashboard.vue` 顶部新增「统计概览」区域
- 新增 `frontend/src/components/` 下的图表子组件
- `api.ts` 新增 `reportApi` 模块
- 安装 `echarts` + `vue-echarts` 依赖

### 导出
- 前端 `utils/export.ts` 处理 CSV（原生生成）和 Excel（`xlsx` 库）

## API 设计

### `GET /api/reports/project-progress`
返回各项目任务完成率、需求完成率、当前阶段、逾期任务数。

```json
{
  "projects": [
    {
      "name": "项目A",
      "taskCompletionRate": 85,
      "reqCompletionRate": 70,
      "currentPhase": "开发",
      "overdueTasks": 3
    }
  ]
}
```

### `GET /api/reports/team-efficiency`
返回各成员任务完成数、平均完成时间、Bug 修复效率。

```json
{
  "members": [
    {
      "name": "张三",
      "completedTasks": 12,
      "avgCompletionDays": 3.5,
      "fixedBugs": 8
    }
  ]
}
```

### `GET /api/reports/bug-trends?days=30`
返回按时间段的 Bug 发现/修复数、按严重度/优先级分布。

```json
{
  "timeline": [
    { "date": "2026-05-01", "opened": 5, "closed": 3 }
  ],
  "bySeverity": { "CRITICAL": 2, "HIGH": 5, "MEDIUM": 10, "LOW": 3 }
}
```

### `GET /api/reports/export?report=&format=`
导出指定报表为 CSV 或 Excel 格式，返回下载文件。

## 前端组件设计

### Dashboard.vue 布局
```
┌─────────────────────────────────────────────────┐
│  [总项目: 5] [进行中: 3] [本周完成: 12] [Bug: 8] │  ← NStatistic 卡片行
├─────────────────────────────────────────────────┤
│  [项目进度柱状图]        [团队效能雷达图]        │  ← ECharts 图表区 (2列)
├─────────────────────────────────────────────────┤
│  [Bug 趋势折线图]        [严重度分布饼图]        │  ← ECharts 图表区 (2列)
└─────────────────────────────────────────────────┘
```

### 新增组件
- `ProjectProgressChart.vue` — ECharts 柱状图（项目 vs 完成率）
- `TeamEfficiencyChart.vue` — ECharts 雷达图（多维度成员效能）
- `BugTrendChart.vue` — ECharts 折线图（时间线 + 双轴）
- `BugSeverityChart.vue` — ECharts 饼图（严重度分布）
- `ExportButton.vue` — 下拉选择 CSV/Excel，触发下载

## 权限与数据流

### 后端数据筛选
```
用户请求 → authMiddleware 验证 Token
         → roleMiddleware 放行（所有登录用户）
         → reportRoutes 内部筛选：
           ADMIN: 所有项目
           PROJECT_MANAGER: 自己创建/管理的项目
           DEVELOPER/TESTER: 有 assignedTasks 或 assignedBugs 的项目
```

### Prisma 聚合查询
```typescript
// 先获取用户可见的项目 ID 列表
const projectIds = await getVisibleProjectIds(userId, userRole);

// 再聚合查询
const stats = await prisma.project.findMany({
  where: { id: { in: projectIds } },
  include: {
    _count: { select: { tasks: true, requirements: true, bugs: true } },
    tasks: { where: { status: 'DONE' } },
    phases: { where: { status: 'ACTIVE' } },
  }
});
```

### 前端数据流
1. Dashboard 挂载 → 并行调用 3 个报表 API
2. 加载状态：NSpin 覆盖图表区域
3. 数据返回 → ECharts `setOption` 渲染
4. 导出时：调用 export API → 创建 Blob → 触发下载

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 无数据（新项目，0 任务/Bug） | 图表显示「暂无数据」空状态，NStatistic 显示 0 |
| 查询超时/失败 | NSpin 停止，显示 NAlert 错误提示，提供重试按钮 |
| 权限不足（理论上不应发生） | 返回 403，前端跳转到 403 页面 |
| 大量项目（>100） | 图表只展示前 20 个项目，提供「查看全部」跳转到详细列表 |
| 导出大文件 | 后端流式响应，前端显示下载进度 |

## 技术栈
- 后端：Express + Prisma + SQLite
- 前端：Vue 3 + TypeScript + Naive UI + ECharts + vue-echarts
- 导出：原生 CSV + xlsx 库（Excel）
