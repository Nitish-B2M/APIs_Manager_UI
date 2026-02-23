'use client';
import { useState } from 'react';
import { api } from '../../utils/api';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { UploadCloud, FileJson, Zap } from 'lucide-react';
import { ProtectedRoute } from '../../components/AuthGuard';
import { parseOpenApi } from '../../utils/openApiParser';

type ImportFormat = 'POSTMAN' | 'OPENAPI' | 'AUTO';

export default function ImportPage() {
    const [title, setTitle] = useState('');
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [format, setFormat] = useState<ImportFormat>('AUTO');
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

    const detectAndParse = (content: string): { title: string, data: any } | null => {
        try {
            const json = JSON.parse(content);

            // Postman Check
            if (json.info && json.item && (json.info.schema || "").includes("postman")) {
                return {
                    title: json.info.name || '',
                    data: json
                };
            }

            // OpenAPI Check
            if (json.openapi || json.swagger || (json.info && json.paths)) {
                const parsed = parseOpenApi(json);
                return {
                    title: parsed.info.name,
                    data: {
                        info: parsed.info,
                        item: parsed.endpoints.map((ep: any) => ({
                            name: ep.name,
                            request: {
                                method: ep.method,
                                url: { raw: ep.url },
                                description: ep.description,
                                header: ep.headers,
                                body: ep.body
                            }
                        }))
                    }
                };
            }

            return null;
        } catch (e) {
            return null;
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setFileContent(content);

                const result = detectAndParse(content);
                if (result) {
                    if (!title) setTitle(result.title);
                    toast.success(`Detected ${result.data.openapi ? 'OpenAPI' : 'Postman'} format`);
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

        const result = detectAndParse(fileContent);
        if (!result) {
            toast.error('Invalid or unsupported JSON format');
            return;
        }

        createDocMutation.mutate({
            title: title || result.title,
            content: result.data,
            layout: 'STANDARD',
        });
    };

    const mainBg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';
    const inputClasses = theme === 'dark'
        ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500'
        : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500';

    return (
        <ProtectedRoute>
            <div className={`flex min-h-[calc(100vh-64px)] items-center justify-center ${mainBg} transition-colors duration-300 p-6`}>
                <div className={`w-full max-w-md p-8 ${cardBg} rounded-2xl border shadow-xl`}>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <UploadCloud className="text-indigo-500" size={24} />
                            </div>
                            <h1 className="text-2xl font-bold">Import API</h1>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <Zap size={10} />
                            <span>v2.0</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className={`block mb-1.5 text-sm font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Documentation Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Stripe API or Petstore"
                                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${inputClasses}`}
                                required
                            />
                        </div>

                        <div>
                            <label className={`block mb-1.5 text-sm font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                Select File (Postman or OpenAPI)
                            </label>
                            <div className={`relative group border-2 border-dashed rounded-xl p-8 text-center transition-all ${theme === 'dark' ? 'border-gray-700 bg-gray-900/50 hover:border-indigo-500/50' : 'border-gray-200 bg-gray-50 hover:border-indigo-500'}`}>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    required
                                />
                                <div className="space-y-3">
                                    <div className="flex justify-center">
                                        <FileJson className={`transition-colors ${fileContent ? 'text-indigo-500' : 'text-gray-400'}`} size={32} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-bold ${fileContent ? 'text-indigo-500' : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {fileContent ? '✓ File Uploaded' : 'Drag & Drop your JSON'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">
                                            Supports Postman v2.1+ and OpenAPI 3.0/3.1
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={createDocMutation.isPending || !fileContent}
                            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
                        >
                            {createDocMutation.isPending ? 'Processing Import...' : 'Generate Documentation'}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-700/10 flex flex-col gap-3">
                        <p className={`text-[10px] font-bold uppercase tracking-widest text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                            Supported Formats
                        </p>
                        <div className="flex justify-center gap-4">
                            <div className="flex items-center gap-1.5 grayscale opacity-50">
                                <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>POSTMAN</span>
                            </div>
                            <div className="flex items-center gap-1.5 grayscale opacity-50">
                                <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>OPENAPI 3.x</span>
                            </div>
                            <div className="flex items-center gap-1.5 grayscale opacity-50">
                                <span className={`text-[11px] font-bold ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>SWAGGER</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
