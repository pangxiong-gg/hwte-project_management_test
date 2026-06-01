import axios from 'axios';
import type { LoginResponse, Project, ProjectPhase, Requirement, Task, Bug, User, Notification, RequirementChange, TestCase, TestExecution } from '../types';

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

export default api;
