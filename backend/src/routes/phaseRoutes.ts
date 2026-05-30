import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/phases
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
    res.json(phases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/phases/current
router.get('/current', async (req, res) => {
  try {
    const { projectId } = req.params;
    const phase = await prisma.projectPhase.findFirst({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { order: 'asc' },
    });
    if (!phase) {
      return res.status(404).json({ error: 'No active phase found' });
    }
    res.json(phase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/phases/:id/advance
// 將當前階段標記為完成，並啟動下一階段
router.post('/:id/advance', async (req, res) => {
  try {
    const { projectId, id } = req.params;

    const currentPhase = await prisma.projectPhase.findFirst({
      where: { id, projectId, status: 'ACTIVE' },
    });

    if (!currentPhase) {
      return res.status(400).json({ error: 'Phase is not active or does not exist' });
    }

    const nextPhase = await prisma.projectPhase.findFirst({
      where: { projectId, order: { gt: currentPhase.order }, status: 'PENDING' },
      orderBy: { order: 'asc' },
    });

    if (!nextPhase) {
      return res.status(400).json({ error: 'No next phase available. This is the final phase.' });
    }

    // 更新當前階段為完成，啟動下一階段
    await prisma.$transaction([
      prisma.projectPhase.update({
        where: { id: currentPhase.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      prisma.projectPhase.update({
        where: { id: nextPhase.id },
        data: { status: 'ACTIVE', startedAt: new Date() },
      }),
    ]);

    const updatedPhases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    res.json({ phases: updatedPhases, message: `Advanced from "${currentPhase.name}" to "${nextPhase.name}"` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
