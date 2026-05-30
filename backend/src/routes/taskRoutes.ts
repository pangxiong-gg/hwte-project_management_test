import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/tasks
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

// POST /api/projects/:projectId/tasks
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { taskCode, title, description, type, priority, requirementId, assigneeId, plannedHours } = req.body;

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
        phaseId: activePhase?.id || null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.update({
      where: { id },
      data: req.body,
      include: {
        assignee: { select: { id: true, name: true } },
        requirement: { select: { id: true, reqCode: true, title: true } },
        phase: { select: { id: true, name: true } },
      },
    });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
