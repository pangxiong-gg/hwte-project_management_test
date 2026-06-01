import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.js';
import { roleMiddleware } from '../middlewares/role.js';
import { prisma } from '../services/prisma.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

async function githubFetch(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : '',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error: ${res.status} ${err}`);
  }
  return res.json();
}

// GET /api/projects/:projectId/workflows
router.get('/workflows', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { githubRepo: true },
    });
    if (!project?.githubRepo) {
      return res.json({ workflows: [] });
    }
    const data = await githubFetch(`/repos/${project.githubRepo}/actions/workflows`);
    res.json({ workflows: data.workflows || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/runs
router.get('/runs', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { githubRepo: true },
    });
    if (!project?.githubRepo) {
      return res.json({ runs: [] });
    }
    const data = await githubFetch(`/repos/${project.githubRepo}/actions/runs?per_page=20`);
    res.json({ runs: data.workflow_runs || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/runs/:runId
router.get('/runs/:runId', async (req, res) => {
  try {
    const { projectId, runId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { githubRepo: true },
    });
    if (!project?.githubRepo) {
      return res.status(404).json({ error: 'Project has no GitHub repo configured' });
    }
    const [run, jobs] = await Promise.all([
      githubFetch(`/repos/${project.githubRepo}/actions/runs/${runId}`),
      githubFetch(`/repos/${project.githubRepo}/actions/runs/${runId}/jobs`),
    ]);
    res.json({ run, jobs: jobs.jobs || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/github-repo — 配置 GitHub repo（ADMIN/PM）
router.put('/github-repo', roleMiddleware(['ADMIN', 'PROJECT_MANAGER']), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { githubRepo } = req.body;
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { githubRepo: githubRepo || null },
    });
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
