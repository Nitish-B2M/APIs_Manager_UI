'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../../utils/api';
import { useTheme } from '../../../context/ThemeContext';
import { useBetaMode } from '../../../context/BetaModeContext';
import { FileText, Copy, Download, Beaker, ArrowLeft, Globe, Search } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { getRequestLabel, getRequestBadgeClass } from '../../../utils/requestDisplay';

export default function PublicDocsPage() {
    const { slug } = useParams();
    const router = useRouter();
    const { theme } = useTheme();
    const { isBeta, toggleBeta } = useBetaMode();
    const [searchQuery, setSearchQuery] = useState('');
    const [methodFilter, setMethodFilter] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    const { data: meRes } = useQuery<any>({
        queryKey: ['me'],
        queryFn: api.auth.me,
        retry: false,
        enabled: typeof window !== 'undefined' && !!localStorage.getItem('token')
    });
    const me = meRes?.data;
    const shouldCopySingleLine = me?.settings?.copySingleLine === true;
    const processCopyText = (text: string) => shouldCopySingleLine ? text.replace(/\s+/g, '') : text;

    const { data: docRes, isLoading, error } = useQuery({
        queryKey: ['public-docs', slug],
        queryFn: () => api.documentation.getPublic(slug as string),
        enabled: !!slug,
    });

    const doc = docRes?.data;
    const endpoints = doc?.requests || [];

    const filteredEndpoints = endpoints.filter((ep: any) => {
        const matchesSearch = ep.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ep.url?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMethod = !methodFilter || ep.method === methodFilter;
        return matchesSearch && matchesMethod;
    });

    // Scroll Spy Logic
    React.useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-20% 0px -70% 0px' }
        );

        const sections = document.querySelectorAll('section[id^="request-"]');
        sections.forEach((section) => observer.observe(section));

        return () => {
            sections.forEach((section) => observer.unobserve(section));
        };
    }, [filteredEndpoints]);

    const resolveAll = (text: string) => {
        if (!text) return '';
        // In public mode we don't resolve env vars yet as we don't have an environment
        return text;
    };

    const resolveUrl = (ep: any) => {
        return ep.url || '';
    };

    if (isLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[#249d9f] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium animate-pulse">Fetching public documentation...</p>
                </div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <div className="max-w-md text-center px-6">
                    <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">404 - Not Found</h1>
                    <p className="text-gray-500 mb-8 font-medium">This documentation might be private or doesn't exist.</p>
                    <button onClick={() => router.push('/')} className="px-6 py-3 bg-[#1a7a7c] hover:bg-[#1a7a7c] text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // If Beta mode is OFF, we just show a "beta only" message for now or the raw JSON
    // Actually, user said: "when off show the old one". The old one for public/:slug was raw JSON (browser default).
    // I'll implement a basic professional view but hide the "Enhanced" features if isBeta is false.
    // Or better, I'll follow the plan: Phase 1.1 Public Doc Viewer Page is a beta feature.

    if (!isBeta) {
        return (
            <div className={`min-h-screen relative overflow-hidden ${theme === 'dark' ? 'bg-[#0a0a0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
                {/* Blurred Background Preview */}
                <div className="absolute inset-0 z-0 opacity-20 blur-xl pointer-events-none scale-105 select-none overflow-hidden">
                    <div className="max-w-4xl mx-auto px-6 py-12">
                        <div className="h-12 w-full bg-gray-700/50 mb-16 rounded-2xl"></div>
                        <div className="space-y-12">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-700/50 rounded-2xl"></div>
                                        <div className="h-8 w-64 bg-gray-700/50 rounded-lg"></div>
                                    </div>
                                    <div className="h-20 w-full bg-[#249d9f]/20 rounded-2xl"></div>
                                    <div className="h-32 w-full bg-gray-700/30 rounded-2xl"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Modal */}
                <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
                    <div className="max-w-xl p-10 rounded-[2.5rem] border border-[#249d9f]/20 bg-[#249d9f]/5 backdrop-blur-[32px] text-center shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] animate-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-[#1a7a7c] rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-[#1a7a7c]/20 transform hover:scale-110 transition-transform">
                            <Beaker size={40} />
                        </div>
                        <h2 className="text-3xl font-black mb-6 tracking-tight">Beta Feature Required</h2>
                        <p className="text-gray-400 mb-10 leading-relaxed text-lg px-4 font-medium">
                            The rendered Documentation Viewer is currently in <span className="text-[#2ec4c7] font-bold">Phase 1 Beta</span>.
                            Enable it now to unlock this interactive preview.
                        </p>
                        <div className="flex flex-col gap-4 px-8">
                            <button
                                onClick={() => {
                                    toggleBeta();
                                    toast.success('Beta Mode Enabled! Enjoy the view.');
                                }}
                                className="px-10 py-5 bg-[#1a7a7c] hover:bg-[#249d9f] text-white rounded-2xl font-black text-lg shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                            >
                                <Globe size={24} /> Enable Beta Mode
                            </button>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-4">No login required • Safe to enable</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-[#0a0a0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
            {/* Simple Public Header */}
            <header className={`h-14 border-b flex items-center justify-between px-6 flex-shrink-0 backdrop-blur-md ${theme === 'dark' ? 'bg-[#0a0a0f]/80 border-white/5' : 'bg-white/80 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#1a7a7c] rounded-lg flex items-center justify-center text-white font-black text-[10px]">P</div>
                    <div>
                        <h1 className="text-xs font-black truncate max-w-[200px] leading-tight">{doc.title}</h1>
                        <p className="text-[9px] text-[#249d9f] font-bold uppercase tracking-widest leading-none mt-0.5">Public Documentation</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#249d9f]/10 border border-[#249d9f]/20 text-[8px] font-black uppercase tracking-widest text-[#249d9f]">
                        <Beaker size={8} /> Beta Viewer
                    </span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - Fixed height, scroll only on overflow */}
                <aside className={`w-64 border-r hidden lg:flex flex-col h-full ${theme === 'dark' ? 'bg-[#0a0a0f]/40 border-white/5' : 'bg-white border-gray-100'}`}>
                    <div className="p-4 border-b border-white/5 flex-shrink-0 space-y-3">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Table of Contents</h4>

                        {/* Search Input */}
                        <div className="relative group">
                            <Search size={12} className={`absolute left-0 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-gray-600 group-focus-within:text-[#249d9f]' : 'text-gray-400 group-focus-within:text-[#249d9f]'}`} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search endpoints..."
                                className={`w-full bg-transparent border-b pl-5 py-1.5 text-[10px] outline-none transition-all ${theme === 'dark' ? 'border-white/10 focus:border-[#249d9f] text-white placeholder:text-gray-700' : 'border-gray-200 focus:border-[#249d9f] text-gray-900'}`}
                            />
                        </div>

                        {/* Method Filters with count badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {['GET', 'POST', 'PUT', 'DELETE'].map(method => {
                                const count = endpoints.filter((e: any) => e.method === method).length;
                                if (count === 0) return null;
                                const colors: Record<string, { bg: string; text: string }> = {
                                    GET: { bg: '#1A3A2A', text: '#3FB950' }, POST: { bg: '#1E2D3D', text: '#58A6FF' },
                                    PUT: { bg: '#1E2D3D', text: '#58A6FF' }, DELETE: { bg: '#3D1A1A', text: '#F85149' },
                                };
                                const c = colors[method] || { bg: '#21262D', text: '#8B949E' };
                                const isActive = methodFilter === method;
                                return (
                                    <button key={method} onClick={() => setMethodFilter(isActive ? null : method)}
                                        style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700, border: 'none', background: isActive ? c.text : c.bg, color: isActive ? 'white' : c.text, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {method} <span style={{ fontSize: 9, opacity: 0.7 }}>{count}</span>
                                    </button>
                                );
                            })}
                            {methodFilter && (
                                <button onClick={() => setMethodFilter(null)} style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, border: 'none', background: 'rgba(248,81,73,0.1)', color: '#F85149' }}>
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                    {/* TOC items: 32px height, 16px left padding, active = 2px left border */}
                    <nav className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '8px 0' }}>
                        {filteredEndpoints.length > 0 ? (
                            filteredEndpoints.map((ep: any, idxArr: number) => {
                                const isActive = activeId === `request-${ep.id || idxArr}`;
                                return (
                                    <a
                                        key={ep.id || idxArr}
                                        href={`#request-${ep.id || idxArr}`}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, height: 32, paddingLeft: 16, paddingRight: 12,
                                            textDecoration: 'none', transition: 'all 0.1s',
                                            background: isActive ? '#1C2128' : 'transparent',
                                            borderLeft: isActive ? '2px solid #249d9f' : '2px solid transparent',
                                            color: isActive ? '#E6EDF3' : '#8B949E',
                                        }}
                                    >
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${getRequestBadgeClass(ep.method, ep.protocol)}`} style={{ flexShrink: 0 }}>{getRequestLabel(ep.method, ep.protocol)}</span>
                                        <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.name || 'Untitled'}</span>
                                    </a>
                                );
                            })
                        ) : (
                            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#6E7681' }}>No results found</div>
                        )}
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar">
                    <div className="max-w-[1400px] mx-auto px-6 py-8">
                        <div className="mb-12">
                            <h1 className="text-3xl lg:text-4xl font-black mb-2 tracking-tight">{doc.title}</h1>
                            {doc.content?.collection?.description && (
                                <p className="text-base text-gray-500 leading-relaxed font-medium max-w-2xl">{doc.content.collection.description}</p>
                            )}
                        </div>

                        <div className="space-y-16">
                            {filteredEndpoints.map((ep: any, idxArr: number) => (
                                <section key={ep.id || idxArr} id={`request-${ep.id || idxArr}`} className="scroll-mt-20">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                                        {/* Left Column: Info */}
                                        <div className="space-y-6">
                                            {/* Endpoint heading: 24px bold, inline method pill */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <span className={getRequestBadgeClass(ep.method, ep.protocol)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{getRequestLabel(ep.method, ep.protocol)}</span>
                                                <h2 style={{ fontSize: 24, fontWeight: 700, color: '#E6EDF3', margin: 0 }}>{ep.name || 'Untitled Request'}</h2>
                                            </div>

                                            <div className={`group relative p-3 rounded-xl border font-mono text-xs transition-all hover:shadow-lg hover:shadow-[#249d9f]/5 ${theme === 'dark' ? 'bg-[#249d9f]/5 border-[#249d9f]/20 text-[#2ec4c7]' : 'bg-indigo-50 border-indigo-200 text-[#1a7a7c]'}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="truncate pr-4 font-bold">{resolveUrl(ep)}</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(processCopyText(resolveUrl(ep)));
                                                            toast.success('URL copied');
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all"
                                                        title="Copy URL"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {ep.description && (
                                                <div>
                                                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 px-1">Description</h3>
                                                    <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">{resolveAll(ep.description)}</p>
                                                </div>
                                            )}

                                            {ep.headers && Array.isArray(ep.headers) && ep.headers.length > 0 && (
                                                <div>
                                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2 px-1">Headers</h3>
                                                    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-white shadow-sm'}`}>
                                                        <table className="w-full text-[11px]">
                                                            <thead>
                                                                <tr className={theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}>
                                                                    <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-gray-500">Key</th>
                                                                    <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[9px] text-gray-500">Value</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {ep.headers.map((h: any, hi: number) => (
                                                                    <tr key={hi} className="hover:bg-white/[0.02] transition-colors">
                                                                        <td className="px-4 py-2.5 font-mono text-[#2ec4c7] font-bold">{h.key}</td>
                                                                        <td className="px-4 py-2.5 text-gray-400 truncate max-w-[200px]">{h.value}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Code blocks (Request & Response) */}
                                        <div className="space-y-4">
                                            {ep.body?.raw && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Request Body</h3>
                                                    </div>
                                                    <div className="relative group" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128', minHeight: 200 }}>
                                                        <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => { navigator.clipboard.writeText(processCopyText(ep.body.raw)); toast.success('Body copied'); }}
                                                                style={{ padding: 6, borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#8B949E' }}
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                        <Editor
                                                            height={Math.max(ep.body.raw.split('\n').length * 20 + 32, 200) + "px"}
                                                            language="json"
                                                            value={ep.body.raw}
                                                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                                            options={{
                                                                readOnly: true,
                                                                fontSize: 12,
                                                                fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                                minimap: { enabled: false },
                                                                scrollBeyondLastLine: false,
                                                                wordWrap: 'on',
                                                                automaticLayout: true,
                                                                padding: { top: 16, bottom: 16 },
                                                                renderLineHighlight: 'none',
                                                                lineNumbers: 'off',
                                                                folding: true,
                                                                scrollbar: { vertical: 'hidden', horizontal: 'hidden' }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Response Preview */}
                                            {ep.lastResponse?.data && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between px-1">
                                                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">Example Response</h3>
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">{ep.lastResponse.status}</span>
                                                    </div>
                                                    <div className="relative group" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128', minHeight: 400 }}>
                                                        <div className="absolute right-4 top-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => { navigator.clipboard.writeText(processCopyText(JSON.stringify(ep.lastResponse.data, null, 2))); toast.success('Response copied'); }}
                                                                style={{ padding: 6, borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#8B949E' }}
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                        <Editor
                                                            height={Math.max(JSON.stringify(ep.lastResponse.data, null, 2).split('\n').length * 20 + 32, 400) + "px"}
                                                            language="json"
                                                            value={JSON.stringify(ep.lastResponse.data, null, 2)}
                                                            theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                                            options={{
                                                                readOnly: true,
                                                                fontSize: 12,
                                                                fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                                                minimap: { enabled: false },
                                                                scrollBeyondLastLine: false,
                                                                wordWrap: 'on',
                                                                automaticLayout: true,
                                                                padding: { top: 16, bottom: 16 },
                                                                renderLineHighlight: 'none',
                                                                lineNumbers: 'off',
                                                                folding: true,
                                                                scrollbar: { vertical: 'auto', horizontal: 'hidden' }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {idxArr < endpoints.length - 1 && <div className="mt-16 h-px bg-white/5"></div>}
                                </section>
                            ))}
                        </div>

                        <footer className="mt-20 pt-8 border-t border-white/5 text-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Generated by DevManus Docs Manager • Beta v1.0</p>
                        </footer>
                    </div>
                </main>
            </div>
        </div>
    );
}
