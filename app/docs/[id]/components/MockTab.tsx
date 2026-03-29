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
            {/* Mock URL + Status bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <Globe size={14} style={{ color: '#249d9f', flexShrink: 0 }} />
                    <code style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mockUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(mockUrl); toast.success('URL copied'); }} title="Copy URL" style={{ padding: 4, borderRadius: 4, background: 'none', border: 'none', color: '#8B949E', flexShrink: 0 }}>
                        <Copy size={13} />
                    </button>
                    <a href={mockUrl} target="_blank" rel="noopener noreferrer" title="Open" style={{ padding: 4, borderRadius: 4, color: '#8B949E', flexShrink: 0, textDecoration: 'none' }}>
                        <ExternalLink size={13} />
                    </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button
                        onClick={() => setConfig({ ...config, isActive: !config.isActive })}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', background: config.isActive ? 'rgba(63,185,80,0.15)' : '#21262D', color: config.isActive ? '#3FB950' : '#8B949E' }}
                    >
                        <Power size={12} />
                        {config.isActive ? 'Active' : 'Inactive'}
                    </button>
                    {canEdit && (
                        <button onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: 'none', background: '#249d9f', color: 'white', opacity: isSaving ? 0.5 : 1 }}>
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Save
                        </button>
                    )}
                </div>
            </div>

            {/* Settings row: Status Code + Delay + Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 12 }}>
                {/* Status Code */}
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681', display: 'block', marginBottom: 8 }}>Status Code</span>
                    <select value={config.statusCode} onChange={(e) => setConfig({ ...config, statusCode: parseInt(e.target.value) })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#E6EDF3', fontSize: 12, outline: 'none' }}>
                        {[200,201,202,204,301,302,400,401,403,404,405,409,422,429,500,502,503].map(c => (
                            <option key={c} value={c}>{c} {c===200?'OK':c===201?'Created':c===400?'Bad Request':c===401?'Unauthorized':c===403?'Forbidden':c===404?'Not Found':c===500?'Server Error':''}</option>
                        ))}
                    </select>
                </div>

                {/* Delay */}
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681', display: 'block', marginBottom: 8 }}>Delay (ms)</span>
                    <input type="number" value={config.delay} onChange={(e) => setConfig({ ...config, delay: parseInt(e.target.value) || 0 })} placeholder="0"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#E6EDF3', fontSize: 12, outline: 'none' }} />
                </div>

                {/* Headers */}
                <div style={{ padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681' }}>Headers</span>
                        <button onClick={addHeader} style={{ fontSize: 11, fontWeight: 600, color: '#249d9f', background: 'none', border: 'none' }}>+ Add</button>
                    </div>
                    <div style={{ maxHeight: 120, overflowY: 'auto' }} className="custom-scrollbar">
                        {headerList.map((h, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                <input value={h.key} onChange={(e) => updateHeader(idx, e.target.value, h.value)} placeholder="Key"
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#E6EDF3', fontSize: 11, outline: 'none' }} />
                                <input value={h.value} onChange={(e) => updateHeader(idx, h.key, e.target.value)} placeholder="Value"
                                    style={{ flex: 1, padding: '6px 8px', borderRadius: 4, background: '#21262D', border: '1px solid rgba(255,255,255,0.08)', color: '#E6EDF3', fontSize: 11, outline: 'none' }} />
                                <button onClick={() => removeHeader(idx)} style={{ padding: 4, background: 'none', border: 'none', color: '#F85149' }}><Trash2 size={12} /></button>
                            </div>
                        ))}
                        {headerList.length === 0 && <p style={{ fontSize: 11, color: '#6E7681', textAlign: 'center', padding: 12 }}>No headers</p>}
                    </div>
                </div>
            </div>

            {/* Conditional Rules */}
            <div style={{ padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681' }}>Conditional Rules</span>
                    <button onClick={addRule} style={{ fontSize: 11, fontWeight: 600, color: '#249d9f', background: 'none', border: 'none' }}>+ Add Rule</button>
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

            {/* Response Body */}
            <div className="flex-1 flex flex-col min-h-[300px]">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6E7681' }}>Response Body</span>
                    <button
                        onClick={() => {
                            try {
                                const formatted = JSON.stringify(JSON.parse(config.body), null, 2);
                                setConfig({ ...config, body: formatted });
                                toast.success('Formatted');
                            } catch (e) {
                                toast.error('Invalid JSON');
                            }
                        }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#249d9f', background: 'none', border: '1px solid rgba(36,157,159,0.2)', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <CheckCircle2 size={10} /> Format
                    </button>
                </div>
                <div style={{ flex: 1, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', background: '#1C2128' }}>
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
