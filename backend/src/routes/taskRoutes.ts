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
    });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
