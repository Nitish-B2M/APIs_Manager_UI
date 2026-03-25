"use client";

import { APICALL } from '@/utils/helper';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Trash2, Copy, Edit2, Save, X, AlertCircle, Flag, Clock } from 'lucide-react';
import { cn } from '../../../utils/cn';
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
        // confirmmodal
        if (await confirmModal('Are you sure you want to delete this task?')) return;

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

    // const pastelColors = [
    //     // 'bg-[#D5F5E3]', // Green
    //     // 'bg-[#D1E8FF]', // Blue
    //     // 'bg-[#FFF5CC]', // Yellow
    //     // 'bg-[#FFE5B4]', // Orange
    //     // 'bg-[#D4F3F5]', // Aqua
    //     'bg-[#FFE27D]', // Gold
    // ];

    const pastelColors = {
        is_completed: ['bg-[#D5F5E3]', 'bg-[#D1E8FF]'], // Green
        is_unfinished: ['bg-[#FFF5CC]', 'bg-[#FFE5B4]'], // Blue
    }

    const cardColor = pastelColors[todo.is_completed ? 'is_completed' : 'is_unfinished'][parseInt(todo.id.slice(-1), 16) % pastelColors.is_completed.length] || 'bg-white';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group relative flex flex-col p-6 rounded-[1.5rem] transition-all duration-300 ease-in-out cursor-default border-[3px] border-[#2D3436] shadow-[6px_6px_0px_#2D3436] hover:translate-y-[-4px] hover:shadow-[10px_10px_0px_#2D3436]",
                cardColor
            )}
        >
            {/* Sticker Badges */}
            <div className="absolute -top-3 -right-3 flex flex-col gap-2 items-end z-20">
                {todo.priority && (
                    <div className="relative group/priority">
                        <div className="absolute inset-0 bg-white rounded-lg border-[2px] border-[#2D3436] rotate-[-2deg]"></div>
                        <div className="relative px-3 py-1 bg-[#FFE27D] border-[2px] border-[#2D3436] rounded-lg rotate-[3deg] flex items-center gap-1 shadow-sm whitespace-nowrap">
                            <span className="text-[9px] font-black uppercase tracking-wider text-[#2D3436]">
                                {todo.priority}
                            </span>
                            <div className="text-yellow-600 flex-shrink-0">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            </div>
                            {showTimestamp && <div className="flex items-center gap-2 text-[#2D3436]/40">
                                <Clock size={12} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {new Date(todo.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            }
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col h-full space-y-4">
                {/* Status Sticker */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="px-3 py-1 bg-white/60 border-[2px] border-[#2D3436] rounded-full flex items-center gap-2 shadow-sm">
                        <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] border-[#2D3436] flex-shrink-0",
                            todo.is_completed ? "bg-[#FFE27D]" : "bg-[#D4F3F5]"
                        )}>
                            {todo.is_completed ? (
                                <span className="text-[10px] pb-0.5">💰</span>
                            ) : (
                                <span className="text-[10px]">💡</span>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#2D3436] whitespace-nowrap">
                            {todo.is_completed ? 'Completed' : 'In Progress'}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    {isEditing ? (
                        <div className="flex flex-col gap-3 w-full" onClick={e => e.stopPropagation()}>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-white/90 border-2 border-[#2D3436] rounded-xl px-4 py-2 text-sm font-bold text-[#2D3436] focus:outline-none"
                                autoFocus
                            />
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full bg-white/90 border-2 border-[#2D3436] rounded-xl px-4 py-2 text-xs font-bold text-[#2D3436] focus:outline-none resize-none"
                                rows={2}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h4 className={cn(
                                "text-lg font-black leading-tight tracking-tight text-[#2D3436]",
                                todo.is_completed && "line-through opacity-40 decoration-[3px]"
                            )}>
                                {todo.title}
                            </h4>
                            {todo.description && (
                                <p className="text-xs font-bold text-[#2D3436]/60 line-clamp-2 leading-relaxed italic">
                                    {todo.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Metadata & Avatar */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        {/* <div className="flex items-center gap-2 text-[#2D3436]/40">
                            <Clock size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {new Date(todo.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div> */}
                        {/* <div className="flex items-center gap-2 text-[#2D3436]/80">
                            <div className="w-4 h-4 border-[1.5px] border-[#2D3436] rounded-full flex items-center justify-center">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-tighter">Developer</span>
                        </div> */}
                    </div>

                    {/* <div className="relative group/avatar">
                        <div className="absolute inset-0 bg-white border-[2.5px] border-[#2D3436] rounded-full rotate-[10deg]"></div>
                        <div className="relative w-10 h-10 border-[2.5px] border-[#2D3436] rounded-full bg-[#FFE27D] overflow-hidden p-1 shadow-sm transition-transform hover:scale-110 active:scale-95">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${todo.id}&backgroundColor=ffdfbf`}
                                alt="avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div> */}
                </div>

                {/* Quick Actions - Floating bottom right */}
                <div className="absolute top-4 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleComplete(todo); }}
                        className="w-8 h-8 rounded-lg bg-white border-2 border-[#2D3436] flex items-center justify-center text-[#2D3436] hover:bg-[#D5F5E3] transition-colors"
                        title="Toggle status"
                    >
                        <Check size={14} />
                    </button>
                    {!isEditing ? (
                        <button
                            onClick={handleEditClick}
                            className="w-8 h-8 rounded-lg bg-white border-2 border-[#2D3436] flex items-center justify-center text-[#2D3436] hover:bg-[#D1E8FF] transition-colors"
                            title="Edit"
                        >
                            <Edit2 size={14} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            className="w-8 h-8 rounded-lg bg-[#D5F5E3] border-2 border-[#2D3436] flex items-center justify-center text-[#2D3436]"
                            title="Save"
                        >
                            <Save size={14} />
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="w-8 h-8 rounded-lg bg-white border-2 border-[#2D3436] flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}

const confirmModal = (message: string) => {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-[#2D3436]/50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-[#FFF5CC] border-2 border-[#FFE27D] text-[#2D3436] p-6 rounded-lg shadow-lg">
                <p class="text-lg font-medium">${message}</p>
                <div class="flex justify-end gap-4 mt-4">
                    <button class="px-4 py-2 rounded-lg bg-[#D5F5E3] hover:bg-[#D5F5E3]/80 text-black" id="cancel">Cancel</button>
                    <button class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-500/80" id="confirm">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cancel')?.addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });

        document.getElementById('confirm')?.addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
    });
}