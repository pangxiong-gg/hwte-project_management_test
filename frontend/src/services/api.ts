import axios from 'axios';
import type { LoginResponse, Project, Requirement, Task, Bug } from '../types';

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

export default api;
