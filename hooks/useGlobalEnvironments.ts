import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';
import { Environment } from '../types';

interface UseGlobalEnvironmentsOptions {
    enabled?: boolean;
}

export function useGlobalEnvironments({ enabled = true }: UseGlobalEnvironmentsOptions = {}) {
    const queryClient = useQueryClient();
    const queryKey = ['environments', 'global'];

    // Fetch global environments
    const { data, isLoading, error } = useQuery<{ data: Environment[] }>({
        queryKey,
        queryFn: () => api.environments.listGlobal(),
        enabled: enabled,
    });

    const environments = data?.data || [];
    const activeEnvironment = environments.find(e => e.isActive) || null;

    // Create global environment
    const createMutation = useMutation({
        mutationFn: (data: { name: string; variables?: Record<string, string>; isActive?: boolean; secrets?: string[] }) =>
            api.environments.createGlobal(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Global environment created');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to create global environment');
        },
    });

    // Update global environment (uses common update route)
    const updateMutation = useMutation({
        mutationFn: ({ environmentId, data }: { environmentId: string; data: { name?: string; variables?: Record<string, string>; isActive?: boolean; secrets?: string[] } }) =>
            api.environments.update(environmentId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Global environment updated');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to update global environment');
        },
    });

    // Delete global environment (uses common delete route)
    const deleteMutation = useMutation({
        mutationFn: (environmentId: string) => api.environments.delete(environmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Global environment deleted');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to delete global environment');
        },
    });

    // Set active global environment
    const setActiveMutation = useMutation({
        mutationFn: (environmentId: string | null) => api.environments.setActiveGlobal(environmentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to set active global environment');
        },
    });

    return {
        environments,
        activeEnvironment,
        isLoading,
        error,
        createEnvironment: createMutation.mutateAsync,
        updateEnvironment: (environmentId: string, data: { name?: string; variables?: Record<string, string>; isActive?: boolean; secrets?: string[] }) =>
            updateMutation.mutateAsync({ environmentId, data }),
        deleteEnvironment: deleteMutation.mutateAsync,
        setActiveEnvironment: setActiveMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
