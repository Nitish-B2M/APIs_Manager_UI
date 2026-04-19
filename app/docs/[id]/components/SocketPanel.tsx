'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Trash2, Zap, ZapOff, Clock, ArrowDown, Filter } from 'lucide-react';
import { WebsocketMessage, ConnectionStatus } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { getThemeClasses } from '../utils/theme';

interface SocketPanelProps {
    messages: WebsocketMessage[];
    status: ConnectionStatus;
    mode?: 'ws' | 'sse';
    autoReconnect?: boolean;
    onAutoReconnectChange?: (v: boolean) => void;
    onConnect: () => void;
    onDisconnect: () => void;
    onSendMessage: (data: string, dataType?: 'text' | 'binary') => void;
    onClearMessages: () => void;
}

const formatBytes = (n?: number) => {
    if (n === undefined) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

export const SocketPanel: React.FC<SocketPanelProps> = ({
    messages, status, mode = 'ws',
    autoReconnect, onAutoReconnectChange,
    onConnect, onDisconnect, onSendMessage, onClearMessages,
}) => {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const [input, setInput] = useState('');
    const [msgType, setMsgType] = useState<'text' | 'binary'>('text');
    const [autoScroll, setAutoScroll] = useState(true);
    const [eventFilter, setEventFilter] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // SSE event types present in messages — for the filter dropdown
    const eventTypes = useMemo(() => {
        const set = new Set<string>();
        messages.forEach(m => { if (m.eventType) set.add(m.eventType); });
        return Array.from(set).sort();
    }, [messages]);

    const filteredMessages = useMemo(() => {
        if (mode !== 'sse' || !eventFilter) return messages;
        return messages.filter(m => m.eventType === eventFilter);
    }, [messages, mode, eventFilter]);

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [filteredMessages, autoScroll]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSendMessage(input, msgType);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full bg-inherit">
            {/* Toolbar */}
            <div className={`flex items-center justify-between p-2 border-b ${themeClasses.borderCol} gap-2 flex-wrap`}>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        status === 'connected' ? 'bg-green-500/20 text-green-400' :
                        status === 'connecting' ? 'bg-amber-500/20 text-amber-400 animate-pulse' :
                        status === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            status === 'connected' ? 'bg-green-500' :
                            status === 'connecting' ? 'bg-amber-500' :
                            status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        {status}
                    </span>
                    <span className={`text-[10px] font-bold ${themeClasses.subTextColor}`}>
                        {filteredMessages.length}{eventFilter ? `/${messages.length}` : ''} {mode === 'sse' ? 'EVENTS' : 'MSGS'}
                    </span>

                    {/* SSE event filter */}
                    {mode === 'sse' && eventTypes.length > 0 && (
                        <div className="flex items-center gap-1">
                            <Filter size={11} className="text-gray-500" />
                            <select
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                                className="bg-transparent border border-white/10 rounded px-1 py-0.5 text-[10px] text-gray-300 outline-none"
                            >
                                <option value="">All events</option>
                                {eventTypes.map(et => <option key={et} value={et}>{et}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                    {/* Auto-scroll toggle */}
                    <button
                        onClick={() => setAutoScroll(v => !v)}
                        title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                        className={`p-1.5 rounded-md text-[10px] flex items-center gap-1 ${autoScroll ? 'text-[#249d9f] bg-[#249d9f]/10' : 'text-gray-500'}`}
                    >
                        <ArrowDown size={12} /> Auto
                    </button>

                    {/* Auto-reconnect toggle (WS only) */}
                    {mode === 'ws' && onAutoReconnectChange && (
                        <button
                            onClick={() => onAutoReconnectChange(!autoReconnect)}
                            title={autoReconnect ? 'Auto-reconnect ON' : 'Auto-reconnect OFF'}
                            className={`p-1.5 rounded-md text-[10px] flex items-center gap-1 ${autoReconnect ? 'text-[#249d9f] bg-[#249d9f]/10' : 'text-gray-500'}`}
                        >
                            ↻ Reconnect
                        </button>
                    )}

                    {status === 'connected' ? (
                        <button
                            onClick={onDisconnect}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md flex items-center gap-1.5 text-[10px] font-bold uppercase"
                        >
                            <ZapOff size={14} /> Disconnect
                        </button>
                    ) : (
                        <button
                            onClick={onConnect}
                            disabled={status === 'connecting'}
                            className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-md flex items-center gap-1.5 text-[10px] font-bold uppercase disabled:opacity-50"
                        >
                            <Zap size={14} /> Connect
                        </button>
                    )}
                    <button
                        onClick={onClearMessages}
                        disabled={messages.length === 0}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md disabled:opacity-50"
                        title="Clear"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono scrollbar-thin">
                {filteredMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 space-y-2">
                        <Zap size={32} />
                        <span className="text-[11px] font-bold uppercase tracking-widest">
                            {eventFilter ? 'No events of this type' : 'No messages yet'}
                        </span>
                    </div>
                )}
                {filteredMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.type === 'sent' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl border ${msg.type === 'sent'
                            ? (theme === 'dark' ? 'bg-indigo-900/20 border-[#249d9f]/30' : 'bg-indigo-50 border-indigo-200')
                            : (theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-100 border-gray-200')
                        }`}>
                            <div className="text-[12px] whitespace-pre-wrap break-all leading-relaxed">{msg.data}</div>
                            <div className={`mt-1.5 text-[9px] flex items-center gap-1.5 font-bold ${themeClasses.subTextColor} flex-wrap`}>
                                <Clock size={10} />
                                {new Date(msg.timestamp).toLocaleTimeString()}
                                <span>•</span>
                                <span>{msg.type === 'sent' ? 'SENT' : 'RECEIVED'}</span>
                                {msg.size !== undefined && <span>• {formatBytes(msg.size)}</span>}
                                {msg.dataType === 'binary' && <span className="text-[#BC8CFF]">• BINARY</span>}
                                {msg.eventType && <span className="text-[#249d9f]">• event: {msg.eventType}</span>}
                                {msg.eventId && <span>• id: {msg.eventId}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Composer (WS only) */}
            {status === 'connected' && mode === 'ws' && (
                <div className={`p-3 border-t ${themeClasses.borderCol} bg-inherit`}>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Type</span>
                        <div className="flex rounded-md overflow-hidden border border-white/10 text-[10px]">
                            {(['text', 'binary'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setMsgType(t)}
                                    className={`px-2 py-1 ${msgType === t ? 'bg-[#249d9f] text-white' : 'text-gray-400'}`}
                                >
                                    {t.toUpperCase()}
                                </button>
                            ))}
                        </div>
                        {msgType === 'binary' && (
                            <span className="text-[10px] text-gray-500 italic">Enter hex (e.g. `48 65 6c 6c 6f`)</span>
                        )}
                    </div>
                    <div className={`flex items-end gap-2 p-2 rounded-xl border ${themeClasses.borderCol} ${themeClasses.inputBg}`}>
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={msgType === 'binary' ? 'Hex bytes: 48 65 6c 6c 6f' : 'Type a message to send...'}
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
                            className="p-2 bg-[#1a7a7c] text-white rounded-lg hover:bg-[#249d9f] transition-all disabled:opacity-50 flex-shrink-0"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
