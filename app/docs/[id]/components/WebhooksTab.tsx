'use client';

import React, { useState, useEffect } from 'react';
import { 
    Webhook, Plus, Trash2, Shield, Globe, Clock, 
    CheckCircle2, XCircle, AlertCircle, Loader2, 
    ChevronDown, ChevronUp, Activity, ExternalLink
} from 'lucide-react';
import { api } from '../../../../utils/api';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';

interface WebhooksTabProps {
    documentationId: string;
    canAdmin: boolean;
}

export function WebhooksTab({ documentationId, canAdmin }: WebhooksTabProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const [webhooks, setWebhooks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
    const [logs, setLogs] = useState<Record<string, any[]>>({});
    const [isLoadingLogs, setIsLoadingLogs] = useState<Record<string, boolean>>({});

    const [newWebhook, setNewWebhook] = useState({
        name: '',
        url: '',
        secret: '',
        events: ['request.created']
    });

    const availableEvents = [
        { id: 'request.created', name: 'Request Created', description: 'Triggered when a new request is added to the collection' },
        { id: 'monitor.failure', name: 'Monitor Failure', description: 'Triggered when an API monitor check fails' }
    ];

    useEffect(() => {
        fetchWebhooks();
    }, [documentationId]);

    const fetchWebhooks = async () => {
        setIsLoading(true);
        try {
            const result = await api.webhooks.list(documentationId);
            setWebhooks(result.data);
        } catch (error) {
            console.error('Failed to fetch webhooks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async (webhookId: string) => {
        setIsLoadingLogs(prev => ({ ...prev, [webhookId]: true }));
        try {
            const result = await api.webhooks.getLogs(webhookId);
            setLogs(prev => ({ ...prev, [webhookId]: result.data }));
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoadingLogs(prev => ({ ...prev, [webhookId]: false }));
        }
    };

    const handleCreate = async () => {
        if (!newWebhook.name || !newWebhook.url) {
            toast.error('Name and URL are required');
            return;
        }

        setIsCreating(true);
        try {
            await api.webhooks.create({
                documentationId,
                ...newWebhook
            });
            toast.success('Webhook created successfully');
            setShowAddModal(false);
            setNewWebhook({ name: '', url: '', secret: '', events: ['request.created'] });
            fetchWebhooks();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create webhook');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this webhook?')) return;

        try {
            await api.webhooks.delete(id);
            toast.success('Webhook deleted');
            fetchWebhooks();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete webhook');
        }
    };

    const toggleEvent = (eventId: string) => {
        setNewWebhook(prev => ({
            ...prev,
            events: prev.events.includes(eventId)
                ? prev.events.filter(e => e !== eventId)
                : [...prev.events, eventId]
        }));
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[#249d9f]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-lg font-black tracking-tight ${themeClasses.textColor}`}>Webhooks & Automations</h2>
                    <p className="text-[11px] text-gray-500 font-medium">Receive real-time notifications for collection events</p>
                </div>
                {canAdmin && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-[#1a7a7c] hover:bg-[#249d9f] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20"
                    >
                        <Plus size={16} /> ADD WEBHOOK
                    </button>
                )}
            </div>

            {/* Webhook List */}
            <div className="space-y-4">
                {webhooks.length === 0 && (
                    <div className="py-16 rounded-xl border border-dashed border-white/[0.08] flex flex-col items-center gap-5">
                        <Webhook size={32} className="text-[#6E7681] opacity-50" />
                        <div className="text-center max-w-sm">
                            <p className="text-[#E6EDF3] text-sm font-medium mb-1">Connect to Slack, Discord or your own endpoint</p>
                            <p className="text-[#6E7681] text-xs mb-5">Receive real-time notifications when collection events occur.</p>

                            {/* Quick-connect pills */}
                            <div className="flex justify-center gap-2 mb-5">
                                {[
                                    { name: 'Slack', icon: '💬', color: '#4A154B' },
                                    { name: 'Discord', icon: '🎮', color: '#5865F2' },
                                    { name: 'Custom', icon: '🔗', color: '#21262D' },
                                ].map(svc => (
                                    <button
                                        key={svc.name}
                                        onClick={() => setShowAddModal(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.08] hover:border-white/[0.16] transition-all"
                                        style={{ background: `${svc.color}20`, color: svc.color === '#21262D' ? '#8B949E' : svc.color }}
                                    >
                                        <span>{svc.icon}</span> {svc.name}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-5 py-2.5 rounded-lg bg-[#249d9f] text-white text-xs font-semibold hover:bg-[#1a7a7c] transition-colors"
                            >
                                + Add Webhook
                            </button>
                        </div>
                    </div>
                )}

                {webhooks.map((webhook) => (
                    <div 
                        key={webhook.id} 
                        className={`rounded-2xl border ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-white/5' : 'bg-white'} overflow-hidden transition-all`}
                    >
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-[#249d9f]/10 text-[#2ec4c7]' : 'bg-indigo-50 text-[#1a7a7c]'}`}>
                                    <Webhook size={20} />
                                </div>
                                <div>
                                    <h3 className={`text-sm font-bold ${themeClasses.textColor}`}>{webhook.name}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                            <Globe size={12} />
                                            <span className="truncate max-w-[200px]">{webhook.url}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-[#2ec4c7] font-bold bg-[#2ec4c7]/10 px-1.5 py-0.5 rounded">
                                            <Activity size={10} />
                                            {webhook.events.length} Events
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (expandedWebhook === webhook.id) {
                                            setExpandedWebhook(null);
                                        } else {
                                            setExpandedWebhook(webhook.id);
                                            fetchLogs(webhook.id);
                                        }
                                    }}
                                    className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-all text-gray-500`}
                                    title="View Logs"
                                >
                                    {expandedWebhook === webhook.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                                {canAdmin && (
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all"
                                        title="Delete Webhook"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expanded Logs Section */}
                        {expandedWebhook === webhook.id && (
                            <div className={`border-t ${themeClasses.borderCol} bg-black/5 p-4`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Recent Deliveries</h4>
                                    <button 
                                        onClick={() => fetchLogs(webhook.id)}
                                        className="text-[9px] font-bold text-[#2ec4c7] hover:underline"
                                    >
                                        Refresh
                                    </button>
                                </div>

                                {isLoadingLogs[webhook.id] ? (
                                    <div className="py-8 flex justify-center">
                                        <Loader2 size={16} className="animate-spin text-[#249d9f]" />
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {logs[webhook.id]?.length === 0 && (
                                            <div className="py-8 text-center text-[10px] italic text-gray-500">No logs found for this webhook.</div>
                                        )}
                                        {logs[webhook.id]?.map((log: any) => (
                                            <div key={log.id} className={`flex items-center justify-between p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-white'} border ${themeClasses.borderCol}`}>
                                                <div className="flex items-center gap-3">
                                                    {log.isSuccess ? (
                                                        <CheckCircle2 size={14} className="text-green-500" />
                                                    ) : (
                                                        <XCircle size={14} className="text-red-500" />
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span className={`text-[11px] font-bold ${themeClasses.textColor}`}>{log.event}</span>
                                                        <span className="text-[9px] text-gray-500 font-medium">{new Date(log.deliveredAt).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.isSuccess ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {log.statusCode || 'ERROR'}
                                                    </div>
                                                    <details className="relative">
                                                        <summary className="cursor-pointer list-none text-[10px] font-bold text-[#2ec4c7] hover:underline uppercase">Details</summary>
                                                        <div className={`absolute right-0 bottom-full mb-2 w-64 p-3 rounded-xl border ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-[#1a1b26]' : 'bg-white'} shadow-2xl z-[60]`}>
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Response Body</div>
                                                            <pre className="text-[10px] font-mono p-2 rounded bg-black/10 overflow-x-auto max-h-40 whitespace-pre-wrap">
                                                                {log.response || 'No response data'}
                                                            </pre>
                                                        </div>
                                                    </details>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Webhook Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
                    <div className={`w-full max-w-xl rounded-3xl border ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-[#1a1b26]' : 'bg-white'} shadow-2xl p-6 flex flex-col gap-6 animate-in zoom-in-95 duration-200`}>
                        <div>
                            <h2 className={`text-xl font-black tracking-tight ${themeClasses.textColor}`}>New Webhook</h2>
                            <p className="text-xs text-gray-500">Configure a new destination for workspace events</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Webhook Name</label>
                                <input
                                    type="text"
                                    value={newWebhook.name}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} ${themeClasses.inputBg} ${themeClasses.textColor} text-sm outline-none focus:ring-2 focus:ring-[#249d9f]/20 focus:border-[#249d9f] transition-all`}
                                    placeholder="e.g. My Slack App"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Payload URL</label>
                                <input
                                    type="text"
                                    value={newWebhook.url}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                    className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} ${themeClasses.inputBg} ${themeClasses.textColor} text-sm outline-none focus:ring-2 focus:ring-[#249d9f]/20 focus:border-[#249d9f] transition-all`}
                                    placeholder="https://hooks.slack.com/services/..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Secret Key (Optional)</label>
                                <div className="relative">
                                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                    <input
                                        type="password"
                                        value={newWebhook.secret}
                                        onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${themeClasses.borderCol} ${themeClasses.inputBg} ${themeClasses.textColor} text-sm outline-none focus:ring-2 focus:ring-[#249d9f]/20 focus:border-[#249d9f] transition-all`}
                                        placeholder="Used for HMAC signature verification"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Select Events</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableEvents.map(event => (
                                        <button
                                            key={event.id}
                                            onClick={() => toggleEvent(event.id)}
                                            className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                                                newWebhook.events.includes(event.id)
                                                    ? 'border-[#249d9f] bg-[#249d9f]/5 ring-1 ring-[#249d9f]/20'
                                                    : `${themeClasses.borderCol} ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} hover:border-gray-400`
                                            }`}
                                        >
                                            <div className={`mt-0.5 rounded-full border-2 p-0.5 flex items-center justify-center ${newWebhook.events.includes(event.id) ? 'border-[#249d9f] bg-[#249d9f]' : 'border-gray-400'}`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            </div>
                                            <div>
                                                <div className={`text-[11px] font-bold ${themeClasses.textColor}`}>{event.name}</div>
                                                <div className="text-[9px] text-gray-500 leading-tight mt-0.5">{event.description}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className={`flex-1 px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 transition-all`}
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={isCreating}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1a7a7c] text-white text-sm font-bold hover:bg-[#249d9f] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Save className="hidden md:block" size={16} />}
                                CREATE WEBHOOK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Save(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
    );
}
