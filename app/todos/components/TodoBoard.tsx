"use client";

import { useState, useEffect } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import TodoGroup from './TodoGroup';
import TodoFilters from './TodoFilters';
import { Loader2, LayoutList, Columns, Copy, Clock, Rocket, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { toBlob } from 'html-to-image';
import { API_URL } from '../../../utils/api';

// Interfaces
interface Todo {
    id: string;
    title: string;
    main_title: string;
    date: string;
    is_completed: boolean;
    position: number;
    priority?: 'low' | 'medium' | 'high';
    description?: string;
}

export default function TodoBoard() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'unfinished'>('all');
    const [viewMode, setViewMode] = useState<'list' | 'split'>('list');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showTimestamp, setShowTimestamp] = useState(false);

    // State for new task input
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // Fetch todos
    const fetchTodos = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${API_URL}/api/todos?orders=desc`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const result = await res.json();
                setTodos(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch todos', error);
            toast.error('Failed to load tasks');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTodos();
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        if (active.id !== over.id) {
            setTodos((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);
                updateOrder(newItems);
                return newItems;
            });
        }
    };

    const updateOrder = async (items: Todo[]) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const orders = items.map((t, index) => ({ id: t.id, position: index }));

            await fetch(`${API_URL}/api/todos/reorder/batch`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ orders })
            });
        } catch (error) {
            console.error('Failed to update order', error);
        }
    };

    // Add new todo handler
    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Please login first');
                return;
            }

            const res = await fetch(`${API_URL}/api/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTaskTitle,
                    main_title: 'My Tasks', // Default group since input is simplified
                    date: new Date().toISOString()
                })
            });

            if (res.ok) {
                setNewTaskTitle('');
                fetchTodos();
                toast.success('Task created');
            } else {
                toast.error('Failed to create task');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error creating task');
        }
    };

    const handleCopyScreenshot = async (mainTitle: string, date: string) => {
        console.log('mainTitle', mainTitle, 'date', date);
        const element = document.getElementById(`group-${mainTitle}-${date}`);
        if (!element) return;
        // get background color of the element
        const backgroundColor = localStorage.getItem('theme') === 'dark' ? '#ffe1aaff' : '#bbf8fdff';
        console.log('background color', backgroundColor, element);

        try {
            // Fetch font CSS manually to embed it
            let fontCss = '';
            try {
                const res = await fetch('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
                fontCss = await res.text();
            } catch (e) {
                console.warn('Failed to fetch font CSS for screenshot', e);
            }

            const blob = await toBlob(element, {
                cacheBust: true,
                backgroundColor: backgroundColor,
                style: {
                    fontFamily: "'Poppins', sans-serif",
                    padding: '40px',
                },
                fontEmbedCSS: fontCss,
                filter: (node) => {
                    // Exclude the copy and action buttons from the screenshot
                    if (node instanceof HTMLElement && (
                        node.getAttribute('title') === 'Copy screenshot to clipboard' ||
                        node.tagName === 'BUTTON'
                    )) {
                        return false;
                    }
                    return true;
                }
            });

            if (!blob) {
                toast.error('Failed to generate screenshot');
                return;
            }

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success('Screenshot copied to clipboard');
        } catch (error) {
            console.error(error);
            toast.error('Failed to capture screenshot');
        }
    };

    // Grouping Logic
    const groupedTodos = todos.reduce((acc, todo) => {
        const dateKey = new Date(todo.date).toDateString();
        const key = `${todo.main_title}::${dateKey}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(todo);
        return acc;
    }, {} as Record<string, Todo[]>);

    if (isLoading) {
        return <div className="flex justify-center p-20"><Loader2 className="h-10 w-10 animate-spin text-[#FF7F50]" /></div>;
    }

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">

            {/* Input Section - Matches design */}
            <div className="relative">
                <form onSubmit={handleAddTodo} className="flex bg-white/5 rounded-2xl overflow-hidden border border-white/5 focus-within:border-violet-500/50 shadow-lg transition-all duration-300">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Add a new high-priority task..."
                        className="flex-1 bg-transparent px-8 py-5 text-black outline-none placeholder:text-black transition-colors duration-200 font-medium"
                    />
                    <button
                        type="submit"
                        className="bg-[#FFE5B4] hover:bg-[#7C3AED] text-[#2D3436] font-black px-12 py-5 transition-all duration-300 active:scale-95 uppercase tracking-widest text-xs"
                    >
                        Create
                    </button>
                </form>
            </div>

            {/* Filters & View Toggle - Subtle integration */}
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 w-full">
                {viewMode === 'list' && (
                    <TodoFilters
                        current={filter}
                        onChange={setFilter}
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                    />
                )}

                {/* View Toggle */}
                <div className="bg-white p-1 rounded-2xl flex gap-1 border-[2.5px] border-[#2D3436] shadow-[4px_4px_0px_#2D3436]">
                    <button
                        onClick={() => setShowTimestamp(!showTimestamp)}
                        className={`p-2 rounded-xl transition-all duration-200 ${showTimestamp ? 'bg-[#FFE27D] text-[#2D3436]' : 'text-slate-400 hover:text-[#2D3436]'}`}
                        title="Toggle Timestamp"
                    >
                        <Clock size={16} />
                    </button>
                    <div className="w-[2px] bg-[#2D3436] mx-1 self-stretch my-1 opacity-20"></div>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-xl transition-all duration-200 ${viewMode === 'list' ? 'bg-[#D4F3F5] text-[#2D3436]' : 'text-slate-400 hover:text-[#2D3436]'}`}
                        title="List View"
                    >
                        <LayoutList size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`p-2 rounded-xl transition-all duration-200 ${viewMode === 'split' ? 'bg-[#D1E8FF] text-[#2D3436]' : 'text-slate-400 hover:text-[#2D3436]'}`}
                        title="Split View"
                    >
                        <Columns size={16} />
                    </button>
                </div>
            </div>

            <div className="pb-20">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex flex-col gap-6">
                        {Object.entries(groupedTodos).length === 0 && (
                            <div className="text-center py-10 opacity-50">
                                <p>No tasks yet. Add one above!</p>
                            </div>
                        )}

                        {Object.entries(groupedTodos).map(([key, items]) => {
                            const [mainTitle, date] = key.split('::');

                            // Filter by Date if selected
                            if (selectedDate) {
                                // selectedDate is YYYY-MM-DD from input
                                // date string in key is from toDateString()
                                const groupDate = new Date(date);
                                const selected = new Date(selectedDate);

                                // Compare year, month, day to avoid timezone issues
                                const isSameDate =
                                    groupDate.getFullYear() === selected.getFullYear() &&
                                    groupDate.getMonth() === selected.getMonth() &&
                                    groupDate.getDate() === selected.getDate();

                                if (!isSameDate) return null;
                            }

                            // If in split view, we ignore the status filter and show everything split
                            const effectiveItems = viewMode === 'split' ? items : items.filter(t => {
                                if (filter === 'completed') return t.is_completed;
                                if (filter === 'unfinished') return !t.is_completed;
                                return true;
                            });

                            if (effectiveItems.length === 0) return null;

                            if (viewMode === 'list') {
                                return (
                                    <TodoGroup
                                        key={key}
                                        title={mainTitle}
                                        date={date}
                                        items={effectiveItems}
                                        onUpdate={() => fetchTodos()}
                                        showTimestamp={showTimestamp}
                                    />
                                );
                            }

                            // Split View Logic
                            const unfinishedItems = effectiveItems.filter(t => !t.is_completed);
                            const completedItems = effectiveItems.filter(t => t.is_completed);

                            const displayDate = new Date(date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric'
                            });

                            return (
                                <div key={key} className="flex flex-col gap-6 p-4" id={`group-${mainTitle}-${date}`}>
                                    {/* Unified Header for Split View */}
                                    <div className="px-6 py-4 flex items-center justify-between group/header border-[3px] border-[#2D3436] rounded-3xl bg-white shadow-[6px_6px_0px_#2D3436] mb-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-4 h-12 bg-[#FFE27D] rounded-full border-[3px] border-[#2D3436] flex items-center justify-center shadow-[4px_4px_0px_#2D3436]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-white border border-[#2D3436]"></div>
                                            </div>
                                            <div className="flex flex-col -space-y-1 min-w-max">
                                                <h3 className="text-[10px] font-black text-[#2D3436] uppercase tracking-[0.2em] opacity-60 whitespace-nowrap uppercase">
                                                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short' }).replace(',', '')}
                                                </h3>
                                                <span className="text-2xl font-black text-[#2D3436] tracking-tighter whitespace-nowrap">
                                                    {new Date(date).getDate()}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopyScreenshot(mainTitle, date)}
                                            className="bg-[#D1E8FF] border-2 border-[#2D3436] p-2 rounded-xl opacity-0 group-hover/header:opacity-100 transition-opacity hover:translate-y-[-2px]"
                                            title="Copy screenshot to clipboard"
                                        >
                                            <Copy size={16} className="text-[#2D3436]" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Unfinished Column */}
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3 px-4 mb-2">
                                                <div className="w-10 h-10 rounded-xl bg-[#D4F3F5] border-[2.5px] border-[#2D3436] flex items-center justify-center rotate-[-3deg] shadow-[3px_3px_0px_#2D3436]">
                                                    <span className="text-lg">💡</span>
                                                </div>
                                                <h4 className="text-sm font-black text-[#2D3436] uppercase tracking-widest">In Progress ({unfinishedItems.length})</h4>
                                            </div>
                                            <TodoGroup
                                                title="Unfinished"
                                                date={date}
                                                items={unfinishedItems}
                                                onUpdate={() => fetchTodos()}
                                                hideHeader={true}
                                                showTimestamp={showTimestamp}
                                            />
                                        </div>

                                        {/* Completed Column */}
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3 px-4 mb-2">
                                                <div className="w-10 h-10 rounded-xl bg-[#FFE27D] border-[2.5px] border-[#2D3436] flex items-center justify-center rotate-[3deg] shadow-[3px_3px_0px_#2D3436]">
                                                    <span className="text-lg">💰</span>
                                                </div>
                                                <h4 className="text-sm font-black text-[#2D3436] uppercase tracking-widest">Completed ({completedItems.length})</h4>
                                            </div>
                                            <TodoGroup
                                                title="Completed"
                                                date={date}
                                                items={completedItems}
                                                onUpdate={() => fetchTodos()}
                                                hideHeader={true}
                                                showTimestamp={showTimestamp}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </DndContext>
            </div>
        </div>
    );
}
