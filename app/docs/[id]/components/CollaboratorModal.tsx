'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../utils/api';
import { X, Users, UserPlus, Shield, Trash2, Mail, Loader2, Check, ExternalLink, Clock, ChevronDown, Globe, Copy, Save } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';
import { UserRole } from '../../../../types';
import { Outfit } from 'next/font/google';

const outfit = Outfit({ subsets: ['latin'] });

interface CollaboratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentationId: string;
    isPublic?: boolean;
    slug?: string | null;
    onTogglePublic?: () => void;
    onSlugUpdate?: (slug: string) => Promise<void>;
    userRole?: string;
}

export function CollaboratorModal({
    isOpen,
    onClose,
    documentationId,
    isPublic,
    slug,
    onTogglePublic,
    onSlugUpdate,
    userRole
}: CollaboratorModalProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const queryClient = useQueryClient();

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('VIEWER');
    const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);
    const [slugInput, setSlugInput] = useState(slug || '');
    const [isUpdatingSlug, setIsUpdatingSlug] = useState(false);

    const { data: collaboratorsRes, isLoading } = useQuery({
        queryKey: ['collaborators', documentationId],
        queryFn: () => api.collaboration.listCollaborators(documentationId),
        enabled: isOpen
    });

    const inviteMutation = useMutation({
        mutationFn: (data: { email: string; role: UserRole }) =>
            api.collaboration.invite({ ...data, documentationId }),
        onSuccess: (res: any) => {
            queryClient.invalidateQueries({ queryKey: ['collaborators', documentationId] });
            setInviteEmail('');
            if (res.data?.token) setLastInviteToken(res.data.token);
            toast.success('Invitation sent!');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to send invitation')
    });

    const removeMutation = useMutation({
        mutationFn: (id: string) => api.collaboration.removeCollaborator(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaborators', documentationId] });
            toast.success('Collaborator removed');
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
            api.collaboration.updateRole(id, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaborators', documentationId] });
            toast.success('Role updated');
        }
    });

    const cancelInviteMutation = useMutation({
        mutationFn: (id: string) => api.collaboration.cancelInvite(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collaborators', documentationId] });
            toast.success('Invitation cancelled');
        }
    });

    if (!isOpen) return null;

    const collaborators = collaboratorsRes?.data?.collaborators || [];
    const invitations = collaboratorsRes?.data?.invitations || [];

    const handleCopyToken = () => {
        if (lastInviteToken) {
            const link = `${window.location.origin}/register?token=${lastInviteToken}`;
            navigator.clipboard.writeText(link);
            toast.success('Invite link copied!');
        }
    };

    const handleUpdateSlug = async () => {
        if (!onSlugUpdate || !slugInput.trim()) return;
        setIsUpdatingSlug(true);
        try {
            await onSlugUpdate(slugInput.trim());
            toast.success('Public URL updated!');
        } finally {
            setIsUpdatingSlug(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 ${outfit.className}`}>
            <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-[#1a1a2e] border-[#249d9f]/30' : 'bg-white border-gray-200'}`}>
                <div className={`relative p-8 overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-indigo-900/40 via-[#1a1a2e] to-[#1a1a2e]' : 'bg-gradient-to-br from-indigo-50 via-white to-white'}`}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#249d9f]/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${theme === 'dark' ? 'bg-[#249d9f]/20 text-[#2ec4c7] border border-[#249d9f]/30' : 'bg-[#1a7a7c] text-white'}`}><Users size={24} /></div>
                            <div>
                                <h2 className={`text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Team Management</h2>
                                <p className={`text-xs font-medium ${themeClasses.subTextColor}`}>Secure your documentation by managing access.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className={`p-2 rounded-xl transition-all border ${theme === 'dark' ? 'hover:bg-white/10 text-gray-400 border-white/5' : 'hover:bg-gray-200 text-gray-500 border-gray-200'}`}><X size={20} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    <div className={`p-6 rounded-2xl border transition-all ${isPublic ? (theme === 'dark' ? 'bg-[#249d9f]/10 border-[#249d9f]/30' : 'bg-indigo-50 border-indigo-200') : (theme === 'dark' ? 'bg-gray-800/20 border-white/5' : 'bg-gray-50 border-gray-100')}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPublic ? 'bg-green-500 text-white' : 'bg-gray-500/20 text-gray-500'}`}><Globe size={20} /></div>
                                <div>
                                    <h3 className={`text-sm font-black ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Public Documentation</h3>
                                    <p className="text-[10px] font-medium text-gray-500">Make this collection accessible via a public link.</p>
                                </div>
                            </div>
                            {userRole === 'OWNER' ? (
                                <button onClick={onTogglePublic} className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-green-600' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                                </button>
                            ) : (
                                <div className={`w-12 h-6 rounded-full transition-all relative ${isPublic ? 'bg-green-600' : 'bg-gray-600'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
                                </div>
                            )}
                        </div>

                        {userRole === 'OWNER' && isPublic && (
                            <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Custom URL Slug</label>
                                    <div className="flex items-center gap-2">
                                        <div className={`px-3 py-2 rounded-lg font-mono text-[11px] ${theme === 'dark' ? 'bg-gray-900/50 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>/public/</div>
                                        <input
                                            value={slugInput}
                                            onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                            className={`flex-1 px-3 py-2 rounded-lg font-mono text-[11px] outline-none border focus:ring-2 focus:ring-[#249d9f]/20 ${theme === 'dark' ? 'bg-gray-900/50 border-white/5 text-[#2ec4c7]' : 'bg-gray-50 border-gray-200 text-[#1a7a7c]'}`}
                                            placeholder="my-awesome-api"
                                        />
                                        <button
                                            onClick={handleUpdateSlug}
                                            disabled={isUpdatingSlug || slugInput === slug}
                                            className="px-4 py-2 bg-[#1a7a7c] hover:bg-[#249d9f] disabled:opacity-50 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-2"
                                        >
                                            {isUpdatingSlug ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                            SAVE
                                        </button>
                                    </div>
                                </div>

                                {slug && (
                                    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-black/20 border-white/10' : 'bg-white border-gray-200'}`}>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Share Public Link</label>
                                        <div className="flex items-center gap-2">
                                            <div className={`flex-1 px-3 py-2 rounded-lg font-mono text-[11px] truncate ${theme === 'dark' ? 'bg-gray-900/50 text-[#2ec4c7]' : 'bg-gray-50 text-[#1a7a7c]'}`}>{window.location.origin}/public/{slug}</div>
                                            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/public/${slug}`); toast.success('Link copied!'); }} className="p-2 hover:bg-[#249d9f]/10 rounded-lg text-[#249d9f] transition-all"><Copy size={16} /></button>
                                            <a href={`/public/${slug}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-green-500/10 rounded-lg text-green-500 transition-all"><ExternalLink size={16} /></a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {userRole === 'OWNER' ? (
                        <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#249d9f]/5 border-[#249d9f]/20' : 'bg-gray-50 border-gray-200'}`}>
                            <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 block ${theme === 'dark' ? 'text-[#2ec4c7]' : 'text-[#1a7a7c]'}`}>Send Invitation</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative group">
                                    <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-gray-600 group-focus-within:text-[#2ec4c7]' : 'text-gray-400 group-focus-within:text-[#249d9f]'}`} size={18} />
                                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:ring-[#249d9f]/10 ${theme === 'dark' ? 'bg-[#0f0f1a] border-[#249d9f]/20 text-gray-200' : 'bg-white border-gray-300 text-gray-900'}`} />
                                </div>
                                <div className="relative min-w-[120px]">
                                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} className={`w-full px-4 py-3 rounded-xl border text-sm font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-[#249d9f]/10 ${theme === 'dark' ? 'bg-[#0f0f1a] border-[#249d9f]/20 text-[#2ec4c7]' : 'bg-white border-gray-300 text-gray-700'}`}>
                                        <option value="VIEWER">Viewer</option><option value="EDITOR">Editor</option><option value="ADMIN">Admin</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                </div>
                                <button onClick={() => inviteEmail && inviteMutation.mutate({ email: inviteEmail, role: inviteRole })} disabled={!inviteEmail || inviteMutation.isPending} className="px-8 py-3 rounded-xl bg-[#1a7a7c] hover:bg-[#249d9f] disabled:opacity-50 text-white text-sm font-black transition-all flex items-center justify-center gap-2">
                                    {inviteMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />} Invite
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`p-6 rounded-2xl border flex items-center justify-center gap-2 text-sm font-medium ${theme === 'dark' ? 'bg-[#249d9f]/5 border-[#249d9f]/20 text-[#2ec4c7]' : 'bg-gray-50 border-gray-200 text-[#1a7a7c]'}`}>
                            <Shield size={18} /> Only the team owner can invite new members.
                        </div>
                    )}

                    <div className="space-y-6">
                        <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${themeClasses.subTextColor}`}>Team Members ({collaborators.length})</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {collaborators.map((collab: any) => (
                                <div key={collab.id} className={`relative p-5 rounded-2xl border transition-all hover:shadow-xl overflow-hidden group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-[#249d9f]/30' : 'bg-white border-gray-100 hover:border-indigo-200'}`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${theme === 'dark' ? 'bg-[#249d9f]/20' : 'bg-[#249d9f]/10'}`} />
                                    <div className="relative flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${theme === 'dark' ? 'bg-[#249d9f]/20 text-[#2ec4c7]' : 'bg-indigo-100 text-[#1a7a7c]'}`}>
                                                    {collab.name?.[0]?.toUpperCase() || collab.email?.[0]?.toUpperCase()}
                                                </div>
                                                {collab.role === 'OWNER' && (
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1a1a2e]">
                                                        <Shield size={10} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h4 className={`text-sm font-black truncate ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                        {collab.name || collab.email.split('@')[0]}
                                                    </h4>
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${collab.role === 'OWNER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                                        collab.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-[#249d9f]/20 dark:text-[#2ec4c7]' :
                                                            collab.role === 'EDITOR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                                                                'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                                                        }`}>
                                                        {collab.role}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] font-medium text-gray-500 truncate">{collab.email}</p>
                                            </div>
                                        </div>
                                        {collab.role !== 'OWNER' && userRole === 'OWNER' && (
                                            <button
                                                onClick={() => removeMutation.mutate(collab.id)}
                                                className="p-2 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all transform hover:scale-105"
                                                title="Remove member"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
