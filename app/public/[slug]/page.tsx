'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { api } from '../../../utils/api';
import { useTheme } from '../../../context/ThemeContext';
import { ChevronDown, ChevronRight, Globe, ExternalLink, Copy, Check, FileText, CheckSquare, Square } from 'lucide-react';

interface PublicRequest {
    id: string;
    name: string;
    method: string;
    url: string;
    description: string;
    body: any;
    headers: { key: string; value: string }[];
    params?: { key: string; value: string; type?: string }[];
    lastResponse?: {
        status: number;
        statusText: string;
        time: number;
        data: unknown;
        timestamp: string;
    } | null;
    folderId: string | null;
    order: number;
}

interface PublicFolder {
    id: string;
    name: string;
    description?: string;
    parentId?: string | null;
    order: number;
}

const METHOD_COLORS: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400 border-green-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    PATCH: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_COLORS: Record<string, string> = {
    '2': 'bg-green-500/20 text-green-400 border-green-500/30',
    '3': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    '4': 'bg-red-500/20 text-red-400 border-red-500/30',
    '5': 'bg-red-500/20 text-red-300 border-red-500/30',
};

function getStatusColor(status: number): string {
    const key = String(status).charAt(0);
    return STATUS_COLORS[key] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

// ─── Copy Button Component ───────────────────────────────────────
function CopyButton({ text, label, theme }: { text: string; label?: string; theme: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    }, [text]);

    return (
        <button
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : theme === 'dark'
                    ? 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700'
                    : 'bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
            title={copied ? 'Copied!' : (label || 'Copy')}
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {label && <span>{copied ? 'Copied!' : label}</span>}
            {!label && copied && <span>Copied!</span>}
        </button>
    );
}

// ─── Markdown Generation Utilities ───────────────────────────────
function formatBodyForDisplay(body: any): string | null {
    if (!body) return null;

    // Handle body with .raw property (Postman-style)
    if (body.raw) {
        try {
            const parsed = JSON.parse(body.raw);
            return JSON.stringify(parsed, null, 2);
        } catch {
            return body.raw;
        }
    }

    // Handle body that is directly a JSON object (but not empty {})
    if (typeof body === 'object') {
        const keys = Object.keys(body);
        // Skip if it's just { mode, raw } wrapper with no raw
        if (keys.length === 0 || (keys.length <= 2 && keys.every(k => ['mode', 'raw'].includes(k)) && !body.raw)) {
            return null;
        }
        // If it has unexpected keys beyond mode/raw, render it
        if (!keys.every(k => ['mode', 'raw'].includes(k))) {
            return JSON.stringify(body, null, 2);
        }
    }

    return null;
}

function requestToMarkdown(request: PublicRequest): string {
    const lines: string[] = [];
    lines.push(`## ${request.method} ${request.url || '/untitled'}`);
    if (request.name) lines.push(`**${request.name}**`);
    lines.push('');

    if (request.description) {
        lines.push(request.description);
        lines.push('');
    }

    // Headers
    const validHeaders = request.headers?.filter(h => h.key) || [];
    if (validHeaders.length > 0) {
        lines.push('### Headers');
        lines.push('| Key | Value |');
        lines.push('| --- | --- |');
        validHeaders.forEach(h => lines.push(`| ${h.key} | ${h.value} |`));
        lines.push('');
    }

    // Params  
    const validParams = request.params?.filter(p => p.key) || [];
    if (validParams.length > 0) {
        lines.push('### Parameters');
        lines.push('| Key | Value | Type |');
        lines.push('| --- | --- | --- |');
        validParams.forEach(p => lines.push(`| ${p.key} | ${p.value} | ${p.type || '-'} |`));
        lines.push('');
    }

    // Body
    const bodyStr = formatBodyForDisplay(request.body);
    if (bodyStr) {
        lines.push('### Body');
        lines.push('```json');
        lines.push(bodyStr);
        lines.push('```');
        lines.push('');
    }

    // Response
    if (request.lastResponse) {
        const resp = request.lastResponse;
        lines.push(`### Response (${resp.status} ${resp.statusText})${resp.time ? ` — ${resp.time}ms` : ''}`);
        if (resp.data) {
            lines.push('```json');
            lines.push(typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2));
            lines.push('```');
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    return lines.join('\n');
}

// ─── Main Page Component ─────────────────────────────────────────
export default function PublicDocsPage() {
    const params = useParams();
    const slug = params?.slug as string;
    const { theme } = useTheme();

    const [doc, setDoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
    const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!slug) return;
        setLoading(true);
        api.documentation.getPublic(slug)
            .then(res => {
                if (res.status) {
                    setDoc(res.data);
                } else {
                    setError(res.message || 'Documentation not found');
                }
            })
            .catch(() => setError('Failed to load documentation'))
            .finally(() => setLoading(false));
    }, [slug]);

    const toggleRequest = (id: string) => {
        setExpandedRequests(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelect = useCallback((id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedRequests(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = useCallback((requests: PublicRequest[]) => {
        setSelectedRequests(prev => {
            if (prev.size === requests.length) return new Set();
            return new Set(requests.map(r => r.id));
        });
    }, []);

    const copySelectedMarkdown = useCallback(async (requests: PublicRequest[], title: string) => {
        const selected = requests.filter(r => selectedRequests.has(r.id));
        if (selected.length === 0) return;

        const md = `# ${title}\n\n${selected.map(requestToMarkdown).join('\n')}`;
        try {
            await navigator.clipboard.writeText(md);
        } catch { /* ignore */ }
    }, [selectedRequests]);

    // ─── Theme vars ──────────────────────────────────────────────
    const mainBg = theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm';
    const headerBg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const codeBg = theme === 'dark' ? 'bg-gray-950 border-gray-800' : 'bg-gray-100 border-gray-200';
    const tableBg = theme === 'dark' ? 'bg-gray-950/50' : 'bg-gray-50';
    const tableHeaderBg = theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100';
    const tableBorder = theme === 'dark' ? 'border-gray-800' : 'border-gray-200';

    if (loading) {
        return (
            <div className={`min-h-screen ${mainBg} flex items-center justify-center`}>
                <div className="animate-pulse text-indigo-500 text-lg">Loading documentation...</div>
            </div>
        );
    }

    if (error || !doc) {
        return (
            <div className={`min-h-screen ${mainBg} flex items-center justify-center`}>
                <div className="text-center">
                    <Globe size={48} className="mx-auto mb-4 text-gray-500" />
                    <h2 className="text-xl font-bold mb-2">Documentation Not Found</h2>
                    <p className={subTextColor}>{error || 'This documentation does not exist or is not public.'}</p>
                </div>
            </div>
        );
    }

    const requests: PublicRequest[] = doc.requests || [];
    const folders: PublicFolder[] = doc.folders || [];

    // Group requests by folder
    const rootRequests = requests.filter(r => !r.folderId);
    const folderMap = new Map<string, PublicRequest[]>();
    requests.forEach(r => {
        if (r.folderId) {
            const list = folderMap.get(r.folderId) || [];
            list.push(r);
            folderMap.set(r.folderId, list);
        }
    });

    const rootFolders = folders.filter(f => !f.parentId);
    const allSelected = selectedRequests.size === requests.length && requests.length > 0;

    // ─── Render a single request ─────────────────────────────────
    const renderRequest = (request: PublicRequest) => {
        const isExpanded = expandedRequests.has(request.id);
        const isSelected = selectedRequests.has(request.id);
        const methodColor = METHOD_COLORS[request.method] || 'bg-gray-500/20 text-gray-400';

        const bodyStr = formatBodyForDisplay(request.body);
        const validHeaders = request.headers?.filter(h => h.key) || [];
        const validParams = request.params?.filter((p: any) => p.key) || [];
        const resp = request.lastResponse;

        return (
            <div key={request.id} className={`${cardBg} border rounded-lg overflow-hidden transition-all`}>
                {/* ─── Collapsed Header ─── */}
                <div className="flex items-center">
                    {/* Checkbox */}
                    <button
                        onClick={(e) => toggleSelect(request.id, e)}
                        className={`flex-shrink-0 ml-3 p-0.5 rounded transition-colors ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                            }`}
                        title={isSelected ? 'Deselect' : 'Select for markdown export'}
                    >
                        {isSelected
                            ? <CheckSquare size={16} className="text-indigo-400" />
                            : <Square size={16} className={subTextColor} />
                        }
                    </button>

                    <button
                        onClick={() => toggleRequest(request.id)}
                        className="flex-1 flex items-center gap-3 px-3 py-3 text-left hover:bg-opacity-80 transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase border ${methodColor}`}>
                            {request.method}
                        </span>
                        <span className="font-mono text-sm flex-1 truncate">{request.url || '/untitled'}</span>
                        <span className={`text-xs ${subTextColor} truncate max-w-48`}>{request.name}</span>
                    </button>
                </div>

                {/* ─── Expanded Content ─── */}
                {isExpanded && (
                    <div className={`px-4 pb-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                        {/* Description */}
                        {request.description && (
                            <p className={`text-sm mt-3 ${subTextColor}`}>{request.description}</p>
                        )}

                        {/* ─── Headers Table ─── */}
                        {validHeaders.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-indigo-400">Headers</h4>
                                <div className={`border rounded-md overflow-hidden ${tableBorder}`}>
                                    <table className="w-full text-xs font-mono">
                                        <thead>
                                            <tr className={tableHeaderBg}>
                                                <th className={`text-left py-1.5 px-3 font-semibold border-b ${tableBorder}`}>Key</th>
                                                <th className={`text-left py-1.5 px-3 font-semibold border-b ${tableBorder}`}>Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className={tableBg}>
                                            {validHeaders.map((h, i) => (
                                                <tr key={i} className={`border-b last:border-b-0 ${tableBorder}`}>
                                                    <td className="py-1.5 px-3 text-indigo-400">{h.key}</td>
                                                    <td className="py-1.5 px-3">{h.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─── Parameters Table ─── */}
                        {validParams.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-indigo-400">Parameters</h4>
                                <div className={`border rounded-md overflow-hidden ${tableBorder}`}>
                                    <table className="w-full text-xs font-mono">
                                        <thead>
                                            <tr className={tableHeaderBg}>
                                                <th className={`text-left py-1.5 px-3 font-semibold border-b ${tableBorder}`}>Key</th>
                                                <th className={`text-left py-1.5 px-3 font-semibold border-b ${tableBorder}`}>Value</th>
                                                <th className={`text-left py-1.5 px-3 font-semibold border-b ${tableBorder}`}>Type</th>
                                            </tr>
                                        </thead>
                                        <tbody className={tableBg}>
                                            {validParams.map((p: any, i: number) => (
                                                <tr key={i} className={`border-b last:border-b-0 ${tableBorder}`}>
                                                    <td className="py-1.5 px-3 text-indigo-400">{p.key}</td>
                                                    <td className="py-1.5 px-3">{p.value}</td>
                                                    <td className={`py-1.5 px-3 ${subTextColor}`}>{p.type || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ─── Body ─── */}
                        {bodyStr && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Body</h4>
                                    <CopyButton text={bodyStr} theme={theme} />
                                </div>
                                <pre className={`${codeBg} border rounded-md p-3 text-xs font-mono overflow-auto max-h-60 whitespace-pre-wrap`}>
                                    {bodyStr}
                                </pre>
                            </div>
                        )}

                        {/* ─── Response ─── */}
                        {resp && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Response</h4>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(resp.status)}`}>
                                            {resp.status} {resp.statusText}
                                        </span>
                                        {resp.time && (
                                            <span className={`text-xs ${subTextColor}`}>{resp.time}ms</span>
                                        )}
                                    </div>
                                    <CopyButton
                                        text={typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2)}
                                        theme={theme}
                                    />
                                </div>
                                <pre className={`${codeBg} border rounded-md p-3 text-xs font-mono overflow-auto max-h-72 whitespace-pre-wrap`}>
                                    {typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* ─── Copy as Markdown (individual) ─── */}
                        <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
                            <CopyButton
                                text={requestToMarkdown(request)}
                                label="Copy as Markdown"
                                theme={theme}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderFolder = (folder: PublicFolder) => {
        const folderRequests = folderMap.get(folder.id) || [];
        const childFolders = folders.filter(f => f.parentId === folder.id);

        return (
            <div key={folder.id} className="mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
                    📁 {folder.name}
                </h3>
                {folder.description && (
                    <p className={`text-xs ${subTextColor} mb-3`}>{folder.description}</p>
                )}
                <div className="space-y-2 ml-2">
                    {folderRequests.map(renderRequest)}
                    {childFolders.map(renderFolder)}
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${mainBg}`}>
            {/* Header */}
            <div className={`${headerBg} border-b sticky top-0 z-40`}>
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">API</div>
                        <div>
                            <h1 className="font-bold text-lg">{doc.title}</h1>
                            <p className={`text-xs ${subTextColor}`}>Public API Documentation</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Select All / Deselect All */}
                        <button
                            onClick={() => toggleSelectAll(requests)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${theme === 'dark'
                                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                                }`}
                            title={allSelected ? 'Deselect all' : 'Select all'}
                        >
                            {allSelected
                                ? <CheckSquare size={14} className="text-indigo-400" />
                                : <Square size={14} />
                            }
                            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                        </button>

                        {/* Copy Selected as Markdown */}
                        <button
                            onClick={() => copySelectedMarkdown(requests, doc.title)}
                            disabled={selectedRequests.size === 0}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedRequests.size > 0
                                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
                                : theme === 'dark'
                                    ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                }`}
                            title={selectedRequests.size === 0 ? 'Select requests first' : `Copy ${selectedRequests.size} request(s) as Markdown`}
                        >
                            <FileText size={14} />
                            <span>Copy Markdown{selectedRequests.size > 0 ? ` (${selectedRequests.size})` : ''}</span>
                        </button>

                        <span className="px-2.5 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium border border-green-500/30">
                            Public
                        </span>
                        <span className={`text-xs ${subTextColor}`}>{requests.length} endpoints</span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-8">
                {/* Folder sections */}
                {rootFolders.map(renderFolder)}

                {/* Root-level requests */}
                {rootRequests.length > 0 && (
                    <div className="mb-6">
                        {rootFolders.length > 0 && (
                            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 mb-3">
                                Other Endpoints
                            </h3>
                        )}
                        <div className="space-y-2">
                            {rootRequests.map(renderRequest)}
                        </div>
                    </div>
                )}

                {requests.length === 0 && (
                    <div className="text-center py-20">
                        <ExternalLink size={48} className={`mx-auto mb-4 ${subTextColor}`} />
                        <p className={subTextColor}>No endpoints documented yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
