'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../utils/api';
import { X, Camera, RotateCcw, Trash2, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';
import { useBetaMode } from '../../../../context/BetaModeContext';
import { SnapshotDiffViewer } from './SnapshotDiffViewer';
import { Eye } from 'lucide-react';

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
    const [diffSnapshot, setDiffSnapshot] = useState<any | null>(null);
    const { isBeta } = useBetaMode();

    // Reset sub-modal state whenever this modal closes so reopening
    // always lands on the snapshot list, not a stale diff view.
    useEffect(() => {
        if (!isOpen) {
            setDiffSnapshot(null);
            setConfirmRestore(null);
        }
    }, [isOpen]);

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



    // Fetch individual snapshot for diff
    const handleCompare = async (snapshot: any) => {
        try {
            const res = await api.snapshot.getOne(snapshot.id);
            if (res.status) {
                // Get current doc state from query cache or refetch
                const currentDoc = queryClient.getQueryData(['doc', documentationId]) as any;
                const currentFolders = queryClient.getQueryData(['folders', documentationId]) as any;

                // Construct current state object like snapshot data
                const currentState = {
                    doc: currentDoc?.data,
                    requests: currentDoc?.data?.requests || [],
                    folders: currentFolders?.data || []
                };

                setDiffSnapshot({
                    name: snapshot.name,
                    data: res.data.data,
                    currentState
                });
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch snapshot data');
        }
    };

    if (!isOpen) return null;

    const snapshots = snapshotsRes?.data || [];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="overflow-hidden flex flex-col"
                style={{ background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', minWidth: 640, maxWidth: '78vw', width: '72vw', maxHeight: '85vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-[#249d9f]/20 bg-[#249d9f]/5' : 'border-gray-100 bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#249d9f]/20 flex items-center justify-center text-[#2ec4c7]">
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

                <div style={{ padding: 24, overflowY: 'auto', maxHeight: '70vh', flex: 1 }}>
                    {/* Create: input + button same row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                        <input
                            type="text"
                            value={snapshotName}
                            onChange={(e) => setSnapshotName(e.target.value)}
                            placeholder="e.g., Before major API refactor"
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#E6EDF3', fontSize: 13, outline: 'none' }}
                        />
                        <button
                            onClick={() => snapshotName && createMutation.mutate(snapshotName)}
                            disabled={!snapshotName || createMutation.isPending}
                            style={{ width: 80, height: 40, borderRadius: 6, background: '#249d9f', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (!snapshotName || createMutation.isPending) ? 0.4 : 1, flexShrink: 0 }}
                        >
                            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                            Snap
                        </button>
                    </div>

                    {/* History */}
                    <div style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681' }}>
                            History ({snapshots.length})
                        </span>
                    </div>

                    {snapshotsLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 12, opacity: 0.5 }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: '#249d9f' }} />
                            <span style={{ fontSize: 13, color: '#8B949E' }}>Loading...</span>
                        </div>
                    ) : snapshots.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', gap: 8, border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8 }}>
                            <Clock size={24} style={{ color: '#6E7681', opacity: 0.3 }} />
                            <span style={{ fontSize: 13, color: '#6E7681' }}>No snapshots yet</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {snapshots.map((s: any) => (
                                <div
                                    key={s.id}
                                    className="group"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128', transition: 'border-color 0.15s' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(36,157,159,0.3)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
                                >
                                    {/* Left: name + timestamp */}
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                        <div style={{ fontSize: 11, color: '#6E7681', marginTop: 2 }}>{new Date(s.createdAt).toLocaleString()}</div>
                                    </div>

                                    {/* Right: actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <button onClick={() => handleCompare(s)} title="View changes / changelog" className="opacity-0 group-hover:opacity-100" style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#249d9f', transition: 'opacity 0.15s' }}>
                                            <Eye size={15} />
                                        </button>
                                        {confirmRestore === s.id ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <button onClick={() => restoreMutation.mutate(s.id)} style={{ padding: '5px 12px', borderRadius: 6, background: '#249d9f', color: 'white', fontSize: 11, fontWeight: 600, border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle2 size={12} /> Confirm
                                                </button>
                                                <button onClick={() => setConfirmRestore(null)} style={{ padding: '5px 8px', borderRadius: 6, background: 'none', border: 'none', color: '#8B949E', fontSize: 11 }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => setConfirmRestore(s.id)} title="Restore" className="opacity-0 group-hover:opacity-100" style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#3FB950', transition: 'opacity 0.15s' }}>
                                                    <RotateCcw size={15} />
                                                </button>
                                                <button onClick={() => deleteMutation.mutate(s.id)} title="Delete" className="opacity-0 group-hover:opacity-100" style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#F85149', transition: 'opacity 0.15s' }}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#1C2128', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#D29922' }}>
                    <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                    <span>Restoring a snapshot replaces the current state. Create a snapshot first to preserve it.</span>
                </div>
            </div>

            {diffSnapshot && (
                <SnapshotDiffViewer
                    snapshotName={diffSnapshot.name}
                    oldData={diffSnapshot.data}
                    newData={diffSnapshot.currentState}
                    onClose={() => setDiffSnapshot(null)}
                />
            )}
        </div>
    );
}
