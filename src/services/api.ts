import axios from 'axios';
import { Organization, Project, Task } from '../types';
import { tokenStore } from '../utils/tokenStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://multi-tenant-backend-ugnt-80ksha87c-hrithiks-projects-a05d4764.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach token
api.interceptors.request.use(
  (config) => {
    const token = tokenStore.getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'token_expired') {
      // Access token expired, try to refresh
      try {
        const refreshResponse = await api.post('/auth/refresh', {}, {
          withCredentials: true
        });
        if (refreshResponse.data?.accessToken) {
          // Update token store with new token
          tokenStore.setToken(refreshResponse.data.accessToken);
          // Update the original request with new token and retry
          const originalRequest = error.config;
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  
  register: async (username: string, password: string) => {
    const response = await api.post('/auth/register', { username, password });
    return response.data;
  },
  
  refresh: async () => {
    const response = await api.post('/auth/refresh', {}, {
      withCredentials: true
    });
    return response.data;
  },

  findUserByUsername: async (username: string) => {
    const response = await api.post('/auth/find-by-username', { username });
    return response.data.user;
  },

  searchUsers: async (query: string, limit: number = 10) => {
    const response = await api.post('/auth/search-users', { query, limit });
    return response.data.users;
  },
  
};

// Organization API
export const organizationAPI = {
  getOrganizations: async (): Promise<Organization[]> => {
    const response = await api.get('/organizations');
    return response.data.organizations;
  },
  
  createOrganization: async (name: string, subdomain: string) => {
    const response = await api.post('/organizations', { name, subdomain });
    return response.data;
  },
  
  switchOrganization: async (organizationId: string) => {
    const response = await api.post(`/organizations/switch/${organizationId}`);
    return response.data;
  },
  
  getMembers: async (organizationId: string) => {
    const response = await api.get(`/organizations/${organizationId}/members`);
    return response.data.members;
  },
  
  addMember: async (organizationId: string, userId: string, role: string) => {
    const response = await api.post(`/organizations/${organizationId}/members`, {
      userId,
      role,
    });
    return response.data;
  },
  
  updateMemberRole: async (organizationId: string, userId: string, role: string) => {
    const response = await api.put(`/organizations/${organizationId}/members/${userId}`, {
      role,
    });
    return response.data;
  },
  
  removeMember: async (organizationId: string, userId: string) => {
    const response = await api.delete(`/organizations/${organizationId}/members/${userId}`);
    return response.data;
  },
};

// Project API
export const projectAPI = {
  getProjects: async (organizationId: string): Promise<Project[]> => {
    const response = await api.get(`/organizations/${organizationId}/projects`);
    return response.data.projects;
  },
  
  createProject: async (name: string, slug: string, organizationId: string) => {
    const response = await api.post(`/organizations/${organizationId}/projects`, { name, slug });
    return response.data;
  },
  
  getProject: async (projectId: string, organizationId: string) => {
    const response = await api.get(`/organizations/${organizationId}/projects/${projectId}`);
    return response.data.project;
  },
  
  updateProject: async (projectId: string, data: { name?: string; slug?: string }, organizationId: string) => {
    const response = await api.put(`/organizations/${organizationId}/projects/${projectId}`, data);
    return response.data;
  },
  
  deleteProject: async (projectId: string, organizationId: string) => {
    const response = await api.delete(`/organizations/${organizationId}/projects/${projectId}`);
    return response.data;
  },
  
  getProjectMembers: async (projectId: string, organizationId: string) => {
    const response = await api.get(`/organizations/${organizationId}/projects/${projectId}/members`);
    return response.data.members;
  },
  
  addProjectMember: async (projectId: string, data: { userId: string; role: 'EDITOR' | 'VIEWER' }, organizationId: string) => {
    const response = await api.post(`/organizations/${organizationId}/projects/${projectId}/members`, data);
    return response.data;
  },
  
  updateProjectMemberRole: async (projectId: string, memberId: string, role: 'EDITOR' | 'VIEWER', organizationId: string) => {
    const response = await api.put(`/organizations/${organizationId}/projects/${projectId}/members/${memberId}`, {
      role,
    });
    return response.data;
  },
  
  removeProjectMember: async (projectId: string, memberId: string, organizationId: string) => {
    const response = await api.delete(`/organizations/${organizationId}/projects/${projectId}/members/${memberId}`);
    return response.data;
  },
};

// Task API
export const taskAPI = {
  getTasks: async (projectId: string, organizationId: string, status?: string): Promise<Task[]> => {
    const params = status ? { status } : {};
    const response = await api.get(`/organizations/${organizationId}/projects/${projectId}/tasks`, {
      params
    });
    return response.data.tasks;
  },
  
  createTask: async (projectId: string, data: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: number;
  }, organizationId: string) => {
    const response = await api.post(`/organizations/${organizationId}/projects/${projectId}/tasks`, data);
    return response.data;
  },
  
  updateTask: async (projectId: string, taskId: string, data: {
    title?: string;
    description?: string;
    status?: 'TODO' | 'INPROGRESS' | 'DONE';
    assigneeId?: string;
    dueDate?: string;
    priority?: number;
    orderInBoard?: number;
  }, organizationId: string) => {
    const response = await api.put(`/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`, data);
    return response.data;
  },
  
  deleteTask: async (projectId: string, taskId: string, organizationId: string) => {
    const response = await api.delete(`/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}`);
    return response.data;
  },
  
  getTaskBoard: async (projectId: string, organizationId: string) => {
    const response = await api.get(`/organizations/${organizationId}/projects/${projectId}/tasks/board`);
    return response.data.board;
  },
};

// Activity API
export const activityAPI = {
  getActivities: async (organizationId: string, page: number = 1, limit: number = 20, kind?: string, roomKey?: string) => {
    const params = { page, limit, ...(kind && { kind }), ...(roomKey && { roomKey }) };
    const response = await api.get(`/organizations/${organizationId}/activities`, { params });
    return response.data;
  },
  
  createActivity: async (organizationId: string, data: {
    kind: string;
    message: string;
    objectType?: string;
    objectId?: string;
    meta?: Record<string, unknown>;
  }) => {
    const response = await api.post(`/organizations/${organizationId}/activities`, data);
    return response.data;
  },
};

export default api;
