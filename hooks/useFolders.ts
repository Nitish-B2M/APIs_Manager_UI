import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { Folder } from '@/types';
import { toast } from 'react-hot-toast';

interface UseFoldersProps {
    documentationId: string;
    enabled?: boolean;
}

interface UseFoldersReturn {
    folders: Folder[];
    isLoading: boolean;
    error: Error | null;
    createFolder: (data: { name: string; description?: string; parentId?: string | null }) => Promise<Folder | null>;
    updateFolder: (folderId: string, data: { name?: string; description?: string | null; parentId?: string | null; order?: number }) => Promise<Folder | null>;
    deleteFolder: (folderId: string, moveRequestsToParent?: boolean) => Promise<boolean>;
    moveRequestToFolder: (requestId: string, folderId: string | null) => Promise<boolean>;
    reorderFolders: (folders: { id: string; order: number; parentId?: string | null }[]) => Promise<boolean>;
    refetch: () => void;
}

export function useFolders({ documentationId, enabled = true }: UseFoldersProps): UseFoldersReturn {
    const queryClient = useQueryClient();

    // Fetch folders
    const { data: foldersRes, isLoading, error, refetch } = useQuery({
        queryKey: ['folders', documentationId],
        queryFn: () => api.folders.list(documentationId),
        enabled: enabled && !!documentationId,
        retry: 1
    });

    const folders: Folder[] = foldersRes?.data || [];

    // Create folder mutation
    const createMutation = useMutation({
        mutationFn: (data: { name: string; description?: string; parentId?: string | null }) =>
            api.folders.create(documentationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders', documentationId] });
        }
    });

    // Update folder mutation
    const updateMutation = useMutation({
        mutationFn: ({ folderId, data }: { folderId: string; data: { name?: string; description?: string | null; parentId?: string | null; order?: number } }) =>
            api.folders.update(folderId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders', documentationId] });
        }
    });

    // Delete folder mutation
    const deleteMutation = useMutation({
        mutationFn: ({ folderId, moveRequestsToParent }: { folderId: string; moveRequestsToParent?: boolean }) =>
            api.folders.delete(folderId, moveRequestsToParent),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders', documentationId] });
            queryClient.invalidateQueries({ queryKey: ['doc', documentationId] });
        }
    });

    // Move request to folder mutation
    const moveRequestMutation = useMutation({
        mutationFn: ({ requestId, folderId }: { requestId: string; folderId: string | null }) =>
            api.folders.moveRequest(requestId, folderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doc', documentationId] });
        }
    });

    // Reorder folders mutation
    const reorderMutation = useMutation({
        mutationFn: (folderUpdates: { id: string; order: number; parentId?: string | null }[]) =>
            api.folders.reorder(documentationId, folderUpdates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders', documentationId] });
        }
    });

    const createFolder = useCallback(async (data: { name: string; description?: string; parentId?: string | null }): Promise<Folder | null> => {
        try {
            const res = await createMutation.mutateAsync(data);
            toast.success(res.message || 'Folder created');
            return res.data;
        } catch (e: any) {
            toast.error(e.message || 'Failed to create folder');
            return null;
        }
    }, [createMutation]);

    const updateFolder = useCallback(async (folderId: string, data: { name?: string; description?: string | null; parentId?: string | null; order?: number }): Promise<Folder | null> => {
        try {
            const res = await updateMutation.mutateAsync({ folderId, data });
            toast.success(res.message || 'Folder updated');
            return res.data;
        } catch (e: any) {
            toast.error(e.message || 'Failed to update folder');
            return null;
        }
    }, [updateMutation]);

    const deleteFolder = useCallback(async (folderId: string, moveRequestsToParent?: boolean): Promise<boolean> => {
        try {
            const res = await deleteMutation.mutateAsync({ folderId, moveRequestsToParent });
            toast.success(res.message || 'Folder deleted');
            return true;
        } catch (e: any) {
            toast.error(e.message || 'Failed to delete folder');
            return false;
        }
    }, [deleteMutation]);

    const moveRequestToFolder = useCallback(async (requestId: string, folderId: string | null): Promise<boolean> => {
        try {
            const res = await moveRequestMutation.mutateAsync({ requestId, folderId });
            toast.success(res.message || 'Request moved');
            return true;
        } catch (e: any) {
            toast.error(e.message || 'Failed to move request');
            return false;
        }
    }, [moveRequestMutation]);

    const reorderFolders = useCallback(async (folderUpdates: { id: string; order: number; parentId?: string | null }[]): Promise<boolean> => {
        try {
            await reorderMutation.mutateAsync(folderUpdates);
            return true;
        } catch (e: any) {
            toast.error(e.message || 'Failed to reorder folders');
            return false;
        }
    }, [reorderMutation]);

    return {
        folders,
        isLoading,
        error: error as Error | null,
        createFolder,
        updateFolder,
        deleteFolder,
        moveRequestToFolder,
        reorderFolders,
        refetch
    };
}
