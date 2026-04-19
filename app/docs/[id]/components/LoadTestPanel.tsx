'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Gauge, Play, Square, Download, AlertTriangle } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import { API_URL, apiFetch } from '../../../../utils/api';
import { Endpoint } from '@/types';

interface Props {
    endpoints: Endpoint[];
    variables: Record<string, string>;
    onClose: () => void;
}

interface Bucket {
    second: number;
    rps: number;
    p50: number;
    p95: number;
    p99: number;
    errors: number;
    statusCounts: Record<string, number>;
}

interface Summary {
    total: number;
    succeeded: number;
    failed: number;
    errorRate: number;
    avgMs: number;
    p50: number;
    p95: number;
    p99: number;
    minMs: number;
    maxMs: number;
    rpsAvg: number;
    statusCounts: Record<string, number>;
    durationMs: number;
}

const VU_OPTIONS = [1, 10, 50, 100, 500];
const DURATION_OPTIONS = [
    { label: '10s', ms: 10_000 },
    { label: '30s', ms: 30_000 },
    { label: '1m', ms: 60_000 },
    { label: '5m', ms: 300_000 },
];

// Build an absolute URL and resolve {{variable}} references.
function resolveVars(text: string, vars: Record<string, string>): string {
    return (text || '').replace(/\{\{(\w+)\}\}/g, (m, k) => vars[k] ?? m);
}

function buildTarget(ep: Endpoint, vars: Record<string, string>) {
    const url = resolveVars(ep.url, vars);
    const headers: Record<string, string> = {};
    for (const h of ep.headers || []) {
        if (h?.key) headers[h.key] = resolveVars(h.value || '', vars);
    }
    let body: any = undefined;
    if (ep.body?.mode === 'raw' && ep.body.raw) {
        body = resolveVars(ep.body.raw, vars);
    }
    return { url, method: ep.method, headers, body };
}

const STATUS_COLORS: Record<string, string> = {
    '2xx': '#10B981',
    '3xx': '#3B82F6',
    '4xx': '#F59E0B',
    '5xx': '#EF4444',
    error: '#DC2626',
};

function classifyStatus(code: string): string {
    if (code === 'error') return 'error';
    const n = parseInt(code, 10);
    if (n >= 200 && n < 300) return '2xx';
    if (n >= 300 && n < 400) return '3xx';
    if (n >= 400 && n < 500) return '4xx';
    if (n >= 500) return '5xx';
    return 'error';
}

export function LoadTestPanel({ endpoints, variables, onClose }: Props) {
    const [targetId, setTargetId] = useState<string>(() => endpoints.find(e => e.id)?.id || '');
    const [vus, setVus] = useState(10);
    const [durationMs, setDurationMs] = useState(30_000);
    const [rampUpMs, setRampUpMs] = useState(0);

    const [runId, setRunId] = useState<string | null>(null);
    const [buckets, setBuckets] = useState<Bucket[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error' | 'stopped'>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const esRef = useRef<EventSource | null>(null);

    const targetEndpoint = useMemo(
        () => endpoints.find(e => e.id === targetId),
        [endpoints, targetId]
    );

    useEffect(() => {
        return () => { esRef.current?.close(); };
    }, []);

    const handleStart = async () => {
        if (!targetEndpoint) return;
        setBuckets([]);
        setSummary(null);
        setErrorMsg(null);
        setStatus('running');

        try {
            // apiFetch auto-refreshes expired tokens and updates localStorage,
            // so EventSource below can read the fresh token.
            const json = await apiFetch('/load-test/start', {
                method: 'POST',
                body: JSON.stringify({
                    target: buildTarget(targetEndpoint, variables),
                    virtualUsers: vus,
                    durationMs,
                    rampUpMs,
                }),
            });
            const id = json.data.id;
            setRunId(id);

            // Subscribe to the SSE stream. EventSource can't send headers, so
            // the token travels via query param and the server re-verifies it.
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const es = new EventSource(`${API_URL}/api/load-test/${id}/stream?token=${encodeURIComponent(token || '')}`);
            esRef.current = es;
            es.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data);
                    if (msg.type === 'init' && msg.buckets) setBuckets(msg.buckets);
                    else if (msg.type === 'bucket') setBuckets(prev => [...prev, msg.bucket]);
                    else if (msg.type === 'done') {
                        setSummary(msg.summary);
                        setStatus(msg.status === 'stopped' ? 'stopped' : 'done');
                        es.close();
                    }
                } catch { /* ignore malformed */ }
            };
            es.onerror = () => {
                // The server closes the stream after 'done'; that triggers onerror
                // too. Only treat as error if we don't yet have a summary.
                if (!summary) {
                    setStatus(s => (s === 'running' ? 'error' : s));
                }
                es.close();
            };
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to start');
            setStatus('error');
        }
    };

    const handleStop = async () => {
        if (!runId) return;
        try { await apiFetch(`/load-test/${runId}/stop`, { method: 'POST' }); }
        catch { /* best-effort */ }
    };

    const handleExport = (format: 'json' | 'csv') => {
        if (!runId) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        // Use fetch so we can send Authorization, then trigger download via blob.
        fetch(`${API_URL}/api/load-test/${runId}/export?format=${format}`, {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            credentials: 'include',
        }).then(r => r.blob()).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `load-test-${runId}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    // ─── Derived chart data ──────────────────────────────────────────
    const pieData = useMemo(() => {
        const counts = summary?.statusCounts ?? buckets.reduce<Record<string, number>>((acc, b) => {
            for (const [k, v] of Object.entries(b.statusCounts)) acc[k] = (acc[k] || 0) + v;
            return acc;
        }, {});
        const grouped: Record<string, number> = {};
        for (const [code, n] of Object.entries(counts)) {
            const cls = classifyStatus(code);
            grouped[cls] = (grouped[cls] || 0) + n;
        }
        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [summary, buckets]);

    const isRunning = status === 'running';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
             style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
             onClick={onClose}>
            <div className="max-h-[90vh] overflow-hidden flex flex-col"
                 style={{ background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', minWidth: 720, maxWidth: '90vw', width: '85vw' }}
                 onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(249,115,22,0.12)', color: '#F97316' }}>
                        <Gauge size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0 }}>Load Test</h2>
                        <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0' }}>Send concurrent requests and measure endpoint performance</p>
                    </div>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* ─── Config panel (left) ─── */}
                    <div style={{ width: 280, padding: 20, borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', flexShrink: 0 }}>
                        <label style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Target request</label>
                        <select value={targetId} onChange={e => setTargetId(e.target.value)} disabled={isRunning}
                                style={{ width: '100%', marginTop: 6, padding: '8px 10px', background: '#0D1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#E6EDF3', fontSize: 13 }}>
                            {endpoints.filter(e => e.id).map(e => (
                                <option key={e.id} value={e.id}>{e.method} — {e.name || e.url}</option>
                            ))}
                        </select>

                        <label style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginTop: 16, display: 'block' }}>Virtual users</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {VU_OPTIONS.map(n => (
                                <button key={n} onClick={() => setVus(n)} disabled={isRunning}
                                        style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer',
                                                 background: vus === n ? '#F97316' : '#0D1117',
                                                 color: vus === n ? '#fff' : '#8B949E',
                                                 border: `1px solid ${vus === n ? '#F97316' : 'rgba(255,255,255,0.12)'}` }}>
                                    {n}
                                </button>
                            ))}
                        </div>

                        <label style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginTop: 16, display: 'block' }}>Duration</label>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            {DURATION_OPTIONS.map(d => (
                                <button key={d.ms} onClick={() => setDurationMs(d.ms)} disabled={isRunning}
                                        style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: isRunning ? 'not-allowed' : 'pointer',
                                                 background: durationMs === d.ms ? '#F97316' : '#0D1117',
                                                 color: durationMs === d.ms ? '#fff' : '#8B949E',
                                                 border: `1px solid ${durationMs === d.ms ? '#F97316' : 'rgba(255,255,255,0.12)'}` }}>
                                    {d.label}
                                </button>
                            ))}
                        </div>

                        <label style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginTop: 16, display: 'block' }}>Ramp-up (sec)</label>
                        <input type="number" min={0} max={60} value={Math.round(rampUpMs / 1000)}
                               onChange={e => setRampUpMs(Math.max(0, Math.min(60, Number(e.target.value))) * 1000)}
                               disabled={isRunning}
                               style={{ width: '100%', marginTop: 6, padding: '8px 10px', background: '#0D1117', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#E6EDF3', fontSize: 13 }} />
                        <p style={{ fontSize: 11, color: '#6E7681', marginTop: 4 }}>Gradually spawn VUs over this period.</p>

                        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
                            {!isRunning ? (
                                <button onClick={handleStart} disabled={!targetEndpoint}
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: 6, background: '#F97316', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: targetEndpoint ? 1 : 0.5 }}>
                                    <Play size={14} /> Start test
                                </button>
                            ) : (
                                <button onClick={handleStop}
                                        style={{ flex: 1, padding: '10px 14px', borderRadius: 6, background: '#DC2626', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <Square size={14} /> Stop
                                </button>
                            )}
                        </div>

                        {(status === 'done' || status === 'stopped') && runId && (
                            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                <button onClick={() => handleExport('json')} style={exportBtnStyle}><Download size={12} /> JSON</button>
                                <button onClick={() => handleExport('csv')} style={exportBtnStyle}><Download size={12} /> CSV</button>
                            </div>
                        )}

                        {errorMsg && (
                            <div style={{ marginTop: 12, padding: 10, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, fontSize: 12, color: '#FCA5A5', display: 'flex', gap: 6 }}>
                                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {errorMsg}
                            </div>
                        )}
                    </div>

                    {/* ─── Dashboard (right) ─── */}
                    <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
                        {/* Stat cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                            <StatCard label="Requests" value={summary ? summary.total.toLocaleString() : buckets.reduce((s, b) => s + b.rps, 0).toLocaleString()} />
                            <StatCard label="Avg RPS" value={summary ? summary.rpsAvg.toFixed(1) : (buckets.length ? (buckets.reduce((s, b) => s + b.rps, 0) / buckets.length).toFixed(1) : '—')} />
                            <StatCard label="p95 latency" value={summary ? `${Math.round(summary.p95)}ms` : (buckets.length ? `${Math.round(buckets[buckets.length - 1].p95)}ms` : '—')} />
                            <StatCard label="Error rate" value={summary ? `${(summary.errorRate * 100).toFixed(1)}%` : '—'}
                                      accent={summary && summary.errorRate > 0.05 ? '#EF4444' : '#10B981'} />
                        </div>

                        {/* RPS chart */}
                        <ChartCard title="Requests per second">
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={buckets}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="second" stroke="#6E7681" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6E7681" tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Line type="monotone" dataKey="rps" stroke="#F97316" dot={false} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Latency chart */}
                        <ChartCard title="Response time (p50 / p95 / p99)">
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={buckets}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="second" stroke="#6E7681" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6E7681" tick={{ fontSize: 11 }} />
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Line type="monotone" dataKey="p50" stroke="#10B981" dot={false} strokeWidth={2} />
                                    <Line type="monotone" dataKey="p95" stroke="#F59E0B" dot={false} strokeWidth={2} />
                                    <Line type="monotone" dataKey="p99" stroke="#EF4444" dot={false} strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Status pie */}
                        <ChartCard title="Status code distribution">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={70} label>
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6E7681'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Subcomponents ───────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <div style={{ padding: 12, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: accent || '#E6EDF3', marginTop: 4 }}>{value}</div>
        </div>
    );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: 16, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#E6EDF3', marginBottom: 10 }}>{title}</div>
            {children}
        </div>
    );
}

const tooltipStyle = { background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 12 };
const exportBtnStyle: React.CSSProperties = {
    flex: 1, padding: '6px 10px', borderRadius: 6, background: '#0D1117',
    border: '1px solid rgba(255,255,255,0.12)', color: '#E6EDF3', fontSize: 12,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
};
