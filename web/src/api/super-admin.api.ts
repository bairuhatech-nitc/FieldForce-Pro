import api from './axios-instance';
import type { ApiResponse } from '@/types/api.types';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  subscription_plan: string;
  max_users: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count: number;
  service_request_count: number;
  admin_email: string | null;
  admin_user_id: string | null;
}

export interface TenantOverview extends TenantSummary {
  domain: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  admin_name: string | null;
  work_order_count: number;
  invoice_count: number;
}

export interface PlatformHealth {
  tenants: { total: number; active: number; suspended: number };
  users: { total: number };
  service_requests: { total: number };
  timestamp: string;
}

export const superAdminApi = {
  listTenants() {
    return api.get<ApiResponse<TenantSummary[]>>('/admin/tenants');
  },

  getTenant(id: string) {
    return api.get<ApiResponse<TenantSummary>>(`/admin/tenants/${id}`);
  },

  getTenantOverview(id: string) {
    return api.get<ApiResponse<TenantOverview>>(`/admin/tenants/${id}/overview`);
  },

  suspendTenant(id: string) {
    return api.patch<ApiResponse<TenantSummary>>(`/admin/tenants/${id}/suspend`);
  },

  activateTenant(id: string) {
    return api.patch<ApiResponse<TenantSummary>>(`/admin/tenants/${id}/activate`);
  },

  getPlatformHealth() {
    return api.get<ApiResponse<PlatformHealth>>('/admin/platform-health');
  },

  updateProfile(payload: { first_name?: string; last_name?: string }) {
    return api.patch<ApiResponse<Record<string, unknown>>>('/admin/profile', payload);
  },

  changeEmail(payload: { new_email: string; current_password: string }) {
    return api.patch<ApiResponse<{ email: string }>>('/admin/profile/email', payload);
  },
};
