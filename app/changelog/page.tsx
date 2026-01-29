'use client';
import { api } from '../../utils/api';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Link2, Clock, Package, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';
import { Documentation } from '../../types';

interface EndpointData {
    id: string;
    name: string;
    method: string;
    url: string;
    lastResponse?: {
        status: number;
    };
    updatedAt: string;
}

interface CollectionData {
    id: string;
    title: string;
    requests?: EndpointData[];
    updatedAt: string;
    content?: string;
}

interface ApiResponse {
    data: CollectionData[];
    message?: string;
    status: boolean;
}

export default function ChangelogPage() {
    const { data: response, isLoading } = useQuery<ApiResponse>({
        queryKey: ['changelog'],
        queryFn: api.documentation.list,
        refetchInterval: 60000 // Refresh every 60 seconds
    });

    const { theme } = useTheme();

    const processUrl = (url: string, variables: Record<string, string>) => {
        if (!url) return '';
        let processed = url;
        Object.keys(variables || {}).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            processed = processed.replace(regex, variables[key]);
        });
        return processed;
    };

    const mainBg = theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-[#F9FAFB] text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)]';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    if (isLoading) {
        return (
            <div className={`min-h-screen ${mainBg} flex items-center justify-center`}>
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent shadow-lg" />
                    <p className={`${subTextColor} font-medium`}>Fetching API Lifecycle Data...</p>
                </div>
            </div>
        );
    }

    const collections: CollectionData[] = response?.data || [];

    const changelog = collections.flatMap((doc: CollectionData) => {
        let content: any = {};
        if (doc.content) {
            try {
                if (typeof doc.content === 'string') {
                    if (doc.content.trim().startsWith('{')) {
                        content = JSON.parse(doc.content);
                    }
                } else {
                    content = doc.content;
                }
            } catch (parseError) {
                console.debug('Could not parse documentation content:', parseError);
            }
        }

        const endpoints = doc.requests || content?.endpoints || [];
        const vars = content?.variables || {};

        return endpoints.map((ep: EndpointData) => ({
            id: doc.id,
            collectionName: doc.title,
            apiName: ep.name || 'Untitled Request',
            method: ep.method,
            rawUrl: ep.url,
            actualUrl: processUrl(ep.url, vars),
            updatedAt: new Date(ep.updatedAt || doc.updatedAt),
            status: ep.lastResponse?.status
        }));
    }).sort((a: any, b: any) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return (
        <div className={`min-h-screen ${mainBg} pb-20 transition-colors duration-300`}>
            {/* Hero Section */}
            <div className={`${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b py-12 px-6 mb-8`}>
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
                            <Clock className="text-indigo-500" size={24} />
                        </div>
                        <h1 className={`text-3xl font-extrabold ${textColor} tracking-tight`}>API Changelog</h1>
                    </div>
                    <p className={`${subTextColor} max-w-2xl font-medium`}>
                        Track recent additions and modifications across all your API collections.
                        Sorted by the most recent activity.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <div className={`${cardBg} rounded-xl border overflow-hidden`}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50/50 border-gray-100'} border-b`}>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest w-48">Collection</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest w-76">Endpoint</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Resolved URL</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest w-36">Last Sync</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-gray-500 uppercase tracking-widest w-24 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-800' : 'divide-gray-50'}`}>
                            {changelog.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                                        <Package size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-sm">No API endpoints detected yet.</p>
                                    </td>
                                </tr>
                            ) : (
                                changelog.map((item: any, idx: number) => (
                                    <tr key={idx} className={`${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-indigo-50/30'} transition-colors group`}>
                                        <td className="px-6 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                                                <span className={`font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm truncate max-w-[180px]`} title={item.collectionName}>
                                                    {item.collectionName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm ${item.method === 'GET' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        item.method === 'POST' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                            'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                        }`}>
                                                        {item.method}
                                                    </span>
                                                    <span className={`font-bold ${textColor} text-sm group-hover:text-indigo-500 transition-colors`}>
                                                        {item.apiName}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 group/url">
                                                <Link2 size={12} className="text-gray-500" />
                                                <code className={`text-xs ${theme === 'dark' ? 'text-gray-400 bg-gray-950 border-gray-800' : 'text-gray-500 bg-gray-50 border-gray-100'} px-2 py-1 rounded border truncate max-w-md font-mono`} title={item.actualUrl}>
                                                    {item.actualUrl}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`text-xs ${subTextColor} font-medium`}>
                                                {format(item.updatedAt, 'MMM dd, HH:mm')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <Link
                                                href={`/docs/${item.id}`}
                                                className={`inline-flex p-2 ${theme === 'dark' ? 'text-gray-500 hover:text-indigo-500 hover:bg-gray-800 border-transparent hover:border-gray-700' : 'text-gray-400 hover:text-indigo-600 hover:bg-white border-transparent hover:border-gray-200'} rounded-lg border shadow-none hover:shadow-sm transition-all`}
                                            >
                                                <ExternalLink size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={`mt-8 flex justify-between items-center ${subTextColor} text-[10px] font-bold uppercase tracking-widest px-2`}>
                    <span>Showing {changelog.length} Endpoints</span>
                    <span>System Generated Lifecycle List</span>
                </div>
            </div>
        </div>
    );
}
