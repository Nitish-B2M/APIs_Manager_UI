'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebsocketMessage, ConnectionStatus } from '@/types';
import { toast } from 'react-hot-toast';

export const useSSE = (initialMessages: WebsocketMessage[] = []) => {
    const [messages, setMessages] = useState<WebsocketMessage[]>(initialMessages);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const sourceRef = useRef<EventSource | null>(null);

    useEffect(() => { setMessages(initialMessages); }, [initialMessages]);

    const byteSize = (s: string) => new Blob([s]).size;

    const pushMessage = (data: string, eventType: string | undefined, eventId: string | undefined) => {
        const message: WebsocketMessage = {
            id: Math.random().toString(36).substring(7),
            type: 'received',
            data, size: byteSize(data),
            eventType, eventId,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, message]);
    };

    const connect = useCallback((url: string) => {
        if (sourceRef.current) sourceRef.current.close();
        setStatus('connecting');
        try {
            const source = new EventSource(url);
            sourceRef.current = source;

            source.onopen = () => { setStatus('connected'); toast.success('SSE Stream Connected'); };

            source.onmessage = (event) => pushMessage(event.data, undefined, event.lastEventId || undefined);

            // Listen for named events generically via a catch-all wrapper
            const originalAddEventListener = source.addEventListener.bind(source);
            // Hook common named events; can be extended
            ['message', 'update', 'data', 'notification', 'error-event', 'ping', 'change', 'create', 'delete'].forEach(evtName => {
                originalAddEventListener(evtName, ((ev: MessageEvent) => {
                    if (evtName === 'message') return; // already handled
                    pushMessage(ev.data, evtName, ev.lastEventId || undefined);
                }) as EventListener);
            });

            source.onerror = () => {
                if (source.readyState === EventSource.CLOSED) {
                    setStatus('error');
                    toast.error('SSE Stream Error / Closed');
                    sourceRef.current = null;
                }
            };
        } catch {
            setStatus('error');
            toast.error('Invalid SSE URL');
        }
    }, []);

    const disconnect = useCallback(() => {
        if (sourceRef.current) {
            sourceRef.current.close();
            sourceRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    const clearMessages = useCallback(() => setMessages([]), []);

    useEffect(() => { return () => { if (sourceRef.current) sourceRef.current.close(); }; }, []);

    return { messages, status, connect, disconnect, clearMessages };
};
