'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../utils/api';
import { X, Users, UserPlus, Shield, Trash2, Mail, Loader2, Check, ExternalLink, Clock, ChevronDown } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';
import { UserRole } from '../../../../types';

interface CollaboratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentationId: string;
}

export function CollaboratorModal({ isOpen, onClose, documentationId }: CollaboratorModalProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const queryClient = useQueryClient();

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('VIEWER');
    const [lastInviteToken, setLastInviteToken] = useState<string | null>(null);

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
            if (res.data?.token) {
                setLastInviteToken(res.data.token);
            }
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
            toast.success('Invite link copied to clipboard!');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme === 'dark' ? 'bg-[#1a1a2e] border-indigo-500/30' : 'bg-white border-gray-200'
                }`}>
                {/* Header with Premium Gradient */}
                <div className={`relative p-8 overflow-hidden ${theme === 'dark'
                    ? 'bg-gradient-to-br from-indigo-900/40 via-[#1a1a2e] to-[#1a1a2e]'
                    : 'bg-gradient-to-br from-indigo-50 via-white to-white'
                    }`}>
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -mr-32 -mt-32 rounded-full" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-[60px] -ml-24 -mb-24 rounded-full" />

                    <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-600 text-white'
                                }`}>
                                <Users size={24} />
                            </div>
                            <div>
                                <h2 className={`text-xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Team Management</h2>
                                <p className={`text-xs font-medium ${themeClasses.subTextColor}`}>Secure your documentation by managing role-based access.</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-xl transition-all duration-200 border ${theme === 'dark'
                                ? 'hover:bg-white/10 text-gray-400 border-white/5'
                                : 'hover:bg-gray-200 text-gray-500 border-gray-200'
                                }`}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                    {/* Invite Section */}
                    <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-gray-50 border-gray-200'
                        }`}>
                        <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 block ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            Send Invitation
                        </label>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative group">
                                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-gray-600 group-focus-within:text-indigo-400' : 'text-gray-400 group-focus-within:text-indigo-500'
                                    }`} size={18} />
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="your-colleague@company.com"
                                    className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/10 ${theme === 'dark'
                                        ? 'bg-[#0f0f1a] border-indigo-500/20 text-gray-200 placeholder-gray-700'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                                        }`}
                                />
                            </div>
                            <div className="relative min-w-[120px]">
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                    className={`w-full px-4 py-3 rounded-xl border text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-500/10 ${theme === 'dark' ? 'bg-[#0f0f1a] border-indigo-500/20 text-indigo-400' : 'bg-white border-gray-300 text-gray-700'
                                        }`}
                                >
                                    <option value="VIEWER">Viewer</option>
                                    <option value="EDITOR">Editor</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                            </div>
                            <button
                                onClick={() => inviteEmail && inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
                                disabled={!inviteEmail || inviteMutation.isPending}
                                className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-black shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                            >
                                {inviteMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                Invite
                            </button>
                        </div>

                        {lastInviteToken && (
                            <div className={`mt-4 p-4 rounded-xl border animate-in zoom-in-95 duration-300 ${theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                }`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                            <Check size={16} />
                                        </div>
                                        <p className="text-xs font-semibold truncate text-pretty">Invitation ready! Send this link to your collaborator.</p>
                                    </div>
                                    <button
                                        onClick={handleCopyToken}
                                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                                    >
                                        <ExternalLink size={14} /> Copy Link
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collaborators List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${themeClasses.subTextColor}`}>Team Members ({collaborators.length})</label>
                            <div className={`h-px flex-1 mx-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isLoading ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-12 gap-3">
                                    <Loader2 className="animate-spin text-indigo-500" size={40} />
                                    <p className="text-xs font-bold text-gray-500">Fetching team members...</p>
                                </div>
                            ) : collaborators.length === 0 ? (
                                <div className={`col-span-full py-16 px-6 text-center border-2 border-dashed rounded-[2rem] transition-colors ${theme === 'dark' ? 'border-white/5 bg-white/2' : 'border-gray-100 bg-gray-50/50'
                                    }`}>
                                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4 text-indigo-500/40">
                                        <Shield size={32} />
                                    </div>
                                    <h3 className={`text-sm font-black mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Private Collection</h3>
                                    <p className="text-xs text-gray-500 max-w-[200px] mx-auto leading-relaxed">Only you currently have access to this workspace. Invite others to start collaborating!</p>
                                </div>
                            ) : (
                                collaborators.map((collab: any) => (
                                    <div key={collab.id} className={`group p-5 rounded-2xl border transition-all hover:shadow-xl hover:-translate-y-1 ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-indigo-500/30' : 'bg-white border-gray-100'
                                        }`}>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-600'
                                                        }`}>
                                                        {collab.name?.[0] || collab.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className={`text-sm font-black truncate max-w-[120px] ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                                                {collab.name || collab.email.split('@')[0]}
                                                            </h4>
                                                            {collab.role === 'OWNER' && (
                                                                <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 text-[9px] font-black tracking-tighter border border-yellow-500/20">OWNER</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] font-medium text-gray-500 truncate max-w-[150px]">{collab.email}</p>
                                                    </div>
                                                </div>
                                                {collab.role !== 'OWNER' && (
                                                    <button
                                                        onClick={() => removeMutation.mutate(collab.id)}
                                                        className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                                                            }`}
                                                        title="Revoke Access"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>

                                            {collab.role !== 'OWNER' && (
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <select
                                                            value={collab.role}
                                                            onChange={(e) => updateRoleMutation.mutate({ id: collab.id, role: e.target.value as UserRole })}
                                                            className={`w-full px-3 py-2 rounded-xl border text-[11px] font-black appearance-none cursor-pointer focus:outline-none ${theme === 'dark' ? 'bg-[#0f0f1a] border-white/10 text-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-600'
                                                                }`}
                                                        >
                                                            <option value="VIEWER">Viewer Role</option>
                                                            <option value="EDITOR">Editor Role</option>
                                                            <option value="ADMIN">Admin Role</option>
                                                        </select>
                                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <label className={`text-[10px] font-black uppercase tracking-[0.2em] ${themeClasses.subTextColor}`}>Pending Invites ({invitations.length})</label>
                                <div className={`h-px flex-1 mx-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {invitations.map((invite: any) => (
                                    <div key={invite.id} className={`p-4 rounded-2xl border border-dashed transition-all hover:border-indigo-500/30 ${theme === 'dark' ? 'bg-white/2 border-white/5' : 'bg-gray-50 border-gray-200'
                                        }`}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-500">
                                                    <Clock size={20} className="animate-pulse" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className={`text-xs font-black truncate max-w-[120px] ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {invite.email}
                                                    </h4>
                                                    <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-[9px] font-black uppercase tracking-tighter border border-gray-500/10">
                                                        {invite.role}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-600'
                                                    }`}
                                            >
                                                Revoke
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with Info Badge */}
                <div className={`p-5 px-8 flex items-center gap-4 ${theme === 'dark' ? 'bg-[#0f0f1a] border-t border-white/5' : 'bg-gray-50 border-t border-gray-200'
                    }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-500'
                        }`}>
                        <Shield size={16} />
                    </div>
                    <p className={`text-[10px] leading-relaxed font-medium ${themeClasses.subTextColor}`}>
                        <span className="font-bold text-indigo-500 px-1">Security Node:</span>
                        Administrators can manage full team settings and deletions. Editors can modify documentation content and versions.
                    </p>
                </div>
            </div>
        </div>
    );
}
