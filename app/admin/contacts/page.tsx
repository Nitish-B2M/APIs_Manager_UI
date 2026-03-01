'use client';
import { useState, useEffect } from 'react';
import { Mail, CheckCircle, Clock, Search, Trash2, ArrowUpDown } from 'lucide-react';
import { GlassCard, PremiumButton, TextGradient } from '../../../components/UIComponents';
import { api } from '../../../utils/api';
import toast from 'react-hot-toast';

interface ContactMessage {
    id: string;
    name: string;
    email: string;
    message: string;
    status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED';
    createdAt: string;
}

export default function ContactsAdminPage() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'NEW' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchMessages();
    }, [filter]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const statusParams = filter === 'ALL' ? undefined : filter;
            const res = await api.contact.list(statusParams);
            setMessages(res.data || []);
        } catch (error) {
            toast.error('Failed to load contact messages');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await api.contact.updateStatus(id, newStatus);
            toast.success(`Marked as ${newStatus.replace('_', ' ')}`);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus as any } : m));
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const deleteMessage = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this message?')) return;
        try {
            await api.contact.delete(id);
            toast.success('Message deleted');
            setMessages(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            toast.error('Failed to delete message');
        }
    };

    const filteredMessages = messages.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.message.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'NEW': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'IN_PROGRESS': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
            case 'RESOLVED': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'NEW': return <Mail size={14} />;
            case 'IN_PROGRESS': return <Clock size={14} />;
            case 'RESOLVED': return <CheckCircle size={14} />;
            default: return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-heading tracking-tight mb-2">
                        Contact <TextGradient>Inquiries</TextGradient>
                    </h1>
                    <p className="text-muted">Manage support requests and user feedback.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full md:w-64 bg-black/5 dark:bg-white/5 border border-glass-border rounded-xl pl-9 pr-4 py-2 text-sm text-heading focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-muted"
                        />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex overflow-x-auto pb-2 -mx-2 px-2 gap-2 hide-scrollbar">
                {(['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold tracking-wide uppercase whitespace-nowrap transition-all border ${filter === status
                                ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                : 'bg-black/5 dark:bg-white/5 border-glass-border text-muted hover:text-heading hover:bg-white/10'
                            }`}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Messages Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-black/5 dark:bg-white/5 border border-glass-border rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                        <Mail size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-heading mb-2">No Inquiries Found</h3>
                    <p className="text-muted">You're all caught up! No pending messages match this filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredMessages.map(msg => (
                        <GlassCard key={msg.id} className="p-6 flex flex-col hover:border-indigo-500/30 transition-all duration-300 relative group overflow-hidden">
                            {/* Hover Glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusColor(msg.status)}`}>
                                    {getStatusIcon(msg.status)} {msg.status.replace('_', ' ')}
                                </div>
                                <div className="text-xs text-muted font-medium flex items-center gap-1">
                                    <Clock size={12} /> {new Date(msg.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="mb-4 relative z-10">
                                <h3 className="text-lg font-bold text-heading truncate">{msg.name}</h3>
                                <a href={`mailto:${msg.email}`} className="text-sm text-indigo-400 hover:underline">{msg.email}</a>
                            </div>

                            <div className="flex-1 mb-6 relative z-10">
                                <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed line-clamp-4">{msg.message}</p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-glass-border flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={msg.status}
                                        onChange={(e) => updateStatus(msg.id, e.target.value)}
                                        className="bg-black/10 dark:bg-white/10 border border-glass-border rounded-lg text-xs font-bold uppercase tracking-wider text-heading px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                                    >
                                        <option value="NEW">New</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="RESOLVED">Resolved</option>
                                    </select>
                                </div>
                                <button
                                    onClick={() => deleteMessage(msg.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Message"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
