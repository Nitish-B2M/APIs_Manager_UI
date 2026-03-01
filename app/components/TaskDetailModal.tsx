'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, CheckCircle, Trash2, Edit2, Zap } from 'lucide-react';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';
import { getThemeClasses } from '../docs/[id]/utils/theme';
import { toast } from 'react-hot-toast';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    taskId: string | null;
}

export function TaskDetailModal({ isOpen, onClose, onSuccess, taskId }: TaskDetailModalProps) {
    const { theme } = useTheme() as { theme: 'light' | 'dark' };
    const themeClasses = getThemeClasses(theme);
    const [task, setTask] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        priority: 3,
        duration_minutes: 30,
        status: 'planned',
        scheduled_start: '',
        scheduled_end: ''
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (isOpen && taskId) {
            fetchTask();
        } else {
            setTask(null);
            setIsEditing(false);
        }
    }, [isOpen, taskId]);

    const fetchTask = async () => {
        try {
            setLoading(true);
            // Instead of a GET /tasks/:id which we don't have, we filter from the main list. 
            // In a larger app, a specific GET by ID endpoint is better, but this works for now.
            const res = await api.scheduler.getTasks();
            const foundTask = res.data.find((t: any) => t.id === taskId);
            if (foundTask) {
                setTask(foundTask);
                setEditForm({
                    title: foundTask.title,
                    description: foundTask.description || '',
                    priority: foundTask.priority || 3,
                    duration_minutes: foundTask.duration_minutes || 30,
                    status: foundTask.status || 'planned',
                    scheduled_start: foundTask.scheduled_start ? new Date(new Date(foundTask.scheduled_start).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
                    scheduled_end: foundTask.scheduled_end ? new Date(new Date(foundTask.scheduled_end).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''
                });
            } else {
                toast.error('Task not found');
                onClose();
            }
        } catch (error) {
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.scheduler.updateTask(taskId!, editForm);
            toast.success('Task updated');
            setIsEditing(false);
            onSuccess();
            fetchTask();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update task');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setLoading(true);
            await api.scheduler.deleteTask(taskId!);
            toast.success('Task deleted');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete task');
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const formatDuration = (mins: number) => {
        const hrs = Math.floor(mins / 60);
        const remainingStr = (mins % 60) > 0 ? `${mins % 60}m` : '';
        return hrs > 0 ? `${hrs}h ${remainingStr}`.trim() : `${mins}m`;
    };

    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl border ${themeClasses.borderCol} ${themeClasses.mainBg} overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${themeClasses.borderCol} ${themeClasses.secondaryBg}`}>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Zap className="text-indigo-500" size={24} />
                        {isEditing ? 'Edit Task' : 'Task Details'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {!isEditing && (
                            <>
                                <button onClick={() => setIsEditing(true)} className={`p-2 rounded-lg hover:${themeClasses.hoverBg} transition-colors`} title="Edit">
                                    <Edit2 size={18} className="text-gray-400 hover:text-indigo-500" />
                                </button>
                                {showDeleteConfirm ? (
                                    <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
                                        <span className="text-sm text-red-500 font-medium">Delete?</span>
                                        <button onClick={handleDelete} className="text-sm bg-red-500 text-white px-2 py-0.5 rounded hover:bg-red-600">Yes</button>
                                        <button onClick={() => setShowDeleteConfirm(false)} className="text-sm text-gray-400 hover:text-gray-600">No</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowDeleteConfirm(true)} className={`p-2 rounded-lg hover:${themeClasses.hoverBg} transition-colors`} title="Delete">
                                        <Trash2 size={18} className="text-gray-400 hover:text-red-500" />
                                    </button>
                                )}
                            </>
                        )}
                        <button onClick={onClose} className={`p-2 rounded-lg hover:${themeClasses.hoverBg} transition-colors`}>
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {loading && !isEditing ? (
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                        </div>
                    ) : isEditing ? (
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-70">Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1.5 opacity-70">Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    rows={4}
                                    className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none`}
                                    placeholder="Add notes or details..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-70">Priority (1=High, 4=Low)</label>
                                    <select
                                        value={editForm.priority}
                                        onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
                                        className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} ${themeClasses.mainBg} focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none`}
                                    >
                                        <option value={1}>1 - Essential</option>
                                        <option value={2}>2 - Important</option>
                                        <option value={3}>3 - Flexible</option>
                                        <option value={4}>4 - Optional</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-70">Duration (mins)</label>
                                    <input
                                        type="number"
                                        value={editForm.duration_minutes}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                                        className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                        min="5"
                                        step="5"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-70">Scheduled Start</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.scheduled_start}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, scheduled_start: e.target.value }))}
                                        className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 opacity-70">Scheduled End</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.scheduled_end}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, scheduled_end: e.target.value }))}
                                        className={`w-full px-4 py-2.5 rounded-xl border ${themeClasses.borderCol} bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setIsEditing(false)} className={`px-4 py-2 rounded-xl text-sm font-medium hover:${themeClasses.secondaryBg} transition-colors border ${themeClasses.borderCol}`}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50">
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-2xl font-bold mb-2">{task.title}</h3>
                                {task.description && (
                                    <p className="text-sm opacity-80 whitespace-pre-wrap">{task.description}</p>
                                )}
                                {!task.description && (
                                    <p className="text-sm text-gray-400 italic">No description provided.</p>
                                )}
                            </div>

                            <div className={`p-4 rounded-xl border ${themeClasses.borderCol} ${themeClasses.secondaryBg} grid grid-cols-2 gap-4`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-60 uppercase tracking-wider font-semibold">Duration</p>
                                        <p className="font-medium">{formatDuration(task.duration_minutes)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <CheckCircle size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-60 uppercase tracking-wider font-semibold">Status</p>
                                        <p className="font-medium capitalize">{task.status}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-60 uppercase tracking-wider font-semibold">Scheduled Time</p>
                                        <p className="font-medium text-sm">
                                            {task.scheduled_start
                                                ? `${new Date(task.scheduled_start).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} - ${new Date(task.scheduled_end).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                                                : 'Unscheduled'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
