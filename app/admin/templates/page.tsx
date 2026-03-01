'use client';

import { useState, useEffect } from 'react';
import { api } from '@/utils/api';
import { useTheme } from '@/context/ThemeContext';
import { Mail, Plus, Search, Filter, MoreVertical, Edit2, Trash2, CheckCircle, XCircle, BarChart3, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import TemplateEditor from './components/TemplateEditor';

export default function AdminTemplatesPage() {
    const { theme } = useTheme();
    const [templates, setTemplates] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [view, setView] = useState<'templates' | 'analytics'>('templates');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [templatesRes, logsRes] = await Promise.all([
                api.admin.listTemplates(),
                api.admin.listLogs()
            ]);
            setTemplates(templatesRes.data);
            setLogs(logsRes.data);
        } catch (error: any) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await api.admin.deleteTemplate(id);
            toast.success('Template deleted');
            fetchData();
        } catch (error: any) {
            toast.error('Failed to delete template');
        }
    };

    const toggleActive = async (template: any) => {
        try {
            await api.admin.updateTemplate(template.id, { isActive: !template.isActive });
            toast.success('Status updated');
            fetchData();
        } catch (error: any) {
            toast.error('Failed to update status');
        }
    };

    const stats = {
        totalSent: logs.length,
        totalAccepted: logs.filter(l => l.status === 'ACCEPTED').length,
        successRate: logs.length > 0 ? Math.round((logs.filter(l => l.status === 'ACCEPTED').length / logs.length) * 100) : 0
    };

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0B0A0F] text-white' : 'bg-[#F9FAFB] text-gray-900'} p-8 transition-colors duration-300`}>
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight underline decoration-violet-500/50 underline-offset-8">Email Administration</h1>
                        <p className={`mt-4 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} font-medium`}>
                            Manage dynamic email templates and track engagement analytics.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setView(view === 'templates' ? 'analytics' : 'templates')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${theme === 'dark' ? 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10' : 'bg-white border border-gray-200 hover:shadow-md'
                                }`}
                        >
                            {view === 'templates' ? <BarChart3 size={18} className="text-violet-400" /> : <Mail size={18} className="text-violet-400" />}
                            {view === 'templates' ? 'View Analytics' : 'Manage Templates'}
                        </button>
                        <button
                            onClick={() => { setSelectedTemplate(null); setIsEditorOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/25 active:scale-95 transition-all"
                        >
                            <Plus size={18} />
                            Create Template
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 backdrop-blur-md' : 'bg-white border-gray-100 shadow-sm'} border relative overflow-hidden group transition-all duration-300`}>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Mail size={80} />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Total Emails Sent</span>
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><Mail size={20} /></div>
                        </div>
                        <div className="text-4xl font-black">{stats.totalSent}</div>
                    </div>
                    <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 backdrop-blur-md' : 'bg-white border-gray-100 shadow-sm'} border relative overflow-hidden group transition-all duration-300`}>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <CheckCircle size={80} />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Invitations Accepted</span>
                            <div className="p-2 bg-green-500/10 rounded-xl text-green-400"><CheckCircle size={20} /></div>
                        </div>
                        <div className="text-4xl font-black">{stats.totalAccepted}</div>
                    </div>
                    <div className={`p-6 rounded-2xl ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 backdrop-blur-md' : 'bg-white border-gray-100 shadow-sm'} border relative overflow-hidden group transition-all duration-300`}>
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <BarChart3 size={80} />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                            <span className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Acceptance Rate</span>
                            <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400"><BarChart3 size={20} /></div>
                        </div>
                        <div className="text-4xl font-black leading-none flex items-baseline gap-1">
                            {stats.successRate}
                            <span className="text-lg text-slate-500 font-bold">%</span>
                        </div>
                    </div>
                </div>

                {view === 'templates' ? (
                    <div className={`rounded-3xl border ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 shadow-2xl backdrop-blur-md' : 'bg-white border-gray-100 shadow-sm'} overflow-hidden transition-all duration-300`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`text-[11px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/[0.02] text-slate-500 border-b border-white/5' : 'bg-gray-50 text-gray-500 border-b border-gray-100'}`}>
                                        <th className="px-8 py-5">Template Name</th>
                                        <th className="px-8 py-5">Purpose</th>
                                        <th className="px-8 py-5">Variables & Details</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-50'}`}>
                                    {templates.map(tpl => (
                                        <tr key={tpl.id} className={`${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-violet-50/30'} transition-all duration-300 group`}>
                                            <td className="px-8 py-6">
                                                <div className="font-bold text-lg">{tpl.name}</div>
                                                {tpl.isDefault && (
                                                    <span className="text-[10px] bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 px-2 py-0.5 rounded-full font-black uppercase mt-1.5 inline-block">
                                                        Primary Default
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${theme === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {tpl.purpose.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'} truncate max-w-xs mb-2 transition-colors`}>{tpl.subject}</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {tpl.variables?.map((v: string) => (
                                                        <span key={v} className="text-[10px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-1 rounded-md">
                                                            {v}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <button
                                                    onClick={() => toggleActive(tpl)}
                                                    className={`flex items-center gap-2 text-xs font-black uppercase tracking-tighter px-3 py-1.5 rounded-full transition-all ${tpl.isActive
                                                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                                                        : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                                                        }`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${tpl.isActive ? 'bg-green-500' : 'bg-gray-500 animate-pulse'}`}></div>
                                                    {tpl.isActive ? 'Active' : 'Disabled'}
                                                </button>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                    <button
                                                        onClick={() => { setSelectedTemplate(tpl); setIsEditorOpen(true); }}
                                                        className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-white border-transparent hover:border-gray-100 border text-gray-400 hover:text-violet-600 hover:shadow-sm'}`}
                                                        title="Edit Template"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tpl.id)}
                                                        className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-500' : 'hover:bg-red-50 text-gray-400 hover:text-red-600'}`}
                                                        title="Delete Template"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {templates.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-50">
                                                    <Mail size={48} className="text-violet-500" />
                                                    <p className="font-bold text-lg text-slate-500">No email templates created yet</p>
                                                    <button
                                                        onClick={() => { setSelectedTemplate(null); setIsEditorOpen(true); }}
                                                        className="text-violet-400 hover:text-violet-300 transition-colors font-bold uppercase tracking-wide text-sm mt-2"
                                                    >
                                                        Initialize with first template
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className={`rounded-3xl border ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 shadow-2xl backdrop-blur-md' : 'bg-white border-gray-100 shadow-xl shadow-violet-500/5'} overflow-hidden transition-all duration-300`}>
                        <div className={`px-8 py-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-white/5 bg-white/[0.01]' : 'border-gray-50 bg-gray-50/30'}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400"><Clock size={20} /></div>
                                <h3 className="font-extrabold text-lg">Delivery Analytics</h3>
                            </div>
                            <button
                                onClick={fetchData}
                                className="text-[11px] text-violet-400 hover:text-violet-300 font-black uppercase tracking-widest border border-violet-500/20 px-4 py-2 rounded-xl hover:bg-violet-500/10 transition-all"
                            >
                                Refresh Feed
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className={`text-[11px] font-black uppercase tracking-[0.1em] ${theme === 'dark' ? 'bg-white/[0.02] text-slate-500' : 'bg-gray-50 text-gray-400'}`}>
                                    <tr>
                                        <th className="px-8 py-5">Delivery Recipient</th>
                                        <th className="px-8 py-5">Template Engine</th>
                                        <th className="px-8 py-5">Source Context</th>
                                        <th className="px-8 py-5">Timestamp</th>
                                        <th className="px-8 py-5 text-right">Delivery Status</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-gray-50'}`}>
                                    {logs.map(log => (
                                        <tr key={log.id} className={`${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-violet-50/30'} transition-all`}>
                                            <td className="px-8 py-5">
                                                <div className="font-bold">{log.recipientEmail}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className={`text-xs inline-flex items-center gap-1.5 font-semibold ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                                                    <Mail size={12} /> {log.templateName || 'Direct/Fallback'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-xs font-bold text-violet-400">{log.documentationTitle || 'Global Context'}</div>
                                            </td>
                                            <td className="px-8 py-5 text-xs font-mono text-slate-500">
                                                {new Date(log.sentAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${log.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                                                    log.status === 'FAILED' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-slate-500 font-medium tracking-wide">
                                                No transmission data detected.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {
                isEditorOpen && (
                    <TemplateEditor
                        template={selectedTemplate}
                        onClose={() => setIsEditorOpen(false)}
                        onSave={() => { setIsEditorOpen(false); fetchData(); }}
                    />
                )
            }
        </div >
    );
}
