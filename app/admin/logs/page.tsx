'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Shield, AlertCircle, Info, Trash2, Pause, Play, Download } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { API_URL } from '../../../utils/api';
import { useTheme } from '../../../context/ThemeContext';

interface LogEntry {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    data?: any;
}

export default function AdminLogsPage() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filter, setFilter] = useState<'all' | 'error' | 'info'>('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const sourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!user?.isAdmin) return;

        const token = localStorage.getItem('token');
        const source = new EventSource(`${API_URL}/api/admin/logs/stream?token=${token}`);
        sourceRef.current = source;

        source.onmessage = (event) => {
            if (isPaused) return;
            try {
                const log = JSON.parse(event.data);
                setLogs(prev => [...prev.slice(-199), log]); // Keep last 200 logs
            } catch (e) {
                // Ignore heartbeats
            }
        };

        source.onerror = () => {
            console.error('SSE Error');
            source.close();
        };

        return () => {
            source.close();
        };
    }, [user, isPaused]);

    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        return log.level === filter;
    });

    const clearLogs = () => setLogs([]);

    const downloadLogs = () => {
        const content = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `server-logs-${new Date().toISOString()}.txt`;
        a.click();
    };

    if (!user?.isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Shield size={48} className="text-red-500 opacity-50" />
                <h1 className="text-xl font-bold">Access Denied</h1>
                <p className="text-gray-500">Administrator privileges required.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] gap-4 p-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <Terminal size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">System Log Stream</h1>
                        <p className="text-xs text-gray-500 font-medium">Real-time server events and error reports</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-gray-500/10 rounded-lg p-1 border border-white/5 mr-4">
                        {(['all', 'info', 'error'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setIsPaused(!isPaused)}
                        className={`p-2 rounded-lg border transition-all ${isPaused ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-white/5 border-white/10 text-gray-500 hover:text-indigo-500'}`}
                        title={isPaused ? "Resume Stream" : "Pause Stream"}
                    >
                        {isPaused ? <Play size={18} /> : <Pause size={18} />}
                    </button>
                    <button
                        onClick={downloadLogs}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-blue-500 transition-all"
                        title="Download Logs"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={clearLogs}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:text-red-500 transition-all"
                        title="Clear View"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className={`flex-1 overflow-y-auto rounded-2xl border font-mono text-[12px] p-4 custom-scrollbar ${
                    theme === 'dark' ? 'bg-[#0b0c14] border-white/5 text-gray-300' : 'bg-gray-900 border-gray-800 text-gray-300'
                }`}
            >
                {filteredLogs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
                        <Terminal size={40} className="mb-2" />
                        <p>Waiting for server logs...</p>
                    </div>
                )}
                {filteredLogs.map((log, i) => (
                    <div key={i} className="mb-1.5 group flex gap-3">
                        <span className="opacity-30 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`font-bold uppercase w-12 flex-shrink-0 ${
                            log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-blue-400'
                        }`}>
                            {log.level}
                        </span>
                        <div className="flex-1">
                            <span className={log.level === 'error' ? 'text-red-200' : ''}>{log.message}</span>
                            {log.data && (
                                <details className="mt-1 opacity-60 hover:opacity-100 transition-opacity">
                                    <summary className="cursor-pointer text-[10px] hover:text-indigo-400">View Data</summary>
                                    <pre className="mt-1 p-2 rounded bg-black/40 border border-white/5 overflow-x-auto text-[10px]">
                                        {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
