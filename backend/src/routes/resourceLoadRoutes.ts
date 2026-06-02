import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

const WEEKLY_CAPACITY = 40; // 標準周工時

// GET /api/resource-load - 團隊資源負載數據
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    // 權限檢查：ADMIN 和 PM 可以看全部，其他人只能看自己
    const isAdminOrPM = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole);

    // 取得所有活躍用戶
    const whereClause = isAdminOrPM ? {} : { id: userId };
    const users = await prisma.user.findMany({
      where: { ...whereClause, status: 'ACTIVE' },
      select: { id: true, name: true, role: true },
      orderBy: { name: 'asc' },
    });

    // 取得所有進行中/待辦的任務（非 DONE 狀態）
    const activeTasks = await prisma.task.findMany({
      where: {
        status: { not: 'DONE' },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    const now = new Date();

    // 計算每個用戶的負載
    const members = await Promise.all(
      users.map(async (u) => {
        const userTasks = activeTasks.filter((t) => t.assigneeId === u.id);
        const todoCount = userTasks.filter((t) => t.status === 'TODO').length;
        const inProgressCount = userTasks.filter((t) => t.status === 'IN_PROGRESS').length;
        const overdueCount = userTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now
        ).length;
        const totalPlanned = userTasks.reduce(
          (sum, t) => sum + (t.plannedHours || 0),
          0
        );
        const totalActual = userTasks.reduce(
          (sum, t) => sum + (t.actualHours || 0),
          0
        );
        const loadPct = Math.round((totalPlanned / WEEKLY_CAPACITY) * 100);

        return {
          id: u.id,
          name: u.name,
          role: u.role,
          totalTasks: userTasks.length,
          todoCount,
          inProgressCount,
          doneCount: 0,
          overdueCount,
          plannedHours: totalPlanned,
          actualHours: totalActual,
          loadPercentage: loadPct,
          isOverloaded: loadPct > 100,
          isWarning: loadPct >= 80 && loadPct <= 100,
          tasks: userTasks.map((t) => ({
            id: t.id,
            taskCode: t.taskCode,
            title: t.title,
            status: t.status,
            priority: t.priority,
            plannedHours: t.plannedHours,
            actualHours: t.actualHours,
            dueDate: t.dueDate,
            isOverdue: t.dueDate ? new Date(t.dueDate) < now : false,
            projectName: t.project?.name || '-',
            projectId: t.project?.id,
          })),
        };
      })
    );

    // 未指派任務
    const unassignedTasks = await prisma.task.findMany({
      where: {
        status: { not: 'DONE' },
        assigneeId: null,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
      orderBy: { priority: 'asc' },
    });

    // 團隊摘要
    const summary = {
      totalMembers: members.length,
      totalActiveTasks: activeTasks.length,
      averageLoad: members.length > 0
        ? Math.round(members.reduce((s, m) => s + m.loadPercentage, 0) / members.length)
        : 0,
      overloadedCount: members.filter((m) => m.isOverloaded).length,
      warningCount: members.filter((m) => m.isWarning).length,
      unassignedCount: unassignedTasks.length,
    };

    res.json({
      members,
      unassigned: unassignedTasks.map((t) => ({
        id: t.id,
        taskCode: t.taskCode,
        title: t.title,
        status: t.status,
        priority: t.priority,
        plannedHours: t.plannedHours,
        projectName: t.project?.name || '-',
        projectId: t.project?.id,
      })),
      summary,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
