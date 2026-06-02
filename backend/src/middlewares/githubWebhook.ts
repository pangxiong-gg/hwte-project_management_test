import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

export function verifyGitHubWebhook(req: Request, res: Response, next: NextFunction) {
  // 開發環境跳過驗證
  if (process.env.NODE_ENV === 'development') {
    req.body = JSON.parse(req.body);
    return next();
  }

  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  if (!GITHUB_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', GITHUB_WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  req.body = JSON.parse(req.body);
  next();
}
