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
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${outfit.className}`}
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="overflow-hidden flex flex-col"
                style={{ background: '#161B22', borderRadius: 12, border: '1px solid rgba(255,255,255,0.16)', minWidth: 640, maxWidth: '78vw', width: '72vw', maxHeight: '85vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36,157,159,0.1)', color: '#249d9f', flexShrink: 0 }}>
                        <Users size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0 }}>Team Management</h2>
                        <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0' }}>Secure your documentation by managing access.</p>
                    </div>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: 24 }}>
                    {/* ── Public Documentation: icon | label+subtitle | toggle ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 12, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPublic ? 'rgba(63,185,80,0.15)' : '#21262D', color: isPublic ? '#3FB950' : '#8B949E' }}>
                            <Globe size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF3' }}>Public Documentation</div>
                            <div style={{ fontSize: 12, color: '#8B949E' }}>Make this collection accessible via a public link.</div>
                        </div>
                        {userRole === 'OWNER' ? (
                            <button onClick={onTogglePublic} style={{ width: 44, height: 24, borderRadius: 12, background: isPublic ? '#3FB950' : '#21262D', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                                <div style={{ width: 18, height: 18, borderRadius: 9, background: 'white', position: 'absolute', top: 2, left: isPublic ? 23 : 2, transition: 'left 0.2s' }} />
                            </button>
                        ) : (
                            <div style={{ width: 44, height: 24, borderRadius: 12, background: isPublic ? '#3FB950' : '#21262D', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
                                <div style={{ width: 18, height: 18, borderRadius: 9, background: 'white', position: 'absolute', top: 2, left: isPublic ? 23 : 2 }} />
                            </div>
                        )}
                    </div>

                    {/* ── Slug + Share Link (only when public) ── */}
                    {userRole === 'OWNER' && isPublic && (
                        <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            {/* Slug row */}
                            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681', display: 'block', marginBottom: 8 }}>Custom URL Slug</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ padding: '6px 10px', borderRadius: 6, background: '#21262D', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#6E7681' }}>/public/</span>
                                <input
                                    value={slugInput}
                                    onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                    placeholder="my-awesome-api"
                                    style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E6EDF3', outline: 'none' }}
                                />
                                <button
                                    onClick={handleUpdateSlug}
                                    disabled={isUpdatingSlug || slugInput === slug}
                                    style={{ padding: '6px 14px', borderRadius: 6, background: '#249d9f', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: (isUpdatingSlug || slugInput === slug) ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    {isUpdatingSlug ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                    Save
                                </button>
                            </div>

                            {/* Share link row */}
                            {slug && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                                    <span style={{ padding: '6px 12px', borderRadius: 6, background: '#21262D', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#249d9f', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {window.location.origin}/public/{slug}
                                    </span>
                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/public/${slug}`); toast.success('Copied!'); }} style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#8B949E', cursor: 'pointer' }}><Copy size={15} /></button>
                                    <a href={`/public/${slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: 6, borderRadius: 6, color: '#8B949E', textDecoration: 'none' }}><ExternalLink size={15} /></a>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Send Invitation: email + role dropdown + invite button in one row ── */}
                    {userRole === 'OWNER' ? (
                        <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681', display: 'block', marginBottom: 10 }}>Send Invitation</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Mail size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#6E7681' }} />
                                    <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#E6EDF3', outline: 'none' }} />
                                </div>
                                <div style={{ position: 'relative', width: 140 }}>
                                    <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: '#E6EDF3', appearance: 'none', cursor: 'pointer', outline: 'none' }}>
                                        <option value="VIEWER">Viewer</option><option value="EDITOR">Editor</option><option value="ADMIN">Admin</option>
                                    </select>
                                    <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6E7681' }} />
                                </div>
                                <button onClick={() => inviteEmail && inviteMutation.mutate({ email: inviteEmail, role: inviteRole })} disabled={!inviteEmail || inviteMutation.isPending} style={{ width: 100, padding: '8px 0', borderRadius: 6, background: '#249d9f', color: 'white', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: (!inviteEmail || inviteMutation.isPending) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    {inviteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Invite
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
                                            <div className="flex items-center gap-2">
                                                {/* Role edit dropdown */}
                                                <select
                                                    value={collab.role}
                                                    onChange={(e) => {
                                                        const newRole = e.target.value;
                                                        api.collaboration.updateCollaborator(documentationId, collab.id, newRole)
                                                            .then(() => { queryClient.invalidateQueries({ queryKey: ['collaborators', documentationId] }); toast.success(`Role updated to ${newRole}`); })
                                                            .catch(() => toast.error('Failed to update role'));
                                                    }}
                                                    style={{ padding: '4px 8px', borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#E6EDF3', fontSize: 11, cursor: 'pointer', outline: 'none' }}
                                                >
                                                    <option value="VIEWER">Viewer</option>
                                                    <option value="EDITOR">Editor</option>
                                                    <option value="ADMIN">Admin</option>
                                                </select>
                                                <button
                                                    onClick={() => removeMutation.mutate(collab.id)}
                                                    style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#F85149', cursor: 'pointer' }}
                                                    title="Remove member"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
