import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

const DEFAULT_PHASES: Record<string, Array<{ name: string; allowedTaskTypes: string | null }>> = {
  WATERFALL: [
    { name: '需求分析', allowedTaskTypes: 'REQUIREMENT_DOC,DOCUMENTATION' },
    { name: '系統設計', allowedTaskTypes: 'DESIGN,DOCUMENTATION' },
    { name: '開發實作', allowedTaskTypes: 'DEVELOPMENT,BUG_FIX' },
    { name: '測試驗證', allowedTaskTypes: 'TESTING,BUG_FIX' },
    { name: '發布上線', allowedTaskTypes: 'DOCUMENTATION,OPERATION' },
  ],
  AGILE: [
    { name: 'Sprint 迭代', allowedTaskTypes: null },
  ],
  HYBRID: [
    { name: '需求分析', allowedTaskTypes: 'REQUIREMENT_DOC,DOCUMENTATION' },
    { name: '系統設計', allowedTaskTypes: 'DESIGN,DOCUMENTATION' },
    { name: '迭代開發', allowedTaskTypes: null },
    { name: '驗收測試', allowedTaskTypes: 'TESTING,BUG_FIX' },
    { name: '發布上線', allowedTaskTypes: 'DOCUMENTATION,OPERATION' },
  ],
};

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { requirements: true, tasks: true, bugs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        requirements: true,
        tasks: true,
        bugs: true,
        phases: { orderBy: { order: 'asc' } },
      },
    });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { code, name, description, mode } = req.body;
    const projectMode = (mode || 'HYBRID').toUpperCase();

    if (!['WATERFALL', 'AGILE', 'HYBRID'].includes(projectMode)) {
      return res.status(400).json({ error: 'Invalid project mode. Must be WATERFALL, AGILE, or HYBRID.' });
    }

    const project = await prisma.$transaction(async (tx) => {
      const proj = await tx.project.create({
        data: { code, name, description, mode: projectMode },
      });

      const phases = DEFAULT_PHASES[projectMode];
      for (let i = 0; i < phases.length; i++) {
        const phaseData = phases[i];
        await tx.projectPhase.create({
          data: {
            projectId: proj.id,
            name: phaseData.name,
            order: i + 1,
            status: i === 0 ? 'ACTIVE' : 'PENDING',
            startedAt: i === 0 ? new Date() : null,
            allowedTaskTypes: phaseData.allowedTaskTypes,
          },
        });
      }

      return proj;
    });

    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
