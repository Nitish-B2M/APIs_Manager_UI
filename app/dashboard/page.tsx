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
import { Trash2, ExternalLink, AlertTriangle, AlertCircle, Mail, Check, X, Users, Shield, User, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { createCollectionSchema } from '../../types';
import { ZodError } from 'zod';
import { Documentation } from '../../types';
import { ProtectedRoute } from '../../components/AuthGuard';

interface FormErrors {
    title?: string;
}

const CollaboratorAvatars = ({ collaborators, theme }: { collaborators?: any[], theme: string }) => {
    if (!collaborators || collaborators.length === 0) return null;

    const maxDisplay = 3;
    const displayCollaborators = collaborators.slice(0, maxDisplay);
    const remainingCount = collaborators.length - maxDisplay;

    const tooltipText = collaborators.map(c => `${c.name || c.email} (${c.role})`).join('\n');

    return (
        <div className="flex items-center -space-x-2 group relative" title={tooltipText}>
            {displayCollaborators.map((c, i) => (
                <div
                    key={c.id || i}
                    className={`w-6 h-6 rounded-full border-2 ${theme === 'dark' ? 'border-gray-800' : 'border-white'} flex items-center justify-center overflow-hidden bg-indigo-500 text-[10px] text-white font-bold transition-transform`}
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
                    className={`w-6 h-6 rounded-full border-2 ${theme === 'dark' ? 'border-gray-800' : 'border-white'} bg-gray-600 text-white text-[8px] flex items-center justify-center font-bold relative z-0 transition-transform`}
                >
                    +{remainingCount}
                </div>
            )}

            {/* Premium Tooltip */}
            <div className={`absolute top-full left-0 mt-2 p-2 rounded-lg text-[10px] whitespace-pre-wrap ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-white'} opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-xl z-50 pointer-events-none min-w-[max-content] border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-700'}`}>
                {collaborators.map(c => (
                    <div key={c.id} className="flex items-center gap-2 mb-1 last:mb-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.role === 'OWNER' ? 'bg-yellow-400' : 'bg-indigo-400'}`} />
                        <span>{c.name || c.email}</span>
                        <span className="opacity-50 text-[8px] uppercase">{c.role}</span>
                    </div>
                ))}
                <div className={`absolute bottom-full left-3 border-subtle border-8 border-transparent ${theme === 'dark' ? 'border-b-gray-700' : 'border-b-gray-800'}`} />
            </div>
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
    const { data: invitesRes, refetch: refetchInvites } = useQuery({
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

    const { theme } = useTheme();
    const router = useRouter();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string, title: string } | null>(null);
    const [newCollectionTitle, setNewCollectionTitle] = useState('New Collection');
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // UI Colors
    const mainBg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-indigo-300 shadow-sm transition-all';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const inputBg = theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
    const inputErrorBg = theme === 'dark' ? 'bg-gray-900 border-red-500 text-white' : 'bg-gray-50 border-red-500 text-gray-900';

    // Clear form errors when typing
    useEffect(() => {
        if (newCollectionTitle && formErrors.title) {
            setFormErrors({});
        }
    }, [newCollectionTitle, formErrors.title]);

    const handleCreateBlank = () => {
        setNewCollectionTitle('New Collection');
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

        if (!validateForm()) {
            return;
        }

        setIsCreating(true);

        try {
            const res = await createEmptyMutation.mutateAsync({
                title: newCollectionTitle.trim()
            });
            setIsCreateModalOpen(false);
            toast.success(res.message || 'Collection created!');
            router.push(`/docs/${res.data.id}`);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Failed to create collection';
            toast.error(errorMessage);
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
            const errorMessage = e instanceof Error ? e.message : 'Failed to delete collection';
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
            setDocToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-8 animate-pulse">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">Your Documentations</h1>
                        </div>
                    </div>
                    <DashboardSkeleton />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
                    <h2 className="text-xl font-bold mb-2">Failed to load documentations</h2>
                    <p className="opacity-70">Please try refreshing the page</p>
                    <button
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['docs'] })}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all font-bold"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold ${textColor}`}>Your Documentations</h1>
                        {me && <p className={`${subTextColor} text-sm mt-1`}>Logged in as: <span className="text-indigo-500 font-medium">{me.email}</span></p>}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateBlank}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2 font-bold text-sm"
                        >
                            + Create Blank
                        </button>
                        <Link
                            href="/import"
                            className={`px-4 py-2 rounded shadow transition-colors font-bold text-sm ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                        >
                            Import JSON
                        </Link>
                    </div>
                </div>

                {invites.length > 0 && (
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                                <Mail size={20} />
                            </div>
                            <h2 className={`text-xl font-bold ${textColor}`}>Pending Invitations</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {invites.map((invite: any) => (
                                <div key={invite.id} className={`${cardBg} p-5 rounded-xl border border-indigo-500/30 bg-indigo-500/5`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className={`font-bold ${textColor}`}>{invite.documentationTitle}</h3>
                                            <p className={`text-[10px] ${subTextColor}`}>Invited by {invite.invitedByName}</p>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400`}>
                                            {invite.role}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => acceptInviteMutation.mutate(invite.token)}
                                            disabled={acceptInviteMutation.isPending}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1"
                                        >
                                            <Check size={12} /> {acceptInviteMutation.isPending ? 'JOINING...' : 'ACCEPT'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                            <User size={20} />
                        </div>
                        <h2 className={`text-xl font-bold ${textColor}`}>My Documentations</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ownedDocs.map((doc) => (
                            <div key={doc.id} className={`${cardBg} p-6 rounded-xl border flex flex-col justify-between group h-full shadow-sm`}>
                                <div className="flex justify-between mb-4">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className={`text-[10px] ${subTextColor} mb-1 uppercase tracking-wider font-semibold`}>{doc.layout || 'Collection'}</p>
                                        <h2 className={`text-xl font-bold mb-2 ${textColor} truncate`}>{doc.title}</h2>
                                        <p className={`${subTextColor} text-[10px] flex items-center gap-1`}>
                                            <Clock size={12} /> {new Date(doc.updatedAt).toLocaleDateString()}
                                        </p>
                                        <div className="flex justify-start pt-2 border-opacity-10 dark:border-white border-black">
                                            <CollaboratorAvatars collaborators={doc.collaborators} theme={theme} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Link
                                            href={`/docs/${doc.id}`}
                                            className="bg-indigo-600 text-white w-10 h-10 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center shadow-md"
                                        >
                                            <ExternalLink size={20} />
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteClick(doc)}
                                            className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-red-600/20 hover:text-red-400' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {ownedDocs.length === 0 && (
                            <div className={`col-span-full flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
                                <p className={`${subTextColor} text-sm mb-4`}>No personal collections yet</p>
                                <button
                                    onClick={handleCreateBlank}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all"
                                >
                                    + Create Your First Collection
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {sharedDocs.length > 0 && (
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                                <Users size={20} />
                            </div>
                            <h2 className={`text-xl font-bold ${textColor}`}>Shared with Me</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {sharedDocs.map((doc) => (
                                <div key={doc.id} className={`${cardBg} p-6 rounded-xl border flex flex-col justify-between border-l-4 border-l-indigo-500 shadow-sm`}>
                                    <div className="flex justify-between mb-4">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    <Shield size={10} /> {doc.role}
                                                </span>
                                            </div>
                                            <h2 className={`text-xl font-bold mb-2 ${textColor} truncate`}>{doc.title}</h2>
                                            <p className={`${subTextColor} text-[10px] flex items-center gap-1`}>
                                                <Clock size={12} /> {new Date(doc.updatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2 justify-center shrink-0">
                                            <Link
                                                href={`/docs/${doc.id}`}
                                                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 font-bold text-xs"
                                            >
                                                OPEN <ExternalLink size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-dashed border-opacity-10 dark:border-white border-black">
                                        <CollaboratorAvatars collaborators={doc.collaborators} theme={theme} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Collection"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
                    <div>
                        <label htmlFor="collection-name" className={`block text-sm font-medium ${subTextColor} mb-1`}>
                            Collection Name
                        </label>
                        <input
                            id="collection-name"
                            type="text"
                            value={newCollectionTitle}
                            onChange={(e) => setNewCollectionTitle(e.target.value)}
                            placeholder="e.g. My API Documentation"
                            className={`w-full rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${formErrors.title ? inputErrorBg : inputBg}`}
                            autoFocus
                            aria-invalid={!!formErrors.title}
                            aria-describedby={formErrors.title ? 'title-error' : undefined}
                        />
                        {formErrors.title && (
                            <div id="title-error" className="flex items-center gap-1.5 text-red-500 text-xs mt-1">
                                <AlertCircle size={12} />
                                <span>{formErrors.title}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className={`px-4 py-2 text-sm ${subTextColor} hover:text-indigo-500 transition-colors`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isCreating ? 'Creating...' : 'Create Collection'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Collection"
            >
                <div className="space-y-4">
                    <div className={`flex items-start gap-3 p-4 rounded-lg ${theme === 'dark' ? 'bg-red-900/10 border border-red-900/20' : 'bg-red-50 border border-red-100'}`}>
                        <AlertTriangle className="text-red-500 shrink-0" size={24} />
                        <div>
                            <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                                Are you sure you want to delete <span className="font-bold text-red-600">"{docToDelete?.title}"</span>?
                            </p>
                            <p className={`text-xs ${subTextColor} mt-1`}> This action cannot be undone. All endpoints and history inside this collection will be permanently removed.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className={`px-4 py-2 text-sm ${subTextColor} hover:text-indigo-500 transition-colors`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded shadow transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default function Dashboard() {
    const { theme } = useTheme();
    return (
        <ProtectedRoute>
            <main className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
                <ErrorBoundary>
                    <DashboardContent />
                </ErrorBoundary>
            </main>
        </ProtectedRoute>
    );
}
