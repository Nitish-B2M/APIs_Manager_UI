'use client';

import React, { useMemo } from 'react';
import { X, ArrowRight, Plus, Minus, Edit3, ChevronRight, ChevronDown } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses, getMethodColor } from '../utils/theme';

interface DiffItem {
    id: string;
    type: 'request' | 'folder';
    name: string;
    action: 'added' | 'deleted' | 'modified' | 'unchanged';
    details?: {
        old?: any;
        new?: any;
        changes?: string[];
    };
}

interface SnapshotDiffViewerProps {
    snapshotName: string;
    oldData: any;
    newData: any;
    onClose: () => void;
}

export function SnapshotDiffViewer({ snapshotName, oldData, newData, onClose }: SnapshotDiffViewerProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);

    const diffs = useMemo(() => {
        const results: DiffItem[] = [];

        const oldRequests = oldData.requests || [];
        const newRequests = newData.requests || [];
        const oldFolders = oldData.folders || [];
        const newFolders = newData.folders || [];

        // Check Folders
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

        // Check Requests
        const oldReqMap = new Map<string, any>(oldRequests.map((r: any) => [r.id, r]));
        const newReqMap = new Map<string, any>(newRequests.map((r: any) => [r.id, r]));

        newRequests.forEach((r: any) => {
            if (!oldReqMap.has(r.id)) {
                results.push({ id: r.id, type: 'request', name: r.name, action: 'added' });
            } else {
                const oldR = oldReqMap.get(r.id);
                const changes = [];
                if (oldR.name !== r.name) changes.push('name');
                if (oldR.url !== r.url) changes.push('url');
                if (oldR.method !== r.method) changes.push('method');
                if (JSON.stringify(oldR.headers) !== JSON.stringify(r.headers)) changes.push('headers');
                if (JSON.stringify(oldR.body) !== JSON.stringify(r.body)) changes.push('body');

                if (changes.length > 0) {
                    results.push({ id: r.id, type: 'request', name: r.name, action: 'modified', details: { old: oldR, new: r, changes } });
                }
            }
        });

        oldRequests.forEach((r: any) => {
            if (!newReqMap.has(r.id)) {
                results.push({ id: r.id, type: 'request', name: r.name, action: 'deleted' });
            }
        });

        return results.sort((a, b) => {
            const order = { added: 0, deleted: 1, modified: 2, unchanged: 3 };
            return order[a.action] - order[b.action];
        });
    }, [oldData, newData]);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
            <div className={`w-full max-w-4xl h-[85vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-[#0f0f1a] border-indigo-500/30' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-indigo-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Edit3 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Changes in Snapshot</h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{snapshotName} vs Current State</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
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
                                        'bg-amber-500/5 border-amber-500/20'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${diff.action === 'added' ? 'text-emerald-500 bg-emerald-500/10' :
                                                diff.action === 'deleted' ? 'text-red-500 bg-red-500/10' :
                                                    'text-amber-500 bg-amber-500/10'
                                                }`}>
                                                {diff.action === 'added' ? <Plus size={18} /> :
                                                    diff.action === 'deleted' ? <Minus size={18} /> :
                                                        <Edit3 size={18} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-50">{diff.type}</span>
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${diff.action === 'added' ? 'bg-emerald-500 text-white' :
                                                        diff.action === 'deleted' ? 'bg-red-500 text-white' :
                                                            'bg-amber-500 text-white'
                                                        }`}>{diff.action}</span>
                                                </div>
                                                <h4 className="font-bold">{diff.name}</h4>
                                            </div>
                                        </div>

                                        {diff.action === 'modified' && diff.details?.changes && (
                                            <div className="flex gap-2">
                                                {diff.details.changes.map(c => (
                                                    <span key={c} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md border border-white/5 text-gray-400">{c}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {diff.action === 'modified' && diff.type === 'request' && (
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Old State</p>
                                                <div className="p-3 rounded-xl bg-black/20 font-mono text-[10px] border border-white/5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-1 rounded bg-gray-500/20 text-gray-400`}>{diff.details?.old.method}</span>
                                                        <span className="truncate">{diff.details?.old.url}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">New State</p>
                                                <div className="p-3 rounded-xl bg-black/20 font-mono text-[10px] border border-white/5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`px-1 rounded ${getMethodColor(diff.details?.new.method, 'dark')}`}>{diff.details?.new.method}</span>
                                                        <span className="text-white truncate">{diff.details?.new.url}</span>
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

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-black/20">
                    <button onClick={onClose} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95">
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
