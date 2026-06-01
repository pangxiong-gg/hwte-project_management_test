import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { roleMiddleware } from '../middlewares/role.js';
import { notifyBugAssigned, notifyBugStatusChanged } from '../services/notifications.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/bugs
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const bugs = await prisma.bug.findMany({
      where: { projectId },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true } },
        task: { select: { id: true, taskCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bugs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/bugs
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, severity, priority, requirementId, taskId, assigneeId } = req.body;
    const userId = (req as any).user?.userId;

    const count = await prisma.bug.count({ where: { projectId } });
    const code = `BUG-${String(count + 1).padStart(3, '0')}`;

    const bug = await prisma.bug.create({
      data: {
        projectId,
        bugCode: code,
        title,
        description,
        severity: severity || 'MEDIUM',
        priority: priority || 'P2',
        requirementId,
        taskId,
        assigneeId,
        createdById: userId,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // 發送指派通知
    if (assigneeId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await notifyBugAssigned(projectId, bug.id, title, assigneeId, user?.name || '系統');
    }

    res.status(201).json(bug);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/bugs/:id
router.put('/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const { status, assigneeId } = req.body;

    // 取得舊 Bug 資訊
    const oldBug = await prisma.bug.findUnique({
      where: { id },
      include: { assignee: { select: { id: true } }, createdBy: { select: { id: true } } },
    });

    if (!oldBug) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    // 權限檢查
    const isAdminOrPM = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole);
    const isAssignee = oldBug.assigneeId === userId;

    if (!isAdminOrPM) {
      if (assigneeId !== undefined) {
        return res.status(403).json({ error: 'Forbidden: Only ADMIN or PM can reassign bugs' });
      }
      if (!isAssignee) {
        return res.status(403).json({ error: 'Forbidden: You can only update bugs assigned to you' });
      }
    }

    const bug = await prisma.bug.update({
      where: { id },
      data: req.body,
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // 發送通知
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const changerName = user?.name || '系統';

    // 狀態變更通知
    if (status && status !== oldBug.status) {
      // 通知指派人
      if (oldBug.assigneeId && oldBug.assigneeId !== userId) {
        await notifyBugStatusChanged(projectId, id, oldBug.title, oldBug.status, status, oldBug.assigneeId, changerName);
      }
      // 通知建立者
      if (oldBug.createdById && oldBug.createdById !== userId && oldBug.createdById !== oldBug.assigneeId) {
        await notifyBugStatusChanged(projectId, id, oldBug.title, oldBug.status, status, oldBug.createdById, changerName);
      }
    }

    // 指派變更通知
    if (assigneeId !== undefined && assigneeId !== oldBug.assigneeId) {
      if (assigneeId) {
        await notifyBugAssigned(projectId, id, oldBug.title, assigneeId, changerName);
      }
    }

    res.json(bug);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
