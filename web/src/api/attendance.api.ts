import api from './axios-instance';
import type { ApiResponse, PageOptions } from '@/types/api.types';
import type { AttendanceLog, AttendancePunch, MyTodayResponse } from '@/types/models.types';

export interface CheckInPayload {
  location?: { lat: number; lng: number };
  device_info?: string;
}

export interface CheckOutPayload {
  location?: { lat: number; lng: number };
  device_info?: string;
}

export interface CreateAttendanceLogPayload {
  user_id: string;
  date: string;
  punch_in_time?: string;
  punch_out_time?: string;
  status?: 'present' | 'absent' | 'half_day';
  notes?: string;
}

export interface AdjustAttendancePayload {
  adjustment_reason: string;
  status?: 'present' | 'absent' | 'half_day';
  punch_in_time?: string;
  punch_out_time?: string;
  punch_id?: string;
}

export interface AttendanceFilters extends PageOptions {
  user_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export const attendanceApi = {
  getAll(params?: AttendanceFilters) {
    return api.get<ApiResponse<AttendanceLog[]>>('/attendance', { params });
  },

  getById(id: string) {
    return api.get<ApiResponse<AttendanceLog>>(`/attendance/${id}`);
  },

  getMyToday() {
    return api.get<ApiResponse<MyTodayResponse>>('/attendance/me/today');
  },

  checkIn(payload: CheckInPayload) {
    return api.post<ApiResponse<AttendancePunch>>('/attendance/check-in', payload);
  },

  checkOut(payload: CheckOutPayload) {
    return api.post<ApiResponse<AttendancePunch>>('/attendance/check-out', payload);
  },

  adjust(id: string, payload: AdjustAttendancePayload) {
    return api.put<ApiResponse<AttendanceLog>>(`/attendance/${id}/adjust`, payload);
  },

  getWeeklyTimesheet(weekStart: string, weekEnd: string, userId?: string) {
    return api.get<ApiResponse<AttendanceLog[]>>('/attendance/timesheet', {
      params: { week_start: weekStart, week_end: weekEnd, user_id: userId },
    });
  },

  create(payload: CreateAttendanceLogPayload) {
    return api.post<ApiResponse<AttendanceLog>>('/attendance', payload);
  },
};
