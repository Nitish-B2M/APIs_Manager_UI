'use client';

import React, { useState, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../utils/api';
import {
    Activity, Plus, Trash2, Play, CheckCircle2, Clock, Wifi,
    WifiOff, RefreshCw, Bell, ChevronDown, ChevronUp, Loader2, X
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

interface MonitorDashboardProps {
    documentationId: string;
}

const FREQUENCIES = [
    { value: '1min', label: 'Every 1 min' },
    { value: '5min', label: 'Every 5 min' },
    { value: '15min', label: 'Every 15 min' },
    { value: '30min', label: 'Every 30 min' },
    { value: '1hr', label: 'Every hour' },
    { value: '6hr', label: 'Every 6 hours' },
    { value: '24hr', label: 'Daily' },
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

// ─── Inline detail modal ───────────────────────────────────────────────────────
interface CheckDetailModalProps {
    check: any;
    anchor: { x: number; y: number };
    onClose: () => void;
    theme: string;
}

const MODAL_W = 224;  // w-56 = 14rem
const EDGE_GAP = 8;   // min px from any viewport edge

function CheckDetailModal({ check, anchor, onClose, theme }: CheckDetailModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    // Start invisible until we measure + clamp
    const [pos, setPos] = useState<{ left: number; top: number; flip: boolean } | null>(null);

    useLayoutEffect(() => {
        const el = modalRef.current;
        if (!el) return;
        const h = el.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Horizontal: centre on anchor.x, clamped
        const left = Math.max(EDGE_GAP, Math.min(anchor.x - MODAL_W / 2, vw - MODAL_W - EDGE_GAP));

        // Vertical: prefer below anchor; flip above if it overflows bottom
        let top = anchor.y + 12;
        let flip = false;
        if (top + h + EDGE_GAP > vh) {
            top = anchor.y - h - 12;
            flip = true;
        }
        top = Math.max(EDGE_GAP, top); // never above viewport top
        setPos({ left, top, flip });
    }, [anchor.x, anchor.y]);

    // Arrow tracks the real click point relative to the (clamped) modal
    const arrowLeft = pos ? Math.max(10, Math.min(anchor.x - pos.left, MODAL_W - 14)) : MODAL_W / 2;
    const arrowCls = `absolute w-3 h-3 rotate-45 border ${theme === 'dark' ? 'bg-[#12121f] border-indigo-500/30' : 'bg-white border-gray-200'
        }`;

    return (
        <div
            ref={modalRef}
            style={{
                position: 'fixed',
                left: pos?.left ?? -9999,
                top: pos?.top ?? -9999,
                width: MODAL_W,
                zIndex: 9999,
                // Invisible until positioned to avoid flash
                visibility: pos ? 'visible' : 'hidden',
            }}
            className={`rounded-2xl border shadow-2xl text-xs ${theme === 'dark'
                ? 'bg-[#12121f] border-indigo-500/30 text-gray-200'
                : 'bg-white border-gray-200 text-gray-800'
                }`}
        >
            {/* Arrow: points down into click area (up arrow when modal is below click, down when flipped above) */}
            {pos?.flip ? (
                // Modal is above the anchor → arrow points downward
                <div className={`${arrowCls} -bottom-[7px] border-t-0 border-l-0`} style={{ left: arrowLeft }} />
            ) : (
                // Modal is below the anchor → arrow points upward
                <div className={`${arrowCls} -top-[7px] border-b-0 border-r-0`} style={{ left: arrowLeft }} />
            )}

            <div className={`px-3 py-2 flex items-center justify-between border-b rounded-t-2xl ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'
                }`}>
                <span className={`font-bold text-[10px] uppercase tracking-wider ${check.isSuccess ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                    {check.isSuccess ? '✅ Success' : '❌ Failed'}
                </span>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
                    <X size={12} />
                </button>
            </div>
            <div className="px-3 py-2.5 space-y-1.5">
                <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Status</span>
                    <span className={`font-mono font-bold ${check.statusCode >= 200 && check.statusCode < 400 ? 'text-emerald-400' : 'text-red-400'
                        }`}>{check.statusCode ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Response</span>
                    <span className="font-mono font-bold text-indigo-400">
                        {check.responseTime != null ? `${check.responseTime}ms` : '—'}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Time</span>
                    <span className="font-mono">{new Date(check.checkedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>Date</span>
                    <span className="font-mono">{new Date(check.checkedAt).toLocaleDateString()}</span>
                </div>
                {check.error && (
                    <div className={`mt-1 p-1.5 rounded-lg text-red-400 font-mono break-all leading-tight ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'
                        }`}>
                        {check.error}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── SVG Response-time chart with hover crosshair ─────────────────────────────
function ResponseChart({ history, theme }: { history: any[]; theme: string }) {
    const svgW = 300;
    const svgH = 60;
    const pad = 4;

    const [hover, setHover] = useState<{ idx: number; svgX: number; svgY: number; clientX: number; clientY: number } | null>(null);
    const [clicked, setClicked] = useState<{ check: any; x: number; y: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const times = history.map(h => h.responseTime ?? 0);
    const max = Math.max(...times, 1);

    const points = useMemo(() => history.map((h, i) => {
        const x = pad + (history.length > 1 ? (i / (history.length - 1)) * (svgW - pad * 2) : svgW / 2);
        const y = svgH - pad - ((h.responseTime ?? 0) / max) * (svgH - pad * 2);
        return { x, y };
    }), [history, max]);

    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaPoints = [
        `${pad},${svgH - pad}`,
        ...points.map(p => `${p.x},${p.y}`),
        `${(svgW - pad)},${svgH - pad}`,
    ].join(' ');

    // Convert SVG-local mouse X to nearest data index
    const getIdx = useCallback((mouseX: number, svgRect: DOMRect) => {
        const relX = (mouseX - svgRect.left) / svgRect.width * svgW;
        let best = 0;
        let bestDist = Infinity;
        points.forEach((p, i) => {
            const d = Math.abs(p.x - relX);
            if (d < bestDist) { bestDist = d; best = i; }
        });
        return best;
    }, [points]);

    const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || history.length < 2) return;
        const rect = svgRef.current.getBoundingClientRect();
        const idx = getIdx(e.clientX, rect);
        setHover({ idx, svgX: points[idx].x, svgY: points[idx].y, clientX: e.clientX, clientY: e.clientY });
    }, [getIdx, points, history.length]);

    const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
        if (!svgRef.current || history.length < 2) return;
        const rect = svgRef.current.getBoundingClientRect();
        const idx = getIdx(e.clientX, rect);
        setClicked({ check: history[idx], x: e.clientX, y: rect.bottom });
    }, [getIdx, history]);

    if (history.length < 2) {
        return (
            <div className={`flex items-center justify-center h-[60px] text-xs ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                Not enough data yet
            </div>
        );
    }

    const gradId = `chartGrad_${Math.random().toString(36).slice(2, 6)}`;

    return (
        <>
            <div className="relative">
                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full h-[60px] cursor-crosshair"
                    preserveAspectRatio="none"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHover(null)}
                    onClick={handleClick}
                >
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    <polygon points={areaPoints} fill={`url(#${gradId})`} />
                    <polyline points={polyPoints} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />

                    {/* Hover crosshair */}
                    {hover !== null && (
                        <>
                            <line
                                x1={hover.svgX} y1={pad}
                                x2={hover.svgX} y2={svgH - pad}
                                stroke={theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                                strokeWidth="1"
                                strokeDasharray="3 2"
                            />
                            <circle
                                cx={hover.svgX}
                                cy={hover.svgY}
                                r="4"
                                fill={history[hover.idx].isSuccess ? '#22c55e' : '#ef4444'}
                                stroke={theme === 'dark' ? '#1a1a2e' : '#fff'}
                                strokeWidth="2"
                            />
                        </>
                    )}

                    {/* Always show last point */}
                    {hover === null && (
                        <circle
                            cx={points[points.length - 1].x}
                            cy={points[points.length - 1].y}
                            r="3"
                            fill={history[history.length - 1].isSuccess ? '#22c55e' : '#ef4444'}
                        />
                    )}
                </svg>

                {/* Hover tooltip — rendered as a regular div overlay */}
                {hover !== null && (
                    <div
                        className={`absolute pointer-events-none px-2.5 py-1.5 rounded-xl text-[11px] shadow-lg border ${theme === 'dark'
                            ? 'bg-[#1a1a2e] border-indigo-500/30 text-gray-200'
                            : 'bg-white border-gray-200 text-gray-800'
                            }`}
                        style={{
                            left: `${(hover.svgX / svgW) * 100}%`,
                            bottom: '100%',
                            transform: 'translateX(-50%)',
                            marginBottom: 4,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <span className={history[hover.idx].isSuccess ? 'text-emerald-400' : 'text-red-400'}>
                            {history[hover.idx].isSuccess ? '●' : '●'}
                        </span>{' '}
                        <span className="font-mono font-bold text-indigo-400">
                            {history[hover.idx].responseTime != null ? `${history[hover.idx].responseTime}ms` : '—'}
                        </span>{' '}
                        <span className={`font-mono ${history[hover.idx].statusCode >= 200 && history[hover.idx].statusCode < 400 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {history[hover.idx].statusCode ?? 'ERR'}
                        </span>{' '}
                        <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>
                            {new Date(history[hover.idx].checkedAt).toLocaleTimeString()}
                        </span>
                    </div>
                )}
            </div>

            {/* Click detail modal */}
            {clicked && (
                <CheckDetailModal
                    check={clicked.check}
                    anchor={{ x: clicked.x, y: clicked.y }}
                    onClose={() => setClicked(null)}
                    theme={theme}
                />
            )}
        </>
    );
}

// ─── Uptime bar with hover titles and click modals ───────────────────────────
function UptimeBar({ history, theme }: { history: any[]; theme: string }) {
    const [clicked, setClicked] = useState<{ check: any; x: number; y: number } | null>(null);
    const last50 = history.slice(-50);

    if (last50.length === 0) return null;

    return (
        <>
            <div className="flex gap-px h-5 rounded overflow-hidden">
                {last50.map((h, i) => (
                    <div
                        key={i}
                        className={`flex-1 rounded-sm cursor-pointer transition-opacity hover:opacity-70 ${h.isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`}
                        title={`${new Date(h.checkedAt).toLocaleString()} — ${h.isSuccess ? `${h.statusCode} (${h.responseTime}ms)` : `FAIL: ${h.error || h.statusCode}`}`}
                        onClick={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setClicked({ check: h, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                    />
                ))}
            </div>

            {clicked && (
                <CheckDetailModal
                    check={clicked.check}
                    anchor={{ x: clicked.x, y: clicked.y - 8 }}
                    onClose={() => setClicked(null)}
                    theme={theme}
                />
            )}
        </>
    );
}

// ─── Monitor Card ─────────────────────────────────────────────────────────────
function MonitorCard({ monitor, documentationId, theme, themeClasses }: {
    monitor: any;
    documentationId: string;
    theme: string;
    themeClasses: any;
}) {
    const queryClient = useQueryClient();
    const [expanded, setExpanded] = useState(false);

    const { data: historyRes, isLoading: histLoading } = useQuery({
        queryKey: ['monitor-history', monitor.id],
        queryFn: () => api.monitor.history(monitor.id, 100),
        enabled: expanded,
        refetchInterval: expanded ? 30000 : false,
    });

    const checkMutation = useMutation({
        mutationFn: () => api.monitor.check(monitor.id),
        onSuccess: () => {
            toast.success('Check triggered!');
            queryClient.invalidateQueries({ queryKey: ['monitors', documentationId] });
            queryClient.invalidateQueries({ queryKey: ['monitor-history', monitor.id] });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: () => api.monitor.update(monitor.id, { isActive: !monitor.isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['monitors', documentationId] });
            toast.success(monitor.isActive ? 'Monitor paused' : 'Monitor resumed');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.monitor.delete(monitor.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['monitors', documentationId] });
            toast.success('Monitor deleted');
        },
    });

    const total = parseInt(monitor.totalChecks) || 0;
    const success = parseInt(monitor.successCount) || 0;
    const uptime = total > 0 ? ((success / total) * 100).toFixed(1) : null;
    const avgMs = monitor.avgResponseTime ? Math.round(monitor.avgResponseTime) : null;
    const history = historyRes?.data || [];
    const isUp = monitor.lastStatus === true;
    const hasData = total > 0;

    const prevStatusRef = useRef(monitor.lastStatus);
    const prevTimeRef = useRef(monitor.lastCheckedAt);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).desktopAPI?.showNotification) {
            if (monitor.lastStatus === false && monitor.isActive &&
                (prevStatusRef.current !== monitor.lastStatus || prevTimeRef.current !== monitor.lastCheckedAt)) {
                (window as any).desktopAPI.showNotification(
                    'Monitor Alert: ' + monitor.name,
                    `Check failed at ${new Date(monitor.lastCheckedAt).toLocaleTimeString()}`
                );
            }
        }
        prevStatusRef.current = monitor.lastStatus;
        prevTimeRef.current = monitor.lastCheckedAt;
    }, [monitor.lastStatus, monitor.lastCheckedAt, monitor.isActive, monitor.name]);

    return (
        <div className={`rounded-2xl border transition-all ${theme === 'dark'
            ? 'bg-white/5 border-white/5 hover:border-indigo-500/20'
            : 'bg-white border-gray-100 hover:border-indigo-200 shadow-sm'
            }`}>
            {/* Header */}
            <div className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${!hasData ? (theme === 'dark' ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')
                    : isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                    {!hasData ? <Activity size={18} /> : isUp ? <Wifi size={18} /> : <WifiOff size={18} />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm truncate ${themeClasses.textColor}`}>{monitor.name}</h3>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${monitor.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-500'}`}>
                            {monitor.isActive ? 'ACTIVE' : 'PAUSED'}
                        </span>
                    </div>
                    <p className={`text-[11px] truncate ${themeClasses.subTextColor}`}>
                        <span className={`font-mono text-[9px] px-1 py-0.5 rounded mr-1 ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            {monitor.method}
                        </span>
                        {monitor.url}
                    </p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    {uptime !== null && (
                        <div className="text-center">
                            <p className={`text-xs font-bold ${parseFloat(uptime) >= 99 ? 'text-emerald-400' : parseFloat(uptime) >= 90 ? 'text-yellow-400' : 'text-red-400'}`}>{uptime}%</p>
                            <p className={`text-[10px] ${themeClasses.subTextColor}`}>Uptime</p>
                        </div>
                    )}
                    {avgMs !== null && (
                        <div className="text-center">
                            <p className={`text-xs font-bold ${themeClasses.textColor}`}>{avgMs}ms</p>
                            <p className={`text-[10px] ${themeClasses.subTextColor}`}>Avg</p>
                        </div>
                    )}
                    <div className="text-center">
                        <p className={`text-xs font-bold ${themeClasses.textColor}`}>{FREQUENCIES.find(f => f.value === monitor.frequency)?.label || monitor.frequency}</p>
                        <p className={`text-[10px] ${themeClasses.subTextColor}`}>Interval</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => checkMutation.mutate()} disabled={checkMutation.isPending}
                        className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}
                        title="Run check now">
                        {checkMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    </button>
                    <button onClick={() => toggleMutation.mutate()}
                        className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        title={monitor.isActive ? 'Pause' : 'Resume'}>
                        {monitor.isActive ? <WifiOff size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => deleteMutation.mutate()}
                        className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-red-500/20 text-gray-600 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                        title="Delete">
                        <Trash2 size={14} />
                    </button>
                    <button onClick={() => setExpanded(!expanded)}
                        className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className={`border-t px-4 pb-4 pt-3 space-y-3 ${theme === 'dark' ? 'border-white/5' : 'border-gray-100'}`}>
                    {histLoading ? (
                        <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>
                    ) : (
                        <>
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${themeClasses.subTextColor}`}>
                                    Response Time Trend
                                    <span className={`ml-2 font-normal normal-case ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>— hover to inspect, click to pin details</span>
                                </p>
                                <ResponseChart history={history} theme={theme} />
                            </div>
                            <div>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${themeClasses.subTextColor}`}>
                                    Last {Math.min(history.length, 50)} Checks
                                    <span className={`ml-2 font-normal normal-case ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>— click any bar for details</span>
                                </p>
                                <UptimeBar history={history} theme={theme} />
                            </div>
                            {history.length > 0 && (
                                <div className="grid grid-cols-3 gap-3 mt-1">
                                    {[
                                        { label: 'Last Check', value: monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleTimeString() : 'Never' },
                                        { label: 'Total Checks', value: total.toLocaleString() },
                                        { label: 'Failures', value: (total - success).toString() },
                                    ].map(stat => (
                                        <div key={stat.label} className={`p-2 rounded-xl text-center ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                                            <p className={`text-xs font-bold ${themeClasses.textColor}`}>{stat.value}</p>
                                            <p className={`text-[10px] ${themeClasses.subTextColor}`}>{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function MonitorDashboard({ documentationId }: MonitorDashboardProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const queryClient = useQueryClient();

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', url: '', method: 'GET', frequency: '5min', notifyEmail: '' });

    const { data: monitorsRes, isLoading } = useQuery({
        queryKey: ['monitors', documentationId],
        queryFn: () => api.monitor.list(documentationId),
        refetchInterval: 60000,
    });

    const createMutation = useMutation({
        mutationFn: () => api.monitor.create({ ...form, documentationId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['monitors', documentationId] });
            setShowForm(false);
            setForm({ name: '', url: '', method: 'GET', frequency: '5min', notifyEmail: '' });
            toast.success('Monitor created & scheduled!');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to create monitor'),
    });

    const monitors = monitorsRes?.data || [];

    const overallStats = useMemo(() => {
        const total = monitors.reduce((s: number, m: any) => s + (parseInt(m.totalChecks) || 0), 0);
        const success = monitors.reduce((s: number, m: any) => s + (parseInt(m.successCount) || 0), 0);
        const upCount = monitors.filter((m: any) => m.lastStatus === true && m.isActive).length;
        const activeCount = monitors.filter((m: any) => m.isActive).length;
        const avgMs = monitors.length > 0
            ? Math.round(monitors.reduce((s: number, m: any) => s + (parseInt(m.avgResponseTime) || 0), 0) / monitors.length) : 0;
        return { total, success, upCount, activeCount, avgMs, uptime: total > 0 ? ((success / total) * 100).toFixed(1) : null };
    }, [monitors]);

    const inputClass = `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${theme === 'dark'
        ? 'bg-[#0f0f1a] border-indigo-500/20 text-gray-200 placeholder-gray-600'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
        }`;

    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Activity size={22} />
                    </div>
                    <div>
                        <h2 className={`text-lg font-bold ${themeClasses.textColor}`}>API Monitoring</h2>
                        <p className={`text-xs ${themeClasses.subTextColor}`}>Scheduled uptime &amp; performance tracking</p>
                    </div>
                </div>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all">
                    <Plus size={16} /> New Monitor
                </button>
            </div>

            {/* Stats row */}
            {monitors.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Overall Uptime', value: overallStats.uptime ? `${overallStats.uptime}%` : '—', icon: <CheckCircle2 size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { label: 'Monitors Up', value: `${overallStats.upCount} / ${overallStats.activeCount}`, icon: <Wifi size={16} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                        { label: 'Avg Response', value: overallStats.avgMs ? `${overallStats.avgMs}ms` : '—', icon: <Clock size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { label: 'Total Checks', value: overallStats.total.toLocaleString(), icon: <Activity size={16} />, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    ].map(stat => (
                        <div key={stat.label} className={`p-4 rounded-2xl border flex items-center gap-3 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>{stat.icon}</div>
                            <div>
                                <p className={`text-base font-bold ${themeClasses.textColor}`}>{stat.value}</p>
                                <p className={`text-[11px] ${themeClasses.subTextColor}`}>{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create form */}
            {showForm && (
                <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                    <h3 className={`text-sm font-bold mb-4 ${themeClasses.textColor}`}>Configure New Monitor</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className={inputClass} placeholder="Monitor name (e.g., Production API Health)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                        <input className={inputClass} placeholder="URL to monitor (https://...)" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
                        <select className={inputClass} value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select className={inputClass} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                            {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <input className={`${inputClass} md:col-span-2`} placeholder="Alert email (optional)" value={form.notifyEmail} onChange={e => setForm(f => ({ ...f, notifyEmail: e.target.value }))} />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => createMutation.mutate()} disabled={!form.name || !form.url || createMutation.isPending}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all">
                            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                            Create Monitor
                        </button>
                        <button onClick={() => setShowForm(false)}
                            className={`px-4 py-2 rounded-xl text-sm transition-all ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Monitor list */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                    <p className="text-sm">Loading monitors...</p>
                </div>
            ) : monitors.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl gap-4 ${theme === 'dark' ? 'border-white/5 text-gray-600' : 'border-gray-200 text-gray-400'}`}>
                    <Activity size={40} className="opacity-20" />
                    <div className="text-center">
                        <p className="font-bold text-sm">No monitors yet</p>
                        <p className="text-xs mt-1">Create a monitor to track API uptime and performance</p>
                    </div>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all">
                        <Plus size={14} /> Create first monitor
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {monitors.map((monitor: any) => (
                        <MonitorCard key={monitor.id} monitor={monitor} documentationId={documentationId} theme={theme} themeClasses={themeClasses} />
                    ))}
                </div>
            )}
        </div>
    );
}
