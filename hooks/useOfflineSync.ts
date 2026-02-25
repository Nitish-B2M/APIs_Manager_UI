'use client';

import { useState, useEffect, useCallback } from 'react';
import { enqueueSync, getSyncQueue, clearSyncQueueItem } from '@/utils/offlineCache';
import { Endpoint } from '@/types';

export function useOfflineSync(documentationId: string, apiToken?: string) {
    const [isOnline, setIsOnline] = useState(true);
    const [queueLength, setQueueLength] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Initial online/offline check
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);

            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    // Also check queue length when we go online or load the hook
    const checkQueue = useCallback(async () => {
        const q = await getSyncQueue();
        setQueueLength(q.length);
    }, []);

    useEffect(() => {
        checkQueue();
    }, [checkQueue]);

    // Process sync queue when online
    const flushQueue = useCallback(async () => {
        if (!isOnline || isSyncing) return;

        const queue = await getSyncQueue();
        if (queue.length === 0) return;

        setIsSyncing(true);
        console.log(`Flushing ${queue.length} pending offline mutations`);

        for (const item of queue) {
            try {
                if (!item.id) continue;

                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                if (apiToken) {
                    headers['Authorization'] = `Bearer ${apiToken}`;
                }

                if (item.type === 'saveRequest') {
                    const req: Endpoint = item.data;
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/documentation/${documentationId}/requests/${req.id}`, {
                        method: 'PUT',
                        headers,
                        body: JSON.stringify(req),
                    });
                }
                // Handle create/delete similarly if we want full offline mutations

                await clearSyncQueueItem(item.id);
            } catch (err) {
                console.error(`Failed to sync item ${item.id}`, err);
                // Stop syncing on first error to preserve order
                break;
            }
        }

        setIsSyncing(false);
        checkQueue();
    }, [isOnline, isSyncing, documentationId, apiToken, checkQueue]);

    useEffect(() => {
        if (isOnline) {
            flushQueue();
        }
    }, [isOnline, flushQueue]);

    const queueMutation = async (type: 'saveRequest' | 'createRequest' | 'deleteRequest', data: any) => {
        if (isOnline) {
            return false; // Indicates it was not queued, caller should perform standard API call
        }

        await enqueueSync(type, data);
        checkQueue();
        return true; // Indicates it was queued for later
    };

    return { isOnline, queueLength, isSyncing, queueMutation };
}
