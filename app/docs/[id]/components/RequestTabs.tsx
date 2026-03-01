'use client';

import React, { useRef } from 'react';
import { Trash2, Plus, Copy, CheckCircle2, Sparkles, WrapText, Search } from 'lucide-react';
import CodeSnippets from './CodeSnippets';
import { AuthTab } from './AuthTab';
import { FormDataEditor } from './FormDataEditor';
import { TestsTab } from './TestsTab';
import { MockTab } from './MockTab';
import Editor from '@monaco-editor/react';
import { SchemaEditor } from './SchemaEditor';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';

type TabType = 'docs' | 'params' | 'headers' | 'auth' | 'body' | 'tests' | 'schema' | 'code' | 'mocking';

interface RequestTabsProps {
    currentReq: any;
    variables: Record<string, string>;
    activeTab: TabType;
    canEdit: boolean;
    aiCommand: string;
    aiLoading: boolean;
    onTabChange: (tab: TabType) => void;
    onRequestChange: (updates: Partial<any>) => void;
    onAiCommandChange: (command: string) => void;
    onAiGenerate: () => void;
    onFormatJson: () => void;
    onCopyBody: () => void;
    onCopyMarkdown: () => void;
    onSelection: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    aiEnabled?: boolean;
    onAiGenerateTests?: () => void;
}

export function RequestTabs({
    currentReq,
    variables,
    activeTab,
    canEdit,
    aiCommand,
    aiLoading,
    onTabChange,
    onRequestChange,
    onAiCommandChange,
    onAiGenerate,
    onFormatJson,
    onCopyBody,
    onCopyMarkdown,
    onSelection,
    onContextMenu,
    aiEnabled,
    onAiGenerateTests,
}: RequestTabsProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderCol = isDark ? 'border-white/5' : 'border-gray-200';
    const inputBg = isDark ? 'bg-white/5' : 'bg-gray-50';
    const secondaryBg = isDark ? 'bg-[#0a0a0b]/60 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-md';
    const mainBg = isDark ? 'bg-[#0a0a0b]' : 'bg-white';
    const themeClasses = getThemeClasses(theme);

    const [wrapLines, setWrapLines] = React.useState(false);

    const allTabs: TabType[] = ['params', 'headers', 'auth', 'body', 'tests', 'schema', 'mocking', 'docs', 'code'];
    const tabs = React.useMemo(() => {
        const protocol = currentReq?.protocol || 'REST';
        switch (protocol) {
            case 'WS':
                return allTabs.filter(t => ['headers', 'body', 'docs', 'code'].includes(t));
            case 'SSE':
                return allTabs.filter(t => ['params', 'headers', 'auth', 'docs', 'code'].includes(t));
            case 'GRAPHQL':
                return allTabs.filter(t => ['headers', 'auth', 'body', 'docs', 'code'].includes(t));
            case 'REST':
            default:
                return allTabs;
        }
    }, [currentReq?.protocol, allTabs]);

    React.useEffect(() => {
        if (!tabs.includes(activeTab)) {
            onTabChange('docs');
        }
    }, [tabs, activeTab, onTabChange]);

    const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
        const newHeaders = [...(currentReq.headers || [])];
        newHeaders[index][field] = value;
        onRequestChange({ headers: newHeaders });
    };

    const handleAddHeader = () => {
        onRequestChange({ headers: [...(currentReq.headers || []), { key: '', value: '' }] });
    };

    const handleRemoveHeader = (index: number) => {
        const newHeaders = currentReq.headers.filter((_: any, idx: number) => idx !== index);
        onRequestChange({ headers: newHeaders });
    };

    const handleParamChange = (index: number, field: 'key' | 'value', value: string) => {
        const newParams = [...(currentReq.params || [])];
        newParams[index][field] = value;
        onRequestChange({ params: newParams });
    };

    const handleAddParam = () => {
        onRequestChange({ params: [...(currentReq.params || []), { key: '', value: '', type: 'query' }] });
    };

    const handleRemoveParam = (index: number) => {
        const param = currentReq.params[index];
        if (param.type === 'path') return; // Don't allow removing path params
        const newParams = currentReq.params.filter((_: any, idx: number) => idx !== index);
        onRequestChange({ params: newParams });
    };

    return (
        <div className={`h-full border-r ${borderCol} flex flex-col min-h-0 min-w-0 ${mainBg}`}>
            {/* Tab Headers */}
            <div className={`flex border-b p-1.5 ${borderCol} ${secondaryBg} overflow-x-auto scrollbar-none`}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`px-4 py-2 font-bold text-[10px] transition-all duration-300 capitalize flex items-center gap-1.5 rounded-lg mr-1 relative group tracking-wider ${activeTab === tab
                            ? 'text-white bg-indigo-600/20'
                            : `${subTextColor} hover:text-gray-200 hover:bg-white/5`
                            }`}
                    >
                        {tab === 'body' && currentReq?.protocol === 'WS' ? 'Messages' : tab}
                        {tab === 'tests' && (currentReq?.assertions?.length || 0) > 0 && (
                            <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-black flex-shrink-0 transition-all ${activeTab === 'tests'
                                ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                                : 'bg-white/10 text-gray-400 group-hover:bg-white/20'
                                }`}>
                                {currentReq.assertions.length}
                            </span>
                        )}
                        {activeTab === tab && (
                            <div className="absolute bottom-1 left-3 right-3 h-[2px] bg-indigo-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className={`flex-1 overflow-y-auto ${activeTab === 'code' ? 'p-0' : 'p-3'}`} onMouseUp={onSelection} onContextMenu={onContextMenu}>
                {/* Headers Tab */}
                {activeTab === 'headers' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="flex justify-between text-[10px] font-black text-gray-500 mb-1 px-1 tracking-widest">
                            <span>KEY</span><span>VALUE</span>
                        </div>
                        {(currentReq.headers || []).map((h: any, i: number) => (
                            <div key={i} className="flex gap-2 group">
                                <input
                                    value={h.key}
                                    readOnly={!canEdit}
                                    onChange={(e) => handleHeaderChange(i, 'key', e.target.value)}
                                    className={`flex-1 px-3 py-2 ${inputBg} border ${borderCol} ${textColor} rounded-xl text-[12px] focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all placeholder-gray-600 font-mono`}
                                    placeholder="Key"
                                />
                                <input
                                    value={h.value}
                                    readOnly={!canEdit}
                                    onChange={(e) => handleHeaderChange(i, 'value', e.target.value)}
                                    className={`flex-1 px-3 py-2 ${inputBg} border ${borderCol} ${textColor} rounded-xl text-[12px] focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all placeholder-gray-600 font-mono`}
                                    placeholder="Value"
                                />
                                {canEdit && (
                                    <button
                                        onClick={() => handleRemoveHeader(i)}
                                        className="p-1 px-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {canEdit && (
                            <button
                                onClick={handleAddHeader}
                                className="w-full mt-2 py-2 border-2 border-dashed border-white/5 rounded-xl text-[10px] text-gray-500 font-black hover:border-indigo-500/30 hover:text-indigo-400 transition-all uppercase tracking-widest"
                            >
                                + ADD NEW HEADER
                            </button>
                        )}
                    </div>
                )}

                {/* Auth Tab */}
                {activeTab === 'auth' && (
                    <AuthTab
                        auth={currentReq.auth || { type: 'none' }}
                        canEdit={canEdit}
                        onAuthChange={(auth) => onRequestChange({ auth })}
                    />
                )}

                {activeTab === 'body' && (
                    <div className="h-full flex flex-col min-h-[300px] animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="mb-3 flex justify-between items-center text-[10px] text-gray-500 font-bold h-6">
                            <div className="flex items-center gap-4">
                                <label
                                    className={`flex items-center gap-2 ${canEdit ? 'cursor-pointer' : 'cursor-default'} group font-black tracking-widest ${(currentReq?.body?.mode || 'raw') === 'raw' ? 'text-indigo-400' : subTextColor} ${!canEdit ? 'opacity-70' : ''}`}
                                    onClick={() => canEdit && onRequestChange({ body: { ...currentReq.body, mode: 'raw' } })}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${(currentReq?.body?.mode || 'raw') === 'raw'
                                        ? 'border-indigo-500 bg-indigo-500/20'
                                        : 'border-white/10 bg-white/5'
                                        }`}>
                                        {(currentReq?.body?.mode || 'raw') === 'raw' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                                    </div>
                                    RAW
                                </label>
                                <label
                                    className={`flex items-center gap-2 ${canEdit ? 'cursor-pointer' : 'cursor-default'} group font-black tracking-widest ${currentReq?.body?.mode === 'formdata' ? 'text-indigo-400' : subTextColor} ${!canEdit ? 'opacity-70' : ''}`}
                                    onClick={() => canEdit && onRequestChange({ body: { ...currentReq.body, mode: 'formdata', formdata: currentReq.body?.formdata || [] } })}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${currentReq?.body?.mode === 'formdata'
                                        ? 'border-indigo-500 bg-indigo-500/20'
                                        : 'border-white/10 bg-white/5'
                                        }`}>
                                        {currentReq?.body?.mode === 'formdata' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                                    </div>
                                    FORM
                                </label>
                                <label
                                    className={`flex items-center gap-2 ${canEdit ? 'cursor-pointer' : 'cursor-default'} group font-black tracking-widest ${currentReq?.body?.mode === 'graphql' ? 'text-indigo-400' : subTextColor} ${!canEdit ? 'opacity-70' : ''}`}
                                    onClick={() => canEdit && onRequestChange({
                                        body: {
                                            ...currentReq.body,
                                            mode: 'graphql',
                                            graphql: currentReq.body?.graphql || { query: '', variables: '' }
                                        }
                                    })}
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all ${currentReq?.body?.mode === 'graphql'
                                        ? 'border-indigo-500 bg-indigo-500/20'
                                        : 'border-white/10 bg-white/5'
                                        }`}>
                                        {currentReq?.body?.mode === 'graphql' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                                    </div>
                                    GQL
                                </label>
                                {(currentReq?.body?.mode || 'raw') === 'raw' && (
                                    <button onClick={onCopyBody} className="text-gray-500 hover:text-indigo-400 flex items-center gap-1.5 transition-all font-black uppercase tracking-widest px-2 py-1 rounded hover:bg-white/5">
                                        <Copy size={12} /> COPY
                                    </button>
                                )}
                            </div>
                            {canEdit && (currentReq?.body?.mode || 'raw') === 'raw' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setWrapLines(!wrapLines)}
                                        className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 font-black transition-all text-[9px] uppercase tracking-widest ${wrapLines ? 'bg-indigo-600 text-white border-indigo-500' : 'hover:bg-white/10 text-gray-500 border-white/10'}`}
                                        title={wrapLines ? 'Disable Word Wrap' : 'Enable Word Wrap'}
                                    >
                                        <WrapText size={12} /> {wrapLines ? 'WRAP ON' : 'WRAP OFF'}
                                    </button>
                                    <button
                                        onClick={onFormatJson}
                                        className="px-2 py-1 hover:bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20 flex items-center gap-1.5 font-black text-[9px] uppercase tracking-widest transition-all"
                                    >
                                        <CheckCircle2 size={12} /> FORMAT
                                    </button>
                                </div>
                            )}
                        </div>

                        {(currentReq?.body?.mode || 'raw') === 'raw' ? (
                            <div className={`relative flex-1 rounded-2xl border ${borderCol} overflow-hidden ${isDark ? 'bg-black/40 backdrop-blur-md' : 'bg-white'}`}>
                                {(() => {
                                    const responseText = currentReq?.body?.raw || '';
                                    const isVisible = (currentReq?.body?.mode || 'raw') === 'raw';

                                    const detectLanguage = (data: string) => {
                                        const trimmed = data.trim();
                                        if (trimmed.startsWith('<')) return 'html';
                                        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
                                        return 'json'; // Default to JSON for request body
                                    };

                                    return (
                                        <div className={`absolute inset-0 w-full h-full ${isVisible ? 'block' : 'hidden'}`}>
                                            <Editor
                                                key="request-body-editor"
                                                height="100%"
                                                language={detectLanguage(responseText)}
                                                value={responseText}
                                                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                                onChange={(value) => onRequestChange({ body: { ...currentReq.body, raw: value || '' } })}
                                                options={{
                                                    readOnly: !canEdit,
                                                    fontSize: 13,
                                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                    minimap: { enabled: false },
                                                    scrollBeyondLastLine: false,
                                                    wordWrap: wrapLines ? 'on' : 'off',
                                                    automaticLayout: true,
                                                    padding: { top: 12, bottom: 12 },
                                                    lineNumbers: 'on',
                                                    folding: true,
                                                    renderLineHighlight: 'none',
                                                }}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : currentReq?.body?.mode === 'formdata' ? (
                            <div className={`relative flex-1 rounded-2xl border ${borderCol} overflow-hidden ${isDark ? 'bg-black/40 backdrop-blur-md' : 'bg-white'}`}>
                                <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                                    <FormDataEditor
                                        fields={currentReq?.body?.formdata || []}
                                        canEdit={canEdit}
                                        onChange={(formdata) => onRequestChange({ body: { ...currentReq.body, mode: 'formdata', formdata } })}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className={`relative flex-1 flex flex-col gap-3`}>
                                <div className={`flex-1 rounded-2xl border ${borderCol} overflow-hidden ${isDark ? 'bg-black/40 backdrop-blur-md' : 'bg-white'}`}>
                                    <div className="absolute top-2 right-4 z-10 text-[9px] font-black text-indigo-500 opacity-60 pointer-events-none tracking-widest">QUERY</div>
                                    <Editor
                                        key="gql-query-editor"
                                        height="100%"
                                        language="graphql"
                                        value={currentReq?.body?.graphql?.query || ''}
                                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                        onChange={(query) => onRequestChange({
                                            body: {
                                                ...currentReq.body,
                                                graphql: { ...currentReq.body?.graphql, query: query || '' }
                                            }
                                        })}
                                        options={{
                                            readOnly: !canEdit,
                                            fontSize: 13,
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            padding: { top: 12, bottom: 12 },
                                            lineNumbers: 'on',
                                            renderLineHighlight: 'none',
                                        }}
                                    />
                                </div>
                                <div className={`relative h-[180px] rounded-2xl border ${borderCol} overflow-hidden ${isDark ? 'bg-black/40 backdrop-blur-md' : 'bg-white'}`}>
                                    <div className="absolute top-2 right-4 z-10 text-[9px] font-black text-purple-500 opacity-60 pointer-events-none tracking-widest">VARIABLES</div>
                                    <Editor
                                        key="gql-vars-editor"
                                        height="100%"
                                        language="json"
                                        value={currentReq?.body?.graphql?.variables || ''}
                                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                        onChange={(variables) => onRequestChange({
                                            body: {
                                                ...currentReq.body,
                                                graphql: { ...currentReq.body?.graphql, variables: variables || '' }
                                            }
                                        })}
                                        options={{
                                            readOnly: !canEdit,
                                            fontSize: 12,
                                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                            minimap: { enabled: false },
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            padding: { top: 12, bottom: 12 },
                                            lineNumbers: 'off',
                                            renderLineHighlight: 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'tests' && (
                    <div className={`flex-1 rounded-2xl border ${borderCol} overflow-hidden ${isDark ? 'bg-black/40 backdrop-blur-md' : 'bg-white'}`}>
                        <TestsTab
                            assertions={currentReq?.assertions || []}
                            canEdit={canEdit}
                            onChange={(assertions) => onRequestChange({ assertions })}
                            aiEnabled={aiEnabled}
                            method={currentReq?.method || 'GET'}
                            url={currentReq?.url || ''}
                            lastResponse={currentReq?.lastResponse?.data}
                            onAiGenerateTests={onAiGenerateTests}
                        />
                    </div>
                )}

                {/* Mocking Tab */}
                {activeTab === 'mocking' && (
                    <MockTab
                        requestId={currentReq.id}
                        canEdit={canEdit}
                    />
                )}

                {/* Docs Tab */}
                {activeTab === 'docs' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-300 max-w-3xl">
                        <div className="flex justify-between items-end gap-4">
                            <div className="flex-1">
                                <label className={`text-[10px] font-black ${textColor} opacity-40 uppercase mb-2 block tracking-widest`}>REQUEST NAME</label>
                                <input
                                    value={currentReq.name}
                                    readOnly={!canEdit}
                                    onChange={(e) => onRequestChange({ name: e.target.value })}
                                    className={`w-full text-lg font-bold px-4 py-2.5 ${inputBg} border ${borderCol} ${textColor} rounded-xl focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all ${!canEdit ? 'bg-transparent border-transparent px-0 text-2xl' : ''}`}
                                />
                            </div>
                            <button
                                onClick={onCopyMarkdown}
                                className="mb-0.5 p-2.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-xl flex items-center gap-2 font-black text-[10px] transition-all border border-indigo-500/20 active:scale-95 uppercase tracking-widest"
                                title="Copy as Markdown"
                            >
                                <Copy size={16} /> COPY MKD
                            </button>
                        </div>
                        <div>
                            <label className={`text-[10px] font-black ${textColor} opacity-40 uppercase mb-2 block tracking-widest`}>DESCRIPTION</label>
                            <textarea
                                value={currentReq.description || ''}
                                readOnly={!canEdit}
                                onChange={(e) => onRequestChange({ description: e.target.value })}
                                className={`w-full h-48 p-4 ${inputBg} border ${borderCol} ${textColor} rounded-2xl focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none text-[13px] leading-relaxed transition-all placeholder-gray-600 ${!canEdit ? 'bg-transparent border-transparent px-0 h-auto min-h-[120px] text-gray-400' : ''}`}
                                placeholder="Describe this endpoint's purpose, parameters, and expected results..."
                            />
                        </div>

                        {canEdit && (
                            <div className={`pt-6 border-t ${borderCol}`}>
                                <label className="text-[10px] font-black text-indigo-400 uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                                    <Sparkles size={14} className="animate-pulse" />
                                    AI COPILOT COMMAND
                                </label>
                                <div className="flex flex-col gap-3">
                                    <textarea
                                        value={aiCommand}
                                        onChange={(e) => onAiCommandChange(e.target.value)}
                                        className={`w-full h-24 p-3 border ${isDark ? 'border-indigo-500/20 bg-indigo-500/5 text-indigo-200' : 'border-indigo-200 bg-indigo-50 text-indigo-700'} rounded-2xl focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none text-[11px] leading-relaxed transition-all placeholder-indigo-500/30 font-medium`}
                                        placeholder="Customize how AI refines your documentation..."
                                    />
                                    <button
                                        onClick={onAiGenerate}
                                        disabled={aiLoading}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-3 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 active:scale-[0.98] uppercase tracking-[0.15em]"
                                    >
                                        {aiLoading ? 'REFINING DOCUMENTATION...' : 'REFINE WITH AI AGENT'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Schema Tab */}
                {activeTab === 'schema' && (
                    <div className={`h-full flex flex-col min-h-[500px] rounded-2xl border ${borderCol} overflow-hidden ${isDark ? 'bg-black/40 backdrop-blur-md' : 'bg-white'}`}>
                        <SchemaEditor
                            value={typeof currentReq.responseSchema === 'string' ? currentReq.responseSchema : JSON.stringify(currentReq.responseSchema || {}, null, 2)}
                            onChange={(responseSchema) => onRequestChange({ responseSchema })}
                            theme={theme}
                        />
                    </div>
                )}

                {/* Params Tab */}
                {activeTab === 'params' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">QUERY & PATH PARAMS</h4>
                            {canEdit && (
                                <button
                                    onClick={handleAddParam}
                                    className="p-1 px-3 text-[10px] bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center gap-2 font-black hover:bg-indigo-600/20 border border-indigo-500/30 transition-all uppercase tracking-widest"
                                >
                                    <Plus size={12} /> ADD PARAM
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex text-[9px] font-black text-gray-600 px-3 pb-1 uppercase tracking-widest">
                                <span className="w-20">TYPE</span>
                                <span className="flex-1">KEY</span>
                                <span className="flex-1 ml-4">VALUE</span>
                                <span className="w-8"></span>
                            </div>
                            {(currentReq.params || []).map((p: any, i: number) => (
                                <div key={i} className="flex gap-2 items-center group">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg w-20 text-center uppercase tracking-tighter ${p.type === 'path' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'bg-blue-600/20 text-blue-500 border border-blue-500/20'}`}>
                                        {p.type}
                                    </span>
                                    <input
                                        value={p.key}
                                        readOnly={!canEdit || p.type === 'path'}
                                        onChange={(e) => handleParamChange(i, 'key', e.target.value)}
                                        className={`flex-1 px-3 py-2 ${inputBg} border ${borderCol} ${textColor} rounded-xl text-[12px] font-mono focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all ${p.type === 'path' ? 'opacity-40' : ''}`}
                                        placeholder="Key"
                                    />
                                    <input
                                        value={p.value}
                                        readOnly={!canEdit}
                                        onChange={(e) => handleParamChange(i, 'value', e.target.value)}
                                        className={`flex-1 px-3 py-2 ${inputBg} border ${borderCol} ${textColor} rounded-xl text-[12px] font-mono focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all`}
                                        placeholder="Value"
                                    />
                                    {canEdit && p.type !== 'path' && (
                                        <button
                                            onClick={() => handleRemoveParam(i)}
                                            className="p-1 px-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    {p.type === 'path' && <div className="w-8" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Code Tab */}
                {activeTab === 'code' && (
                    <CodeSnippets request={currentReq} variables={variables} />
                )}
            </div>
        </div>
    );
}
