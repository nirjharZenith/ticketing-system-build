import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getApiErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data.errors) && data.errors[0]?.message) return data.errors[0].message;
  return fallback;
};

// Add token to headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authAPI = {
  register: (email: string, name: string, password: string, confirmPassword: string) =>
    api.post('/auth/register', { email, name, password, confirmPassword }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  verifyToken: (token: string) =>
    api.post('/auth/verify', { token }),
};

// Organizations
export const orgAPI = {
  getAll: () => api.get('/orgs'),
  create: (name: string) => api.post('/orgs', { name }),
  getMembers: (orgId: string) =>
    api.get(`/orgs/${orgId}/members`),
  addMember: (orgId: string, email: string, role: string) =>
    api.post(`/orgs/${orgId}/members`, { email, role }),
  removeMember: (orgId: string, userId: string) =>
    api.delete(`/orgs/${orgId}/members/${userId}`),
};

// Tickets
export const ticketAPI = {
  create: (orgId: string, title: string, description: string, priority: string) =>
    api.post(`/tickets/${orgId}/tickets`, { title, description, priority }),
  getAll: (orgId: string, filters?: any) =>
    api.get(`/tickets/${orgId}/tickets`, { params: filters }),
  getById: (orgId: string, ticketId: string) =>
    api.get(`/tickets/${orgId}/tickets/${ticketId}`),
  update: (orgId: string, ticketId: string, updates: any) =>
    api.patch(`/tickets/${orgId}/tickets/${ticketId}`, updates),
  delete: (orgId: string, ticketId: string) =>
    api.delete(`/tickets/${orgId}/tickets/${ticketId}`),
  getActivity: (orgId: string, ticketId: string) =>
    api.get(`/tickets/${orgId}/tickets/${ticketId}/activity`),
  getAttachments: (orgId: string, ticketId: string) =>
    api.get(`/tickets/${orgId}/tickets/${ticketId}/attachments`),
  addAttachment: (orgId: string, ticketId: string, filename: string, fileUrl: string) =>
    api.post(`/tickets/${orgId}/tickets/${ticketId}/attachments`, { filename, fileUrl }),
};

export default api;
