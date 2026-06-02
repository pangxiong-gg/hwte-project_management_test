# 數位化專案管理系統 — 開發進度記錄

> 每次會話結束時更新此文件，確保下次回來能承接上次狀態。

---

## 最後更新

2026-06-02

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

### 日曆/時間線視圖
- [x] 專案詳情頁「時間線」Tab
- [x] 甘特圖（任務時間分佈 + 並行關係）
- [x] 里程碑標記（階段完成 🟢 / 專案截止 🔴）
- [x] 今天指示線
- [x] 負責人頭像 + 進度狀態
- [x] 任務類型顏色區分（開發/設計/測試/文檔）
- [x] 純 CSS Flexbox 渲染（無新圖表庫依賴）

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
| 專案詳情 | /projects/:id | 需求/任務/Bug/測試/時間線 Tab |
| 個人資料 | /profile | 修改姓名/密碼 |
| 用戶管理 | /users | ADMIN 專用 |

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

---

## 待辦事項（下一步方向）

按優先順序：

1. **CI/CD 整合** ✅ — GitHub Actions 狀態顯示（只讀）
2. **文件管理** ✅ — 需求規格書、設計文件上傳
3. **日曆/時間線視圖** ✅ — 里程碑、deadline 視覺化
4. **外部工具整合** — GitHub Webhook、JIRA 同步

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

### 2026-06-02
- 完成日曆/時間線視圖功能（5 個 Task）
- Prisma Schema：Task 新增 `dueDate` 字段
- 後端 API：taskRoutes 支持 `dueDate`/`startedAt`/`completedAt` + 日期驗證
- 前端類型：Task 接口補全日期字段
- 前端組件：ProjectTimeline.vue（里程碑條 + 甘特圖 + 今天線 + 負責人頭像）
- ProjectDetail：集成「時間線」Tab
- 更新 PROGRESS.md 記錄點

### 2026-06-01
- 完成報表與統計功能（8 個 Task）
- 提交並推送到 master
- 建立此 PROGRESS.md 記錄點機制
- 完成 CI/CD 整合（GitHub Actions 狀態顯示）
- 更新 PROGRESS.md 記錄點
- 完成文件管理（上傳/下載/刪除）
- 修復：右上角用戶名刷新後顯示「使用者」（router 自動恢復 user）
- 修復：上傳文件 413 Payload Too Large（Express body 限制增至 50MB）
