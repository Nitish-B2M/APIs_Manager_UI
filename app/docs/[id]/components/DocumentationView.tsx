'use client';

import React from 'react';
import { FileText, Copy, Download } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Endpoint, Documentation } from '@/types';
import { getThemeClasses } from '../utils/theme';

interface DocumentationViewProps {
    doc: Documentation | null;
    endpoints: Endpoint[];
    theme: 'light' | 'dark';
    previewContent: string;
    onCopyMarkdown: () => void;
    onDownloadMarkdown: () => void;
    onDownloadPdf: () => void;
    resolveUrl: (ep: any) => string;
    resolveAll: (text: string, ep?: any) => string;
}

export function DocumentationView({
    doc,
    endpoints,
    theme,
    previewContent,
    onCopyMarkdown,
    onDownloadMarkdown,
    onDownloadPdf,
    resolveUrl,
    resolveAll
}: DocumentationViewProps) {
    const themeClasses = getThemeClasses(theme);

    return (
        <div className="flex-1 flex overflow-hidden h-full">
            <div className={`w-56 flex-shrink-0 border-r ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-100 bg-gray-50'} overflow-y-auto p-4 scrollbar-thin`}>
                <h4 className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>Contents</h4>
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
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${ep.method === 'GET' ? 'bg-green-600/20 text-green-500' :
                                ep.method === 'POST' ? 'bg-blue-600/20 text-blue-500' :
                                    'bg-gray-600/20 text-gray-500'
                                }`}>{ep.method}</span>
                            <span className="truncate">{ep.name || 'Untitled'}</span>
                        </a>
                    ))}
                </nav>
            </div>

            <div className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} scrollbar-thin`}>
                <div className="max-w-4xl mx-auto px-8 py-10">
                    <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-700/20">
                        <div>
                            <h1 className={`text-3xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{doc?.title || 'API Documentation'}</h1>
                            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} documented</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={onCopyMarkdown} className={`flex items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'} border rounded-lg text-[10px] font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm`}>
                                <Copy size={12} /> COPY MD
                            </button>
                            <button onClick={onDownloadMarkdown} className={`flex items-center gap-2 px-3 py-1.5 ${theme === 'dark' ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200'} border rounded-lg text-[10px] font-bold hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm`}>
                                <Download size={12} /> MD
                            </button>
                            <button onClick={onDownloadPdf} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-md">
                                <FileText size={12} /> PDF
                            </button>
                        </div>
                    </div>

                    {endpoints.map((ep, idx) => (
                        <div key={idx} id={`endpoint-${idx}`} className="mb-12 scroll-mt-6 last:mb-0">
                            <div className="flex items-center gap-3 mb-4">
                                <span className={`text-[10px] font-black px-2 py-1 rounded shadow-sm ${ep.method === 'GET' ? 'bg-green-600/20 text-green-500 border border-green-500/20' :
                                    ep.method === 'POST' ? 'bg-blue-600/20 text-blue-500 border border-blue-500/20' :
                                        'bg-gray-600/20 text-gray-500 border border-gray-600/20'
                                    }`}>{ep.method}</span>
                                <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{ep.name || 'Untitled'}</h2>
                            </div>

                            <div className={`px-4 py-3 rounded-xl font-mono text-[12px] mb-6 ${theme === 'dark' ? 'bg-gray-800/50 text-indigo-300 border border-gray-700' : 'bg-indigo-50/50 text-indigo-700 border border-indigo-100'} break-all`}>
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
                                                        <td className="px-4 py-3 font-mono text-[11px] text-indigo-400">{h.key}</td>
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
