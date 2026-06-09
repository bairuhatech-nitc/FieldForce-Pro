import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { crewsApi, type CreateCrewPayload, type UpdateCrewPayload, type CrewFilters } from '@/api/crews.api';
import type { Crew } from '@/types/models.types';
import { useNotificationStore } from '@/store/notification.store';

export function useCrews(params?: CrewFilters) {
  return useQuery({
    queryKey: ['crews', params],
    queryFn: async () => {
      const response = await crewsApi.getAll(params);
      return {
        data: response.data.data!,
        meta: response.data.meta!,
      };
    },
  });
}

export function useCrew(id: string) {
  return useQuery({
    queryKey: ['crews', id],
    queryFn: async () => {
      const response = await crewsApi.getById(id);
      return response.data.data!;
    },
    enabled: !!id,
  });
}

export function useCrewsForDispatch() {
  return useQuery({
    queryKey: ['crews', 'dispatch'],
    queryFn: async () => {
      const response = await crewsApi.getForDispatch();
      return response.data.data!;
    },
  });
}

export function useCreateCrew() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: CreateCrewPayload) => crewsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      addNotification({ type: 'success', message: 'Crew created successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to create crew' });
    },
  });
}

export function useUpdateCrew() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateCrewPayload & { id: string }) =>
      crewsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      addNotification({ type: 'success', message: 'Crew updated successfully' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to update crew' });
    },
  });
}

export function useDeleteCrew() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (id: string) => crewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      addNotification({ type: 'success', message: 'Crew deleted successfully' });
    },
  });
}

export function useAddCrewMembers() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ crewId, technicianIds }: { crewId: string; technicianIds: string[] }) =>
      crewsApi.addMembers(crewId, technicianIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      addNotification({ type: 'success', message: 'Members added to crew' });
    },
  });
}

export function useRemoveCrewMember() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ crewId, technicianId }: { crewId: string; technicianId: string }) =>
      crewsApi.removeMember(crewId, technicianId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crews'] });
      addNotification({ type: 'success', message: 'Member removed from crew' });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      addNotification({ type: 'error', message: err?.response?.data?.message || 'Failed to remove member' });
    },
  });
}
