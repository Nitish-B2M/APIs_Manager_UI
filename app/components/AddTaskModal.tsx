'use client';

import React, { useState } from 'react';
import { X, Plus, Clock, Star, Zap, Flame } from 'lucide-react';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getThemeClasses } from '../docs/[id]/utils/theme';
import { toast } from 'react-hot-toast';

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        deadline?: string;
        title?: string;
        scheduled_start?: string;
        scheduled_end?: string;
        duration_minutes?: number;
    };
}

export function AddTaskModal({ isOpen, onClose, onSuccess, initialData }: AddTaskModalProps) {
    const { theme } = useTheme() as { theme: 'light' | 'dark' };
    const { user } = useAuth();
    const themeClasses = getThemeClasses(theme);

    const [form, setForm] = useState({
        title: initialData?.title || '',
        description: '',
        priority: 3,
        duration_minutes: initialData?.duration_minutes || 30,
        deadline: initialData?.deadline || '',
        is_flexible: true,
        scheduled_start: initialData?.scheduled_start || '',
        scheduled_end: initialData?.scheduled_end || ''
    });

    React.useEffect(() => {
        if (isOpen && initialData) {
            setForm(prev => ({
                ...prev,
                title: initialData.title || prev.title,
                deadline: initialData.deadline || prev.deadline,
                duration_minutes: initialData.duration_minutes || prev.duration_minutes,
                scheduled_start: initialData.scheduled_start || prev.scheduled_start,
                scheduled_end: initialData.scheduled_end || prev.scheduled_end
            }));
        }
    }, [isOpen, initialData]);
    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title) return toast.error('Title is required');

        try {
            setSubmitting(true);
            const payload = {
                ...form,
                user_id: user?.id,
                deadline: form.deadline === '' ? null : form.deadline,
                scheduled_start: form.scheduled_start === '' ? null : form.scheduled_start,
                scheduled_end: form.scheduled_end === '' ? null : form.scheduled_end
            };
            await api.scheduler.createTask(payload);
            toast.success('Task created successfully');
            onSuccess();
            onClose();
            setForm({
                title: '',
                description: '',
                priority: 3,
                duration_minutes: 30,
                deadline: '',
                is_flexible: true,
                scheduled_start: '',
                scheduled_end: ''
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to create task');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-3xl border ${themeClasses.borderCol} ${themeClasses.secondaryBg} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b ${themeClasses.borderCol} bg-gray-800/10`}>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Plus size={18} className="text-indigo-500" /> New Smart Task
                    </h2>
                    <button onClick={onClose} className={`p-1 rounded-lg ${themeClasses.hoverBg} transition-colors`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g., Design API Schema"
                            className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm ${themeClasses.textColor}`}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Priority</label>
                            <select
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm appearance-none ${themeClasses.textColor}`}
                            >
                                <option value={1} className="bg-gray-900 text-white">P1 - Critical</option>
                                <option value={2} className="bg-gray-900 text-white">P2 - High</option>
                                <option value={3} className="bg-gray-900 text-white">P3 - Medium</option>
                                <option value={4} className="bg-gray-900 text-white">P4 - Low</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Duration (min)</label>
                            <input
                                type="number"
                                value={form.duration_minutes}
                                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm ${themeClasses.textColor}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Start Time</label>
                            <input
                                type="datetime-local"
                                value={form.scheduled_start}
                                onChange={(e) => setForm({ ...form, scheduled_start: e.target.value })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm ${themeClasses.textColor}`}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">End Time</label>
                            <input
                                type="datetime-local"
                                value={form.scheduled_end}
                                onChange={(e) => setForm({ ...form, scheduled_end: e.target.value })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm ${themeClasses.textColor}`}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Deadline (Optional)</label>
                        <input
                            type="datetime-local"
                            value={form.deadline}
                            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                            className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm ${themeClasses.textColor}`}
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                        >
                            {submitting ? 'Creating...' : 'Create Smart Task'}
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-gray-500 italic mt-4 px-4 leading-relaxed">
                        Tip: AI will automatically handle the scheduling once the task is created. No need to manual pick a slot!
                    </p>
                </form>
            </div>
        </div>
    );
}
