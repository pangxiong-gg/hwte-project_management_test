import { prisma } from './prisma.js';

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  content?: string;
  relatedType?: string;
  relatedId?: string;
  projectId?: string;
}) {
  try {
    await prisma.notification.create({ data });
  } catch (e) {
    // 通知失敗不應該影響主流程
    console.error('Failed to create notification:', e);
  }
}

export async function notifyTaskAssigned(projectId: string, taskId: string, taskTitle: string, assigneeId: string, assignerName: string) {
  await createNotification({
    userId: assigneeId,
    type: 'TASK_ASSIGNED',
    title: '新任務指派',
    content: `${assignerName} 將任務「${taskTitle}」指派給您`,
    relatedType: 'TASK',
    relatedId: taskId,
    projectId,
  });
}

export async function notifyTaskStatusChanged(projectId: string, taskId: string, taskTitle: string, oldStatus: string, newStatus: string, notifyUserId: string, changerName: string) {
  const statusMap: Record<string, string> = {
    TODO: '待辦',
    IN_PROGRESS: '進行中',
    CODE_REVIEW: 'Code Review',
    TESTING: '測試中',
    DONE: '完成',
  };
  await createNotification({
    userId: notifyUserId,
    type: 'TASK_STATUS_CHANGED',
    title: '任務狀態變更',
    content: `${changerName} 將任務「${taskTitle}」狀態從「${statusMap[oldStatus] || oldStatus}」變更為「${statusMap[newStatus] || newStatus}」`,
    relatedType: 'TASK',
    relatedId: taskId,
    projectId,
  });
}

export async function notifyBugStatusChanged(projectId: string, bugId: string, bugTitle: string, oldStatus: string, newStatus: string, notifyUserId: string, changerName: string) {
  const statusMap: Record<string, string> = {
    NEW: '新建',
    CONFIRMED: '已確認',
    IN_PROGRESS: '處理中',
    RESOLVED: '已解決',
    CLOSED: '已關閉',
    REOPENED: '重新打開',
  };
  await createNotification({
    userId: notifyUserId,
    type: 'BUG_STATUS_CHANGED',
    title: 'Bug 狀態變更',
    content: `${changerName} 將 Bug「${bugTitle}」狀態從「${statusMap[oldStatus] || oldStatus}」變更為「${statusMap[newStatus] || newStatus}」`,
    relatedType: 'BUG',
    relatedId: bugId,
    projectId,
  });
}

export async function notifyBugAssigned(projectId: string, bugId: string, bugTitle: string, assigneeId: string, assignerName: string) {
  await createNotification({
    userId: assigneeId,
    type: 'BUG_ASSIGNED',
    title: '新 Bug 指派',
    content: `${assignerName} 將 Bug「${bugTitle}」指派給您`,
    relatedType: 'BUG',
    relatedId: bugId,
    projectId,
  });
}

export async function notifyRequirementStatusChanged(projectId: string, reqId: string, reqTitle: string, oldStatus: string, newStatus: string, notifyUserId: string, changerName: string) {
  const statusMap: Record<string, string> = {
    DRAFT: '草稿',
    REVIEW: '審核中',
    APPROVED: '已批准',
    REJECTED: '已拒絕',
    IMPLEMENTED: '已實現',
  };
  await createNotification({
    userId: notifyUserId,
    type: 'REQUIREMENT_STATUS_CHANGED',
    title: '需求狀態變更',
    content: `${changerName} 將需求「${reqTitle}」狀態從「${statusMap[oldStatus] || oldStatus}」變更為「${statusMap[newStatus] || newStatus}」`,
    relatedType: 'REQUIREMENT',
    relatedId: reqId,
    projectId,
  });
}
