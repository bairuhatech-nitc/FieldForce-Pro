import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attendanceApi,
  type CheckInPayload,
  type CheckOutPayload,
  type AdjustAttendancePayload,
  type AttendanceFilters,
  type CreateAttendanceLogPayload,
} from '@/api/attendance.api';
import { useNotificationStore } from '@/store/notification.store';

export function useAttendanceLogs(params?: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', params],
    queryFn: async () => {
      const response = await attendanceApi.getAll(params);
      return { data: response.data.data!, meta: response.data.meta! };
    },
  });
}

export function useAttendanceLog(id: string) {
  return useQuery({
    queryKey: ['attendance', id],
    queryFn: async () => {
      const response = await attendanceApi.getById(id);
      return response.data.data!;
    },
    enabled: !!id,
  });
}

export function useMyToday() {
  return useQuery({
    queryKey: ['attendance', 'me', 'today'],
    queryFn: async () => {
      const response = await attendanceApi.getMyToday();
      return response.data.data!;
    },
    refetchInterval: 60000, // refresh every minute so the timer stays fresh
  });
}

export function useWeeklyTimesheet(weekStart: string, weekEnd: string, userId?: string) {
  return useQuery({
    queryKey: ['attendance', 'timesheet', weekStart, weekEnd, userId],
    queryFn: async () => {
      const response = await attendanceApi.getWeeklyTimesheet(weekStart, weekEnd, userId);
      return response.data.data!;
    },
    enabled: !!weekStart && !!weekEnd,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: CheckInPayload) => attendanceApi.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      addNotification({ type: 'success', message: 'Checked in successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to check in',
      });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: CheckOutPayload) => attendanceApi.checkOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      addNotification({ type: 'success', message: 'Checked out successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to check out',
      });
    },
  });
}

export function useCreateAttendanceLog() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: CreateAttendanceLogPayload) => attendanceApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      addNotification({ type: 'success', message: 'Attendance log created' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to create attendance log',
      });
    },
  });
}

export function useAdjustAttendance() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: AdjustAttendancePayload & { id: string }) =>
      attendanceApi.adjust(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      addNotification({ type: 'success', message: 'Attendance record adjusted' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({
        type: 'error',
        message: err?.response?.data?.message || 'Failed to adjust attendance',
      });
    },
  });
}
