import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

interface CalendarEvent {
  id: string;
  title: string;
  type: 'TASK_DUE' | 'PROJECT_END' | 'SPRINT_START' | 'SPRINT_END';
  date: string;
  color: string;
  projectName: string;
  description?: string;
}

// GET /api/calendar/events
router.get('/events', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { month } = req.query;

    // 解析月份範圍
    let startOfMonth: Date, endOfMonth: Date;
    if (month) {
      const [year, m] = (month as string).split('-').map(Number);
      startOfMonth = new Date(year, m - 1, 1);
      endOfMonth = new Date(year, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const events: CalendarEvent[] = [];

    // 1. 用戶指派的任務截止日
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        dueDate: { not: null, gte: startOfMonth, lte: endOfMonth },
        status: { not: 'DONE' },
      },
      include: { project: { select: { name: true } } },
    });
    tasks.forEach((t) => {
      events.push({
        id: `task-${t.id}`,
        title: t.title,
        type: 'TASK_DUE',
        date: t.dueDate!.toISOString().split('T')[0],
        color: '#3b82f6',
        projectName: t.project?.name || '',
        description: `任務 ${t.taskCode}`,
      });
    });

    // 2. 用戶參與的專案截止日
    const projects = await prisma.project.findMany({
      where: {
        endDate: { not: null, gte: startOfMonth, lte: endOfMonth },
        tasks: { some: { assigneeId: userId } },
      },
    });
    projects.forEach((p) => {
      events.push({
        id: `project-${p.id}`,
        title: p.name,
        type: 'PROJECT_END',
        date: p.endDate!.toISOString().split('T')[0],
        color: '#ef4444',
        projectName: p.name,
        description: '專案截止日',
      });
    });

    // 3. Sprint 開始/結束日
    const sprints = await prisma.sprint.findMany({
      where: {
        project: { tasks: { some: { assigneeId: userId } } },
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
        ],
      },
      include: { project: { select: { name: true } } },
    });
    sprints.forEach((s) => {
      const startDate = s.startDate.toISOString().split('T')[0];
      const endDate = s.endDate.toISOString().split('T')[0];
      events.push({
        id: `sprint-start-${s.id}`,
        title: s.name,
        type: 'SPRINT_START',
        date: startDate,
        color: '#22c55e',
        projectName: s.project?.name || '',
        description: 'Sprint 開始',
      });
      events.push({
        id: `sprint-end-${s.id}`,
        title: s.name,
        type: 'SPRINT_END',
        date: endDate,
        color: '#f59e0b',
        projectName: s.project?.name || '',
        description: 'Sprint 結束',
      });
    });

    res.json({ events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
