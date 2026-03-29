'use client';

import React, { useState, useEffect } from 'react';
import { Power, Save, Trash2, Plus, Copy, Clock, Settings2, Globe, CheckCircle2, Loader2, Sparkles, ExternalLink, Filter } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api, API_URL } from '../../../../utils/api';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { toast } from 'react-hot-toast';

const Editor = dynamic(() => import('@monaco-editor/react'), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full flex items-center justify-center bg-black/10">
            <Loader2 size={20} className="animate-spin text-[#249d9f]" />
        </div>
    )
});

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
        isActive: true,
        rules: []
    });

    const [headerList, setHeaderList] = useState<{ key: string, value: string }[]>([]);
    const [rules, setRules] = useState<any[]>([]);

    const mockUrl = `${API_URL}/m/${requestId}`;

    useEffect(() => {
        fetchConfig();
    }, [requestId]);

    useEffect(() => {
        if (config.headers) {
            setHeaderList(Object.entries(config.headers).map(([key, value]) => ({ key, value: String(value) })));
        }
        if (config.rules) {
            setRules(config.rules);
        }
    }, [config.headers, config.rules]);

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
            // Filter out empty header keys
            const cleanHeaders: Record<string, string> = {};
            headerList.forEach(h => {
                if (h.key.trim()) cleanHeaders[h.key.trim()] = h.value;
            });

            await api.mock.updateConfig({
                requestId,
                ...config,
                headers: cleanHeaders,
                rules: rules
            });
            toast.success('Mock configuration saved');
        } catch (error: any) {
            toast.error(error.message || 'Failed to save mock configuration');
        } finally {
            setIsSaving(false);
        }
    };

    const updateHeader = (index: number, key: string, value: string) => {
        const newList = [...headerList];
        newList[index] = { key, value };
        setHeaderList(newList);
    };

    const addHeader = () => {
        setHeaderList([...headerList, { key: '', value: '' }]);
    };

    const removeHeader = (index: number) => {
        setHeaderList(headerList.filter((_, i) => i !== index));
    };

    const addRule = () => {
        setRules([...rules, {
            id: Math.random().toString(36).substring(7),
            condition: { type: 'header', key: '', operator: 'equals', value: '' },
            response: { statusCode: 200, body: '', headers: {} }
        }]);
    };

    const updateRule = (index: number, field: string, value: any) => {
        const newRules = [...rules];
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            newRules[index][parent][child] = value;
        } else {
            newRules[index][field] = value;
        }
        setRules(newRules);
    };

    const removeRule = (index: number) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[#249d9f]" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
            {/* Header / Status Section */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-[#249d9f]/30 bg-[#249d9f]/5">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Globe size={14} className="text-[#2ec4c7]" />
                        <span className="text-[10px] font-bold text-[#2ec4c7] uppercase tracking-wider">Public Mock URL</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className={`text-[11px] font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{mockUrl}</code>
                        <button
                            onClick={() => { navigator.clipboard.writeText(mockUrl); toast.success('URL copied'); }}
                            className="p-1 hover:text-[#2ec4c7] transition-colors"
                            title="Copy URL"
                        >
                            <Copy size={12} />
                        </button>
                        <a
                            href={mockUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:text-[#2ec4c7] transition-colors"
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
                            className="flex items-center gap-2 bg-[#1a7a7c] hover:bg-[#249d9f] text-white px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-lg shadow-indigo-900/40 transition-all disabled:opacity-50"
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
                            className={`w-full px-3 py-2 border rounded-lg ${themeClasses.inputBg} ${themeClasses.borderCol} ${themeClasses.textColor} text-[11px] outline-none focus:ring-1 focus:ring-[#249d9f]`}
                        >
                            <option value="200">200 OK</option>
                            <option value="201">201 Created</option>
                            <option value="202">202 Accepted</option>
                            <option value="204">204 No Content</option>
                            <option value="301">301 Moved Permanently</option>
                            <option value="302">302 Found</option>
                            <option value="400">400 Bad Request</option>
                            <option value="401">401 Unauthorized</option>
                            <option value="403">403 Forbidden</option>
                            <option value="404">404 Not Found</option>
                            <option value="405">405 Method Not Allowed</option>
                            <option value="409">409 Conflict</option>
                            <option value="422">422 Unprocessable Entity</option>
                            <option value="429">429 Too Many Requests</option>
                            <option value="500">500 Internal Server Error</option>
                            <option value="502">502 Bad Gateway</option>
                            <option value="503">503 Service Unavailable</option>
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
                            className={`w-full px-3 py-2 border rounded-lg ${themeClasses.inputBg} ${themeClasses.borderCol} ${themeClasses.textColor} text-[11px] outline-none focus:ring-1 focus:ring-[#249d9f]`}
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
                            onClick={addHeader}
                            className="text-[10px] font-bold text-[#2ec4c7] hover:text-[#2ec4c7]"
                        >
                            + ADD
                        </button>
                    </div>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                        {headerList.map((h, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    value={h.key}
                                    onChange={(e) => updateHeader(idx, e.target.value, h.value)}
                                    className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px] outline-none`}
                                    placeholder="Header Key"
                                />
                                <input
                                    value={h.value}
                                    onChange={(e) => updateHeader(idx, h.key, e.target.value)}
                                    className={`flex-1 px-2 py-1.5 ${themeClasses.inputBg} border ${themeClasses.borderCol} ${themeClasses.textColor} rounded text-[11px] outline-none`}
                                    placeholder="Value"
                                />
                                <button
                                    onClick={() => removeHeader(idx)}
                                    className="p-1.5 text-gray-500 hover:text-red-400"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        {headerList.length === 0 && (
                            <div className="text-center py-4 text-gray-600 text-[10px] italic">No custom headers defined</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Conditional Rules Section */}
            <div className={`p-4 rounded-xl border ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Filter size={14} className="text-[#2ec4c7]" />
                        <span className="text-[10px] font-bold text-[#2ec4c7] uppercase tracking-wider">Conditional Rules (Override Default)</span>
                    </div>
                    <button
                        onClick={addRule}
                        className="text-[10px] font-bold bg-[#1a7a7c]/10 text-[#2ec4c7] px-3 py-1 rounded hover:bg-[#1a7a7c]/20 transition-all"
                    >
                        + ADD RULE
                    </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {rules.map((rule, idx) => (
                        <div key={rule.id} className={`p-3 rounded-lg border ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-black/20' : 'bg-white'} flex flex-col gap-3`}>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-bold text-gray-500">IF</span>
                                <select
                                    value={rule.condition.type}
                                    onChange={(e) => updateRule(idx, 'condition.type', e.target.value)}
                                    className={`px-2 py-1 rounded bg-transparent border ${themeClasses.borderCol} text-[10px] ${themeClasses.textColor} outline-none`}
                                >
                                    <option value="header">Header</option>
                                    <option value="query">Query Param</option>
                                    <option value="body">Body Key</option>
                                </select>
                                <input
                                    placeholder="key"
                                    value={rule.condition.key}
                                    onChange={(e) => updateRule(idx, 'condition.key', e.target.value)}
                                    className={`flex-1 px-2 py-1 rounded bg-transparent border ${themeClasses.borderCol} text-[10px] ${themeClasses.textColor} outline-none`}
                                />
                                <select
                                    value={rule.condition.operator}
                                    onChange={(e) => updateRule(idx, 'condition.operator', e.target.value)}
                                    className={`px-2 py-1 rounded bg-transparent border ${themeClasses.borderCol} text-[10px] ${themeClasses.textColor} outline-none`}
                                >
                                    <option value="equals">==</option>
                                    <option value="contains">contains</option>
                                    <option value="regex">regex</option>
                                    <option value="exists">exists</option>
                                </select>
                                {rule.condition.operator !== 'exists' && (
                                    <input
                                        placeholder="value"
                                        value={rule.condition.value}
                                        onChange={(e) => updateRule(idx, 'condition.value', e.target.value)}
                                        className={`flex-1 px-2 py-1 rounded bg-transparent border ${themeClasses.borderCol} text-[10px] ${themeClasses.textColor} outline-none`}
                                    />
                                )}
                            </div>

                            <div className="flex items-center gap-3 border-t pt-3 border-dashed border-gray-500/20">
                                <span className="text-[9px] font-bold text-gray-500">THEN RETURN</span>
                                <select
                                    value={rule.response.statusCode}
                                    onChange={(e) => updateRule(idx, 'response.statusCode', parseInt(e.target.value))}
                                    className={`px-2 py-1 rounded bg-transparent border ${themeClasses.borderCol} text-[10px] ${themeClasses.textColor} outline-none`}
                                >
                                    <option value="200">200 OK</option>
                                    <option value="201">201 Created</option>
                                    <option value="400">400 Error</option>
                                    <option value="401">401 Auth</option>
                                    <option value="404">404 Not Found</option>
                                    <option value="500">500 Server Err</option>
                                </select>
                                <input
                                    placeholder="Response Body (JSON or string)"
                                    value={rule.response.body}
                                    onChange={(e) => updateRule(idx, 'response.body', e.target.value)}
                                    className={`flex-[2] px-2 py-1 rounded bg-transparent border ${themeClasses.borderCol} text-[10px] ${themeClasses.textColor} outline-none`}
                                />
                                <button
                                    onClick={() => removeRule(idx)}
                                    className="p-1.5 text-gray-500 hover:text-red-400"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {rules.length === 0 && (
                        <div className="text-center py-6 border-2 border-dashed border-gray-500/10 rounded-xl">
                            <p className="text-[10px] text-gray-500 italic">No conditional rules defined. All requests will return the default response below.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Body Section */}
            <div className="flex-1 flex flex-col min-h-[300px] gap-2">
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
                        className="text-[9px] font-bold text-[#2ec4c7] hover:text-[#2ec4c7] flex items-center gap-1 border border-[#249d9f]/20 px-2 py-0.5 rounded"
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
