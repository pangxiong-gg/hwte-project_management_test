import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

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

// POST /api/projects/:projectId/requirements
router.post('/', async (req, res) => {
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

// PUT /api/projects/:projectId/requirements/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const requirement = await prisma.requirement.update({
      where: { id },
      data: req.body,
    });
    res.json(requirement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
