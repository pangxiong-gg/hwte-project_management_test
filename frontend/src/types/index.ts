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
  startDate?: string;
  endDate?: string;
  createdAt: string;
  _count?: {
    requirements: number;
    tasks: number;
    bugs: number;
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
  assignee?: { id: string; name: string };
  requirement?: { id: string; reqCode: string; title: string };
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
