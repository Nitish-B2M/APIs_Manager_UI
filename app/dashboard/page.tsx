'use client';
import { api } from '../../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { DashboardSkeleton } from '../../components/Skeleton';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import toast from 'react-hot-toast';
import { Trash2, ExternalLink, Clock, Plus, AlertTriangle, AlertCircle, Database, HelpCircle, Mail, User, Shield, Users, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { createCollectionSchema } from '../../types';
import { ZodError } from 'zod';
import { Documentation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { DemoOverlay } from '../components/DemoOverlay';

interface FormErrors {
    title?: string;
}

import { GlassCard, PremiumButton, TextGradient } from '../../components/UIComponents';

const CollaboratorAvatars = ({ collaborators }: { collaborators?: any[] }) => {
    if (!collaborators || collaborators.length === 0) return null;

    const maxDisplay = 3;
    const displayCollaborators = collaborators.slice(0, maxDisplay);
    const remainingCount = collaborators.length - maxDisplay;

    return (
        <div className="flex items-center -space-x-2 group relative">
            {displayCollaborators.map((c, i) => (
                <div
                    key={c.id || i}
                    className="w-7 h-7 rounded-full border-2 border-[#121212] flex items-center justify-center overflow-hidden bg-gradient-to-tr from-indigo-500 to-violet-500 text-[10px] text-white font-bold transition-transform group-hover:scale-110"
                    style={{ zIndex: collaborators.length - i }}
                >
                    {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                        (c.name || c.email || '?').charAt(0).toUpperCase()
                    )}
                </div>
            ))}
            {remainingCount > 0 && (
                <div
                    className="w-7 h-7 rounded-full border-2 border-[#121212] bg-slate-800 text-white text-[8px] flex items-center justify-center font-bold relative z-0"
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};

function DashboardContent() {
    const queryClient = useQueryClient();
    const { data: res, isLoading, error } = useQuery({
        queryKey: ['docs'],
        queryFn: api.documentation.list,
        retry: 1
    });
    const { data: meRes } = useQuery({ queryKey: ['me'], queryFn: api.auth.me });
    const { data: invitesRes } = useQuery({
        queryKey: ['invites'],
        queryFn: api.collaboration.listMyInvitations
    });
    const docs = (res?.data || []) as Documentation[];
    const me = meRes?.data;
    const invites = invitesRes?.data || [];

    const ownedDocs = docs.filter(d => me && d.userId === me.id);
    const sharedDocs = docs.filter(d => me && d.userId !== me.id);

    const acceptInviteMutation = useMutation({
        mutationFn: (token: string) => api.collaboration.acceptInvite(token),
        onSuccess: (res) => {
            toast.success(res.message || 'Invitation accepted!');
            queryClient.invalidateQueries({ queryKey: ['docs'] });
            queryClient.invalidateQueries({ queryKey: ['invites'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to accept invitation');
        }
    });

    const createEmptyMutation = useMutation({
        mutationFn: (data: { title: string }) => api.documentation.createEmpty(data)
    });
    const deleteMutation = useMutation({
        mutationFn: (data: { id: string }) => api.documentation.delete(data.id)
    });

    const router = useRouter();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string, title: string } | null>(null);
    const [newCollectionTitle, setNewCollectionTitle] = useState('New Collection');
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { theme } = useTheme();

    // Clear form errors when typing
    useEffect(() => {
        if (newCollectionTitle && formErrors.title) {
            setFormErrors({});
        }
    }, [newCollectionTitle, formErrors.title]);

    const handleCreateBlank = () => {
        setNewCollectionTitle('');
        setFormErrors({});
        setIsCreateModalOpen(true);
    };

    const validateForm = (): boolean => {
        try {
            createCollectionSchema.parse({ title: newCollectionTitle });
            setFormErrors({});
            return true;
        } catch (error) {
            if (error instanceof ZodError) {
                const fieldErrors: FormErrors = {};
                error.errors.forEach((err) => {
                    const field = err.path[0] as keyof FormErrors;
                    if (!fieldErrors[field]) {
                        fieldErrors[field] = err.message;
                    }
                });
                setFormErrors(fieldErrors);
            }
            return false;
        }
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsCreating(true);
        try {
            const res = await createEmptyMutation.mutateAsync({
                title: newCollectionTitle.trim()
            });
            setIsCreateModalOpen(false);
            toast.success(res.message || 'Collection created!');
            router.push(`/docs/${res.data.id}`);
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to create collection');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (doc: Documentation) => {
        setDocToDelete({ id: doc.id, title: doc.title });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!docToDelete) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync({ id: docToDelete.id });
            queryClient.invalidateQueries({ queryKey: ['docs'] });
            setIsDeleteModalOpen(false);
            toast.success('Collection deleted');
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete collection');
        } finally {
            setIsDeleting(false);
            setDocToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-8 animate-pulse max-w-7xl mx-auto">
                <div className="h-10 w-64 bg-white/5 rounded-lg mb-8" />
                <DashboardSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <GlassCard className="text-center max-w-md">
                    <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-xl font-bold mb-2 text-white">Failed to load documentations</h2>
                    <p className="text-secondary text-sm">Please try refreshing the page</p>
                    <PremiumButton
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['docs'] })}
                        className="mt-6 w-full"
                    >
                        Retry
                    </PremiumButton>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-background/90 text-foreground">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">
                            API <TextGradient>Collection</TextGradient>
                        </h1>
                        {me && <p className="text-slate-400 text-sm mt-2 font-medium tracking-tight">Efficiently manage and document your API ecosystem.</p>}
                    </div>
                    <div className="flex gap-4">
                        <PremiumButton variant="outline" onClick={() => router.push('/import')} className="flex items-center gap-2">
                            <Database size={16} /> Import
                        </PremiumButton>
                        <PremiumButton onClick={handleCreateBlank} className="flex items-center gap-2 px-8">
                            + New Collection
                        </PremiumButton>
                    </div>
                </div>

                {invites.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-6 bg-violet-600 rounded-full" />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Pending Invitations</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {invites.map((invite: any) => (
                                <GlassCard key={invite.id} className="border-indigo-500/30 bg-indigo-500/5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-heading mb-1">{invite.documentationTitle}</h3>
                                            <p className="text-[10px] text-secondary lowercase">Invited by {invite.invitedByName}</p>
                                        </div>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 uppercase tracking-tighter">
                                            {invite.role}
                                        </span>
                                    </div>
                                    <PremiumButton
                                        onClick={() => acceptInviteMutation.mutate(invite.token)}
                                        disabled={acceptInviteMutation.isPending}
                                        className="w-full text-xs py-2"
                                    >
                                        <Check size={14} className="inline mr-2" />
                                        {acceptInviteMutation.isPending ? 'JOINING...' : 'ACCEPT INVITATION'}
                                    </PremiumButton>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                        <h2 className="text-lg font-bold text-heading uppercase tracking-wider">My Documentations</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ownedDocs.map((doc) => (
                            <GlassCard key={doc.id} className="relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDeleteClick(doc)}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="mb-6">
                                    <span className="text-[10px] font-black text-secondary uppercase tracking-[2px] mb-2 block">{doc.layout || 'Personal'}</span>
                                    <h2 className="text-xl font-bold text-heading truncate mb-2">{doc.title}</h2>
                                    <div className="flex items-center gap-4">
                                        <p className="text-secondary text-[10px] flex items-center gap-1.5 italic">
                                            <Clock size={12} /> {new Date(doc.updatedAt).toLocaleDateString()}
                                        </p>
                                        <CollaboratorAvatars collaborators={doc.collaborators} />
                                    </div>
                                </div>
                                <PremiumButton
                                    onClick={() => router.push(`/docs/${doc.id}`)}
                                    className="w-full flex items-center justify-center gap-2 group/btn"
                                >
                                    OPEN COLLECTION <ExternalLink size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </PremiumButton>
                            </GlassCard>
                        ))}
                        {ownedDocs.length === 0 && (
                            <div className="col-span-full py-16 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-secondary mb-6">You haven't created any collections yet.</p>
                                <PremiumButton onClick={handleCreateBlank}>
                                    Create First Collection
                                </PremiumButton>
                            </div>
                        )}
                    </div>
                </div>

                {sharedDocs.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Shared work</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sharedDocs.map((doc) => (
                                <GlassCard key={doc.id} className="border-white/5 hover:border-violet-500/20">
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 uppercase tracking-tighter flex items-center gap-1">
                                                <Shield size={10} /> {doc.role}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-white truncate mb-2">{doc.title}</h2>
                                        <div className="flex items-center justify-between">
                                            <p className="text-slate-500 text-[10px] flex items-center gap-1.5 italic">
                                                <Clock size={12} /> {new Date(doc.updatedAt).toLocaleDateString()}
                                            </p>
                                            <CollaboratorAvatars collaborators={doc.collaborators} />
                                        </div>
                                    </div>
                                    <PremiumButton
                                        variant="outline"
                                        onClick={() => router.push(`/docs/${doc.id}`)}
                                        className="w-full flex items-center justify-center gap-2 group/btn border-white/5 bg-white/5 text-white py-3 h-auto min-h-0"
                                    >
                                        OPEN SHARED <ExternalLink size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </PremiumButton>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Activity Section */}
                <div className="mt-16">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-1.5 h-6 bg-violet-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.3)]" />
                        <h2 className="text-lg font-bold text-heading uppercase tracking-wider">Recent Activity</h2>
                    </div>
                    <GlassCard className="border-glass-border bg-background/50 p-0 overflow-hidden">
                        <div className="divide-y divide-glass-border">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-foreground">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 group-hover:scale-110 transition-transform">
                                            <Clock size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-heading">Payment API Documentation Updated</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Updated 2 hours ago by <span className="text-violet-400 font-medium">You</span></p>
                                        </div>
                                    </div>
                                    <button className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                                        <ExternalLink size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="px-6 py-3 bg-white/[0.01] border-t border-white/5 text-center">
                            <button className="text-[10px] font-bold text-slate-500 hover:text-violet-400 uppercase tracking-widest transition-colors">
                                View all activity
                            </button>
                        </div>
                    </GlassCard>
                </div>
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Collection"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-6 pt-4" noValidate>
                    <div>
                        <label htmlFor="collection-name" className="block text-xs font-bold text-secondary uppercase tracking-[2px] mb-3">
                            Collection Title
                        </label>
                        <input
                            id="collection-name"
                            type="text"
                            value={newCollectionTitle}
                            onChange={(e) => setNewCollectionTitle(e.target.value)}
                            placeholder="e.g. Payments Gateway API"
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${formErrors.title ? 'border-red-500 ring-red-500/20' : 'border-white/10'}`}
                            autoFocus
                        />
                        {formErrors.title && (
                            <div className="flex items-center gap-1.5 text-red-500 text-[10px] mt-2 font-bold uppercase tracking-wider">
                                <AlertCircle size={12} />
                                <span>{formErrors.title}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <PremiumButton
                            type="button"
                            variant="ghost"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="text-xs"
                        >
                            Cancel
                        </PremiumButton>
                        <PremiumButton
                            type="submit"
                            disabled={isCreating}
                            className="text-xs px-8"
                        >
                            {isCreating ? 'CREATING...' : 'PROCEED'}
                        </PremiumButton>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Collection"
            >
                <div className="space-y-6 pt-4">
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                        <AlertTriangle className="mx-auto mb-4 text-red-500" size={32} />
                        <p className="text-sm text-white font-medium mb-2">
                            Delete <span className="text-red-400">"{docToDelete?.title}"</span>?
                        </p>
                        <p className="text-xs text-secondary leading-relaxed">
                            This will permanently remove the collection and all its history. This action is irreversible.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3">
                        <PremiumButton
                            variant="ghost"
                            onClick={() => setIsDeleteModalOpen(false)}
                        >
                            Back
                        </PremiumButton>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 text-xs"
                        >
                            {isDeleting ? 'DELETING...' : 'CONFIRM DELETE'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function Dashboard() {
    const { isLoggedIn } = useAuth();
    return (
        <main className="min-h-screen relative flex flex-col bg-[#0B0A0F] text-white overflow-hidden">
            {!isLoggedIn && (
                <DemoOverlay
                    title="API Studio & Dashboard"
                    description="Access all your collections, documentation, and team activity in one centralized workspace."
                />
            )}
            <div className={`transition-all duration-300 w-full h-full ${!isLoggedIn ? 'blur-md pointer-events-none opacity-50' : ''}`}>
                <ErrorBoundary>
                    <DashboardContent />
                </ErrorBoundary>
            </div>
        </main>
    );
}
