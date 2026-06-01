import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { roleMiddleware } from '../middlewares/role.js';
import { notifyTaskAssigned, notifyTaskStatusChanged } from '../services/notifications.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

function parseDate(dateStr: string | undefined, fieldName: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid ${fieldName}: "${dateStr}"`);
  }
  return d;
}

// GET /api/projects/:projectId/tasks - 所有人可查看
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/tasks - ADMIN/PM 才能創建
router.post('/', roleMiddleware(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { taskCode, title, description, type, priority, requirementId, assigneeId, plannedHours, dueDate, startedAt, completedAt, gitBranch, gitCommit, gitPr } = req.body;
    const userId = (req as any).user?.userId;

    // 取得專案資訊與當前活躍階段
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        phases: {
          where: { status: 'ACTIVE' },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const activePhase = project.phases[0];

    // 如果有活躍階段且有限制，驗證任務類型
    if (activePhase && activePhase.allowedTaskTypes) {
      const allowedTypes = activePhase.allowedTaskTypes.split(',');
      const taskType = (type || 'DEVELOPMENT').toUpperCase();
      if (!allowedTypes.includes(taskType)) {
        return res.status(400).json({
          error: `Task type "${taskType}" is not allowed in phase "${activePhase.name}". Allowed types: ${allowedTypes.join(', ')}`,
        });
      }
    }

    const count = await prisma.task.count({ where: { projectId } });
    const code = taskCode || `TASK-${String(count + 1).padStart(3, '0')}`;

    const task = await prisma.task.create({
      data: {
        projectId,
        taskCode: code,
        title,
        description,
        type: type || 'DEVELOPMENT',
        priority: priority || 'P2',
        requirementId,
        assigneeId,
        plannedHours,
        dueDate: parseDate(dueDate, 'dueDate'),
        startedAt: parseDate(startedAt, 'startedAt'),
        completedAt: parseDate(completedAt, 'completedAt'),
        phaseId: activePhase?.id || null,
        gitBranch,
        gitCommit,
        gitPr,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
    });

    // 發送指派通知
    if (assigneeId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await notifyTaskAssigned(projectId, task.id, title, assigneeId, user?.name || '系統');
    }

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/tasks/:id - 所有人可更新，但權限不同
router.put('/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const { status, assigneeId, phaseId } = req.body;

    // 取得舊任務資訊
    const oldTask = await prisma.task.findUnique({
      where: { id },
      include: { assignee: { select: { id: true } } },
    });

    if (!oldTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // 權限檢查
    const isAdminOrPM = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole);
    const isAssignee = oldTask.assigneeId === userId;

    if (!isAdminOrPM) {
      // 非 ADMIN/PM 只能更新自己的任務的狀態和 Git 欄位
      if (assigneeId !== undefined || phaseId !== undefined) {
        return res.status(403).json({ error: 'Forbidden: Only ADMIN or PM can reassign or change phase' });
      }
      if (!isAssignee) {
        return res.status(403).json({ error: 'Forbidden: You can only update your own tasks' });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: req.body,
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
    });

    // 發送通知
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const changerName = user?.name || '系統';

    // 狀態變更通知
    if (status && status !== oldTask.status) {
      if (oldTask.assigneeId && oldTask.assigneeId !== userId) {
        await notifyTaskStatusChanged(projectId, id, oldTask.title, oldTask.status, status, oldTask.assigneeId, changerName);
      }
    }

    // 指派變更通知
    if (assigneeId !== undefined && assigneeId !== oldTask.assigneeId) {
      if (assigneeId) {
        await notifyTaskAssigned(projectId, id, oldTask.title, assigneeId, changerName);
      }
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
