import { prisma } from './prisma.js';
import * as notifications from './notifications.js';

const TASK_CODE_REGEX = /\[TASK-(\d{3,})\]/g;

function extractTaskCodes(text: string): string[] {
  const matches = text.matchAll(TASK_CODE_REGEX);
  return Array.from(matches).map(m => `TASK-${m[1]}`);
}

async function findProjectByRepo(repoFullName: string) {
  return prisma.project.findFirst({
    where: { githubRepo: repoFullName },
    select: { id: true },
  });
}

async function findTasksByCodes(projectId: string, codes: string[]) {
  return prisma.task.findMany({
    where: { projectId, taskCode: { in: codes } },
    include: { assignee: { select: { id: true, name: true } } },
  });
}

async function recordWebhookEvent(data: {
  projectId: string;
  eventType: string;
  action?: string;
  payload: string;
  status: string;
  errorMsg?: string;
  taskIds?: string;
}) {
  return prisma.webhookEvent.create({ data });
}

// ─── push 事件處理 ───
export async function handlePush(payload: any) {
  const repo = payload.repository?.full_name;
  if (!repo) return;

  const project = await findProjectByRepo(repo);
  if (!project) return;

  const commits = payload.commits || [];
  const allCodes = new Set<string>();
  const latestCommitByCode: Record<string, { sha: string; message: string; author: string }> = {};

  for (const commit of commits) {
    const codes = extractTaskCodes(commit.message);
    for (const code of codes) {
      allCodes.add(code);
      latestCommitByCode[code] = {
        sha: commit.id?.slice(0, 7) || '',
        message: commit.message,
        author: commit.author?.name || '',
      };
    }
  }

  const codes = Array.from(allCodes);
  if (codes.length === 0) {
    await recordWebhookEvent({
      projectId: project.id,
      eventType: 'push',
      payload: JSON.stringify(payload).slice(0, 10000),
      status: 'PROCESSED',
      taskIds: '',
    });
    return;
  }

  const tasks = await findTasksByCodes(project.id, codes);
  for (const task of tasks) {
    const commit = latestCommitByCode[task.taskCode];
    if (commit) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gitCommit: commit.sha },
      });
      if (task.assigneeId) {
        await notifications.notifyGitCommit(project.id, task.id, task.title, commit.sha, commit.message, commit.author, task.assigneeId);
      }
    }
  }

  await recordWebhookEvent({
    projectId: project.id,
    eventType: 'push',
    payload: JSON.stringify(payload).slice(0, 10000),
    status: 'PROCESSED',
    taskIds: tasks.map(t => t.id).join(','),
  });
}

// ─── pull_request 事件處理 ───
export async function handlePullRequest(payload: any) {
  const repo = payload.repository?.full_name;
  const action = payload.action;
  const pr = payload.pull_request;
  if (!repo || !pr) return;

  const project = await findProjectByRepo(repo);
  if (!project) return;

  const codes = extractTaskCodes(pr.title);
  const tasks = codes.length > 0 ? await findTasksByCodes(project.id, codes) : [];

  for (const task of tasks) {
    const prUrl = pr.html_url;
    if (['opened', 'synchronize', 'reopened'].includes(action)) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gitPr: prUrl },
      });
      if (task.assigneeId) {
        await notifications.notifyGitPrCreated(project.id, task.id, task.title, pr.number, pr.title, task.assigneeId);
      }
    } else if (action === 'closed' && pr.merged) {
      await prisma.task.update({
        where: { id: task.id },
        data: { gitPr: prUrl },
      });
      if (task.assigneeId) {
        await notifications.notifyGitPrMerged(project.id, task.id, task.title, pr.number, pr.merged_commit_sha?.slice(0, 7) || '', task.assigneeId);
      }
    }
  }

  await recordWebhookEvent({
    projectId: project.id,
    eventType: 'pull_request',
    action,
    payload: JSON.stringify(payload).slice(0, 10000),
    status: 'PROCESSED',
    taskIds: tasks.map(t => t.id).join(',') || '',
  });
}

// ─── workflow_run 事件處理 ───
export async function handleWorkflowRun(payload: any) {
  const repo = payload.repository?.full_name;
  const run = payload.workflow_run;
  if (!repo || !run) return;

  const project = await findProjectByRepo(repo);
  if (!project) return;

  const codes = extractTaskCodes(run.head_commit?.message || '');
  const tasks = codes.length > 0 ? await findTasksByCodes(project.id, codes) : [];

  const conclusion = run.conclusion;
  for (const task of tasks) {
    if (!task.assigneeId) continue;
    if (conclusion === 'success') {
      await notifications.notifyCiSuccess(project.id, task.id, task.title, run.name, run.html_url, task.assigneeId);
    } else if (conclusion === 'failure') {
      await notifications.notifyCiFailed(project.id, task.id, task.title, run.name, run.html_url, task.assigneeId);
    }
  }

  await recordWebhookEvent({
    projectId: project.id,
    eventType: 'workflow_run',
    action: run.conclusion || run.status,
    payload: JSON.stringify(payload).slice(0, 10000),
    status: 'PROCESSED',
    taskIds: tasks.map(t => t.id).join(',') || '',
  });
}
