import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

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
    const { title, description, severity, priority, requirementId, taskId } = req.body;
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
        createdById: userId,
      },
    });
    res.status(201).json(bug);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/bugs/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bug = await prisma.bug.update({
      where: { id },
      data: req.body,
    });
    res.json(bug);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
