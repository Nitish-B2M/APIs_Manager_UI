'use client';

import React, { useState, useEffect } from 'react';
import { Power, Save, Trash2, Plus, Copy, Clock, Settings2, Globe, CheckCircle2, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { api, API_URL } from '../../../../utils/api';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';

interface MockTabProps {
    requestId: string;
    canEdit: boolean;
}

export function MockTab({ requestId, canEdit }: MockTabProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<any>({
        statusCode: 200,
        headers: {},
        body: '',
        delay: 0,
        isActive: true
    });

    const mockUrl = `${API_URL}/m/${requestId}`;

    useEffect(() => {
        fetchConfig();
    }, [requestId]);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const result = await api.mock.getConfig(requestId);
            if (result.data) {
                setConfig(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch mock config:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.mock.updateConfig({
                requestId,
                ...config
            });
            toast.success('Mock configuration saved');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save mock configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const handleHeaderChange = (key: string, value: string, oldKey?: string) => {
        const newHeaders = { ...config.headers };
        if (oldKey && oldKey !== key) {
            delete newHeaders[oldKey];
        }
        newHeaders[key] = value;
        setConfig({ ...config, headers: newHeaders });
    };

    const removeHeader = (key: string) => {
        const newHeaders = { ...config.headers };
        delete newHeaders[key];
        setConfig({ ...config, headers: newHeaders });
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto">
            {/* Header / Status Section */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Globe size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Public Mock URL</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className={`text-[11px] font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{mockUrl}</code>
                        <button
                            onClick={() => { navigator.clipboard.writeText(mockUrl); toast.success('URL copied'); }}
                            className="p-1 hover:text-indigo-400 transition-colors"
                            title="Copy URL"
                        >
                            <Copy size={12} />
                        </button>
                        <a
                            href={mockUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:text-indigo-400 transition-colors"
                            title="Open in new tab"
                        >
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${config.isActive ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'}`}
                    >
                        <Power size={12} />
                        {config.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                    {canEdit && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            SAVE CONFIG
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Status Code & Delay */}
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Settings2 size={14} />
                            <label className="text-[10px] font-bold uppercase tracking-wider">Status Code</label>
                        </div>
                        <select
                            value={config.statusCode}
                            onChange={(e) => setConfig({ ...config, statusCode: parseInt(e.target.value) })}
                            className={`w-full px-3 py-2 border rounded-lg ${themeClasses.inputBg} ${themeClasses.borderCol} ${themeClasses.textColor} text-[11px] outline-none focus:ring-1 focus:ring-indigo-500`}
                        >
                            <option value="200">200 OK</option>
                            <option value="201">201 Created</option>
                            <option value="204">204 No Content</option>
                            <option value="400">400 Bad Request</option>
                            <option value="401">401 Unauthorized</option>
                            <option value="403">403 Forbidden</option>
                            <option value="404">404 Not Found</option>
                            <option value="500">500 Internal Server Error</option>
                            <option value="502">502 Bad Gateway</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Clock size={14} />
                            <label className="text-[10px] font-bold uppercase tracking-wider">Delay (ms)</label>
                        </div>
                        <input
                            type="number"
                            value={config.delay}
                            onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) || 0 })}
                            className={`w-full px-3 py-2 border rounded-lg ${themeClasses.inputBg} ${themeClasses.borderCol} ${themeClasses.textColor} text-[11px] outline-none focus:ring-1 focus:ring-indigo-500`}
                            placeholder="e.g. 500"
                        />
                    </div>
                </div>

                {/* Headers Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-gray-500">
                            <Plus size={14} />
                            <label className="text-[10px] font-bold uppercase tracking-wider">Response Headers</label>
                        </div>
                        <button
                            onClick={() => handleHeaderChange('', '')}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                        >
                            + ADD
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                        {Object.entries(config.headers || {}).map(([key, value], idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    value={key}
                                    onChange={(e) => handleHeaderChange(e.target.value, String(value), key)}
                                    className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px] outline-none`}
                                    placeholder="Header Key"
                                />
                                <input
                                    value={String(value)}
                                    onChange={(e) => handleHeaderChange(key, e.target.value)}
                                    className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px] outline-none`}
                                    placeholder="Value"
                                />
                                <button
                                    onClick={() => removeHeader(key)}
                                    className="p-1.5 text-gray-500 hover:text-red-400"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        {Object.keys(config.headers).length === 0 && (
                            <div className="text-center py-4 text-gray-600 text-[10px] italic">No custom headers defined</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Body Section */}
            <div className="flex-1 flex flex-col min-h-[250px] gap-2">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Response Body (JSON)</label>
                    <button
                        onClick={() => {
                            try {
                                const formatted = JSON.stringify(JSON.parse(config.body), null, 2);
                                setConfig({ ...config, body: formatted });
                                toast.success('Formatted body');
                            } catch (e) {
                                toast.error('Invalid JSON');
                            }
                        }}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 border border-indigo-500/20 px-2 py-0.5 rounded"
                    >
                        <CheckCircle2 size={10} /> FORMAT JSON
                    </button>
                </div>
                <div className={`flex-1 rounded-xl border ${themeClasses.borderCol} overflow-hidden ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-[#fafafa]'}`}>
                    <Editor
                        height="100%"
                        language="json"
                        value={config.body}
                        theme={theme === 'dark' ? 'vs-dark' : 'light'}
                        onChange={(val) => setConfig({ ...config, body: val || '' })}
                        options={{
                            readOnly: !canEdit,
                            fontSize: 13,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 12, bottom: 12 },
                            lineNumbers: 'on',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
