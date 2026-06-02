# 專案遷移指南

## 打包（在舊電腦）

```bash
cd /path/to/數位化專案管理系統

# 打包原始碼，排除 node_modules 和 .git
tar -czf ~/pm-source.tar.gz --exclude=.git --exclude='**/node_modules' .
```

壓縮後約 150 KB，可用隨身碟、郵件、AirDrop 傳輸。

---

## 必備檔案檢查清單

以下檔案被 `.gitignore` 排除，打包時**不會遺失**（tar 不受 `.gitignore` 影響），但列在這裡方便確認：

| 檔案 | 位置 | 是否必帶 | 說明 |
|------|------|----------|------|
| `.env` | 根目錄 | 必帶 | 資料庫連線、JWT 密鑰 |
| `.env` | `backend/.env` | 必帶 | 後端環境變數 |
| `dev.db` | `backend/prisma/dev.db` | 建議帶 | SQLite 資料庫，含所有專案資料 |
| `migrations/` | `backend/prisma/migrations/` | 必帶 | 資料庫結構遷移腳本 |

---

## 新電腦啟動步驟

### 1. 環境要求

- Node.js 18+（建議 20+）
- npm 9+

### 2. 解壓

```bash
mkdir 數位化專案管理系統 && cd 數位化專案管理系統
tar -xzf ~/pm-source.tar.gz
```

### 3. 安裝後端依賴

```bash
cd backend
npm install
```

### 4. 安裝前端依賴

```bash
cd ../frontend
npm install
```

### 5. 資料庫設定（二選一）

#### 方案 A：帶了 dev.db（推薦，保留資料）

```bash
cd ../backend
npx prisma generate
```

#### 方案 B：沒帶 dev.db（從新開始）

```bash
cd ../backend
npx prisma migrate dev
npx tsx prisma/seed.ts
```

Seed 會建立 4 個測試帳號，密碼都是 `password123`：
- admin@company.com（系統管理員）
- pm@company.com（專案經理）
- dev@company.com（開發人員）
- tester@company.com（測試人員）

### 6. 啟動

**終端 A（後端）：**

```bash
cd backend
npx tsx src/index.ts
# 或開發模式：npx tsx watch src/index.ts
```

**終端 B（前端）：**

```bash
cd frontend
npm run dev
```

### 7. 訪問

- 前端：`http://localhost:5173`（或 vite 提示的端口）
- 後端 API：`http://localhost:3000`

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Vue 3 + TypeScript + Naive UI + Vite |
| 後端 | Node.js + Express + TypeScript |
| 資料庫 | SQLite + Prisma ORM |
| 認證 | JWT |

---

## 已完成功能總覽

### P0
- [x] 登入系統（JWT）
- [x] 專案列表 / 新增專案
- [x] 專案詳情（需求 / 任務 / Bug Tab）
- [x] 新增需求 / 任務 / Bug
- [x] 任務看板（Kanban），支援拖拽變更狀態

### P1
- [x] 需求狀態編輯（下拉選擇）
- [x] Bug 狀態編輯（下拉選擇）
- [x] Bug 指派（建立時 + 列表重新指派）
- [x] 任務看板指派編輯（點擊指派人名稱）

### P2
- [x] 通知系統（Header 通知中心，任務指派/狀態變更時自動發送）
- [x] 需求變更追蹤（記錄所有變更歷史，含 Timeline UI）
