import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import requirementRoutes from './routes/requirementRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import bugRoutes from './routes/bugRoutes.js';
import userRoutes from './routes/userRoutes.js';
import phaseRoutes from './routes/phaseRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import testCaseRoutes from './routes/testCaseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import cicdRoutes from './routes/cicdRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import webhookEventRoutes from './routes/webhookEventRoutes.js';
import myTaskRoutes from './routes/myTaskRoutes.js';
import resourceLoadRoutes from './routes/resourceLoadRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import sprintRoutes from './routes/sprintRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: 'http://localhost:5173' }));

// Webhook routes (raw body needed for signature verification)
import webhookRoutes from './routes/webhookRoutes.js';
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }), webhookRoutes);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/phases', phaseRoutes);
app.use('/api/projects/:projectId/requirements', requirementRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/bugs', bugRoutes);
app.use('/api/projects/:projectId/test-cases', testCaseRoutes);
app.use('/api/projects/:projectId/cicd', cicdRoutes);
app.use('/api/projects/:projectId/documents', documentRoutes);
app.use('/api/projects/:projectId/webhook-events', webhookEventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/my-tasks', myTaskRoutes);
app.use('/api/resource-load', resourceLoadRoutes);
app.use('/api/projects/:projectId/comments', commentRoutes);
app.use('/api/projects/:projectId/tags', tagRoutes);
app.use('/api/projects/:projectId/sprints', sprintRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
