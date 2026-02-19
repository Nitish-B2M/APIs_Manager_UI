import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Endpoint } from '../types';
import { useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface UseRequestOrderingOptions {
    documentationId: string;
    requests: Endpoint[];
    setRequests: (requests: Endpoint[]) => void;
    selectedIdx: number;
    setSelectedIdx: (idx: number) => void;
    onOrderChange?: () => void;
}

export function useRequestOrdering({
    documentationId,
    requests,
    setRequests,
    selectedIdx,
    setSelectedIdx,
    onOrderChange,
}: UseRequestOrderingOptions) {
    const queryClient = useQueryClient();
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const reorderMutation = useMutation({
        mutationFn: (reqs: { id: string; order: number }[]) => 
            api.documentation.reorderRequests(documentationId, reqs),
        onError: (error: any) => {
            toast.error(error.message || 'Failed to save order');
            // Refetch to restore original order
            queryClient.invalidateQueries({ queryKey: ['doc', documentationId] });
        },
    });

    const persistOrder = useCallback((newRequests: Endpoint[]) => {
        // Debounce the API call to avoid spamming during rapid reordering
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            const reorderData = newRequests
                .filter(r => r.id) // Only persist saved requests
                .map((r, idx) => ({ id: r.id!, order: idx }));
            
            if (reorderData.length > 0) {
                reorderMutation.mutate(reorderData);
            }
        }, 500);
    }, [reorderMutation]);

    const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
        if (oldIndex === newIndex) return;

        // Optimistically update local state
        const newRequests = [...requests];
        const [movedItem] = newRequests.splice(oldIndex, 1);
        newRequests.splice(newIndex, 0, movedItem);
        setRequests(newRequests);

        // Update selected index to follow the moved item
        if (selectedIdx === oldIndex) {
            setSelectedIdx(newIndex);
        } else if (oldIndex < selectedIdx && newIndex >= selectedIdx) {
            setSelectedIdx(selectedIdx - 1);
        } else if (oldIndex > selectedIdx && newIndex <= selectedIdx) {
            setSelectedIdx(selectedIdx + 1);
        }

        // Persist to backend
        persistOrder(newRequests);
        onOrderChange?.();
    }, [requests, setRequests, selectedIdx, setSelectedIdx, persistOrder, onOrderChange]);

    return {
        handleReorder,
        isPersisting: reorderMutation.isPending,
    };
}
