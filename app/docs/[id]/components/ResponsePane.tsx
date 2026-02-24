'use client';

import React, { memo } from 'react';
import { History, Columns2, Rows2, Copy, X, RotateCcw, Clock, WrapText } from 'lucide-react';
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

    const secondaryBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const mainBg = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
    const inputBg = theme === 'dark' ? 'bg-gray-950' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    return (
        <div className={`${mainBg} flex flex-col border-l ${borderCol} min-w-0 relative ${paneLayout === 'horizontal' ? '' : 'border-t'}`}>
            {/* Header */}
            <div className={`p-2 border-b ${borderCol} ${secondaryBg} flex justify-between items-center z-10 relative`}>
                <div className="flex items-center gap-4">
                    <h3 className={`font-bold ${textColor} opacity-60 text-[10px] uppercase`}>Response</h3>
                    {response && isApiResponse(response) && (
                        <div className="flex items-center gap-3 text-[10px]">
                            <span className={`font-bold ${response.status >= 200 && response.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                {response.status} {response.statusText}
                            </span>
                            <span className={subTextColor}>{response.time}ms</span>
                            <button
                                onClick={onToggleAbsoluteTime}
                                className={`text-[9px] ${subTextColor} hover:text-indigo-500 flex items-center gap-1 ${inputBg} px-1.5 py-0.5 rounded border ${borderCol}`}
                            >
                                {showAbsoluteTime
                                    ? new Date(response.timestamp || Date.now()).toLocaleTimeString()
                                    : 'JUST NOW'}
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex gap-1 items-center">
                    {response && isApiResponse(response) && (
                        <button
                            onClick={onCopyResponse}
                            className={`p-1 px-2 text-[9px] ${subTextColor} hover:text-indigo-500 ${inputBg} hover:bg-opacity-50 rounded border ${borderCol} flex items-center gap-1 transition-all mr-1 font-bold`}
                        >
                            <Copy size={10} /> COPY
                        </button>
                    )}
                    <button
                        onClick={onToggleHistory}
                        className={`p-1 rounded transition-all ${showHistory ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-gray-600 hover:text-white`}`}
                        title="History"
                    >
                        <History size={14} />
                    </button>
                    {response && isApiResponse(response) && (
                        <button
                            onClick={() => setWrapLines(!wrapLines)}
                            className={`p-1 rounded transition-all ${wrapLines ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-gray-600 hover:text-white`}`}
                            title={wrapLines ? 'Disable Word Wrap' : 'Enable Word Wrap'}
                        >
                            <WrapText size={14} />
                        </button>
                    )}
                    <button
                        onClick={() => onLayoutChange('horizontal')}
                        className={`p-1 rounded transition-all ${paneLayout === 'horizontal' ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-gray-600 hover:text-white`}`}
                        title="Layout Right"
                    >
                        <Columns2 size={14} />
                    </button>
                    <button
                        onClick={() => onLayoutChange('vertical')}
                        className={`p-1 rounded transition-all ${paneLayout === 'vertical' ? 'bg-indigo-600 text-white' : `${subTextColor} hover:bg-gray-600 hover:text-white`}`}
                        title="Layout Bottom"
                    >
                        <Rows2 size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className={`flex-1 relative w-full h-full ${inputBg}`} onMouseUp={onSelection} onContextMenu={onContextMenu}>
                {/* History Panel */}
                {showHistory && (
                    <div className={`absolute inset-0 z-20 ${secondaryBg} backdrop-blur-sm border-r ${borderCol} p-4 overflow-y-auto animate-in slide-in-from-right duration-200 shadow-2xl`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className={`font-bold ${textColor} text-sm flex items-center gap-2`}>
                                <RotateCcw size={16} className="text-indigo-500" />
                                Response History
                            </h4>
                            <button onClick={onToggleHistory} className="p-1 hover:bg-gray-800 rounded-full">
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {!history.length && (
                                <div className="text-center py-10 text-gray-500 text-[11px] border-2 border-dashed border-gray-800 rounded-xl">
                                    No history found for this endpoint.
                                </div>
                            )}
                            {history.map((item, i) => (
                                <div
                                    key={i}
                                    onClick={() => onLoadFromHistory(item)}
                                    className={`p-3 border ${borderCol} rounded-lg hover:border-indigo-500 hover:bg-indigo-500/5 cursor-pointer transition-all relative group`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[9px] font-bold px-1 rounded ${item.lastResponse && item.lastResponse.status >= 200 && item.lastResponse.status < 300
                                            ? 'bg-green-600/20 text-green-400'
                                            : 'bg-red-600/20 text-red-400'
                                            }`}>
                                            {item.lastResponse?.status}
                                        </span>
                                        <span className="text-[9px] text-gray-500">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className={`text-[11px] font-bold ${textColor} truncate tracking-tight`}>
                                        {item.method} {item.url}
                                    </div>
                                    <div className={`text-[9px] ${subTextColor} mt-1`}>
                                        {item.lastResponse?.time}ms • {item.name || 'Untitled'}
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
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-[11px] font-bold">
                        HIT SEND TO SEE RESPONSE
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
