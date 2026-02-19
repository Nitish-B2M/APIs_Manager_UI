'use client';

import React, { useState } from 'react';
import { X, Terminal, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { parseCurl } from '../../../../utils/curlParser';
import { toast } from 'react-hot-toast';

interface ImportCurlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any) => void;
}

export default function ImportCurlModal({ isOpen, onClose, onImport }: ImportCurlModalProps) {
    const { theme } = useTheme();
    const [curlCommand, setCurlCommand] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleImport = () => {
        if (!curlCommand.trim()) return;

        try {
            const parsed = parseCurl(curlCommand);
            if (!parsed) {
                setError('Invalid cURL command. Please ensure it starts with "curl".');
                return;
            }

            onImport(parsed);
            setCurlCommand('');
            setError(null);
            onClose();
            toast.success('Request imported successfully');
        } catch (e) {
            setError('Failed to parse cURL command.');
        }
    };

    const modalBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const headerBg = theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-800';
    const inputBg = theme === 'dark' ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900';
    const closeBtn = theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className={`${modalBg} rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                <div className={`flex items-center justify-between p-4 border-b ${headerBg}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                            <Terminal size={18} className="text-indigo-500" />
                        </div>
                        <h2 className={`text-lg font-bold ${textColor}`}>Import cURL</h2>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${closeBtn}`}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Paste your cURL command below to import it as a new request.
                    </p>

                    <textarea
                        value={curlCommand}
                        onChange={(e) => { setCurlCommand(e.target.value); setError(null); }}
                        placeholder="curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{...}'"
                        className={`w-full h-48 p-4 rounded-lg border font-mono text-xs resize-none focus:ring-2 focus:ring-indigo-500 outline-none ${inputBg}`}
                        spellCheck={false}
                    />

                    {error && (
                        <div className="mt-3 text-red-500 text-xs font-bold flex items-center gap-1.5">
                            <X size={12} /> {error}
                        </div>
                    )}
                </div>

                <div className={`p-4 border-t flex justify-end gap-2 ${headerBg}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!curlCommand.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        Import Request <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
