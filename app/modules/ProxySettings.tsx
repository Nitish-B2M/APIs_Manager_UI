'use client';

import React, { useState, useEffect } from 'react';
import { Network, Save, Loader2, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeClasses } from '../docs/[id]/utils/theme';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function ProxySettings() {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const { refreshUser } = useAuth();
    const queryClient = useQueryClient();

    const [isDesktop, setIsDesktop] = useState(false);
    const [config, setConfig] = useState<{ type: 'none' | 'http' | 'socks5', host?: string, port?: string, bypass?: string }>({ type: 'none' });
    const [saving, setSaving] = useState(false);

    // Fetch user profile to get web settings
    const { data: meRes } = useQuery({ queryKey: ['me'], queryFn: api.auth.me });
    const me = meRes?.data;

    const updateMutation = useMutation({
        mutationFn: (data: { settings: Record<string, any> }) => api.auth.updateProfile(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
            refreshUser();
            toast.success('Web proxy settings saved');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to save settings');
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).desktopAPI?.isDesktop) {
            setIsDesktop(true);
            (window as any).desktopAPI.getProxySettings().then((res: any) => {
                if (res) setConfig(res);
            });
        } else if (me?.settings?.proxyConfig) {
            setConfig(me.settings.proxyConfig);
        }
    }, [me]);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isDesktop) {
                await (window as any).desktopAPI?.setProxySettings(config);
                toast.success('System proxy applied via Desktop App');
            } else {
                const newSettings = {
                    ...(me?.settings || {}),
                    proxyConfig: config
                };
                await updateMutation.mutateAsync({ settings: newSettings });
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to apply proxy');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = `w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-900'
        }`;

    const containerStyle = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';

    return (
        <div className={`p-8 rounded-xl border flex flex-col gap-8 ${containerStyle}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Network size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Network Proxy</h3>
                        <p className={`text-sm ${themeClasses.subTextColor}`}>
                            {isDesktop
                                ? 'Configure system-level proxy for all desktop app traffic.'
                                : 'Configure app-level proxy for your browser sessions.'}
                        </p>
                    </div>
                </div>
                {!isDesktop && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <Info size={12} /> Web Mode
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-3 ${themeClasses.subTextColor}`}>Proxy Type</label>
                    <div className="flex flex-wrap gap-6">
                        {['none', 'http', 'socks5'].map(t => (
                            <label key={t} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="proxyType"
                                    value={t}
                                    checked={config.type === t}
                                    onChange={() => setConfig({ ...config, type: t as any })}
                                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                />
                                <span className={`text-sm font-medium transition-colors group-hover:text-indigo-500 ${config.type === t ? 'text-indigo-500' : themeClasses.textColor}`}>
                                    {t === 'none' ? 'Direct (No Proxy)' : t.toUpperCase()}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {config.type !== 'none' && (
                    <>
                        <div className="space-y-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${themeClasses.subTextColor}`}>Proxy Host</label>
                            <input
                                className={inputClass}
                                placeholder="127.0.0.1 or proxy.example.com"
                                value={config.host || ''}
                                onChange={e => setConfig({ ...config, host: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${themeClasses.subTextColor}`}>Port</label>
                            <input
                                className={inputClass}
                                placeholder="8080 or 1080"
                                value={config.port || ''}
                                onChange={e => setConfig({ ...config, port: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${themeClasses.subTextColor}`}>Bypass Rules</label>
                            <input
                                className={inputClass}
                                placeholder="localhost, 127.0.0.1, *.local"
                                value={config.bypass || ''}
                                onChange={e => setConfig({ ...config, bypass: e.target.value })}
                            />
                            <p className="text-[11px] text-gray-500 italic">Comma-separated list of hosts to bypass the proxy.</p>
                        </div>
                    </>
                )}
            </div>

            <div className={`pt-6 border-t flex items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="text-[11px] text-gray-500 max-w-md">
                    Note: Proxy settings are applied to outbound requests {isDesktop ? 'system-wide' : 'within this application instance'}.
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || updateMutation.isPending || (config.type !== 'none' && !config.host)}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold transition-all shadow-lg hover:shadow-indigo-500/30"
                >
                    {saving || updateMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Apply Settings
                </button>
            </div>
        </div>
    );
}
