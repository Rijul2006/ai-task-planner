import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Task } from '../types';

export const useUserBoards = () => {
  return useQuery({
    queryKey: ['userBoards'],
    queryFn: async () => {
      const res = await api.get('/boards');
      // Fix: Handle both backend wrapper standard formats safely
      return res.data?.data?.boards || res.data?.boards || [];
    },
  });
};

export const useBoardTasks = (boardId: string) => {
  return useQuery({
    queryKey: ['tasks', boardId],
    queryFn: async () => {
      if (!boardId) return [];
      const res = await api.get(`/boards/${boardId}/tasks`);
      return (res.data?.data?.tasks || res.data?.tasks || []) as Task[];
    },
    enabled: !!boardId,
  });
};

export const useCreateTask = (boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTask: { title: string; priority: string; status: string; description?: string }) => {
      const res = await api.post(`/boards/${boardId}/tasks`, newTask);
      return res.data?.data?.task || res.data?.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
    },
  });
};