'use client';

import React, { useState, useEffect } from 'react';
import { Network, Save, Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeClasses } from '../docs/[id]/utils/theme';
import { toast } from 'react-hot-toast';

export function ProxySettings() {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const [isDesktop, setIsDesktop] = useState(false);
    const [config, setConfig] = useState<{ type: 'none' | 'http' | 'socks5', host?: string, port?: string, bypass?: string }>({ type: 'none' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).desktopAPI?.isDesktop) {
            setIsDesktop(true);
            (window as any).desktopAPI.getProxySettings().then((res: any) => {
                if (res) setConfig(res);
            });
        }
    }, []);

    if (!isDesktop) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await (window as any).desktopAPI?.setProxySettings(config);
            toast.success('Proxy settings applied');
        } catch (err: any) {
            toast.error(err.message || 'Failed to apply proxy');
        } finally {
            setSaving(false);
        }
    };

    const inputClass = `w-full px-3 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${theme === 'dark' ? 'bg-[#0f0f1a] border-indigo-500/20 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
        }`;

    return (
        <div className={`p-6 rounded-2xl border flex flex-col gap-6 ${theme === 'dark' ? 'bg-[#1a1a2e] border-indigo-500/20' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                    <Network size={24} />
                </div>
                <div>
                    <h3 className={`text-lg font-bold ${themeClasses.textColor}`}>Network Proxy</h3>
                    <p className={`text-sm ${themeClasses.subTextColor}`}>Configure HTTP or SOCKS5 proxy for all API requests sent from the desktop app.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeClasses.subTextColor}`}>Proxy Type</label>
                    <div className="flex gap-4">
                        {['none', 'http', 'socks5'].map(t => (
                            <label key={t} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="proxyType" value={t} checked={config.type === t} onChange={() => setConfig({ ...config, type: t as any })} className="text-indigo-600 focus:ring-indigo-500" />
                                <span className={`text-sm ${themeClasses.textColor}`}>{t === 'none' ? 'Direct (No Proxy)' : t.toUpperCase()}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {config.type !== 'none' && (
                    <>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeClasses.subTextColor}`}>Host</label>
                            <input className={inputClass} placeholder="e.g. 127.0.0.1 or proxy.example.com" value={config.host || ''} onChange={e => setConfig({ ...config, host: e.target.value })} />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeClasses.subTextColor}`}>Port</label>
                            <input className={inputClass} placeholder="e.g. 8080 or 1080" value={config.port || ''} onChange={e => setConfig({ ...config, port: e.target.value })} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${themeClasses.subTextColor}`}>Bypass Rules (Optional)</label>
                            <input className={inputClass} placeholder="e.g. localhost,127.0.0.1" value={config.bypass || ''} onChange={e => setConfig({ ...config, bypass: e.target.value })} />
                            <p className="text-[10px] mt-1 text-gray-500">Comma-separated list of hosts to bypass the proxy.</p>
                        </div>
                    </>
                )}
            </div>

            <div className={`pt-4 border-t flex justify-end ${theme === 'dark' ? 'border-indigo-500/20' : 'border-gray-100'}`}>
                <button
                    onClick={handleSave}
                    disabled={saving || (config.type !== 'none' && !config.host)}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Apply Settings
                </button>
            </div>
        </div>
    );
}
