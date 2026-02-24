'use client';

import React from 'react';
import { api } from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link2, Clock, Package } from 'lucide-react';
import { getThemeClasses } from '../utils/theme';

interface ChangelogViewProps {
    docId: string;
    theme: 'light' | 'dark';
    variables: Record<string, string>;
}

export function ChangelogView({ docId, theme, variables }: ChangelogViewProps) {
    const { data: response, isLoading } = useQuery<any>({
        queryKey: ['changelog', docId],
        queryFn: () => api.documentation.getById(docId),
    });

    const themeClasses = getThemeClasses(theme);
    const doc = response?.data;

    const processUrl = (url: string) => {
        if (!url) return '';
        let processed = url;
        Object.keys(variables || {}).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processed = processed.replace(regex, variables[key]);
        });
        return processed;
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!doc) return null;

    const endpoints = doc.requests || [];
    const changelog = endpoints.map((ep: any) => ({
        apiName: ep.name || 'Untitled Request',
        method: ep.method,
        actualUrl: processUrl(ep.url),
        updatedAt: new Date(ep.updatedAt || doc.updatedAt),
        status: ep.lastResponse?.status
    })).sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return (
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                        <Clock className="text-indigo-500" size={20} />
                    </div>
                    <div>
                        <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Collection Changelog</h2>
                        <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Tracking recent modifications for this collection</p>
                    </div>
                </div>

                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl border overflow-hidden shadow-sm`}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50/50'} border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Endpoint</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Resolved URL</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest w-40">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-50'}`}>
                            {changelog.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-20 text-center text-gray-400">
                                        <Package size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-sm">No updates detected yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                changelog.map((item: any, idx: number) => (
                                    <tr key={idx} className={`${theme === 'dark' ? 'hover:bg-gray-700/30' : 'hover:bg-indigo-50/30'} transition-colors group`}>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.method === 'GET' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        item.method === 'POST' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                            'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                    }`}>
                                                    {item.method}
                                                </span>
                                                <span className={`font-bold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} text-sm`}>
                                                    {item.apiName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Link2 size={12} className="text-gray-500" />
                                                <code className={`text-xs ${theme === 'dark' ? 'text-gray-400 bg-gray-950 border-gray-700' : 'text-gray-500 bg-gray-50 border-gray-100'} px-2 py-1 rounded border truncate max-w-md font-mono`}>
                                                    {item.actualUrl}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`text-[11px] ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} font-medium`}>
                                                {format(item.updatedAt, 'MMM dd, HH:mm')}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
