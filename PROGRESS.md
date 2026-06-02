# 數位化專案管理系統 — 開發進度記錄

> 每次會話結束時更新此文件，確保下次回來能承接上次狀態。

---

## 最後更新

2026-06-02（更新）

---

## 系統概覽

**技術棧：** Vue 3 + TypeScript + Naive UI（前端）/ Express + Prisma + SQLite（後端）

**當前版本：** v1.0.0

---

## 已完成功能

### 認證與權限
- [x] JWT 認證系統（登入/登出/Token 驗證）
- [x] 角色權限控制（RBAC）：ADMIN / PROJECT_MANAGER / TESTER / DEVELOPER
- [x] 管理員中間件（adminMiddleware）
- [x] 角色中間件（roleMiddleware）

### 專案管理
- [x] 專案 CRUD（新增/查看/列表）
- [x] 專案管理模式：瀑布式（WATERFALL）、敏捷式（AGILE）、混合型（HYBRID）
- [x] 專案階段自動生成與管理（ProjectPhase）
- [x] 階段推進功能

### 需求管理
- [x] 需求 CRUD
- [x] 需求變更追蹤（RequirementChange 自動記錄）

### 任務管理
- [x] 任務 CRUD
- [x] 任務看板（Kanban），模式感知渲染
- [x] 任務指派
- [x] 程式碼追溯（Git branch / commit / PR 關聯）
- [x] 子任務分解（parentId + 自動完成規則）
- [x] 任務評論/討論（@提及 + 嵌套回覆）
- [x] 工時進度條（actual / planned）

### Bug 管理
- [x] Bug CRUD
- [x] Bug 指派
- [x] 嚴重度/優先級分類

### 測試管理
- [x] 測試用例 CRUD
- [x] 測試執行記錄（TestExecution）

### 用戶管理
- [x] 用戶列表（ADMIN 專用）
- [x] 創建/編輯/刪除用戶
- [x] 個人資料頁面

### 通知系統
- [x] 任務指派通知
- [x] 狀態變更通知
- [x] 通知輪詢（30 秒間隔）

### 報表與統計
- [x] 項目進度報表（柱狀圖：任務/需求完成率）
- [x] 團隊效能報表（雷達圖：成員多維度效能）
- [x] Bug 趨勢報表（折線圖：30 天發現/修復趨勢）
- [x] Bug 嚴重度分布（餅圖）
- [x] CSV / Excel 導出
- [x] 權限控制（按角色+項目篩選數據）

### CI/CD 整合
- [x] GitHub Actions 狀態顯示（只讀）
- [x] 專案級：工作流列表 + 運行歷史
- [x] 項目配置 GitHub repo 關聯（ADMIN/PM）
- [x] 運行狀態顏色標識（成功/失敗/進行中）

### 文件管理
- [x] 專案級文件上傳/下載/刪除
- [x] 任務級文件關聯
- [x] Base64 上傳 + 本地文件系統存儲
- [x] 權限控制（ADMIN/PM 可刪除任何文件）

### 標籤系統
- [x] 標籤數據模型（Tag + 隱式多對多關聯）
- [x] 標籤 CRUD API
- [x] 任務/Bug/需求標籤關聯（創建/更新）
- [x] TagBadge 組件（帶顏色標籤展示）
- [x] TagSelector 組件（多選下拉 + 創建新標籤）
- [x] TagManager 組件（標籤管理頁面）
- [x] 列表/看板/表格中顯示標籤

### Sprint/迭代管理
- [x] Sprint 數據模型
- [x] Sprint CRUD API（創建/開始/完成/刪除）
- [x] 燃盡圖 API（實際剩餘 vs 理想線）
- [x] SprintList 組件（卡片列表 + 統計 + 進度條）
- [x] SprintBoard 組件（拖拽分配任務到 Sprint）
- [x] 燃盡圖（ECharts 折線圖）

### 日曆/時間線視圖
- [x] 專案詳情頁「時間線」Tab
- [x] 甘特圖（任務時間分佈 + 並行關係）
- [x] 里程碑標記（階段完成 🟢 / 專案截止 🔴）
- [x] 今天指示線
- [x] 負責人頭像 + 進度狀態
- [x] 任務類型顏色區分（開發/設計/測試/文檔）
- [x] 純 CSS Flexbox 渲染（無新圖表庫依賴）

### 我的任務（集中視圖）
- [x] 跨專案任務聚合（/my-tasks）
- [x] 頂部統計卡片（待辦/進行中/已完成/已逾期）
- [x] 逾期警告條
- [x] 狀態篩選 + 搜索
- [x] 列表視圖（按狀態分組）
- [x] 看板視圖（三欄 Kanban）
- [x] 快捷操作（開始/完成任務）
- [x] 工時進度條（actual / planned）

### 工時填報
- [x] 數據庫字段（plannedHours / actualHours）
- [x] 前端工時填報彈窗
- [x] 後端 API 支持更新工時
- [x] 進度可視化（條形進度條）

### GitHub Webhook 整合
- [x] Webhook 接收端點（`/api/webhooks/github`）
- [x] HMAC-SHA256 簽名驗證（混合模式：開發跳過/生產驗證）
- [x] push 事件 — 自動關聯任務 gitCommit
- [x] pull_request 事件 — PR 創建/合併更新 gitPr
- [x] workflow_run 事件 — CI 成功/失敗自動通知
- [x] WebhookEvent 日誌模型 + 查詢 API
- [x] 前端 Webhook 日誌 Tab

---

## 數據模型

```
User ─┬─→ Requirement (createdBy)
      ├─→ Task (assignee)
      ├─→ Bug (createdBy, assignee)
      ├─→ Notification
      └─→ RequirementChange (changedBy)

Project ─┬─→ Requirement
         ├─→ ProjectPhase
         ├─→ Task
         ├─→ TestCase ─┬─→ TestExecution
         │             └─→ Bug
         └─→ Bug
```

---

## 前端頁面

| 頁面 | 路徑 | 說明 |
|------|------|------|
| 登入 | /login | JWT 登入 |
| 專案列表 | / | 專案表格 + 統計概覽 + 報表圖表 |
| 我的任務 | /my-tasks | 跨專案任務集中管理（列表+看板視圖） |
| 資源負載 | /resource-load | PM 團隊負載監控（卡片+圖表雙視圖） |
| 專案詳情 | /projects/:id | 需求/任務/Bug/測試/時間線/Webhook日誌 Tab |
| 個人資料 | /profile | 修改姓名/密碼 |
| 用戶管理 | /users | ADMIN 專用 |
| Sprint 看板 | 專案詳情「Sprint」Tab | Sprint 列表 + 燃盡圖 + 任務分配 |
| 日曆 | /calendar | 全局日曆視圖 |
| 全局搜索 | 頂部導航欄 | 任務/需求/Bug/專案搜索 |

---

## 後端 API 路由

| 路由 | 說明 |
|------|------|
| /api/auth | 認證 |
| /api/projects | 專案 |
| /api/projects/:id/phases | 階段 |
| /api/projects/:id/requirements | 需求 |
| /api/projects/:id/tasks | 任務 |
| /api/projects/:id/bugs | Bug |
| /api/projects/:id/test-cases | 測試用例 |
| /api/users | 用戶 |
| /api/notifications | 通知 |
| /api/reports | 報表（project-progress, team-efficiency, bug-trends, export）|
| /api/my-tasks | 我的任務（跨專案任務查詢、狀態更新、工時填報）|
| /api/resource-load | 資源負載（團隊成員任務分配、工時、超載檢測）|
| /api/projects/:id/sprints | Sprint（CRUD + 燃盡圖）|
| /api/calendar/events | 日曆事件（任務截止/專案截止/Sprint）|
| /api/search | 全局搜索（任務/需求/Bug/專案）|

---

## 待辦事項（下一步方向）

按優先順序：

1. **CI/CD 整合** ✅ — GitHub Actions 狀態顯示（只讀）
2. **文件管理** ✅ — 需求規格書、設計文件上傳
3. **日曆/時間線視圖** ✅ — 里程碑、deadline 視覺化
4. **外部工具整合** ✅ — GitHub Webhook（push/PR/workflow_run）
5. **我的任務** ✅ — 跨專案任務集中視圖
6. **工時填報** ✅ — actualHours 填報與可視化
7. **資源負載視圖** ✅ — PM 視角的團隊負載監控
8. **SVG 圖標系統** ✅ — 全站 emoji 替換為科技風格 SVG
9. **任務評論** ✅ — 項目級討論（@提及 + 嵌套回覆）
10. **子任務分解** ✅ — 任務樹狀結構 + 自動完成規則
11. **標籤系統** ✅ — 任務/Bug/需求標籤分類
12. **拖拽看板** ✅ — Kanban 拖拽改變狀態（視覺反饋 + dragend 清理）
13. **Sprint/迭代管理** ✅ — Sprint 規劃 + 燃盡圖
14. **郵件通知** ✅ — SMTP 郵件推送 + 用戶偏好開關
15. **日曆視圖** ✅ — 全局日曆（任務截止/專案截止/Sprint 日期）
16. **全局搜索** ✅ — 跨項目搜索任務/需求/Bug/專案
17. **測試報告** — 測試覆蓋率統計
18. **ADMIN 審計日誌** — 操作追溯
18. **ADMIN 審計日誌** — 操作追溯

---

---

## 已知問題

- 暫無

---

## 環境設定

```bash
# 後端
cd backend
npm run dev          # 開發模式 (PORT 3000)
npm run db:migrate   # 資料庫遷移

# 前端
cd frontend
npm run dev          # 開發模式 (PORT 5173)
```

---

## 會話記錄

### 2026-06-02（第四輪）
- 按序執行 P2 功能：郵件通知 + 日曆視圖 + 全局搜索
- 郵件通知：nodemailer + SMTP 配置 + 通知觸發時自動發送郵件 + Profile 頁面郵件開關
- 日曆視圖：calendarRoutes API（任務截止/專案截止/Sprint 日期）+ CalendarView 月曆組件 + 事件標記彈窗
- 全局搜索：searchRoutes API（跨類型全文搜索）+ Dashboard 頂部搜索框 + 搜索結果彈窗
- UI 微調：資源負載統計卡片圖標移到 label 左側

### 2026-06-02（第三輪）
- 按序執行 P1 功能：標籤系統 + Sprint 管理 + 拖拽改進
- 標籤系統：Tag 模型 + 多對多關聯 + CRUD API + TagBadge/TagSelector/TagManager 組件 + 整合到任務/Bug/需求
- 改進 Kanban 拖拽：dragging class（半透明 + 縮放）、dragend 清理、drag-over 列高亮
- Sprint 管理：Sprint 模型 + sprintId on Task + CRUD/burndown API + SprintList/SprintBoard + 燃盡圖

### 2026-06-02（第二輪）
- 角色場景分析：ADMIN/PM/DEVELOPER/TESTER 的完整使用場景與缺口驗證
- 新增「我的任務」集中視圖（/my-tasks）
- 後端：myTaskRoutes.ts（跨專案任務查詢、狀態更新、工時填報 API）
- 前端：MyTasks.vue（列表+看板雙視圖、統計卡片、逾期警告、篩選搜索）
- 前端：TaskSection.vue + KanbanColumn.vue 子組件
- 新增工時填報功能（工時彈窗 + 進度條可視化）
- 更新 Dashboard 側邊欄菜單、路由、API 服務

### 2026-06-02
- 完成日曆/時間線視圖功能（5 個 Task）
- Prisma Schema：Task 新增 `dueDate` 字段
- 後端 API：taskRoutes 支持 `dueDate`/`startedAt`/`completedAt` + 日期驗證
- 前端類型：Task 接口補全日期字段
- 前端組件：ProjectTimeline.vue（里程碑條 + 甘特圖 + 今天線 + 負責人頭像）
- ProjectDetail：集成「時間線」Tab
- 完成 GitHub Webhook 整合（9 個 Task）
- Prisma Schema：新增 WebhookEvent 模型
- 後端：簽名驗證中間件 + 事件處理器 + Webhook 接收端點 + 日誌 API
- 前端：WebhookEventLog 組件 + ProjectDetail「Webhook 日誌」Tab
- 更新 PROGRESS.md 記錄點
- 討論記錄中所有功能已完成：報表統計、CI/CD、文件管理、時間線、Webhook

### 2026-06-01
- 完成報表與統計功能（8 個 Task）
- 提交並推送到 master
- 建立此 PROGRESS.md 記錄點機制
- 完成 CI/CD 整合（GitHub Actions 狀態顯示）
- 更新 PROGRESS.md 記錄點
- 完成文件管理（上傳/下載/刪除）
- 修復：右上角用戶名刷新後顯示「使用者」（router 自動恢復 user）
- 修復：上傳文件 413 Payload Too Large（Express body 限制增至 50MB）
