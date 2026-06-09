import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  equipmentApi,
  type CreateEquipmentPayload,
  type UpdateEquipmentPayload,
  type AssignEquipmentPayload,
  type ReturnEquipmentPayload,
  type MaintenanceEquipmentPayload,
  type EquipmentFilters,
} from '@/api/equipment.api';
import { useNotificationStore } from '@/store/notification.store';

export function useEquipmentList(params?: EquipmentFilters) {
  return useQuery({
    queryKey: ['equipment', params],
    queryFn: async () => {
      const response = await equipmentApi.getAll(params);
      return { data: response.data.data!, meta: response.data.meta! };
    },
  });
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: ['equipment', id],
    queryFn: async () => {
      const response = await equipmentApi.getById(id);
      return response.data.data!;
    },
    enabled: !!id,
  });
}

export function useEquipmentCategories() {
  return useQuery({
    queryKey: ['equipment-categories'],
    queryFn: async () => {
      const response = await equipmentApi.getCategories();
      return response.data.data!;
    },
  });
}

export function useCreateEquipmentCategory() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      equipmentApi.createCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-categories'] });
      addNotification({ type: 'success', message: 'Category created' });
    },
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: CreateEquipmentPayload) => equipmentApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      addNotification({ type: 'success', message: 'Equipment added to registry' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to create equipment' });
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateEquipmentPayload & { id: string }) =>
      equipmentApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      addNotification({ type: 'success', message: 'Equipment updated' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to update equipment' });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (id: string) => equipmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      addNotification({ type: 'success', message: 'Equipment retired' });
    },
  });
}

export function useAssignEquipment() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: AssignEquipmentPayload & { id: string }) =>
      equipmentApi.assign(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      addNotification({ type: 'success', message: 'Equipment assigned successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to assign equipment' });
    },
  });
}

export function useReturnEquipment() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: ReturnEquipmentPayload & { id: string }) =>
      equipmentApi.return(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      addNotification({ type: 'success', message: 'Equipment returned and marked available' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to return equipment' });
    },
  });
}

export function useSendEquipmentToMaintenance() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: MaintenanceEquipmentPayload & { id: string }) =>
      equipmentApi.sendToMaintenance(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      addNotification({ type: 'success', message: 'Equipment sent for maintenance' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed' });
    },
  });
}

export function useCompleteEquipmentMaintenance() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      equipmentApi.completeMaintenance(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      addNotification({ type: 'success', message: 'Maintenance completed' });
    },
  });
}
