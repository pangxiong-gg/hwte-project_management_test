export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status?: string;
  createdAt?: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: string;
  mode: string;
  startDate?: string;
  endDate?: string;
  githubRepo?: string;
  createdAt: string;
  phases?: ProjectPhase[];
  _count?: {
    requirements: number;
    tasks: number;
    bugs: number;
  };
}

export interface ProjectPhase {
  id: string;
  projectId: string;
  name: string;
  order: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  allowedTaskTypes?: string;
  _count?: {
    tasks: number;
  };
}

export interface Requirement {
  id: string;
  projectId: string;
  reqCode: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  type: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    tasks: number;
    bugs: number;
  };
}

export interface Task {
  id: string;
  projectId: string;
  taskCode: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  requirementId?: string;
  assigneeId?: string;
  phaseId?: string;
  assignee?: { id: string; name: string };
  requirement?: { id: string; reqCode: string; title: string };
  phase?: { id: string; name: string };
  plannedHours?: number;
  actualHours?: number;
  gitBranch?: string;
  gitCommit?: string;
  gitPr?: string;
  createdAt: string;
}

export interface Bug {
  id: string;
  projectId: string;
  bugCode: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  requirementId?: string;
  taskId?: string;
  createdById: string;
  assigneeId?: string;
  assignee?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content?: string;
  relatedType?: string;
  relatedId?: string;
  projectId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  tcCode: string;
  title: string;
  precondition?: string;
  steps: string;
  expectedResult: string;
  requirementId?: string;
  requirement?: { id: string; reqCode: string; title: string };
  executions?: TestExecution[];
  createdAt: string;
  updatedAt: string;
}

export interface TestExecution {
  id: string;
  testCaseId: string;
  result: 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED';
  actualResult?: string;
  executedBy: string;
  executedAt: string;
  bugId?: string;
  bug?: { id: string; bugCode: string; title: string };
}

export interface RequirementChange {
  id: string;
  requirementId: string;
  changedById: string;
  changeType: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
  changedBy?: { id: string; name: string };
}

export interface ProjectProgress {
  id: string;
  name: string;
  code: string;
  status: string;
  taskCompletionRate: number;
  reqCompletionRate: number;
  currentPhase: string;
  totalTasks: number;
  doneTasks: number;
  totalReqs: number;
  doneReqs: number;
}

export interface TeamMemberEfficiency {
  id: string;
  name: string;
  completedTasks: number;
  totalTasks: number;
  fixedBugs: number;
  totalBugs: number;
  avgCompletionDays: number;
  taskCompletionRate: number;
  bugFixRate: number;
}

export interface BugTrendPoint {
  date: string;
  opened: number;
  closed: number;
}

export interface BugTrends {
  timeline: BugTrendPoint[];
  bySeverity: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface ExportData {
  headers: string[];
  data: Record<string, any>[];
  filename: string;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
}

export interface GitHubRun {
  id: number;
  name: string;
  head_branch: string;
  head_sha: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  run_number: number;
  html_url: string;
}

export interface GitHubJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  html_url: string;
}

export interface Document {
  id: string;
  projectId: string;
  taskId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: { id: string; name: string };
}
