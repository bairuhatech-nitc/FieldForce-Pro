import api from './axios-instance';
import type { ApiResponse, PageOptions } from '@/types/api.types';
import type { Crew } from '@/types/models.types';

export interface CreateCrewPayload {
  name: string;
  description?: string;
  crew_leader_id?: string;
  territory_id?: string;
  shift_id?: string;
  member_ids?: string[];
  skill_ids?: string[];
  equipment_ids?: string[];
  is_active?: boolean;
}

export interface UpdateCrewPayload extends Partial<CreateCrewPayload> {}

export interface CrewFilters extends PageOptions {
  territory_id?: string;
  shift_id?: string;
  is_active?: boolean;
}

export const crewsApi = {
  getAll(params?: CrewFilters) {
    return api.get<ApiResponse<Crew[]>>('/crews', { params });
  },

  getById(id: string) {
    return api.get<ApiResponse<Crew>>(`/crews/${id}`);
  },

  getForDispatch() {
    return api.get<ApiResponse<Crew[]>>('/crews/dispatch');
  },

  create(payload: CreateCrewPayload) {
    return api.post<ApiResponse<Crew>>('/crews', payload);
  },

  update(id: string, payload: UpdateCrewPayload) {
    return api.put<ApiResponse<Crew>>(`/crews/${id}`, payload);
  },

  delete(id: string) {
    return api.delete<ApiResponse<null>>(`/crews/${id}`);
  },

  addMembers(id: string, technicianIds: string[]) {
    return api.post<ApiResponse<Crew>>(`/crews/${id}/members`, { technician_ids: technicianIds });
  },

  removeMember(id: string, technicianId: string) {
    return api.delete<ApiResponse<Crew>>(`/crews/${id}/members/${technicianId}`);
  },
};
