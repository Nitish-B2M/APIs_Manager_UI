'use client';

import { useState } from 'react';
import { api } from '@/utils/api';
import { useTheme } from '@/context/ThemeContext';
import { X, Save, Info, Eye, Code, Type, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface TemplateEditorProps {
    template: any;
    onClose: () => void;
    onSave: () => void;
}

export default function TemplateEditor({ template, onClose, onSave }: TemplateEditorProps) {
    const { theme } = useTheme();
    const [name, setName] = useState(template?.name || '');
    const [subject, setSubject] = useState(template?.subject || '');
    const [body, setBody] = useState(template?.body || '');
    const [purpose, setPurpose] = useState(template?.purpose || 'COLLABORATION_INVITE');
    const [variables, setVariables] = useState<string[]>(template?.variables || ['docTitle', 'inviterName', 'role', 'inviteLink']);
    const [isDefault, setIsDefault] = useState(template?.isDefault || false);
    const [tab, setTab] = useState<'edit' | 'preview'>('edit');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name || !subject || !body || !purpose) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const data = { name, subject, body, purpose, variables, isDefault };
            if (template) {
                await api.admin.updateTemplate(template.id, data);
                toast.success('Template updated');
            } else {
                await api.admin.createTemplate(data);
                toast.success('Template created');
            }
            onSave();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    const addVariable = (v: string) => {
        if (!variables.includes(v)) {
            setVariables([...variables, v]);
        }
        setBody(body + ` {{${v}}}`);
    };

    const previewBody = body.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
        const mock: Record<string, string> = {
            docTitle: 'Project Phoenix API',
            inviterName: 'John Doe',
            role: 'EDITOR',
            inviteLink: 'https://example.com/invite',
            username: 'Alex'
        };
        return mock[key] || match;
    });

    const previewSubject = subject.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => {
        const mock: Record<string, string> = {
            docTitle: 'Project Phoenix API',
            inviterName: 'John Doe'
        };
        return mock[key] || match;
    });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className={`absolute inset-0 bg-black/80 backdrop-blur-md`} onClick={onClose}></div>
            <div className={`relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-[#0B0A0F] border-white/5' : 'bg-white border-gray-100'
                }`}>
                <header className={`px-8 py-6 border-b flex items-center justify-between ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-50 bg-gray-50/50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                            <Mail size={20} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-black capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{template ? 'Edit Template' : 'New Template'}</h2>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>{purpose.replace(/_/g, ' ')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex rounded-xl p-1 border ${theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-gray-100 border-transparent'}`}>
                            <button
                                type="button"
                                onClick={() => setTab('edit')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tab === 'edit' ? 'bg-violet-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' : `text-slate-500 hover:text-white`}`}
                            >
                                <Code size={14} /> Editor
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('preview')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${tab === 'preview' ? 'bg-violet-600 text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' : `text-slate-500 hover:text-white`}`}
                            >
                                <Eye size={14} /> Preview
                            </button>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-gray-800/20 rounded-xl text-gray-400"><X size={20} /></button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {tab === 'edit' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                            <Type size={12} /> Template Name
                                        </label>
                                        <input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g., Modern Invite Template"
                                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 focus:border-violet-500 focus:bg-white/[0.04] text-white' : 'bg-gray-50 border-gray-100 focus:border-violet-500'
                                                }`}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                            Purpose Category
                                        </label>
                                        <select
                                            value={purpose}
                                            onChange={(e) => setPurpose(e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl border outline-none transition-all appearance-none cursor-pointer ${theme === 'dark' ? 'bg-[#0B0A0F] border-white/5 focus:border-violet-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-violet-500'
                                                }`}
                                        >
                                            <option value="COLLABORATION_INVITE">Collaboration Invite</option>
                                            <option value="SYSTEM_NOTIFICATION">System Notification</option>
                                            <option value="WELCOME_EMAIL">Welcome Email</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                        Subject Line
                                    </label>
                                    <input
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Use {{variables}} here"
                                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 focus:border-violet-500 focus:bg-white/[0.04] text-white' : 'bg-gray-50 border-gray-100 focus:border-violet-500'
                                            }`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>
                                        Email Body (HTML)
                                        <span className="text-[10px] font-medium lowercase opacity-50 underline">HTML allowed</span>
                                    </label>
                                    <textarea
                                        value={body}
                                        onChange={(e) => setBody(e.target.value)}
                                        placeholder="HTML content with {{variables}}..."
                                        rows={12}
                                        className={`w-full px-4 py-4 rounded-2xl border outline-none transition-all font-mono text-sm leading-relaxed custom-scrollbar ${theme === 'dark' ? 'bg-[#0B0A0F] border-white/5 focus:border-violet-500 text-slate-300' : 'bg-gray-50 border-gray-100 focus:border-violet-500 shadow-inner'
                                            }`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 shadow-xl backdrop-blur-md' : 'bg-indigo-50/30 border-indigo-100/50'}`}>
                                    <h4 className={`text-sm font-black mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}><Info size={16} className="text-violet-500" /> Variable Helper</h4>
                                    <p className={`text-xs mb-4 font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Dynamic tags that will be replaced during delivery.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['docTitle', 'inviterName', 'role', 'inviteLink', 'username'].map(v => (
                                            <button
                                                key={v}
                                                type="button"
                                                onClick={() => addVariable(v)}
                                                className={`text-[10px] font-black uppercase px-2 py-1.5 rounded-lg border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-violet-400' : 'bg-white border-gray-200 hover:border-violet-300 text-violet-600 shadow-sm'
                                                    }`}
                                            >
                                                +{v}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={`mt-6 pt-6 border-t ${theme === 'dark' ? 'border-white/5' : 'border-gray-800/50'}`}>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={isDefault}
                                                    onChange={(e) => setIsDefault(e.target.checked)}
                                                    className="sr-only"
                                                />
                                                <div className={`w-10 h-5 rounded-full transition-colors ${isDefault ? 'bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.3)]' : theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}></div>
                                                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${isDefault ? 'translate-x-[20px]' : ''}`}></div>
                                            </div>
                                            <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Set as Primary Default</span>
                                        </label>
                                        <p className={`text-[10px] mt-2 font-semibold ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Use this template as the standard fallback for this purpose.</p>
                                    </div>
                                </div>
                                <div className={`p-6 rounded-2xl border bg-yellow-500/5 border-yellow-500/10`}>
                                    <h5 className="text-[10px] font-black uppercase text-yellow-500 mb-2">Safety Note</h5>
                                    <p className="text-[10px] text-yellow-600/80 leading-relaxed font-medium">
                                        Ensure all required variables are present in the body. Missing keys will display the raw tag to the recipient.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                            <div className={`p-4 rounded-hidden border ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 backdrop-blur-md text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                <h4 className={`text-[10px] font-black uppercase mb-2 tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>Mock Subject Preview</h4>
                                <div className="text-lg font-bold">{previewSubject}</div>
                            </div>
                            <div className={`p-1 shadow-2xl rounded-3xl overflow-hidden ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-gray-200'}`}>
                                <div className="bg-white rounded-[22px] overflow-hidden min-h-[400px] text-gray-900">
                                    <div className="p-8" dangerouslySetInnerHTML={{ __html: previewBody }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <footer className={`px-8 py-6 border-t flex items-center justify-between ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-50 bg-gray-50/50'}`}>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${theme === 'dark' ? 'hover:bg-white/5 text-slate-400 font-semibold hover:text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        Discard Changes
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-black shadow-[0_0_15px_rgba(139,92,246,0.25)] active:scale-95 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <Save size={18} />
                                {template ? 'Apply Changes' : 'Initialize Template'}
                            </>
                        )}
                    </button>
                </footer>
            </div>
        </div>
    );
}
