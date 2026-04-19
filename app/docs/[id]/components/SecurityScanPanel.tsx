'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ShieldAlert, Play, Download, AlertTriangle, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { API_URL, apiFetch } from '../../../../utils/api';
import { Endpoint } from '@/types';

interface Props {
    endpoints: Endpoint[];
    variables: Record<string, string>;
    onClose: () => void;
}

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface Finding {
    id: string;
    checkId: string;
    check: string;
    severity: Severity;
    title: string;
    description: string;
    remediation: string;
    evidence?: string;
}

interface Progress { completed: number; total: number; currentCheck?: string; }

const SEVERITY_META: Record<Severity, { label: string; color: string; bg: string }> = {
    critical: { label: 'Critical', color: '#DC2626', bg: 'rgba(220,38,38,0.15)' },
    high:     { label: 'High',     color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
    medium:   { label: 'Medium',   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
    low:      { label: 'Low',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    info:     { label: 'Info',     color: '#8B949E', bg: 'rgba(139,148,158,0.12)' },
};

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

function resolveVars(text: string, vars: Record<string, string>): string {
    return (text || '').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
}

function buildTarget(ep: Endpoint, vars: Record<string, string>) {
    const url = resolveVars(ep.url, vars);
    const headers: Record<string, string> = {};
    for (const h of ep.headers || []) if (h?.key) headers[h.key] = resolveVars(h.value || '', vars);
    let body: any = undefined;
    if (ep.body?.mode === 'raw' && ep.body.raw) body = resolveVars(ep.body.raw, vars);
    return { url, method: ep.method, headers, body };
}

export function SecurityScanPanel({ endpoints, variables, onClose }: Props) {
    const [targetId, setTargetId] = useState<string>(() => endpoints.find(e => e.id)?.id || '');
    const [runId, setRunId] = useState<string | null>(null);
    const [findings, setFindings] = useState<Finding[]>([]);
    const [progress, setProgress] = useState<Progress>({ completed: 0, total: 0 });
    const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const esRef = useRef<EventSource | null>(null);

    const targetEndpoint = useMemo(() => endpoints.find(e => e.id === targetId), [endpoints, targetId]);

    useEffect(() => { return () => { esRef.current?.close(); }; }, []);

    const counts = useMemo(() => {
        const c: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
        for (const f of findings) c[f.severity]++;
        return c;
    }, [findings]);

    const groupedFindings = useMemo(() => {
        const groups: Record<Severity, Finding[]> = { critical: [], high: [], medium: [], low: [], info: [] };
        for (const f of findings) groups[f.severity].push(f);
        return groups;
    }, [findings]);

    const handleStart = async () => {
        if (!targetEndpoint) return;
        setFindings([]);
        setProgress({ completed: 0, total: 0 });
        setErrorMsg(null);
        setStatus('running');

        try {
            // apiFetch auto-refreshes expired tokens and updates localStorage,
            // so EventSource below can read the fresh token.
            const json = await apiFetch('/security-scan/start', {
                method: 'POST',
                body: JSON.stringify({
                    target: buildTarget(targetEndpoint, variables),
                    checks: ['all'],
                }),
            });
            const id = json.data.id;
            setRunId(id);
            setProgress(json.data.progress || { completed: 0, total: 0 });

            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const es = new EventSource(`${API_URL}/api/security-scan/${id}/stream?token=${encodeURIComponent(token || '')}`);
            esRef.current = es;
            es.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data);
                    if (msg.type === 'init') {
                        if (msg.findings) setFindings(msg.findings);
                        if (msg.run?.progress) setProgress(msg.run.progress);
                    } else if (msg.type === 'progress') {
                        setProgress(msg.progress);
                    } else if (msg.type === 'finding') {
                        setFindings(prev => [...prev, msg.finding]);
                    } else if (msg.type === 'done') {
                        setStatus('done');
                        es.close();
                    }
                } catch { /* ignore */ }
            };
            es.onerror = () => {
                setStatus(s => (s === 'running' ? 'error' : s));
                es.close();
            };
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to start');
            setStatus('error');
        }
    };

    const handleExport = () => {
        if (!runId) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        fetch(`${API_URL}/api/security-scan/${runId}/export`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            credentials: 'include',
        }).then(r => r.blob()).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `security-scan-${runId}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const isRunning = status === 'running';
    const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
             style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
             onClick={onClose}>
            <div className="max-h-[90vh] overflow-hidden flex flex-col"
                 style={{ background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', minWidth: 720, maxWidth: '90vw', width: '80vw' }}
                 onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}>
                        <ShieldAlert size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0 }}>Security Scanner</h2>
                        <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0' }}>Probe an endpoint for common API vulnerabilities</p>
                    </div>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* ─── Config (left) ─── */}
                    <div style={{ width: 280, padding: 20, borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', flexShrink: 0 }}>
                        <label style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Target request</label>
                        <select value={targetId} onChange={e => setTargetId(e.target.value)} disabled={isRunning}
                                style={{ width: '100%', marginTop: 6, padding: '8px 10px', background: '#0D1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#E6EDF3', fontSize: 13 }}>
                            {endpoints.filter(e => e.id).map(e => (
                                <option key={e.id} value={e.id}>{e.method} — {e.name || e.url}</option>
                            ))}
                        </select>

                        <div style={{ marginTop: 16, padding: 12, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6 }}>
                            <div style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 6 }}>Checks</div>
                            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: 12, color: '#C9D1D9', lineHeight: 1.7 }}>
                                <li>SQL injection</li>
                                <li>Reflected XSS</li>
                                <li>Security headers</li>
                                <li>CORS configuration</li>
                                <li>Secret exposure</li>
                                <li>Auth bypass</li>
                                <li>Rate limiting</li>
                                <li>HTTPS enforcement</li>
                            </ul>
                        </div>

                        <button onClick={handleStart} disabled={!targetEndpoint || isRunning}
                                style={{ width: '100%', marginTop: 16, padding: '10px 14px', borderRadius: 6, background: '#EF4444', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !targetEndpoint || isRunning ? 0.5 : 1 }}>
                            {isRunning ? <><Loader2 size={14} className="animate-spin" /> Scanning…</> : <><Play size={14} /> Start scan</>}
                        </button>

                        {(status === 'done' || status === 'error') && runId && (
                            <button onClick={handleExport} style={{ width: '100%', marginTop: 8, padding: '8px 12px', borderRadius: 6, background: '#0D1117', border: '1px solid rgba(255,255,255,0.12)', color: '#E6EDF3', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Download size={12} /> Export JSON
                            </button>
                        )}

                        {errorMsg && (
                            <div style={{ marginTop: 12, padding: 10, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, fontSize: 12, color: '#FCA5A5', display: 'flex', gap: 6 }}>
                                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {errorMsg}
                            </div>
                        )}
                    </div>

                    {/* ─── Results (right) ─── */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {/* Progress bar */}
                        {(isRunning || progress.completed > 0) && (
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: '#8B949E' }}>
                                        {isRunning && progress.currentCheck ? `Running: ${progress.currentCheck}` : 'Scan progress'}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#E6EDF3', fontWeight: 600 }}>{progress.completed} / {progress.total}</span>
                                </div>
                                <div style={{ height: 6, background: '#0D1117', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progressPct}%`, background: '#EF4444', transition: 'width 200ms' }} />
                                </div>
                            </div>
                        )}

                        {/* Severity summary */}
                        <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                            {SEVERITY_ORDER.map(sev => (
                                <div key={sev} style={{ padding: 10, background: SEVERITY_META[sev].bg, border: `1px solid ${SEVERITY_META[sev].color}33`, borderRadius: 8 }}>
                                    <div style={{ fontSize: 11, color: SEVERITY_META[sev].color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{SEVERITY_META[sev].label}</div>
                                    <div style={{ fontSize: 20, fontWeight: 600, color: '#E6EDF3', marginTop: 2 }}>{counts[sev]}</div>
                                </div>
                            ))}
                        </div>

                        {/* Findings list */}
                        <div style={{ padding: '0 20px 20px' }}>
                            {findings.length === 0 && !isRunning && status === 'done' && (
                                <div style={{ padding: 32, textAlign: 'center', color: '#8B949E', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle2 size={32} color="#10B981" />
                                    No issues found.
                                </div>
                            )}
                            {findings.length === 0 && status === 'idle' && (
                                <div style={{ padding: 32, textAlign: 'center', color: '#6E7681', fontSize: 13 }}>
                                    Pick a request and click Start scan.
                                </div>
                            )}
                            {SEVERITY_ORDER.map(sev => (
                                groupedFindings[sev].length > 0 && (
                                    <div key={sev} style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, color: SEVERITY_META[sev].color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                                            {SEVERITY_META[sev].label} ({groupedFindings[sev].length})
                                        </div>
                                        {groupedFindings[sev].map(f => {
                                            const open = expanded.has(f.id);
                                            return (
                                                <div key={f.id} style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
                                                    <button onClick={() => toggleExpand(f.id)}
                                                            style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#E6EDF3', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <ChevronDown size={14} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 150ms', color: '#8B949E', flexShrink: 0 }} />
                                                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: SEVERITY_META[sev].bg, color: SEVERITY_META[sev].color, flexShrink: 0 }}>{f.check}</span>
                                                        <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{f.title}</span>
                                                    </button>
                                                    {open && (
                                                        <div style={{ padding: '0 12px 12px 34px', fontSize: 12, color: '#C9D1D9', lineHeight: 1.6 }}>
                                                            <div style={{ marginBottom: 8 }}>{f.description}</div>
                                                            <div style={{ fontSize: 11, color: '#8B949E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Remediation</div>
                                                            <div style={{ marginBottom: f.evidence ? 8 : 0, color: '#C9D1D9' }}>{f.remediation}</div>
                                                            {f.evidence && (<>
                                                                <div style={{ fontSize: 11, color: '#8B949E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Evidence</div>
                                                                <code style={{ display: 'block', padding: 8, background: '#161B22', borderRadius: 4, fontSize: 11, color: '#F59E0B', wordBreak: 'break-all' }}>{f.evidence}</code>
                                                            </>)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
