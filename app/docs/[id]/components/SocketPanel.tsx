'use client';

import React, { useState } from 'react';
import { Send, Trash2, Zap, ZapOff, Clock } from 'lucide-react';
import { WebsocketMessage, ConnectionStatus } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { getThemeClasses } from '../utils/theme';

interface SocketPanelProps {
    messages: WebsocketMessage[];
    status: ConnectionStatus;
    mode?: 'ws' | 'sse';
    onConnect: () => void;
    onDisconnect: () => void;
    onSendMessage: (data: string) => void;
    onClearMessages: () => void;
}

export const SocketPanel: React.FC<SocketPanelProps> = ({
    messages,
    status,
    mode = 'ws',
    onConnect,
    onDisconnect,
    onSendMessage,
    onClearMessages
}) => {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-inherit">
            {/* Toolbar */}
            <div className={`flex items-center justify-between p-2 border-b ${themeClasses.borderCol}`}>
                <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${status === 'connected' ? 'bg-green-500/20 text-green-400' :
                        status === 'connecting' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                            status === 'error' ? 'bg-red-500/20 text-red-400' :
                                'bg-gray-500/20 text-gray-400'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500' :
                            status === 'connecting' ? 'bg-amber-500' :
                                status === 'error' ? 'bg-red-500' :
                                    'bg-gray-500'
                            }`} />
                        {status}
                    </span>
                    <span className={`text-[10px] font-bold ${themeClasses.subTextColor}`}>
                        {messages.length} {mode === 'sse' ? 'EVENTS' : 'MESSAGES'}
                    </span>
                </div>
                <div className="flex gap-1">
                    {status === 'connected' ? (
                        <button
                            onClick={onDisconnect}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase"
                        >
                            <ZapOff size={14} /> Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={onConnect}
                            disabled={status === 'connecting'}
                            className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-md transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase disabled:opacity-50"
                        >
                            <Zap size={14} /> Connect
                        </button>
                    )}
                    <button
                        onClick={onClearMessages}
                        disabled={messages.length === 0}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all disabled:opacity-50"
                        title="Clear History"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono scrollbar-thin">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 space-y-2">
                        <Zap size={32} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">No messages yet</span>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl border ${msg.type === 'sent'
                            ? (theme === 'dark' ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200')
                            : (theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200')
                            }`}>
                            <div className="text-[12px] whitespace-pre-wrap break-all leading-relaxed">
                                {msg.data}
                            </div>
                            <div className={`mt-1.5 text-[9px] flex items-center gap-1 font-bold ${themeClasses.subTextColor}`}>
                                <Clock size={10} />
                                {new Date(msg.timestamp).toLocaleTimeString()}
                                <span className="mx-1">•</span>
                                {msg.type === 'sent' ? 'SENT' : 'RECEIVED'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Composer (only for WebSocket, SSE is read-only) */}
            {status === 'connected' && mode === 'ws' && (
                <div className={`p-3 border-t ${themeClasses.borderCol} bg-inherit`}>
                    <div className={`flex items-end gap-2 p-2 rounded-xl border ${themeClasses.borderCol} ${themeClasses.inputBg}`}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message to send..."
                            className="flex-1 bg-transparent border-none outline-none text-[12px] font-mono resize-none min-h-[40px] max-h-[120px]"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg active:scale-95 flex-shrink-0"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
