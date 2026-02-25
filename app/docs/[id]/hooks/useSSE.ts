'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebsocketMessage, ConnectionStatus } from '@/types';
import { toast } from 'react-hot-toast';

export const useSSE = (initialMessages: WebsocketMessage[] = []) => {
    const [messages, setMessages] = useState<WebsocketMessage[]>(initialMessages);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const sourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    const connect = useCallback((url: string) => {
        if (sourceRef.current) {
            sourceRef.current.close();
        }

        setStatus('connecting');
        try {
            const source = new EventSource(url);
            sourceRef.current = source;

            source.onopen = () => {
                setStatus('connected');
                toast.success('SSE Stream Connected');
            };

            source.onmessage = (event) => {
                const message: WebsocketMessage = {
                    id: Math.random().toString(36).substring(7),
                    type: 'received',
                    data: event.data,
                    timestamp: new Date().toISOString()
                };
                setMessages((prev) => [...prev, message]);
            };

            source.onerror = () => {
                // EventSource auto-reconnects on error; we only mark error if it's closed
                if (source.readyState === EventSource.CLOSED) {
                    setStatus('error');
                    toast.error('SSE Stream Error / Closed');
                    sourceRef.current = null;
                }
            };
        } catch (error) {
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
        toast.success('SSE Stream Disconnected');
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    useEffect(() => {
        return () => {
            if (sourceRef.current) {
                sourceRef.current.close();
            }
        };
    }, []);

    return {
        messages,
        status,
        connect,
        disconnect,
        clearMessages
    };
};
