'use client';
import { useState } from 'react';
import { api } from '../../utils/api';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { UploadCloud } from 'lucide-react';

export default function ImportPage() {
    const [title, setTitle] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const router = useRouter();
    const { theme } = useTheme();

    const createDocMutation = useMutation({
        mutationFn: api.documentation.create,
        onSuccess: (res: any) => {
            toast.success(res.message || 'Collection imported successfully');
            router.push(`/docs/${res.data.id}`);
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFileContent(event.target?.result as string);
                if (!title) {
                    try {
                        const json = JSON.parse(event.target?.result as string);
                        if (json.info?.name) setTitle(json.info.name);
                    } catch (parseError) {
                        // File selected but couldn't parse for title - this is fine, 
                        // we'll validate properly on submit
                        console.debug('Could not auto-extract title from file:', parseError);
                    }
                }
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

    const mainBg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';
    const inputClasses = theme === 'dark'
        ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500'
        : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500';

    return (
        <div className={`flex min-h-[calc(100vh-64px)] items-center justify-center ${mainBg} transition-colors duration-300 p-6`}>
            <div className={`w-full max-w-md p-8 ${cardBg} rounded-2xl border shadow-xl`}>
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <UploadCloud className="text-indigo-500" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold">Import Collection</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className={`block mb-1.5 text-sm font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Documentation Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="My Awesome API"
                            className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${inputClasses}`}
                            required
                        />
                    </div>
                    <div>
                        <label className={`block mb-1.5 text-sm font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Postman Collection (.json)</label>
                        <div className={`relative group border-2 border-dashed rounded-xl p-6 text-center transition-all ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50 hover:border-indigo-500/50' : 'border-gray-200 bg-gray-50 hover:border-indigo-500'}`}>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                required
                            />
                            <div className="space-y-2">
                                <p className={`text-sm font-medium ${fileContent ? 'text-indigo-500' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {fileContent ? '✓ File Ready' : 'Click or Drop JSON here'}
                                </p>
                                <p className="text-[10px] text-gray-500 uppercase font-black">Supported: Postman v2.1+</p>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={createDocMutation.isPending || !fileContent}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createDocMutation.isPending ? 'IMPORTING API...' : 'GENERATE DOCUMENTATION'}
                    </button>
                    <p className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Standard Postman Export format
                    </p>
                </form>
            </div>
        </div>
    );
}
