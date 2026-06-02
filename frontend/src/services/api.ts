import axios from 'axios';
import type { LoginResponse, Project, ProjectPhase, Requirement, Task, Bug, User, Notification, RequirementChange, TestCase, TestExecution, ProjectProgress, TeamMemberEfficiency, BugTrends, ExportData, Document, WebhookEvent } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  me: () => api.get<{ user: import('../types').User }>('/auth/me'),
};

export const projectApi = {
  getAll: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
};

export const phaseApi = {
  getAll: (projectId: string) =>
    api.get<ProjectPhase[]>(`/projects/${projectId}/phases`),
  getCurrent: (projectId: string) =>
    api.get<ProjectPhase>(`/projects/${projectId}/phases/current`),
  advance: (projectId: string, phaseId: string) =>
    api.post<{ phases: ProjectPhase[]; message: string }>(`/projects/${projectId}/phases/${phaseId}/advance`),
};

export const requirementApi = {
  getAll: (projectId: string) =>
    api.get<Requirement[]>(`/projects/${projectId}/requirements`),
  create: (projectId: string, data: Partial<Requirement>) =>
    api.post<Requirement>(`/projects/${projectId}/requirements`, data),
  update: (projectId: string, id: string, data: Partial<Requirement>) =>
    api.put<Requirement>(`/projects/${projectId}/requirements/${id}`, data),
};

export const taskApi = {
  getAll: (projectId: string) =>
    api.get<Task[]>(`/projects/${projectId}/tasks`),
  create: (projectId: string, data: Partial<Task>) =>
    api.post<Task>(`/projects/${projectId}/tasks`, data),
  update: (projectId: string, id: string, data: Partial<Task>) =>
    api.put<Task>(`/projects/${projectId}/tasks/${id}`, data),
};

export const bugApi = {
  getAll: (projectId: string) =>
    api.get<Bug[]>(`/projects/${projectId}/bugs`),
  create: (projectId: string, data: Partial<Bug>) =>
    api.post<Bug>(`/projects/${projectId}/bugs`, data),
  update: (projectId: string, id: string, data: Partial<Bug>) =>
    api.put<Bug>(`/projects/${projectId}/bugs/${id}`, data),
};

export const userApi = {
  getAll: () => api.get<User[]>('/users'),
  getMe: () => api.get<User>('/users/me'),
  create: (data: { name: string; email: string; password: string; role: string }) =>
    api.post<User>('/users', data),
  updateMe: (data: Partial<{ name: string; password: string }>) => api.put<User>('/users/me', data),
  update: (id: string, data: Partial<{ name: string; role: string; status: string }>) =>
    api.put<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const notificationApi = {
  getAll: (params?: { unreadOnly?: boolean }) =>
    api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications', { params }),
  markRead: (id: string) => api.put(`/notifications/${id}/read`, {}),
  markAllRead: () => api.put('/notifications/read-all', {}),
};

export const testCaseApi = {
  getAll: (projectId: string) =>
    api.get<TestCase[]>(`/projects/${projectId}/test-cases`),
  create: (projectId: string, data: Partial<TestCase>) =>
    api.post<TestCase>(`/projects/${projectId}/test-cases`, data),
  update: (projectId: string, id: string, data: Partial<TestCase>) =>
    api.put<TestCase>(`/projects/${projectId}/test-cases/${id}`, data),
  delete: (projectId: string, id: string) =>
    api.delete(`/projects/${projectId}/test-cases/${id}`),
  getExecutions: (projectId: string, id: string) =>
    api.get<TestExecution[]>(`/projects/${projectId}/test-cases/${id}/executions`),
  createExecution: (projectId: string, id: string, data: Partial<TestExecution>) =>
    api.post<TestExecution>(`/projects/${projectId}/test-cases/${id}/executions`, data),
};

export const requirementChangeApi = {
  getAll: (projectId: string, requirementId: string) =>
    api.get<RequirementChange[]>(`/projects/${projectId}/requirements/${requirementId}/changes`),
};

export const cicdApi = {
  getWorkflows: (projectId: string) =>
    api.get<{ workflows: import('../types').GitHubWorkflow[] }>(`/projects/${projectId}/cicd/workflows`),
  getRuns: (projectId: string) =>
    api.get<{ runs: import('../types').GitHubRun[] }>(`/projects/${projectId}/cicd/runs`),
  getRunDetail: (projectId: string, runId: number) =>
    api.get<{ run: import('../types').GitHubRun; jobs: import('../types').GitHubJob[] }>(`/projects/${projectId}/cicd/runs/${runId}`),
  updateGithubRepo: (projectId: string, githubRepo: string) =>
    api.put(`/projects/${projectId}/cicd/github-repo`, { githubRepo }),
};

export const reportApi = {
  getProjectProgress: () => api.get<{ projects: ProjectProgress[] }>('/reports/project-progress'),
  getTeamEfficiency: () => api.get<{ members: TeamMemberEfficiency[] }>('/reports/team-efficiency'),
  getBugTrends: (days?: number) => api.get<BugTrends>(`/reports/bug-trends?days=${days || 30}`),
  exportReport: (report: string, format: 'csv' | 'excel') =>
    format === 'csv'
      ? api.get(`/reports/export?report=${report}&format=csv`, { responseType: 'blob' })
      : api.get<ExportData>(`/reports/export?report=${report}&format=excel`),
};

export const documentApi = {
  getAll: (projectId: string) => api.get<Document[]>(`/projects/${projectId}/documents`),
  upload: (projectId: string, data: { filename: string; content: string; mimeType: string; size: number; taskId?: string }) =>
    api.post<Document>(`/projects/${projectId}/documents`, data),
  delete: (projectId: string, id: string) => api.delete(`/projects/${projectId}/documents/${id}`),
  download: (projectId: string, id: string) =>
    api.get(`/projects/${projectId}/documents/${id}/download`, { responseType: 'blob' }),
};

export const webhookApi = {
  getEvents: (projectId: string) =>
    api.get<WebhookEvent[]>(`/projects/${projectId}/webhook-events`),
};

export const myTaskApi = {
  getAll: () => api.get<{ tasks: Task[]; grouped: any; stats: { total: number; todo: number; inProgress: number; done: number; overdue: number } }>('/my-tasks'),
  updateStatus: (id: string, status: string) => api.put(`/my-tasks/${id}/status`, { status }),
  updateHours: (id: string, actualHours: number | null) => api.put(`/my-tasks/${id}/hours`, { actualHours }),
};

export const resourceLoadApi = {
  getAll: () => api.get<{ members: any[]; unassigned: any[]; summary: any }>('/resource-load'),
};

export const commentApi = {
  getAll: (projectId: string, relatedType: string, relatedId: string) =>
    api.get<{ comments: any[] }>(`/projects/${projectId}/comments?relatedType=${relatedType}&relatedId=${relatedId}`),
  create: (projectId: string, data: { content: string; relatedType: string; relatedId: string; parentId?: string }) =>
    api.post(`/projects/${projectId}/comments`, data),
  update: (projectId: string, id: string, data: { content: string }) =>
    api.put(`/projects/${projectId}/comments/${id}`, data),
  delete: (projectId: string, id: string) =>
    api.delete(`/projects/${projectId}/comments/${id}`),
};

export const tagApi = {
  getAll: (projectId: string) => api.get<{ tags: any[] }>(`/projects/${projectId}/tags`),
  create: (projectId: string, data: { name: string; color?: string }) =>
    api.post(`/projects/${projectId}/tags`, data),
  update: (projectId: string, id: string, data: { name?: string; color?: string }) =>
    api.put(`/projects/${projectId}/tags/${id}`, data),
  delete: (projectId: string, id: string) => api.delete(`/projects/${projectId}/tags/${id}`),
};

export const sprintApi = {
  getAll: (projectId: string) => api.get<{ sprints: any[] }>(`/projects/${projectId}/sprints`),
  create: (projectId: string, data: Partial<Sprint>) =>
    api.post(`/projects/${projectId}/sprints`, data),
  update: (projectId: string, id: string, data: Partial<Sprint>) =>
    api.put(`/projects/${projectId}/sprints/${id}`, data),
  delete: (projectId: string, id: string) => api.delete(`/projects/${projectId}/sprints/${id}`),
  getBurndown: (projectId: string, id: string) =>
    api.get<{ sprint: any; totalHours: number; data: any[] }>(`/projects/${projectId}/sprints/${id}/burndown`),
};

export const calendarApi = {
  getEvents: (month?: string) => api.get<{ events: any[] }>(`/calendar/events${month ? `?month=${month}` : ''}`),
};

export default api;
