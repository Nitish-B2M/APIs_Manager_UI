'use client';

import React, { useState, useCallback, useMemo, JSX } from 'react';
import { Send, Save, Copy, Download } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';

interface Suggestion {
    type: 'env' | 'url';
    value: string;
    displayValue: string;
}

interface RequestUrlBarProps {
    currentReq: any;
    canEdit: boolean;
    isDirty: boolean;
    reqLoading: boolean;
    variables: Record<string, string>;
    urlHistory: string[];
    onMethodChange: (method: string) => void;
    onUrlChange: (url: string) => void;
    onSend: () => void;
    onSave: () => void;
    onCopyUrl: () => void;
    onCopyMarkdown: () => void;
    onDownloadMarkdown: () => void;
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
                // Match exact input text rendering
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
                    const isSet = variables[key] !== undefined;

                    return (
                        <span
                            key={i}
                            className={`rounded-sm ${isSet
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
    onUrlChange,
    onSend,
    onSave,
    onCopyUrl,
    onCopyMarkdown,
    onDownloadMarkdown,
}: RequestUrlBarProps) {
    const { theme } = useTheme();
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

    if (!currentReq) return null;

    return (
        <div className={`${themeClasses.secondaryBg} border-b ${themeClasses.borderCol} p-3 flex items-center gap-3 shadow-md z-10`}>
            <div className="flex-1 flex gap-2 min-w-0">
                {/* Method Selector */}
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
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${idx === suggestionIndex ? 'bg-indigo-500' : s.type === 'env' ? 'bg-blue-600/20 text-blue-400' : 'bg-green-600/20 text-green-400'}`}>
                                        {s.type === 'env' ? 'ENV' : 'URL'}
                                    </span>
                                    <span className="font-mono flex-1 truncate">{s.displayValue}</span>
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
                    className="flex-shrink-0 px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 text-[11px] disabled:opacity-50"
                >
                    {reqLoading ? <span className="animate-spin text-xs">⌛</span> : <Send size={14} />}
                    SEND
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
    );
}
