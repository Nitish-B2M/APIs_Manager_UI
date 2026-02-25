'use client';

import React, { useState } from 'react';
import { Copy, Search, X, History, RotateCcw, Clock, Columns2, Rows2, WrapText, FlaskConical, CheckCircle2, XCircle, ChevronDown, ChevronUp, Split, Zap, Sparkles, Loader2, Lightbulb } from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';
import { SocketPanel } from './SocketPanel';
import { WebsocketMessage, ConnectionStatus } from '@/types';

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
    onSelection: () => void;
    onContextMenu: (e: React.MouseEvent) => void;

    // WS/SSE Props
    wsMessages?: WebsocketMessage[];
    wsStatus?: ConnectionStatus;
    socketMode?: 'ws' | 'sse';
    onWsConnect?: () => void;
    onWsDisconnect?: () => void;
    onWsSendMessage?: (data: string) => void;
    onWsClearMessages?: () => void;
    aiEnabled?: boolean;
    onExplainError?: (error: any) => Promise<string | null>;
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
    onSelection,
    onContextMenu,
    wsMessages = [],
    wsStatus = 'disconnected',
    socketMode = 'ws',
    onWsConnect,
    onWsDisconnect,
    onWsSendMessage,
    onWsClearMessages,
    aiEnabled,
    onExplainError
}: ResponsePanelProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);

    const [showHistory, setShowHistory] = useState(false);
    const [showAbsoluteTime, setShowAbsoluteTime] = useState(false);
    const [wrapLines, setWrapLines] = useState(false);
    const [showTestResults, setShowTestResults] = useState(true);
    const [showDiff, setShowDiff] = useState(false);
    const [isExplaining, setIsExplaining] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [editorInstance, setEditorInstance] = useState<any>(null);

    const handleEditorDidMount = (editor: any, monaco: any) => {
        setEditorInstance(editor);
    };

    const handleCopyResponse = () => {
        if (!response?.data) return;
        navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
        toast.success('Response copied');
    };

    const handleExplainError = async () => {
        if (!onExplainError || isExplaining) return;
        setIsExplaining(true);
        try {
            const result = await onExplainError(response);
            if (result) setExplanation(result);
        } finally {
            setIsExplaining(false);
        }
    };

    const handleHistoryClick = (item: any) => {
        onLoadHistory(item);
        setShowHistory(false);
        toast.success('Loaded from history');
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const detectLanguage = (data: any) => {
        if (typeof data !== 'string') return 'json';
        const trimmed = data.trim();
        if (trimmed.startsWith('<')) return 'html';
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
        return 'text';
    };

    return (
        <div className={`h-full ${themeClasses.mainBg} flex flex-col border-l ${themeClasses.borderCol} min-w-0 relative ${paneLayout === 'horizontal' ? '' : 'border-t'}`}>
            {/* Header */}
            <div className={`p-2 pl-4 border-b ${themeClasses.borderCol} ${themeClasses.secondaryBg} flex justify-between items-center z-10 relative`}>
                <div className="flex items-center gap-4">
                    <h3 className={`font-bold ${themeClasses.textColor} opacity-60 text-[10px] uppercase`}>Response</h3>
                    {response && (currentReq.protocol === 'REST' || !currentReq.protocol) && (
                        <div className="flex items-center gap-3 text-[10px] p-1.5">
                            <span className={`font-bold ${response.status >= 200 && response.status < 300 ? 'text-green-500' : 'text-red-500'}`}>
                                {response.status} {response.statusText}
                            </span>
                            <span className={themeClasses.subTextColor}>{response.time}ms</span>
                            <span className={themeClasses.subTextColor}>{formatSize(response.size)}</span>
                            <button
                                onClick={() => setShowAbsoluteTime(!showAbsoluteTime)}
                                className={`text-[9px] ${themeClasses.subTextColor} hover:text-indigo-500 flex items-center gap-1 ${themeClasses.inputBg} px-1.5 py-0.5 rounded border ${themeClasses.borderCol}`}
                            >
                                {showAbsoluteTime
                                    ? new Date(response.timestamp || Date.now()).toLocaleTimeString()
                                    : 'JUST NOW'}
                            </button>
                            {/* Test Results Badge */}
                            {(response.testResults?.length || 0) > 0 && (() => {
                                const passed = response.testResults!.filter((r: any) => r.passed).length;
                                const total = response.testResults!.length;
                                const allPassed = passed === total;
                                return (
                                    <button
                                        onClick={() => setShowTestResults(p => !p)}
                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors ${allPassed
                                            ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                                            : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                            }`}
                                    >
                                        <FlaskConical size={9} />
                                        {passed}/{total} tests
                                    </button>
                                );
                            })()}
                        </div>
                    )}
                    {currentReq.protocol === 'WS' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
                            <Zap size={10} className="text-amber-500" />
                            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">WebSocket Mode</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-1 items-center">
                    {response && (currentReq.protocol === 'REST' || currentReq.protocol === 'GRAPHQL' || !currentReq.protocol) && (
                        <>
                            <button
                                onClick={() => {
                                    if (editorInstance) {
                                        const action = editorInstance.getAction('actions.find');
                                        if (action) action.run();
                                    }
                                }}
                                className={`p-1 rounded transition-all ${themeClasses.subTextColor} hover:bg-gray-600 hover:text-white`}
                                title="Find in Response (Ctrl+F)"
                            >
                                <Search size={14} />
                            </button>
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
                            <button
                                onClick={() => setShowDiff(!showDiff)}
                                className={`p-1 rounded transition-all ${showDiff ? 'bg-indigo-600 text-white' : `${themeClasses.subTextColor} hover:bg-gray-600 hover:text-white`} ${!currentReq?.lastResponse ? 'opacity-30 cursor-not-allowed' : ''}`}
                                title={showDiff ? 'Current View' : 'Compare with Saved'}
                                disabled={!currentReq?.lastResponse}
                            >
                                <Split size={14} />
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
                {!response && !reqLoading && (currentReq.protocol === 'REST' || currentReq.protocol === 'GRAPHQL' || !currentReq.protocol) && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-[11px] font-bold">
                        HIT SEND TO SEE RESPONSE
                    </div>
                )}

                {/* WebSocket Panel */}
                {(currentReq.protocol === 'WS' || currentReq.protocol === 'SSE') && (
                    <div className="absolute inset-0 z-10 bg-inherit">
                        <SocketPanel
                            messages={wsMessages}
                            status={wsStatus}
                            mode={socketMode}
                            onConnect={onWsConnect || (() => { })}
                            onDisconnect={onWsDisconnect || (() => { })}
                            onSendMessage={onWsSendMessage || (() => { })}
                            onClearMessages={onWsClearMessages || (() => { })}
                        />
                    </div>
                )}

                {/* Loading State */}
                {reqLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-40 bg-inherit/50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                {/* Response Content / Editor */}
                {(() => {
                    const responseText = response && !response.error ? (typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)) : '';
                    const lang = response && !response.error ? detectLanguage(response.data) : 'text';
                    const isVisible = response && !response.error && !reqLoading && (currentReq.protocol === 'REST' || currentReq.protocol === 'GRAPHQL' || !currentReq.protocol);

                    return (
                        <div className={`absolute inset-0 w-full h-full ${isVisible ? 'block' : 'hidden'}`} onMouseUp={onSelection} onContextMenu={onContextMenu}>
                            <div className="w-full h-full overflow-hidden">
                                {showDiff && currentReq?.lastResponse ? (
                                    <DiffEditor
                                        key="diff-editor"
                                        height="100%"
                                        language={lang}
                                        original={typeof currentReq.lastResponse.data === 'string'
                                            ? currentReq.lastResponse.data
                                            : JSON.stringify(currentReq.lastResponse.data, null, 2)}
                                        modified={responseText}
                                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                        options={{
                                            readOnly: true,
                                            fontSize: 13,
                                            renderSideBySide: true,
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            wordWrap: wrapLines ? 'on' : 'off',
                                            padding: { top: 20, bottom: 20 },
                                        }}
                                    />
                                ) : (
                                    <Editor
                                        key="normal-editor"
                                        height="100%"
                                        language={lang}
                                        value={responseText}
                                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                        onMount={handleEditorDidMount}
                                        options={{
                                            readOnly: true,
                                            fontSize: 13,
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            wordWrap: wrapLines ? 'on' : 'off',
                                            automaticLayout: true,
                                            padding: { top: 20, bottom: 20 },
                                            lineNumbers: 'on',
                                            folding: true,
                                            renderLineHighlight: 'none',
                                            find: {
                                                seedSearchStringFromSelection: 'always',
                                                autoFindInSelection: 'always',
                                                addExtraSpaceOnTop: false
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Error State */}
                {response && response.error && (currentReq.protocol === 'REST' || !currentReq.protocol) && (
                    <div className="absolute inset-0 p-4 text-red-400 bg-red-950/20 overflow-auto z-30 flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                            <pre className="text-red-400 whitespace-pre-wrap break-all font-mono text-[11px] flex-1">Error: {response.message}</pre>
                            {aiEnabled && (
                                <button
                                    onClick={handleExplainError}
                                    disabled={isExplaining}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${isExplaining ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'}`}
                                >
                                    {isExplaining ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    EXPLAIN WITH AI
                                </button>
                            )}
                        </div>

                        {explanation && (
                            <div className={`mt-2 p-4 rounded-xl border ${theme === 'dark' ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                                    <Lightbulb size={14} />
                                    AI Explanation
                                </div>
                                <p className={`text-xs ${theme === 'dark' ? 'text-indigo-100' : 'text-indigo-900'} leading-relaxed`}>
                                    {explanation}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Test Results Panel */}
            {!response?.error && (response?.testResults?.length || 0) > 0 && (currentReq.protocol === 'REST' || !currentReq.protocol) && (
                <div className={`border-t ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-[#16162a]' : 'bg-gray-50'}`}>
                    <button
                        onClick={() => setShowTestResults(p => !p)}
                        className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-bold ${themeClasses.subTextColor} hover:text-indigo-400 transition-colors`}
                    >
                        <span className="flex items-center gap-2">
                            <FlaskConical size={12} />
                            TEST RESULTS
                            {(() => {
                                const passed = response.testResults!.filter((r: any) => r.passed).length;
                                const total = response.testResults!.length;
                                return (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${passed === total ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>{passed}/{total} passed</span>
                                );
                            })()}
                        </span>
                        {showTestResults ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </button>
                    {showTestResults && (
                        <div className="px-4 pb-3 space-y-1">
                            {response.testResults!.map((result: any, i: number) => (
                                <div key={i} className={`flex items-start gap-2.5 py-1.5 px-2 rounded-lg text-xs ${result.passed
                                    ? theme === 'dark' ? 'bg-green-900/10' : 'bg-green-50'
                                    : theme === 'dark' ? 'bg-red-900/10' : 'bg-red-50'
                                    }`}>
                                    {result.passed
                                        ? <CheckCircle2 size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
                                        : <XCircle size={13} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    }
                                    <div className="min-w-0">
                                        <p className={`font-semibold text-[11px] ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                                            {result.name}
                                        </p>
                                        <p className={`text-[10px] ${themeClasses.subTextColor} truncate`}>
                                            {result.message}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
