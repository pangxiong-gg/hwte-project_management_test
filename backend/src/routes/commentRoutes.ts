import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { notifyCommentMentioned } from '../services/notifications.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/comments?relatedType=TASK&relatedId=xxx
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { relatedType, relatedId } = req.query;

    const where: any = { projectId };
    if (relatedType) where.relatedType = relatedType as string;
    if (relatedId) where.relatedId = relatedId as string;

    // 只取頂層評論（parentId 為 null）
    where.parentId = null;

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        replies: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ comments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/comments
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.userId;
    const { content, relatedType, relatedId, parentId } = req.body;

    if (!content || !relatedType || !relatedId) {
      return res.status(400).json({ error: 'content, relatedType, relatedId are required' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        projectId,
        relatedType,
        relatedId,
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, name: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    // 提取 @提及
    const mentionPattern = /@([^\s]+)/g;
    const mentions = [...content.matchAll(mentionPattern)].map((m) => m[1]);

    if (mentions.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: { name: { in: mentions } },
        select: { id: true, name: true },
      });

      for (const mu of mentionedUsers) {
        if (mu.id !== userId) {
          await notifyCommentMentioned(
            projectId,
            comment.id,
            relatedType,
            relatedId,
            mu.id,
            comment.user?.name || '系統'
          );
        }
      }
    }

    res.status(201).json(comment);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/comments/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const { content } = req.body;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: Can only edit your own comments' });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { content },
      include: {
        user: { select: { id: true, name: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/comments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isAdminOrPM = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole);
    if (existing.userId !== userId && !isAdminOrPM) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.comment.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
