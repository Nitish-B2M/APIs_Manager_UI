'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    FolderPlus, 
    Upload, 
    Play, 
    Clock, 
    Webhook, 
    Settings, 
    Search,
    Database,
    Trash2,
    Users,
    Save,
    Download,
    Copy,
    ExternalLink,
    ListChecks,
    Globe,
    Edit3,
    Activity,
    Zap,
    LayoutDashboard,
    AlertCircle,
    CheckCircle2,
    Sparkles,
    MoreVertical,
    FileText,
    GripVertical,
    Move,
    X,
    Folder,
    Terminal,
    Eye
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { useAuth } from '../../../../context/AuthContext';
import { usePresence } from '../hooks/usePresence';
import { Endpoint, HttpMethod, Documentation, Folder as FolderType } from '@/types';
import { toast } from 'react-hot-toast';
import ImportCurlModal from './ImportCurlModal';

interface SidebarProps {
    doc: Documentation;
    endpoints: Endpoint[];
    folders: FolderType[];
    selectedIdx: number;
    isCollapsed: boolean;
    width: number;
    isDirty: boolean;
    canEdit: boolean;
    canAdmin: boolean;
    openMenuIdx: number | null;
    draggedIdx: number | null;
    onSelectEndpoint: (idx: number) => void;
    onToggleCollapse: () => void;
    onAddRequest: (data?: any) => void;
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
    onDragOver: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onReorderRequests: (draggedIdx: number, targetIdx: number) => void;
    aiEnabled: boolean;
    onAiToggle: (enabled: boolean) => void;
    onAddFolder: () => void;
    onEditFolder: (folder: FolderType) => void;
    onDeleteFolder: (folder: FolderType) => void;
    onMoveRequestToFolder: (requestIdx: number, folderId: string | null) => void;
    onRunCollection: () => void;
    onShowSnapshots: () => void;
    activeView: string;
    onViewChange: (view: any) => void;
    onBulkDelete?: (ids: string[]) => Promise<void>;
    onBulkMove?: (ids: string[], folderId: string | null) => Promise<void>;
    onExportPostman?: () => void;
    onExportOpenApi?: () => void;
}

const SidebarComponent = ({
    doc,
    endpoints,
    folders,
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
    aiEnabled,
    onAiToggle,
    onAddFolder,
    onEditFolder,
    onDeleteFolder,
    onMoveRequestToFolder,
    onRunCollection,
    onShowSnapshots,
    activeView,
    onViewChange,
    onBulkDelete,
    onBulkMove,
    onExportPostman,
    onExportOpenApi
}: SidebarProps) => {
    const { theme } = useTheme();
    const { user } = useAuth();

    const isShared = useMemo(() => {
        return doc.isPublic || (doc as any).collaborators?.length > 1;
    }, [doc]);

    const { activeUsers, status: presenceStatus } = usePresence(
        doc.id, 
        isShared, 
        user?.settings?.enableLivePresence !== false
    );

    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
    const [showBulkMoveMenu, setShowBulkMoveMenu] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    // Local drag state for request-to-folder moves
    const [localDraggedIdx, setLocalDraggedIdx] = useState<number | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null | 'ROOT'>(null);

    // Theme Constants
    const isDark = theme === 'dark';
    const textColor = isDark ? 'text-white' : 'text-gray-900';
    const subTextColor = isDark ? 'text-gray-400' : 'text-gray-500';
    const borderCol = isDark ? 'border-white/5' : 'border-gray-200';
    const inputBg = isDark ? 'bg-white/5' : 'bg-gray-100';
    const secondaryBg = isDark ? 'bg-[#0a0a0b]' : 'bg-white';

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onMenuToggle(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onMenuToggle]);

    const getMethodColor = (method: string, protocol?: string) => {
        if (protocol === 'WS') return 'text-[#BC8CFF]';
        if (protocol === 'SSE') return 'text-[#D29922]';
        if (protocol === 'GRAPHQL') return 'text-[#FF6B9D]';
        const colors: Record<string, string> = {
            'GET': 'text-[#3FB950]',
            'POST': 'text-[#58A6FF]',
            'PUT': 'text-[#58A6FF]',
            'DELETE': 'text-[#F85149]',
            'PATCH': 'text-[#D29922]',
        };
        return colors[method] || 'text-[#8B949E]';
    };

    const getDisplayLabel = (method: string, protocol?: string) => {
        if (protocol === 'WS') return 'WS';
        if (protocol === 'SSE') return 'SSE';
        if (protocol === 'GRAPHQL') return 'GQL';
        return method;
    };

    const toggleFolder = (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    const toggleRequestSelection = (id: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedRequestIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const rootFolders = useMemo(() => {
        const foldersList = folders.filter(f => !f.parentId).sort((a, b) => a.order - b.order);
        if (!searchTerm) return foldersList;
        const s = searchTerm.toLowerCase();
        return foldersList.filter(f => {
            const nameMatch = f.name.toLowerCase().includes(s);
            const childMatch = endpoints.some(e => e.folderId === f.id && (e.name?.toLowerCase().includes(s) || e.url?.toLowerCase().includes(s)));
            return nameMatch || childMatch;
        });
    }, [folders, endpoints, searchTerm]);

    const renderEndpoint = (ep: Endpoint, index: number) => {
        const isActive = endpoints[selectedIdx]?.id === ep.id;
        const isSelected = selectedRequestIds.has(ep.id || '');
        const isMenuOpen = index === openMenuIdx;
        const otherUsersViewing = activeUsers.filter(u => u.id !== user?.id && u.metadata?.requestId === ep.id);

        const label = getDisplayLabel(ep.method, ep.protocol);
        const methodBg = ep.protocol === 'WS' ? '#2D1E3D' : ep.protocol === 'SSE' ? '#2D2416' : ep.protocol === 'GRAPHQL' ? '#3D1A2D' : ep.method === 'GET' ? '#1A3A2A' : ep.method === 'POST' ? '#1E2D3D' : ep.method === 'DELETE' ? '#3D1A1A' : ep.method === 'PATCH' ? '#2D2416' : '#21262D';
        const methodTxt = ep.protocol === 'WS' ? '#BC8CFF' : ep.protocol === 'SSE' ? '#D29922' : ep.protocol === 'GRAPHQL' ? '#FF6B9D' : ep.method === 'GET' ? '#3FB950' : ep.method === 'POST' ? '#58A6FF' : ep.method === 'DELETE' ? '#F85149' : ep.method === 'PATCH' ? '#D29922' : '#8B949E';

        return (
            <div
                key={ep.id}
                draggable={canEdit && !isSelectionMode}
                onDragStart={(e) => { setLocalDraggedIdx(index); e.dataTransfer.effectAllowed = 'move'; onDragStart(index); }}
                onDragOver={onDragOver}
                onDragEnd={() => { setLocalDraggedIdx(null); setDragOverFolderId(null); onDragEnd(); }}
                onClick={(e) => isSelectionMode ? toggleRequestSelection(ep.id || '', e) : onSelectEndpoint(endpoints.indexOf(ep))}
                className="group"
                style={{
                    display: 'flex', alignItems: 'center', gap: 8, height: 30, paddingLeft: 28, paddingRight: 8,
                    borderRadius: 6, transition: 'all 0.1s', position: 'relative',
                    background: isActive && !isSelectionMode ? '#1C2128' : isSelected ? 'rgba(36,157,159,0.1)' : 'transparent',
                    borderLeft: isActive && !isSelectionMode ? '2px solid #249d9f' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#21262D'; }}
                onMouseLeave={e => { if (!isActive && !isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
                {isSelectionMode && (
                    <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${isSelected ? '#249d9f' : '#6E7681'}`, background: isSelected ? '#249d9f' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <CheckCircle2 size={9} style={{ color: 'white' }} />}
                    </div>
                )}
                {/* Method badge: 38px wide, 18px tall, 5px radius */}
                <span style={{ width: 38, height: 18, borderRadius: 5, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: methodBg, color: methodTxt }}>
                    {label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: isActive ? '#E6EDF3' : '#8B949E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{ep.name}</span>
                
                {otherUsersViewing.length > 0 && (
                    <div className="flex items-center gap-0.5 opacity-60">
                        <Eye size={10} className="text-[#2ec4c7]" />
                        <span className="text-[8px] font-black uppercase text-[#2ec4c7]">{otherUsersViewing[0].metadata?.field || 'view'}</span>
                    </div>
                )}

                {canEdit && !isSelectionMode && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onMenuToggle(isMenuOpen ? null : index); }}
                        className={`p-1 rounded hover:bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity ${isMenuOpen ? 'opacity-100' : ''}`}
                    >
                        <MoreVertical size={12} />
                    </button>
                )}

                {isMenuOpen && (
                    <div
                        ref={menuRef}
                        className={`absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border ${borderCol} ${isDark ? 'bg-[#1a1b26]' : 'bg-white'} shadow-2xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100`}
                    >
                        <button onClick={(e) => onDuplicate(index, e)} className={`w-full px-3 py-2 text-[10px] font-bold text-left flex items-center gap-2 ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <Copy size={12} /> Duplicate
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCopyUrl(ep); onMenuToggle(null); }} className={`w-full px-3 py-2 text-[10px] font-bold text-left flex items-center gap-2 ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <ExternalLink size={12} /> Copy URL
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCopyAsCurl(ep); onMenuToggle(null); }} className={`w-full px-3 py-2 text-[10px] font-bold text-left flex items-center gap-2 ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <Terminal size={12} /> Copy as cURL
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onCopyAsFetch(ep); onMenuToggle(null); }} className={`w-full px-3 py-2 text-[10px] font-bold text-left flex items-center gap-2 ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <Zap size={12} /> Copy as Fetch
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        <button onClick={(e) => onDelete(index, e)} className={`w-full px-3 py-2 text-[10px] font-bold text-left flex items-center gap-2 text-red-400 ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'}`}>
                            <Trash2 size={12} /> Delete
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className={`${secondaryBg} border-r ${borderCol} flex flex-col transition-all duration-300 z-20 ${isCollapsed ? 'w-12' : ''}`}
            style={{
                width: isCollapsed ? '48px' : `${width}px`,
                borderLeft: aiEnabled ? '3px solid #249d9f' : '3px solid transparent',
            }}
        >
            {/* Header */}
            <div className={`border-b ${borderCol} ${isDark ? 'bg-white/5' : 'bg-gray-50/50'} ${isCollapsed ? 'p-2' : 'p-4'}`}>
                {isCollapsed ? (
                    /* Collapsed: just the expand button centered */
                    <div className="flex flex-col items-center gap-2">
                        <button
                            onClick={onToggleCollapse}
                            className={`p-2 rounded-lg ${subTextColor} hover:bg-white/10 hover:text-[#2ec4c7] transition-all`}
                            title="Expand sidebar"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                ) : (
                    /* Expanded: title + collapse only (export buttons moved to toolbar) */
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#249d9f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Database size={12} style={{ color: 'white' }} />
                            </div>
                            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.title}>
                                {doc.title}
                            </h2>
                        </div>
                        <button
                            onClick={onToggleCollapse}
                            style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', color: '#8B949E' }}
                            title="Collapse sidebar"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                )}
            </div>

            {!isCollapsed && (
                <div className="p-3 space-y-3">
                    <div className="flex gap-1">
                        {canEdit && (
                            <button
                                onClick={onAddRequest}
                                className={`p-1.5 rounded flex-1 flex items-center justify-center gap-1 transition-all border ${isDark ? 'bg-[#1a7a7c]/20 text-[#2ec4c7] border-[#249d9f]/30' : 'bg-indigo-50 text-[#1a7a7c] border-indigo-100'}`}
                                title="New Request"
                            >
                                <Plus size={14} /> <span className="font-bold uppercase tracking-widest text-[9px]">Request</span>
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={() => setIsImportOpen(true)}
                                className={`p-1.5 rounded border ${isDark ? 'bg-white/5 text-gray-400 border-white/5' : 'bg-gray-100 text-gray-600 border-gray-200'} transition-all hover:bg-white/10`}
                                title="Import cURL"
                            >
                                <Upload size={14} />
                            </button>
                        )}
                        {canEdit && (
                            <button
                                onClick={onAddFolder}
                                className={`p-1.5 rounded border ${isDark ? 'bg-white/5 text-gray-400 border-white/5' : 'bg-gray-100 text-gray-600 border-gray-200'} transition-all hover:bg-white/10`}
                                title="New Folder"
                            >
                                <FolderPlus size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                if (!isSelectionMode) setSelectedRequestIds(new Set());
                            }}
                            className={`p-1.5 rounded border transition-all ${isSelectionMode ? 'bg-[#1a7a7c] text-white border-[#249d9f] shadow-lg' : `${isDark ? 'bg-white/5 text-gray-400 border-white/5' : 'bg-gray-100 text-gray-600 border-gray-200'} hover:bg-white/10`}`}
                            title="Selection Mode"
                        >
                            <ListChecks size={14} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" size={12} style={{ color: '#6E7681' }} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Filter requests…"
                            style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 30, borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: '#1C2128', color: '#E6EDF3', fontSize: 12, outline: 'none' }}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!isCollapsed && (
                    <div style={{ padding: '8px 8px' }}>
                        {/* Folders as collapsible groups */}
                        {rootFolders.map(folder => (
                            <div key={folder.id}
                                onDragOver={(e) => { if (localDraggedIdx !== null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverFolderId(folder.id); } }}
                                onDragLeave={() => setDragOverFolderId(prev => prev === folder.id ? null : prev)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (localDraggedIdx !== null) {
                                        onMoveRequestToFolder(localDraggedIdx, folder.id);
                                    }
                                    setLocalDraggedIdx(null); setDragOverFolderId(null);
                                }}
                                style={{ borderRadius: 6, background: dragOverFolderId === folder.id ? 'rgba(36,157,159,0.1)' : undefined, outline: dragOverFolderId === folder.id ? '1px dashed #249d9f' : undefined }}
                            >
                                {/* Folder header: 34px, hover Surface 3 */}
                                <div
                                    onClick={(e) => toggleFolder(folder.id, e)}
                                    className="group"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 34, padding: '0 8px', borderRadius: 6, transition: 'background 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#21262D'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                                        <ChevronRight size={12} style={{ flexShrink: 0, color: '#6E7681', transition: 'transform 0.15s', transform: expandedFolders.has(folder.id) ? 'rotate(90deg)' : 'none' }} />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#E6EDF3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                                    </div>
                                    {canEdit && !isSelectionMode && (
                                        <button onClick={(e) => { e.stopPropagation(); onEditFolder(folder); }} className="opacity-0 group-hover:opacity-100" style={{ padding: 4, borderRadius: 4, background: 'none', border: 'none', color: '#6E7681' }}>
                                            <Edit3 size={11} />
                                        </button>
                                    )}
                                </div>
                                {expandedFolders.has(folder.id) && (
                                    <div style={{ paddingLeft: 8 }}>
                                        {endpoints.filter(e => e.folderId === folder.id).map((ep) => renderEndpoint(ep, endpoints.indexOf(ep)))}
                                        {endpoints.filter(e => e.folderId === folder.id).length === 0 && (
                                            <p style={{ fontSize: 11, color: '#6E7681', fontStyle: 'italic', padding: '6px 28px' }}>Empty folder</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Unfiled requests — grouped under collection name */}
                        {endpoints.filter(r => !r.folderId).length > 0 && rootFolders.length > 0 && (
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
                        )}
                        <div
                            onDragOver={(e) => { if (localDraggedIdx !== null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverFolderId('ROOT'); } }}
                            onDragLeave={() => setDragOverFolderId(prev => prev === 'ROOT' ? null : prev)}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (localDraggedIdx !== null) {
                                    onMoveRequestToFolder(localDraggedIdx, null);
                                }
                                setLocalDraggedIdx(null); setDragOverFolderId(null);
                            }}
                            style={{ borderRadius: 6, background: dragOverFolderId === 'ROOT' ? 'rgba(36,157,159,0.1)' : undefined, outline: dragOverFolderId === 'ROOT' ? '1px dashed #249d9f' : undefined, minHeight: 24, padding: 2 }}
                        >
                            {endpoints.filter(r => !r.folderId).map((ep) => renderEndpoint(ep, endpoints.indexOf(ep)))}
                        </div>
                        {/* Always-visible "drop to unfile" zone while dragging */}
                        {localDraggedIdx !== null && endpoints[localDraggedIdx]?.folderId && (
                            <div
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverFolderId('ROOT'); }}
                                onDragLeave={() => setDragOverFolderId(prev => prev === 'ROOT' ? null : prev)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (localDraggedIdx !== null) {
                                        onMoveRequestToFolder(localDraggedIdx, null);
                                    }
                                    setLocalDraggedIdx(null); setDragOverFolderId(null);
                                }}
                                style={{
                                    marginTop: 8, padding: '14px 12px', borderRadius: 8,
                                    border: `2px dashed ${dragOverFolderId === 'ROOT' ? '#249d9f' : '#30363D'}`,
                                    background: dragOverFolderId === 'ROOT' ? 'rgba(36,157,159,0.1)' : 'transparent',
                                    textAlign: 'center', fontSize: 11, color: dragOverFolderId === 'ROOT' ? '#249d9f' : '#6E7681',
                                    fontWeight: 500, transition: 'all 0.15s',
                                }}
                            >
                                ↓ Drop here to unfile (move to root)
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selection Mode Actions */}
            {isSelectionMode && !isCollapsed && selectedRequestIds.size > 0 && (
                <div className={`p-3 border-t ${borderCol} bg-[#1a7a7c]/10 animate-in slide-in-from-bottom-2`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase text-[#2ec4c7]">{selectedRequestIds.size} Selected</span>
                        <button onClick={() => setSelectedRequestIds(new Set())} className="text-[9px] font-bold text-gray-500 hover:text-white uppercase">Clear</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 relative">
                        <button 
                            onClick={() => setShowBulkMoveMenu(!showBulkMoveMenu)}
                            className="flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] font-bold text-gray-300 transition-all border border-white/5"
                        >
                            <Move size={12} /> MOVE
                        </button>
                        <button 
                            onClick={() => { if (onBulkDelete) onBulkDelete(Array.from(selectedRequestIds)); setIsSelectionMode(false); }}
                            className="flex items-center justify-center gap-1.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-[10px] font-bold text-red-400 transition-all border border-red-500/20"
                        >
                            <Trash2 size={12} /> DELETE
                        </button>

                        {/* Bulk Move Menu */}
                        {showBulkMoveMenu && (
                            <div className={`absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto rounded-xl border ${borderCol} ${isDark ? 'bg-[#1a1b26]' : 'bg-white'} shadow-2xl z-50 py-1`}>
                                <button 
                                    onClick={() => { if (onBulkMove) onBulkMove(Array.from(selectedRequestIds), null); setIsSelectionMode(false); setShowBulkMoveMenu(false); }}
                                    className={`w-full px-3 py-2 text-[10px] font-bold text-left flex items-center gap-2 ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <Folder size={12} className="text-gray-500" /> [Root]
                                </button>
                                {folders.map(f => (
                                    <button 
                                        key={f.id}
                                        onClick={() => { if (onBulkMove) onBulkMove(Array.from(selectedRequestIds), f.id); setIsSelectionMode(false); setShowBulkMoveMenu(false); }}
                                        className={`w-full px-3 py-2 text-[10px] font-bold text-left flex items-center gap-2 ${isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                                    >
                                        <Folder size={12} className="text-[#2ec4c7]" /> {f.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer — workspace status only (AI toggle moved to toolbar) */}
            {!isCollapsed && (
                <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    {activeUsers.length > 0 && (
                        <div className="flex -space-x-2 overflow-hidden">
                            {activeUsers.slice(0, 5).map((u) => (
                                <div key={u.id} style={{ width: 22, height: 22, borderRadius: 11, border: '2px solid #161B22', background: '#249d9f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'white' }} title={u.name || u.email}>
                                    {u.avatarUrl ? <img src={u.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: 11, objectFit: 'cover' }} /> : (u.name || 'U').charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 600, color: '#6E7681', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                        <div style={{ width: 5, height: 5, borderRadius: 3, background: '#3FB950' }} />
                        Live
                    </div>
                </div>
            )}

            <ImportCurlModal 
                isOpen={isImportOpen} 
                onClose={() => setIsImportOpen(false)} 
                onImport={(data) => { onAddRequest(data); setIsImportOpen(false); }} 
            />
        </div>
    );
};

export const Sidebar = memo(SidebarComponent);
