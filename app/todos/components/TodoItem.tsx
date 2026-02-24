"use client";

import { APICALL } from '@/utils/helper';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Trash2, Copy, Edit2, Save, X, AlertCircle, Flag } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export interface Todo {
    id: string;
    title: string;
    main_title: string;
    date: string;
    is_completed: boolean;
    position: number;
    priority?: 'low' | 'medium' | 'high';
    description?: string;
}

interface TodoItemProps {
    todo: Todo;
    onUpdate: () => void;
    showTimestamp?: boolean;
}

export default function TodoItem({ todo, onUpdate, showTimestamp = false }: TodoItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: todo.id });

    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(todo.title);
    const [editDescription, setEditDescription] = useState(todo.description || '');
    const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | ''>(todo.priority || '');

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.3 : 1,
    };

    const toggleComplete = async (todo: Todo) => {
        try {
            const token = localStorage.getItem('token');
            const res = await APICALL({
                url: `/todos/${todo.id}`,
                method: 'PUT',
                body: { is_completed: !todo.is_completed }
            });

            if (res && res.status !== false) {
                onUpdate();
            }
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent drag/click propagation if needed
        // if (!confirm('Area you sure?')) return;

        try {
            const res = await APICALL({
                url: `/todos/${todo.id}`,
                method: 'DELETE'
            });

            if (res && res.status !== false) {
                onUpdate();
                toast.success('Task deleted');
            }
        } catch (error) {
            toast.error('Failed to delete task');
        }
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setEditTitle(todo.title);
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!editTitle.trim()) {
            toast.error('Title cannot be empty');
            return;
        }

        try {
            const res = await APICALL({
                url: `/todos/${todo.id}`,
                method: 'PUT',
                body: { title: editTitle, description: editDescription || '', priority: editPriority || undefined }
            });

            if (res && res.status !== false) {
                onUpdate();
                setIsEditing(false);
                toast.success('Task updated');
            }
        } catch (error) {
            toast.error('Failed to update task');
        }
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(false);
        setEditTitle(todo.title);
        setEditDescription(todo.description || '');
        setEditPriority(todo.priority || '');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ') {
            e.stopPropagation();
        }
        if (e.key === 'Enter') {
            handleSave(e as any);
        } else if (e.key === 'Escape') {
            handleCancel(e as any);
        }
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(todo.title);
            toast.success('Task copied to clipboard');
        } catch (error) {
            toast.error('Failed to copy task');
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group flex items-center justify-between py-4 px-4 rounded-xl transition-all duration-300 ease-in-out cursor-default odd:bg-white even:bg-gray-50/80 dark:odd:bg-gray-800/30 dark:even:bg-gray-800/60
            hover:bg-orange-500/20 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => toggleComplete(todo)}>
                {/* Custom Checkbox */}
                <div
                    className={`w-5 h-5 min-w-5 min-h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors duration-200 ${todo.is_completed
                        ? 'bg-orange-500 border-orange-500'
                        : 'bg-transparent border-gray-300 dark:border-gray-500 group-hover:border-orange-400'
                        }`}
                >
                    {todo.is_completed && <Check size={12} className="text-white" strokeWidth={4} />}
                </div>

                {/* Text & Timestamp */}
                <div className="flex flex-col min-w-0 overflow-hidden flex-1">
                    {isEditing ? (
                        <div className="flex flex-col gap-1.5 w-full">
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                placeholder="Task title"
                                autoFocus
                            />
                            <div className="flex gap-1.5">
                                <input
                                    type="text"
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.key === ' ' && e.stopPropagation()}
                                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                    placeholder="Description (optional)"
                                />
                                <select
                                    value={editPriority}
                                    onChange={(e) => setEditPriority(e.target.value as any)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-500 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="">No priority</option>
                                    <option value="low">🟢 Low</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="high">🔴 High</option>
                                </select>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                {todo.priority && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${todo.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                                        todo.priority === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                                            'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                                        }`}>
                                        {todo.priority}
                                    </span>
                                )}
                                <span
                                    className={`text-base font-medium cursor-pointer select-none truncate transition-colors duration-200 ${todo.is_completed
                                        ? 'text-gray-400 line-through decoration-gray-300'
                                        : 'text-gray-800 dark:text-gray-100'
                                        }`}
                                >
                                    {todo.title}
                                </span>
                            </div>
                            {todo.description && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                    {todo.description}
                                </span>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Actions - Appears on right */}
            <div className="flex items-center gap-1">
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleSave}
                            className="text-gray-400 hover:text-green-500 dark:text-gray-500 dark:hover:text-green-400 p-2 transition-colors duration-200"
                            title="Save"
                        >
                            <Save size={18} />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-2 transition-colors duration-200"
                            title="Cancel"
                        >
                            <X size={18} />
                        </button>
                        <button
                            onClick={handleCopy}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-2 transition-colors duration-200"
                            title="Copy"
                        >
                            <Copy size={18} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={handleEditClick}
                            className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 p-2 transition-colors duration-200"
                            title="Edit task"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={handleCopy}
                            className="text-gray-400 hover:text-orange-500 dark:text-gray-500 dark:hover:text-orange-400 p-2 transition-colors duration-200"
                            title="Copy task text"
                        >
                            <Copy size={18} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-2 transition-colors duration-200"
                            title="Delete task"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                )}

                {showTimestamp && (
                    <span className="text-[12px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                        {new Date(todo.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                )}
            </div>
        </div>
    );
}
