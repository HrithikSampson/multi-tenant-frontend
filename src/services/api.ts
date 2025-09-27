import axios from 'axios';
import { Organization, Project, Task } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://multi-tenant-backend-ugnt-80ksha87c-hrithiks-projects-a05d4764.vercel.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  // Token is added by individual API calls from context
  // This interceptor is kept for potential future use
  return config;
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && error.response?.data?.code === 'token_expired') {
      // Access token expired, try to refresh
      try {
        const refreshResponse = await api.post('/auth/refresh');
        if (refreshResponse.data?.accessToken) {
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
      // Other 401 errors, redirect to login
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
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  findUserByUsername: async (username: string, token: string) => {
    const response = await api.post('/auth/find-by-username', { username }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.user;
  },

  searchUsers: async (query: string, token: string, limit: number = 10) => {
    const response = await api.post('/auth/search-users', { query, limit }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.users;
  },
  
};

// Organization API
export const organizationAPI = {
  getOrganizations: async (token: string): Promise<Organization[]> => {
    const response = await api.get('/organizations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.organizations;
  },
  
  createOrganization: async (name: string, subdomain: string, token: string) => {
    const response = await api.post('/organizations', { name, subdomain }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },
  
  switchOrganization: async (organizationId: string, token: string) => {
    const response = await api.post(`/organizations/switch/${organizationId}`, {}, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  getMembers: async (organizationId: string, token: string) => {
    const response = await api.get(`/organizations/${organizationId}/members`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data.members;
  },
  
  addMember: async (organizationId: string, userId: string, role: string, token: string) => {
    const response = await api.post(`/organizations/${organizationId}/members`, {
      userId,
      role,
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  updateMemberRole: async (organizationId: string, userId: string, role: string, token: string) => {
    const response = await api.put(`/organizations/${organizationId}/members/${userId}`, {
      role,
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  removeMember: async (organizationId: string, userId: string, token: string) => {
    const response = await api.delete(`/organizations/${organizationId}/members/${userId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
};

// Project API
export const projectAPI = {
  getProjects: async (token: string, organizationId: string): Promise<Project[]> => {
    const response = await api.get('/projects', {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data.projects;
  },
  
  createProject: async (name: string, slug: string, token: string, organizationId: string) => {
    const response = await api.post('/projects', { name, slug }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  getProject: async (projectId: string, token: string, organizationId: string) => {
    const response = await api.get(`/projects/${projectId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data.project;
  },
  
  updateProject: async (projectId: string, data: { name?: string; slug?: string }, token: string, organizationId: string) => {
    const response = await api.put(`/projects/${projectId}`, data, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  deleteProject: async (projectId: string, token: string, organizationId: string) => {
    const response = await api.delete(`/projects/${projectId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  getProjectMembers: async (projectId: string, token: string, organizationId: string) => {
    const response = await api.get(`/projects/${projectId}/members`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data.members;
  },
  
  addProjectMember: async (projectId: string, data: { userId: string; role: 'EDITOR' | 'VIEWER' }, token: string, organizationId: string) => {
    const response = await api.post(`/projects/${projectId}/members`, data, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  updateProjectMemberRole: async (projectId: string, memberId: string, role: 'EDITOR' | 'VIEWER', token: string, organizationId: string) => {
    const response = await api.put(`/projects/${projectId}/members/${memberId}`, {
      role,
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  removeProjectMember: async (projectId: string, memberId: string, token: string, organizationId: string) => {
    const response = await api.delete(`/projects/${projectId}/members/${memberId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
};

// Task API
export const taskAPI = {
  getTasks: async (projectId: string, token: string, organizationId: string, status?: string): Promise<Task[]> => {
    const params = status ? { status } : {};
    const response = await api.get(`/tasks/${projectId}/tasks`, { 
      params,
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data.tasks;
  },
  
  createTask: async (projectId: string, data: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: number;
  }, token: string, organizationId: string) => {
    const response = await api.post(`/tasks/${projectId}/tasks`, data, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
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
  }, token: string, organizationId: string) => {
    const response = await api.put(`/tasks/${projectId}/tasks/${taskId}`, data, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  deleteTask: async (projectId: string, taskId: string, token: string, organizationId: string) => {
    const response = await api.delete(`/tasks/${projectId}/tasks/${taskId}`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data;
  },
  
  getTaskBoard: async (projectId: string, token: string, organizationId: string) => {
    const response = await api.get(`/tasks/${projectId}/tasks/board`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'X-Organization-ID': organizationId
      }
    });
    return response.data.board;
  },
};

export default api;
