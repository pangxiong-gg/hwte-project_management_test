import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 開始清理數據庫...');

  // 1. 先獲取 admin ID
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('❌ 找不到 ADMIN 用戶，無法清理');
    process.exit(1);
  }
  console.log(`✅ 保留 ADMIN: ${admin.name} (${admin.email})`);

  // 2. 按依賴順序刪除（子表 → 父表）
  // 先刪除有外鍵引用的記錄，避免約束衝突

  // Comment 有自引用（parentId），先刪 replies 再刪頂層
  const replyComments = await prisma.comment.deleteMany({ where: { parentId: { not: null } } });
  console.log(`  刪除回覆評論: ${replyComments.count} 條`);

  const topComments = await prisma.comment.deleteMany({ where: { parentId: null } });
  console.log(`  刪除頂層評論: ${topComments.count} 條`);

  // TestExecution（引用 TestCase, Bug）
  const testExecs = await prisma.testExecution.deleteMany();
  console.log(`  刪除測試執行: ${testExecs.count} 條`);

  // Notification
  const notifications = await prisma.notification.deleteMany();
  console.log(`  刪除通知: ${notifications.count} 條`);

  // RequirementChange
  const reqChanges = await prisma.requirementChange.deleteMany();
  console.log(`  刪除需求變更: ${reqChanges.count} 條`);

  // Document
  const documents = await prisma.document.deleteMany();
  console.log(`  刪除文件: ${documents.count} 條`);

  // WebhookEvent
  const webhookEvents = await prisma.webhookEvent.deleteMany();
  console.log(`  刪除 Webhook 事件: ${webhookEvents.count} 條`);

  // Task（自引用 parentId，但子任務會因 onDelete: SetNull 被處理）
  // 先刪除有子任務的...不對，Prisma 的 deleteMany 不支持遞迴
  // 先找出所有有 parentId 的任務，將它們的 parentId 設為 null
  await prisma.task.updateMany({ where: { parentId: { not: null } }, data: { parentId: null } });
  const tasks = await prisma.task.deleteMany();
  console.log(`  刪除任務: ${tasks.count} 條`);

  // Bug
  const bugs = await prisma.bug.deleteMany();
  console.log(`  刪除 Bug: ${bugs.count} 條`);

  // TestCase
  const testCases = await prisma.testCase.deleteMany();
  console.log(`  刪除測試用例: ${testCases.count} 條`);

  // Requirement
  const requirements = await prisma.requirement.deleteMany();
  console.log(`  刪除需求: ${requirements.count} 條`);

  // ProjectPhase
  const phases = await prisma.projectPhase.deleteMany();
  console.log(`  刪除專案階段: ${phases.count} 條`);

  // Sprint
  const sprints = await prisma.sprint.deleteMany();
  console.log(`  刪除 Sprint: ${sprints.count} 條`);

  // Tag（多對多連接表會自動清理）
  const tags = await prisma.tag.deleteMany();
  console.log(`  刪除標籤: ${tags.count} 條`);

  // Project
  const projects = await prisma.project.deleteMany();
  console.log(`  刪除專案: ${projects.count} 條`);

  // 最後刪除非 ADMIN 用戶
  const users = await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } });
  console.log(`  刪除非 ADMIN 用戶: ${users.count} 條`);

  console.log('✅ 清理完成！僅保留 ADMIN 用戶');
}

cleanDatabase()
  .catch((e) => {
    console.error('❌ 清理失敗:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
