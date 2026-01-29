'use client';
import { api } from '../../utils/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { Trash2, ExternalLink, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Dashboard() {
    const queryClient = useQueryClient();
    const { data: res, isLoading } = useQuery({ queryKey: ['docs'], queryFn: api.documentation.list });
    const { data: meRes } = useQuery({ queryKey: ['me'], queryFn: api.auth.me });
    const docs = res?.data || [];
    const me = meRes?.data;

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
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // UI Colors
    const mainBg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-indigo-300 shadow-sm transition-all';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    const handleCreateBlank = () => {
        setNewCollectionTitle('New Collection');
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionTitle.trim()) return;
        setIsCreating(true);

        try {
            const res = await createEmptyMutation.mutateAsync({
                title: newCollectionTitle
            });
            setIsCreateModalOpen(false);
            toast.success(res.message || 'Collection created!');
            router.push(`/docs/${res.data.id}`);
        } catch (e: any) {
            toast.error(e.message || 'Failed to create collection');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteClick = (doc: any) => {
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
        } catch (e: any) {
            toast.error(e.message || 'Failed to delete collection');
        } finally {
            setIsDeleting(false);
            setDocToDelete(null);
        }
    };

    if (isLoading) return <div className={`min-h-screen ${mainBg} flex items-center justify-center`}>Loading...</div>;

    return (
        <div className={`min-h-[calc(100vh-64px)] ${mainBg} p-8 transition-colors duration-300`}>
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className={`text-3xl font-bold ${textColor}`}>Your Documentations</h1>
                        {me && <p className={`${subTextColor} text-sm mt-1`}>Logged in as: <span className="text-indigo-500 font-medium">{me.email}</span></p>}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateBlank}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2"
                        >
                            + Create Blank
                        </button>
                        <Link
                            href="/import"
                            className={`px-4 py-2 rounded shadow transition-colors ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                        >
                            Import JSON
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(docs as any[])?.map((doc) => (
                        <div key={doc.id} className={`${cardBg} p-6 rounded-lg border`}>
                            <h2 className={`text-xl font-semibold mb-2 ${textColor}`}>{doc.title}</h2>
                            <p className={`text-sm ${subTextColor} mb-4 truncate text-wrap`}>Layout: {doc.layout}</p>
                            <div className="flex gap-2">
                                <Link
                                    href={`/docs/${doc.id}`}
                                    className="bg-indigo-600 text-white text-xs px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1 font-medium"
                                >
                                    <ExternalLink size={14} /> Open
                                </Link>
                                <button
                                    onClick={() => handleDeleteClick(doc)}
                                    className={`text-xs px-4 py-1.5 rounded-md transition-all flex items-center gap-1 font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-red-600/20 hover:text-red-400' : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'}`}
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {docs?.length === 0 && (
                        <p className={`${subTextColor} col-span-full text-center py-10`}>No documentations found. Create one!</p>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Collection"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
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
                            className={`w-full ${theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                            autoFocus
                        />
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
                            disabled={isCreating || !newCollectionTitle.trim()}
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
