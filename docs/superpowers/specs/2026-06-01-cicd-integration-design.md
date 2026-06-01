# CI/CD 整合設計文檔

## 日期
2026-06-01

## 背景
系統已具備完整的專案管理功能，需要與 GitHub Actions 整合，在專案管理系統中查看 CI/CD 狀態。

## 目標
實現只讀的 GitHub Actions 狀態顯示：專案級查看工作流列表與運行歷史，任務級查看關聯的 CI 狀態。

## 架構

### 數據層
- Project 模型新增 `githubRepo` 字段（格式：`owner/repo-name`）

### 後端 API
- `GET /api/projects/:id/workflows` — GitHub Actions 工作流列表
- `GET /api/projects/:id/runs` — 運行歷史
- `GET /api/projects/:id/runs/:runId` — 運行詳情 + 日誌

### 前端
- ProjectDetail.vue 新增「CI/CD」Tab
- TaskBoard.vue 任務卡片顯示關聯 CI 狀態（根據 gitCommit 匹配）

### 數據流
1. 系統調用 GitHub API（需配置 GitHub token）
2. 緩存 5 分鐘
3. 前端渲染

## 權限
- 所有項目成員可查看 CI/CD 狀態
- 僅 ADMIN/PM 可配置/修改 GitHub repo 關聯
