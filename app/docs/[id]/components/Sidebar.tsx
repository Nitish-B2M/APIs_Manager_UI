'use client';

import React, { memo } from 'react';
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Save, 
    Share2, 
    Download, 
    Settings, 
    Copy, 
    MoreVertical, 
    GripVertical, 
    Trash2,
    Terminal,
    Code
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Endpoint, HttpMethod, Documentation } from '@/types';

interface SidebarProps {
    doc: Documentation;
    endpoints: Endpoint[];
    selectedIdx: number;
    isCollapsed: boolean;
    width: number;
    isDirty: boolean;
    canEdit: boolean;
    openMenuIdx: number | null;
    draggedIdx: number | null;
    onSelectEndpoint: (idx: number) => void;
    onToggleCollapse: () => void;
    onAddRequest: () => void;
    onSaveCollection: () => void;
    onShare: () => void;
    onDownloadMarkdown: () => void;
    onOpenEnvModal: () => void;
    onCopyMarkdown: (ep: Endpoint) => void;
    onCopyAsCurl: (ep: Endpoint) => void;
    onCopyAsFetch: (ep: Endpoint) => void;
    onCopyUrl: (ep: Endpoint) => void;
    onDuplicate: (idx: number, e: React.MouseEvent) => void;
    onDelete: (idx: number, e: React.MouseEvent) => void;
    onMenuToggle: (idx: number | null) => void;
    onDragStart: (idx: number) => void;
    onDragOver: (e: React.DragEvent, idx: number) => void;
    onDragEnd: () => void;
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

function SidebarComponent({
    doc,
    endpoints,
    selectedIdx,
    isCollapsed,
    width,
    isDirty,
    canEdit,
    openMenuIdx,
    draggedIdx,
    onSelectEndpoint,
    onToggleCollapse,
    onAddRequest,
    onSaveCollection,
    onShare,
    onDownloadMarkdown,
    onOpenEnvModal,
    onCopyMarkdown,
    onCopyAsCurl,
    onCopyAsFetch,
    onCopyUrl,
    onDuplicate,
    onDelete,
    onMenuToggle,
    onDragStart,
    onDragOver,
    onDragEnd,
}: SidebarProps) {
    const { theme } = useTheme();

    const secondaryBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    return (
        <div
            className={`${secondaryBg} border-r ${borderCol} flex flex-col transition-all duration-200 shadow-xl z-20 ${isCollapsed ? 'w-12' : ''}`}
            style={{ width: isCollapsed ? '48px' : `${width}px` }}
        >
            {/* Header */}
            <div className={`p-3 border-b ${borderCol} flex flex-col gap-2 ${secondaryBg} min-h-[60px]`}>
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <h2 className={`font-bold ${textColor} truncate text-sm`} title={doc.title}>
                            {doc.title}
                        </h2>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                        <button 
                            onClick={onToggleCollapse} 
                            className={`p-1 rounded ${subTextColor} hover:bg-opacity-10 hover:bg-gray-400`}
                            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        </button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {canEdit && (
                            <button
                                onClick={onAddRequest}
                                className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${
                                    theme === 'dark' 
                                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30' 
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                }`}
                                title="Add New Request (Ctrl+N)"
                            >
                                <Plus size={14} /> <span className="font-bold">NEW</span>
                            </button>
                        )}
                        {canEdit && (
                            <>
                                <button 
                                    onClick={onSaveCollection} 
                                    className="p-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded flex-1 flex items-center justify-center gap-1 transition-all relative border border-green-600/30" 
                                    title="Save Collection (Ctrl+S)"
                                >
                                    <Save size={14} /> 
                                    {isDirty && (
                                        <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-800 animate-pulse" />
                                    )}
                                </button>
                                <button 
                                    onClick={onShare} 
                                    className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${
                                        doc.isPublic 
                                            ? 'bg-indigo-600 text-white border-indigo-500' 
                                            : theme === 'dark' 
                                                ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' 
                                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                    }`} 
                                    title={doc.isPublic ? 'Make Private' : 'Make Public'}
                                >
                                    <Share2 size={14} />
                                </button>
                            </>
                        )}
                        <button 
                            onClick={onDownloadMarkdown} 
                            className={`p-1.5 ${
                                theme === 'dark' 
                                    ? 'bg-gray-700 text-gray-300 border-gray-600' 
                                    : 'bg-gray-100 text-gray-700 border-gray-300'
                            } hover:bg-opacity-80 rounded border flex-1 flex items-center justify-center gap-1 transition-all`} 
                            title="Download Markdown"
                        >
                            <Download size={14} /> MD
                        </button>
                        {canEdit && (
                            <button 
                                onClick={onOpenEnvModal} 
                                className={`p-1.5 ${
                                    theme === 'dark' 
                                        ? 'bg-gray-700 text-gray-300 border-gray-600' 
                                        : 'bg-gray-100 text-gray-700 border-gray-300'
                                } hover:bg-opacity-80 rounded border flex-1 flex items-center justify-center gap-1 transition-all`}
                                title="Environment Variables"
                            >
                                <Settings size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Endpoint List */}
            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto">
                    {endpoints.map((ep, idx) => (
                        <div
                            key={ep.id || idx}
                            onClick={() => onSelectEndpoint(idx)}
                            draggable={canEdit}
                            onDragStart={() => canEdit && onDragStart(idx)}
                            onDragOver={(e) => canEdit && onDragOver(e, idx)}
                            onDragEnd={() => canEdit && onDragEnd()}
                            className={`group flex items-center justify-between p-2.5 cursor-pointer border-l-2 transition-all relative ${
                                selectedIdx === idx 
                                    ? theme === 'dark' 
                                        ? 'bg-indigo-600/20 border-indigo-500 shadow-inner' 
                                        : 'bg-indigo-50 border-indigo-500' 
                                    : 'border-transparent hover:bg-opacity-10 hover:bg-gray-400'
                            } ${canEdit && draggedIdx === idx ? 'opacity-50 ring-1 ring-indigo-500 ring-inset shadow-inner' : ''}`}
                        >
                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                {canEdit && (
                                    <GripVertical 
                                        size={12} 
                                        className={`${
                                            theme === 'dark' 
                                                ? 'text-gray-600 group-hover:text-gray-400' 
                                                : 'text-gray-300 group-hover:text-gray-500'
                                        } cursor-grab active:cursor-grabbing flex-shrink-0`} 
                                    />
                                )}
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${getMethodColor(ep.method)}`}>
                                    {ep.method}
                                </span>
                                <span className={`truncate text-[11px] ${
                                    selectedIdx === idx 
                                        ? `font-bold ${textColor}` 
                                        : `${subTextColor} group-hover:${textColor}`
                                }`}>
                                    {ep.name || 'Untitled'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCopyMarkdown(ep); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-indigo-400 transition-all"
                                    title="Copy Request Markdown"
                                >
                                    <Copy size={12} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMenuToggle(openMenuIdx === idx ? null : idx);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-gray-200 transition-all"
                                >
                                    <MoreVertical size={14} />
                                </button>

                                {openMenuIdx === idx && (
                                    <div className={`absolute right-0 mt-1 w-40 ${secondaryBg} border ${borderCol} rounded-lg shadow-2xl z-50 py-1 text-[10px]`}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onCopyAsCurl(ep); onMenuToggle(null); }} 
                                            className={`w-full text-left px-3 py-1.5 hover:bg-opacity-10 hover:bg-gray-400 flex items-center gap-2 ${textColor}`}
                                        >
                                            <Terminal size={12} className="text-orange-500" /> Copy as cURL
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onCopyAsFetch(ep); onMenuToggle(null); }} 
                                            className={`w-full text-left px-3 py-1.5 hover:bg-opacity-10 hover:bg-gray-400 flex items-center gap-2 ${textColor}`}
                                        >
                                            <Code size={12} className="text-blue-500" /> Copy as Fetch
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onCopyUrl(ep); onMenuToggle(null); }} 
                                            className={`w-full text-left px-3 py-1.5 hover:bg-opacity-10 hover:bg-gray-400 flex items-center gap-2 ${textColor}`}
                                        >
                                            <Copy size={12} className="text-green-500" /> Copy URL
                                        </button>
                                        <div className={`h-px ${borderCol} my-1 opacity-50`} />
                                        <button 
                                            onClick={(e) => onDuplicate(idx, e)} 
                                            className={`w-full text-left px-3 py-1.5 hover:bg-opacity-10 hover:bg-gray-400 flex items-center gap-2 ${textColor}`}
                                        >
                                            <Plus size={12} /> Duplicate
                                        </button>
                                        <button 
                                            onClick={(e) => onDelete(idx, e)} 
                                            className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-red-500 flex items-center gap-2"
                                        >
                                            <Trash2 size={12} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const Sidebar = memo(SidebarComponent);
