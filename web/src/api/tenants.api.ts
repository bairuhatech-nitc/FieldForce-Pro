import api from './axios-instance';
import type { ApiResponse } from '@/types/api.types';
import type { Tenant } from '@/types/models.types';

export const tenantsApi = {
  getAll() {
    return api.get<ApiResponse<Tenant[]>>('/tenants');
  },

  getById(id: string) {
    return api.get<ApiResponse<Tenant>>(`/tenants/${id}`);
  },

  create(payload: Partial<Tenant>) {
    return api.post<ApiResponse<Tenant>>('/tenants', payload);
  },

  update(id: string, payload: Partial<Tenant>) {
    return api.put<ApiResponse<Tenant>>(`/tenants/${id}`, payload);
  },

  delete(id: string) {
    return api.delete<ApiResponse<null>>(`/tenants/${id}`);
  },
};
