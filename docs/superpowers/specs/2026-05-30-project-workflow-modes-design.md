# 專案管理模式設計規格書

## 日期
2026-05-30

## 背景

系統需支援三種專案管理模式（瀑布式 / 敏捷式 / 混合型），讓使用者根據專案特性選擇適合的工作流程。每種模式結合「工作流程階段（方案A）」與「任務類型限制（方案B）」。

---

## 1. 三種模式定義

### 1.1 瀑布式（Waterfall）

**適用場景**：需求明確、變更少、有明確里程碑的專案

**工作流程階段（線性推進）**：
```
需求分析 → 系統設計 → 開發實作 → 測試驗證 → 發布上線
```

**任務類型限制**：

| 階段 | 允許的任務類型 | 禁止的任務類型 |
|------|--------------|--------------|
| 需求分析 | 需求文件、文件 | 開發、測試、Bug修復 |
| 系統設計 | 設計、文件 | 開發、測試 |
| 開發實作 | 開發、Bug修復 | 設計 |
| 測試驗證 | 測試、Bug修復 | 開發、設計 |
| 發布上線 | 文件、運維 | 開發、測試、設計 |

**看板欄位**：5 個階段欄位（線性，任務按階段分組）

---

### 1.2 敏捷式（Agile）

**適用場景**：需求變動頻繁、快速迭代的專案

**工作流程階段（Sprint 循環）**：
```
Sprint 規劃 → 開發中 → 待測試 → 驗收 → 發布 →（下一 Sprint）
```

**任務類型限制**：
- Sprint 內**完全自由**，所有任務類型均可創建
- 任務類型僅作標記和統計用途

**看板欄位**：當前 Sprint 的狀態欄位（待辦 / 進行中 / 待測試 / 已完成）

---

### 1.3 混合型（Hybrid）

**適用場景**：中大型專案，需要方向管控又有迭代彈性

**工作流程階段**：
```
需求分析 → 系統設計 →【迭代開發（Sprint 循環）】→ 驗收測試 → 發布上線
```

**任務類型限制**：

| 大階段 | 限制 |
|--------|------|
| 需求分析 | 僅限需求文件、文件 |
| 系統設計 | 僅限設計、文件 |
| **迭代開發** | **進入 Sprint 後自由** |
| 驗收測試 | 僅限測試、Bug修復 |
| 發布上線 | 僅限文件、運維 |

**看板欄位**：雙層結構
- 上層：大階段進度（顯示目前在哪個大階段）
- 下層：當前 Sprint 看板（待辦 / 進行中 / 待測試 / 已完成）

---

## 2. 資料模型擴展

### 2.1 Project 模型新增欄位

```prisma
model Project {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  description String?
  status      String   @default("PLANNING")
  mode        String   @default("HYBRID")  // WATERFALL | AGILE | HYBRID
  startDate   DateTime?
  endDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requirements Requirement[]
  tasks        Task[]
  bugs         Bug[]
  phases       ProjectPhase[]  // 動態階段記錄
}
```

### 2.2 新增 ProjectPhase 模型

```prisma
model ProjectPhase {
  id          String   @id @default(uuid())
  projectId   String
  name        String   // 階段名稱（依模式不同）
  order       Int      // 順序
  status      String   @default("PENDING")  // PENDING | ACTIVE | COMPLETED
  startedAt   DateTime?
  completedAt DateTime?
  allowedTaskTypes String?  // 逗號分隔的任務類型（null = 不限制）

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 3. 核心功能

### 3.1 建立專案時選擇模式

- 新增專案表單增加「專案模式」下拉選擇
- 選擇後自動生成對應的預設階段（ProjectPhase 記錄）
- 模式建立後**原則上固定不變**

### 3.2 動態看板欄位

- 任務看板根據專案模式動態渲染欄位
- 瀑布式：5 個階段欄位
- 敏捷式：當前 Sprint 的 4 個狀態欄位
- 混合型：Sprint 看板 + 大階段指示器

### 3.3 任務類型動態限制

- 「新增任務」表單的「任務類型」下拉選項
- 根據當前專案模式 + 當前階段動態過濾
- 若當前階段 `allowedTaskTypes` 為 null，顯示全部類型

### 3.4 模式切換機制

**原則**：建立時選擇，運行中不建議切換

**確需切換時**：
1. 提供「匯出專案資料」功能（JSON / CSV）
2. 使用者新建專案並選擇新模式
3. 匯入資料，系統自動進行狀態映射（產生轉換報告）

---

## 4. UI 設計

### 4.1 配色方案（淺色系）

- 背景：#f8fafc（淺灰白）
- 卡片：#ffffff（白色）+ 淺陰影
- 邊框：#e2e8f0（淺灰）
- 主文字：#1e293b（深灰）
- 次要文字：#64748b（中灰）
- 強調色：依模式不同
  - 瀑布式：藍色漸層 (#3b82f6 → #06b6d4)
  - 敏捷式：綠色漸層 (#10b981 → #34d399)
  - 混合型：紫色漸層 (#8b5cf6 → #ec4899)

### 4.2 模式切換按鈕

- 膠囊形狀分段控制器
- 當前模式用漸層色填充
- 未選中模式用淺灰背景

### 4.3 看板卡片

- 圓角 8px，淺陰影
- 優先級標籤：P0(紅) / P1(黃) / P2(灰)
- 任務編號 + 標題 + 指派人

---

## 5. 狀態流轉規則

### 5.1 瀑布式階段推進

- 當前階段所有任務完成後，PM 可手動推進到下一階段
- 推進時可選擇是否「鎖定前一階段」（禁止回頭修改）

### 5.2 敏捷式 Sprint 管理

- Sprint 有開始/結束日期
- Sprint 結束時自動歸檔未完成的任務到新 Sprint
- 支援 Sprint 回顧會議記錄

### 5.3 混合型雙層推進

- 大階段由 PM 手動推進
- 大階段進入「迭代開發」後，內部 Sprint 自動循環
- 所有 Sprint 完成後，PM 手動推進到「驗收測試」

---

## 6. 報表差異

| 報表 | 瀑布式 | 敏捷式 | 混合型 |
|------|--------|--------|--------|
| 進度追蹤 | 階段完成% | Sprint 燃盡圖 | 大階段% + Sprint 燃盡 |
| 任務統計 | 依階段分組 | 依 Sprint 分組 | 依大階段 + Sprint |
| 工時分析 | 階段工時分布 | Sprint 速度 | 兩者結合 |

---

## 7. 實作順序

1. 擴充 Prisma Schema（Project.mode + ProjectPhase）
2. 建立專案時選擇模式 + 自動生成階段
3. 依模式動態渲染看板欄位
4. 依階段動態限制任務類型
5. 瀑布式階段推進功能
6. 敏捷式 Sprint 管理功能
7. 混合型雙層看板
8. 模式切換（匯出/匯入）功能
9. 各模式報表

---

*本文件由 brainstorming 產生，經使用者確認後定稿。*
