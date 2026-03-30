'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { api, API_URL } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Notification {
    id: string;
    code: string;
    type: string;
    severity: 'info' | 'warn' | 'critical';
    title: string;
    message: string | null;
    link: string | null;
    read: boolean;
    createdAt: string;
}

export default function NotificationBell() {
    const { isLoggedIn } = useAuth();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            setLoading(true);
            const res = await api.notifications.list(1);
            setNotifications(res.data?.notifications || []);
            setUnreadCount(res.data?.unreadCount || 0);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [isLoggedIn]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    // SSE real-time push
    useEffect(() => {
        if (!isLoggedIn) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource(`${API_URL}/api/notifications/stream`, { withCredentials: true } as any);

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'init') {
                        setUnreadCount(data.unreadCount);
                    } else if (data.type === 'notification') {
                        setNotifications(prev => [data.notification, ...prev].slice(0, 30));
                        setUnreadCount(prev => prev + 1);
                        // Show toast for critical notifications
                        if (data.notification.severity === 'critical') {
                            toast.error(data.notification.title);
                        }
                    }
                } catch { /* ignore parse errors */ }
            };

            eventSource.onerror = () => {
                eventSource?.close();
            };
        } catch { /* SSE not supported */ }

        return () => { eventSource?.close(); };
    }, [isLoggedIn]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const markRead = async (id: string) => {
        try {
            await api.notifications.markRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const markAllRead = async () => {
        try {
            await api.notifications.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const deleteNotif = async (id: string) => {
        try {
            await api.notifications.delete(id);
            const removed = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (removed && !removed.read) setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const severityIcon = (s: string) => {
        if (s === 'critical') return <AlertTriangle size={14} style={{ color: '#F85149' }} />;
        if (s === 'warn') return <AlertCircle size={14} style={{ color: '#D29922' }} />;
        return <Info size={14} style={{ color: '#58A6FF' }} />;
    };

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        return `${Math.floor(hrs / 24)}d`;
    };

    if (!isLoggedIn) return null;

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell button */}
            <button
                onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
                style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: unreadCount > 0 ? '#E6EDF3' : '#8B949E', position: 'relative' }}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, background: '#F85149', color: 'white', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 8, width: 380,
                    background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.4)', zIndex: 100, maxHeight: '80vh',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>Notifications</span>
                            {unreadCount > 0 && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: 'rgba(248,81,73,0.15)', color: '#F85149' }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead} style={{ fontSize: 11, fontWeight: 600, color: '#249d9f', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <CheckCheck size={13} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
                        {notifications.length === 0 && !loading && (
                            <div style={{ padding: 40, textAlign: 'center' }}>
                                <Bell size={24} style={{ color: '#6E7681', opacity: 0.3, margin: '0 auto 8px' }} />
                                <p style={{ fontSize: 13, color: '#6E7681' }}>No notifications yet</p>
                            </div>
                        )}
                        {notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => { if (!n.read) markRead(n.id); if (n.link) window.location.href = n.link; }}
                                style={{
                                    display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    background: n.read ? 'transparent' : 'rgba(36,157,159,0.04)',
                                    transition: 'background 0.1s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#1C2128'}
                                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(36,157,159,0.04)'}
                            >
                                <div style={{ flexShrink: 0, marginTop: 2 }}>{severityIcon(n.severity)}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                        <span style={{ fontSize: 13, fontWeight: n.read ? 400 : 600, color: n.read ? '#8B949E' : '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                                        {!n.read && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#249d9f', flexShrink: 0 }} />}
                                    </div>
                                    {n.message && <p style={{ fontSize: 12, color: '#6E7681', lineHeight: 1.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.message}</p>}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                        <span style={{ fontSize: 10, color: '#6E7681' }}>{timeAgo(n.createdAt)}</span>
                                        <span style={{ fontSize: 9, color: '#6E7681', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>{n.code}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteNotif(n.id); }}
                                    style={{ padding: 4, borderRadius: 4, background: 'none', border: 'none', color: '#6E7681', flexShrink: 0, opacity: 0 }}
                                    className="group-hover:opacity-100"
                                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#F85149'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = '#6E7681'; }}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
