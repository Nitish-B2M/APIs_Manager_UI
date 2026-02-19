'use client';

import React, { useState } from 'react';
import { Copy, Search, X, History, RotateCcw, Clock, Columns2, Rows2, WrapText } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';

type PaneLayout = 'horizontal' | 'vertical';

interface ResponsePanelProps {
    response: any;
    currentReq: any;
    reqLoading: boolean;
    paneLayout: PaneLayout;
    endpoints: any[];
    selectedIdx: number;
    onLayoutChange: (layout: PaneLayout) => void;
    onLoadHistory: (item: any) => void;
    onBackToLatest: () => void;
    isViewingHistory: boolean;
}

export function ResponsePanel({
    response,
    currentReq,
    reqLoading,
    paneLayout,
    endpoints,
    selectedIdx,
    onLayoutChange,
    onLoadHistory,
    onBackToLatest,
    isViewingHistory,
}: ResponsePanelProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);

    const [showHistory, setShowHistory] = useState(false);
    const [showAbsoluteTime, setShowAbsoluteTime] = useState(false);
    const [responseFilter, setResponseFilter] = useState('');
    const [showResponseFilter, setShowResponseFilter] = useState(false);
    const [wrapLines, setWrapLines] = useState(false);

    const handleCopyResponse = () => {
        if (!response?.data) return;
        navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
        toast.success('Response copied');
    };

    const handleHistoryClick = (item: any) => {
        onLoadHistory(item);
        setShowHistory(false);
        toast.success('Loaded from history');
    };

    return (
        <div className={`h-full ${themeClasses.mainBg} flex flex-col border-l ${themeClasses.borderCol} min-w-0 relative ${paneLayout === 'horizontal' ? '' : 'border-t'}`}>
            {/* Header */}
            <div className={`p-2 pl-4 border-b ${themeClasses.borderCol} ${themeClasses.secondaryBg} flex justify-between items-center z-10 relative`}>
                <div className="flex items-center gap-4">
                    <h3 className={`font-bold ${themeClasses.textColor} opacity-60 text-[10px] uppercase`}>Response</h3>
                    {response && (
                        <div className="flex items-center gap-3 text-[10px] p-1.5">
                            <span className={`font-bold ${response.status >= 200 && response.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                {response.status} {response.statusText}
                            </span>
                            <span className={themeClasses.subTextColor}>{response.time}ms</span>
                            <button
                                onClick={() => setShowAbsoluteTime(!showAbsoluteTime)}
                                className={`text-[9px] ${themeClasses.subTextColor} hover:text-indigo-500 flex items-center gap-1 ${themeClasses.inputBg} px-1.5 py-0.5 rounded border ${themeClasses.borderCol}`}
                            >
                                {showAbsoluteTime
                                    ? new Date(response.timestamp || Date.now()).toLocaleTimeString()
                                    : 'JUST NOW'}
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex gap-1 items-center">
                    {response && (
                        <>
                            {showResponseFilter ? (
                                <div className="flex items-center gap-1 mr-1">
                                    <div className="relative">
                                        <Search size={12} className={`absolute left-2 top-1/2 -translate-y-1/2 ${themeClasses.subTextColor}`} />
                                        <input
                                            type="text"
                                            value={responseFilter}
                                            onChange={(e) => setResponseFilter(e.target.value)}
                                            placeholder="Filter response..."
                                            className={`pl-7 pr-2 py-1 text-[10px] ${themeClasses.inputBg} border ${themeClasses.borderCol} rounded focus:ring-1 focus:ring-indigo-500 outline-none w-40 ${themeClasses.textColor}`}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => { setShowResponseFilter(false); setResponseFilter(''); }}
                                        className={`p-1 ${themeClasses.subTextColor} hover:text-red-400 rounded`}
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowResponseFilter(true)}
                                    className={`p-1 rounded transition-all ${themeClasses.subTextColor} hover:bg-gray-600 hover:text-white`}
                                    title="Filter Response (Ctrl+F)"
                                >
                                    <Search size={14} />
                                </button>
                            )}
                            <button
                                onClick={handleCopyResponse}
                                className={`p-1 px-2 text-[9px] ${themeClasses.subTextColor} hover:text-indigo-500 ${themeClasses.inputBg} hover:bg-opacity-50 rounded border ${themeClasses.borderCol} flex items-center gap-1 transition-all mr-1 font-bold`}
                            >
                                <Copy size={10} /> COPY
                            </button>
                            <button
                                onClick={() => setWrapLines(!wrapLines)}
                                className={`p-1 rounded transition-all ${wrapLines ? 'bg-indigo-600 text-white' : `${themeClasses.subTextColor} hover:bg-gray-600 hover:text-white`}`}
                                title={wrapLines ? 'Disable Word Wrap' : 'Enable Word Wrap'}
                            >
                                <WrapText size={14} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-1 rounded ${showHistory ? 'bg-indigo-600 text-white' : `${themeClasses.subTextColor} hover:bg-opacity-10 hover:bg-gray-400`}`}
                        title="History"
                    >
                        <History size={14} />
                    </button>
                    <button
                        onClick={() => onLayoutChange('horizontal')}
                        className={`p-1 rounded ${paneLayout === 'horizontal' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
                        title="Layout Right"
                    >
                        <Columns2 size={14} />
                    </button>
                    <button
                        onClick={() => onLayoutChange('vertical')}
                        className={`p-1 rounded ${paneLayout === 'vertical' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-700'}`}
                        title="Layout Bottom"
                    >
                        <Rows2 size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 relative w-full h-full ${themeClasses.inputBg}`}>
                {/* History Panel */}
                {showHistory && (
                    <div className={`absolute inset-0 z-20 ${themeClasses.secondaryBg} backdrop-blur-sm border-r ${themeClasses.borderCol} p-4 overflow-y-auto animate-in slide-in-from-right duration-200 shadow-2xl`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className={`font-bold ${themeClasses.textColor} text-sm flex items-center gap-2 p-2`}>
                                <RotateCcw size={16} className="text-indigo-500" />
                                Response History
                            </h4>
                            <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-gray-800 rounded-full">
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {!(currentReq?.history || []).length && (
                                <div className="text-center py-10 text-gray-500 text-[11px] border-2 border-dashed border-gray-800 rounded-xl">
                                    No history found for this endpoint.
                                </div>
                            )}
                            {(currentReq?.history || []).map((item: any, i: number) => (
                                <div
                                    key={i}
                                    onClick={() => handleHistoryClick(item)}
                                    className={`p-3 border ${themeClasses.borderCol} rounded-lg hover:border-indigo-500 hover:bg-indigo-500/5 cursor-pointer transition-all relative group`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[9px] font-bold px-1 rounded ${item.lastResponse?.status >= 200 && item.lastResponse?.status < 300
                                            ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                                            }`}>
                                            {item.lastResponse?.status}
                                        </span>
                                        <span className="text-[9px] text-gray-500">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className={`text-[11px] font-bold ${themeClasses.textColor} truncate tracking-tight`}>{item.method} {item.url}</div>
                                    <div className={`text-[9px] ${themeClasses.subTextColor} mt-1`}>{item.lastResponse?.time}ms • {item.name || 'Untitled'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Viewing History Banner */}
                {isViewingHistory && (
                    <div className="absolute top-0 left-0 right-0 z-30 bg-indigo-900 border-b border-indigo-500/30 px-4 py-2 flex justify-between items-center animate-in fade-in duration-200">
                        <span className="text-[10px] text-indigo-200 font-bold flex items-center gap-2">
                            <Clock size={12} /> VIEWING HISTORICAL SNAPSHOT
                        </span>
                        <button
                            onClick={onBackToLatest}
                            className="text-[9px] bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-500 font-bold transition-colors shadow-lg"
                        >
                            BACK TO LATEST
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {!response && !reqLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-[11px] font-bold">
                        HIT SEND TO SEE RESPONSE
                    </div>
                )}

                {/* Loading State */}
                {reqLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                {/* Response Content */}
                {response && !response.error && (() => {
                    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
                    const filterLower = responseFilter.toLowerCase().trim();
                    const hasFilter = filterLower.length > 0;
                    const matchCount = hasFilter ? (responseText.toLowerCase().match(new RegExp(filterLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0;

                    const highlightMatches = (text: string) => {
                        if (!hasFilter) return text;
                        const escapedFilter = filterLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(${escapedFilter})`, 'gi');
                        return text.replace(regex, '<<<HIGHLIGHT>>>$1<<<ENDHIGHLIGHT>>>');
                    };

                    const highlightedText = highlightMatches(responseText);

                    return (
                        <div className="absolute inset-0 overflow-auto scrollbar-thin">
                            {hasFilter && (
                                <div className={`sticky top-0 z-10 px-4 py-2 text-[10px] font-bold ${theme === 'dark' ? 'bg-indigo-900/90 text-indigo-200' : 'bg-indigo-100 text-indigo-700'} border-b ${themeClasses.borderCol} flex items-center gap-2`}>
                                    <Search size={12} />
                                    {matchCount > 0 ? (
                                        <span>{matchCount} match{matchCount !== 1 ? 'es' : ''} found for "{responseFilter}"</span>
                                    ) : (
                                        <span>No matches found for "{responseFilter}"</span>
                                    )}
                                </div>
                            )}
                            {hasFilter ? (
                                <pre
                                    className={`p-6 font-mono text-[13px] ${wrapLines ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'}`}
                                    style={{ color: theme === 'dark' ? '#d4d4d4' : '#1f2937' }}
                                >
                                    {highlightedText.split(/<<<HIGHLIGHT>>>|<<<ENDHIGHLIGHT>>>/).map((part, i) =>
                                        i % 2 === 1 ? (
                                            <mark key={i} className="bg-yellow-400 text-black px-0.5 rounded">{part}</mark>
                                        ) : (
                                            <span key={i}>{part}</span>
                                        )
                                    )}
                                </pre>
                            ) : (
                                <SyntaxHighlighter
                                    style={theme === 'dark' ? vscDarkPlus : materialLight}
                                    language="json"
                                    customStyle={{
                                        margin: 0,
                                        minHeight: '100%',
                                        borderRadius: 0,
                                        fontSize: '13px',
                                        backgroundColor: theme === 'dark' ? 'transparent' : '#fafafa',
                                        padding: '24px'
                                    }}
                                    wrapLongLines={wrapLines}
                                >
                                    {responseText}
                                </SyntaxHighlighter>
                            )}
                        </div>
                    );
                })()}

                {/* Error State */}
                {response && response.error && (
                    <div className="absolute inset-0 p-4 text-red-400 bg-red-950/20 overflow-auto">
                        <pre className="text-red-400 whitespace-pre-wrap break-all font-mono text-[11px]">Error: {response.message}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}
