# 數位化專案管理系統 - 設計規格書

## 1. 系統概述

### 1.1 專案名稱
數位化專案管理系統

### 1.2 系統定位
為軟體開發團隊設計的完整 SDLC（軟體開發生命週期）管理平台，支援從需求到運維的全流程管理。

### 1.3 目標用戶
- **團隊規模**：5-15 人軟體開發小團隊
- **現況**：使用 Excel + 郵件 + 口頭溝通，沒有統一系統
- **處於轉折點**：Excel 已經撐不住，需要一套「夠用但不複雜」的系統

### 1.4 核心痛點

| 痛點 | 說明 |
|------|------|
| **A. 需求變更影響不明** | 客戶改了需求，不知道影響了哪些程式碼和測試 |
| **B. 開發進度不透明** | 主管問「功能做好了沒」，永遠不知道真實狀態 |
| **C. Bug 溝通成本高** | Bug 來回確認上下文，開發和測試溝通效率低 |

### 1.5 根本解決方案
建立「需求-任務-程式碼-測試-Bug」之間的**完整追溯鏈**，讓資訊自動串聯，減少郵件和口頭確認。

### 1.6 設計原則
1. **先解決 ABC，其他功能等真的痛了再加**
2. **模組可獨立啟用/停用**：現在只需要需求+任務+Bug，將來再加測試用例+發布管理
3. **學習成本低**：介面簡潔，5 分鐘上手
4. **能撐住成長**：設計時預留完整 SDLC，實作時按需啟用

---

## 2. 系統架構

### 2.1 技術棧

| 層級 | 技術 | 選擇理由 |
|------|------|----------|
| **前端** | Vue 3 + TypeScript + Naive UI | 響應式、型別安全、元件豐富且輕量 |
| **後端** | Node.js + Express + Prisma | JavaScript 全端統一、開發效率高 |
| **資料庫** | SQLite（開發）→ PostgreSQL（生產） | 小團隊 SQLite 夠用，成長後無痛遷移 |
| **即時通訊** | Socket.io | 通知推送、任務狀態即時同步 |
| **部署** | Docker Compose | 一條指令啟動，地端部署零門檻 |

### 2.2 分層架構

```
┌─────────────────────────────────────────────────────┐
│  前端（Vue 3 SPA）                                    │
│  views/ pages ──→ components ──→ stores (Pinia)     │
│  │                    │              │              │
│  └────── API Calls ───┴──────────────┘              │
├─────────────────────────────────────────────────────┤
│  REST API（Express）                                 │
│  Routes ──→ Middlewares ──→ Controllers ──→ Services│
│  │          (Auth/RBAC)       (驗證)       (業務邏輯) │
├─────────────────────────────────────────────────────┤
│  資料層（Prisma ORM）                                 │
│  Models ──→ Prisma Client ──→ SQLite/PostgreSQL     │
└─────────────────────────────────────────────────────┘
```

### 2.3 模組邊界

```
基礎設施（所有模組共用）
├── 使用者認證（JWT）
├── 權限控制（RBAC）
├── 通知系統（站內 + Email + Socket.io）
├── 審計日誌（所有操作留痕）
└── 檔案上傳/管理

SDLC 模組（獨立但可互聯）
Phase 1: 需求管理 ──→ Phase 2: 設計管理
    ↓                      ↓
Phase 3: 開發管理 ──→ Phase 4: 測試管理
    ↓                      ↓
Phase 5: 發布管理 ──→ Phase 6: 運維管理
```

**設計原則：**
- 每個 Phase 是獨立模組，有自己的 Service、Controller、Routes
- 模組之間只通過「關聯 ID」溝通，不直接調用對方內部邏輯
- 需要跨模組資料時，通過統一的 Query Service 查詢

---

## 3. 核心資料模型

### 3.1 設計原則

**「萬物皆可追溯」**——任何兩個相關的東西，都能互相找到對方。

### 3.2 基礎實體

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      Role     // ADMIN, PM, DEVELOPER, TESTER, VIEWER
  status    String   // ACTIVE, INACTIVE
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  status      String   // PLANNING, ACTIVE, COMPLETED, ARCHIVED
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
}
```

### 3.3 SDLC 核心實體與追溯鏈

```prisma
model Requirement {
  id          String   @id @default(uuid())
  projectId   String
  reqCode     String   // REQ-2026-001（自動編號）
  title       String
  description String?  @db.Text
  priority    String   // P0, P1, P2, P3
  status      String   // DRAFT, REVIEW, APPROVED, IMPLEMENTING, TESTING, RELEASED, CLOSED
  type        String   // FUNCTIONAL, NON_FUNCTIONAL, BUG_FIX, TECH_DEBT
  createdBy   String
  project     Project  @relation(fields: [projectId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Task {
  id            String   @id @default(uuid())
  projectId     String
  taskCode      String   // TASK-001
  title         String
  description   String?  @db.Text
  type          String   // DEVELOPMENT, DESIGN, TESTING, DOCUMENTATION, BUG_FIX
  status        String   // TODO, IN_PROGRESS, CODE_REVIEW, TESTING, DONE, CANCELLED
  priority      String   // P0, P1, P2, P3
  requirementId String?
  assigneeId    String?
  project       Project  @relation(fields: [projectId], references: [id])
  plannedHours  Float?
  actualHours   Float?
  startedAt     DateTime?
  completedAt   DateTime?
  createdAt     DateTime @default(now())
}

model TestCase {
  id             String   @id @default(uuid())
  projectId      String
  tcCode         String   // TC-001
  title          String
  precondition   String?  @db.Text
  steps          String   @db.Text
  expectedResult String   @db.Text
  requirementId  String?
  project        Project  @relation(fields: [projectId], references: [id])
  createdAt      DateTime @default(now())
}

model Bug {
  id          String   @id @default(uuid())
  projectId   String
  bugCode     String   // BUG-001
  title       String
  description String   @db.Text
  severity    String   // CRITICAL, HIGH, MEDIUM, LOW
  priority    String   // P0, P1, P2, P3
  status      String   // NEW, CONFIRMED, IN_PROGRESS, FIXED, REOPENED, VERIFIED, CLOSED
  requirementId String?
  taskId        String?
  createdById   String
  assigneeId    String?
  project       Project  @relation(fields: [projectId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Release {
  id          String   @id @default(uuid())
  projectId   String
  version     String   // v1.2.0
  name        String
  status      String   // PLANNING, IN_PROGRESS, RELEASED, ARCHIVED
  project     Project  @relation(fields: [projectId], references: [id])
  releasedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

### 3.4 追溯鏈示意

```
需求 REQ-001「使用者登入功能」
    │
    ├──→ 任務 TASK-001「設計登入 API」
    │       └──→ Bug BUG-001「密碼錯誤時無提示」
    │
    ├──→ 任務 TASK-002「實作登入 UI」
    │
    ├──→ 測試用例 TC-001「正確帳密可登入」
    │       └──→ 執行結果：PASS
    │
    ├──→ 測試用例 TC-002「錯誤密碼顯示提示」
    │       └──→ 執行結果：FAIL → 產生 BUG-001
    │
    └──→ 版本 v1.0.0「首次發布」
```

### 3.5 關鍵設計決策

| 決策 | 理由 |
|------|------|
| **每個實體都有獨立編號** | 團隊口頭溝通時直接用編號，不用講長標題 |
| **軟刪除用 `status` 欄位** | 審計需要、誤刪可救、不影響外鍵關聯 |
| **Bug 同時關聯 Requirement + Task** | 三個方向都能追溯：「這個 Bug 是哪個需求產生的？哪個任務引入的？」 |
| **Release 關聯 Requirement 而非 Task** | 向老闆/客戶報告時講「完成了哪些需求」，不講「完成了哪些任務」 |

---

## 4. 功能模組設計

### 4.1 Phase 1：需求管理
**使用者：PM、產品負責人**

| 功能 | 說明 |
|------|------|
| 需求列表 | 看板視圖（依狀態分欄）+ 列表視圖（可搜尋、篩選） |
| 需求詳情 | 標題、描述、優先級、狀態、關聯任務數、關聯 Bug 數 |
| 變更記錄 | 誰改了什麼、改了什麼時候、前後差異對比 |
| 需求審批 | 狀態流轉：草稿 → 待審核 → 已核准 → 實作中 |

### 4.2 Phase 2：設計管理
**使用者：系統架構師、技術負責人**

| 功能 | 說明 |
|------|------|
| 設計文件 | 上傳設計文件（PDF、Word、圖片），支援版本控制 |
| 關聯需求 | 每份設計文件標記「對應哪個需求」 |
| 設計評審 | 線上評審記錄（通過/退回/有條件通過） |

### 4.3 Phase 3：開發管理
**使用者：開發人員、技術主管**

| 功能 | 說明 |
|------|------|
| 任務看板 | Kanban 視圖：待辦 → 進行中 → Code Review → 測試中 → 完成 |
| 任務分配 | 指派給誰、預估工時、截止日期 |
| 工時追蹤 | 實際工時 vs 預估工時、個人負荷視圖 |
| 程式碼關聯 | 提交程式碼時備註 `#TASK-001`，系統自動關聯 |
| Sprint 規劃 | 選一批任務組成 Sprint，設定週期目標 |

### 4.4 Phase 4：測試管理
**使用者：測試人員、QA**

| 功能 | 說明 |
|------|------|
| 測試用例庫 | 依需求分類的測試用例列表 |
| 測試執行 | 一批測試用例組成「測試輪次」，逐條執行標記 PASS/FAIL |
| Bug 提交 | 執行失敗直接產生 Bug，自動關聯需求+任務+測試用例 |
| Bug 看板 | Kanban 視圖：新建 → 確認 → 修復中 → 待驗證 → 已關閉 |
| Bug 統計 | 嚴重程度分布、修復週期、回歸率 |

### 4.5 Phase 5：發布管理
**使用者：PM、運維人員**

| 功能 | 說明 |
|------|------|
| 版本規劃 | 選擇要發布的需求清單，產生發布計劃 |
| 發布檢查清單 | 測試通過？文件齊全？Bug 修完？逐項確認 |
| 發布紀錄 | 每次發布版本號、包含的需求、發布時間、負責人 |

### 4.6 Phase 6：運維管理
**使用者：運維人員、全團隊**

| 功能 | 說明 |
|------|------|
| 線上事件 | 生產環境問題記錄（嚴重程度、影響範圍、處理過程） |
| 事件關聯 | 線上事件可關聯原始需求/Bug，追溯根因 |

### 4.7 基礎設施

| 功能 | 說明 |
|------|------|
| **專案管理** | 建立專案、設定成員、設定權限 |
| **使用者管理** | 邀請成員、分配角色、管理狀態 |
| **通知中心** | 任務指派、Bug 指派、狀態變更 → 站內通知 + Email |
| **儀表板** | 專案總覽：需求完成度、任務進度、Bug 趨勢、版本發布歷史 |
| **審計日誌** | 誰改了什麼、什麼時候改的、改前改後是什麼 |

### 4.8 模組啟用策略

雖然設計是完整 8 Phase，但**實作和啟用分階段**：

```
第一階段（上線即用）：
  ├── 需求管理
  ├── 開發管理（任務看板）
  ├── 測試管理（Bug 追蹤）
  └── 基礎設施（專案/使用者/通知/儀表板）

第二階段（3個月後）：
  ├── 設計管理
  └── 測試用例管理

第三階段（6個月後）：
  ├── 發布管理
  └── Sprint/版本規劃

第四階段（有需要時）：
  └── 運維管理
```

---

## 5. 前端架構

### 5.1 頁面結構與路由

```
登入頁（/login）
    │
    └──→ 登入成功 ──→ 主佈局（Dashboard Layout）
                            │
                            ├──→ /dashboard（儀表板總覽）
                            ├──→ /projects（專案列表）
                            │       └──→ /projects/:id（專案詳情）
                            │               └──→ /projects/:id/requirements
                            │               └──→ /projects/:id/tasks
                            │               └──→ /projects/:id/testcases
                            │               └──→ /projects/:id/bugs
                            │               └──→ /projects/:id/releases
                            ├──→ /settings（系統設定）
                            └──→ /notifications（通知中心）
```

### 5.2 狀態管理（Pinia）

```
stores/
├── auth.ts          # 登入狀態、使用者資訊、Token
├── project.ts       # 當前選中的專案、專案列表
├── requirement.ts   # 需求列表、當前需求、篩選條件
├── task.ts          # 任務看板資料、拖拽狀態
├── bug.ts           # Bug 列表、統計
├── notification.ts  # 未讀數、通知列表
└── ui.ts            # 側邊欄開合、主題、全局載入狀態
```

### 5.3 元件層級

```
頁面層（views/）
├── Login.vue
├── Dashboard.vue
├── ProjectList.vue
├── ProjectDetail.vue
│   ├── RequirementTab.vue
│   ├── TaskBoardTab.vue
│   ├── TestCaseTab.vue
│   ├── BugListTab.vue
│   └── ReleaseTab.vue
└── NotificationCenter.vue

共用元件（components/）
├── AppHeader.vue
├── Sidebar.vue
├── KanbanBoard.vue      # 通用看板元件
├── KanbanCard.vue       # 看板卡片
├── DataTable.vue        # 通用表格
├── EntityDetail.vue     # 通用詳情頁骨架
├── ChangeLog.vue        # 變更記錄時間線
├── ImpactAnalysis.vue   # 影響分析樹狀圖
└── NotificationDropdown.vue
```

### 5.4 UI 設計風格

| 項目 | 選擇 |
|------|------|
| UI 元件庫 | Naive UI |
| 配色 | 深藍主色 + 藍/綠/紅強調色 |
| 佈局 | 側邊欄 + 頂部 Header + 內容區 |
| 響應式 | 桌面優先，平板可用 |

---

## 6. 部署與運維

### 6.1 部署架構

```
開發人員電腦                    公司內網伺服器
┌─────────────┐              ┌─────────────────────────────┐
│  npm run dev│    Docker    │  Docker Compose             │
│  (localhost)│ ───────────→ │  ├── frontend (Nginx)       │
└─────────────┘   Compose    │  ├── backend (Node.js)      │
                             │  └── database (SQLite) 3     │
                             └─────────────────────────────┘
```

### 6.2 一鍵部署

```bash
git clone <專案>
cd 數位化專案管理系統
docker-compose up -d
```

### 6.3 資料庫遷移策略

| 階段 | 資料庫 | 做法 |
|------|--------|------|
| 現在 | SQLite | 單一檔案，備份就是複製 `.db` 檔案 |
| 將來 | PostgreSQL | Prisma 一行指令遷移 |

### 6.4 備份策略

| 資料 | 備份方式 | 頻率 |
|------|----------|------|
| SQLite 資料庫 | 自動備份腳本複製 `.db` 檔案 | 每日 |
| 上傳檔案 | volumes 備份 | 每日 |
| 程式碼 | Git 版本控制 | 每次提交 |

---

## 7. 通知系統設計

### 7.1 通知觸發場景

| 場景 | 接收人 |
|------|--------|
| 需求被指派 | 被指派人 |
| 需求內容變更 | 關聯任務的負責人 |
| 任務狀態變更 | 任務建立者 + PM |
| 任務即將逾期 | 負責人 + PM |
| Bug 指派 | 被指派人 |
| Bug 被修復 | 測試人員 |
| 測試執行失敗 | 相關開發人員 |
| 審批待處理 | 審批人 |

### 7.2 通知渠道

- **站內通知**：即時推送，通知中心顯示紅點
- **Email**：依使用者設定發送（即時或每日摘要）
- **未來擴充**：簡訊/企業微信/Slack（預留接口）

### 7.3 通知中心 UI

- 頁面右上角通知圖示，顯示未讀數
- 點擊展開下拉面板，顯示最近通知
- 點擊通知直接跳轉到相關頁面
- 通知詳情頁面可篩選、標記已讀

---

## 8. 需求變更管理

### 8.1 版本控制

每次修改需求自動產生新版本，保留完整歷史：

```
需求 REQ-001「使用者登入功能」
├── 版本 v1.0（原始）：基本帳密登入
├── 版本 v1.1（變更）：加上記住我功能
└── 版本 v2.0（變更）：加上手機驗證
```

### 8.2 變更影響分析

需求變更時系統自動標記影響範圍：

```
變更影響範圍：
├── 影響任務：3 個
├── 影響測試：2 個
└── 影響版本：v1.0.0 發布計劃
```

### 8.3 變更審批流程

```
需求變更申請
    ├──→ PM 審核
    ├──→ 技術主管審核
    └──→ 核准後生效，自動通知所有相關人員
```

### 8.4 基線管理

里程碑可鎖定需求版本，鎖定後變更需走「變更申請」流程。

---

## 9. 更新紀錄

| 日期 | 版本 | 異動說明 |
|------|------|----------|
| 2026-05-29 | v1.0 | 初始版本：基於需求討論產生的完整設計規格 |

---

*本文件由 brainstorming 技能產生，經使用者和 AI 共同討論確認。*
