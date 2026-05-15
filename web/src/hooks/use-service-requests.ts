import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceRequestsApi, CreateServiceRequestPayload, UpdateServiceRequestPayload } from '@/api/service-requests.api';
import type { PageOptions } from '@/types/api.types';
import { useNotificationStore } from '@/store/notification.store';

export function useServiceRequests(params?: PageOptions & { status?: string }, enabled = true) {
  return useQuery({
    queryKey: ['service-requests', params],
    queryFn: async () => {
      const response = await serviceRequestsApi.getAll(params);
      return {
        data: response.data.data!,
        meta: response.data.meta!,
      };
    },
    enabled,
  });
}

export function useMyPendingApprovals(params?: PageOptions, enabled = true) {
  return useQuery({
    queryKey: ['service-requests', 'my-approvals', params],
    queryFn: async () => {
      const response = await serviceRequestsApi.getMyPendingApprovals(params);
      return {
        data: response.data.data!,
        meta: response.data.meta!,
      };
    },
    enabled,
  });
}

export function useAllServiceRequests() {
  return useQuery({
    queryKey: ['service-requests', 'all'],
    queryFn: async () => {
      const response = await serviceRequestsApi.getAllNonPaginated();
      return response.data.data!;
    },
  });
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: ['service-requests', id],
    queryFn: async () => {
      const response = await serviceRequestsApi.getById(id);
      return response.data.data!;
    },
    enabled: !!id,
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (payload: CreateServiceRequestPayload) => serviceRequestsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      addNotification({ type: 'success', message: 'Service request created successfully' });
    },
    onError: () => {
      addNotification({ type: 'error', message: 'Failed to create service request' });
    },
  });
}

export function useUpdateServiceRequest() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateServiceRequestPayload & { id: string }) =>
      serviceRequestsApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      addNotification({ type: 'success', message: 'Service request updated successfully' });
    },
    onError: () => {
      addNotification({ type: 'error', message: 'Failed to update service request' });
    },
  });
}

export function useUpdateServiceRequestStatus() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      serviceRequestsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      addNotification({ type: 'success', message: 'Service request status updated successfully' });
    },
    onError: () => {
      addNotification({ type: 'error', message: 'Failed to update service request status' });
    },
  });
}

export function useDeleteServiceRequest() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: (id: string) => serviceRequestsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      addNotification({ type: 'success', message: 'Service request deleted successfully' });
    },
    onError: () => {
      addNotification({ type: 'error', message: 'Failed to delete service request' });
    },
  });
}

export function useServiceRequestApprovals(serviceRequestId: string) {
  return useQuery({
    queryKey: ['service-requests', serviceRequestId, 'approvals'],
    queryFn: async () => {
      const response = await serviceRequestsApi.getApprovals(serviceRequestId);
      return response.data.data!;
    },
    enabled: !!serviceRequestId,
  });
}

export function useProcessServiceRequestApproval() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.add);

  return useMutation({
    mutationFn: ({ serviceRequestId, approvalId, action, comments }: {
      serviceRequestId: string;
      approvalId: string;
      action: string;
      comments?: string;
    }) => serviceRequestsApi.processApproval(serviceRequestId, approvalId, { action, comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      addNotification({ type: 'success', message: 'Approval processed successfully' });
    },
    onError: () => {
      addNotification({ type: 'error', message: 'Failed to process approval' });
    },
  });
}
