'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, BarChart3, CheckCircle2, AlertTriangle, Users, TrendingUp, Activity, FileText, Search, Download } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../../../../utils/api';
import { Endpoint } from '@/types';

interface Props {
    documentationId: string;
    endpoints: Endpoint[];
    onClose: () => void;
    onSelectEndpoint?: (idx: number, opts?: { tab?: string }) => void;
}

interface HeatmapDay {
    date: string;   // YYYY-MM-DD
    count: number;
    users: { userId: string; name: string; count: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

function countHistory(ep: any): number {
    const h = parseHistory(ep);
    return h.length;
}

function parseHistory(ep: any): any[] {
    const h = ep?.history;
    if (Array.isArray(h)) return h;
    if (typeof h === 'string') {
        try { return JSON.parse(h) || []; } catch { return []; }
    }
    return [];
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

/** Case-insensitive substring match across method, name, and URL. */
function matchesEndpoint(ep: Endpoint, q: string): boolean {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
        (ep.method || '').toLowerCase().includes(needle) ||
        (ep.name || '').toLowerCase().includes(needle) ||
        (ep.url || '').toLowerCase().includes(needle)
    );
}

function countAssertions(ep: Endpoint): number {
    const a = ep.assertions as any;
    if (Array.isArray(a)) return a.length;
    if (typeof a === 'string') {
        try { return JSON.parse(a).length || 0; } catch { return 0; }
    }
    return 0;
}

const METHOD_COLORS: Record<string, string> = {
    GET: '#10B981', POST: '#F59E0B', PUT: '#3B82F6',
    PATCH: '#8B5CF6', DELETE: '#EF4444', OPTIONS: '#6B7280', HEAD: '#6B7280',
};

// ─── Component ───────────────────────────────────────────────────────

export function InsightsPanel({ documentationId, endpoints, onClose, onSelectEndpoint }: Props) {
    const [tab, setTab] = useState<'overview' | 'coverage' | 'quality' | 'usage' | 'heatmap'>('overview');

    const { data: heatmapRes, isLoading: heatmapLoading } = useQuery<any>({
        queryKey: ['audit-heatmap', documentationId],
        queryFn: () => api.documentation.getAuditHeatmap(documentationId),
        enabled: tab === 'overview' || tab === 'heatmap',
    });
    const heatmapDays: HeatmapDay[] = heatmapRes?.data?.days || [];

    // ─── Derived stats ───────────────────────────────────────────────
    const coverage = useMemo(() => {
        const withAssertions: Array<{ ep: Endpoint; idx: number }> = [];
        const without: Array<{ ep: Endpoint; idx: number }> = [];
        endpoints.forEach((ep, idx) => {
            if (countAssertions(ep) > 0) withAssertions.push({ ep, idx });
            else without.push({ ep, idx });
        });
        const totalAssertions = endpoints.reduce((s, e) => s + countAssertions(e), 0);
        return {
            covered: withAssertions.length,
            uncovered: without.length,
            total: endpoints.length,
            pct: endpoints.length ? (withAssertions.length / endpoints.length) * 100 : 0,
            totalAssertions,
            // Full list for search; the panel slices to 20 for the default view.
            allUncovered: without,
        };
    }, [endpoints]);

    // Aggregate usage analytics from each endpoint's own history JSONB.
    // Every computation is in-memory — no network / no new endpoints.
    const usage = useMemo(() => {
        const rows = endpoints.map((ep, idx) => {
            const items = parseHistory(ep);
            const times: number[] = [];
            let errors = 0;
            let latest = 0;
            for (const h of items) {
                const t = Number(h?.lastResponse?.time ?? h?.time);
                const s = Number(h?.lastResponse?.status ?? h?.status);
                if (Number.isFinite(t) && t > 0) times.push(t);
                if (Number.isFinite(s) && (s === 0 || s >= 400)) errors++;
                const ts = Date.parse(h?.timestamp ?? '');
                if (Number.isFinite(ts) && ts > latest) latest = ts;
            }
            const sorted = [...times].sort((a, b) => a - b);
            return {
                ep, idx,
                calls: items.length,
                p50: percentile(sorted, 50),
                p95: percentile(sorted, 95),
                p99: percentile(sorted, 99),
                errorRate: items.length ? errors / items.length : 0,
                errors,
                latest,
            };
        }).filter(r => r.calls > 0);

        const byMethod: Record<string, number> = {};
        let totalCalls = 0;
        let totalErrors = 0;
        for (const r of rows) {
            byMethod[r.ep.method] = (byMethod[r.ep.method] || 0) + r.calls;
            totalCalls += r.calls;
            totalErrors += r.errors;
        }
        return {
            rows,
            topByFreq: [...rows].sort((a, b) => b.calls - a.calls).slice(0, 10),
            methodPie: Object.entries(byMethod).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            totalCalls,
            errorRate: totalCalls ? totalErrors / totalCalls : 0,
            endpointsUsed: rows.length,
        };
    }, [endpoints]);

    // Heuristic doc-quality score per endpoint. Each signal is 1 point; total out of 6.
    // - has a non-default name
    // - has a description ≥ 10 chars
    // - has at least one assertion (validates responses)
    // - has a response schema stored (detects drift)
    // - every request header has a value (no dangling empty keys)
    // - every URL query param is documented or at least keyed (non-empty key)
    const docQuality = useMemo(() => {
        const scored = endpoints.map((ep, idx) => {
            const name = (ep.name || '').trim();
            const hasName = name.length > 0 && !/^(new request|untitled|\(unnamed\))$/i.test(name);
            const hasDescription = ((ep.description || '').trim().length >= 10);
            const hasTests = countAssertions(ep) > 0;
            const hasSchema = !!(ep as any).responseSchema && Object.keys((ep as any).responseSchema || {}).length > 0;
            const headersOk = (ep.headers || []).every(h => !h?.key || (h?.value ?? '').length > 0);
            const paramsOk = (ep.params || []).every(p => !!(p?.key));
            const signals = [hasName, hasDescription, hasTests, hasSchema, headersOk, paramsOk];
            const score = signals.filter(Boolean).length;
            return { ep, idx, score, total: signals.length, hasName, hasDescription, hasTests, hasSchema, headersOk, paramsOk };
        });
        const avg = scored.length ? scored.reduce((s, x) => s + x.score / x.total, 0) / scored.length : 0;
        const bottom = [...scored].sort((a, b) => a.score - b.score).slice(0, 15);
        return { scored, avgPct: avg * 100, bottom };
    }, [endpoints]);

    const goToEndpoint = (idx: number, opts?: { tab?: string }) => {
        if (onSelectEndpoint) {
            onSelectEndpoint(idx, opts);
            onClose();
        }
    };

    const heatmapStats = useMemo(() => {
        const byUser = new Map<string, { name: string; count: number }>();
        let total = 0;
        for (const d of heatmapDays) {
            total += d.count;
            for (const u of d.users) {
                const prev = byUser.get(u.userId);
                byUser.set(u.userId, { name: u.name, count: (prev?.count || 0) + u.count });
            }
        }
        const topUsers = Array.from(byUser.entries())
            .map(([userId, v]) => ({ userId, ...v }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return { total, activeDays: heatmapDays.length, topUsers };
    }, [heatmapDays]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6"
             style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
             onClick={onClose}>
            <div className="flex flex-col"
                 style={{ background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', width: '88vw', maxWidth: 1100, height: '85vh', overflow: 'hidden' }}
                 onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36,157,159,0.12)', color: '#249d9f' }}>
                        <BarChart3 size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0 }}>Collection Insights</h2>
                        <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0' }}>Test coverage, activity, and contributor patterns</p>
                    </div>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 2, padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <InsightTab active={tab === 'overview'} onClick={() => setTab('overview')} icon={<BarChart3 size={13} />} label="Overview" />
                    <InsightTab active={tab === 'coverage'} onClick={() => setTab('coverage')} icon={<CheckCircle2 size={13} />} label="Test Coverage" />
                    <InsightTab active={tab === 'quality'} onClick={() => setTab('quality')} icon={<FileText size={13} />} label="Doc Quality" />
                    <InsightTab active={tab === 'usage'} onClick={() => setTab('usage')} icon={<TrendingUp size={13} />} label="Usage" />
                    <InsightTab active={tab === 'heatmap'} onClick={() => setTab('heatmap')} icon={<Users size={13} />} label="Contributions" />
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                    {tab === 'overview' && (
                        <OverviewPanel
                            coverage={coverage}
                            mostActiveCount={usage.endpointsUsed}
                            heatmapStats={heatmapStats}
                            heatmapDays={heatmapDays}
                        />
                    )}
                    {tab === 'coverage' && <CoveragePanel coverage={coverage} onGo={(idx) => goToEndpoint(idx, { tab: 'tests' })} />}
                    {tab === 'quality' && <QualityPanel quality={docQuality} onGo={(idx) => goToEndpoint(idx, { tab: 'docs' })} />}
                    {tab === 'usage' && <UsagePanel usage={usage} totalEndpoints={endpoints.length} onGo={(idx) => goToEndpoint(idx)} />}
                    {tab === 'heatmap' && <HeatmapPanel days={heatmapDays} loading={heatmapLoading} topUsers={heatmapStats.topUsers} />}
                </div>
            </div>
        </div>
    );
}

// ─── Overview ────────────────────────────────────────────────────────

function OverviewPanel({ coverage, mostActiveCount, heatmapStats, heatmapDays }: {
    coverage: ReturnType<typeof useMemo> & any;
    mostActiveCount: number;
    heatmapStats: { total: number; activeDays: number; topUsers: { userId: string; name: string; count: number }[] };
    heatmapDays: HeatmapDay[];
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            <StatCard label="Total endpoints" value={String(coverage.total)} icon={<Activity size={14} />} />
            <StatCard label="Test coverage" value={`${coverage.pct.toFixed(0)}%`} icon={<CheckCircle2 size={14} />} accent={coverage.pct >= 80 ? '#10B981' : coverage.pct >= 40 ? '#F59E0B' : '#EF4444'} />
            <StatCard label="Endpoints executed" value={String(mostActiveCount)} icon={<TrendingUp size={14} />} />
            <StatCard label="Changes (90d)" value={String(heatmapStats.total)} icon={<Users size={14} />} />
            <div style={{ gridColumn: 'span 4' }}>
                <Heading>Recent contribution activity</Heading>
                <HeatmapGrid days={heatmapDays} />
            </div>
        </div>
    );
}

// ─── Test Coverage ───────────────────────────────────────────────────

function CoveragePanel({ coverage, onGo }: { coverage: any; onGo: (idx: number) => void }) {
    const pctColor = coverage.pct >= 80 ? '#10B981' : coverage.pct >= 40 ? '#F59E0B' : '#EF4444';
    const [search, setSearch] = useState('');
    // Searching expands to every uncovered endpoint; idle view caps at 20.
    const source: { ep: Endpoint; idx: number }[] = search
        ? coverage.allUncovered
        : coverage.allUncovered.slice(0, 20);
    const filtered = source.filter(({ ep }) => matchesEndpoint(ep, search));
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, padding: 18, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                <div style={{ width: 120, height: 120, position: 'relative', flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
                        <circle cx="60" cy="60" r="52" stroke={pctColor} strokeWidth="10" fill="none"
                                strokeDasharray={2 * Math.PI * 52}
                                strokeDashoffset={2 * Math.PI * 52 * (1 - coverage.pct / 100)}
                                transform="rotate(-90 60 60)" strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: pctColor }}>{coverage.pct.toFixed(0)}%</div>
                        <div style={{ fontSize: 10, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5 }}>covered</div>
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#C9D1D9', marginBottom: 10 }}>
                        <b style={{ color: '#E6EDF3' }}>{coverage.covered}</b> of {coverage.total} endpoints have at least one assertion, running a total of <b style={{ color: '#E6EDF3' }}>{coverage.totalAssertions}</b> test{coverage.totalAssertions === 1 ? '' : 's'}.
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                        <span style={{ color: '#10B981' }}><b>{coverage.covered}</b> covered</span>
                        <span style={{ color: '#EF4444' }}><b>{coverage.uncovered}</b> uncovered</span>
                    </div>
                </div>
            </div>

            {/* Explainer — tells the user what the warning icon means and how to fix. */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, marginBottom: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#C9D1D9', lineHeight: 1.5 }}>
                <AlertTriangle size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                <div>
                    <b style={{ color: '#E6EDF3' }}>What&apos;s an uncovered endpoint?</b> An endpoint with no assertions — responses aren&apos;t validated, so a breaking change could ship silently. Click a row below to open the request, then switch to the <b>Tests</b> tab to add an assertion (status code, response time, body contains, JSON value).
                </div>
            </div>

            {coverage.allUncovered.length > 0 ? (
                <>
                    <Heading>{search ? `Matching endpoints (${filtered.length})` : 'Endpoints missing assertions'}</Heading>
                    <SearchBox value={search} onChange={setSearch} placeholder="Search by method, name, or URL…" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {filtered.map(({ ep, idx }: { ep: Endpoint; idx: number }) => (
                            <EndpointRow
                                key={ep.id}
                                ep={ep}
                                onClick={() => onGo(idx)}
                                right={
                                    <>
                                        <AlertTriangle size={12} style={{ color: '#EF4444' }} />
                                        <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>No tests</span>
                                    </>
                                }
                            />
                        ))}
                        {search && filtered.length === 0 && (
                            <div style={{ padding: 16, fontSize: 12, color: '#6E7681', textAlign: 'center' }}>No endpoints match &ldquo;{search}&rdquo;.</div>
                        )}
                        {!search && coverage.uncovered > 20 && (
                            <div style={{ padding: 10, fontSize: 11, color: '#6E7681', textAlign: 'center' }}>
                                + {coverage.uncovered - 20} more uncovered endpoints — type to search all
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div style={{ padding: 24, textAlign: 'center', color: '#10B981', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={28} />
                    All {coverage.total} endpoints have assertions. Nice.
                </div>
            )}
        </div>
    );
}

// ─── Doc Quality ─────────────────────────────────────────────────────

interface QualityRow {
    ep: Endpoint;
    idx: number;
    score: number;
    total: number;
    hasName: boolean;
    hasDescription: boolean;
    hasTests: boolean;
    hasSchema: boolean;
    headersOk: boolean;
    paramsOk: boolean;
}

function QualityPanel({ quality, onGo }: { quality: { scored: QualityRow[]; avgPct: number; bottom: QualityRow[] }; onGo: (idx: number) => void }) {
    const avgColor = quality.avgPct >= 80 ? '#10B981' : quality.avgPct >= 50 ? '#F59E0B' : '#EF4444';
    const [search, setSearch] = useState('');
    // When searching, widen the list to all scored endpoints (not just bottom 15).
    const source = search ? quality.scored : quality.bottom;
    const filtered = source.filter(row => matchesEndpoint(row.ep, search));
    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, padding: 18, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                <div style={{ width: 120, height: 120, position: 'relative', flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
                        <circle cx="60" cy="60" r="52" stroke={avgColor} strokeWidth="10" fill="none"
                                strokeDasharray={2 * Math.PI * 52}
                                strokeDashoffset={2 * Math.PI * 52 * (1 - quality.avgPct / 100)}
                                transform="rotate(-90 60 60)" strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: avgColor }}>{quality.avgPct.toFixed(0)}%</div>
                        <div style={{ fontSize: 10, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5 }}>avg quality</div>
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#C9D1D9', marginBottom: 8, lineHeight: 1.5 }}>
                        Each endpoint is scored on 6 signals: <b style={{ color: '#E6EDF3' }}>name</b>, <b style={{ color: '#E6EDF3' }}>description</b>, <b style={{ color: '#E6EDF3' }}>assertions</b>, <b style={{ color: '#E6EDF3' }}>response schema</b>, <b style={{ color: '#E6EDF3' }}>header values</b>, <b style={{ color: '#E6EDF3' }}>param keys</b>.
                    </div>
                    <div style={{ fontSize: 11, color: '#6E7681' }}>Click any row to open the endpoint&apos;s Docs tab and fill in the gaps.</div>
                </div>
            </div>

            <Heading>{search ? `Matching endpoints (${filtered.length})` : 'Endpoints with the lowest scores'}</Heading>
            <SearchBox value={search} onChange={setSearch} placeholder="Search by method, name, or URL…" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {search && filtered.length === 0 && (
                    <div style={{ padding: 16, fontSize: 12, color: '#6E7681', textAlign: 'center' }}>No endpoints match &ldquo;{search}&rdquo;.</div>
                )}
                {filtered.map((row) => (
                    <button
                        key={row.ep.id}
                        onClick={() => onGo(row.idx)}
                        style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(36,157,159,0.35)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                        <EndpointRow ep={row.ep} inline right={
                            <span style={{ fontSize: 11, color: row.score >= 5 ? '#10B981' : row.score >= 3 ? '#F59E0B' : '#EF4444', fontWeight: 700 }}>
                                {row.score}/{row.total}
                            </span>
                        } />
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <QualityChip ok={row.hasName} label="name" />
                            <QualityChip ok={row.hasDescription} label="description" />
                            <QualityChip ok={row.hasTests} label="tests" />
                            <QualityChip ok={row.hasSchema} label="schema" />
                            <QualityChip ok={row.headersOk} label="headers" />
                            <QualityChip ok={row.paramsOk} label="params" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function QualityChip({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10,
            background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: ok ? '#10B981' : '#EF4444',
            border: `1px solid ${ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
            {ok ? '✓' : '✗'} {label}
        </span>
    );
}

// ─── Most Active ─────────────────────────────────────────────────────

interface UsageRow {
    ep: Endpoint;
    idx: number;
    calls: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    errors: number;
    latest: number;
}

interface UsageStats {
    rows: UsageRow[];
    topByFreq: UsageRow[];
    methodPie: { name: string; value: number }[];
    totalCalls: number;
    errorRate: number;
    endpointsUsed: number;
}

function UsagePanel({ usage, totalEndpoints, onGo }: { usage: UsageStats; totalEndpoints: number; onGo: (idx: number) => void }) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<'calls' | 'p95' | 'errorRate' | 'latest'>('calls');
    if (usage.rows.length === 0) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: '#6E7681', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <Activity size={28} style={{ opacity: 0.4 }} />
                <div><b style={{ color: '#C9D1D9' }}>No usage data yet</b></div>
                <div style={{ maxWidth: 320, lineHeight: 1.5 }}>
                    History is tracked when you run a request. Execute any endpoint a few times and come back — you&apos;ll see call counts, p95 latency, and error rates here.
                </div>
            </div>
        );
    }
    const filtered = usage.rows
        .filter(r => matchesEndpoint(r.ep, search))
        .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
    const maxFreq = usage.topByFreq[0]?.calls || 1;
    const errColor = usage.errorRate > 0.1 ? '#EF4444' : usage.errorRate > 0.02 ? '#F59E0B' : '#10B981';

    const handleExport = (format: 'json' | 'csv') => {
        const payload = usage.rows.map(r => ({
            method: r.ep.method,
            name: r.ep.name,
            url: r.ep.url,
            calls: r.calls,
            p50_ms: Math.round(r.p50),
            p95_ms: Math.round(r.p95),
            p99_ms: Math.round(r.p99),
            error_rate_pct: (r.errorRate * 100).toFixed(2),
            errors: r.errors,
            last_call_iso: r.latest ? new Date(r.latest).toISOString() : '',
        }));
        let blob: Blob;
        let name: string;
        if (format === 'csv') {
            const header = 'method,name,url,calls,p50_ms,p95_ms,p99_ms,error_rate_pct,errors,last_call_iso';
            const rows = payload.map(p =>
                [p.method, csvEscape(p.name), csvEscape(p.url), p.calls, p.p50_ms, p.p95_ms, p.p99_ms, p.error_rate_pct, p.errors, p.last_call_iso].join(',')
            );
            blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
            name = 'usage-analytics.csv';
        } else {
            blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            name = 'usage-analytics.json';
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <StatCard label="Total calls" value={usage.totalCalls.toLocaleString()} icon={<Activity size={14} />} />
                <StatCard label="Endpoints used" value={`${usage.endpointsUsed} / ${totalEndpoints}`} icon={<TrendingUp size={14} />} />
                <StatCard label="Error rate" value={`${(usage.errorRate * 100).toFixed(1)}%`} icon={<AlertTriangle size={14} />} accent={errColor} />
            </div>

            {/* Method pie + Top frequency side-by-side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 14, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                    <Heading>Method distribution</Heading>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={usage.methodPie} dataKey="value" nameKey="name" outerRadius={60} label>
                                {usage.methodPie.map((entry, i) => (
                                    <Cell key={i} fill={METHOD_COLORS[entry.name] || '#6B7280'} />
                                ))}
                            </Pie>
                            <RTooltip contentStyle={{ background: '#161B22', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ padding: 14, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
                    <Heading>Top {usage.topByFreq.length} by frequency</Heading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                        {usage.topByFreq.map(r => (
                            <button key={r.ep.id} onClick={() => onGo(r.idx)}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: METHOD_COLORS[r.ep.method] || '#6B7280', color: '#fff', flexShrink: 0 }}>{r.ep.method}</span>
                                    <span style={{ flex: 1, color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.ep.name}</span>
                                    <span style={{ color: '#249d9f', fontWeight: 600 }}>{r.calls}</span>
                                </div>
                                <div style={{ marginTop: 3, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${(r.calls / maxFreq) * 100}%`, background: METHOD_COLORS[r.ep.method] || '#6B7280' }} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Full table with sort + search + export */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 10 }}>
                <Heading>All executed endpoints ({usage.rows.length})</Heading>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleExport('csv')} style={exportBtnStyle}><Download size={11} /> CSV</button>
                    <button onClick={() => handleExport('json')} style={exportBtnStyle}><Download size={11} /> JSON</button>
                </div>
            </div>
            <SearchBox value={search} onChange={setSearch} placeholder="Search by method, name, or URL…" />

            <div style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <th style={thStyleUsage}>Endpoint</th>
                            <SortTh label="Calls" active={sortKey === 'calls'} onClick={() => setSortKey('calls')} align="right" />
                            <th style={{ ...thStyleUsage, textAlign: 'right' }}>p50</th>
                            <SortTh label="p95" active={sortKey === 'p95'} onClick={() => setSortKey('p95')} align="right" />
                            <th style={{ ...thStyleUsage, textAlign: 'right' }}>p99</th>
                            <SortTh label="Errors" active={sortKey === 'errorRate'} onClick={() => setSortKey('errorRate')} align="right" />
                            <SortTh label="Last call" active={sortKey === 'latest'} onClick={() => setSortKey('latest')} align="right" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(r => {
                            const rowErrColor = r.errorRate > 0.1 ? '#EF4444' : r.errorRate > 0.02 ? '#F59E0B' : '#10B981';
                            return (
                                <tr key={r.ep.id}
                                    onClick={() => onGo(r.idx)}
                                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(36,157,159,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                    <td style={tdStyleUsage}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: METHOD_COLORS[r.ep.method] || '#6B7280', color: '#fff' }}>{r.ep.method}</span>
                                            <span style={{ color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{r.ep.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ ...tdStyleUsage, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.calls}</td>
                                    <td style={{ ...tdStyleUsage, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#8B949E' }}>{Math.round(r.p50)}ms</td>
                                    <td style={{ ...tdStyleUsage, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(r.p95)}ms</td>
                                    <td style={{ ...tdStyleUsage, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#8B949E' }}>{Math.round(r.p99)}ms</td>
                                    <td style={{ ...tdStyleUsage, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: rowErrColor, fontWeight: r.errorRate > 0 ? 600 : 400 }}>
                                        {(r.errorRate * 100).toFixed(1)}%
                                    </td>
                                    <td style={{ ...tdStyleUsage, textAlign: 'right', color: '#6E7681', fontSize: 11 }}>
                                        {r.latest ? relativeTime(r.latest) : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: '#6E7681', fontSize: 12 }}>No endpoints match &ldquo;{search}&rdquo;.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SortTh({ label, active, onClick, align }: { label: string; active: boolean; onClick: () => void; align?: 'left' | 'right' }) {
    return (
        <th style={{ ...thStyleUsage, textAlign: align || 'left', cursor: 'pointer', color: active ? '#249d9f' : '#8B949E' }} onClick={onClick}>
            {label} {active && '▾'}
        </th>
    );
}

function csvEscape(v: string): string {
    if (!v) return '';
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
}

function relativeTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    if (diff < 2592000_000) return `${Math.floor(diff / 86400_000)}d ago`;
    return new Date(ts).toLocaleDateString();
}

const thStyleUsage: React.CSSProperties = { padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#8B949E', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.4 };
const tdStyleUsage: React.CSSProperties = { padding: '8px 10px', verticalAlign: 'middle' };
const exportBtnStyle: React.CSSProperties = {
    padding: '5px 9px', borderRadius: 6, background: '#0D1117',
    border: '1px solid rgba(255,255,255,0.12)', color: '#E6EDF3', fontSize: 11,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
};

// ─── Heatmap ─────────────────────────────────────────────────────────

function HeatmapPanel({ days, loading, topUsers }: { days: HeatmapDay[]; loading: boolean; topUsers: { userId: string; name: string; count: number }[] }) {
    if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#8B949E', fontSize: 13 }}>Loading activity…</div>;
    return (
        <div>
            <Heading>Contributions over the last 90 days</Heading>
            <HeatmapGrid days={days} />
            {topUsers.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <Heading>Top contributors</Heading>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {topUsers.map((u, i) => (
                            <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
                                <span style={{ fontSize: 11, color: '#6E7681', fontWeight: 600, width: 18 }}>#{i + 1}</span>
                                <span style={{ fontSize: 13, color: '#E6EDF3', fontWeight: 500, flex: 1 }}>{u.name}</span>
                                <span style={{ fontSize: 12, color: '#249d9f', fontWeight: 600 }}>{u.count} change{u.count === 1 ? '' : 's'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// GitHub-style contribution heatmap: 7 rows (days of week, Sun-Sat), N columns (weeks).
// Each column = one calendar week. Leading/trailing blank cells align the grid to
// week boundaries so day-of-week labels always line up correctly.
function HeatmapGrid({ days }: { days: HeatmapDay[] }) {
    const dayMap = new Map(days.map(d => [d.date, d]));
    const containerRef = useRef<HTMLDivElement>(null);
    const [hover, setHover] = useState<{ x: number; y: number; day: HeatmapDay } | null>(null);

    // Build cells in UTC so the key generation (toISOString) matches the
    // server's UTC-bucketed aggregation. Using local time for the walk and
    // UTC for the key caused "today" to drop off the end for users in
    // positive-offset timezones.
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const firstDay = new Date(todayUtc);
    firstDay.setUTCDate(firstDay.getUTCDate() - 89);

    type Cell = { date?: string; count: number; empty?: boolean; month?: number; isMonthStart?: boolean };
    const cells: Cell[] = [];
    const leading = firstDay.getUTCDay();
    for (let i = 0; i < leading; i++) cells.push({ count: 0, empty: true });
    for (let i = 0; i < 90; i++) {
        const d = new Date(firstDay);
        d.setUTCDate(d.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        cells.push({
            date: key,
            count: dayMap.get(key)?.count || 0,
            month: d.getUTCMonth(),
            isMonthStart: d.getUTCDate() === 1,
        });
    }
    while (cells.length % 7 !== 0) cells.push({ count: 0, empty: true });

    const numWeeks = cells.length / 7;
    const max = Math.max(1, ...cells.map(c => c.count));
    const level = (n: number) => {
        if (n === 0) return 0;
        const ratio = n / max;
        if (ratio <= 0.25) return 1;
        if (ratio <= 0.5) return 2;
        if (ratio <= 0.75) return 3;
        return 4;
    };
    const colors = ['rgba(255,255,255,0.03)', 'rgba(36,157,159,0.3)', 'rgba(36,157,159,0.55)', 'rgba(36,157,159,0.8)', '#249d9f'];

    // Month labels: scan each week column for its first dated cell; when the
    // month changes, record the column for the label above and the divider.
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthLabelCols = new Map<number, string>();
    const monthDividerCols = new Set<number>(); // columns that begin a new month → draw left border
    let lastMonth = -1;
    for (let w = 0; w < numWeeks; w++) {
        for (let r = 0; r < 7; r++) {
            const cell = cells[w * 7 + r];
            if (cell.empty || cell.month == null) continue;
            if (cell.month !== lastMonth) {
                monthLabelCols.set(w, MONTHS[cell.month]);
                if (lastMonth !== -1) monthDividerCols.add(w);
                lastMonth = cell.month;
            }
            break;
        }
    }

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const CELL = 14;
    const GAP = 3;

    const handleCellEnter = (e: React.MouseEvent, date: string) => {
        if (!containerRef.current) return;
        const cellRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const day = dayMap.get(date) || { date, count: 0, users: [] };
        // Clamp tooltip x so it never sticks out past the container edges.
        // Tooltip maxWidth is ~260px; use half that for each side, plus a
        // small inset for the border.
        const rawX = cellRect.left - containerRect.left + cellRect.width / 2;
        const halfWidth = 130;
        const minX = halfWidth + 4;
        const maxX = containerRect.width - halfWidth - 4;
        const clampedX = Math.max(minX, Math.min(maxX, rawX));
        setHover({
            x: clampedX,
            y: cellRect.top - containerRect.top,
            day,
        });
    };

    return (
        <div>
            <div ref={containerRef}
                 onMouseLeave={() => setHover(null)}
                 style={{ padding: 12, background: '#0D1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 6 }}>
                    {/* Top-left spacer */}
                    <div />
                    {/* Month label row */}
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${numWeeks}, 1fr)`, gap: GAP, fontSize: 10, color: '#8B949E', height: 14 }}>
                        {Array.from({ length: numWeeks }, (_, w) => (
                            <div key={w} style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{monthLabelCols.get(w) || ''}</div>
                        ))}
                    </div>
                    {/* Day-of-week labels — all 7 rows */}
                    <div style={{ display: 'grid', gridTemplateRows: `repeat(7, ${CELL}px)`, gap: GAP, fontSize: 9, color: '#6E7681', paddingRight: 6, textAlign: 'right' }}>
                        {DAY_LABELS.map((d, i) => (
                            <div key={i} style={{ height: CELL, lineHeight: `${CELL}px` }}>{d}</div>
                        ))}
                    </div>
                    {/* Cell grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateRows: `repeat(7, ${CELL}px)`,
                        gridTemplateColumns: `repeat(${numWeeks}, 1fr)`,
                        gridAutoFlow: 'column',
                        gap: GAP,
                    }}>
                        {cells.map((c, i) => {
                            const col = Math.floor(i / 7);
                            const isFirstOfMonthCol = monthDividerCols.has(col);
                            return (
                                <div key={i}
                                     onMouseEnter={c.date ? (e) => handleCellEnter(e, c.date!) : undefined}
                                     style={{
                                         borderRadius: 2,
                                         background: c.empty ? 'transparent' : colors[level(c.count)],
                                         borderLeft: isFirstOfMonthCol ? '1px solid rgba(255,255,255,0.15)' : undefined,
                                         marginLeft: isFirstOfMonthCol ? 2 : 0,
                                         cursor: c.empty ? 'default' : 'pointer',
                                     }} />
                            );
                        })}
                    </div>
                </div>

                {/* Custom tooltip popover — positioned from measured cell rect */}
                {hover && <HeatmapTooltip day={hover.day} x={hover.x} y={hover.y} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: '#6E7681' }}>
                <span>Less</span>
                {colors.map((c, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />)}
                <span>More</span>
            </div>
        </div>
    );
}

/** Styled popover anchored above a measured cell position. */
function HeatmapTooltip({ day, x, y }: { day: HeatmapDay; x: number; y: number }) {
    // Format in UTC so the displayed weekday/date matches the cell's UTC bucket.
    const formattedDate = new Date(day.date + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
    return (
        <div style={{
            position: 'absolute', left: x, top: y - 8,
            transform: 'translate(-50%, -100%)',
            minWidth: 200, maxWidth: 280,
            background: '#161B22', border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            padding: '8px 10px', fontSize: 12, color: '#E6EDF3',
            pointerEvents: 'none', zIndex: 10,
        }}>
            <div style={{ fontWeight: 600, marginBottom: day.count > 0 ? 6 : 0 }}>
                {formattedDate}
            </div>
            {day.count === 0 ? (
                <div style={{ fontSize: 11, color: '#8B949E' }}>No activity</div>
            ) : day.users.length === 0 ? (
                <div style={{ fontSize: 11, color: '#8B949E' }}>{day.count} change{day.count === 1 ? '' : 's'}</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {day.users.map(u => (
                        <div key={u.userId} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
                            <span style={{ color: '#C9D1D9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                            <span style={{ color: '#249d9f', fontWeight: 600, flexShrink: 0 }}>{u.count}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Shared tiny components ──────────────────────────────────────────

function InsightTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button onClick={onClick}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: active ? '2px solid #249d9f' : '2px solid transparent', color: active ? '#E6EDF3' : '#8B949E', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' as const, letterSpacing: 0.4 }}>
            {icon}{label}
        </button>
    );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: string }) {
    return (
        <div style={{ padding: 14, background: '#0D1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                {icon}{label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: accent || '#E6EDF3', marginTop: 6 }}>{value}</div>
        </div>
    );
}

function Heading({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 11, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 10, marginTop: 4 }}>{children}</div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6E7681' }} />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '7px 30px 7px 30px',
                    background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6, color: '#E6EDF3', fontSize: 12, outline: 'none',
                }}
            />
            {value && (
                <button onClick={() => onChange('')}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6E7681', cursor: 'pointer', display: 'flex' }}>
                    <X size={12} />
                </button>
            )}
        </div>
    );
}

function EndpointRow({ ep, right, inline, onClick }: { ep: Endpoint; right?: React.ReactNode; inline?: boolean; onClick?: () => void }) {
    const inner = (
        <>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: METHOD_COLORS[ep.method] || '#6B7280', color: '#fff', flexShrink: 0 }}>{ep.method}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#E6EDF3', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.name || '(unnamed)'}</div>
                <div style={{ fontSize: 10, color: '#6E7681', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.url}</div>
            </div>
            {right}
        </>
    );
    const baseStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: 10,
        padding: inline ? 0 : '8px 12px',
        background: inline ? 'transparent' : '#0D1117',
        border: inline ? 'none' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 6,
        width: '100%', textAlign: 'left',
    };
    if (onClick) {
        return (
            <button onClick={onClick}
                    style={{ ...baseStyle, cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(36,157,159,0.35)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                {inner}
            </button>
        );
    }
    return <div style={baseStyle}>{inner}</div>;
}
