'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../utils/api';
import { 
    StickyNote, 
    CheckSquare, 
    Plus, 
    Trash2, 
    ChevronRight, 
    Calendar,
    Clock,
    AlertCircle,
    Loader2,
    FileText,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';

interface WorkspaceTabProps {
    endpointId: string;
    canEdit: boolean;
}

export const WorkspaceTab = ({ endpointId, canEdit }: WorkspaceTabProps) => {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState<'notes' | 'tasks'>('notes');

    // --- Notes Queries & Mutations ---
    const { data: notesRes, isLoading: notesLoading } = useQuery({
        queryKey: ['notes', endpointId],
        queryFn: () => api.notes.list(endpointId, 'endpoint'),
        enabled: !!endpointId
    });
    const notes = notesRes?.data || [];

    const createNoteMutation = useMutation({
        mutationFn: (data: { title: string, referenceId: string, referenceType: string }) => 
            api.notes.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', endpointId] });
            toast.success('Note added');
        }
    });

    const deleteNoteMutation = useMutation({
        mutationFn: (id: string) => api.notes.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes', endpointId] });
            toast.success('Note removed');
        }
    });

    // --- Todos Queries & Mutations ---
    const { data: todosRes, isLoading: todosLoading } = useQuery({
        queryKey: ['todos', endpointId],
        queryFn: () => api.todos.list(endpointId, 'endpoint'),
        enabled: !!endpointId
    });
    const todos = todosRes?.data || [];

    const createTodoMutation = useMutation({
        mutationFn: (data: any) => api.todos.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos', endpointId] });
            toast.success('Task created');
        }
    });

    const toggleTodoMutation = useMutation({
        mutationFn: (todo: any) => api.todos.update(todo.id, { is_completed: !todo.is_completed }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos', endpointId] });
        }
    });

    const deleteTodoMutation = useMutation({
        mutationFn: (id: string) => api.todos.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['todos', endpointId] });
            toast.success('Task removed');
        }
    });

    const handleAddNote = () => {
        if (!canEdit) return;
        createNoteMutation.mutate({ 
            title: 'New Note for Endpoint', 
            referenceId: endpointId, 
            referenceType: 'endpoint' 
        });
    };

    const handleAddTask = () => {
        if (!canEdit) return;
        createTodoMutation.mutate({ 
            title: 'New Task', 
            main_title: 'API Tasks',
            referenceId: endpointId, 
            referenceType: 'endpoint' 
        });
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-top-1 duration-300">
            {/* Nav Headers */}
            <div className={`flex gap-4 mb-6 border-b ${themeClasses.borderCol} pb-2`}>
                <button 
                    onClick={() => setActiveSection('notes')}
                    className={`flex items-center gap-2 px-1 py-1 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                        activeSection === 'notes' ? 'text-[#2ec4c7]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <StickyNote size={14} />
                    Linked Notes
                    {notes.length > 0 && (
                        <span className="bg-[#249d9f]/20 text-[#2ec4c7] px-1.5 py-0.5 rounded text-[8px] ml-1">
                            {notes.length}
                        </span>
                    )}
                    {activeSection === 'notes' && (
                        <div className="absolute -bottom-[9px] left-0 right-0 h-0.5 bg-[#249d9f] rounded-full" />
                    )}
                </button>
                <button 
                    onClick={() => setActiveSection('tasks')}
                    className={`flex items-center gap-2 px-1 py-1 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                        activeSection === 'tasks' ? 'text-[#2ec4c7]' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                    <CheckSquare size={14} />
                    Linked Tasks
                    {todos.length > 0 && (
                        <span className="bg-[#249d9f]/20 text-[#2ec4c7] px-1.5 py-0.5 rounded text-[8px] ml-1">
                            {todos.length}
                        </span>
                    )}
                    {activeSection === 'tasks' && (
                        <div className="absolute -bottom-[9px] left-0 right-0 h-0.5 bg-[#249d9f] rounded-full" />
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeSection === 'notes' ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Contextual Dev Notes</h3>
                            {canEdit && (
                                <button 
                                    onClick={handleAddNote}
                                    disabled={createNoteMutation.isPending}
                                    className="p-1 px-3 bg-[#1a7a7c]/10 text-[#2ec4c7] hover:bg-[#1a7a7c]/20 rounded-xl flex items-center gap-2 font-black text-[9px] border border-[#249d9f]/30 transition-all uppercase tracking-widest"
                                >
                                    {createNoteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                    New Note
                                </button>
                            )}
                        </div>

                        {notesLoading ? (
                            <div className="py-10 flex flex-col items-center justify-center opacity-30 gap-3">
                                <Loader2 size={32} className="animate-spin text-[#249d9f]" />
                                <span className="text-[10px] font-black tracking-widest">FETCHING NOTES...</span>
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center opacity-20 gap-4 border-2 border-dashed border-white/5 rounded-3xl">
                                <FileText size={48} />
                                <div className="text-center">
                                    <p className="text-xs font-bold uppercase tracking-widest mb-1">No notes linked</p>
                                    <p className="text-[10px]">Capture endpoint-specific implementation details here.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {notes.map((note: any) => (
                                    <div 
                                        key={note.id}
                                        className={`group p-4 rounded-2xl border ${themeClasses.borderCol} ${themeClasses.inputBg} hover:border-[#249d9f]/50 transition-all cursor-pointer relative overflow-hidden`}
                                        onClick={() => window.open(`/modules/notes?id=${note.id}`, '_blank')}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-sm text-white group-hover:text-[#2ec4c7] transition-colors">{note.title}</h4>
                                            {canEdit && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); deleteNoteMutation.mutate(note.id); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-gray-500">
                                            <span className="flex items-center gap-1"><Clock size={12} /> {new Date(note.updatedAt).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1 uppercase tracking-tighter bg-[#249d9f]/10 text-[#2ec4c7] px-1.5 py-0.5 rounded">Endpoint Context</span>
                                        </div>
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#249d9f] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Endpoint Action Items</h3>
                            {canEdit && (
                                <button 
                                    onClick={handleAddTask}
                                    disabled={createTodoMutation.isPending}
                                    className="p-1 px-3 bg-[#1a7a7c]/10 text-[#2ec4c7] hover:bg-[#1a7a7c]/20 rounded-xl flex items-center gap-2 font-black text-[9px] border border-[#249d9f]/30 transition-all uppercase tracking-widest"
                                >
                                    {createTodoMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                    Add Task
                                </button>
                            )}
                        </div>

                        {todosLoading ? (
                            <div className="py-10 flex flex-col items-center justify-center opacity-30 gap-3">
                                <Loader2 size={32} className="animate-spin text-[#249d9f]" />
                                <span className="text-[10px] font-black tracking-widest">FETCHING TASKS...</span>
                            </div>
                        ) : todos.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center opacity-20 gap-4 border-2 border-dashed border-white/5 rounded-3xl">
                                <CheckCircle2 size={48} />
                                <div className="text-center">
                                    <p className="text-xs font-bold uppercase tracking-widest mb-1">No tasks linked</p>
                                    <p className="text-[10px]">Track TODOs, bug fixes or improvements for this API.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todos.map((todo: any) => (
                                    <div 
                                        key={todo.id}
                                        className={`group flex items-center gap-4 p-3 rounded-xl border ${themeClasses.borderCol} ${themeClasses.inputBg} hover:border-[#249d9f]/50 transition-all`}
                                    >
                                        <button 
                                            onClick={() => toggleTodoMutation.mutate(todo)}
                                            className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                todo.is_completed 
                                                ? 'bg-[#249d9f] border-[#249d9f] text-white' 
                                                : 'border-white/10 hover:border-[#249d9f]'
                                            }`}
                                        >
                                            {todo.is_completed && <CheckCircle2 size={14} />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium transition-all ${todo.is_completed ? 'line-through opacity-40 text-gray-500' : 'text-white'}`}>
                                                {todo.title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1 opacity-40">
                                                <Calendar size={10} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">
                                                    {new Date(todo.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <button 
                                                onClick={() => deleteTodoMutation.mutate(todo.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Hint Footer */}
            <div className="mt-6 p-4 rounded-2xl bg-[#249d9f]/5 border border-[#249d9f]/10 flex items-start gap-4">
                <AlertCircle size={18} className="text-[#2ec4c7] shrink-0" />
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                    <span className="font-bold text-[#2ec4c7] uppercase mr-1">Pro Tip:</span> 
                    These items are linked specifically to this endpoint. You can view 
                    all your notes and tasks in their respective modules, but this view 
                    keeps you focused on the current context.
                </p>
            </div>
        </div>
    );
};
