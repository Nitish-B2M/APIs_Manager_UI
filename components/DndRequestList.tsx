'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Endpoint, HttpMethod } from '@/types';
import { useTheme } from '@/context/ThemeContext';

interface SortableRequestItemProps {
    request: Endpoint;
    index: number;
    isSelected: boolean;
    canEdit: boolean;
    onSelect: () => void;
    renderActions?: () => React.ReactNode;
}

const getMethodColor = (method: HttpMethod): string => {
    switch (method) {
        case 'GET': return 'bg-green-600/20 text-green-500';
        case 'POST': return 'bg-blue-600/20 text-blue-500';
        case 'PUT': return 'bg-yellow-600/20 text-yellow-600';
        case 'DELETE': return 'bg-red-600/20 text-red-500';
        case 'PATCH': return 'bg-purple-600/20 text-purple-500';
        default: return 'bg-gray-700 text-gray-400';
    }
};

export function SortableRequestItem({
    request,
    index,
    isSelected,
    canEdit,
    onSelect,
    renderActions,
}: SortableRequestItemProps) {
    const { theme } = useTheme();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: request.id || `temp-${index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            className={`group flex items-center justify-between p-2.5 cursor-pointer border-l-2 transition-all relative ${isSelected
                ? theme === 'dark'
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-inner'
                    : 'bg-indigo-50 border-indigo-500'
                : `border-transparent ${hoverBg}`
                } ${isDragging ? 'ring-2 ring-indigo-500 shadow-lg z-50' : ''}`}
        >
            <div className="flex items-center gap-2 overflow-hidden flex-1">
                {canEdit && (
                    <button
                        {...attributes}
                        {...listeners}
                        className={`cursor-grab active:cursor-grabbing flex-shrink-0 ${theme === 'dark'
                            ? 'text-gray-600 group-hover:text-gray-400'
                            : 'text-gray-300 group-hover:text-gray-500'
                            }`}
                    >
                        <GripVertical size={12} />
                    </button>
                )}
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${getMethodColor(request.method)}`}>
                    {request.method}
                </span>
                <span className={`truncate text-[11px] ${isSelected
                    ? `font-bold ${textColor}`
                    : `${subTextColor} group-hover:${textColor}`
                    }`}>
                    {request.name || 'Untitled'}
                </span>
            </div>

            {renderActions && (
                <div className="flex items-center gap-1">
                    {renderActions()}
                </div>
            )}
        </div>
    );
}

interface DndRequestListProps {
    requests: Endpoint[];
    selectedIdx: number;
    canEdit: boolean;
    onSelect: (idx: number) => void;
    onReorder: (oldIndex: number, newIndex: number) => void;
    renderActions?: (request: Endpoint, idx: number) => React.ReactNode;
}

export function DndRequestList({
    requests,
    selectedIdx,
    canEdit,
    onSelect,
    onReorder,
    renderActions,
}: DndRequestListProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px of movement required before drag starts
            },
        })
    );

    const requestIds = useMemo(() =>
        requests.map((r, i) => r.id || `temp-${i}`),
        [requests]
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = requestIds.indexOf(active.id as string);
            const newIndex = requestIds.indexOf(over.id as string);
            onReorder(oldIndex, newIndex);
        }
    };

    const activeRequest = activeId
        ? requests.find((r, i) => (r.id || `temp-${i}`) === activeId)
        : null;
    const activeIndex = activeId
        ? requests.findIndex((r, i) => (r.id || `temp-${i}`) === activeId)
        : -1;

    if (!canEdit) {
        // Simple list without DnD when not editable
        return (
            <div>
                {requests.map((request, idx) => (
                    <SortableRequestItem
                        key={request.id || idx}
                        request={request}
                        index={idx}
                        isSelected={selectedIdx === idx}
                        canEdit={false}
                        onSelect={() => onSelect(idx)}
                        renderActions={renderActions ? () => renderActions(request, idx) : undefined}
                    />
                ))}
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={requestIds} strategy={verticalListSortingStrategy}>
                {requests.map((request, idx) => (
                    <SortableRequestItem
                        key={request.id || idx}
                        request={request}
                        index={idx}
                        isSelected={selectedIdx === idx}
                        canEdit={canEdit}
                        onSelect={() => onSelect(idx)}
                        renderActions={renderActions ? () => renderActions(request, idx) : undefined}
                    />
                ))}
            </SortableContext>

            <DragOverlay>
                {activeRequest && (
                    <div className="opacity-80">
                        <SortableRequestItem
                            request={activeRequest}
                            index={activeIndex}
                            isSelected={selectedIdx === activeIndex}
                            canEdit={false}
                            onSelect={() => { }}
                        />
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}

// Helper to persist reordering
export function useRequestReorder(
    requests: Endpoint[],
    setRequests: (requests: Endpoint[]) => void,
    selectedIdx: number,
    setSelectedIdx: (idx: number) => void,
    onOrderChange?: (requests: Endpoint[]) => void
) {
    const handleReorder = useCallback((oldIndex: number, newIndex: number) => {
        const newRequests = arrayMove(requests, oldIndex, newIndex);
        setRequests(newRequests);

        // Update selected index to follow the moved item
        if (selectedIdx === oldIndex) {
            setSelectedIdx(newIndex);
        } else if (oldIndex < selectedIdx && newIndex >= selectedIdx) {
            setSelectedIdx(selectedIdx - 1);
        } else if (oldIndex > selectedIdx && newIndex <= selectedIdx) {
            setSelectedIdx(selectedIdx + 1);
        }

        onOrderChange?.(newRequests);
    }, [requests, setRequests, selectedIdx, setSelectedIdx, onOrderChange]);

    return { handleReorder };
}
