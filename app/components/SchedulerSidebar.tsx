'use client';

import React, { useState } from 'react';
import { ListCheck, Star, Clock, Zap, Flame, RefreshCw, Info, Plus, ChevronDown, ChevronRight, CalendarDays, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { getThemeClasses } from '@/app/docs/[id]/utils/theme';

interface SchedulerSidebarProps {
    tasks: any[];
    habits: any[];
    onRefresh: () => void;
    theme: 'light' | 'dark';
    onAddHabit?: () => void;
    activeDateRange?: { start: Date; end: Date; view: string } | null;
}

export function SchedulerSidebar({ tasks, habits, onRefresh, theme, onAddHabit, activeDateRange }: SchedulerSidebarProps) {
    const themeClasses = getThemeClasses(theme);

    const PriorityIcon = ({ priority }: { priority: number }) => {
        switch (priority) {
            case 1: return <Flame size={14} className="text-red-500" />;
            case 2: return <Star size={14} className="text-orange-500" fill="currentColor" />;
            case 3: return <Clock size={14} className="text-blue-500" />;
            default: return <Zap size={14} className="text-gray-500" />;
        }
    };

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        'Today': true
    });

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const unscheduledTasks = tasks.filter(t => !t.scheduled_start);
    const scheduledTasks = tasks.filter(t => t.scheduled_start);

    const groupedTasks = scheduledTasks.reduce((acc, task) => {
        const key = new Date(task.scheduled_start).toDateString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {} as Record<string, typeof tasks>);

    const sortedDateKeys = Object.keys(groupedTasks).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const getPaginationWindow = () => {
        if (activeDateRange) {
            return {
                start: activeDateRange.start,
                end: new Date(activeDateRange.end.getTime() - 1)
            };
        }

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    };

    const { start: windowStart, end: windowEnd } = getPaginationWindow();

    const paginatedDateKeys = sortedDateKeys.filter(dateStr => {
        const d = new Date(dateStr);
        return d >= windowStart && d <= windowEnd;
    });

    const getWindowLabel = () => {
        if (!activeDateRange) return 'Loading...';

        switch (activeDateRange.view) {
            case 'timeGridDay':
                return 'This Day';
            case 'timeGridWeek':
                return 'This Week';
            case 'dayGridMonth':
                return 'This Month';
            default:
                return `${windowStart.toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${windowEnd.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
        }
    };

    const formatDisplayDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const AccordionHeader = ({ title, count, sectionKey, icon: Icon, customColorClass }: any) => {
        const isOpen = openSections[sectionKey] || false;
        return (
            <div
                className="flex items-center justify-between mb-2 px-1 cursor-pointer group hover:opacity-80 transition-opacity"
                onClick={() => toggleSection(sectionKey)}
            >
                <h2 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${customColorClass || 'text-indigo-400'}`}>
                    {Icon && <Icon size={14} />} {title}
                </h2>
                <div className="flex items-center gap-2">
                    {count !== undefined && (
                        <span className={`text-[10px] ${customColorClass ? 'bg-gray-500/10 text-gray-400' : 'bg-indigo-500/10 text-indigo-400'} px-1.5 py-0.5 rounded-full font-bold`}>
                            {count}
                        </span>
                    )}
                    {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Unscheduled Tasks Accordion */}
                <div className="border-b border-transparent pb-2">
                    <AccordionHeader
                        title="Unscheduled"
                        count={unscheduledTasks.length}
                        sectionKey="Unscheduled"
                        icon={ListCheck}
                        customColorClass="text-gray-400"
                    />
                    {openSections['Unscheduled'] && (
                        <div className="space-y-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                            {unscheduledTasks.length === 0 ? (
                                <div className={`p-4 rounded-xl border border-dashed ${themeClasses.borderCol} text-center`}>
                                    <p className={`text-[11px] ${themeClasses.subTextColor}`}>No pending tasks. Great job!</p>
                                </div>
                            ) : (
                                unscheduledTasks.map((task: any) => (
                                    <div
                                        key={task.id}
                                        className={`p-3 rounded-xl border ${themeClasses.borderCol} ${themeClasses.hoverBg} group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold truncate group-hover:text-indigo-400 transition-colors">
                                                    {task.title}
                                                </h4>
                                                <p className={`text-[10px] ${themeClasses.subTextColor} mt-1 line-clamp-1`}>
                                                    {task.duration_minutes}m • {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <PriorityIcon priority={task.priority} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Scheduled Tasks Accordions (Grouped by Day, Paginated) */}
                {paginatedDateKeys.length === 0 && scheduledTasks.length > 0 && (
                    <div className={`p-4 rounded-xl border border-dashed ${themeClasses.borderCol} text-center`}>
                        <p className={`text-[11px] ${themeClasses.subTextColor}`}>No tasks scheduled for this period.</p>
                    </div>
                )}

                {paginatedDateKeys.map(dateKey => {
                    const displayTitle = formatDisplayDate(dateKey);
                    // Use the display title as the section key so 'Today' matches our default open state
                    const isOpen = openSections[displayTitle] || false;
                    const dayTasks = groupedTasks[dateKey];

                    return (
                        <div key={dateKey} className="border-b border-transparent pb-2">
                            <AccordionHeader
                                title={displayTitle}
                                count={dayTasks.length}
                                sectionKey={displayTitle}
                                icon={displayTitle === 'Today' ? Zap : CalendarDays}
                            />
                            {isOpen && (
                                <div className="space-y-2 mt-2 opacity-90 animate-in slide-in-from-top-2 duration-200">
                                    {dayTasks.map((task: any) => (
                                        <div
                                            key={task.id}
                                            className={`p-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 ${themeClasses.hoverBg} group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-semibold truncate text-indigo-200">
                                                        {task.title}
                                                    </h4>
                                                    <p className={`text-[9px] text-indigo-400/70 mt-1`}>
                                                        {new Date(task.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(task.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                <PriorityIcon priority={task.priority} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-2 pb-4 px-1">
                    <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase text-center w-full">
                        Showing: <span className="text-indigo-400">{getWindowLabel()}</span>
                    </span>
                </div>

                {/* Habits Section (Now Accordion) */}
                <div className="pt-2 border-t border-dashed border-gray-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <AccordionHeader
                                title="Habits"
                                count={habits.length}
                                sectionKey="Habits"
                                icon={RefreshCw}
                                customColorClass="text-emerald-500"
                            />
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onAddHabit) onAddHabit();
                            }}
                            className={`p-1 rounded-md hover:bg-emerald-500/10 text-emerald-500 transition-colors ml-2 mb-2 relative z-10`}
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {openSections['Habits'] && (
                        <div className="space-y-2 mt-2 animate-in slide-in-from-top-2 duration-200">
                            {habits.length === 0 ? (
                                <div className={`p-4 rounded-xl border border-dashed ${themeClasses.borderCol} text-center`}>
                                    <p className={`text-[11px] ${themeClasses.subTextColor}`}>No habits defined yet.</p>
                                </div>
                            ) : (
                                habits.map((habit) => (
                                    <div
                                        key={habit.id}
                                        className={`p-3 rounded-xl border ${themeClasses.borderCol} bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group cursor-pointer hover:scale-[1.02] active:scale-[0.98]`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <h4 className="text-xs font-bold truncate">{habit.title}</h4>
                                            </div>
                                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                                                {habit.frequency}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className={`text-[9px] ${themeClasses.subTextColor}`}>
                                                {habit.duration_minutes}m • {habit.preferred_window}
                                            </p>
                                            <PriorityIcon priority={habit.priority} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Info / Tip */}
            <div className={`p-4 mt-auto border-t ${themeClasses.borderCol} bg-indigo-500/5`}>
                <div className="flex gap-2">
                    <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-gray-500 leading-relaxed italic">
                        AntiGravity uses AI to find the best gaps in your calendar for these items. Items marked as <span className="text-indigo-400 font-bold">Planned</span> are tentative until focused.
                    </p>
                </div>
            </div>
        </div>
    );
}
