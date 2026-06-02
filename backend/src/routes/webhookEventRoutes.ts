import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { prisma } from '../services/prisma.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/webhook-events
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const events = await prisma.webhookEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
