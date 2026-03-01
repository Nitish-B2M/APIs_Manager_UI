'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface SchedulerCalendarProps {
    events: any[];
    theme: string;
    onEventChange: (events: any[]) => void;
    onSelectRange?: (data: { start: Date; end: Date; duration: number }) => void;
    onEventClick?: (eventId: string) => void;
    onDatesSet?: (data: { start: Date; end: Date; view: string }) => void;
}

export function SchedulerCalendar({ events, theme, onEventChange, onSelectRange, onEventClick, onDatesSet }: SchedulerCalendarProps) {
    const isDark = theme === 'dark';
    const [selection, setSelection] = useState<{ start: Date; end: Date; pos: { x: number; y: number } } | null>(null);

    const handleEventDrop = (info: any) => {
        const { event } = info;
        const index = events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            const updatedEvents = [...events];
            updatedEvents[index] = {
                ...updatedEvents[index],
                start: event.start,
                end: event.end
            };
            onEventChange(updatedEvents);
        }
    };

    const handleEventResize = (info: any) => {
        const { event } = info;
        const index = events.findIndex(e => e.id === event.id);
        if (index !== -1) {
            const updatedEvents = [...events];
            updatedEvents[index] = {
                ...updatedEvents[index],
                start: event.start,
                end: event.end
            };
            onEventChange(updatedEvents);
        }
    };

    const handleSelect = (info: any) => {
        setSelection({
            start: info.start,
            end: info.end,
            pos: { x: info.jsEvent.clientX, y: info.jsEvent.clientY }
        });
    };

    const handleCreateTask = () => {
        if (selection && onSelectRange) {
            const diffMs = selection.end.getTime() - selection.start.getTime();
            const duration = Math.round(diffMs / (1000 * 60));
            onSelectRange({
                start: selection.start,
                end: selection.end,
                duration
            });
            setSelection(null);
        }
    };

    // Close floating button on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking on the floating button or within the draggable calendar selection area
            if (target.closest('.floating-create-btn')) return;
            if (target.closest('.fc-timegrid-col-events')) return; // Check if clicking an event or selection

            // If we're starting a new drag on the calendar, the select event will eventually trigger setSelection
            // So we can clear the old one.
            setSelection(null);
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getBusyDays = () => {
        const counts: Record<string, number> = {};

        const eventPerDay: Record<string, any[]> = {};

        events.forEach(event => {
            const date = new Date(event.start).toDateString();
            counts[date] = (counts[date] || 0) + 1;
            if (eventPerDay[date]) {
                eventPerDay[date].push(event);
            } else {
                eventPerDay[date] = [event];
            }
        });

        const width = Object.keys(eventPerDay).reduce((acc, date) => {
            return acc + eventPerDay[date].length * 10;
        }, 0) || 0;
        console.log(eventPerDay, width);

        if (width > 0) {
            document.getElementById('adjust-width')?.style.setProperty('width', `calc(100% + ${width}px)`);
        }

        return Object.keys(counts).filter(date => counts[date] > 2);
    };

    return (
        <div className="relative h-full overflow-hidden">
            <div className={`h-full rounded-2xl border ${isDark ? 'border-gray-800 bg-[#0d1117]' : 'border-gray-200 bg-white'} shadow-2xl flex flex-col`}>
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    <div className="h-full p-4" id="adjust-width">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            events={events}
                            editable={true}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            weekends={true}
                            nowIndicator={true}
                            eventDrop={handleEventDrop}
                            eventResize={handleEventResize}
                            select={handleSelect}
                            height="100%"
                            slotMinTime="00:00:00"
                            slotMaxTime="22:00:00"
                            allDaySlot={false}
                            slotEventOverlap={false}
                            themeSystem="standard"
                            datesSet={(arg) => {
                                if (onDatesSet) {
                                    onDatesSet({
                                        start: arg.start,
                                        end: arg.end,
                                        view: arg.view.type
                                    });
                                }
                            }}
                            eventClick={(info) => {
                                if (onEventClick) {
                                    onEventClick(info.event.id);
                                }
                            }}
                            eventClassNames={(arg) => {
                                const priority = arg.event.extendedProps.priority || 3;
                                const source = arg.event.extendedProps.source;
                                const colors = {
                                    1: '!bg-red-500/20 !border-red-500 !text-red-900 dark:!text-red-100 border',
                                    2: '!bg-orange-500/20 !border-orange-500 !text-orange-900 dark:!text-orange-100 border',
                                    3: '!bg-blue-500/20 !border-blue-500 !text-blue-900 dark:!text-blue-100 border',
                                    4: '!bg-gray-500/20 !border-gray-500 !text-gray-900 dark:!text-gray-100 border'
                                };
                                return [
                                    'text-xs font-medium rounded-lg px-2 py-1 transition-all hover:scale-[1.02] backdrop-blur-md shadow-sm',
                                    (colors as any)[priority] || colors[3],
                                    source === 'task' ? 'border-dashed' : 'border-solid'
                                ];
                            }}
                            dayCellClassNames={(arg) => {
                                const dateStr = arg.date.toDateString();
                                if (getBusyDays().includes(dateStr)) {
                                    return ['busy-day-column'];
                                }
                                return [];
                            }}
                        />
                    </div>
                </div>

                <style jsx global>{`
                    .fc {
                        --fc-border-color: ${isDark ? '#1f2937' : '#e5e7eb'};
                        --fc-daygrid-event-dot-width: 8px;
                        --fc-page-bg-color: transparent;
                        --fc-neutral-bg-color: ${isDark ? '#111827' : '#f9fafb'};
                        --fc-list-event-hover-bg-color: ${isDark ? '#1f2937' : '#f3f4f6'};
                        --fc-today-bg-color: ${isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.03)'};
                        font-family: inherit;
                        height: 100%;
                    }
                    .fc-col-header-cell {
                        padding: 12px 0 !important;
                        font-weight: 700 !important;
                        font-size: 11px !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.05em;
                    }
                    .fc-header-toolbar {
                        padding: 1rem !important;
                        margin-bottom: 0 !important;
                    }
                    .fc-toolbar-title {
                        font-size: 1.125rem !important;
                        font-weight: 700 !important;
                    }
                    .fc-button {
                        background: ${isDark ? '#1f2937' : '#ffffff'} !important;
                        border: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
                        color: ${isDark ? '#d1d5db' : '#374151'} !important;
                        text-transform: capitalize !important;
                        font-size: 0.8125rem !important;
                        font-weight: 500 !important;
                        box-shadow: none !important;
                    }
                    .fc-button-primary:not(:disabled).fc-button-active {
                        background: #4f46e5 !important;
                        border-color: #4f46e5 !important;
                        color: white !important;
                    }
                    .fc-timegrid-slot {
                        height: 48px !important;
                    }
                    .fc-timegrid-axis-cbox {
                        font-size: 10px;
                        color: #9ca3af;
                    }
                    .fc-col-header-cell.busy-day-column,
                    .fc-timegrid-col.busy-day-column {
                        min-width: 220px !important;
                        width: 320px !important;
                        flex: 0 0 220px !important;
                    }
                    .fc-col-header table,
                    .fc-timegrid-cols table {
                        table-layout: auto !important;
                    }
                `}</style>
                {selection && (
                    <div
                        className="fixed z-[100] animate-in fade-in zoom-in duration-200"
                        style={{ left: selection.pos.x, top: selection.pos.y }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={handleCreateTask}
                            className="floating-create-btn flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl shadow-indigo-600/40 border border-white/20 whitespace-nowrap font-bold text-sm transform -translate-x-1/2 -translate-y-full mb-4"
                        >
                            <Plus size={16} />
                            Create Task
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
