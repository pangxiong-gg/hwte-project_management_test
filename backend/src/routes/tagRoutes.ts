import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#78716c', '#0ea5e9',
];

// GET /api/projects/:projectId/tags
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tags = await prisma.tag.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            tasks: true,
            bugs: true,
            requirements: true,
          },
        },
      },
    });
    res.json({ tags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/tags
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const tagColor = color || PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        color: tagColor,
        projectId,
      },
    });

    res.status(201).json(tag);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tag name already exists in this project' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/tags/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
    });

    res.json(tag);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tag name already exists in this project' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/tags/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.tag.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
