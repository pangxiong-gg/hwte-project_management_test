# 專案時間線（Timeline）設計文件

> 在專案詳情頁新增「時間線」Tab，以混合視圖展示任務甘特圖和里程碑。

---

## 目標

讓專案成員在查看專案時，能直觀掌握：
- 各任務的時間分佈和並行關係
- 關鍵里程碑和截止日
- 每個任務的負責人和當前進度

---

## 架構

### 數據模型

**新增字段（Prisma schema）：**

```prisma
model Task {
  // ... 現有字段
  dueDate DateTime? // 新增：任務截止日
}
```

**不改動的現有字段（直接復用）：**

| 來源 | 字段 | 用途 |
|------|------|------|
| `Task` | `startedAt` | 任務開始時間 |
| `Task` | `completedAt` | 任務完成時間（判斷是否已完成） |
| `Task` | `plannedHours` | 預計工時 |
| `Task` | `assigneeId` → `User.name` | 負責人 |
| `ProjectPhase` | `completedAt` | 階段完成里程碑 🟢 |
| `Project` | `endDate` | 專案截止日 🔴 |

### API

**不改動路由**，在現有接口上擴展：

- `POST /api/projects/:projectId/tasks` — body 支持 `dueDate` 字段
- `PUT /api/projects/:projectId/tasks/:id` — body 支持 `dueDate` 字段
- `GET /api/projects/:projectId/tasks` — 返回中已包含所有需要字段（加 `dueDate` 後）
- `GET /api/projects/:projectId/phases` — 返回階段列表（含 `completedAt`）

### 前端組件結構

```
ProjectDetail.vue
└── n-tab-pane (name="timeline", tab="時間線")
    └── ProjectTimeline.vue
        ├── MilestoneBar.vue      — 頂部里程碑標記行
        └── GanttChart.vue        — 甘特圖主體
            ├── TimeAxis.vue      — 時間軸刻度
            └── GanttTaskRow.vue  — 單個任務行（含任務條 + 負責人頭像）
```

### 技術實現

- **渲染方式**：純 CSS Flexbox（不用 ECharts，ECharts 沒有內建甘特圖類型）
- **時間計算**：任務條寬度 = `(dueDate - startedAt) / 專案總天數 * 100%`
- **位置計算**：任務條 left = `(startedAt - 專案開始日) / 專案總天數 * 100%`
- **今天線**：紅色虛線，位置 = `(今天 - 專案開始日) / 專案總天數 * 100%`

---

## 視覺規範

### 色彩

| 元素 | 顏色 | 說明 |
|------|------|------|
| 開發任務 | `#3b82f6` (藍) | `type === 'DEVELOPMENT'` |
| 設計任務 | `#8b5cf6` (紫) | `type === 'DESIGN'` |
| 測試任務 | `#ef4444` (紅) | `type === 'TESTING'` |
| 文檔任務 | `#22c55e` (綠) | `type === 'DOCUMENTATION'` |
| 其他任務 | `#64748b` (灰) | 默認 |
| 今天線 | `#ef4444` 虛線 | 標記當前日期 |
| 已完成任務 | 實色填充 | `completedAt !== null` |
| 進行中任務 | 實色 + 條紋背景 | `startedAt !== null && completedAt === null` |
| 未開始任務 | 半透明填充 | `startedAt === null` |

### 里程碑標記

- 🟢 綠色圓點：`ProjectPhase.completedAt`（階段完成）
- 🔴 紅色圓點：`Project.endDate`（專案截止）
- 懸停顯示 Tooltip：里程碑名稱和日期

### 任務條交互

- **懸停**：NTooltip 顯示任務名、負責人、起止時間
- **點擊**：彈出 NModal 顯示任務完整詳情（可跳轉到任務編輯）

---

## 數據流

```
ProjectDetail.vue 加載時
  ├── 調用 projectApi.getProject(id) → 取得 project.startDate / endDate
  ├── 調用 taskApi.getTasks(projectId) → 取得 tasks（含 dueDate）
  ├── 調用 phaseApi.getPhases(projectId) → 取得 phases（含 completedAt）
  └── 數據傳入 ProjectTimeline.vue
        ├── 計算專案總時間範圍（min startDate/max endDate）
        ├── 計算每個 milestone 的位置百分比
        ├── 計算每個 task 的位置和寬度百分比
        └── 渲染
```

---

## 錯誤處理

- 任務沒有 `startedAt`：不顯示在甘特圖上（僅在列表中顯示）
- 任務沒有 `dueDate`：用 `startedAt + plannedHours` 作為 fallback 計算結束時間
- 專案沒有 `startDate` / `endDate`：用最早任務開始日和最晚任務截止日作為時間範圍
- 時間範圍為 0（所有任務同一天）：默認顯示 7 天寬度避免除零

---

## 文件清單

| 文件 | 操作 | 說明 |
|------|------|------|
| `backend/prisma/schema.prisma` | 修改 | Task 模型新增 `dueDate` 字段 |
| `backend/src/routes/taskRoutes.ts` | 修改 | 創建/更新接口支持 `dueDate` |
| `frontend/src/views/ProjectDetail.vue` | 修改 | 新增「時間線」Tab |
| `frontend/src/components/ProjectTimeline.vue` | 創建 | 時間線主組件 |
| `frontend/src/components/MilestoneBar.vue` | 創建 | 里程碑標記行 |
| `frontend/src/components/GanttChart.vue` | 創建 | 甘特圖主體 |
| `frontend/src/components/GanttTaskRow.vue` | 創建 | 單個任務行 |
| `frontend/src/types/index.ts` | 修改 | Task 類型新增 `dueDate` |

---

## 後續可擴展

- Dashboard 全局日曆視圖（基於此組件擴展）
- 拖拽調整任務日期（需後端支持更新 startedAt/dueDate）
- 專案關鍵路徑（CPM）計算和標記
