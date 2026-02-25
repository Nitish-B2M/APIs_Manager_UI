'use client';

import React, { useState, useCallback, useMemo, JSX } from 'react';
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
    aiEnabled?: boolean;
    onAiGenerateRequest?: (prompt: string) => Promise<void>;
}

// Highlighted text component for variable syntax highlighting
// CRITICAL: Must match input's exact font rendering for cursor alignment
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
    aiEnabled,
    onAiGenerateRequest,
}: RequestUrlBarProps) {
    const { theme } = useTheme();
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showAiBuilder, setShowAiBuilder] = useState(false);
    const themeClasses = getThemeClasses(theme);

    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);

    const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart || 0;
        setCursorPos(pos);
        onUrlChange(val);

        // Environment Variable Suggestions (when typing {{)
        const beforeCursor = val.slice(0, pos);
        const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
        if (lastDoubleBrace !== -1 && !beforeCursor.slice(lastDoubleBrace).includes('}}')) {
            const query = beforeCursor.slice(lastDoubleBrace + 2).toLowerCase();

            // Dynamic variable suggestions when query starts with $
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

            // Env var suggestions
            const matches = Object.keys(variables).filter(k => k.toLowerCase().includes(query));
            setSuggestions(matches.map(m => ({ type: 'env', value: m, displayValue: `{{${m}}}` })));
            setSuggestionIndex(0);
            return;
        }

        // URL History Suggestions
        if (val.length > 0 && val.length < 50) {
            const lowerVal = val.toLowerCase();
            const historyMatches = urlHistory
                .filter(u => u.toLowerCase().includes(lowerVal) && u !== val)
                .slice(0, 3);
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
            const newVal = beforeCursor.slice(0, lastDoubleBrace) + `{{${suggestion.value}}}` + afterCursor;
            onUrlChange(newVal);
        } else {
            onUrlChange(suggestion.value);
        }
        setSuggestions([]);
    }, [currentReq?.url, cursorPos, onUrlChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSuggestionIndex((i) => (i + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSuggestionSelect(suggestions[suggestionIndex]);
            } else if (e.key === 'Escape') {
                setSuggestions([]);
            }
        }
    }, [suggestions, suggestionIndex, handleSuggestionSelect]);

    const handleAiGenerate = async () => {
        if (!aiPrompt || !onAiGenerateRequest || isAiLoading) return;
        setIsAiLoading(true);
        try {
            await onAiGenerateRequest(aiPrompt);
            setAiPrompt('');
            setShowAiBuilder(false);
        } finally {
            setIsAiLoading(false);
        }
    };

    if (!currentReq) return null;

    return (
        <div className="flex flex-col shadow-md z-10">
            {aiEnabled && (
                <div className={`${theme === 'dark' ? 'bg-[#1a1a2e]' : 'bg-indigo-50/50'} border-b ${themeClasses.borderCol} px-3 py-1.5 flex items-center justify-between`}>
                    {!showAiBuilder ? (
                        <button
                            onClick={() => setShowAiBuilder(true)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-all uppercase tracking-wider"
                        >
                            <Sparkles size={11} /> AI Request Builder
                        </button>
                    ) : (
                        <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                            <Sparkles size={11} className="text-indigo-400 flex-shrink-0" />
                            <input
                                type="text"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAiGenerate(); if (e.key === 'Escape') setShowAiBuilder(false); }}
                                placeholder="e.g., 'Get all users from /users' or 'Post a new item to /items with name and price'"
                                className={`flex-1 bg-transparent border-none outline-none text-[11px] ${themeClasses.textColor} placeholder-indigo-400/40`}
                                autoFocus
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleAiGenerate}
                                    disabled={!aiPrompt || isAiLoading}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all ${!aiPrompt || isAiLoading ? 'opacity-40' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/20'}`}
                                >
                                    {isAiLoading ? <Loader2 size={10} className="animate-spin" /> : 'GENERATE'}
                                </button>
                                <button
                                    onClick={() => setShowAiBuilder(false)}
                                    className={`p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-200'} text-gray-500`}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
            <div className={`${themeClasses.secondaryBg} p-3 flex items-center gap-3`}>
                <div className="flex-1 flex gap-2 min-w-0">
                    {/* Protocol Selector */}
                    <select
                        value={currentReq.protocol || 'REST'}
                        disabled={!canEdit}
                        onChange={(e) => onProtocolChange(e.target.value as ProtocolType)}
                        className={`flex-shrink-0 px-2 py-1.5 ${theme === 'dark' ? 'bg-indigo-900/20 text-indigo-400 border-indigo-900/50' : 'bg-indigo-50 text-indigo-600 border-indigo-200'} border rounded-lg font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 text-[10px] uppercase tracking-wider`}
                    >
                        <option value="REST">REST</option>
                        <option value="WS">WebSocket</option>
                        <option value="SSE">SSE</option>
                        <option value="GRAPHQL">GraphQL</option>
                    </select>

                    {/* Method Selector (only for REST & GraphQL) */}
                    {(currentReq.protocol === 'REST' || currentReq.protocol === 'GRAPHQL' || !currentReq.protocol) && (
                        <select
                            value={currentReq.method}
                            disabled={!canEdit}
                            onChange={(e) => onMethodChange(e.target.value)}
                            className={`flex-shrink-0 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} rounded-lg font-bold ${themeClasses.textColor} focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 text-[11px]`}
                        >
                            <option>GET</option>
                            <option>POST</option>
                            <option>PUT</option>
                            <option>DELETE</option>
                            <option>PATCH</option>
                        </select>
                    )}

                    {/* URL Input */}
                    <div className="flex-1 relative group min-w-0">
                        {/* Highlighted overlay - must exactly match input positioning */}
                        <div
                            className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg"
                            style={{
                                padding: '6px 32px 6px 12px',
                                height: '34px',
                                lineHeight: '22px',
                                boxSizing: 'border-box',
                            }}
                        >
                            <HighlightedText
                                text={currentReq.url}
                                variables={variables}
                                className="text-[11px] font-mono"
                            />
                        </div>
                        <input
                            type="text"
                            value={currentReq?.url || ''}
                            readOnly={!canEdit}
                            onChange={handleUrlChange}
                            onKeyDown={handleKeyDown}
                            className={`w-full border ${themeClasses.borderCol} rounded-lg focus:ring-none outline-none font-mono !text-[11px] ${themeClasses.inputBg} ${!canEdit ? 'cursor-default' : ''}`}
                            style={{
                                color: 'transparent',
                                caretColor: theme === 'dark' ? '#e5e7eb' : '#1f2937',
                                padding: '6px 32px 6px 12px',
                                height: '34px',
                                boxSizing: 'border-box',
                            }}
                            placeholder="Enter Request URL"
                        />
                        <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-2">
                            <button
                                onClick={onCopyUrl}
                                className={`p-1 ${themeClasses.subTextColor} hover:text-indigo-400 hover:bg-gray-500/10 rounded-md transition-all`}
                                title="Copy full URL"
                            >
                                <Copy size={12} />
                            </button>
                        </div>

                        {/* Suggestions Dropdown */}
                        {suggestions.length > 0 && (
                            <div className={`absolute left-0 top-full mt-1 w-80 ${themeClasses.secondaryBg} border ${themeClasses.borderCol} rounded-lg shadow-2xl z-50 py-1 max-h-60 overflow-y-auto`}>
                                {suggestions.map((s, idx) => (
                                    <div
                                        key={s.value}
                                        onClick={() => handleSuggestionSelect(s)}
                                        className={`px-3 py-2 text-[11px] cursor-pointer flex items-center gap-2 ${idx === suggestionIndex ? 'bg-indigo-600 text-white' : `${themeClasses.subTextColor} hover:bg-opacity-10 hover:bg-gray-400`}`}
                                    >
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${idx === suggestionIndex
                                            ? 'bg-indigo-500'
                                            : s.type === 'dynamic'
                                                ? 'bg-purple-600/20 text-purple-400'
                                                : s.type === 'env'
                                                    ? 'bg-blue-600/20 text-blue-400'
                                                    : 'bg-green-600/20 text-green-400'
                                            }`}>
                                            {s.type === 'dynamic' ? 'DYN' : s.type === 'env' ? 'ENV' : 'URL'}
                                        </span>
                                        <span className="font-mono flex-1 truncate">{s.displayValue}</span>
                                        {s.description && (
                                            <span className={`text-[9px] truncate max-w-[110px] ${idx === suggestionIndex ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                {s.description}
                                            </span>
                                        )}
                                        {s.type === 'env' && (
                                            <span className={`text-[9px] truncate max-w-[100px] ${idx === suggestionIndex ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                {variables[s.value]}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={onSend}
                        disabled={reqLoading}
                        className={`flex-shrink-0 px-5 py-1.5 ${currentReq.protocol === 'WS' || currentReq.protocol === 'SSE' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-[11px] disabled:opacity-50 uppercase`}
                    >
                        {reqLoading ? <span className="animate-spin text-xs">⌛</span> : (
                            currentReq.protocol === 'WS' || currentReq.protocol === 'SSE' ? <Zap size={14} /> : <Send size={14} />
                        )}
                        {currentReq.protocol === 'WS' || currentReq.protocol === 'SSE' ? 'Connect' : 'Send'}
                    </button>

                    {/* Save Button */}
                    {canEdit && (
                        <button
                            onClick={onSave}
                            disabled={!isDirty}
                            className={`flex-shrink-0 px-4 py-1.5 ${isDirty ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20' : `${theme === 'dark' ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200'} cursor-not-allowed opacity-50`} rounded-lg font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 text-[11px] border`}
                            title={isDirty ? "Save this request" : "No changes to save"}
                        >
                            <Save size={14} />
                            SAVE
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-1 border-l pl-3 ${themeClasses.borderCol} flex-shrink-0`}>
                    <button
                        onClick={onDownloadMarkdown}
                        className={`p-1.5 ${themeClasses.subTextColor} hover:text-green-500 hover:bg-green-500/10 rounded-md transition-all`}
                        title="Download Request Markdown"
                    >
                        <Download size={16} />
                    </button>
                    <button
                        onClick={onCopyMarkdown}
                        className={`p-1.5 ${themeClasses.subTextColor} hover:text-indigo-500 hover:bg-indigo-500/10 rounded-md transition-all`}
                        title="Copy Request Markdown"
                    >
                        <Copy size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
