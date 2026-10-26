import axios, { AxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const response = await api.request({
    url,
    method: options.method || 'GET',
    data: options.body,
    headers: options.headers as AxiosRequestConfig['headers'],
  });

  return { data: response.data?.data ?? response.data };
};

// --- BOARDS API ---
export const getBoards = () => fetchWithAuth('/boards');

export const getBoardById = (boardId: string) => fetchWithAuth(`/boards/${boardId}`);

export const createBoard = (data: { name: string; description?: string }) =>
  fetchWithAuth('/boards', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateBoard = (boardId: string, data: { name: string; description?: string }) =>
  fetchWithAuth(`/boards/${boardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteBoard = (boardId: string) =>
  fetchWithAuth(`/boards/${boardId}`, {
    method: 'DELETE',
  });

// --- BOARD MEMBERS API ---
export const getBoardMembers = (boardId: string) => fetchWithAuth(`/boards/${boardId}/members`);

export const addBoardMember = (boardId: string, email: string, role: 'MEMBER' | 'VIEWER' = 'MEMBER') =>
  fetchWithAuth(`/boards/${boardId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });

export const updateBoardMember = (boardId: string, userId: string, role: 'MEMBER' | 'VIEWER') =>
  fetchWithAuth(`/boards/${boardId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

export const removeBoardMember = (boardId: string, userId: string) =>
  fetchWithAuth(`/boards/${boardId}/members/${userId}`, {
    method: 'DELETE',
  });

// --- TASKS API ---
export const getBoardTasks = (boardId: string) => fetchWithAuth(`/boards/${boardId}/tasks`);

export const createTask = (
  boardId: string,
  task: { title: string; description?: string; priority?: string; status?: string; dueDate?: string }
) =>
  fetchWithAuth(`/boards/${boardId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(task),
  });

export const updateTask = (
  taskId: string,
  updates: Partial<{ title: string; description: string; priority: string; status: string; dueDate: string }>
) =>
  fetchWithAuth(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

export const deleteTask = (taskId: string) =>
  fetchWithAuth(`/tasks/${taskId}`, {
    method: 'DELETE',
  });

// --- AI / TPM ACTIONS ---
export const approveAIAction = (actionId: string) =>
  fetchWithAuth(`/ai/actions/${actionId}/approve`, { method: 'POST' });

export const rejectAIAction = (actionId: string) =>
  fetchWithAuth(`/ai/actions/${actionId}/reject`, { method: 'POST' });

export { fetchWithAuth };
export default api;
