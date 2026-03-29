'use client';

import React from 'react';
import { api } from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, Package, User, Plus, Edit3, Trash2, UserPlus, Globe, Activity } from 'lucide-react';
import { getThemeClasses } from '../utils/theme';

interface ChangelogViewProps {
    docId: string;
    theme: 'light' | 'dark';
}

export function ChangelogView({ docId, theme }: ChangelogViewProps) {
    const { data: response, isLoading } = useQuery<any>({
        queryKey: ['audit-logs', docId],
        queryFn: () => api.documentation.getAuditLogs(docId),
    });

    const themeClasses = getThemeClasses(theme);
    const logs = response?.data || [];

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return <Plus size={14} className="text-green-500" />;
            case 'UPDATE': return <Edit3 size={14} className="text-blue-500" />;
            case 'DELETE': return <Trash2 size={14} className="text-red-500" />;
            case 'INVITE': return <UserPlus size={14} className="text-[#249d9f]" />;
            default: return <Clock size={14} className="text-gray-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#249d9f]"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-10">
                    <div className={`p-3 rounded-2xl ${theme === 'dark' ? 'bg-[#249d9f]/10 border border-[#249d9f]/20' : 'bg-indigo-50'}`}>
                        <Activity className="text-[#249d9f]" size={24} />
                    </div>
                    <div>
                        <h2 className={`text-2xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Activity Feed</h2>
                        <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>A real-time audit trail of all changes in this collection.</p>
                    </div>
                </div>

                <div className="relative space-y-6">
                    {/* Vertical Line */}
                    <div className={`absolute left-[17px] top-2 bottom-2 w-px ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />

                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30 italic">
                            <Package size={48} className="mb-4" />
                            <p>No activity recorded yet.</p>
                        </div>
                    ) : (
                        logs.map((log: any, idx: number) => (
                            <div key={log.id} className="relative pl-12 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                {/* Icon Dot */}
                                <div className={`absolute left-0 top-1 w-9 h-9 rounded-xl border flex items-center justify-center z-10 shadow-sm ${
                                    theme === 'dark' ? 'bg-[#1a1b26] border-white/10' : 'bg-white border-gray-200'
                                }`}>
                                    {getActionIcon(log.action)}
                                </div>

                                <div className={`p-4 rounded-2xl border transition-all hover:shadow-lg ${
                                    theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white border-gray-100'
                                }`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                                <span className="font-black text-[#249d9f]">{log.userName || log.userEmail.split('@')[0]}</span>
                                                <span className="mx-1.5 opacity-60">performed</span>
                                                <span className={`font-black uppercase text-[10px] px-1.5 py-0.5 rounded ${
                                                    log.action === 'CREATE' ? 'bg-green-500/10 text-green-500' :
                                                    log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-500' :
                                                    log.action === 'DELETE' ? 'bg-red-500/10 text-red-500' : 'bg-gray-500/10 text-gray-500'
                                                }`}>{log.action}</span>
                                                <span className="mx-1.5 opacity-60">on</span>
                                                <span className="font-black opacity-80">{log.entityType}</span>
                                            </p>
                                            <p className={`text-xs font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {log.entityName || 'Untitled Item'}
                                            </p>
                                            {log.changes && (
                                                <div className="mt-3 overflow-hidden">
                                                    <details className="group">
                                                        <summary className="cursor-pointer list-none text-[9px] font-black text-[#2ec4c7] uppercase tracking-widest hover:underline">View Change Details</summary>
                                                        <pre className={`mt-2 p-3 rounded-xl font-mono text-[10px] overflow-x-auto ${theme === 'dark' ? 'bg-black/40 text-gray-400 border border-white/5' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
                                                            {JSON.stringify(log.changes, null, 2)}
                                                        </pre>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                                {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-40">
                                                <Globe size={10} />
                                                <span className="text-[8px] font-black tracking-widest uppercase">Audit Entry</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
