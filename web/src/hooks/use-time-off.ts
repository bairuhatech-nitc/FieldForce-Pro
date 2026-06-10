import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  timeOffApi,
  type CreateTimeOffRequestPayload,
  type UpdateTimeOffRequestPayload,
  type UpdateTimeOffStatusPayload,
  type TimeOffFilters,
} from '@/api/time-off.api';
import { useNotificationStore } from '@/store/notification.store';

export function useTimeOffRequests(params?: TimeOffFilters) {
  return useQuery({
    queryKey: ['time-off', params],
    queryFn: async () => {
      const res = await timeOffApi.getAll(params);
      return { data: res.data.data!, meta: res.data.meta! };
    },
  });
}

export function useTimeOffRequest(id: string) {
  return useQuery({
    queryKey: ['time-off', id],
    queryFn: async () => {
      const res = await timeOffApi.getById(id);
      return res.data.data!;
    },
    enabled: !!id,
  });
}

export function useLeaveBalances(userId: string, year?: number) {
  return useQuery({
    queryKey: ['time-off', 'balances', userId, year],
    queryFn: async () => {
      const res = await timeOffApi.getBalances(userId, year);
      return res.data.data!;
    },
    enabled: !!userId,
  });
}

export function useMyLeaveBalances(year?: number) {
  return useQuery({
    queryKey: ['time-off', 'my-balances', year],
    queryFn: async () => {
      const res = await timeOffApi.getMyBalances(year);
      return res.data.data!;
    },
  });
}

export function useLeaveConflicts(startDate: string, endDate: string, excludeUserId?: string) {
  return useQuery({
    queryKey: ['time-off', 'conflicts', startDate, endDate, excludeUserId],
    queryFn: async () => {
      const res = await timeOffApi.getConflicts(startDate, endDate, excludeUserId);
      return res.data.data!;
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useIsOnLeave(userId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['time-off', 'availability', userId, startDate, endDate],
    queryFn: async () => {
      const res = await timeOffApi.isOnLeave(userId, startDate, endDate);
      return res.data.data!.on_leave;
    },
    enabled: !!userId && !!startDate && !!endDate,
  });
}

export function useLeaveBlocksForDate(date: string) {
  return useQuery({
    queryKey: ['time-off', 'leave-blocks', date],
    queryFn: async () => {
      const res = await timeOffApi.getLeaveBlocksForDate(date);
      return res.data.data!;
    },
    enabled: !!date,
  });
}

export function useUpdateTimeOffRequest() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateTimeOffRequestPayload & { id: string }) =>
      timeOffApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      addNotification({ type: 'success', message: 'Request updated' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update request',
      });
    },
  });
}

export function useCreateTimeOffRequest() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: CreateTimeOffRequestPayload) => timeOffApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      addNotification({ type: 'success', message: 'Time-off request submitted' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to submit request',
      });
    },
  });
}

export function useUpdateTimeOffStatus() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateTimeOffStatusPayload & { id: string }) =>
      timeOffApi.updateStatus(id, payload),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      addNotification({
        type: 'success',
        message: `Request ${vars.status === 'approved' ? 'approved' : 'rejected'}`,
      });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to update request',
      });
    },
  });
}

export function useCancelTimeOffRequest() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (id: string) => timeOffApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-off'] });
      addNotification({ type: 'success', message: 'Request cancelled' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to cancel request',
      });
    },
  });
}
