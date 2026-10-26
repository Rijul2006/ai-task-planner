import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { boardTasksQueryKey } from './useBoardData';

export const useApproveAction = (userId: string | undefined, boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const res = await api.post(`/ai/actions/${actionId}/approve`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardTasksQueryKey(userId, boardId) });
    },
  });
};

export const useRejectAction = () => {
  return useMutation({
    mutationFn: async (actionId: string) => {
      const res = await api.post(`/ai/actions/${actionId}/reject`);
      return res.data.data;
    },
  });
};