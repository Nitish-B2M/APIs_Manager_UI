'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../utils/api';
import { X, Camera, RotateCcw, Trash2, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';

interface SnapshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentationId: string;
}

export function SnapshotModal({ isOpen, onClose, documentationId }: SnapshotModalProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const queryClient = useQueryClient();
    const [snapshotName, setSnapshotName] = useState('');
    const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

    const { data: snapshotsRes, isLoading: snapshotsLoading } = useQuery({
        queryKey: ['snapshots', documentationId],
        queryFn: () => api.snapshot.list(documentationId),
        enabled: isOpen
    });

    const createMutation = useMutation({
        mutationFn: (name: string) => api.snapshot.create({ documentationId, name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snapshots', documentationId] });
            setSnapshotName('');
            toast.success('Snapshot created');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to create snapshot')
    });

    const restoreMutation = useMutation({
        mutationFn: (snapshotId: string) => api.snapshot.restore(snapshotId),
        onSuccess: () => {
            toast.success('Collection restored!');
            queryClient.invalidateQueries({ queryKey: ['doc', documentationId] });
            onClose();
            window.location.reload(); // Reload to refresh all state
        },
        onError: (err: any) => toast.error(err.message || 'Failed to restore snapshot')
    });

    const deleteMutation = useMutation({
        mutationFn: (snapshotId: string) => api.snapshot.delete(snapshotId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snapshots', documentationId] });
            toast.success('Snapshot deleted');
        }
    });

    if (!isOpen) return null;

    const snapshots = snapshotsRes?.data || [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#1a1a2e] border-indigo-500/30' : 'bg-white border-gray-200'
                }`}>
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Camera size={22} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Snapshots & Versioning</h2>
                            <p className={`text-xs ${themeClasses.subTextColor}`}>Capture and restore collection states</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                        }`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
                    {/* Create New Snapshot */}
                    <div className="space-y-3">
                        <label className={`text-xs font-bold uppercase tracking-wider ${themeClasses.subTextColor}`}>Create New Snapshot</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={snapshotName}
                                onChange={(e) => setSnapshotName(e.target.value)}
                                placeholder="e.g., Before major API refactor"
                                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${theme === 'dark'
                                    ? 'bg-[#0f0f1a] border-indigo-500/20 text-gray-200 placeholder-gray-600'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                    }`}
                            />
                            <button
                                onClick={() => snapshotName && createMutation.mutate(snapshotName)}
                                disabled={!snapshotName || createMutation.isPending}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                            >
                                {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                                Snap
                            </button>
                        </div>
                    </div>

                    {/* Snapshot History */}
                    <div className="space-y-4">
                        <label className={`text-xs font-bold uppercase tracking-wider ${themeClasses.subTextColor}`}>Snapshot History ({snapshots.length})</label>
                        {snapshotsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
                                <Loader2 size={32} className="animate-spin text-indigo-500" />
                                <span className="text-sm">Loading history...</span>
                            </div>
                        ) : snapshots.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-2xl gap-3 ${theme === 'dark' ? 'border-white/5 text-gray-600' : 'border-gray-100 text-gray-400'
                                }`}>
                                <Clock size={32} className="opacity-20" />
                                <span className="text-sm font-medium">No snapshots yet</span>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {snapshots.map((s: any) => (
                                    <div
                                        key={s.id}
                                        className={`group p-4 rounded-2xl border transition-all flex items-center justify-between ${theme === 'dark'
                                            ? 'bg-white/5 border-white/5 hover:border-indigo-500/30'
                                            : 'bg-gray-50 border-gray-100 hover:border-indigo-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-white text-gray-500 shadow-sm'
                                                }`}>
                                                <RotateCcw size={18} />
                                            </div>
                                            <div>
                                                <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{s.name}</h4>
                                                <p className="text-[11px] text-gray-500">{new Date(s.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {confirmRestore === s.id ? (
                                                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                                                    <button
                                                        onClick={() => restoreMutation.mutate(s.id)}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5"
                                                    >
                                                        <CheckCircle2 size={12} /> Confirm Restore
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmRestore(null)}
                                                        className={`p-1.5 rounded-lg text-[11px] font-bold ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                                                            }`}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setConfirmRestore(s.id)}
                                                        className={`p-2.5 rounded-xl transition-all ${theme === 'dark'
                                                            ? 'hover:bg-emerald-500/20 text-emerald-400 opacity-0 group-hover:opacity-100'
                                                            : 'hover:bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100'
                                                            }`}
                                                        title="Restore this version"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteMutation.mutate(s.id)}
                                                        className={`p-2.5 rounded-xl transition-all ${theme === 'dark'
                                                            ? 'hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100'
                                                            : 'hover:bg-red-50 text-red-600 opacity-0 group-hover:opacity-100'
                                                            }`}
                                                        title="Delete snapshot"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Info */}
                <div className={`p-4 px-6 text-[11px] flex items-center gap-2 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                    <AlertTriangle size={12} className="flex-shrink-0" />
                    <span>Restoring a snapshot will replace the current state of the collection. This action cannot be undone unless you create a snapshot of the current state first.</span>
                </div>
            </div>
        </div>
    );
}
