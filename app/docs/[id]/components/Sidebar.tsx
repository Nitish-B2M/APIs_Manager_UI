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
    Upload,
    Play,
    Sparkles,
    Clock,
    Users,
    ListChecks,
    Database,
    RotateCcw
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
    canAdmin?: boolean;
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
    onRunCollection?: () => void;
    onShowSnapshots?: () => void;
    aiEnabled?: boolean;
    onAiToggle?: (enabled: boolean) => void;
    onBulkDelete?: (ids: string[]) => void;
    onBulkMove?: (ids: string[], folderId: string | null) => void;
    isOnline?: boolean;
    isSyncing?: boolean;
    queueLength?: number;
    activeView?: string;
    onViewChange?: (view: any) => void;
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
    const { theme } = useTheme();

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
        ? 'bottom-full mb-2'
        : 'top-full mt-2';

    return (
        <div
            ref={menuRef}
            className={`absolute right-0 ${positionClasses} z-50 animate-in fade-in zoom-in duration-200 ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`rounded-xl border ${theme === 'dark' ? 'bg-gray-900/90 border-white/10 backdrop-blur-xl' : 'bg-white border-gray-200'} shadow-2xl overflow-hidden min-w-[160px]`}>
                {children}
            </div>
        </div>
    );
}

// Request menu dropdown with auto-positioning
interface RequestMenuProps {
    theme: 'light' | 'dark';
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
    theme,
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

    const secondaryBg2 = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';

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
                    className={`absolute right-0 ${positionClasses} w-44 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 text-[11px] animate-in fade-in zoom-in duration-200`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); onCopyAsCurl(request); onMenuToggle(null); }}
                        className={`w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-gray-200`}
                    >
                        <Terminal size={12} className="text-indigo-400" /> Copy as cURL
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCopyAsFetch(request); onMenuToggle(null); }}
                        className={`w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-gray-200`}
                    >
                        <Code size={12} className="text-blue-400" /> Copy as Fetch
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCopyUrl(request); onMenuToggle(null); }}
                        className={`w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-gray-200`}
                    >
                        <Copy size={12} className="text-green-400" /> Copy URL
                    </button>
                    <div className={`h-px bg-white/5 my-1`} />
                    <button
                        onClick={(e) => onDuplicate(globalIdx, e)}
                        className={`w-full text-left px-3 py-2 hover:bg-white/5 flex items-center gap-2 text-gray-200`}
                    >
                        <Plus size={12} className="text-gray-400" /> Duplicate
                    </button>
                    <button
                        onClick={(e) => onDelete(globalIdx, e)}
                        className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-500 flex items-center gap-2"
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
    onReorderRequests?: (oldIndex: number, newIndex: number) => void;
    selectedRequestIds: Set<string>;
    onToggleSelect: (id: string, isShift: boolean) => void;
    isSelectionMode: boolean;
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
    onReorderRequests,
    selectedRequestIds,
    onToggleSelect,
    isSelectionMode,
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
                            onReorderRequests={onReorderRequests}
                            selectedRequestIds={selectedRequestIds}
                            onToggleSelect={onToggleSelect}
                            isSelectionMode={isSelectionMode}
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
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (draggedIdx !== null && draggedIdx !== globalIdx && onReorderRequests) {
                                        onReorderRequests(draggedIdx, globalIdx);
                                    }
                                }}
                                className={`group flex items-center justify-between p-2.5 cursor-pointer border-l-2 transition-all relative ${isSelected
                                    ? theme === 'dark'
                                        ? 'bg-indigo-600/20 border-indigo-500'
                                        : 'bg-indigo-50 border-indigo-500'
                                    : `border-transparent ${hoverBg}`
                                    } ${draggedIdx === globalIdx ? 'opacity-50' : ''} ${selectedRequestIds.has(request.id as string) ? 'bg-indigo-600/10' : ''}`}
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
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {isSelectionMode && (
                                            <input
                                                type="checkbox"
                                                checked={selectedRequestIds.has(request.id as string)}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => onToggleSelect(request.id as string, (e.nativeEvent as any).shiftKey)}
                                                className="w-3 h-3 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                        )}
                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${getMethodColor(request.method)}`}>
                                            {request.method}
                                        </span>
                                    </div>
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
                                        theme={theme}
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
            )
            }
        </div >
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
    canAdmin,
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
    onShowSnapshots,
    onAddFolder,
    onEditFolder,
    onDeleteFolder,
    onAddSubfolder,
    onMoveRequestToFolder,
    onReorderFolders,
    onSlugUpdate,
    onRunCollection,
    aiEnabled = true,
    onAiToggle,
    onBulkDelete,
    onBulkMove,
    isOnline = true,
    isSyncing = false,
    queueLength = 0,
    activeView = 'client',
    onViewChange
}: SidebarProps) {
    const { theme } = useTheme();
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
    const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);
    const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
    const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
    const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null); // Local state for folder dragging
    const [slugInput, setSlugInput] = useState(doc.slug || '');
    const [showSlugEditor, setShowSlugEditor] = useState(false);
    const [slugCopied, setSlugCopied] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    // Close menus on click
    useEffect(() => {
        const handleClick = () => {
            setShowBulkMoveMenu(false);
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const secondaryBg = theme === 'dark' ? 'bg-[#0F0E13]' : 'bg-white/80 backdrop-blur-md';
    const borderCol = theme === 'dark' ? 'border-white/5' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-slate-400' : 'text-gray-500';
    const hoverBg = theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-100';

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

    const handleToggleSelect = (id: string, isShift: boolean) => {
        setSelectedRequestIds(prev => {
            const next = new Set(prev);
            if (isShift && lastCheckedId) {
                // Flatten visuals: process all visible requests in UI order
                const visualOrder: string[] = [];
                const addFolderContent = (fid: string | null) => {
                    endpoints.filter(e => e.folderId === fid).forEach(e => visualOrder.push(e.id as string));
                    folders.filter(f => f.parentId === fid).sort((a, b) => a.order - b.order).forEach(f => {
                        if (expandedFolders.has(f.id)) { // Only add content of expanded folders
                            addFolderContent(f.id);
                        }
                    });
                };

                // Root requests first, then folders and their contents
                endpoints.filter(e => !e.folderId).forEach(e => visualOrder.push(e.id as string));
                folders.filter(f => !f.parentId).sort((a, b) => a.order - b.order).forEach(f => {
                    if (expandedFolders.has(f.id)) { // Only add content of expanded folders
                        addFolderContent(f.id);
                    }
                });

                const start = visualOrder.indexOf(lastCheckedId);
                const end = visualOrder.indexOf(id);
                if (start !== -1 && end !== -1) {
                    const range = visualOrder.slice(Math.min(start, end), Math.max(start, end) + 1);
                    range.forEach(rid => {
                        if (rid) next.add(rid);
                    });
                }
            } else {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            }
            return next;
        });
        setLastCheckedId(id);
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
            className={`${secondaryBg} border-r ${borderCol} flex flex-col transition-all duration-300 z-20 ${isCollapsed ? 'w-12' : ''}`}
            style={{ width: isCollapsed ? '48px' : `${width}px` }}
        >
            {/* Premium Header */}
            <div className={`p-4 border-b ${borderCol} flex flex-col gap-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                                <Database size={14} className="text-white" />
                            </div>
                            <h2 className={`font-bold ${textColor} truncate text-sm tracking-tight`} title={doc.title}>
                                {doc.title}
                            </h2>
                        </div>
                    )}
                    <button
                        onClick={onToggleCollapse}
                        className={`p-1.5 rounded-lg ${subTextColor} hover:bg-white/10 hover:text-violet-400 transition-all duration-200 border border-transparent hover:border-white/5`}
                        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
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
                        {onRunCollection && (
                            <button
                                onClick={onRunCollection}
                                className={`p-1.5 rounded flex items-center justify-center gap-1 transition-all border ${theme === 'dark'
                                    ? 'bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-600/30'
                                    : 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100'
                                    }`}
                                title="Run Collection"
                            >
                                <Play size={14} />
                            </button>
                        )}
                        {onShowSnapshots && (
                            <button
                                onClick={onShowSnapshots}
                                className={`p-1.5 rounded flex items-center justify-center gap-1 transition-all border ${theme === 'dark'
                                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30'
                                    : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                                    }`}
                                title="Collection Snapshots"
                            >
                                <Clock size={14} />
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setIsSelectionMode(!isSelectionMode);
                                    if (isSelectionMode) {
                                        setSelectedRequestIds(new Set());
                                    }
                                }}
                                className={`p-1.5 rounded flex items-center justify-center gap-1 transition-all border ${isSelectionMode
                                    ? 'bg-violet-600 text-white border-violet-500 shadow-inner'
                                    : theme === 'dark'
                                        ? 'bg-violet-600/20 text-violet-400 border-violet-500/30 hover:bg-violet-600/30'
                                        : 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-100'
                                    }`}
                                title={isSelectionMode ? "Exit Selection Mode" : "Enter Selection Mode"}
                            >
                                <ListChecks size={14} />
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
                                {canAdmin && (
                                    <button
                                        onClick={onShare}
                                        className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${theme === 'dark'
                                            ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                                            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                                            }`}
                                        title="Manage Team & Sharing"
                                    >
                                        <Users size={14} />
                                    </button>
                                )}
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
                                onReorderRequests={onReorderRequests}
                                selectedRequestIds={selectedRequestIds}
                                onToggleSelect={handleToggleSelect}
                                isSelectionMode={isSelectionMode}
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
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (draggedIdx !== null && draggedIdx !== globalIdx && onReorderRequests) {
                                                onReorderRequests(draggedIdx, globalIdx);
                                            }
                                        }}
                                        className={`group flex items-center justify-between p-2 cursor-pointer border-l-2 transition-all relative ${isSelected
                                            ? theme === 'dark'
                                                ? 'bg-indigo-600/20 border-indigo-500'
                                                : 'bg-indigo-50 border-indigo-500'
                                            : `border-transparent ${hoverBg}`
                                            } ${draggedIdx === globalIdx ? 'opacity-50' : ''} ${selectedRequestIds.has(request.id as string) ? 'bg-indigo-600/10' : ''}`}
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
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {isSelectionMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequestIds.has(request.id as string)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => handleToggleSelect(request.id as string, (e.nativeEvent as any).shiftKey)}
                                                        className="w-3 h-3 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                )}
                                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${getMethodColor(request.method)}`}>
                                                    {request.method}
                                                </span>
                                            </div>
                                            <span className={`truncate text-[11px] ${isSelected
                                                ? `font-bold ${textColor}`
                                                : subTextColor
                                                }`}>
                                                {request.name || 'Untitled'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <RequestMenuDropdown
                                                theme={theme}
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

            {/* Bulk Action Bar - conditons on both selection mode and item selection */}
            {
                isSelectionMode && selectedRequestIds.size > 0 && (
                    <div className={`p-2 border-t ${borderCol} ${theme === 'dark' ? 'bg-indigo-900/40' : 'bg-indigo-50'} animate-in slide-in-from-bottom flex flex-col gap-2`}>
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-bold text-indigo-500">{selectedRequestIds.size} selected</span>
                            <button onClick={() => setSelectedRequestIds(new Set())} className={`text-[10px] ${subTextColor} hover:text-indigo-500`}>Clear</button>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => {
                                    if (confirm(`Delete ${selectedRequestIds.size} requests?`) && onBulkDelete) {
                                        onBulkDelete(Array.from(selectedRequestIds));
                                        setSelectedRequestIds(new Set());
                                    }
                                }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-red-600/20 text-red-500 rounded text-[10px] font-bold hover:bg-red-600/30 transition-all border border-red-500/30"
                            >
                                <Trash2 size={12} /> Delete
                            </button>

                            <div className="relative flex-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowBulkMoveMenu(!showBulkMoveMenu);
                                    }}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 text-white rounded text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-md"
                                >
                                    <Folder size={12} /> Move
                                </button>
                                {showBulkMoveMenu && (
                                    <div
                                        className="absolute bottom-full left-0 w-48 z-[60] mb-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className={`shadow-2xl border ${borderCol} ${secondaryBg} rounded-lg py-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150`}>
                                            <button
                                                onClick={() => {
                                                    onBulkMove?.(Array.from(selectedRequestIds), null);
                                                    setSelectedRequestIds(new Set());
                                                    setShowBulkMoveMenu(false);
                                                }}
                                                className={`w-full text-left px-3 py-1.5 ${hoverBg} text-[10px] ${textColor} border-b ${borderCol} border-opacity-30 flex items-center gap-2`}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Root Level
                                            </button>
                                            <div className="max-h-60 overflow-y-auto">
                                                {folders.length === 0 && (
                                                    <div className={`px-3 py-2 text-[10px] ${subTextColor} italic`}>No folders available</div>
                                                )}
                                                {folders.map(f => (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => {
                                                            onBulkMove?.(Array.from(selectedRequestIds), f.id);
                                                            setSelectedRequestIds(new Set());
                                                            setShowBulkMoveMenu(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-1.5 ${hoverBg} text-[10px] ${textColor} truncate flex items-center gap-2`}
                                                    >
                                                        <Folder size={10} className="text-yellow-500 flex-shrink-0" /> {f.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Footer with Status & AI Controls */}
            <div className={`mt-auto border-t ${borderCol} p-3 space-y-3`}>
                {/* Status Indicators */}
                {!isCollapsed && (
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                            <span className={`text-[9px] uppercase font-bold tracking-tighter ${subTextColor}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>

                        {isSyncing && (
                            <div className="flex items-center gap-1.5">
                                <RotateCcw size={10} className="animate-spin text-indigo-400" />
                                <span className="text-[9px] font-medium text-indigo-400">Syncing...</span>
                            </div>
                        )}

                        {!isSyncing && queueLength > 0 && (
                            <div className="flex items-center gap-1">
                                <Clock size={10} className="text-amber-400" />
                                <span className="text-[9px] font-medium text-amber-400">{queueLength} cached</span>
                            </div>
                        )}
                    </div>
                )}

                {/* AI Assistant Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles size={12} className={aiEnabled ? 'text-indigo-400' : subTextColor} />
                        <span className={`text-[10px] uppercase font-bold tracking-wider ${aiEnabled ? textColor : subTextColor}`}>
                            AI Assistant
                        </span>
                    </div>
                    <button
                        onClick={() => onAiToggle?.(!aiEnabled)}
                        className={`w-8 h-4 rounded-full transition-all relative ${aiEnabled ? 'bg-indigo-600' : theme === 'dark' ? 'bg-gray-800' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${aiEnabled ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>

            <ImportCurlModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onImport={onAddRequest}
            />
        </div >
    );
}

export const Sidebar = memo(SidebarComponent);
