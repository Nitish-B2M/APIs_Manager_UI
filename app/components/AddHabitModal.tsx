'use client';

import React, { useState } from 'react';
import { X, RefreshCw, Clock, Star, Zap, Flame } from 'lucide-react';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { getThemeClasses } from '../docs/[id]/utils/theme';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface AddHabitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddHabitModal({ isOpen, onClose, onSuccess }: AddHabitModalProps) {
    const { theme } = useTheme() as { theme: 'light' | 'dark' };
    const { user } = useAuth();
    const themeClasses = getThemeClasses(theme);

    const [form, setForm] = useState({
        title: '',
        frequency: 'daily',
        duration_minutes: 30,
        preferred_window: 'morning',
        priority: 3
    });

    const [submitting, setSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title) return toast.error('Title is required');

        try {
            setSubmitting(true);
            const payload = {
                ...form,
                user_id: user?.id
            };
            await api.scheduler.createHabit(payload);
            toast.success('Habit added to your routine!');
            onSuccess();
            onClose();
            setForm({
                title: '',
                frequency: 'daily',
                duration_minutes: 30,
                preferred_window: 'morning',
                priority: 3
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to create habit');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-3xl border ${themeClasses.borderCol} ${themeClasses.secondaryBg} shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b ${themeClasses.borderCol} bg-emerald-500/10`}>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <RefreshCw size={18} className="text-emerald-500" /> New Recurring Habit
                    </h2>
                    <button onClick={onClose} className={`p-1 rounded-lg ${themeClasses.hoverBg} transition-colors`}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Habit Title</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g., Morning Meditation"
                            className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm ${themeClasses.textColor}`}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Frequency</label>
                            <select
                                value={form.frequency}
                                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm appearance-none ${themeClasses.textColor}`}
                            >
                                <option value="daily" className="bg-gray-900 text-white">Daily</option>
                                <option value="weekly" className="bg-gray-900 text-white">Weekly</option>
                                <option value="monthly" className="bg-gray-900 text-white">Monthly</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Duration (min)</label>
                            <input
                                type="number"
                                value={form.duration_minutes}
                                onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm ${themeClasses.textColor}`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Preferred Window</label>
                            <select
                                value={form.preferred_window}
                                onChange={(e) => setForm({ ...form, preferred_window: e.target.value })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm appearance-none ${themeClasses.textColor}`}
                            >
                                <option value="morning" className="bg-gray-900 text-white">Morning</option>
                                <option value="afternoon" className="bg-gray-900 text-white">Afternoon</option>
                                <option value="evening" className="bg-gray-900 text-white">Evening</option>
                                <option value="any" className="bg-gray-900 text-white">Any Time</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">Priority</label>
                            <select
                                value={form.priority}
                                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })}
                                className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm appearance-none ${themeClasses.textColor}`}
                            >
                                <option value={1} className="bg-gray-900 text-white">P1 - Essential</option>
                                <option value={2} className="bg-gray-900 text-white">P2 - Standard</option>
                                <option value={3} className="bg-gray-900 text-white">P3 - Optional</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                            {submitting ? 'Adding...' : 'Secure Routine Slot'}
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-gray-500 italic mt-4 px-4 leading-relaxed">
                        Habits are recurring blocks that the AntiGravity AI prioritizes to build your long-term discipline.
                    </p>
                </form>
            </div>
        </div>
    );
}
