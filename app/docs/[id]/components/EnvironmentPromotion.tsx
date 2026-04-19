'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X, GitCompare, ArrowRight, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../utils/api';
import { toast } from 'react-hot-toast';

interface Props {
    documentationId: string;
    onClose: () => void;
}

interface Environment {
    id: string;
    name: string;
    variables: Record<string, string>;
    secrets?: string[];
}

type DiffKind = 'same' | 'added' | 'removed' | 'changed' | 'skipped';

function classifyKey(key: string, src: Record<string, string>, tgt: Record<string, string>): DiffKind {
    const inSrc = Object.prototype.hasOwnProperty.call(src, key);
    const inTgt = Object.prototype.hasOwnProperty.call(tgt, key);
    if (inSrc && !inTgt) return 'added';
    if (!inSrc && inTgt) return 'removed';
    if (src[key] !== tgt[key]) return 'changed';
    return 'same';
}

/** Applies the overwrite flag: a 'changed' key becomes 'skipped' when overwrite is off. */
function effectiveKind(kind: DiffKind, overwrite: boolean): DiffKind {
    if (kind === 'changed' && !overwrite) return 'skipped';
    return kind;
}

const DIFF_META: Record<DiffKind, { color: string; bg: string; label: string }> = {
    same:    { color: '#8B949E', bg: 'transparent', label: 'Same' },
    added:   { color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Will add' },
    changed: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', label: 'Will change' },
    removed: { color: '#6E7681', bg: 'rgba(110,118,129,0.05)', label: 'Target only' },
    skipped: { color: '#6E7681', bg: 'rgba(110,118,129,0.04)', label: 'Will skip' },
};

/** Show a truncated preview of a value so long tokens don't blow up row heights. */
function truncate(v: string, max = 60): string {
    if (v == null) return '';
    if (v.length <= max) return v;
    return v.slice(0, max) + '…';
}

export function EnvironmentPromotion({ documentationId, onClose }: Props) {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery<any>({
        queryKey: ['environments', documentationId],
        queryFn: () => api.environments.list(documentationId),
    });
    const environments: Environment[] = data?.data || [];

    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [overwrite, setOverwrite] = useState(true);
    const [confirmText, setConfirmText] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    // Auto-pick sensible defaults once data arrives.
    useEffect(() => {
        if (environments.length < 2 || sourceId) return;
        const dev = environments.find(e => /dev/i.test(e.name)) || environments[0];
        const stage = environments.find(e => /stag/i.test(e.name)) || environments.find(e => e.id !== dev.id);
        setSourceId(dev.id);
        if (stage) setTargetId(stage.id);
    }, [environments, sourceId]);

    const source = environments.find(e => e.id === sourceId);
    const target = environments.find(e => e.id === targetId);
    const isProdTarget = target && /prod/i.test(target.name);

    // Build the union of keys for side-by-side display.
    const allKeys = useMemo(() => {
        const s = source?.variables || {};
        const t = target?.variables || {};
        return Array.from(new Set([...Object.keys(s), ...Object.keys(t)])).sort();
    }, [source, target]);

    // Pre-select every key that would actually change on promote.
    useEffect(() => {
        if (!source || !target) { setSelectedKeys(new Set()); return; }
        const toSelect = new Set<string>();
        for (const k of allKeys) {
            const kind = classifyKey(k, source.variables || {}, target.variables || {});
            if (kind === 'added' || kind === 'changed') toSelect.add(k);
        }
        setSelectedKeys(toSelect);
    }, [sourceId, targetId]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleKey = (key: string) => {
        setSelectedKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const promoteMutation = useMutation({
        mutationFn: () => api.environments.promote(documentationId, {
            sourceId, targetId,
            keys: Array.from(selectedKeys),
            overwrite,
        }),
        onSuccess: (res: any) => {
            toast.success(res.message || 'Promoted');
            queryClient.invalidateQueries({ queryKey: ['environments', documentationId] });
            queryClient.invalidateQueries({ queryKey: ['doc', documentationId] });
            setShowConfirm(false);
            setConfirmText('');
            onClose();
        },
        onError: (err: any) => toast.error(err.message || 'Promotion failed'),
    });

    const counts = useMemo(() => {
        if (!source || !target) return { added: 0, changed: 0, same: 0, skipped: 0 };
        let added = 0, changed = 0, same = 0, skipped = 0;
        for (const k of allKeys) {
            const eff = effectiveKind(classifyKey(k, source.variables || {}, target.variables || {}), overwrite);
            if (eff === 'added') added++;
            else if (eff === 'changed') changed++;
            else if (eff === 'skipped') skipped++;
            else if (eff === 'same') same++;
        }
        return { added, changed, same, skipped };
    }, [allKeys, source, target, overwrite]);

    // Only keys that will actually change hitting the server count toward "promote N".
    const effectiveSelectedCount = useMemo(() => {
        if (!source || !target) return 0;
        let n = 0;
        for (const k of selectedKeys) {
            const eff = effectiveKind(classifyKey(k, source.variables || {}, target.variables || {}), overwrite);
            if (eff === 'added' || eff === 'changed') n++;
        }
        return n;
    }, [selectedKeys, source, target, overwrite]);

    const canPromote = source && target && sourceId !== targetId && effectiveSelectedCount > 0;
    const handleStartPromote = () => {
        if (!canPromote) return;
        setShowConfirm(true);
        setConfirmText('');
    };
    const handleConfirmPromote = () => {
        if (isProdTarget && confirmText !== 'PROD') return;
        promoteMutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
             style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
             onClick={onClose}>
            <div className="max-h-[90vh] overflow-hidden flex flex-col"
                 style={{ background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', minWidth: 720, maxWidth: '92vw', width: '85vw' }}
                 onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36,157,159,0.12)', color: '#249d9f' }}>
                        <GitCompare size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0 }}>Environment Promotion</h2>
                        <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0' }}>Compare environments and promote variables between them</p>
                    </div>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                {isLoading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: '#8B949E' }}><Loader2 size={18} className="animate-spin" style={{ display: 'inline-block', marginRight: 8 }} /> Loading environments…</div>
                ) : environments.length < 2 ? (
                    <div style={{ padding: 48, textAlign: 'center', color: '#8B949E', fontSize: 13 }}>
                        You need at least 2 environments to promote between. Create a second environment first.
                    </div>
                ) : (
                    <>
                        {/* Selectors */}
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Source</label>
                                <select value={sourceId} onChange={e => setSourceId(e.target.value)} style={selectStyle}>
                                    {environments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <ArrowRight size={20} style={{ color: '#249d9f', flexShrink: 0, marginTop: 20 }} />
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Target {isProdTarget && <span style={{ color: '#EF4444', marginLeft: 6 }}>⚠ PRODUCTION</span>}</label>
                                <select value={targetId} onChange={e => setTargetId(e.target.value)} style={selectStyle}>
                                    <option value="">Select target…</option>
                                    {environments.filter(e => e.id !== sourceId).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Summary */}
                        {source && target && (
                            <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
                                <span style={{ color: '#10B981' }}><b>{counts.added}</b> new</span>
                                <span style={{ color: '#F59E0B' }}><b>{counts.changed}</b> changed</span>
                                {counts.skipped > 0 && <span style={{ color: '#6E7681' }}><b>{counts.skipped}</b> will skip</span>}
                                <span style={{ color: '#8B949E' }}><b>{counts.same}</b> unchanged</span>
                                <span style={{ marginLeft: 'auto', color: '#8B949E' }}>{effectiveSelectedCount} will promote</span>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#C9D1D9', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                                    Overwrite existing target values
                                </label>
                            </div>
                        )}

                        {/* Diff table */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {source && target && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#0D1117', zIndex: 1 }}>
                                        <tr>
                                            <th style={{ ...thStyle, width: 40 }}></th>
                                            <th style={{ ...thStyle, width: '22%' }}>Key</th>
                                            <th style={{ ...thStyle, width: '32%' }}>{source.name}</th>
                                            <th style={{ ...thStyle, width: '32%' }}>{target.name}</th>
                                            <th style={{ ...thStyle, width: 90 }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allKeys.map(key => {
                                            const rawKind = classifyKey(key, source.variables || {}, target.variables || {});
                                            const kind = effectiveKind(rawKind, overwrite);
                                            const meta = DIFF_META[kind];
                                            const canSelect = kind === 'added' || kind === 'changed';
                                            const checked = selectedKeys.has(key) && canSelect;
                                            const srcVal = source.variables[key];
                                            const tgtVal = target.variables[key];
                                            return (
                                                <tr key={key} style={{ background: meta.bg, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                    <td style={tdStyle}>
                                                        <input type="checkbox" checked={checked} disabled={!canSelect}
                                                               onChange={() => toggleKey(key)}
                                                               style={{ opacity: canSelect ? 1 : 0.3, cursor: canSelect ? 'pointer' : 'not-allowed' }} />
                                                    </td>
                                                    <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#E6EDF3' }}>{key}</td>
                                                    <td style={valueCellStyle} title={srcVal ?? ''}>
                                                        {srcVal != null ? truncate(srcVal) : <span style={{ color: '#6E7681' }}>—</span>}
                                                    </td>
                                                    <td style={valueCellStyle} title={tgtVal ?? ''}>
                                                        {tgtVal != null ? truncate(tgtVal) : <span style={{ color: '#6E7681' }}>—</span>}
                                                    </td>
                                                    <td style={{ ...tdStyle, color: meta.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{meta.label}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                            {source && target && allKeys.length === 0 && (
                                <div style={{ padding: 48, textAlign: 'center', color: '#6E7681', fontSize: 13 }}>Both environments are empty.</div>
                            )}
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={onClose} style={{ padding: '8px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8B949E', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button
                                onClick={handleStartPromote}
                                disabled={!canPromote}
                                style={{ padding: '8px 16px', borderRadius: 6, background: isProdTarget ? '#EF4444' : '#249d9f', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: canPromote ? 'pointer' : 'not-allowed', opacity: canPromote ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                {isProdTarget && <ShieldAlert size={13} />}
                                Promote {effectiveSelectedCount} variable{effectiveSelectedCount === 1 ? '' : 's'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Confirm dialog */}
            {showConfirm && target && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={(e) => { e.stopPropagation(); setShowConfirm(false); }}>
                    <div style={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 12, padding: 24, minWidth: 420, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <ShieldAlert size={20} style={{ color: isProdTarget ? '#EF4444' : '#F59E0B' }} />
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#E6EDF3' }}>
                                {isProdTarget ? 'Promote to Production?' : 'Confirm promotion'}
                            </h3>
                        </div>
                        <p style={{ fontSize: 13, color: '#C9D1D9', margin: '0 0 14px', lineHeight: 1.5 }}>
                            You are about to promote <b>{effectiveSelectedCount}</b> variable{effectiveSelectedCount === 1 ? '' : 's'} from <b>{source?.name}</b> to <b>{target.name}</b>. Existing values in the target {overwrite ? 'will be overwritten' : 'will be kept'}.
                        </p>
                        {isProdTarget && (
                            <div style={{ marginBottom: 14 }}>
                                <label style={{ fontSize: 12, color: '#FCA5A5', display: 'block', marginBottom: 6 }}>Type <b>PROD</b> to confirm</label>
                                <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)} autoFocus
                                       style={{ width: '100%', padding: '8px 10px', background: '#0D1117', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, color: '#E6EDF3', fontSize: 13, outline: 'none' }} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setShowConfirm(false); setConfirmText(''); }} style={{ padding: '8px 14px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8B949E', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button
                                onClick={handleConfirmPromote}
                                disabled={(isProdTarget && confirmText !== 'PROD') || promoteMutation.isPending}
                                style={{ padding: '8px 16px', borderRadius: 6, background: isProdTarget ? '#EF4444' : '#249d9f', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: ((isProdTarget && confirmText !== 'PROD') || promoteMutation.isPending) ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                {promoteMutation.isPending ? <><Loader2 size={13} className="animate-spin" /> Promoting…</> : <><CheckCircle2 size={13} /> Confirm promote</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 6, display: 'block' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', background: '#0D1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#E6EDF3', fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 11, color: '#8B949E', fontWeight: 600, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '1px solid rgba(255,255,255,0.08)' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'top' };
const valueCellStyle: React.CSSProperties = {
    padding: '8px 12px', verticalAlign: 'top',
    fontFamily: 'monospace', fontSize: 11, color: '#8B949E',
    maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
