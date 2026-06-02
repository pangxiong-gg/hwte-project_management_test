import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

// GET /api/search?q=keyword
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.json({ tasks: [], requirements: [], bugs: [], projects: [] });
    }

    const keyword = q.trim();

    // 1. 搜索任務（用戶參與的專案）
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { description: { contains: keyword } },
          { taskCode: { contains: keyword } },
        ],
        project: {
          OR: [
            { tasks: { some: { assigneeId: userId } } },
            { bugs: { some: { assigneeId: userId } } },
            { requirements: { some: { createdById: userId } } },
          ],
        },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignee: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    // 2. 搜索需求
    const requirements = await prisma.requirement.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { description: { contains: keyword } },
          { reqCode: { contains: keyword } },
        ],
        project: {
          OR: [
            { tasks: { some: { assigneeId: userId } } },
            { bugs: { some: { assigneeId: userId } } },
            { requirements: { some: { createdById: userId } } },
          ],
        },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    // 3. 搜索 Bug
    const bugs = await prisma.bug.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { description: { contains: keyword } },
          { bugCode: { contains: keyword } },
        ],
        project: {
          OR: [
            { tasks: { some: { assigneeId: userId } } },
            { bugs: { some: { assigneeId: userId } } },
            { requirements: { some: { createdById: userId } } },
          ],
        },
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        assignee: { select: { id: true, name: true } },
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    // 4. 搜索專案
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { name: { contains: keyword } },
          { code: { contains: keyword } },
          { description: { contains: keyword } },
        ],
        tasks: { some: { assigneeId: userId } },
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ tasks, requirements, bugs, projects });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
