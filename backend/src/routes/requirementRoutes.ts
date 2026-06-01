import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { roleMiddleware } from '../middlewares/role.js';
import { notifyRequirementStatusChanged } from '../services/notifications.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/requirements
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const requirements = await prisma.requirement.findMany({
      where: { projectId },
      include: {
        _count: { select: { tasks: true, bugs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requirements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/requirements - ADMIN/PM 才能創建
router.post('/', roleMiddleware(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { reqCode, title, description, priority, type } = req.body;
    const userId = (req as any).user?.userId;

    const count = await prisma.requirement.count({ where: { projectId } });
    const code = reqCode || `REQ-${String(count + 1).padStart(3, '0')}`;

    const requirement = await prisma.requirement.create({
      data: {
        projectId,
        reqCode: code,
        title,
        description,
        priority: priority || 'P2',
        type: type || 'FUNCTIONAL',
        createdById: userId,
      },
    });
    res.status(201).json(requirement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/requirements/:id - ADMIN/PM 才能更新
router.put('/:id', roleMiddleware(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = (req as any).user?.userId;
    const { status, title, description, priority, type } = req.body;

    // 取得舊需求資訊
    const oldReq = await prisma.requirement.findUnique({ where: { id } });
    if (!oldReq) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    const requirement = await prisma.requirement.update({
      where: { id },
      data: req.body,
    });

    // 記錄變更歷史
    const changeRecords = [];
    if (status !== undefined && status !== oldReq.status) {
      changeRecords.push({ changeType: 'STATUS', oldValue: oldReq.status, newValue: status });
    }
    if (title !== undefined && title !== oldReq.title) {
      changeRecords.push({ changeType: 'TITLE', oldValue: oldReq.title, newValue: title });
    }
    if (description !== undefined && description !== oldReq.description) {
      changeRecords.push({ changeType: 'DESCRIPTION', oldValue: oldReq.description || '', newValue: description });
    }
    if (priority !== undefined && priority !== oldReq.priority) {
      changeRecords.push({ changeType: 'PRIORITY', oldValue: oldReq.priority, newValue: priority });
    }
    if (type !== undefined && type !== oldReq.type) {
      changeRecords.push({ changeType: 'TYPE', oldValue: oldReq.type, newValue: type });
    }

    if (changeRecords.length > 0) {
      await prisma.requirementChange.createMany({
        data: changeRecords.map((c) => ({
          requirementId: id,
          changedById: userId,
          changeType: c.changeType,
          oldValue: c.oldValue,
          newValue: c.newValue,
        })),
      });
    }

    // 發送狀態變更通知
    if (status !== undefined && status !== oldReq.status) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const changerName = user?.name || '系統';
      // 通知需求建立者
      if (oldReq.createdById !== userId) {
        await notifyRequirementStatusChanged(projectId, id, oldReq.title, oldReq.status, status, oldReq.createdById, changerName);
      }
    }

    res.json(requirement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/requirements/:id/changes
router.get('/:id/changes', async (req, res) => {
  try {
    const { id } = req.params;
    const changes = await prisma.requirementChange.findMany({
      where: { requirementId: id },
      include: { changedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(changes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
