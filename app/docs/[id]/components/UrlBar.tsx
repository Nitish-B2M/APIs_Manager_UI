'use client';

import React, { memo, useState, useCallback } from 'react';
import { Send, Save, Copy, FileText } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Endpoint, HttpMethod } from '@/types';

interface UrlBarProps {
    currentReq: Endpoint;
    variables: Record<string, string>;
    canEdit: boolean;
    isDirty: boolean;
    isLoading: boolean;
    onMethodChange: (method: HttpMethod) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    onSave: () => void;
    onCopyMarkdown: () => void;
    onPreviewMarkdown: () => void;
    onCopyUrl: () => void;
}

interface HighlightedTextProps {
    text: string;
    variables: Record<string, string>;
    className?: string;
}

function HighlightedText({ text, variables, className = '' }: HighlightedTextProps) {
    const { theme } = useTheme();

    if (!text) return null;

    // Regex to find {{var}} or :var
    const parts = text.split(/(\{\{[^{}]+\}\}|:[a-zA-Z0-9_]+)/g);

    return (
        <div className={`pointer-events-none whitespace-pre break-all h-full ${className}`}>
            {parts.map((part, i) => {
                const isBraceVar = part.startsWith('{{') && part.endsWith('}}');
                const isColonVar = part.startsWith(':') && part.length > 1;

                if (isBraceVar || isColonVar) {
                    const key = isBraceVar ? part.slice(2, -2) : part.slice(1);
                    const isSet = variables[key] !== undefined;

                    return (
                        <span
                            key={i}
                            className={`px-1 rounded ${isSet
                                ? theme === 'dark' ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                                : theme === 'dark' ? 'bg-red-600/20 text-red-400' : 'bg-red-100 text-red-600'
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

function UrlBarComponent({
    currentReq,
    variables,
    canEdit,
    isDirty,
    isLoading,
    onMethodChange,
    onUrlChange,
    onSend,
    onSave,
    onCopyMarkdown,
    onPreviewMarkdown,
    onCopyUrl,
}: UrlBarProps) {
    const { theme } = useTheme();
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(0);

    const secondaryBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const inputBg = theme === 'dark' ? 'bg-gray-950' : 'bg-white';

    const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart || 0;
        setCursorPos(pos);
        onUrlChange(val);

        // Environment Variable Suggestions
        const beforeCursor = val.slice(0, pos);
        const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
        if (lastDoubleBrace !== -1 && !beforeCursor.slice(lastDoubleBrace).includes('}}')) {
            const query = beforeCursor.slice(lastDoubleBrace + 2).toLowerCase();
            const matches = Object.keys(variables).filter(k => k.toLowerCase().includes(query));
            setSuggestions(matches);
            setSuggestionIndex(0);
            return;
        }

        // URL Protocol/Base Suggestions
        if (val.length > 0 && val.length < 15) {
            const bases = ['https://', 'http://', 'localhost:3000', 'localhost:4001', 'localhost:8080', 'api.example.com'];
            const matches = bases.filter(b => b.startsWith(val.toLowerCase()) && b !== val);
            if (matches.length > 0) {
                setSuggestions(matches);
                setSuggestionIndex(0);
                return;
            }
        }
        setSuggestions([]);
    }, [variables, onUrlChange]);

    const handleSuggestionSelect = useCallback((varName: string) => {
        const val = currentReq.url;
        const beforeCursor = val.slice(0, cursorPos);
        const afterCursor = val.slice(cursorPos);
        const lastDoubleBrace = beforeCursor.lastIndexOf('{{');

        const newVal = beforeCursor.slice(0, lastDoubleBrace) + `{{${varName}}}` + afterCursor;
        onUrlChange(newVal);
        setSuggestions([]);
    }, [currentReq.url, cursorPos, onUrlChange]);

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

    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    return (
        <div className={`${secondaryBg} border-b ${borderCol} p-3 flex items-center gap-3 shadow-md z-10`}>
            <div className="flex-1 flex gap-2 min-w-0">
                <select
                    value={currentReq.method}
                    disabled={!canEdit}
                    onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
                    className={`flex-shrink-0 px-2 py-1.5 ${inputBg} border ${borderCol} rounded-lg font-bold ${textColor} focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 text-[11px]`}
                >
                    {methods.map(m => (
                        <option key={m}>{m}</option>
                    ))}
                </select>

                <div className="flex-1 relative group min-w-0">
                    <input
                        type="text"
                        value={currentReq.url}
                        readOnly={!canEdit}
                        onChange={handleUrlChange}
                        onKeyDown={handleKeyDown}
                        className={`w-full px-3 py-1.5 border ${borderCol} rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-[11px] ${inputBg} text-transparent ${!canEdit ? 'cursor-default' : ''}`}
                        style={{ caretColor: theme === 'dark' ? '#e5e7eb' : '#1f2937' }}
                        placeholder="Enter Request URL"
                    />
                    <div className="absolute inset-y-0 right-0 z-20 flex items-center pr-2">
                        <button
                            onClick={onCopyUrl}
                            className={`p-1 ${subTextColor} hover:text-indigo-400 hover:bg-gray-500/10 rounded-md transition-all`}
                            title="Copy full URL"
                        >
                            <Copy size={12} />
                        </button>
                    </div>
                    <div className="absolute inset-0 px-3 py-1.5 flex items-center pointer-events-none overflow-hidden">
                        <HighlightedText
                            text={currentReq.url}
                            variables={variables}
                            className="text-[11px] font-mono"
                        />
                    </div>

                    {/* Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                        <div className={`absolute left-0 top-full mt-1 w-64 ${secondaryBg} border ${borderCol} rounded-lg shadow-2xl z-50 py-1 max-h-60 overflow-y-auto`}>
                            {suggestions.map((s, idx) => (
                                <div
                                    key={s}
                                    onClick={() => handleSuggestionSelect(s)}
                                    className={`px-3 py-1.5 text-[11px] cursor-pointer flex items-center justify-between ${idx === suggestionIndex ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-opacity-10 hover:bg-gray-400`}`}
                                >
                                    <span className="font-mono">{`{{${s}}}`}</span>
                                    <span className="text-[9px] text-gray-500 truncate max-w-[100px]">{variables[s]}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={onSend}
                    disabled={isLoading}
                    className="flex-shrink-0 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-[11px] disabled:opacity-50"
                    title="Send Request (Ctrl+Enter)"
                >
                    {isLoading ? <span className="animate-spin text-xs">⌛</span> : <Send size={14} />}
                    SEND
                </button>

                {canEdit && (
                    <button
                        onClick={onSave}
                        disabled={!isDirty}
                        className={`flex-shrink-0 px-4 py-1.5 ${isDirty ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-900/20' : `${theme === 'dark' ? 'bg-gray-800 text-gray-500 border-gray-700' : 'bg-gray-100 text-gray-400 border-gray-200'} cursor-not-allowed opacity-50`} rounded-lg font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 text-[11px] border`}
                        title={isDirty ? "Save this request (Ctrl+S)" : "No changes to save"}
                    >
                        <Save size={14} />
                        SAVE
                    </button>
                )}
            </div>

            <div className={`flex items-center gap-1 border-l pl-3 ${borderCol} flex-shrink-0`}>
                <button
                    onClick={onCopyMarkdown}
                    className={`p-1.5 ${subTextColor} hover:text-indigo-500 hover:bg-gray-500/10 rounded-md transition-all`}
                    title="Copy Request Markdown"
                >
                    <Copy size={16} />
                </button>
                <button
                    onClick={onPreviewMarkdown}
                    className={`p-1.5 ${subTextColor} hover:text-indigo-400 hover:bg-gray-500/10 rounded-md transition-all`}
                    title="Preview Markdown"
                >
                    <FileText size={16} />
                </button>
            </div>
        </div>
    );
}

export const UrlBar = memo(UrlBarComponent);
