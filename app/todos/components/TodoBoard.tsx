"use client";

import { useState, useEffect } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import TodoGroup from './TodoGroup';
import TodoFilters from './TodoFilters';
import { Loader2, LayoutList, Columns, Copy, Clock } from 'lucide-react';
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
        const element = document.getElementById(`group-${mainTitle}-${date}`);
        if (!element) return;
        // get background color of the element
        const backgroundColor = localStorage.getItem('theme') === 'dark' ? '#0a0a0a' : '#ffffff';
        try {
            const blob = await toBlob(element, {
                cacheBust: true,
                backgroundColor: backgroundColor,
                fontEmbedCSS: '', // Skip font embedding to avoid "font is undefined" error
                filter: (node) => {
                    // Exclude the copy button from the screenshot
                    if (node.tagName === 'BUTTON' && node.getAttribute('title') === 'Copy screenshot to clipboard') {
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
        return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;
    }

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto">

            {/* Input Section - Matches design */}
            <div className="relative">
                <form onSubmit={handleAddTodo} className="flex bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-orange-500/50 transition-shadow duration-300 ease-in-out">
                    <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Add your task"
                        className="flex-1 bg-transparent px-8 py-4 text-gray-800 dark:text-gray-100 outline-none placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-colors duration-200"
                    />
                    <button
                        type="submit"
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 py-4 transition-colors duration-200 ease-out uppercase tracking-wide text-sm"
                    >
                        Add
                    </button>
                </form>
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
                {/* Hide status filters in split mode as it shows both */}
                {viewMode === 'list' && (
                    <TodoFilters
                        current={filter}
                        onChange={setFilter}
                        selectedDate={selectedDate}
                        onDateChange={setSelectedDate}
                    />
                )}

                {viewMode === 'split' && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 w-full sm:w-auto transition-colors duration-200">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Filter</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 p-0"
                        />
                        {selectedDate && (
                            <button onClick={() => setSelectedDate('')} className="text-red-500 hover:text-red-600 transition-colors duration-200 text-xs">Clear</button>
                        )}
                    </div>
                )}

                {/* View Toggle */}
                <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setShowTimestamp(!showTimestamp)}
                        className={`p-2 rounded-lg transition-colors duration-200 ${showTimestamp ? 'bg-white dark:bg-gray-600 text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Toggle Timestamp"
                    >
                        <Clock size={20} />
                    </button>
                    <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1 self-stretch"></div>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-colors duration-200 ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="List View"
                    >
                        <LayoutList size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('split')}
                        className={`p-2 rounded-lg transition-colors duration-200 ${viewMode === 'split' ? 'bg-white dark:bg-gray-600 text-orange-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
                        title="Split View"
                    >
                        <Columns size={20} />
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
                                <div key={key} className="flex flex-col gap-4 p-4" id={`group-${mainTitle}-${date}`}>
                                    {/* Unified Header for Split View */}
                                    <div className="px-2 pt-4 pb-1 flex items-center justify-between group/header border-b border-gray-200 dark:border-gray-700">
                                        <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest pb-2">{displayDate}</h3>
                                        <button
                                            onClick={() => handleCopyScreenshot(mainTitle, date)}
                                            className="text-gray-400 hover:text-orange-500 dark:text-gray-500 dark:hover:text-orange-400 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200 p-1"
                                            title="Copy screenshot to clipboard"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Unfinished Column */}
                                        <div className="flex flex-col gap-2">
                                            <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wider px-2">In Progress ({unfinishedItems.length})</h4>
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
                                        <div className="flex flex-col gap-2">
                                            <h4 className="text-xs font-bold text-green-500 uppercase tracking-wider px-2">Completed ({completedItems.length})</h4>
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
