import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      name: '系統管理員',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: 'pm@company.com',
      name: '專案經理',
      password: hashedPassword,
      role: 'PM',
    },
  });

  const dev = await prisma.user.create({
    data: {
      email: 'dev@company.com',
      name: '開發人員',
      password: hashedPassword,
      role: 'DEVELOPER',
    },
  });

  const tester = await prisma.user.create({
    data: {
      email: 'tester@company.com',
      name: '測試人員',
      password: hashedPassword,
      role: 'TESTER',
    },
  });

  const project = await prisma.project.create({
    data: {
      code: 'PROJ-001',
      name: '數位化專案管理系統',
      description: '內部使用的專案管理系統開發',
      status: 'ACTIVE',
    },
  });

  const req = await prisma.requirement.create({
    data: {
      projectId: project.id,
      reqCode: 'REQ-001',
      title: '使用者登入功能',
      description: '使用者可使用帳號密碼登入系統',
      priority: 'P0',
      status: 'APPROVED',
      type: 'FUNCTIONAL',
      createdById: pm.id,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      taskCode: 'TASK-001',
      title: '設計登入 API',
      description: '設計並實作登入相關 API',
      type: 'DEVELOPMENT',
      status: 'DONE',
      priority: 'P0',
      requirementId: req.id,
      assigneeId: dev.id,
      plannedHours: 8,
      actualHours: 6,
    },
  });

  await prisma.task.create({
    data: {
      projectId: project.id,
      taskCode: 'TASK-002',
      title: '實作登入 UI',
      description: '實作登入頁面介面',
      type: 'DEVELOPMENT',
      status: 'IN_PROGRESS',
      priority: 'P0',
      requirementId: req.id,
      assigneeId: dev.id,
      plannedHours: 8,
      actualHours: 4,
    },
  });

  await prisma.bug.create({
    data: {
      projectId: project.id,
      bugCode: 'BUG-001',
      title: '密碼錯誤時無提示訊息',
      description: '當使用者輸入錯誤密碼時，頁面沒有顯示任何錯誤提示',
      severity: 'HIGH',
      priority: 'P1',
      status: 'CONFIRMED',
      requirementId: req.id,
      createdById: tester.id,
      assigneeId: dev.id,
    },
  });

  console.log('Seed completed!');
  console.log('Users:', { admin: admin.email, pm: pm.email, dev: dev.email, tester: tester.email });
  console.log('Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
