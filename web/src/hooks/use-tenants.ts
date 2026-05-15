import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantsApi } from '@/api/tenants.api';
import type { Tenant } from '@/types/models.types';
import { useNotificationStore } from '@/store/notification.store';

export function useTenants() {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const response = await tenantsApi.getAll();
      return response.data.data!;
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ['tenants', id],
    queryFn: async () => {
      const response = await tenantsApi.getById(id);
      return response.data.data!;
    },
    enabled: !!id,
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<Tenant> & { id: string }) =>
      tenantsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      addNotification({ type: 'success', message: 'Tenant updated successfully' });
    },
  });
}
