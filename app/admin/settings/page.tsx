'use client';

import { useState, useEffect } from 'react';
import { api } from '../../../utils/api';
import { ToggleLeft, ToggleRight, Mail, Database, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface FeatureFlag {
    name: string;
    description: string;
    enabled: boolean;
}

export default function AdminSettingsPage() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [smtp, setSmtp] = useState<{ configured: boolean; host: string | null } | null>(null);
    const [migrations, setMigrations] = useState<{ applied: string | number; pending: string | number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [flagsRes, smtpRes, migrationsRes] = await Promise.all([
                    api.admin.getFeatureFlags(),
                    api.admin.getSmtpStatus(),
                    api.admin.getMigrationStatus(),
                ]);
                setFlags(flagsRes.data);
                setSmtp(smtpRes.data);
                setMigrations(migrationsRes.data);
            } catch { /* silent */ }
            finally { setLoading(false); }
        })();
    }, []);

    const clearSessions = async () => {
        if (!confirm('Clear ALL user sessions? Everyone will need to log in again.')) return;
        try {
            const res = await api.admin.clearSessions();
            toast.success(res.message);
        } catch { toast.error('Failed to clear sessions'); }
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
                <h1 style={{ fontSize: 24, fontWeight: 700, color: '#E6EDF3', marginBottom: 4 }}>Admin Settings</h1>
                <p style={{ fontSize: 13, color: '#8B949E' }}>Platform configuration and feature flags</p>
            </div>

            {/* Feature Flags */}
            <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #21262D' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>Feature Flags</h3>
                    <p style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>Toggle features on/off. Override via environment variables (FF_FLAG_NAME=true|false).</p>
                </div>
                <div>
                    {flags.map(flag => (
                        <div key={flag.name} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 20px', borderBottom: '1px solid #21262D',
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#E6EDF3' }}>{flag.name}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#8B949E', marginTop: 2 }}>{flag.description}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {flag.enabled
                                    ? <ToggleRight size={24} style={{ color: '#3FB950' }} />
                                    : <ToggleLeft size={24} style={{ color: '#484F58' }} />}
                                <span style={{ fontSize: 10, fontWeight: 700, color: flag.enabled ? '#3FB950' : '#484F58' }}>
                                    {flag.enabled ? 'ON' : 'OFF'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* SMTP Status */}
                <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <Mail size={18} style={{ color: '#249d9f' }} />
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>Email (SMTP)</h3>
                    </div>
                    <div className="space-y-3">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#8B949E' }}>Status</span>
                            <span style={{
                                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                                background: smtp?.configured ? '#3FB95015' : '#F8514915',
                                color: smtp?.configured ? '#3FB950' : '#F85149',
                            }}>
                                {smtp?.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
                            </span>
                        </div>
                        {smtp?.host && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#8B949E' }}>Host</span>
                                <span style={{ fontSize: 12, color: '#E6EDF3', fontFamily: 'monospace' }}>{smtp.host}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Database / Migrations */}
                <div style={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 12, padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <Database size={18} style={{ color: '#58A6FF' }} />
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>Database Migrations</h3>
                    </div>
                    <div className="space-y-3">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#8B949E' }}>Applied</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#3FB950' }}>{migrations?.applied ?? '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#8B949E' }}>Pending</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: migrations?.pending === 0 ? '#3FB950' : '#D29922' }}>
                                {migrations?.pending ?? '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div style={{ background: '#161B22', border: '1px solid #F8514930', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <AlertTriangle size={18} style={{ color: '#F85149' }} />
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F85149' }}>Danger Zone</h3>
                </div>
                <div className="space-y-3">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#0D1117', borderRadius: 8, border: '1px solid #21262D' }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#E6EDF3' }}>Clear All Sessions</div>
                            <div style={{ fontSize: 11, color: '#8B949E' }}>Invalidate all refresh tokens. Every user will need to log in again.</div>
                        </div>
                        <button onClick={clearSessions} style={{
                            padding: '6px 14px', borderRadius: 8, border: '1px solid #F8514930',
                            background: 'transparent', color: '#F85149', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <Trash2 size={13} /> Clear Sessions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
