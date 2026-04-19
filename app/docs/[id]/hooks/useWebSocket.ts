'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { WebsocketMessage, ConnectionStatus } from '@/types';
import { toast } from 'react-hot-toast';

export const useWebSocket = (initialMessages: WebsocketMessage[] = []) => {
    const [messages, setMessages] = useState<WebsocketMessage[]>(initialMessages);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [autoReconnect, setAutoReconnect] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    const lastUrlRef = useRef<string | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const manualDisconnectRef = useRef(false);

    useEffect(() => { setMessages(initialMessages); }, [initialMessages]);

    const byteSize = (s: string) => new Blob([s]).size;

    const connect = useCallback((url: string) => {
        if (socketRef.current) socketRef.current.close();
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        manualDisconnectRef.current = false;
        lastUrlRef.current = url;

        setStatus('connecting');
        try {
            const socket = new WebSocket(url);
            socketRef.current = socket;
            socket.binaryType = 'arraybuffer';

            socket.onopen = () => { setStatus('connected'); toast.success('WebSocket Connected'); };

            socket.onmessage = (event) => {
                let data: string;
                let dataType: 'text' | 'binary' = 'text';
                let size = 0;
                if (typeof event.data === 'string') {
                    data = event.data;
                    size = byteSize(data);
                } else if (event.data instanceof ArrayBuffer) {
                    const bytes = new Uint8Array(event.data);
                    data = `[Binary ${bytes.length} bytes] ` + Array.from(bytes.slice(0, 64)).map(b => b.toString(16).padStart(2, '0')).join(' ') + (bytes.length > 64 ? ' ...' : '');
                    size = bytes.length;
                    dataType = 'binary';
                } else {
                    data = String(event.data);
                    size = byteSize(data);
                }
                const message: WebsocketMessage = {
                    id: Math.random().toString(36).substring(7),
                    type: 'received',
                    data, size, dataType,
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, message]);
            };

            socket.onclose = () => {
                setStatus('disconnected');
                if (autoReconnect && !manualDisconnectRef.current && lastUrlRef.current) {
                    reconnectTimerRef.current = setTimeout(() => {
                        toast('Reconnecting...', { icon: '🔄' });
                        connect(lastUrlRef.current!);
                    }, 2000);
                }
            };

            socket.onerror = () => { setStatus('error'); toast.error('WebSocket Connection Error'); };
        } catch {
            setStatus('error');
            toast.error('Invalid WebSocket URL');
        }
    }, [autoReconnect]);

    const disconnect = useCallback(() => {
        manualDisconnectRef.current = true;
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    const sendMessage = useCallback((data: string, dataType: 'text' | 'binary' = 'text') => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            if (dataType === 'binary') {
                // Interpret hex string as bytes; fall back to text if parse fails
                try {
                    const hex = data.replace(/\s+/g, '');
                    const bytes = new Uint8Array(hex.length / 2);
                    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
                    socketRef.current.send(bytes.buffer);
                } catch {
                    toast.error('Invalid hex for binary message');
                    return;
                }
            } else {
                socketRef.current.send(data);
            }
            const message: WebsocketMessage = {
                id: Math.random().toString(36).substring(7),
                type: 'sent',
                data, dataType, size: byteSize(data),
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, message]);
        } else {
            toast.error('WebSocket is not connected');
        }
    }, []);

    const clearMessages = useCallback(() => setMessages([]), []);

    useEffect(() => {
        return () => {
            manualDisconnectRef.current = true;
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (socketRef.current) socketRef.current.close();
        };
    }, []);

    return {
        messages, status,
        autoReconnect, setAutoReconnect,
        connect, disconnect, sendMessage, clearMessages,
    };
};
