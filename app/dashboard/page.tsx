'use client';
import { trpc } from '../../utils/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { Trash2, ExternalLink, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
    const { data: docs, isLoading } = trpc.documentation.list.useQuery();
    const createEmptyMutation = trpc.documentation.createEmpty.useMutation();
    const deleteMutation = trpc.documentation.delete.useMutation();
    const utils = trpc.useUtils();
    const router = useRouter();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<{ id: string, title: string } | null>(null);
    const [newCollectionTitle, setNewCollectionTitle] = useState('New Collection');
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleCreateBlank = () => {
        setNewCollectionTitle('New Collection');
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCollectionTitle.trim()) return;

        setIsCreating(true);
        try {
            const newDoc = await createEmptyMutation.mutateAsync({
                title: newCollectionTitle
            });
            setIsCreateModalOpen(false);
            toast.success('Collection created!');
            router.push(`/docs/${newDoc.id}`);
        } catch (e) {
            toast.error('Failed to create collection');
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
            utils.documentation.list.invalidate();
            setIsDeleteModalOpen(false);
            toast.success('Collection deleted');
        } catch (e) {
            toast.error('Failed to delete collection');
        } finally {
            setIsDeleting(false);
            setDocToDelete(null);
        }
    };

    if (isLoading) return <div className="p-10 text-white">Loading...</div>;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-gray-900 text-white p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-100">Your Documentations</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateBlank}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow transition-colors flex items-center gap-2"
                        >
                            + Create Blank
                        </button>
                        <Link
                            href="/import"
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded shadow transition-colors"
                        >
                            Import JSON
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {docs?.map((doc) => (
                        <div key={doc.id} className="bg-gray-800 p-6 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
                            <h2 className="text-xl font-semibold mb-2">{doc.title}</h2>
                            <p className="text-sm text-gray-400 mb-4 truncate text-wrap">Layout: {doc.layout}</p>
                            <div className="flex gap-2">
                                <Link
                                    href={`/docs/${doc.id}`}
                                    className="bg-indigo-600 text-xs px-4 py-1.5 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-1 font-medium"
                                >
                                    <ExternalLink size={14} /> Open
                                </Link>
                                <button
                                    onClick={() => handleDeleteClick(doc)}
                                    className="bg-gray-700 text-xs px-4 py-1.5 rounded-md hover:bg-red-600/20 hover:text-red-400 transition-all flex items-center gap-1 font-medium text-gray-300"
                                >
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {docs?.length === 0 && (
                        <p className="text-gray-400 col-span-full text-center py-10">No documentations found. Create one!</p>
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
                        <label htmlFor="collection-name" className="block text-sm font-medium text-gray-400 mb-1">
                            Collection Name
                        </label>
                        <input
                            id="collection-name"
                            type="text"
                            value={newCollectionTitle}
                            onChange={(e) => setNewCollectionTitle(e.target.value)}
                            placeholder="e.g. My API Documentation"
                            className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
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
                    <div className="flex items-start gap-3 p-4 bg-red-900/10 border border-red-900/20 rounded-lg">
                        <AlertTriangle className="text-red-500 shrink-0" size={24} />
                        <div>
                            <p className="text-sm text-gray-200">
                                Are you sure you want to delete <span className="font-bold text-white">"{docToDelete?.title}"</span>?
                            </p>
                            <p className="text-xs text-gray-400 mt-1"> This action cannot be undone. All endpoints and history inside this collection will be permanently removed.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
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
