import { Router } from 'express';
import { prisma } from '../services/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { roleMiddleware } from '../middlewares/role.js';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const testerRoles = ['ADMIN', 'PROJECT_MANAGER', 'TESTER'];

// GET /api/projects/:projectId/test-cases
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const testCases = await prisma.testCase.findMany({
      where: { projectId },
      include: {
        requirement: { select: { id: true, reqCode: true, title: true } },
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 1,
          include: { bug: { select: { id: true, bugCode: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(testCases);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/test-cases - ADMIN/PM/TESTER
router.post('/', roleMiddleware(testerRoles), async (req, res) => {
  try {
    const { projectId } = req.params;
    const { tcCode, title, precondition, steps, expectedResult, requirementId } = req.body;

    const count = await prisma.testCase.count({ where: { projectId } });
    const code = tcCode || `TC-${String(count + 1).padStart(3, '0')}`;

    const testCase = await prisma.testCase.create({
      data: {
        projectId,
        tcCode: code,
        title,
        precondition,
        steps,
        expectedResult,
        requirementId,
      },
      include: {
        requirement: { select: { id: true, reqCode: true, title: true } },
      },
    });

    res.status(201).json(testCase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/test-cases/:id - ADMIN/PM/TESTER
router.put('/:id', roleMiddleware(testerRoles), async (req, res) => {
  try {
    const { id } = req.params;
    const testCase = await prisma.testCase.update({
      where: { id },
      data: req.body,
      include: {
        requirement: { select: { id: true, reqCode: true, title: true } },
      },
    });
    res.json(testCase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/test-cases/:id - ADMIN/PM/TESTER
router.delete('/:id', roleMiddleware(testerRoles), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.testCase.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/test-cases/:id/executions
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const executions = await prisma.testExecution.findMany({
      where: { testCaseId: id },
      include: {
        bug: { select: { id: true, bugCode: true, title: true } },
      },
      orderBy: { executedAt: 'desc' },
    });
    res.json(executions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/test-cases/:id/executions - ADMIN/PM/TESTER
router.post('/:id/executions', roleMiddleware(testerRoles), async (req, res) => {
  try {
    const { id } = req.params;
    const { result, actualResult, executedBy } = req.body;
    const userId = (req as any).user?.userId;

    const execution = await prisma.testExecution.create({
      data: {
        testCaseId: id,
        result,
        actualResult,
        executedBy: executedBy || userId,
      },
      include: {
        bug: { select: { id: true, bugCode: true, title: true } },
      },
    });

    res.status(201).json(execution);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/test-executions
router.get('/executions/summary', async (req, res) => {
  try {
    const { projectId } = req.params;
    const testCases = await prisma.testCase.findMany({
      where: { projectId },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 1,
        },
      },
    });

    const total = testCases.length;
    const passed = testCases.filter((tc) => tc.executions[0]?.result === 'PASSED').length;
    const failed = testCases.filter((tc) => tc.executions[0]?.result === 'FAILED').length;
    const pending = testCases.filter((tc) => !tc.executions[0]).length;

    res.json({ total, passed, failed, pending });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
