export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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
