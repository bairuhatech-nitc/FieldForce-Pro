import api from './axios-instance';
import type { ApiResponse, PageOptions } from '@/types/api.types';
import type { Equipment, EquipmentCategory } from '@/types/models.types';

export interface CreateEquipmentPayload {
  name: string;
  description?: string;
  equipment_category_id?: string;
  serial_number?: string;
  barcode?: string;
  manufacturer?: string;
  model_number?: string;
  purchase_date?: string;
  notes?: string;
  custom_fields?: Record<string, unknown>;
}

export interface UpdateEquipmentPayload extends Partial<CreateEquipmentPayload> {}

export interface AssignEquipmentPayload {
  technician_id?: string;
  crew_id?: string;
  expected_return_date?: string;
  notes?: string;
}

export interface ReturnEquipmentPayload {
  notes?: string;
}

export interface MaintenanceEquipmentPayload {
  notes?: string;
  expected_return_date?: string;
}

export interface EquipmentFilters extends PageOptions {
  status?: string;
  equipment_category_id?: string;
  assigned_to?: string;
}

export const equipmentApi = {
  // Categories
  getCategories() {
    return api.get<ApiResponse<EquipmentCategory[]>>('/equipment/categories');
  },

  createCategory(payload: { name: string; description?: string }) {
    return api.post<ApiResponse<EquipmentCategory>>('/equipment/categories', payload);
  },

  deleteCategory(id: string) {
    return api.delete<ApiResponse<null>>(`/equipment/categories/${id}`);
  },

  // Equipment CRUD
  getAll(params?: EquipmentFilters) {
    return api.get<ApiResponse<Equipment[]>>('/equipment', { params });
  },

  getById(id: string) {
    return api.get<ApiResponse<Equipment>>(`/equipment/${id}`);
  },

  create(payload: CreateEquipmentPayload) {
    return api.post<ApiResponse<Equipment>>('/equipment', payload);
  },

  update(id: string, payload: UpdateEquipmentPayload) {
    return api.put<ApiResponse<Equipment>>(`/equipment/${id}`, payload);
  },

  delete(id: string) {
    return api.delete<ApiResponse<null>>(`/equipment/${id}`);
  },

  // Lifecycle actions
  assign(id: string, payload: AssignEquipmentPayload) {
    return api.post<ApiResponse<Equipment>>(`/equipment/${id}/assign`, payload);
  },

  return(id: string, payload?: ReturnEquipmentPayload) {
    return api.post<ApiResponse<Equipment>>(`/equipment/${id}/return`, payload ?? {});
  },

  sendToMaintenance(id: string, payload?: MaintenanceEquipmentPayload) {
    return api.post<ApiResponse<Equipment>>(`/equipment/${id}/maintenance`, payload ?? {});
  },

  completeMaintenance(id: string, notes?: string) {
    return api.patch<ApiResponse<Equipment>>(`/equipment/${id}/maintenance/complete`, { notes });
  },
};
