import { Router } from 'express';
import { verifyGitHubWebhook } from '../middlewares/githubWebhook.js';
import { handlePush, handlePullRequest, handleWorkflowRun } from '../services/webhookProcessor.js';

const router = Router();

// POST /api/webhooks/github
router.post('/github', verifyGitHubWebhook, async (req, res) => {
  try {
    const eventType = req.headers['x-github-event'] as string;
    const payload = req.body;

    switch (eventType) {
      case 'push':
        await handlePush(payload);
        break;
      case 'pull_request':
        await handlePullRequest(payload);
        break;
      case 'workflow_run':
        await handleWorkflowRun(payload);
        break;
      default:
        // 忽略不關心的事件
        break;
    }

    res.status(200).json({ message: 'OK' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
