'use client';

import React, { useMemo, useState } from 'react';
import { X, ArrowRight, Plus, Minus, Edit3, AlertTriangle, FileText, Copy, Download, Check } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses, getMethodColor } from '../utils/theme';

// ─── Types ───────────────────────────────────────────────────────────

interface FieldChange {
    field: string;           // 'method', 'path', 'query', 'headers', 'body', 'name'
    summary: string;         // human-readable, used in changelog
    breaking: boolean;
}

interface DiffItem {
    id: string;
    type: 'request' | 'folder';
    name: string;
    action: 'added' | 'deleted' | 'modified' | 'unchanged';
    method?: string;
    url?: string;
    breaking?: boolean;
    reasons?: string[];      // plain-language reasons the change is breaking
    fieldChanges?: FieldChange[];
    details?: { old?: any; new?: any; changes?: string[] };
}

interface SnapshotDiffViewerProps {
    snapshotName: string;
    oldData: any;
    newData: any;
    onClose: () => void;
}

// ─── Diff helpers ────────────────────────────────────────────────────

function splitUrl(url: string): { path: string; queryKeys: string[] } {
    try {
        // Placeholder replaces {{vars}} so URL parses even with templates.
        const u = new URL((url || '').replace(/\{\{\w+\}\}/g, 'x'));
        return { path: u.pathname, queryKeys: Array.from(u.searchParams.keys()) };
    } catch {
        // Best-effort fallback: split on "?".
        const [path, q = ''] = (url || '').split('?');
        const queryKeys = q ? q.split('&').map(p => p.split('=')[0]).filter(Boolean) : [];
        return { path, queryKeys };
    }
}

function headerKeys(headers: any[] | undefined): string[] {
    return (headers || []).map(h => (h?.key || '').toLowerCase()).filter(Boolean);
}

function paramKeys(params: any[] | undefined): string[] {
    return (params || []).map(p => p?.key || '').filter(Boolean);
}

function bodyTopLevelKeys(body: any): string[] | null {
    if (!body || body.mode !== 'raw' || !body.raw) return null;
    try {
        const parsed = JSON.parse(body.raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return Object.keys(parsed);
    } catch { /* non-JSON body */ }
    return null;
}

/** Detect meaningful field-level changes. Any removal is treated as breaking. */
function detectFieldChanges(oldR: any, newR: any): FieldChange[] {
    const changes: FieldChange[] = [];

    if (oldR.name !== newR.name) {
        changes.push({ field: 'name', summary: `Renamed: "${oldR.name}" → "${newR.name}"`, breaking: false });
    }
    if (oldR.method !== newR.method) {
        changes.push({ field: 'method', summary: `Method changed: ${oldR.method} → ${newR.method}`, breaking: true });
    }

    const oldUrl = splitUrl(oldR.url || '');
    const newUrl = splitUrl(newR.url || '');
    if (oldUrl.path !== newUrl.path) {
        changes.push({ field: 'path', summary: `URL path changed: \`${oldUrl.path}\` → \`${newUrl.path}\``, breaking: true });
    }
    const addedQ = newUrl.queryKeys.filter(k => !oldUrl.queryKeys.includes(k));
    const removedQ = oldUrl.queryKeys.filter(k => !newUrl.queryKeys.includes(k));
    if (addedQ.length) changes.push({ field: 'query', summary: `Added query param${addedQ.length > 1 ? 's' : ''}: \`${addedQ.join('`, `')}\``, breaking: false });
    if (removedQ.length) changes.push({ field: 'query', summary: `Removed query param${removedQ.length > 1 ? 's' : ''}: \`${removedQ.join('`, `')}\``, breaking: true });

    const oldH = headerKeys(oldR.headers);
    const newH = headerKeys(newR.headers);
    const addedH = newH.filter(k => !oldH.includes(k));
    const removedH = oldH.filter(k => !newH.includes(k));
    if (addedH.length) changes.push({ field: 'headers', summary: `Added header${addedH.length > 1 ? 's' : ''}: \`${addedH.join('`, `')}\``, breaking: false });
    if (removedH.length) changes.push({ field: 'headers', summary: `Removed header${removedH.length > 1 ? 's' : ''}: \`${removedH.join('`, `')}\``, breaking: true });

    const oldP = paramKeys(oldR.params);
    const newP = paramKeys(newR.params);
    const addedP = newP.filter(k => !oldP.includes(k));
    const removedP = oldP.filter(k => !newP.includes(k));
    if (addedP.length) changes.push({ field: 'params', summary: `Added param${addedP.length > 1 ? 's' : ''}: \`${addedP.join('`, `')}\``, breaking: false });
    if (removedP.length) changes.push({ field: 'params', summary: `Removed param${removedP.length > 1 ? 's' : ''}: \`${removedP.join('`, `')}\``, breaking: true });

    const oldBodyKeys = bodyTopLevelKeys(oldR.body);
    const newBodyKeys = bodyTopLevelKeys(newR.body);
    if (oldBodyKeys && newBodyKeys) {
        const addedB = newBodyKeys.filter(k => !oldBodyKeys.includes(k));
        const removedB = oldBodyKeys.filter(k => !newBodyKeys.includes(k));
        if (addedB.length) changes.push({ field: 'body', summary: `Added body field${addedB.length > 1 ? 's' : ''}: \`${addedB.join('`, `')}\``, breaking: false });
        if (removedB.length) changes.push({ field: 'body', summary: `Removed body field${removedB.length > 1 ? 's' : ''}: \`${removedB.join('`, `')}\``, breaking: true });
    } else if (JSON.stringify(oldR.body) !== JSON.stringify(newR.body)) {
        changes.push({ field: 'body', summary: 'Body content changed', breaking: false });
    }

    return changes;
}

// ─── Markdown generator ──────────────────────────────────────────────

function generateMarkdown(diffs: DiffItem[], snapshotName: string): string {
    const added = diffs.filter(d => d.action === 'added' && d.type === 'request');
    const removed = diffs.filter(d => d.action === 'deleted' && d.type === 'request');
    const modified = diffs.filter(d => d.action === 'modified' && d.type === 'request');
    const breakingCount = diffs.filter(d => d.breaking).length;

    const lines: string[] = [];
    lines.push(`# Changelog — ${snapshotName} → Current`);
    lines.push('');
    lines.push(`**Summary**: ${added.length} added · ${modified.length} modified · ${removed.length} removed${breakingCount ? ` · ⚠️ ${breakingCount} breaking` : ''}`);
    lines.push('');

    if (added.length) {
        lines.push(`## Added (${added.length})`);
        lines.push('');
        for (const d of added) lines.push(`- **${d.method}** \`${d.url}\` — ${d.name}`);
        lines.push('');
    }

    if (modified.length) {
        lines.push(`## Changed (${modified.length})`);
        lines.push('');
        for (const d of modified) {
            const badge = d.breaking ? ' ⚠️ **BREAKING**' : '';
            lines.push(`- **${d.method}** \`${d.url}\` — ${d.name}${badge}`);
            for (const c of d.fieldChanges || []) lines.push(`  - ${c.summary}${c.breaking ? ' ⚠️' : ''}`);
        }
        lines.push('');
    }

    if (removed.length) {
        lines.push(`## Removed (${removed.length})`);
        lines.push('');
        for (const d of removed) lines.push(`- **${d.method}** \`${d.url}\` — ${d.name} ⚠️ **BREAKING**`);
        lines.push('');
    }

    if (!added.length && !modified.length && !removed.length) {
        lines.push('_No request-level changes._');
        lines.push('');
    }

    return lines.join('\n');
}

// ─── Component ───────────────────────────────────────────────────────

export function SnapshotDiffViewer({ snapshotName, oldData, newData, onClose }: SnapshotDiffViewerProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const [tab, setTab] = useState<'diff' | 'changelog'>('diff');
    const [copied, setCopied] = useState(false);

    const diffs = useMemo<DiffItem[]>(() => {
        const results: DiffItem[] = [];

        const oldRequests = oldData.requests || [];
        const newRequests = newData.requests || [];
        const oldFolders = oldData.folders || [];
        const newFolders = newData.folders || [];

        // Folders
        const oldFolderMap = new Map<string, any>(oldFolders.map((f: any) => [f.id, f]));
        const newFolderMap = new Map<string, any>(newFolders.map((f: any) => [f.id, f]));

        newFolders.forEach((f: any) => {
            if (!oldFolderMap.has(f.id)) {
                results.push({ id: f.id, type: 'folder', name: f.name, action: 'added' });
            } else {
                const oldF = oldFolderMap.get(f.id);
                if (oldF.name !== f.name || oldF.parentId !== f.parentId) {
                    results.push({ id: f.id, type: 'folder', name: f.name, action: 'modified', details: { old: oldF, new: f, changes: ['meta'] } });
                }
            }
        });
        oldFolders.forEach((f: any) => {
            if (!newFolderMap.has(f.id)) {
                results.push({ id: f.id, type: 'folder', name: f.name, action: 'deleted' });
            }
        });

        // Requests
        const oldReqMap = new Map<string, any>(oldRequests.map((r: any) => [r.id, r]));
        const newReqMap = new Map<string, any>(newRequests.map((r: any) => [r.id, r]));

        newRequests.forEach((r: any) => {
            if (!oldReqMap.has(r.id)) {
                results.push({ id: r.id, type: 'request', name: r.name, action: 'added', method: r.method, url: r.url });
                return;
            }
            const oldR = oldReqMap.get(r.id);
            const fieldChanges = detectFieldChanges(oldR, r);
            if (fieldChanges.length > 0) {
                const breaking = fieldChanges.some(c => c.breaking);
                const reasons = fieldChanges.filter(c => c.breaking).map(c => c.summary);
                const changes = Array.from(new Set(fieldChanges.map(c => c.field)));
                results.push({
                    id: r.id, type: 'request', name: r.name, action: 'modified',
                    method: r.method, url: r.url,
                    breaking, reasons, fieldChanges,
                    details: { old: oldR, new: r, changes },
                });
            }
        });

        oldRequests.forEach((r: any) => {
            if (!newReqMap.has(r.id)) {
                results.push({ id: r.id, type: 'request', name: r.name, action: 'deleted', method: r.method, url: r.url, breaking: true, reasons: ['Endpoint removed'] });
            }
        });

        return results.sort((a, b) => {
            const order = { added: 0, deleted: 1, modified: 2, unchanged: 3 };
            return order[a.action] - order[b.action];
        });
    }, [oldData, newData]);

    const markdown = useMemo(() => generateMarkdown(diffs, snapshotName), [diffs, snapshotName]);
    const breakingCount = useMemo(() => diffs.filter(d => d.breaking).length, [diffs]);

    const handleCopy = () => {
        navigator.clipboard.writeText(markdown).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    const handleDownload = () => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `changelog-${snapshotName.replace(/\s+/g, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md"
             onClick={onClose}>
            <div className={`w-full max-w-5xl h-[85vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-[#0f0f1a] border-[#249d9f]/30' : 'bg-white border-gray-200'}`}
                 onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#249d9f]/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#249d9f] flex items-center justify-center text-white shadow-lg shadow-[#249d9f]/20">
                            <Edit3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Changes in Snapshot</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                {snapshotName} vs Current State
                                {breakingCount > 0 && (
                                    <span className="ml-2 text-red-500">· {breakingCount} breaking</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-3 border-b border-white/5 flex items-center gap-1">
                    <TabButton active={tab === 'diff'} onClick={() => setTab('diff')} icon={<Edit3 size={13} />} label="Diff" />
                    <TabButton active={tab === 'changelog'} onClick={() => setTab('changelog')} icon={<FileText size={13} />} label="Changelog" />
                </div>

                {/* Content */}
                {tab === 'diff' ? (
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {diffs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                <div className="w-20 h-20 rounded-full bg-gray-500/10 flex items-center justify-center mb-4">
                                    <ArrowRight size={40} />
                                </div>
                                <h3 className="text-lg font-bold">No changes detected</h3>
                                <p className="text-sm">This snapshot matches the current collection state exactly.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {diffs.map((diff) => (
                                    <div key={diff.id + diff.action} className={`p-5 rounded-2xl border transition-all ${diff.action === 'added' ? 'bg-emerald-500/5 border-emerald-500/20' :
                                        diff.action === 'deleted' ? 'bg-red-500/5 border-red-500/20' :
                                            'bg-amber-500/5 border-amber-500/20'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${diff.action === 'added' ? 'text-emerald-500 bg-emerald-500/10' :
                                                    diff.action === 'deleted' ? 'text-red-500 bg-red-500/10' :
                                                        'text-amber-500 bg-amber-500/10'}`}>
                                                    {diff.action === 'added' ? <Plus size={18} /> :
                                                        diff.action === 'deleted' ? <Minus size={18} /> :
                                                            <Edit3 size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{diff.type}</span>
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${diff.action === 'added' ? 'bg-emerald-500 text-white' :
                                                            diff.action === 'deleted' ? 'bg-red-500 text-white' :
                                                                'bg-amber-500 text-white'}`}>{diff.action}</span>
                                                        {diff.breaking && (
                                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                                                                <AlertTriangle size={10} /> Breaking
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold">{diff.name}</h4>
                                                </div>
                                            </div>

                                            {diff.action === 'modified' && diff.details?.changes && (
                                                <div className="flex gap-2 flex-wrap justify-end max-w-xs">
                                                    {diff.details.changes.map(c => (
                                                        <span key={c} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md border border-white/5 text-gray-400">{c}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {diff.fieldChanges && diff.fieldChanges.length > 0 && (
                                            <ul className="mt-3 ml-14 space-y-1 text-xs text-gray-300">
                                                {diff.fieldChanges.map((c, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className={`mt-[3px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.breaking ? 'bg-red-500' : 'bg-gray-500'}`} />
                                                        <span dangerouslySetInnerHTML={{ __html: c.summary.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1 rounded text-amber-300">$1</code>') }} />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {diff.action === 'modified' && diff.type === 'request' && diff.details?.old && diff.details?.new && (
                                            <div className="mt-4 grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Old State</p>
                                                    <div className="p-3 rounded-xl bg-black/20 font-mono text-[10px] border border-white/5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-1 rounded bg-gray-500/20 text-gray-400">{diff.details.old.method}</span>
                                                            <span className="truncate">{diff.details.old.url}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">New State</p>
                                                    <div className="p-3 rounded-xl bg-black/20 font-mono text-[10px] border border-white/5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-1 rounded ${getMethodColor(diff.details.new.method, 'dark')}`}>{diff.details.new.method}</span>
                                                            <span className="text-white truncate">{diff.details.new.url}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="flex items-center justify-end gap-2 mb-3">
                            <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
                                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                            </button>
                            <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all">
                                <Download size={13} /> Download .md
                            </button>
                        </div>
                        <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono bg-black/20 p-5 rounded-2xl border border-white/5 text-gray-200">{markdown}</pre>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-black/20">
                    <button onClick={onClose} className="px-8 py-3 bg-[#1a7a7c] hover:bg-[#249d9f] text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95">
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button onClick={onClick}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all ${
                    active ? 'bg-white/5 text-white border-b-2 border-[#249d9f]' : 'text-gray-500 hover:text-gray-300'
                }`}>
            {icon}{label}
        </button>
    );
}
