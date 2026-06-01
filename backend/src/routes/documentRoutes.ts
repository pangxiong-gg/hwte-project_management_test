import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import fs from 'fs';
import path from 'path';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// POST /api/projects/:projectId/documents — Upload file
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.userId;

    const { filename, content, mimeType, size, taskId } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: 'filename and content are required' });
    }

    const projectDir = path.join(UPLOAD_DIR, projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const docId = crypto.randomUUID();
    const storedFilename = `${docId}-${filename}`;
    const filePath = path.join(projectDir, storedFilename);

    // Write base64 content
    fs.writeFileSync(filePath, Buffer.from(content, 'base64'));

    const doc = await prisma.document.create({
      data: {
        projectId,
        taskId: taskId || null,
        filename: storedFilename,
        originalName: filename,
        mimeType: mimeType || 'application/octet-stream',
        size: size || Buffer.byteLength(content, 'base64'),
        uploadedById: userId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(doc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/documents — List files
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const docs = await prisma.document.findMany({
      where: { projectId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/documents/:id
router.delete('/:id', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const userId = (req as any).user?.userId;
    const userRole = (req as any).user?.role;

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { filename: true, uploadedById: true },
    });

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Permission check: ADMIN/PM can delete any, others can only delete their own
    const canDelete = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole) || doc.uploadedById === userId;
    if (!canDelete) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Delete file
    const filePath = path.join(UPLOAD_DIR, projectId, doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.document.delete({ where: { id } });
    res.json({ message: 'Deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/documents/:id/download
router.get('/:id/download', async (req, res) => {
  try {
    const { projectId, id } = req.params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc || doc.projectId !== projectId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const filePath = path.join(UPLOAD_DIR, projectId, doc.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.originalName)}"`);
    res.sendFile(filePath);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
