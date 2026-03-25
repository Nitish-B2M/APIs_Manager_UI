'use client';

import { useState, useEffect, useRef } from 'react';
import { API_URL } from '@/utils/api';
import { toast } from 'react-hot-toast';

export interface PresenceUser {
    id: string;
    name: string;
    avatarUrl?: string;
    email: string;
    metadata?: any;
}

export const usePresence = (documentationId: string | undefined, isShared: boolean = true, enabled: boolean = true) => {
    const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
    const sourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!documentationId || !isShared || !enabled) {
            setActiveUsers([]);
            setStatus('disconnected');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) return;

        setStatus('connecting');
        const url = `${API_URL}/api/collaboration/presence/${documentationId}?token=${token}`;
        
        try {
            const source = new EventSource(url);
            sourceRef.current = source;

            source.onopen = () => {
                setStatus('connected');
            };

            source.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (Array.isArray(data)) {
                        setActiveUsers(data);
                    }
                } catch (err) {
                    console.error('[Presence] Failed to parse data:', err);
                }
            };

            source.onerror = () => {
                if (source.readyState === EventSource.CLOSED) {
                    setStatus('error');
                    sourceRef.current = null;
                }
            };

            return () => {
                source.close();
                sourceRef.current = null;
                setStatus('disconnected');
            };
        } catch (error) {
            console.error('[Presence] SSE Error:', error);
            setStatus('error');
        }
    }, [documentationId]);

    return { activeUsers, status };
};
