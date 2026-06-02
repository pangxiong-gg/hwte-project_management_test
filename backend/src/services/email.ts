import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || '數位化專案管理系統 <noreply@digital-pm.com>';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  transporter = nodemailer.createTransporter({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export function isEmailEnabled(): boolean {
  return !!getTransporter();
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log('[Email] SMTP not configured, skipping email:', subject, '->', to);
    return false;
  }
  try {
    await t.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (e) {
    console.error('[Email] Failed to send:', e);
    return false;
  }
}

export function buildNotificationEmailHtml(
  title: string,
  content: string,
  type: string,
  projectName?: string
): string {
  const typeColorMap: Record<string, string> = {
    TASK_ASSIGNED: '#3b82f6',
    BUG_ASSIGNED: '#ef4444',
    TASK_STATUS_CHANGED: '#8b5cf6',
    BUG_STATUS_CHANGED: '#f59e0b',
    REQUIREMENT_STATUS_CHANGED: '#14b8a6',
    COMMENT_MENTION: '#ec4899',
    GIT_COMMIT: '#6366f1',
    GIT_PR_CREATED: '#22c55e',
    GIT_PR_MERGED: '#10b981',
    CI_SUCCESS: '#22c55e',
    CI_FAILED: '#ef4444',
  };
  const color = typeColorMap[type] || '#64748b';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { padding: 24px 24px 16px; border-bottom: 1px solid #e2e8f0; }
    .header h2 { margin: 0; font-size: 18px; color: #1e293b; }
    .header .project { font-size: 13px; color: #64748b; margin-top: 4px; }
    .body { padding: 24px; }
    .body p { font-size: 15px; color: #334155; line-height: 1.6; margin: 0; }
    .footer { padding: 16px 24px; background: #f8fafc; font-size: 12px; color: #94a3b8; text-align: center; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; background: ${color}; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">${title}</span>
      ${projectName ? `<div class="project">${projectName}</div>` : ''}
    </div>
    <div class="body">
      <p>${content}</p>
    </div>
    <div class="footer">
      數位化專案管理系統 — 此郵件由系統自動發送
    </div>
  </div>
</body>
</html>`;
}
