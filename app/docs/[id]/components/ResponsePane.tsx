'use client';

import React, { memo } from 'react';
import { History, Columns2, Rows2, Copy, X, RotateCcw, Clock, WrapText, Send, Sparkles } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '@/context/ThemeContext';
import { ApiResponse, ApiErrorResponse, ResponseResult, HistoryItem, PaneLayout } from '@/types';

interface ResponsePaneProps {
    response: ResponseResult | null;
    isLoading: boolean;
    history: HistoryItem[];
    showHistory: boolean;
    isViewingHistory: boolean;
    paneLayout: PaneLayout;
    showAbsoluteTime: boolean;
    onToggleHistory: () => void;
    onToggleAbsoluteTime: () => void;
    onLayoutChange: (layout: PaneLayout) => void;
    onCopyResponse: () => void;
    onLoadFromHistory: (item: HistoryItem) => void;
    onBackToLatest: () => void;
    onSelection: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

function isApiResponse(response: ResponseResult): response is ApiResponse {
    return !('error' in response);
}

function ResponsePaneComponent({
    response,
    isLoading,
    history,
    showHistory,
    isViewingHistory,
    paneLayout,
    showAbsoluteTime,
    onToggleHistory,
    onToggleAbsoluteTime,
    onLayoutChange,
    onCopyResponse,
    onLoadFromHistory,
    onBackToLatest,
    onSelection,
    onContextMenu
}: ResponsePaneProps) {
    const { theme } = useTheme();
    const [wrapLines, setWrapLines] = React.useState(false);
    const [filter, setFilter] = React.useState('');
    const [showFilter, setShowFilter] = React.useState(false);

    const isDark = theme === 'dark';
    const mainBg = isDark ? 'bg-[#0a0a0b]' : 'bg-gray-50';
    const secondaryBg = isDark ? 'bg-white/5 backdrop-blur-xl' : 'bg-white';
    const inputBg = isDark ? 'bg-black/20' : 'bg-white';
    const borderCol = isDark ? 'border-white/5' : 'border-gray-200';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`${mainBg} flex flex-col border-l ${borderCol} min-w-0 relative ${paneLayout === 'horizontal' ? '' : 'border-t'}`}>
            {/* Header */}
            <div className={`p-3 border-b ${borderCol} ${secondaryBg} flex justify-between items-center z-10 relative`}>
                <div className="flex items-center gap-5">
                    <h3 className={`font-black ${textColor} opacity-40 text-[10px] uppercase tracking-[0.2em]`}>Response</h3>
                    {response && isApiResponse(response) && (
                        <div className="flex items-center gap-4 text-[11px] animate-in fade-in slide-in-from-left-2 transition-all">
                            <span className={`font-black flex items-center gap-1.5 ${response.status >= 200 && response.status < 300 ? 'text-emerald-400' : 'text-red-400'}`}>
                                <div className={`w-2 h-2 rounded-full ${response.status >= 200 && response.status < 300 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.8)]'}`} />
                                {response.status} {response.statusText}
                            </span>
                            <span className={`${subTextColor} font-mono text-[10px]`}>{response.time}ms</span>
                            <button
                                onClick={onToggleAbsoluteTime}
                                className={`text-[9px] ${subTextColor} hover:text-indigo-400 flex items-center gap-1.5 ${inputBg} px-2 py-1 rounded-lg border ${borderCol} transition-all hover:border-indigo-500/30 font-bold`}
                            >
                                <Clock size={10} />
                                {showAbsoluteTime
                                    ? new Date(response.timestamp || Date.now()).toLocaleTimeString()
                                    : 'JUST NOW'}
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    {response && isApiResponse(response) && (
                        <>
                            {showFilter ? (
                                <div className="flex items-center gap-1 mr-1 animate-in slide-in-from-right-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={filter}
                                            onChange={(e) => setFilter(e.target.value)}
                                            placeholder="Highlight..."
                                            className={`px-3 py-1.5 text-[11px] ${inputBg} border ${borderCol} rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none w-40 ${textColor} transition-all placeholder-gray-600`}
                                            autoFocus
                                        />
                                    </div>
                                    <button
                                        onClick={() => { setShowFilter(false); setFilter(''); }}
                                        className={`p-1.5 ${subTextColor} hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all`}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowFilter(true)}
                                    className={`p-1.5 px-3 text-[10px] ${subTextColor} hover:text-indigo-400 ${inputBg} hover:bg-white/5 rounded-xl border ${borderCol} flex items-center gap-1.5 transition-all mr-1 font-black uppercase tracking-widest`}
                                >
                                    SEARCH
                                </button>
                            )}
                            <button
                                onClick={onCopyResponse}
                                className={`p-1.5 px-3 text-[10px] ${subTextColor} hover:text-emerald-400 ${inputBg} hover:bg-white/5 rounded-xl border ${borderCol} flex items-center gap-1.5 transition-all mr-1 font-black uppercase tracking-widest`}
                            >
                                <Copy size={12} /> COPY
                            </button>
                        </>
                    )}
                    <button
                        onClick={onToggleHistory}
                        className={`p-2 rounded-xl transition-all duration-300 ${showHistory ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : `${subTextColor} hover:bg-white/10 hover:text-white`}`}
                        title="History"
                    >
                        <History size={16} />
                    </button>
                    {response && isApiResponse(response) && (
                        <button
                            onClick={() => setWrapLines(!wrapLines)}
                            className={`p-2 rounded-xl transition-all duration-300 ${wrapLines ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : `${subTextColor} hover:bg-white/10 hover:text-white`}`}
                            title={wrapLines ? 'Disable Word Wrap' : 'Enable Word Wrap'}
                        >
                            <WrapText size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => onLayoutChange('horizontal')}
                        className={`p-2 rounded-xl transition-all duration-300 ${paneLayout === 'horizontal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : `${subTextColor} hover:bg-white/10 hover:text-white`}`}
                        title="Layout Right"
                    >
                        <Columns2 size={16} />
                    </button>
                    <button
                        onClick={() => onLayoutChange('vertical')}
                        className={`p-2 rounded-xl transition-all duration-300 ${paneLayout === 'vertical' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : `${subTextColor} hover:bg-white/10 hover:text-white`}`}
                        title="Layout Bottom"
                    >
                        <Rows2 size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 relative w-full h-full ${inputBg}`} onMouseUp={onSelection} onContextMenu={onContextMenu}>
                {/* History Panel */}
                {showHistory && (
                    <div className={`absolute inset-0 z-20 ${isDark ? 'bg-black/80 backdrop-blur-2xl' : 'bg-white/90 backdrop-blur-md'} border-r ${borderCol} p-6 overflow-y-auto animate-in slide-in-from-right duration-500 shadow-2xl`}>
                        <div className="flex justify-between items-center mb-6">
                            <h4 className={`font-black uppercase tracking-[0.2em] ${textColor} text-xs flex items-center gap-3`}>
                                <div className="p-2 bg-indigo-600/20 rounded-xl text-indigo-400">
                                    <RotateCcw size={16} />
                                </div>
                                Snapshot History
                            </h4>
                            <button onClick={onToggleHistory} className={`p-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} rounded-xl transition-all`}>
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {!history.length && (
                                <div className="text-center py-16 text-gray-500 text-[12px] border-2 border-dashed border-white/5 rounded-2xl font-bold uppercase tracking-widest px-6 italic">
                                    No snapshots captured for this endpoint yet.
                                </div>
                            )}
                            {history.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => onLoadFromHistory(item)}
                                    className={`p-4 border ${borderCol} rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} hover:border-indigo-500/50 hover:bg-indigo-600/5 cursor-pointer transition-all duration-300 relative group overflow-hidden`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 to-indigo-600/0 group-hover:from-indigo-600/5 transition-all duration-500" />
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm ${item.lastResponse && item.lastResponse.status >= 200 && item.lastResponse.status < 300
                                            ? 'bg-emerald-600/20 text-emerald-400'
                                            : 'bg-red-600/20 text-red-400'
                                            }`}>
                                            {item.lastResponse?.status}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                            {new Date(item.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className={`text-[12px] font-bold ${textColor} truncate tracking-tight mb-1 relative z-10 group-hover:text-indigo-400 transition-colors`}>
                                        {item.method} {item.url}
                                    </div>
                                    <div className={`text-[10px] ${subTextColor} flex items-center gap-2 relative z-10 font-medium`}>
                                        <span className="text-indigo-500 font-bold">{item.lastResponse?.time}ms</span>
                                        <span className="opacity-30">•</span>
                                        <span className="truncate">{item.name || 'Untitled Snap'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* History Viewing Banner */}
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
                {!response && !isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-600 animate-in fade-in duration-700">
                        <div className={`w-16 h-16 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 shadow-2xl`}>
                            <Send size={32} strokeWidth={1.5} />
                        </div>
                        <div className="text-[12px] font-black uppercase tracking-[0.3em] opacity-40">
                            Ready to Send Request
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/40 backdrop-blur-sm z-50">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full border-t-2 border-indigo-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles size={24} className="text-indigo-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] animate-pulse">
                            Processing Request...
                        </div>
                    </div>
                )}

                {/* Response Data */}
                {response && isApiResponse(response) && (
                    <div className="absolute inset-0 overflow-auto scrollbar-thin">
                        <SyntaxHighlighter
                            style={theme === 'dark' ? vscDarkPlus : materialLight}
                            language="json"
                            customStyle={{
                                margin: 0,
                                minHeight: '100%',
                                borderRadius: 0,
                                fontSize: '13px',
                                backgroundColor: theme === 'dark' ? 'transparent' : '#fafafa',
                                padding: '24px',
                                whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
                                wordBreak: wrapLines ? 'break-all' : 'normal',
                                overflowWrap: wrapLines ? 'anywhere' : 'normal',
                            }}
                            codeTagProps={{
                                style: {
                                    whiteSpace: wrapLines ? 'pre-wrap' : 'pre',
                                    wordBreak: wrapLines ? 'break-all' : 'normal',
                                    overflowWrap: wrapLines ? 'anywhere' : 'normal',
                                }
                            }}
                            wrapLongLines={wrapLines}
                            lineProps={(lineNumber) => {
                                const responseString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
                                const lines = responseString.split('\n');
                                const line = lines[lineNumber - 1];

                                if (filter && line && line.toLowerCase().includes(filter.toLowerCase())) {
                                    return {
                                        style: {
                                            display: 'block',
                                            backgroundColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                                            borderLeft: '2px solid #6366f1',
                                            paddingLeft: '4px',
                                            marginLeft: '-6px'
                                        }
                                    };
                                }
                                return {
                                    style: { display: 'block' }
                                };
                            }}
                        >
                            {typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)}
                        </SyntaxHighlighter>
                    </div>
                )}

                {/* Error State */}
                {response && !isApiResponse(response) && (
                    <div className="absolute inset-0 p-4 text-red-400 bg-red-950/20 overflow-auto">
                        <pre className="text-red-400 whitespace-pre-wrap break-all font-mono text-[11px]">
                            Error: {response.message}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

export const ResponsePane = memo(ResponsePaneComponent);
