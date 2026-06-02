import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { roleMiddleware } from '../middlewares/role.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// GET /api/projects/:projectId/sprints
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        tasks: { select: { id: true, status: true, plannedHours: true, actualHours: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    // 計算每個 Sprint 的統計數據
    const sprintsWithStats = sprints.map((sprint) => {
      const totalTasks = sprint.tasks.length;
      const doneTasks = sprint.tasks.filter((t) => t.status === 'DONE').length;
      const totalHours = sprint.tasks.reduce((sum, t) => sum + (t.plannedHours || 0), 0);
      const actualHours = sprint.tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
      return {
        ...sprint,
        stats: {
          totalTasks,
          doneTasks,
          progress: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
          totalHours,
          actualHours,
        },
      };
    });

    res.json({ sprints: sprintsWithStats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/sprints
router.post('/', roleMiddleware(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: 'name, startDate, endDate are required' });
    }

    const sprint = await prisma.sprint.create({
      data: {
        projectId,
        name: name.trim(),
        goal: goal || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'PLANNING',
      },
    });

    res.status(201).json(sprint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/sprints/:id
router.put('/:id', roleMiddleware(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, goal, startDate, endDate, status } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (goal !== undefined) updateData.goal = goal;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;

    const sprint = await prisma.sprint.update({
      where: { id },
      data: updateData,
    });

    res.json(sprint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/sprints/:id
router.delete('/:id', roleMiddleware(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { id } = req.params;
    // 先將關聯的任務 sprintId 設為 null
    await prisma.task.updateMany({
      where: { sprintId: id },
      data: { sprintId: null },
    });
    await prisma.sprint.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/sprints/:id/burndown
router.get('/:id/burndown', async (req, res) => {
  try {
    const { id } = req.params;
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        tasks: { select: { id: true, status: true, plannedHours: true, createdAt: true, completedAt: true } },
      },
    });

    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalHours = sprint.tasks.reduce((sum, t) => sum + (t.plannedHours || 0), 0);

    const data = [];
    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // 計算當天結束時剩餘的工時
      const doneByDate = sprint.tasks.filter((t) => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).getTime() <= date.getTime();
      });
      const remainingHours = totalHours - doneByDate.reduce((sum, t) => sum + (t.plannedHours || 0), 0);

      // 理想線性燃盡
      const idealHours = totalHours * (1 - i / totalDays);

      data.push({
        date: dateStr,
        remaining: Math.max(0, remainingHours),
        ideal: Math.max(0, idealHours),
      });
    }

    res.json({
      sprint: { id: sprint.id, name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate },
      totalHours,
      data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
