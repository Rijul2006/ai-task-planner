import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export const useApproveAction = (boardId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const res = await api.post(`/ai/actions/${actionId}/approve`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', boardId] });
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