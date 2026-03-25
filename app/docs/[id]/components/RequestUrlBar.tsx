'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Send, Save, Copy, Download, Zap, Globe, Share2, Terminal, Sparkles, Loader2, X } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { ProtocolType } from '@/types';

interface Suggestion {
    type: 'env' | 'url' | 'dynamic';
    value: string;
    displayValue: string;
    description?: string;
}

const DYNAMIC_VARS: { value: string; description: string }[] = [
    { value: '$timestamp', description: 'Unix timestamp (seconds)' },
    { value: '$isoTimestamp', description: 'ISO 8601 timestamp' },
    { value: '$randomUUID', description: 'Random UUID v4' },
    { value: '$randomInt', description: 'Random integer 0–999' },
    { value: '$randomBool', description: 'Random true/false' },
    { value: '$randomEmail', description: 'Random email address' },
    { value: '$randomFirstName', description: 'Random first name' },
    { value: '$randomLastName', description: 'Random last name' },
];

interface RequestUrlBarProps {
    currentReq: any;
    canEdit: boolean;
    isDirty: boolean;
    reqLoading: boolean;
    variables: Record<string, string>;
    urlHistory: string[];
    onMethodChange: (method: string) => void;
    onProtocolChange: (protocol: ProtocolType) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    onSave: () => void;
    onCopyUrl: () => void;
    onCopyMarkdown: () => void;
    onDownloadMarkdown: () => void;
    onFocus?: (field: string) => void;
}

function HighlightedText({
    text,
    variables,
    className = ""
}: {
    text: string;
    variables: Record<string, string>;
    className?: string;
}) {
    const { theme } = useTheme();

    if (!text) return null;

    const parts = text.split(/(\{\{[^{}]+\}\}|:[a-zA-Z0-9_]+)/g);

    return (
        <div
            className={`pointer-events-none whitespace-pre ${className}`}
            style={{
                letterSpacing: 'normal',
                wordSpacing: 'normal',
                textRendering: 'auto',
                lineHeight: '22px',
            }}
        >
            {parts.map((part, i) => {
                const isBraceVar = part.startsWith('{{') && part.endsWith('}}');
                const isColonVar = part.startsWith(':') && part.length > 1;

                if (isBraceVar || isColonVar) {
                    const key = isBraceVar ? part.slice(2, -2) : part.slice(1);
                    const isDynamic = key.startsWith('$');
                    const isSet = isDynamic || variables[key] !== undefined;

                    return (
                        <span
                            key={i}
                            className={`rounded-sm ${isDynamic
                                ? theme === 'dark' ? 'bg-purple-600/30 text-purple-400' : 'bg-purple-100 text-purple-600'
                                : isSet
                                    ? theme === 'dark' ? 'bg-blue-600/30 text-blue-400' : 'bg-blue-100 text-blue-600'
                                    : theme === 'dark' ? 'bg-red-600/30 text-red-400' : 'bg-red-100 text-red-600'
                                }`}
                        >
                            {part}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </div>
    );
}

export function RequestUrlBar({
    currentReq,
    canEdit,
    isDirty,
    reqLoading,
    variables,
    urlHistory,
    onMethodChange,
    onProtocolChange,
    onUrlChange,
    onSend,
    onSave,
    onCopyUrl,
    onCopyMarkdown,
    onDownloadMarkdown,
    onFocus,
}: RequestUrlBarProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderCol = isDark ? 'border-white/5' : 'border-gray-200';
    const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
    const secondaryBg = isDark ? 'bg-[#0a0a0b]/60 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-md';

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);

    const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart || 0;
        setCursorPos(pos);
        onUrlChange(val);

        const beforeCursor = val.slice(0, pos);
        const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
        if (lastDoubleBrace !== -1 && !beforeCursor.slice(lastDoubleBrace).includes('}}')) {
            const query = beforeCursor.slice(lastDoubleBrace + 2).toLowerCase();
            if (query.startsWith('$') || query === '') {
                const dynMatches = DYNAMIC_VARS.filter(d =>
                    d.value.toLowerCase().includes(query) || query === ''
                );
                if (dynMatches.length > 0) {
                    setSuggestions(dynMatches.map(d => ({ type: 'dynamic', value: d.value, displayValue: `{{${d.value}}}`, description: d.description })));
                    setSuggestionIndex(0);
                    if (query.startsWith('$')) return;
                }
            }
            const matches = Object.keys(variables).filter(k => k.toLowerCase().includes(query));
            setSuggestions(matches.map(m => ({ type: 'env', value: m, displayValue: `{{${m}}}` })));
            setSuggestionIndex(0);
            return;
        }

        if (val.length > 0 && val.length < 50) {
            const lowerVal = val.toLowerCase();
            const historyMatches = urlHistory.filter(u => u.toLowerCase().includes(lowerVal) && u !== val).slice(0, 3);
            const bases = ['https://', 'http://', 'http://localhost:3000', 'http://localhost:4001', 'http://localhost:8080'];
            const baseMatches = bases.filter(b => b.startsWith(lowerVal) && b !== val);
            const allMatches = [...new Set([...historyMatches, ...baseMatches])].slice(0, 5);
            if (allMatches.length > 0) {
                setSuggestions(allMatches.map(m => ({ type: 'url', value: m, displayValue: m })));
                setSuggestionIndex(0);
                return;
            }
        }
        setSuggestions([]);
    }, [variables, urlHistory, onUrlChange]);

    const handleSuggestionSelect = useCallback((suggestion: Suggestion) => {
        const val = currentReq?.url || '';
        const beforeCursor = val.slice(0, cursorPos);
        const afterCursor = val.slice(cursorPos);
        if (suggestion.type === 'env') {
            const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
            onUrlChange(beforeCursor.slice(0, lastDoubleBrace) + `{{${suggestion.value}}}` + afterCursor);
        } else onUrlChange(suggestion.value);
        setSuggestions([]);
    }, [currentReq?.url, cursorPos, onUrlChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionIndex((i) => (i + 1) % suggestions.length); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length); }
            else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); handleSuggestionSelect(suggestions[suggestionIndex]); }
            else if (e.key === 'Escape') setSuggestions([]);
        }
    }, [suggestions, suggestionIndex, handleSuggestionSelect]);

    if (!currentReq) return null;

    return (
        <div className="flex flex-col shadow-md z-10">
            <div className={`${secondaryBg} p-4 flex items-center gap-3`}>
                <div className="flex-1 flex gap-2.5 min-w-0">
                    <select
                        value={currentReq.protocol || 'REST'}
                        disabled={!canEdit}
                        onChange={(e) => onProtocolChange(e.target.value as ProtocolType)}
                        className={`flex-shrink-0 px-3 py-2 ${isDark ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20' : 'bg-indigo-50 text-indigo-600 border-indigo-200'} border rounded-xl appearance-none font-bold focus:ring-2 focus:ring-indigo-500/50 outline-none text-[10px] uppercase tracking-widest cursor-pointer transition-all hover:bg-indigo-600/20`}
                    >
                        <option value="REST">REST</option>
                        <option value="WS">WS</option>
                        <option value="SSE">SSE</option>
                        <option value="GRAPHQL">GQL</option>
                    </select>

                    {(currentReq.protocol === 'REST' || currentReq.protocol === 'GRAPHQL' || !currentReq.protocol) && (
                        <select
                            value={currentReq.method}
                            disabled={!canEdit}
                            onChange={(e) => onMethodChange(e.target.value)}
                            className={`flex-shrink-0 px-3 py-2 ${inputBg} border ${borderCol} rounded-xl appearance-none font-bold ${textColor} focus:ring-2 focus:ring-indigo-500/50 outline-none text-[11px] cursor-pointer transition-all hover:bg-white/10`}
                        >
                            <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
                        </select>
                    )}

                    <div className="flex-1 relative group min-w-0">
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl" style={{ padding: '8px 40px 8px 14px', height: '38px', lineHeight: '22px', boxSizing: 'border-box' }}>
                            <HighlightedText text={currentReq.url} variables={variables} className="text-[12px] font-mono tracking-tight" />
                        </div>
                        <input
                            type="text" value={currentReq?.url || ''} readOnly={!canEdit} onChange={handleUrlChange} onKeyDown={handleKeyDown}
                            onFocus={() => onFocus?.('url')}
                            className={`w-full border ${borderCol} rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none font-mono !text-[12px] ${inputBg} ${!canEdit ? 'cursor-default' : ''} transition-all`}
                            style={{ color: 'transparent', caretColor: isDark ? '#fff' : '#000', padding: '8px 40px 8px 14px', height: '38px', boxSizing: 'border-box' }}
                            placeholder="Enter request URL..."
                        />
                        <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-3">
                            <button onClick={onCopyUrl} className={`p-1.5 ${subTextColor} hover:text-white hover:bg-white/10 rounded-lg transition-all`} title="Copy full URL"><Copy size={14} /></button>
                        </div>
                        {suggestions.length > 0 && (
                            <div className={`absolute left-0 top-full mt-2 w-full max-w-sm ${secondaryBg} border ${borderCol} rounded-xl shadow-2xl z-50 py-1.5 max-h-64 overflow-y-auto`}>
                                {suggestions.map((s, idx) => (
                                    <div key={s.value} onClick={() => handleSuggestionSelect(s)} className={`px-3 py-2.5 text-[11px] cursor-pointer flex items-center gap-3 transition-colors ${idx === suggestionIndex ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-white/5`}`}>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${idx === suggestionIndex ? 'bg-indigo-500 text-white' : s.type === 'dynamic' ? 'bg-purple-600/20 text-purple-400' : s.type === 'env' ? 'bg-blue-600/20 text-blue-400' : 'bg-green-600/20 text-green-400'}`}>
                                            {s.type === 'dynamic' ? 'DYN' : s.type === 'env' ? 'ENV' : 'URL'}
                                        </span>
                                        <span className="font-mono flex-1 truncate">{s.displayValue}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onSend} disabled={reqLoading}
                        className={`flex-shrink-0 px-6 py-2 ${currentReq.protocol === 'WS' || currentReq.protocol === 'SSE' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'} text-white rounded-xl font-bold flex items-center gap-2.5 transition-all shadow-xl active:scale-[0.98] text-[11px] disabled:opacity-50 uppercase tracking-wider`}
                    >
                        {reqLoading ? <Loader2 size={16} className="animate-spin" /> : (currentReq.protocol === 'WS' || currentReq.protocol === 'SSE' ? <Zap size={16} /> : <Send size={16} />)}
                        {currentReq.protocol === 'WS' || currentReq.protocol === 'SSE' ? 'Connect' : 'Send'}
                    </button>

                    {canEdit && (
                        <button
                            onClick={onSave} disabled={!isDirty}
                            className={`flex-shrink-0 px-5 py-2 ${isDirty ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30 backdrop-blur-md' : `${isDark ? 'bg-white/5 text-gray-500 border-white/5' : 'bg-gray-100 text-gray-400 border-transparent'} cursor-not-allowed opacity-50`} rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-[0.98] text-[11px] border`}
                            title={isDirty ? "Save changes" : "No changes to save"}
                        >
                            <Save size={16} /> SAVE
                        </button>
                    )}
                </div>

                <div className={`flex items-center gap-2 border-l pl-4 ${borderCol} flex-shrink-0`}>
                    <button onClick={onDownloadMarkdown} className={`p-2 ${subTextColor} hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all`} title="Download Markdown"><Download size={18} /></button>
                    <button onClick={onCopyMarkdown} className={`p-2 ${subTextColor} hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all`} title="Copy Markdown"><Copy size={18} /></button>
                </div>
            </div>
        </div>
    );
}
