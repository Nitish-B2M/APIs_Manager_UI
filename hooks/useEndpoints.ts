import { useState, useEffect, useCallback } from 'react';
import { Endpoint, RequestParam, ApiResponse, HttpMethod, RequestHeader, RequestBody } from '@/types';

interface UseEndpointsProps {
    initialEndpoints: Endpoint[];
    onDirtyChange?: (isDirty: boolean) => void;
}

interface UseEndpointsReturn {
    endpoints: Endpoint[];
    setEndpoints: React.Dispatch<React.SetStateAction<Endpoint[]>>;
    selectedIdx: number;
    setSelectedIdx: (idx: number) => void;
    currentReq: Endpoint | null;
    setCurrentReq: React.Dispatch<React.SetStateAction<Endpoint | null>>;
    isDirty: boolean;
    setIsDirty: (dirty: boolean) => void;
    addEndpoint: (endpoint?: Partial<Endpoint>) => void;
    deleteEndpoint: (idx: number) => void;
    duplicateEndpoint: (idx: number) => void;
    updateCurrentRequest: (updates: Partial<Endpoint>) => void;
    reorderEndpoints: (fromIdx: number, toIdx: number) => void;
}

const createDefaultEndpoint = (): Endpoint => ({
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: [],
    body: { mode: 'raw', raw: '' },
    params: [],
    description: '',
    lastResponse: null,
    history: [],
});

export function useEndpoints({ initialEndpoints, onDirtyChange }: UseEndpointsProps): UseEndpointsReturn {
    const [endpoints, setEndpoints] = useState<Endpoint[]>(initialEndpoints);
    const [selectedIdx, setSelectedIdx] = useState<number>(0);
    const [currentReq, setCurrentReq] = useState<Endpoint | null>(null);
    const [isDirty, setIsDirtyState] = useState(false);

    const setIsDirty = useCallback((dirty: boolean) => {
        setIsDirtyState(dirty);
        onDirtyChange?.(dirty);
    }, [onDirtyChange]);

    // Sync currentReq when selection changes
    useEffect(() => {
        if (endpoints[selectedIdx]) {
            setCurrentReq({ ...endpoints[selectedIdx] });
        }
    }, [selectedIdx, endpoints]);

    // Initialize with first endpoint
    useEffect(() => {
        if (initialEndpoints.length > 0 && !currentReq) {
            setEndpoints(initialEndpoints);
            setCurrentReq(initialEndpoints[0]);
        }
    }, [initialEndpoints]);

    const addEndpoint = useCallback((partial?: Partial<Endpoint>) => {
        const newEndpoint = { ...createDefaultEndpoint(), ...partial };
        setEndpoints(prev => {
            const newEps = [...prev, newEndpoint];
            setSelectedIdx(newEps.length - 1);
            return newEps;
        });
        setIsDirty(true);
    }, [setIsDirty]);

    const deleteEndpoint = useCallback((idx: number) => {
        setEndpoints(prev => {
            const newEps = prev.filter((_, i) => i !== idx);
            
            // Adjust selection
            if (selectedIdx === idx) {
                if (newEps.length > 0) {
                    setSelectedIdx(Math.max(0, idx - 1));
                } else {
                    setCurrentReq(null);
                }
            } else if (idx < selectedIdx) {
                setSelectedIdx(selectedIdx - 1);
            }
            
            return newEps;
        });
        setIsDirty(true);
    }, [selectedIdx, setIsDirty]);

    const duplicateEndpoint = useCallback((idx: number) => {
        setEndpoints(prev => {
            const reqToDup = prev[idx];
            const newReq: Endpoint = {
                ...JSON.parse(JSON.stringify(reqToDup)),
                id: undefined, // Remove ID so server creates new one
                name: `${reqToDup.name} (Copy)`,
            };
            const newEps = [...prev];
            newEps.splice(idx + 1, 0, newReq);
            setSelectedIdx(idx + 1);
            return newEps;
        });
        setIsDirty(true);
    }, [setIsDirty]);

    const updateCurrentRequest = useCallback((updates: Partial<Endpoint>) => {
        setCurrentReq(prev => {
            if (!prev) return prev;
            const updated = { ...prev, ...updates };
            
            // Sync to endpoints list
            setEndpoints(eps => {
                const newEps = [...eps];
                newEps[selectedIdx] = updated;
                return newEps;
            });
            
            return updated;
        });
        setIsDirty(true);
    }, [selectedIdx, setIsDirty]);

    const reorderEndpoints = useCallback((fromIdx: number, toIdx: number) => {
        if (fromIdx === toIdx) return;
        
        setEndpoints(prev => {
            const newEps = [...prev];
            const [draggedItem] = newEps.splice(fromIdx, 1);
            newEps.splice(toIdx, 0, draggedItem);
            
            // Update selectedIdx if needed
            if (selectedIdx === fromIdx) {
                setSelectedIdx(toIdx);
            } else if (selectedIdx > fromIdx && selectedIdx <= toIdx) {
                setSelectedIdx(selectedIdx - 1);
            } else if (selectedIdx < fromIdx && selectedIdx >= toIdx) {
                setSelectedIdx(selectedIdx + 1);
            }
            
            return newEps;
        });
        setIsDirty(true);
    }, [selectedIdx, setIsDirty]);

    return {
        endpoints,
        setEndpoints,
        selectedIdx,
        setSelectedIdx,
        currentReq,
        setCurrentReq,
        isDirty,
        setIsDirty,
        addEndpoint,
        deleteEndpoint,
        duplicateEndpoint,
        updateCurrentRequest,
        reorderEndpoints,
    };
}
