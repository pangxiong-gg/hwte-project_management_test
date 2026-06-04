import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    // === 用戶（固定 UUID，token 永遠有效）===
    const admin = await prisma.user.create({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', email: 'admin@company.com', name: '系統管理員', password: hashedPassword, role: 'ADMIN' } });
    const pm = await prisma.user.create({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', email: 'pm@company.com', name: '專案經理', password: hashedPassword, role: 'PROJECT_MANAGER' } });
    const pm2 = await prisma.user.create({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', email: 'pm2@company.com', name: '產品經理', password: hashedPassword, role: 'PROJECT_MANAGER' } });
    const dev1 = await prisma.user.create({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', email: 'dev1@company.com', name: '老張', password: hashedPassword, role: 'DEVELOPER' } });
    const dev2 = await prisma.user.create({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', email: 'dev2@company.com', name: '小王', password: hashedPassword, role: 'DEVELOPER' } });
    const dev3 = await prisma.user.create({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', email: 'dev3@company.com', name: '小李', password: hashedPassword, role: 'DEVELOPER' } });
    const tester = await prisma.user.create({ data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a77', email: 'tester@company.com', name: '測試員', password: hashedPassword, role: 'TESTER' } });
    // === 專案 1：瀑布式 ===
    const project1 = await prisma.project.create({
        data: {
            code: 'PROJ-001',
            name: '電商平台重構',
            description: '將舊版電商平台重構為微服務架構，提升效能與可擴展性',
            status: 'ACTIVE',
            mode: 'WATERFALL',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            githubRepo: 'company/ecommerce-platform',
        },
    });
    // 專案 1 階段
    const phases1 = await Promise.all([
        prisma.projectPhase.create({ data: { projectId: project1.id, name: '需求分析', order: 1, status: 'COMPLETED', startedAt: new Date('2026-01-01'), completedAt: new Date('2026-02-28') } }),
        prisma.projectPhase.create({ data: { projectId: project1.id, name: '系統設計', order: 2, status: 'COMPLETED', startedAt: new Date('2026-03-01'), completedAt: new Date('2026-04-15') } }),
        prisma.projectPhase.create({ data: { projectId: project1.id, name: '開發實作', order: 3, status: 'ACTIVE', startedAt: new Date('2026-04-16'), allowedTaskTypes: 'DEVELOPMENT,BUG_FIX' } }),
        prisma.projectPhase.create({ data: { projectId: project1.id, name: '測試驗收', order: 4, status: 'PENDING', allowedTaskTypes: 'TESTING' } }),
        prisma.projectPhase.create({ data: { projectId: project1.id, name: '部署上線', order: 5, status: 'PENDING', allowedTaskTypes: 'OPERATION' } }),
    ]);
    // 專案 1 標籤
    const tags1 = await Promise.all([
        prisma.tag.create({ data: { projectId: project1.id, name: '前端', color: '#3b82f6' } }),
        prisma.tag.create({ data: { projectId: project1.id, name: '後端', color: '#22c55e' } }),
        prisma.tag.create({ data: { projectId: project1.id, name: '資料庫', color: '#f59e0b' } }),
        prisma.tag.create({ data: { projectId: project1.id, name: '高優先級', color: '#ef4444' } }),
        prisma.tag.create({ data: { projectId: project1.id, name: '技術債', color: '#8b5cf6' } }),
    ]);
    // 專案 1 需求
    const reqs1 = await Promise.all([
        prisma.requirement.create({ data: { projectId: project1.id, reqCode: 'REQ-001', title: '使用者認證系統', description: 'JWT 認證 + 角色權限控制', priority: 'P0', status: 'IMPLEMENTED', type: 'FUNCTIONAL', createdById: pm.id } }),
        prisma.requirement.create({ data: { projectId: project1.id, reqCode: 'REQ-002', title: '商品管理模組', description: '商品 CRUD + 庫存管理', priority: 'P0', status: 'IMPLEMENTED', type: 'FUNCTIONAL', createdById: pm.id } }),
        prisma.requirement.create({ data: { projectId: project1.id, reqCode: 'REQ-003', title: '訂單處理流程', description: '訂單創建/支付/出貨/退貨流程', priority: 'P0', status: 'APPROVED', type: 'FUNCTIONAL', createdById: pm.id } }),
        prisma.requirement.create({ data: { projectId: project1.id, reqCode: 'REQ-004', title: '效能優化', description: '資料庫查詢優化 + 快取策略', priority: 'P1', status: 'APPROVED', type: 'TECH_DEBT', createdById: pm.id } }),
        prisma.requirement.create({ data: { projectId: project1.id, reqCode: 'REQ-005', title: 'API 文件', description: '自動生成 API 文件', priority: 'P2', status: 'DRAFT', type: 'DOCUMENTATION', createdById: pm2.id } }),
    ]);
    // 專案 1 Sprint
    const sprint1 = await prisma.sprint.create({
        data: {
            projectId: project1.id,
            name: 'Sprint 1 - 認證與商品',
            goal: '完成使用者認證與商品管理核心功能',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-14'),
            status: 'ACTIVE',
        },
    });
    const sprint2 = await prisma.sprint.create({
        data: {
            projectId: project1.id,
            name: 'Sprint 2 - 訂單流程',
            goal: '完成訂單創建與支付流程',
            startDate: new Date('2026-06-15'),
            endDate: new Date('2026-06-28'),
            status: 'PLANNING',
        },
    });
    // 專案 1 任務
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const next2Weeks = new Date(today);
    next2Weeks.setDate(today.getDate() + 14);
    const tasks1 = await Promise.all([
        // 已完成的任務
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-001', title: '設計 JWT 認證 API', description: '設計登入/註冊/Token 刷新 API', type: 'DEVELOPMENT', status: 'DONE', priority: 'P0', requirementId: reqs1[0].id, assigneeId: dev1.id, plannedHours: 16, actualHours: 14, dueDate: new Date('2026-04-20'), startedAt: new Date('2026-04-16'), completedAt: new Date('2026-04-19'), phaseId: phases1[2].id, sprintId: sprint1.id, tags: { connect: [{ id: tags1[1].id }, { id: tags1[3].id }] } } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-002', title: '實作登入頁面', description: 'Vue3 + Naive UI 登入表單', type: 'DEVELOPMENT', status: 'DONE', priority: 'P0', requirementId: reqs1[0].id, assigneeId: dev2.id, plannedHours: 12, actualHours: 10, dueDate: new Date('2026-04-25'), startedAt: new Date('2026-04-21'), completedAt: new Date('2026-04-24'), phaseId: phases1[2].id, sprintId: sprint1.id, tags: { connect: [{ id: tags1[0].id }, { id: tags1[3].id }] } } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-003', title: '商品資料庫設計', description: '設計商品/庫存/分類資料表', type: 'DEVELOPMENT', status: 'DONE', priority: 'P0', requirementId: reqs1[1].id, assigneeId: dev1.id, plannedHours: 20, actualHours: 18, dueDate: new Date('2026-05-05'), startedAt: new Date('2026-04-26'), completedAt: new Date('2026-05-04'), phaseId: phases1[2].id, sprintId: sprint1.id, tags: { connect: [{ id: tags1[1].id }, { id: tags1[2].id }] } } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-004', title: '商品列表 API', description: '分頁/篩選/排序 API', type: 'DEVELOPMENT', status: 'DONE', priority: 'P0', requirementId: reqs1[1].id, assigneeId: dev3.id, plannedHours: 16, actualHours: 15, dueDate: new Date('2026-05-15'), startedAt: new Date('2026-05-06'), completedAt: new Date('2026-05-14'), phaseId: phases1[2].id, sprintId: sprint1.id, tags: { connect: [{ id: tags1[1].id }] } } }),
        // 進行中的任務
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-005', title: '商品詳情頁面', description: '商品展示 + 圖片輪播', type: 'DEVELOPMENT', status: 'IN_PROGRESS', priority: 'P0', requirementId: reqs1[1].id, assigneeId: dev2.id, plannedHours: 20, actualHours: 8, dueDate: nextWeek, startedAt: new Date('2026-05-20'), phaseId: phases1[2].id, sprintId: sprint1.id, tags: { connect: [{ id: tags1[0].id }, { id: tags1[3].id }] } } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-006', title: '購物車 API', description: '購物車 CRUD + 庫存檢查', type: 'DEVELOPMENT', status: 'IN_PROGRESS', priority: 'P1', requirementId: reqs1[2].id, assigneeId: dev1.id, plannedHours: 24, actualHours: 10, dueDate: nextWeek, startedAt: new Date('2026-05-25'), phaseId: phases1[2].id, sprintId: sprint1.id, tags: { connect: [{ id: tags1[1].id }] } } }),
        // 待辦任務
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-007', title: '支付整合', description: '串接金流服務 API', type: 'DEVELOPMENT', status: 'TODO', priority: 'P0', requirementId: reqs1[2].id, assigneeId: dev3.id, plannedHours: 32, actualHours: 0, dueDate: next2Weeks, phaseId: phases1[2].id, sprintId: sprint2.id, tags: { connect: [{ id: tags1[1].id }, { id: tags1[3].id }] } } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-008', title: '訂單管理後台', description: '訂單列表/詳情/狀態管理', type: 'DEVELOPMENT', status: 'TODO', priority: 'P0', requirementId: reqs1[2].id, assigneeId: dev2.id, plannedHours: 24, actualHours: 0, dueDate: next2Weeks, phaseId: phases1[2].id, sprintId: sprint2.id, tags: { connect: [{ id: tags1[0].id }] } } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-009', title: 'Redis 快取層', description: '熱門商品/分類快取', type: 'DEVELOPMENT', status: 'TODO', priority: 'P1', requirementId: reqs1[3].id, assigneeId: dev1.id, plannedHours: 16, actualHours: 0, dueDate: next2Weeks, phaseId: phases1[2].id, tags: { connect: [{ id: tags1[4].id }] } } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-010', title: 'API 文件撰寫', description: 'Swagger/OpenAPI 文件', type: 'DOCUMENTATION', status: 'TODO', priority: 'P2', requirementId: reqs1[4].id, assigneeId: dev3.id, plannedHours: 8, actualHours: 0, dueDate: next2Weeks, phaseId: phases1[2].id, tags: { connect: [{ id: tags1[4].id }] } } }),
    ]);
    // 專案 1 Bug
    const bugs1 = await Promise.all([
        prisma.bug.create({ data: { projectId: project1.id, bugCode: 'BUG-001', title: '登入後 Token 無法刷新', description: 'Token 過期後調用刷新 API 返回 401', severity: 'CRITICAL', priority: 'P0', status: 'RESOLVED', requirementId: reqs1[0].id, taskId: tasks1[0].id, createdById: tester.id, assigneeId: dev1.id } }),
        prisma.bug.create({ data: { projectId: project1.id, bugCode: 'BUG-002', title: '商品圖片上傳失敗', description: '上傳超過 2MB 的圖片時報錯', severity: 'HIGH', priority: 'P1', status: 'IN_PROGRESS', requirementId: reqs1[1].id, taskId: tasks1[3].id, createdById: tester.id, assigneeId: dev2.id } }),
        prisma.bug.create({ data: { projectId: project1.id, bugCode: 'BUG-003', title: '購物車數量不更新', description: '修改數量後總價未重新計算', severity: 'MEDIUM', priority: 'P2', status: 'CONFIRMED', requirementId: reqs1[2].id, createdById: tester.id, assigneeId: dev3.id } }),
        prisma.bug.create({ data: { projectId: project1.id, bugCode: 'BUG-004', title: '頁面載入慢', description: '商品列表載入超過 3 秒', severity: 'LOW', priority: 'P3', status: 'NEW', createdById: tester.id } }),
    ]);
    // 專案 1 測試用例
    await Promise.all([
        prisma.testCase.create({ data: { projectId: project1.id, tcCode: 'TC-001', title: '登入成功', precondition: '用戶已註冊', steps: '輸入正確帳號密碼，點擊登入', expectedResult: '登入成功，跳轉首頁', requirementId: reqs1[0].id } }),
        prisma.testCase.create({ data: { projectId: project1.id, tcCode: 'TC-002', title: '登入失敗-密碼錯誤', precondition: '用戶已註冊', steps: '輸入正確帳號和錯誤密碼', expectedResult: '顯示密碼錯誤提示', requirementId: reqs1[0].id } }),
        prisma.testCase.create({ data: { projectId: project1.id, tcCode: 'TC-003', title: '商品搜尋', precondition: '已有商品資料', steps: '輸入關鍵字搜尋', expectedResult: '顯示符合條件的商品', requirementId: reqs1[1].id } }),
    ]);
    // 專案 1 評論
    await prisma.comment.create({
        data: {
            content: '登入 API 已設計完成，請 @老張 實作前端串接',
            userId: pm.id,
            projectId: project1.id,
            relatedType: 'TASK',
            relatedId: tasks1[0].id,
        },
    });
    // === 專案 2：敏捷式 ===
    const project2 = await prisma.project.create({
        data: {
            code: 'PROJ-002',
            name: '行動支付 App',
            description: '開發 iOS/Android 行動支付應用程式',
            status: 'ACTIVE',
            mode: 'AGILE',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-09-30'),
            githubRepo: 'company/mobile-payment',
        },
    });
    // 專案 2 標籤
    const tags2 = await Promise.all([
        prisma.tag.create({ data: { projectId: project2.id, name: 'iOS', color: '#06b6d4' } }),
        prisma.tag.create({ data: { projectId: project2.id, name: 'Android', color: '#22c55e' } }),
        prisma.tag.create({ data: { projectId: project2.id, name: 'UI/UX', color: '#d946ef' } }),
    ]);
    // 專案 2 需求
    const reqs2 = await Promise.all([
        prisma.requirement.create({ data: { projectId: project2.id, reqCode: 'REQ-101', title: '生物辨識登入', description: 'Face ID / 指紋辨識登入', priority: 'P0', status: 'IMPLEMENTED', type: 'FUNCTIONAL', createdById: pm2.id } }),
        prisma.requirement.create({ data: { projectId: project2.id, reqCode: 'REQ-102', title: '掃碼支付', description: 'QR Code 掃描付款', priority: 'P0', status: 'APPROVED', type: 'FUNCTIONAL', createdById: pm2.id } }),
        prisma.requirement.create({ data: { projectId: project2.id, reqCode: 'REQ-103', title: '交易記錄', description: '交易歷史查詢與匯出', priority: 'P1', status: 'DRAFT', type: 'FUNCTIONAL', createdById: pm2.id } }),
    ]);
    // 專案 2 Sprint
    const sprint3 = await prisma.sprint.create({
        data: {
            projectId: project2.id,
            name: 'Sprint 1 - 登入與安全',
            goal: '完成生物辨識登入與安全框架',
            startDate: new Date('2026-05-15'),
            endDate: new Date('2026-05-28'),
            status: 'COMPLETED',
        },
    });
    const sprint4 = await prisma.sprint.create({
        data: {
            projectId: project2.id,
            name: 'Sprint 2 - 支付功能',
            goal: '完成掃碼支付核心流程',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-14'),
            status: 'ACTIVE',
        },
    });
    // 專案 2 任務
    const tasks2 = await Promise.all([
        prisma.task.create({ data: { projectId: project2.id, taskCode: 'TASK-101', title: 'iOS Face ID 整合', description: 'LocalAuthentication 框架整合', type: 'DEVELOPMENT', status: 'DONE', priority: 'P0', requirementId: reqs2[0].id, assigneeId: dev2.id, plannedHours: 24, actualHours: 22, dueDate: new Date('2026-05-20'), startedAt: new Date('2026-05-15'), completedAt: new Date('2026-05-19'), sprintId: sprint3.id, tags: { connect: [{ id: tags2[0].id }] } } }),
        prisma.task.create({ data: { projectId: project2.id, taskCode: 'TASK-102', title: 'Android 指紋辨識', description: 'BiometricPrompt API 整合', type: 'DEVELOPMENT', status: 'DONE', priority: 'P0', requirementId: reqs2[0].id, assigneeId: dev3.id, plannedHours: 24, actualHours: 20, dueDate: new Date('2026-05-25'), startedAt: new Date('2026-05-20'), completedAt: new Date('2026-05-24'), sprintId: sprint3.id, tags: { connect: [{ id: tags2[1].id }] } } }),
        prisma.task.create({ data: { projectId: project2.id, taskCode: 'TASK-103', title: '登入 UI 設計', description: '登入頁面視覺設計', type: 'DESIGN', status: 'DONE', priority: 'P1', requirementId: reqs2[0].id, assigneeId: dev2.id, plannedHours: 16, actualHours: 14, dueDate: new Date('2026-05-28'), startedAt: new Date('2026-05-22'), completedAt: new Date('2026-05-27'), sprintId: sprint3.id, tags: { connect: [{ id: tags2[2].id }] } } }),
        prisma.task.create({ data: { projectId: project2.id, taskCode: 'TASK-104', title: 'QR Code 掃描', description: '相機預覽 + QR 解析', type: 'DEVELOPMENT', status: 'IN_PROGRESS', priority: 'P0', requirementId: reqs2[1].id, assigneeId: dev2.id, plannedHours: 32, actualHours: 12, dueDate: nextWeek, startedAt: new Date('2026-06-01'), sprintId: sprint4.id, tags: { connect: [{ id: tags2[0].id }, { id: tags2[1].id }] } } }),
        prisma.task.create({ data: { projectId: project2.id, taskCode: 'TASK-105', title: '支付確認頁面', description: '金額確認 + 密碼輸入', type: 'DEVELOPMENT', status: 'IN_PROGRESS', priority: 'P0', requirementId: reqs2[1].id, assigneeId: dev3.id, plannedHours: 20, actualHours: 8, dueDate: nextWeek, startedAt: new Date('2026-06-03'), sprintId: sprint4.id, tags: { connect: [{ id: tags2[2].id }] } } }),
        prisma.task.create({ data: { projectId: project2.id, taskCode: 'TASK-106', title: '交易記錄 API', description: '分頁/篩選/匯出 API', type: 'DEVELOPMENT', status: 'TODO', priority: 'P1', requirementId: reqs2[2].id, assigneeId: dev1.id, plannedHours: 16, actualHours: 0, dueDate: next2Weeks, sprintId: sprint4.id } }),
    ]);
    // 專案 2 Bug
    await Promise.all([
        prisma.bug.create({ data: { projectId: project2.id, bugCode: 'BUG-101', title: 'Face ID 取消後閃退', description: '使用者取消 Face ID 後 App 閃退', severity: 'CRITICAL', priority: 'P0', status: 'RESOLVED', requirementId: reqs2[0].id, createdById: tester.id, assigneeId: dev2.id } }),
        prisma.bug.create({ data: { projectId: project2.id, bugCode: 'BUG-102', title: 'QR 掃描對焦慢', description: '低光源環境下對焦時間超過 5 秒', severity: 'MEDIUM', priority: 'P2', status: 'IN_PROGRESS', requirementId: reqs2[1].id, createdById: tester.id, assigneeId: dev3.id } }),
    ]);
    // === 專案 3：混合型 ===
    const project3 = await prisma.project.create({
        data: {
            code: 'PROJ-003',
            name: '數據分析平台',
            description: '企業級數據分析與報表平台',
            status: 'PLANNING',
            mode: 'HYBRID',
            startDate: new Date('2026-07-01'),
            endDate: new Date('2026-12-31'),
        },
    });
    // 專案 3 需求
    await prisma.requirement.create({ data: { projectId: project3.id, reqCode: 'REQ-201', title: '數據來源管理', description: '支援多種數據來源連接', priority: 'P0', status: 'DRAFT', type: 'FUNCTIONAL', createdById: pm.id } });
    // 專案 3 標籤
    await prisma.tag.create({ data: { projectId: project3.id, name: 'BigData', color: '#6366f1' } });
    // === 未指派任務（用於資源負載測試） ===
    await Promise.all([
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-011', title: '效能測試腳本', description: '撰寫 k6 效能測試腳本', type: 'TESTING', status: 'TODO', priority: 'P2' } }),
        prisma.task.create({ data: { projectId: project1.id, taskCode: 'TASK-012', title: 'Docker 配置', description: 'Dockerfile + docker-compose', type: 'OPERATION', status: 'TODO', priority: 'P2' } }),
        prisma.task.create({ data: { projectId: project2.id, taskCode: 'TASK-107', title: 'App Store 上架準備', description: '截圖/描述/審核文件', type: 'DOCUMENTATION', status: 'TODO', priority: 'P3' } }),
    ]);
    // === 通知（用戶有未讀通知） ===
    await Promise.all([
        prisma.notification.create({ data: { userId: dev1.id, type: 'TASK_ASSIGNED', title: '新任務指派', content: '專案經理 將任務「購物車 API」指派給您', relatedType: 'TASK', relatedId: tasks1[5].id, projectId: project1.id } }),
        prisma.notification.create({ data: { userId: dev2.id, type: 'TASK_ASSIGNED', title: '新任務指派', content: '專案經理 將任務「支付確認頁面」指派給您', relatedType: 'TASK', relatedId: tasks2[4].id, projectId: project2.id } }),
        prisma.notification.create({ data: { userId: dev1.id, type: 'BUG_ASSIGNED', title: '新 Bug 指派', content: '測試員 將 Bug「登入後 Token 無法刷新」指派給您', relatedType: 'BUG', relatedId: bugs1[0].id, projectId: project1.id } }),
        prisma.notification.create({ data: { userId: dev1.id, type: 'TASK_STATUS_CHANGED', title: '任務狀態變更', content: '專案經理 將任務「設計 JWT 認證 API」狀態從「進行中」變更為「完成」', relatedType: 'TASK', relatedId: tasks1[0].id, projectId: project1.id } }),
    ]);
    console.log('✅ Seed completed!');
    console.log('');
    console.log('👥 Users (password: password123):');
    console.log('   admin@company.com (ADMIN)');
    console.log('   pm@company.com (PM)');
    console.log('   pm2@company.com (PM)');
    console.log('   dev1@company.com (DEVELOPER) - 老張');
    console.log('   dev2@company.com (DEVELOPER) - 小王');
    console.log('   dev3@company.com (DEVELOPER) - 小李');
    console.log('   tester@company.com (TESTER)');
    console.log('');
    console.log('📁 Projects:');
    console.log('   PROJ-001: 電商平台重構 (WATERFALL)');
    console.log('   PROJ-002: 行動支付 App (AGILE)');
    console.log('   PROJ-003: 數據分析平台 (HYBRID)');
    console.log('');
    console.log('🔗 Feature relationships:');
    console.log('   • 任務有標籤、Sprint、截止日');
    console.log('   • Bug 關聯任務和需求');
    console.log('   • 評論有 @提及');
    console.log('   • 測試用例關聯需求');
    console.log('   • 日曆顯示任務截止/Sprint日期');
    console.log('   • 資源負載顯示多人工時分配');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
