import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = Router();
router.use(authMiddleware);

// Helper: get visible project IDs based on user role
async function getVisibleProjectIds(userId: string, userRole: string) {
  if (userRole === 'ADMIN') {
    const projects = await prisma.project.findMany({ select: { id: true } });
    return projects.map((p) => p.id);
  }

  if (userRole === 'PROJECT_MANAGER') {
    const projects = await prisma.project.findMany({ select: { id: true } });
    return projects.map((p) => p.id);
  }

  // DEVELOPER / TESTER: projects with assigned tasks or bugs
  const [taskProjects, bugProjects] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
    prisma.bug.findMany({
      where: { assigneeId: userId },
      select: { projectId: true },
      distinct: ['projectId'],
    }),
  ]);

  const ids = new Set([
    ...taskProjects.map((t) => t.projectId),
    ...bugProjects.map((b) => b.projectId),
  ]);
  return Array.from(ids);
}

// GET /api/reports/project-progress
router.get('/project-progress', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const projectIds = await getVisibleProjectIds(userId, userRole);

    if (projectIds.length === 0) {
      return res.json({ projects: [] });
    }

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
        phases: { where: { status: 'ACTIVE' }, select: { name: true } },
        _count: {
          select: { tasks: true, requirements: true },
        },
        tasks: { select: { status: true } },
        requirements: { select: { status: true } },
      },
    });

    const result = projects.map((p) => {
      const totalTasks = p._count.tasks;
      const doneTasks = p.tasks.filter((t) => t.status === 'DONE').length;
      const totalReqs = p._count.requirements;
      const doneReqs = p.requirements.filter((r) => r.status === 'COMPLETED').length;

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        status: p.status,
        taskCompletionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
        reqCompletionRate: totalReqs > 0 ? Math.round((doneReqs / totalReqs) * 100) : 0,
        currentPhase: p.phases[0]?.name || '-',
        totalTasks,
        doneTasks,
        totalReqs,
        doneReqs,
      };
    });

    res.json({ projects: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/team-efficiency
router.get('/team-efficiency', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const projectIds = await getVisibleProjectIds(userId, userRole);

    if (projectIds.length === 0) {
      return res.json({ members: [] });
    }

    const [taskAssignees, bugAssignees] = await Promise.all([
      prisma.task.findMany({
        where: { projectId: { in: projectIds }, assigneeId: { not: null } },
        select: { assigneeId: true },
        distinct: ['assigneeId'],
      }),
      prisma.bug.findMany({
        where: { projectId: { in: projectIds }, assigneeId: { not: null } },
        select: { assigneeId: true },
        distinct: ['assigneeId'],
      }),
    ]);

    const memberIds = Array.from(
      new Set([
        ...taskAssignees.map((t) => t.assigneeId!).filter(Boolean),
        ...bugAssignees.map((b) => b.assigneeId!).filter(Boolean),
      ])
    );

    if (memberIds.length === 0) {
      return res.json({ members: [] });
    }

    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });

    const result = await Promise.all(
      members.map(async (m) => {
        const [completedTasks, allTasks, fixedBugs, allBugs] = await Promise.all([
          prisma.task.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id, status: 'DONE' },
          }),
          prisma.task.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id },
          }),
          prisma.bug.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id, status: 'CLOSED' },
          }),
          prisma.bug.count({
            where: { projectId: { in: projectIds }, assigneeId: m.id },
          }),
        ]);

        const doneTasks = await prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            assigneeId: m.id,
            status: 'DONE',
            startedAt: { not: null },
            completedAt: { not: null },
          },
          select: { startedAt: true, completedAt: true },
        });

        const avgDays =
          doneTasks.length > 0
            ? doneTasks.reduce((sum, t) => {
                const days = (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime()) / (1000 * 60 * 60 * 24);
                return sum + days;
              }, 0) / doneTasks.length
            : 0;

        return {
          id: m.id,
          name: m.name,
          completedTasks,
          totalTasks: allTasks,
          fixedBugs,
          totalBugs: allBugs,
          avgCompletionDays: Math.round(avgDays * 10) / 10,
          taskCompletionRate: allTasks > 0 ? Math.round((completedTasks / allTasks) * 100) : 0,
          bugFixRate: allBugs > 0 ? Math.round((fixedBugs / allBugs) * 100) : 0,
        };
      })
    );

    res.json({ members: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/bug-trends?days=30
router.get('/bug-trends', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;
    const projectIds = await getVisibleProjectIds(userId, userRole);
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    if (projectIds.length === 0) {
      return res.json({ timeline: [], bySeverity: {}, byPriority: {} });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const bugs = await prisma.bug.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        status: true,
        severity: true,
        priority: true,
        updatedAt: true,
      },
    });

    const timeline: { date: string; opened: number; closed: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      timeline.push({ date: dateStr, opened: 0, closed: 0 });
    }

    bugs.forEach((b) => {
      const createdDate = b.createdAt.toISOString().split('T')[0];
      const entry = timeline.find((t) => t.date === createdDate);
      if (entry) entry.opened++;

      if (b.status === 'CLOSED') {
        const updatedDate = b.updatedAt.toISOString().split('T')[0];
        const closedEntry = timeline.find((t) => t.date === updatedDate);
        if (closedEntry) closedEntry.closed++;
      }
    });

    const bySeverity: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    bugs.forEach((b) => {
      bySeverity[b.severity] = (bySeverity[b.severity] || 0) + 1;
      byPriority[b.priority] = (byPriority[b.priority] || 0) + 1;
    });

    res.json({ timeline, bySeverity, byPriority });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports/export?report=bug-trends&format=csv
router.get('/export', async (req, res) => {
  try {
    const { report, format } = req.query;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    if (!report || !format) {
      return res.status(400).json({ error: 'report and format are required' });
    }

    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    if (report === 'project-progress') {
      const projectIds = await getVisibleProjectIds(userId, userRole);
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: {
          name: true,
          code: true,
          status: true,
          _count: { select: { tasks: true, requirements: true } },
          tasks: { select: { status: true } },
          requirements: { select: { status: true } },
        },
      });
      filename = 'project-progress';
      headers = ['项目名称', '项目代码', '任务总数', '已完成任务', '需求总数', '已完成需求'];
      data = projects.map((p) => ({
        '项目名称': p.name,
        '项目代码': p.code,
        '任务总数': p._count.tasks,
        '已完成任务': p.tasks.filter((t) => t.status === 'DONE').length,
        '需求总数': p._count.requirements,
        '已完成需求': p.requirements.filter((r) => r.status === 'COMPLETED').length,
      }));
    } else if (report === 'bug-trends') {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const projectIds = await getVisibleProjectIds(userId, userRole);
      const bugs = await prisma.bug.findMany({
        where: { projectId: { in: projectIds }, createdAt: { gte: since } },
        select: {
          bugCode: true,
          title: true,
          severity: true,
          priority: true,
          status: true,
          createdAt: true,
        },
      });
      filename = 'bug-trends';
      headers = ['Bug 代码', '标题', '严重度', '优先级', '状态', '创建日期'];
      data = bugs.map((b) => ({
        'Bug 代码': b.bugCode,
        '标题': b.title,
        '严重度': b.severity,
        '优先级': b.priority,
        '状态': b.status,
        '创建日期': b.createdAt.toISOString().split('T')[0],
      }));
    } else {
      return res.status(400).json({ error: 'Unknown report type' });
    }

    if (format === 'csv') {
      const csv = [headers.join(','), ...data.map((row) => headers.map((h) => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send('﻿' + csv);
    } else if (format === 'excel') {
      res.json({ headers, data, filename });
    } else {
      res.status(400).json({ error: 'Format must be csv or excel' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
