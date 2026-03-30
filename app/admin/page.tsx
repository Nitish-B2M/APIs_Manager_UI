'use client';

import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Users, FolderOpen, FileCode2, Activity, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

interface OverviewStats {
    totalUsers: number;
    totalCollections: number;
    totalRequests: number;
    activeMonitors: number;
    recentUsers: any[];
    recentErrors: any[];
}

export default function AdminOverviewPage() {
    const [stats, setStats] = useState<OverviewStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.admin.overviewStats();
                setStats(res.data);
            } catch { /* silent */ }
            finally { setLoading(false); }
        })();
    }, []);

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#58A6FF' },
        { label: 'Collections', value: stats.totalCollections, icon: FolderOpen, color: '#249d9f' },
        { label: 'Requests', value: stats.totalRequests, icon: FileCode2, color: '#D29922' },
        { label: 'Active Monitors', value: stats.activeMonitors, icon: Activity, color: '#3FB950' },
    ] : [];

    const quickLinks = [
        { label: 'Email Templates', href: '/admin/templates' },
        { label: 'Contact Messages', href: '/admin/contacts' },
        { label: 'System Logs', href: '/admin/logs' },
        { label: 'User Management', href: '/admin/users' },
        { label: 'Error Logs', href: '/admin/logs' },
        { label: 'Settings', href: '/admin/settings' },
    ];

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-6 h-6 border-2 border-[#249d9f] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#E6EDF3', marginBottom: 4 }}>Admin Overview</h1>
                <p style={{ fontSize: 13, color: '#8B949E' }}>Platform summary and quick actions</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4">
                {statCards.map(card => (
                    <div key={card.label} style={{
                        background: '#161B22', border: '1px solid #21262D', borderRadius: 12, padding: 20,
                        display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 10, background: `${card.color}15`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <card.icon size={20} style={{ color: card.color }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#E6EDF3' }}>{card.value.toLocaleString()}</div>
                            <div style={{ fontSize: 11, color: '#8B949E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Quick Links */}
                <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Quick Links</h3>
                    <div className="space-y-1">
                        {quickLinks.map(link => (
                            <Link key={link.href} href={link.href}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, fontSize: 13, color: '#E6EDF3', textDecoration: 'none' }}
                                className="hover:bg-white/5 transition-colors"
                            >
                                {link.label}
                                <ArrowRight size={14} style={{ color: '#484F58' }} />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Users */}
                <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recent Users</h3>
                    <div className="space-y-2">
                        {stats?.recentUsers.slice(0, 6).map(user => (
                            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                                <div style={{
                                    width: 28, height: 28, borderRadius: 14, background: '#1C2128', border: '1px solid #21262D',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#8B949E',
                                }}>
                                    {(user.name || user.email)?.[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, color: '#E6EDF3', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user.name || user.email}
                                    </div>
                                    <div style={{ fontSize: 10, color: '#484F58' }}>{timeAgo(user.createdAt)}</div>
                                </div>
                                {user.is_admin && (
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#249d9f15', color: '#249d9f' }}>ADMIN</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Errors */}
                <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Recent Errors</h3>
                    <div className="space-y-2">
                        {stats?.recentErrors.length === 0 && (
                            <p style={{ fontSize: 12, color: '#484F58', fontStyle: 'italic' }}>No errors recorded</p>
                        )}
                        {stats?.recentErrors.slice(0, 6).map(err => (
                            <div key={err.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0' }}>
                                <AlertTriangle size={13} style={{ color: err.level === 'critical' ? '#F85149' : '#D29922', marginTop: 2, flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {err.message}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                        <span style={{ fontSize: 9, color: '#484F58', fontFamily: 'monospace' }}>{err.error_code}</span>
                                        <span style={{ fontSize: 9, color: '#484F58' }}>{timeAgo(err.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
