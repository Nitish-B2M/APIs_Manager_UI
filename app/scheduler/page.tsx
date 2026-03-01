'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Settings, RefreshCw, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { api } from '@/utils/api';
import { useTheme } from '@/context/ThemeContext';
import { getThemeClasses } from '@/app/docs/[id]/utils/theme';
import { SchedulerSidebar } from '@/app/components/SchedulerSidebar';
import { SchedulerCalendar } from '@/app/components/SchedulerCalendar';
import { AddTaskModal } from '@/app/components/AddTaskModal';
import { AddHabitModal } from '@/app/components/AddHabitModal';
import { TaskDetailModal } from '@/app/components/TaskDetailModal';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { DemoOverlay } from '@/app/components/DemoOverlay';

export default function SchedulerPage() {
    const { isLoggedIn } = useAuth();
    const { theme } = useTheme() as { theme: 'light' | 'dark' };
    const themeClasses = getThemeClasses(theme);

    const [tasks, setTasks] = useState<any[]>([]);
    const [habits, setHabits] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isAddHabitModalOpen, setIsAddHabitModalOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [taskInitialData, setTaskInitialData] = useState<any>(null);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [activeDateRange, setActiveDateRange] = useState<{ start: Date, end: Date, view: string } | null>(null);
    const activeDateRangeRef = React.useRef(activeDateRange);

    useEffect(() => {
        activeDateRangeRef.current = activeDateRange;
    }, [activeDateRange]);

    const fetchData = async (rangeOverride?: { start: Date, end: Date }) => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const rangeToFetch = rangeOverride || activeDateRangeRef.current || {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            };

            const [tasksRes, habitsRes, eventsRes] = await Promise.all([
                api.scheduler.getTasks(),
                api.scheduler.getHabits(),
                api.scheduler.getEvents(
                    rangeToFetch.start.toISOString(),
                    rangeToFetch.end.toISOString()
                )
            ]);

            setTasks(tasksRes.data || []);
            setHabits(habitsRes.data || []);
            setEvents((eventsRes.data || []).map((e: any) => ({
                id: e.id,
                title: e.title,
                start: e.start_time,
                end: e.end_time,
                extendedProps: {
                    priority: e.metadata?.priority || e.priority || 3,
                    description: e.metadata?.description || e.description,
                    source: e.source
                }
            })));
        } catch (error: any) {
            toast.error('Failed to load scheduler data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch handled either by this or the activeDateRange effect below
        if (!activeDateRangeRef.current) {
            fetchData();
        }

        // Set up an interval to refresh data every minute to keep the calendar up to date
        const interval = setInterval(() => fetchData(activeDateRangeRef.current || undefined), 60000);
        return () => clearInterval(interval);
    }, []);

    // Refetch when the calendar view changes
    useEffect(() => {
        if (activeDateRange) {
            fetchData(activeDateRange);
        }
    }, [activeDateRange]);

    const handleOptimize = async () => {
        try {
            await toast.promise(
                api.scheduler.optimize(),
                {
                    loading: 'AI is optimizing your schedule...',
                    success: (res) => res.message || 'Schedule optimized successfully!',
                    error: (err) => err.message || 'Optimization failed'
                }
            );
            fetchData();
        } catch (error) {
            console.error('Optimization error:', error);
        }
    };

    const handleSelectRange = (data: { start: Date; end: Date; duration: number }) => {
        // Convert dates to string format for datetime-local input (YYYY-MM-DDThh:mm)
        const formatForInput = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setTaskInitialData({
            deadline: formatForInput(data.end),
            scheduled_start: formatForInput(data.start),
            scheduled_end: formatForInput(data.end),
            duration_minutes: data.duration,
            title: ''
        });
        setIsAddTaskModalOpen(true);
    };

    // Resizing logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX;
            if (newWidth > 200 && newWidth < 600) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    return (
        <div className={`flex flex-col h-[calc(100vh-65px)] relative overflow-hidden ${themeClasses.mainBg} ${themeClasses.textColor}`}>
            {!isLoggedIn && (
                <DemoOverlay
                    title="Time Sync"
                    description="Visualize your day with intelligent time-blocking and seamless scheduling."
                />
            )}

            <div className={`transition-all duration-300 w-full h-full flex flex-col ${!isLoggedIn ? 'blur-md pointer-events-none opacity-50' : ''}`}>
                {/* Header */}
                <header className={`flex items-center justify-between px-6 py-4 border-b ${themeClasses.borderCol} ${themeClasses.secondaryBg}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <CalendarIcon className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">AntiGravity Scheduler</h1>
                            <p className={`text-xs ${themeClasses.subTextColor}`}>AI-Powered Priority Scheduling</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleOptimize}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
                        >
                            <RefreshCw size={16} />
                            Optimize Schedule
                        </button>
                        <button
                            onClick={() => setIsAddTaskModalOpen(true)}
                            className={`p-2 rounded-lg border ${themeClasses.borderCol} ${themeClasses.hoverBg} transition-colors`}
                        >
                            <Plus size={20} />
                        </button>
                        <button
                            title="Configure Working Hours & Buffers (Coming Soon)"
                            className={`p-2 rounded-lg border ${themeClasses.borderCol} ${themeClasses.hoverBg} transition-colors group relative`}
                        >
                            <Settings size={20} />
                            <span className="absolute -bottom-10 right-0 w-48 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                Configure Working Hours & Buffers
                            </span>
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex flex-1 overflow-hidden relative">
                    {/* Sidebar */}
                    <div
                        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
                        className={`border-r ${themeClasses.borderCol} flex flex-col ${themeClasses.secondaryBg} ${isResizing ? '' : 'transition-[width] duration-300 ease-in-out'} relative group overflow-hidden z-20`}
                    >
                        <SchedulerSidebar
                            tasks={tasks}
                            habits={habits}
                            onRefresh={fetchData}
                            theme={theme}
                            onAddHabit={() => setIsAddHabitModalOpen(true)}
                            activeDateRange={activeDateRange}
                        />
                    </div>

                    {/* Resize Handle */}
                    {!isSidebarCollapsed && (
                        <div
                            onMouseDown={() => setIsResizing(true)}
                            className={`absolute top-0 bottom-0 z-50 w-1.5 cursor-col-resize hover:bg-indigo-500/30 transition-colors flex items-center justify-center group/resize`}
                            style={{ left: sidebarWidth - 3 }}
                        >
                            <div className={`opacity-0 group-hover/resize:opacity-100 p-0.5 bg-indigo-500 rounded-full text-white shadow-lg pointer-events-none transform -translate-y-1/2`}>
                                <GripVertical size={12} />
                            </div>
                        </div>
                    )}

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className={`absolute z-50 top-1/2 -translate-y-1/2 p-1.5 rounded-full border ${themeClasses.borderCol} ${themeClasses.secondaryBg} ${themeClasses.hoverBg} shadow-[0_0_15px_rgba(0,0,0,0.2)] transition-all transform hover:scale-110 active:scale-95`}
                        style={{ left: isSidebarCollapsed ? 0 : sidebarWidth - 12 }}
                    >
                        {isSidebarCollapsed ? <ChevronRight size={14} className="text-indigo-500" /> : <ChevronLeft size={14} className="text-indigo-500" />}
                    </button>

                    {/* Calendar View */}
                    <div className="flex-1 p-6 overflow-auto">
                        <SchedulerCalendar
                            events={events}
                            theme={theme}
                            onEventChange={(updatedEvents: any[]) => setEvents(updatedEvents)}
                            onSelectRange={handleSelectRange}
                            onEventClick={(eventId) => setSelectedTaskId(eventId)}
                            onDatesSet={(data) => setActiveDateRange(data)}
                        />
                    </div>
                </main>

                <AddTaskModal
                    isOpen={isAddTaskModalOpen}
                    onClose={() => {
                        setIsAddTaskModalOpen(false);
                        setTaskInitialData(null);
                    }}
                    onSuccess={fetchData}
                    initialData={taskInitialData}
                />

                <AddHabitModal
                    isOpen={isAddHabitModalOpen}
                    onClose={() => setIsAddHabitModalOpen(false)}
                    onSuccess={fetchData}
                />

                <TaskDetailModal
                    isOpen={!!selectedTaskId}
                    onClose={() => setSelectedTaskId(null)}
                    onSuccess={fetchData}
                    taskId={selectedTaskId}
                />
            </div>
        </div>
    );
}
