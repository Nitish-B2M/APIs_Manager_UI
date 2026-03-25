'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../utils/api';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Clock, Loader2, ArrowLeft } from 'lucide-react';

// ─── Reusable Heatmap Component for Public Page ──────────────────────────
function PublicLatencyHeatmap({ heatmapData }: { heatmapData: any[] }) {
    const [hover, setHover] = useState<{ bin: any; idx: number; x: number; y: number } | null>(null);

    const bins = useMemo(() => {
        const _bins: { time: Date; total: number; success: number; avgResponseTime: number | null }[] = [];
        const now = new Date();
        now.setMinutes(0, 0, 0);

        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 60 * 60 * 1000);
            _bins.push({
                time: d,
                total: 0,
                success: 0,
                avgResponseTime: null
            });
        }

        if (heatmapData && Array.isArray(heatmapData)) {
            heatmapData.forEach(row => {
                const hTime = new Date(row.hour).getTime();
                const bin = _bins.find(b => Math.abs(b.time.getTime() - hTime) < 1000 * 60 * 30);
                if (bin) {
                    bin.total = parseInt(row.total) || 0;
                    bin.success = parseInt(row.success) || 0;
                    bin.avgResponseTime = row.avgResponseTime ? parseInt(row.avgResponseTime) : null;
                }
            });
        }
        return _bins;
    }, [heatmapData]);

    const getColor = (bin: any) => {
        if (bin.total === 0) return '#e5e7eb'; // gray-200
        const successRate = bin.success / bin.total;
        if (successRate < 0.8) return '#ef4444'; // red-500
        if (successRate < 1.0) return '#f59e0b'; // amber-500
        return '#10b981'; // emerald-500
    };

    return (
        <div className="relative">
            <div className="flex gap-1 h-10 w-full">
                {bins.map((bin, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-sm cursor-pointer transition-transform hover:scale-105"
                        style={{ backgroundColor: getColor(bin) }}
                        onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect();
                            setHover({ bin, idx: i, x: rect.left + rect.width / 2, y: rect.top });
                        }}
                        onMouseLeave={() => setHover(null)}
                    />
                ))}
            </div>

            <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-widest text-gray-500">
                <span>24 hours ago</span>
                <span>Today</span>
            </div>

            {hover !== null && (
                <div
                    className="fixed pointer-events-none px-4 py-3 rounded-2xl text-sm shadow-2xl border z-[9999] bg-white border-gray-100 text-gray-900"
                    style={{
                        left: hover.x,
                        top: hover.y - 12,
                        transform: 'translate(-50%, -100%)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <div className="font-bold mb-2 text-[11px] uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-2">
                        {hover.bin.time.toLocaleDateString()} {hover.bin.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {hover.bin.total === 0 ? (
                        <span className="text-gray-500 font-medium text-sm">No data available for this hour</span>
                    ) : (
                        <div className="space-y-1.5">
                            <div className="flex justify-between gap-6">
                                <span className="text-gray-500">Checks</span>
                                <span className="font-mono font-bold">{hover.bin.success} / {hover.bin.total}</span>
                            </div>
                            <div className="flex justify-between gap-6">
                                <span className="text-gray-500">Success Rate</span>
                                <span className={`font-mono font-bold ${hover.bin.success === hover.bin.total ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {Math.round((hover.bin.success / hover.bin.total) * 100)}%
                                </span>
                            </div>
                            <div className="flex justify-between gap-6">
                                <span className="text-gray-500">Avg Latency</span>
                                <span className="font-mono font-bold text-indigo-500">{hover.bin.avgResponseTime}ms</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Status Page Component ──────────────────────────────────────────
export default function PublicStatusPage() {
    const { slug } = useParams();
    const router = useRouter();

    const { data: statusRes, isLoading, error } = useQuery({
        queryKey: ['public-status', slug],
        queryFn: () => api.monitor.getPublicStatus(slug as string),
        enabled: !!slug,
        refetchInterval: 60000 // Refresh data every minute automatically
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !statusRes?.data) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-6">
                <AlertCircle size={64} className="text-red-400 mb-6" />
                <h1 className="text-3xl font-black text-gray-900 mb-2">Status Page Not Found</h1>
                <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
                    This status page doesn't exist, is private, or the documentation hasn't been set to public.
                </p>
                <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                    <ArrowLeft size={18} /> Return Home
                </button>
            </div>
        );
    }

    const { documentation, monitors } = statusRes.data;

    // Calculate system status
    const allUp = monitors.length > 0 && monitors.every((m: any) => m.lastStatus === true);
    const someDown = monitors.some((m: any) => m.lastStatus === false);

    // Default to operational if no monitors yet (or all up)
    const isOperational = monitors.length === 0 || allUp;

    return (
        <div className="min-h-screen bg-[#fafafa] text-gray-900 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-gray-900">{documentation.title}</h1>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 mt-1">Status Center</p>
                    </div>
                    <a href={`/public/${slug}`} className="text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-2">
                        View Documentation <ArrowLeft size={14} className="rotate-180" />
                    </a>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                {/* Overall Status Banner */}
                <div className={`p-8 rounded-[2rem] shadow-xl border mb-12 flex items-center justify-between transition-colors ${isOperational
                        ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20'
                        : 'bg-red-500 border-red-600 text-white shadow-red-500/20'
                    }`}>
                    <div>
                        <h2 className="text-3xl font-black mb-2">
                            {isOperational ? 'All Systems Operational' : 'Partial System Outage'}
                        </h2>
                        <p className="text-white/80 font-medium">
                            Last updated {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
                        {isOperational ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
                    </div>
                </div>

                {/* Services List */}
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-gray-900 px-2">API Services ({monitors.length})</h3>

                    {monitors.length === 0 ? (
                        <div className="p-12 text-center bg-white border border-gray-200 rounded-[2rem] shadow-sm">
                            <Clock size={48} className="mx-auto text-gray-300 mb-4" />
                            <h4 className="text-lg font-bold text-gray-900 mb-2">No active monitors</h4>
                            <p className="text-gray-500">This API does not have any active status monitors configured.</p>
                        </div>
                    ) : (
                        monitors.map((monitor: any) => {
                            const uptime = monitor.totalChecks > 0
                                ? ((monitor.successCount / monitor.totalChecks) * 100).toFixed(1)
                                : '100.0';

                            const isUp = monitor.lastStatus === true || monitor.totalChecks === 0;

                            return (
                                <div key={monitor.id} className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-sm hover:border-indigo-200 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 flex-shrink-0">
                                                <div className={`w-3 h-3 rounded-full ${isUp ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse'}`} />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-gray-900">{monitor.name}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                                        {monitor.method}
                                                    </span>
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {isUp ? 'Operational' : 'Outage'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Uptime</p>
                                                <p className="text-sm font-black font-mono text-gray-900">{uptime}%</p>
                                            </div>
                                            <div className="w-px h-8 bg-gray-200" />
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Avg Latency</p>
                                                <p className="text-sm font-black font-mono text-gray-900">{monitor.avgResponseTime || '--'}ms</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SVG Heatmap */}
                                    <div className="pt-2">
                                        <PublicLatencyHeatmap heatmapData={monitor.heatmap} />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            <footer className="mt-20 py-8 border-t border-gray-200 text-center bg-white">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                    Powered by DevManus Docs Manager
                </p>
            </footer>
        </div>
    );
}
