import api from './axios-instance';
import type { ApiResponse, PageOptions } from '@/types/api.types';
import type { User } from '@/types/models.types';

export const usersApi = {
  getAll(params?: PageOptions) {
    return api.get<ApiResponse<User[]>>('/users', { params });
  },

  getAgents() {
    return api.get<ApiResponse<User[]>>('/users/agents');
  },

  getById(id: string) {
    return api.get<ApiResponse<User>>(`/users/${id}`);
  },

  create(payload: Partial<User> & { password?: string }) {
    return api.post<ApiResponse<User>>('/users', payload);
  },

  update(id: string, payload: Partial<User>) {
    return api.put<ApiResponse<User>>(`/users/${id}`, payload);
  },

  delete(id: string) {
    return api.delete<ApiResponse<null>>(`/users/${id}`);
  },

  activate(id: string) {
    return api.patch<ApiResponse<User>>(`/users/${id}/activate`);
  },

  deactivate(id: string) {
    return api.patch<ApiResponse<User>>(`/users/${id}/deactivate`);
  },

  updateAvatar(id: string, avatarUrl: string) {
    return api.patch<ApiResponse<User>>(`/users/${id}/avatar`, { avatar_url: avatarUrl });
  },
};
