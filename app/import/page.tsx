'use client';
import { useState } from 'react';
import { trpc } from '../../utils/trpc';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ImportPage() {
    const [title, setTitle] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const router = useRouter();

    const createDocMutation = trpc.documentation.create.useMutation({
        onSuccess: (data) => {
            router.push(`/docs/${data.id}`);
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFileContent(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fileContent) {
            toast.error('Please upload a file');
            return;
        }

        try {
            const json = JSON.parse(fileContent);
            createDocMutation.mutate({
                title,
                content: json,
                layout: 'STANDARD',
            });
        } catch (err) {
            toast.error('Invalid JSON file');
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-900 text-white">
            <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold mb-6">Import Collection</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block mb-1 text-sm">Documentation Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm">Postman .json File</label>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={createDocMutation.isPending || !fileContent}
                        className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded transition-colors disabled:opacity-50"
                    >
                        {createDocMutation.isPending ? 'Importing...' : 'Generate Documentation'}
                    </button>
                </form>
            </div>
        </div>
    );
}
