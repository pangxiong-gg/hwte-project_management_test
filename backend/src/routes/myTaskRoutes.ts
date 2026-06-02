import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/my-tasks - 取得當前用戶被指派的任務（跨專案）
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

    const tasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        project: { select: { id: true, name: true, code: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const now = new Date();

    // 計算統計
    const stats = {
      todo: 0,
      inProgress: 0,
      done: 0,
      overdue: 0,
    };

    const enrichedTasks = tasks.map((t) => {
      const isOverdue = t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < now;
      if (t.status === 'TODO') stats.todo++;
      else if (t.status === 'IN_PROGRESS') stats.inProgress++;
      else if (t.status === 'DONE') stats.done++;
      if (isOverdue) stats.overdue++;

      return {
        ...t,
        isOverdue,
      };
    });

    // 按狀態分組
    const grouped = {
      overdue: enrichedTasks.filter((t) => t.isOverdue),
      todo: enrichedTasks.filter((t) => !t.isOverdue && t.status === 'TODO'),
      inProgress: enrichedTasks.filter((t) => !t.isOverdue && t.status === 'IN_PROGRESS'),
      done: enrichedTasks.filter((t) => t.status === 'DONE'),
    };

    res.json({
      tasks: enrichedTasks,
      grouped,
      stats: {
        total: tasks.length,
        ...stats,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/my-tasks/:id/status - 快捷更新任務狀態
router.put('/:id/status', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { status } = req.body;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { id: true } } },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 只能更新自己的任務
    if (task.assigneeId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Can only update your own tasks' });
    }

    const updateData: any = { status };

    // 狀態變更時自動設置時間戳
    if (status === 'IN_PROGRESS' && !task.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === 'DONE' && !task.completedAt) {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true, code: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/my-tasks/:id/hours - 填報工時
router.put('/:id/hours', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { id } = req.params;
    const { actualHours } = req.body;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { id: true } } },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.assigneeId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Can only update your own tasks' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { actualHours: actualHours !== undefined ? parseFloat(actualHours) : null },
      include: {
        project: { select: { id: true, name: true, code: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
