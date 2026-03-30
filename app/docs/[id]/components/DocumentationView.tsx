'use client';

import React, { useState } from 'react';
import { Loader2, Globe, Copy, Download, FileText, Zap, Sparkles, FileQuestion } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Endpoint, Documentation } from '@/types';
import { getThemeClasses, getRequestLabel, getRequestBadgeClass } from '../utils/theme';

const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-black/10 min-h-[200px]">
            <Loader2 size={20} className="animate-spin text-[#249d9f]" />
        </div>
    )
});

interface DocumentationViewProps {
    doc: Documentation | null;
    endpoints: Endpoint[];
    theme: 'light' | 'dark';
    previewContent: string;
    onCopyMarkdown: () => void;
    onDownloadMarkdown: () => void;
    onDownloadPdf: () => void;
    onGenerateAiReadme: () => Promise<void>;
    resolveUrl: (ep: any) => string;
    resolveAll: (text: string, ep?: any) => string;
    publicSlug?: string | null;
    onExportPostman?: () => void;
    onExportOpenApi?: () => void;
}

export function DocumentationView({
    doc,
    endpoints,
    theme,
    previewContent,
    onCopyMarkdown,
    onDownloadMarkdown,
    onDownloadPdf,
    onGenerateAiReadme,
    resolveUrl,
    resolveAll,
    publicSlug,
    onExportPostman,
    onExportOpenApi
}: DocumentationViewProps) {
    const themeClasses = getThemeClasses(theme);
    const [isGenerating, setIsGenerating] = useState(false);
    const isEmpty = endpoints.length === 0;

    const handleGenerateAiReadme = async () => {
        setIsGenerating(true);
        try {
            await onGenerateAiReadme();
        } finally {
            setIsGenerating(false);
        }
    };

    const disabledBtn = 'opacity-40 cursor-not-allowed pointer-events-none';

    return (
        <div className="flex-1 flex overflow-hidden h-full">
            <div className={`w-56 flex-shrink-0 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50'} overflow-y-auto p-4 scrollbar-thin`}>
                <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Contents</h4>
                {isEmpty ? (
                    <p className={`text-[11px] italic ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>No endpoints yet</p>
                ) : (
                <nav className="space-y-1">
                    {endpoints.map((ep, idx) => (
                        <a
                            key={idx}
                            href={`#endpoint-${idx}`}
                            onClick={(e) => {
                                e.preventDefault();
                                document.getElementById(`endpoint-${idx}`)?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[11px] ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-600 hover:bg-white'} transition-colors`}
                        >
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${getRequestBadgeClass(ep.method, ep.protocol)}`}>{getRequestLabel(ep.method, ep.protocol)}</span>
                            <span className="truncate">{ep.name || 'Untitled'}</span>
                        </a>
                    ))}
                </nav>
                )}
            </div>

            <div className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} scrollbar-thin`}>
                <div className="max-w-4xl mx-auto px-8 py-10">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-700/20">
                        <div>
                            <h1 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc?.title || 'API Documentation'}</h1>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} documented</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {publicSlug && (
                                <a
                                    href={`/public/${publicSlug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600/20 text-green-500 border border-green-500/30 rounded-lg text-[10px] font-bold hover:bg-green-600/30 transition-all shadow-sm"
                                    title="Open Public Documentation Page"
                                >
                                    <Globe size={12} /> View Public
                                </a>
                            )}
                            <button
                                onClick={handleGenerateAiReadme}
                                disabled={isGenerating || isEmpty}
                                className={`flex items-center gap-2 px-3 py-1.5 bg-[#1a7a7c]/20 text-[#2ec4c7] border border-[#249d9f]/30 rounded-lg text-[10px] font-bold hover:bg-[#1a7a7c]/30 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none`}
                                title={isEmpty ? 'Add requests to generate documentation' : undefined}
                            >
                                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                AI README
                            </button>
                            <button onClick={onCopyMarkdown} disabled={isEmpty} className={`flex items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'} border rounded-lg text-[10px] font-bold hover:bg-[#1a7a7c] hover:text-white hover:border-[#1a7a7c] transition-all shadow-sm ${isEmpty ? disabledBtn : ''}`}>
                                <Copy size={12} /> COPY MD
                            </button>
                            <button onClick={onDownloadMarkdown} disabled={isEmpty} className={`flex items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'} border rounded-lg text-[10px] font-bold hover:bg-[#1a7a7c] hover:text-white hover:border-[#1a7a7c] transition-all shadow-sm ${isEmpty ? disabledBtn : ''}`}>
                                <Download size={12} /> MD
                            </button>

                            {onExportPostman && (
                                <button onClick={onExportPostman} disabled={isEmpty} className={`flex items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'} border rounded-lg text-[10px] font-bold hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all shadow-sm ${isEmpty ? disabledBtn : ''}`}>
                                    <Download size={12} /> POSTMAN
                                </button>
                            )}

                            {onExportOpenApi && (
                                <button onClick={onExportOpenApi} disabled={isEmpty} className={`flex items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'} border rounded-lg text-[10px] font-bold hover:bg-[#1a7a7c] hover:text-white hover:border-[#1a7a7c] transition-all shadow-sm ${isEmpty ? disabledBtn : ''}`}>
                                    <Zap size={12} /> OPENAPI 3.1
                                </button>
                            )}
                            <button onClick={onDownloadPdf} disabled={isEmpty} className={`flex items-center gap-2 px-3 py-1.5 bg-[#1a7a7c] text-white rounded-lg text-[10px] font-bold hover:bg-[#1a7a7c] transition-all shadow-md ${isEmpty ? disabledBtn : ''}`}>
                                <FileText size={12} /> PDF
                            </button>
                        </div>
                    </div>

                    {isEmpty && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div style={{ width: 64, height: 64, borderRadius: 16, background: theme === 'dark' ? '#1C2128' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <FileQuestion size={28} style={{ color: theme === 'dark' ? '#484F58' : '#9CA3AF' }} />
                            </div>
                            <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Documentation is empty</h3>
                            <p className={`text-sm max-w-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Add requests to this collection from the sidebar, then switch back here to generate documentation, export, or share.
                            </p>
                        </div>
                    )}

                    {endpoints.map((ep, idx) => (
                        <div key={idx} id={`endpoint-${idx}`} className="mb-12 scroll-mt-6 last:mb-0">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded ${getRequestBadgeClass(ep.method, ep.protocol)}`}>{getRequestLabel(ep.method, ep.protocol)}</span>
                                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ep.name || 'Untitled'}</h2>
                            </div>

                            <div className={`px-4 py-3 rounded-xl font-mono text-[12px] mb-6 ${theme === 'dark' ? 'bg-gray-800/50 text-[#2ec4c7] border border-gray-700' : 'bg-indigo-50/50 text-[#1a7a7c] border border-indigo-100'} break-all`}>
                                {resolveUrl(ep)}
                            </div>

                            {ep.description && (
                                <div className="mb-8">
                                    <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Description</h3>
                                    <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {resolveAll(ep.description, ep)}
                                    </p>
                                </div>
                            )}

                            {ep.headers && ep.headers.length > 0 && ep.headers.some((h: any) => h.key) && (
                                <div className="mb-8">
                                    <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Headers</h3>
                                    <div className={`rounded-xl border ${theme === 'dark' ? 'border-gray-700 overflow-hidden' : 'border-gray-200 overflow-hidden shadow-sm'}`}>
                                        <table className="w-full text-xs">
                                            <thead className={theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}>
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-widest text-[9px]">Key</th>
                                                    <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-widest text-[9px]">Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700/10">
                                                {ep.headers.filter((h: any) => h.key).map((h: any, hi: number) => (
                                                    <tr key={hi} className={theme === 'dark' ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50/50 transition-colors'}>
                                                        <td className="px-4 py-3 font-mono text-[11px] text-[#2ec4c7]">{h.key}</td>
                                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{resolveAll(h.value, ep)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {ep.body?.raw && (
                                <div className="mb-8">
                                    <h3 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Request Body</h3>
                                    <div className="h-60 rounded-xl overflow-hidden border border-gray-700/20 shadow-lg">
                                        <Editor
                                            height="100%"
                                            language="json"
                                            value={resolveAll(ep.body.raw, ep)}
                                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                            options={{
                                                readOnly: true,
                                                fontSize: 13,
                                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                                minimap: { enabled: false },
                                                scrollBeyondLastLine: false,
                                                wordWrap: 'on',
                                                automaticLayout: true,
                                                padding: { top: 12, bottom: 12 },
                                                lineNumbers: 'on',
                                                folding: true,
                                                renderLineHighlight: 'none',
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {idx < endpoints.length - 1 && <hr className="my-12 border-gray-700/20" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
