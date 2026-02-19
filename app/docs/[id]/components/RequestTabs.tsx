'use client';

import React, { useRef } from 'react';
import { Trash2, Plus, Copy, CheckCircle2, Sparkles } from 'lucide-react';
import CodeSnippets from './CodeSnippets';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';

type TabType = 'docs' | 'params' | 'headers' | 'body' | 'code';

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
}: RequestTabsProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const bodyEditorRef = useRef<HTMLDivElement>(null);

    const tabs: TabType[] = ['params', 'headers', 'body', 'docs', 'code'];

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
        <div className={`h-full border-r ${themeClasses.borderCol} flex flex-col min-h-0 min-w-0 ${themeClasses.mainBg}`}>
            {/* Tab Headers */}
            <div className={`flex border-b p-1.5 ${themeClasses.borderCol} ${themeClasses.secondaryBg}`}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`px-4 py-2 font-bold text-[10px] border-b-2 transition-colors capitalize ${activeTab === tab
                            ? 'border-indigo-500 text-indigo-500 bg-indigo-500/5'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className={`flex-1 overflow-y-auto ${activeTab === 'code' ? 'p-0' : 'p-3'}`}>
                {/* Headers Tab */}
                {activeTab === 'headers' && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1 px-1">
                            <span>KEY</span><span>VALUE</span>
                        </div>
                        {(currentReq.headers || []).map((h: any, i: number) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    value={h.key}
                                    readOnly={!canEdit}
                                    onChange={(e) => handleHeaderChange(i, 'key', e.target.value)}
                                    className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px]`}
                                    placeholder="Key"
                                />
                                <input
                                    value={h.value}
                                    readOnly={!canEdit}
                                    onChange={(e) => handleHeaderChange(i, 'value', e.target.value)}
                                    className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px]`}
                                    placeholder="Value"
                                />
                                {canEdit && (
                                    <button
                                        onClick={() => handleRemoveHeader(i)}
                                        className="p-1 text-gray-500 hover:text-red-400"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {canEdit && (
                            <button
                                onClick={handleAddHeader}
                                className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                            >
                                + ADD HEADER
                            </button>
                        )}
                    </div>
                )}

                {/* Body Tab */}
                {activeTab === 'body' && (
                    <div className="h-full flex flex-col min-h-[300px]">
                        <div className="mb-2 flex justify-between items-center text-[10px] text-gray-500 font-bold">
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer text-indigo-400 group">
                                    <div className={`w-3 h-3 rounded-full border ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/20' : 'border-indigo-400 bg-indigo-50'} flex items-center justify-center`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    </div>
                                    RAW (JSON)
                                </label>
                                <button onClick={onCopyBody} className="text-gray-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
                                    <Copy size={10} /> COPY BODY
                                </button>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={onFormatJson}
                                    className="px-1.5 py-0.5 hover:bg-indigo-600/20 text-indigo-400 rounded border border-indigo-600/30 flex items-center gap-1 font-bold transition-all"
                                >
                                    <CheckCircle2 size={10} /> FORMAT JSON
                                </button>
                            )}
                        </div>

                        <div className={`relative flex-1 rounded-xl border ${themeClasses.borderCol} overflow-hidden ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]'}`}>
                            <div
                                ref={bodyEditorRef}
                                className="absolute inset-0 z-0 pointer-events-none overflow-auto"
                            >
                                <SyntaxHighlighter
                                    language="json"
                                    style={theme === 'dark' ? vscDarkPlus : materialLight}
                                    codeTagProps={{
                                        style: {
                                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                            fontSize: '13px',
                                            lineHeight: '20px',
                                            padding: 0
                                        }
                                    }}
                                    customStyle={{
                                        margin: 0,
                                        background: 'transparent',
                                        padding: '12px',
                                        fontSize: '13px',
                                        lineHeight: '20px',
                                        minHeight: '100%',
                                        minWidth: 'max-content',
                                        whiteSpace: 'pre',
                                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                                    }}
                                >
                                    {(currentReq?.body?.raw || '') + ((currentReq?.body?.raw || '').endsWith('\n') ? ' ' : '')}
                                </SyntaxHighlighter>
                            </div>
                            <textarea
                                value={currentReq?.body?.raw || ''}
                                readOnly={!canEdit}
                                spellCheck={false}
                                onScroll={(e) => {
                                    if (bodyEditorRef.current) {
                                        bodyEditorRef.current.scrollTop = e.currentTarget.scrollTop;
                                        bodyEditorRef.current.scrollLeft = e.currentTarget.scrollLeft;
                                    }
                                }}
                                onChange={(e) => onRequestChange({ body: { ...currentReq.body, raw: e.target.value } })}
                                className="absolute inset-0 w-full h-full bg-transparent text-transparent outline-none resize-none overflow-auto selection:bg-indigo-500/30 z-10"
                                placeholder='{ "key": "value" }'
                                style={{
                                    padding: '12px',
                                    fontSize: '13px',
                                    lineHeight: '20px',
                                    whiteSpace: 'pre',
                                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                                    caretColor: theme === 'dark' ? '#fff' : '#6366f1'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Docs Tab */}
                {activeTab === 'docs' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="flex-1">
                                <label className={`text-[10px] font-bold ${themeClasses.textColor} opacity-60 uppercase mb-1 block`}>REQUEST NAME</label>
                                <input
                                    value={currentReq.name}
                                    readOnly={!canEdit}
                                    onChange={(e) => onRequestChange({ name: e.target.value })}
                                    className={`w-full text-base font-bold px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded focus:ring-1 focus:ring-indigo-500 outline-none ${!canEdit ? 'bg-transparent border-transparent px-0' : ''}`}
                                />
                            </div>
                            <button
                                onClick={onCopyMarkdown}
                                className="mb-0.5 ml-2 p-2 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-lg flex items-center gap-2 font-bold text-[10px] transition-all border border-indigo-600/20"
                                title="Copy as Markdown"
                            >
                                <Copy size={14} /> COPY MKD
                            </button>
                        </div>
                        <div>
                            <label className={`text-[10px] font-bold ${themeClasses.textColor} opacity-60 uppercase mb-1 block`}>DESCRIPTION</label>
                            <textarea
                                value={currentReq.description || ''}
                                readOnly={!canEdit}
                                onChange={(e) => onRequestChange({ description: e.target.value })}
                                className={`w-full h-40 p-3 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-[11px] leading-relaxed ${!canEdit ? 'bg-transparent border-transparent px-0 h-auto min-h-[100px]' : ''}`}
                                placeholder="API Documentation..."
                            />
                        </div>

                        {canEdit && (
                            <div className={`pt-3 border-t ${themeClasses.borderCol}`}>
                                <label className="text-[10px] font-bold text-indigo-400 uppercase mb-1.5 flex items-center gap-1.5">
                                    <Sparkles size={12} />
                                    AI GENERATION COMMAND
                                </label>
                                <div className="flex flex-col gap-2">
                                    <textarea
                                        value={aiCommand}
                                        onChange={(e) => onAiCommandChange(e.target.value)}
                                        className={`w-full h-20 p-2 border ${theme === 'dark' ? 'border-indigo-900/50 bg-indigo-950/20 text-indigo-200' : 'border-indigo-200 bg-indigo-50 text-indigo-700'} rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-[10px]`}
                                        placeholder="Custom AI instructions..."
                                    />
                                    <button
                                        onClick={onAiGenerate}
                                        disabled={aiLoading}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {aiLoading ? 'REFINING...' : 'GENERATE / REFINE WITH AI'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Params Tab */}
                {activeTab === 'params' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase">QUERY & PATH PARAMS</h4>
                            {canEdit && (
                                <button
                                    onClick={handleAddParam}
                                    className="p-1 px-1.5 text-[9px] bg-indigo-600/20 text-indigo-400 rounded flex items-center gap-1 font-bold hover:bg-indigo-600/30 border border-indigo-600/30"
                                >
                                    <Plus size={10} /> ADD PARAM
                                </button>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex text-[9px] font-bold text-gray-600 px-1 border-b border-gray-800 pb-1 uppercase">
                                <span className="w-16">TYPE</span>
                                <span className="flex-1">KEY</span>
                                <span className="flex-1 ml-2">VALUE</span>
                                <span className="w-6"></span>
                            </div>
                            {(currentReq.params || []).map((p: any, i: number) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded w-16 text-center uppercase ${p.type === 'path' ? 'bg-orange-600/20 text-orange-400 border border-orange-600/20' : 'bg-blue-600/20 text-blue-500 border border-blue-600/20'}`}>
                                        {p.type}
                                    </span>
                                    <input
                                        value={p.key}
                                        readOnly={!canEdit || p.type === 'path'}
                                        onChange={(e) => handleParamChange(i, 'key', e.target.value)}
                                        className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px] ${p.type === 'path' ? 'opacity-60' : ''}`}
                                        placeholder="Key"
                                    />
                                    <input
                                        value={p.value}
                                        readOnly={!canEdit}
                                        onChange={(e) => handleParamChange(i, 'value', e.target.value)}
                                        className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px]`}
                                        placeholder="Value"
                                    />
                                    {canEdit && p.type !== 'path' && (
                                        <button
                                            onClick={() => handleRemoveParam(i)}
                                            className="p-1 text-gray-500 hover:text-red-400"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                    {p.type === 'path' && <div className="w-6" />}
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
