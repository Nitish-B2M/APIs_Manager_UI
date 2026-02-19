'use client';

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
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
    Code,
    Folder,
    FolderOpen,
    FolderPlus,
    Edit3,
    Globe,
    ExternalLink,
    Upload
} from 'lucide-react';
import ImportCurlModal from './ImportCurlModal';
import { useTheme } from '@/context/ThemeContext';
import { Endpoint, HttpMethod, Documentation, Folder as FolderType } from '@/types';
// DndRequestList removed in favor of unified native DnD


interface SidebarProps {
    doc: Documentation;
    endpoints: Endpoint[];
    folders?: FolderType[];
    selectedIdx: number;
    isCollapsed: boolean;
    width: number;
    isDirty: boolean;
    canEdit: boolean;
    openMenuIdx: number | null;
    draggedIdx: number | null;
    onSelectEndpoint: (idx: number) => void;
    onToggleCollapse: () => void;
    onAddRequest: (data?: any) => void;
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
    onReorderRequests?: (oldIndex: number, newIndex: number) => void;
    // Folder callbacks (optional for backwards compatibility)
    onAddFolder?: () => void;
    onEditFolder?: (folder: FolderType) => void;
    onDeleteFolder?: (folder: FolderType) => void;
    onAddSubfolder?: (parentId: string) => void;
    onMoveRequestToFolder?: (requestIdx: number, folderId: string | null) => void;
    onReorderFolders?: (draggedId: string, targetId: string) => void;
    onSlugUpdate?: (slug: string) => void;
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

// Dropdown menu component that auto-positions above/below based on viewport space
interface DropdownMenuProps {
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

function DropdownMenu({ buttonRef, isOpen, children, className = '' }: DropdownMenuProps) {
    const [position, setPosition] = useState<'below' | 'above'>('below');
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const menuHeight = 180; // Approximate menu height
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;

            // If not enough space below but more space above, position above
            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                setPosition('above');
            } else {
                setPosition('below');
            }
        }
    }, [isOpen, buttonRef]);

    if (!isOpen) return null;

    const positionClasses = position === 'above'
        ? 'bottom-full mb-1'
        : 'top-full mt-1';

    return (
        <div
            ref={menuRef}
            className={`absolute right-0 ${positionClasses} ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    );
}

// Request menu dropdown with auto-positioning
interface RequestMenuProps {
    isOpen: boolean;
    request: Endpoint;
    globalIdx: number;
    secondaryBg: string;
    borderCol: string;
    textColor: string;
    hoverBg: string;
    onCopyAsCurl: (ep: Endpoint) => void;
    onCopyAsFetch: (ep: Endpoint) => void;
    onCopyUrl: (ep: Endpoint) => void;
    onDuplicate: (idx: number, e: React.MouseEvent) => void;
    onDelete: (idx: number, e: React.MouseEvent) => void;
    onMenuToggle: (idx: number | null) => void;
}

function RequestMenuDropdown({
    isOpen,
    request,
    globalIdx,
    secondaryBg,
    borderCol,
    textColor,
    hoverBg,
    onCopyAsCurl,
    onCopyAsFetch,
    onCopyUrl,
    onDuplicate,
    onDelete,
    onMenuToggle,
}: RequestMenuProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState<'below' | 'above'>('below');

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const menuHeight = 180;
            const spaceBelow = viewportHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;

            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                setPosition('above');
            } else {
                setPosition('below');
            }
        }
    }, [isOpen]);

    const positionClasses = position === 'above'
        ? 'bottom-full mb-1'
        : 'top-full mt-1';

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    onMenuToggle(isOpen ? null : globalIdx);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 p-1 rounded transition-all"
            >
                <MoreVertical size={12} />
            </button>

            {isOpen && (
                <div
                    className={`absolute right-0 ${positionClasses} w-40 ${secondaryBg} border ${borderCol} rounded-lg shadow-2xl z-50 py-1 text-[10px]`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); onCopyAsCurl(request); onMenuToggle(null); }}
                        className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                    >
                        <Terminal size={12} className="text-orange-500" /> Copy as cURL
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCopyAsFetch(request); onMenuToggle(null); }}
                        className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                    >
                        <Code size={12} className="text-blue-500" /> Copy as Fetch
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCopyUrl(request); onMenuToggle(null); }}
                        className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                    >
                        <Copy size={12} className="text-green-500" /> Copy URL
                    </button>
                    <div className={`h-px ${borderCol} my-1 opacity-50`} />
                    <button
                        onClick={(e) => onDuplicate(globalIdx, e)}
                        className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                    >
                        <Plus size={12} /> Duplicate
                    </button>
                    <button
                        onClick={(e) => onDelete(globalIdx, e)}
                        className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-red-500 flex items-center gap-2"
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}

// Folder Item Sub-component
interface FolderItemProps {
    folder: FolderType;
    allFolders: FolderType[];
    allEndpoints: Endpoint[];
    selectedIdx: number;
    canEdit: boolean;
    openMenuIdx: number | null;
    draggedIdx: number | null;
    expandedFolders: Set<string>;
    theme: 'light' | 'dark';
    secondaryBg: string;
    borderCol: string;
    textColor: string;
    subTextColor: string;
    onToggleExpand: (folderId: string) => void;
    onSelectEndpoint: (idx: number) => void;
    onEditFolder?: (folder: FolderType) => void;
    onDeleteFolder?: (folder: FolderType) => void;
    onAddSubfolder?: (parentId: string) => void;
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
    onDropOnFolder?: (folderId: string | null) => void;
    onFolderDragStart?: (id: string) => void;
    draggedFolderId?: string | null;
    onReorderFolders?: (draggedId: string, targetId: string) => void;
}

function FolderItemComponent({
    folder,
    allFolders,
    allEndpoints,
    selectedIdx,
    canEdit,
    openMenuIdx,
    draggedIdx,
    expandedFolders,
    theme,
    secondaryBg,
    borderCol,
    textColor,
    subTextColor,
    onToggleExpand,
    onSelectEndpoint,
    onEditFolder,
    onDeleteFolder,
    onAddSubfolder,
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
    onDropOnFolder,
    onFolderDragStart,
    draggedFolderId,
    onReorderFolders,
}: FolderItemProps) {
    const [showFolderMenu, setShowFolderMenu] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const isExpanded = expandedFolders.has(folder.id);
    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100';
    const dragOverBg = theme === 'dark' ? 'bg-indigo-600/20' : 'bg-indigo-50';

    // Get child folders and requests
    const childFolders = allFolders.filter(f => f.parentId === folder.id).sort((a, b) => a.order - b.order);
    const folderRequests = allEndpoints.filter(r => r.folderId === folder.id);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        // Handle folder drop (reorder) or request drop (move to folder)
        if (draggedIdx !== null) {
            onDropOnFolder?.(folder.id);
        } else if (draggedFolderId && onReorderFolders) {
            onReorderFolders(draggedFolderId, folder.id);
        }
    };

    const handleFolderDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        if (canEdit && onFolderDragStart) {
            onFolderDragStart(folder.id);
        }
    };

    return (
        <div className="select-none">
            {/* Folder Header */}
            <div
                className={`group flex items-center justify-between px-2 py-1.5 cursor-pointer transition-all ${hoverBg} ${isDragOver ? dragOverBg : ''}`}
                onClick={() => onToggleExpand(folder.id)}
                draggable={canEdit}
                onDragStart={handleFolderDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex items-end gap-1.5 overflow-hidden flex-1">
                    <span className={`self-center ${subTextColor}`}>
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                    <span className={`self-center ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`}>
                        {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                    </span>
                    <span className={`truncate text-[12px] font-medium ${textColor}`}>
                        {folder.name}
                    </span>
                    <span className={`text-[10px] ${subTextColor}`}>
                        F:{childFolders.length} R:{folderRequests.length}
                    </span>
                </div>

                {canEdit && (
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowFolderMenu(!showFolderMenu);
                            }}
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${subTextColor} ${hoverBg}`}
                        >
                            <MoreVertical size={12} />
                        </button>

                        {showFolderMenu && (
                            <div
                                className={`absolute right-0 top-full mt-1 w-36 ${secondaryBg} border ${borderCol} rounded-lg shadow-xl z-50 py-1 text-[10px]`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        onAddSubfolder?.(folder.id);
                                        setShowFolderMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                                >
                                    <FolderPlus size={12} className={theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'} /> Add Subfolder
                                </button>
                                <button
                                    onClick={() => {
                                        onEditFolder?.(folder);
                                        setShowFolderMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                                >
                                    <Edit3 size={12} className="text-blue-500" /> Rename
                                </button>
                                <div className={`h-px ${borderCol} my-1 opacity-50`} />
                                <button
                                    onClick={() => {
                                        onDeleteFolder?.(folder);
                                        setShowFolderMenu(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-red-500 flex items-center gap-2"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Folder Contents */}
            {isExpanded && (
                <div className={`ml-3 border-l ${borderCol}`}>
                    {/* Child Folders (recursive) */}
                    {childFolders.map((childFolder) => (
                        <FolderItemComponent
                            key={childFolder.id}
                            folder={childFolder}
                            allFolders={allFolders}
                            allEndpoints={allEndpoints}
                            selectedIdx={selectedIdx}
                            canEdit={canEdit}
                            openMenuIdx={openMenuIdx}
                            draggedIdx={draggedIdx}
                            expandedFolders={expandedFolders}
                            theme={theme}
                            secondaryBg={secondaryBg}
                            borderCol={borderCol}
                            textColor={textColor}
                            subTextColor={subTextColor}
                            onToggleExpand={onToggleExpand}
                            onSelectEndpoint={onSelectEndpoint}
                            onEditFolder={onEditFolder}
                            onDeleteFolder={onDeleteFolder}
                            onAddSubfolder={onAddSubfolder}
                            onCopyMarkdown={onCopyMarkdown}
                            onCopyAsCurl={onCopyAsCurl}
                            onCopyAsFetch={onCopyAsFetch}
                            onCopyUrl={onCopyUrl}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                            onMenuToggle={onMenuToggle}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDragEnd={onDragEnd}
                            onDropOnFolder={onDropOnFolder}
                            onFolderDragStart={onFolderDragStart}
                            draggedFolderId={draggedFolderId}
                            onReorderFolders={onReorderFolders}
                        />
                    ))}

                    {/* Requests in this folder */}
                    {folderRequests.map((request) => {
                        const globalIdx = allEndpoints.indexOf(request);
                        const isSelected = globalIdx === selectedIdx;

                        return (
                            <div
                                key={`${request.id || 'req'}-${globalIdx}`}
                                onClick={() => onSelectEndpoint(globalIdx)}
                                draggable={canEdit}
                                onDragStart={() => canEdit && onDragStart(globalIdx)}
                                onDragOver={(e) => canEdit && onDragOver(e, globalIdx)}
                                onDragEnd={() => canEdit && onDragEnd()}
                                className={`group flex items-center justify-between p-2 cursor-pointer border-l-2 transition-all relative ${isSelected
                                    ? theme === 'dark'
                                        ? 'bg-indigo-600/20 border-indigo-500'
                                        : 'bg-indigo-50 border-indigo-500'
                                    : `border-transparent ${hoverBg}`
                                    } ${draggedIdx === globalIdx ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    {canEdit && (
                                        <GripVertical
                                            size={10}
                                            className={`${theme === 'dark'
                                                ? 'text-gray-600 group-hover:text-gray-400'
                                                : 'text-gray-300 group-hover:text-gray-500'
                                                } cursor-grab active:cursor-grabbing flex-shrink-0`}
                                        />
                                    )}
                                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${getMethodColor(request.method)}`}>
                                        {request.method}
                                    </span>
                                    <span className={`truncate text-[11px] ${isSelected
                                        ? `font-bold ${textColor}`
                                        : subTextColor
                                        }`}>
                                        {request.name || 'Untitled'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1">
                                    {/* <button
                                        onClick={(e) => { e.stopPropagation(); onCopyMarkdown(request); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-indigo-400 transition-all"
                                        title="Copy Markdown"
                                    >
                                        <Copy size={10} />
                                    </button> */}
                                    <RequestMenuDropdown
                                        isOpen={openMenuIdx === globalIdx}
                                        request={request}
                                        globalIdx={globalIdx}
                                        secondaryBg={secondaryBg}
                                        borderCol={borderCol}
                                        textColor={textColor}
                                        hoverBg={hoverBg}
                                        onCopyAsCurl={onCopyAsCurl}
                                        onCopyAsFetch={onCopyAsFetch}
                                        onCopyUrl={onCopyUrl}
                                        onDuplicate={onDuplicate}
                                        onDelete={onDelete}
                                        onMenuToggle={onMenuToggle}
                                    />
                                </div>
                            </div>
                        );
                    })}

                    {/* Empty folder */}
                    {folderRequests.length === 0 && childFolders.length === 0 && (
                        <div className={`px-3 py-2 text-[10px] ${subTextColor} italic`}>
                            Drag requests here
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function SidebarComponent({
    doc,
    endpoints,
    folders = [],
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
    onReorderRequests,
    onAddFolder,
    onEditFolder,
    onDeleteFolder,
    onAddSubfolder,
    onMoveRequestToFolder,
    onReorderFolders,
    onSlugUpdate,
}: SidebarProps) {
    const { theme } = useTheme();
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
    const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null); // Local state for folder dragging
    const [slugInput, setSlugInput] = useState(doc.slug || '');
    const [showSlugEditor, setShowSlugEditor] = useState(false);
    const [slugCopied, setSlugCopied] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const secondaryBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100';

    const handleToggleExpand = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const handleDropOnFolder = (folderId: string | null) => {
        if (draggedIdx !== null && onMoveRequestToFolder) {
            onMoveRequestToFolder(draggedIdx, folderId);
        }
        setDropTargetFolderId(null);
    };

    const handleRootDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedIdx !== null && onMoveRequestToFolder) {
            onMoveRequestToFolder(draggedIdx, null); // Move to root
        }
        // Handle root folder reordering logic if needed
    };

    const handleFolderReorder = (draggedId: string, targetId: string) => {
        if (onReorderFolders) {
            onReorderFolders(draggedId, targetId);
        }
    };

    // Get root-level folders and unfiled requests
    const rootFolders = folders.filter(f => !f.parentId).sort((a, b) => a.order - b.order);
    const unfiledRequests = endpoints.filter(r => !r.folderId);

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
                    <>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {canEdit && (
                                <button
                                    onClick={() => setIsImportOpen(true)}
                                    className={`p-1.5 rounded flex items-center justify-center gap-1 transition-all border ${theme === 'dark'
                                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                        }`}
                                    title="Import cURL"
                                >
                                    <Upload size={14} />
                                </button>
                            )}
                            {canEdit && (
                                <button
                                    onClick={onAddRequest}
                                    className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${theme === 'dark'
                                        ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                        }`}
                                    title="Add New Request (Alt+N)"
                                >
                                    <Plus size={14} /> <span className="font-bold">NEW</span>
                                </button>
                            )}
                            {canEdit && onAddFolder && (
                                <button
                                    onClick={onAddFolder}
                                    className={`p-1.5 rounded flex items-center justify-center gap-1 transition-all border ${theme === 'dark'
                                        ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-600/30'
                                        : 'bg-yellow-50 text-yellow-600 border-yellow-100 hover:bg-yellow-100'
                                        }`}
                                    title="Add New Folder"
                                >
                                    <FolderPlus size={14} />
                                </button>
                            )}
                            {canEdit && (
                                <>
                                    <button
                                        onClick={onSaveCollection}
                                        disabled={!isDirty}
                                        className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all relative border ${isDirty
                                            ? 'bg-green-600/20 text-green-400 border-green-600/30 hover:bg-green-600/30 shadow-md'
                                            : theme === 'dark'
                                                ? 'bg-gray-800 text-gray-500 border-gray-700 opacity-50 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50 cursor-not-allowed'
                                            }`}
                                        title={isDirty ? "Save Collection (Ctrl+S)" : "No collection changes to save"}
                                    >
                                        <Save size={14} />
                                        {isDirty && (
                                            <span className="absolute top-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-gray-800 animate-pulse" />
                                        )}
                                    </button>
                                    <button
                                        onClick={onShare}
                                        className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${doc.isPublic
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
                                className={`p-1.5 ${theme === 'dark'
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
                                    className={`p-1.5 ${theme === 'dark'
                                        ? 'bg-gray-700 text-gray-300 border-gray-600'
                                        : 'bg-gray-100 text-gray-700 border-gray-300'
                                        } hover:bg-opacity-80 rounded border flex-1 flex items-center justify-center gap-1 transition-all`}
                                    title="Environment Variables"
                                >
                                    <Settings size={14} />
                                </button>
                            )}
                        </div>

                        {/* Public Slug Editor - shows when doc is public */}
                        {doc.isPublic && canEdit && (
                            <div className={`mt-2 p-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Globe size={12} className="text-green-500" />
                                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${subTextColor}`}>Public URL</span>
                                </div>
                                {showSlugEditor ? (
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            value={slugInput}
                                            onChange={(e) => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                            placeholder="my-api-docs"
                                            className={`flex-1 text-[11px] px-2 py-1 rounded border ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                                        />
                                        <button
                                            onClick={() => {
                                                if (slugInput.length >= 3 && onSlugUpdate) {
                                                    onSlugUpdate(slugInput);
                                                    setShowSlugEditor(false);
                                                }
                                            }}
                                            className="text-[10px] px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all"
                                        >
                                            Save
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        {doc.slug ? (
                                            <a
                                                href={`/public/${doc.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors truncate"
                                            >
                                                <ExternalLink size={10} />
                                                /public/{doc.slug}
                                            </a>
                                        ) : (
                                            <span className={`text-[10px] ${subTextColor}`}>No slug set</span>
                                        )}
                                        {doc.slug && (
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/public/${doc.slug}`;
                                                    navigator.clipboard.writeText(url);
                                                    setSlugCopied(true);
                                                    setTimeout(() => setSlugCopied(false), 1500);
                                                }}
                                                className={`text-[10px] px-1.5 py-0.5 rounded ${slugCopied ? (theme === 'dark' ? 'text-green-400' : 'text-green-600') : (theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200')} transition-all`}
                                                title={slugCopied ? 'Copied!' : 'Copy public URL'}
                                            >
                                                {slugCopied ? <span className="text-[10px]">✓</span> : <Copy size={10} />}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowSlugEditor(true)}
                                            className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'} transition-all`}
                                        >
                                            <Edit3 size={10} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Endpoint List with Folders */}
            {
                !isCollapsed && (
                    <div className="flex-1 overflow-y-auto">
                        {/* Root Folders */}
                        {rootFolders.map((folder) => (
                            <FolderItemComponent
                                key={folder.id}
                                folder={folder}
                                allFolders={folders}
                                allEndpoints={endpoints}
                                selectedIdx={selectedIdx}
                                canEdit={canEdit}
                                openMenuIdx={openMenuIdx}
                                draggedIdx={draggedIdx}
                                expandedFolders={expandedFolders}
                                theme={theme}
                                secondaryBg={secondaryBg}
                                borderCol={borderCol}
                                textColor={textColor}
                                subTextColor={subTextColor}
                                onToggleExpand={handleToggleExpand}
                                onSelectEndpoint={onSelectEndpoint}
                                onEditFolder={onEditFolder}
                                onDeleteFolder={onDeleteFolder}
                                onAddSubfolder={onAddSubfolder}
                                onCopyMarkdown={onCopyMarkdown}
                                onCopyAsCurl={onCopyAsCurl}
                                onCopyAsFetch={onCopyAsFetch}
                                onCopyUrl={onCopyUrl}
                                onDuplicate={onDuplicate}
                                onDelete={onDelete}
                                onMenuToggle={onMenuToggle}
                                onDragStart={onDragStart}
                                onDragOver={onDragOver}
                                onDragEnd={onDragEnd}
                                onDropOnFolder={handleDropOnFolder}
                                onFolderDragStart={setDraggedFolderId}
                                draggedFolderId={draggedFolderId}
                                onReorderFolders={handleFolderReorder}
                            />
                        ))}

                        {/* Unfiled Requests (requests without a folder) */}
                        {/* Unfiled Requests (requests without a folder) */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={handleRootDrop}
                            className="min-h-[50px]"
                        >
                            {unfiledRequests.map((request) => {
                                const globalIdx = endpoints.indexOf(request);
                                const isSelected = globalIdx === selectedIdx;

                                return (
                                    <div
                                        key={`${request.id || 'req'}-${globalIdx}`}
                                        onClick={() => onSelectEndpoint(globalIdx)}
                                        draggable={canEdit}
                                        onDragStart={() => canEdit && onDragStart(globalIdx)}
                                        onDragOver={(e) => canEdit && onDragOver(e, globalIdx)}
                                        onDragEnd={() => canEdit && onDragEnd()}
                                        className={`group flex items-center justify-between p-2 cursor-pointer border-l-2 transition-all relative ${isSelected
                                            ? theme === 'dark'
                                                ? 'bg-indigo-600/20 border-indigo-500'
                                                : 'bg-indigo-50 border-indigo-500'
                                            : `border-transparent ${hoverBg}`
                                            } ${draggedIdx === globalIdx ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            {canEdit && (
                                                <GripVertical
                                                    size={10}
                                                    className={`${theme === 'dark'
                                                        ? 'text-gray-600 group-hover:text-gray-400'
                                                        : 'text-gray-300 group-hover:text-gray-500'
                                                        } cursor-grab active:cursor-grabbing flex-shrink-0`}
                                                />
                                            )}
                                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${getMethodColor(request.method)}`}>
                                                {request.method}
                                            </span>
                                            <span className={`truncate text-[11px] ${isSelected
                                                ? `font-bold ${textColor}`
                                                : subTextColor
                                                }`}>
                                                {request.name || 'Untitled'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <RequestMenuDropdown
                                                isOpen={openMenuIdx === globalIdx}
                                                request={request}
                                                globalIdx={globalIdx}
                                                secondaryBg={secondaryBg}
                                                borderCol={borderCol}
                                                textColor={textColor}
                                                hoverBg={hoverBg}
                                                onCopyAsCurl={onCopyAsCurl}
                                                onCopyAsFetch={onCopyAsFetch}
                                                onCopyUrl={onCopyUrl}
                                                onDuplicate={onDuplicate}
                                                onDelete={onDelete}
                                                onMenuToggle={onMenuToggle}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Empty state */}
                        {endpoints.length === 0 && folders.length === 0 && (
                            <div className={`p-4 text-center ${subTextColor} text-sm`}>
                                No requests yet. Click "NEW" to add one.
                            </div>
                        )}
                    </div>
                )
            }
            <ImportCurlModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImport={onAddRequest}
            />
        </div >
    );
}

export const Sidebar = memo(SidebarComponent);
