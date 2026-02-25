'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebsocketMessage, ConnectionStatus } from '@/types';
import { toast } from 'react-hot-toast';

export const useWebSocket = (initialMessages: WebsocketMessage[] = []) => {
    const [messages, setMessages] = useState<WebsocketMessage[]>(initialMessages);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    const connect = useCallback((url: string) => {
        if (socketRef.current) {
            socketRef.current.close();
        }

        setStatus('connecting');
        try {
            const socket = new WebSocket(url);
            socketRef.current = socket;

            socket.onopen = () => {
                setStatus('connected');
                toast.success('WebSocket Connected');
            };

            socket.onmessage = (event) => {
                const message: WebsocketMessage = {
                    id: Math.random().toString(36).substring(7),
                    type: 'received',
                    data: event.data,
                    timestamp: new Date().toISOString()
                };
                setMessages((prev) => [...prev, message]);
            };

            socket.onclose = () => {
                setStatus('disconnected');
            };

            socket.onerror = () => {
                setStatus('error');
                toast.error('WebSocket Connection Error');
            };
        } catch (error) {
            setStatus('error');
            toast.error('Invalid WebSocket URL');
        }
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    const sendMessage = useCallback((data: string) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(data);
            const message: WebsocketMessage = {
                id: Math.random().toString(36).substring(7),
                type: 'sent',
                data,
                timestamp: new Date().toISOString()
            };
            setMessages((prev) => [...prev, message]);
        } else {
            toast.error('WebSocket is not connected');
        }
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, []);

    return {
        messages,
        status,
        connect,
        disconnect,
        sendMessage,
        clearMessages
    };
};
