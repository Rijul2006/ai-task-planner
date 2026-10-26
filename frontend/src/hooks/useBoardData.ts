import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Task } from '../types';

export const userBoardsQueryKey = (userId: string | undefined) => ['userBoards', userId] as const;
export const boardTasksQueryKey = (userId: string | undefined, boardId: string) =>
  ['tasks', userId, boardId] as const;

export const useUserBoards = (userId: string | undefined) => {
  return useQuery({
    queryKey: userBoardsQueryKey(userId),
    queryFn: async () => {
      const res = await api.get('/boards');
      return res.data?.data?.boards || res.data?.boards || [];
    },
    enabled: !!userId,
  });
};

export const useBoardTasks = (userId: string | undefined, boardId: string) => {
  return useQuery({
    queryKey: boardTasksQueryKey(userId, boardId),
    queryFn: async () => {
      const res = await api.get(`/boards/${boardId}/tasks`);
      return (res.data?.data?.tasks || res.data?.tasks || []) as Task[];
    },
    enabled: !!userId && !!boardId,
  });
};

export const useCreateTask = (userId: string | undefined, boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTask: { title: string; priority: string; status: string; description?: string }) => {
      const res = await api.post(`/boards/${boardId}/tasks`, newTask);
      return res.data?.data?.task || res.data?.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardTasksQueryKey(userId, boardId) });
    },
  });
};