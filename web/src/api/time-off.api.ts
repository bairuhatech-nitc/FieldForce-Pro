import api from './axios-instance';
import type { ApiResponse, PageOptions } from '@/types/api.types';
import type {
  TimeOffRequest,
  TimeOffBalance,
  TimeOffLeaveType,
  TimeOffDurationType,
} from '@/types/models.types';

export interface UpdateTimeOffRequestPayload {
  leave_type?: TimeOffLeaveType;
  start_date?: string;
  end_date?: string;
  duration_type?: TimeOffDurationType;
  reason?: string;
}

export interface CreateTimeOffRequestPayload {
  leave_type: TimeOffLeaveType;
  start_date: string;
  end_date: string;
  duration_type: TimeOffDurationType;
  reason?: string;
}

export interface UpdateTimeOffStatusPayload {
  status: 'approved' | 'rejected';
  manager_notes?: string;
}

export interface TimeOffFilters extends PageOptions {
  user_id?: string;
  status?: string;
  leave_type?: string;
  date_from?: string;
  date_to?: string;
}

export const timeOffApi = {
  getAll(params?: TimeOffFilters) {
    return api.get<ApiResponse<TimeOffRequest[]>>('/time-off', { params });
  },

  getById(id: string) {
    return api.get<ApiResponse<TimeOffRequest>>(`/time-off/${id}`);
  },

  getBalances(userId: string, year?: number) {
    return api.get<ApiResponse<TimeOffBalance[]>>(`/time-off/balances/${userId}`, {
      params: year ? { year } : undefined,
    });
  },

  getMyBalances(year?: number) {
    return api.get<ApiResponse<TimeOffBalance[]>>('/time-off/my-balances', {
      params: year ? { year } : undefined,
    });
  },

  getConflicts(startDate: string, endDate: string, excludeUserId?: string) {
    return api.get<ApiResponse<TimeOffRequest[]>>('/time-off/conflicts', {
      params: { start_date: startDate, end_date: endDate, exclude_user_id: excludeUserId },
    });
  },

  isOnLeave(userId: string, startDate: string, endDate: string) {
    return api.get<ApiResponse<{ on_leave: boolean }>>('/time-off/availability', {
      params: { user_id: userId, start_date: startDate, end_date: endDate },
    });
  },

  getLeaveBlocksForDate(date: string) {
    return api.get<ApiResponse<TimeOffRequest[]>>('/time-off/leave-blocks', {
      params: { date },
    });
  },

  create(payload: CreateTimeOffRequestPayload) {
    return api.post<ApiResponse<TimeOffRequest>>('/time-off', payload);
  },

  update(id: string, payload: UpdateTimeOffRequestPayload) {
    return api.put<ApiResponse<TimeOffRequest>>(`/time-off/${id}`, payload);
  },

  updateStatus(id: string, payload: UpdateTimeOffStatusPayload) {
    return api.put<ApiResponse<TimeOffRequest>>(`/time-off/${id}/status`, payload);
  },

  cancel(id: string) {
    return api.delete<ApiResponse<null>>(`/time-off/${id}`);
  },
};
