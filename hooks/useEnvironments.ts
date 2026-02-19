import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';
import { Environment } from '../types';

interface UseEnvironmentsOptions {
    documentationId: string;
    enabled?: boolean;
}

export function useEnvironments({ documentationId, enabled = true }: UseEnvironmentsOptions) {
    const queryClient = useQueryClient();
    const queryKey = ['environments', documentationId];

    // Fetch environments
    const { data, isLoading, error } = useQuery<{ data: Environment[] }>({
        queryKey,
        queryFn: () => api.environments.list(documentationId),
        enabled: enabled && !!documentationId,
    });

    const environments = data?.data || [];
    const activeEnvironment = environments.find(e => e.isActive) || null;

    // Create environment
    const createMutation = useMutation({
        mutationFn: (data: { name: string; variables?: Record<string, string>; isActive?: boolean }) =>
            api.environments.create(documentationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Environment created');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create environment');
        },
    });

    // Update environment
    const updateMutation = useMutation({
        mutationFn: ({ environmentId, data }: { environmentId: string; data: { name?: string; variables?: Record<string, string>; isActive?: boolean } }) =>
            api.environments.update(environmentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Environment updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update environment');
        },
    });

    // Delete environment
    const deleteMutation = useMutation({
        mutationFn: (environmentId: string) => api.environments.delete(environmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Environment deleted');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete environment');
        },
    });

    // Set active environment
    const setActiveMutation = useMutation({
        mutationFn: (environmentId: string | null) => api.environments.setActive(documentationId, environmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to set active environment');
        },
    });

    return {
        environments,
        activeEnvironment,
        isLoading,
        error,
        createEnvironment: createMutation.mutateAsync,
        updateEnvironment: (environmentId: string, data: { name?: string; variables?: Record<string, string>; isActive?: boolean }) =>
            updateMutation.mutateAsync({ environmentId, data }),
        deleteEnvironment: deleteMutation.mutateAsync,
        setActiveEnvironment: setActiveMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
