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

    const getMethodColor = (method: string) => {
        const colors: Record<string, string> = {
            'GET': 'text-green-500',
            'POST': 'text-blue-500',
            'PUT': 'text-amber-500',
            'DELETE': 'text-red-500',
            'PATCH': 'text-[#249d9f]',
        };
        return colors[method] || 'text-gray-500';
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

        return (
            <div
                key={ep.id}
                draggable={canEdit && !isSelectionMode}
                onDragStart={() => onDragStart(index)}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onClick={(e) => isSelectionMode ? toggleRequestSelection(ep.id || '', e) : onSelectEndpoint(endpoints.indexOf(ep))}
                className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${isActive && !isSelectionMode ? 'bg-[#1a7a7c] text-white shadow-lg' : isSelected ? 'bg-[#249d9f]/20 ring-1 ring-[#249d9f]/30' : 'hover:bg-white/5'}`}
            >
                {otherUsersViewing.length > 0 && !isCollapsed && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex -space-x-1">
                        {otherUsersViewing.slice(0, 2).map(u => (
                            <div key={u.id} className="w-1.5 h-3 rounded-full bg-[#2ec4c7] animate-pulse border border-indigo-900" title={`${u.name} is viewing`} />
                        ))}
                    </div>
                )}

                {isSelectionMode && (
                    <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-[#249d9f] border-[#249d9f]' : 'border-gray-500 bg-white/5'}`}>
                        {isSelected && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                )}
                {canEdit && !isSelectionMode && (
                    <GripVertical size={10} className={`opacity-0 group-hover:opacity-30 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                )}
                <span className={`text-[8px] font-black w-8 flex-shrink-0 ${isActive && !isSelectionMode ? 'text-white' : getMethodColor(ep.method)}`}>{ep.method}</span>
                <span className="text-[11px] truncate flex-1 font-medium">{ep.name}</span>
                
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
            style={{ width: isCollapsed ? '48px' : `${width}px` }}
        >
            {/* Header */}
            <div className={`p-4 border-b ${borderCol} flex flex-col gap-4 ${isDark ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                <div className="flex items-center justify-between">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-6 h-6 rounded-lg bg-[#1a7a7c] flex items-center justify-center flex-shrink-0 shadow-lg">
                                <Database size={14} className="text-white" />
                            </div>
                            <h2 className={`font-bold ${textColor} truncate text-sm tracking-tight`} title={doc.title}>
                                {doc.title}
                            </h2>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <button onClick={onDownloadMarkdown} className={`p-1.5 rounded-lg border ${borderCol} ${inputBg} ${subTextColor} hover:text-emerald-400 transition-all`} title="Download Markdown"><Download size={14} /></button>
                        {(onExportPostman || onExportOpenApi) && (
                            <div className="flex items-center gap-1">
                                {onExportPostman && <button onClick={onExportPostman} className={`p-1.5 rounded-lg border ${borderCol} ${inputBg} ${subTextColor} hover:text-amber-400 transition-all`} title="Export Postman"><Download size={14} /></button>}
                                {onExportOpenApi && <button onClick={onExportOpenApi} className={`p-1.5 rounded-lg border ${borderCol} ${inputBg} ${subTextColor} hover:text-[#2ec4c7] transition-all`} title="Export OpenAPI 3.1"><Zap size={14} /></button>}
                            </div>
                        )}
                        <button
                            onClick={onToggleCollapse}
                            className={`p-1.5 rounded-lg ${subTextColor} hover:bg-white/10 hover:text-[#2ec4c7] transition-all`}
                        >
                            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>
                </div>
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
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-8 pr-3 py-1.5 rounded-lg border ${borderCol} ${inputBg} text-[11px] outline-none focus:ring-1 focus:ring-[#249d9f]/50 transition-all`}
                            placeholder="Filter requests..."
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {!isCollapsed && (
                    <div className="p-2 space-y-1">
                        {/* Folders */}
                        {rootFolders.map(folder => (
                            <div key={folder.id} className="space-y-1">
                                <div
                                    onClick={(e) => toggleFolder(folder.id, e)}
                                    className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all ${expandedFolders.has(folder.id) ? 'bg-white/5' : 'hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <ChevronRight size={12} className={`transition-transform flex-shrink-0 ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`} />
                                        <span className={`text-[11px] font-bold truncate ${textColor}`}>{folder.name}</span>
                                    </div>
                                    {canEdit && !isSelectionMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEditFolder(folder); }}
                                            className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Edit3 size={10} className="text-gray-500" />
                                        </button>
                                    )}
                                </div>
                                {expandedFolders.has(folder.id) && (
                                    <div className="ml-3 border-l border-white/5 pl-2 py-1 space-y-0.5">
                                        {endpoints.filter(e => e.folderId === folder.id).map((ep, i) => renderEndpoint(ep, endpoints.indexOf(ep)))}
                                        {endpoints.filter(e => e.folderId === folder.id).length === 0 && (
                                            <p className="text-[9px] text-gray-600 italic py-1 px-2">Empty folder</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Unfiled Requests */}
                        {endpoints.filter(r => !r.folderId).map((ep, i) => renderEndpoint(ep, endpoints.indexOf(ep)))}
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

            {/* Footer */}
            {!isCollapsed && (
                <div className={`p-3 border-t ${borderCol} flex flex-col gap-3 ${isDark ? 'bg-white/5' : 'bg-gray-50/50'}`}>
                    <button
                        onClick={() => onAiToggle(!aiEnabled)}
                        className={`flex items-center justify-between w-full p-2.5 rounded-xl border transition-all ${aiEnabled
                            ? 'bg-[#1a7a7c]/10 border-[#249d9f]/30 text-[#2ec4c7] shadow-lg shadow-indigo-900/20'
                            : 'bg-black/20 border-white/5 text-gray-500 hover:bg-white/5'}`}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className={aiEnabled ? 'animate-pulse text-[#2ec4c7]' : 'text-gray-600'} />
                            <span className="text-[10px] font-black uppercase tracking-widest">AI Copilot</span>
                        </div>
                        <div className={`w-7 h-4 rounded-full relative transition-colors ${aiEnabled ? 'bg-[#1a7a7c]' : 'bg-gray-800'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${aiEnabled ? 'left-3.5' : 'left-0.5'}`} />
                        </div>
                    </button>

                    {activeUsers.length > 0 && (
                        <div className="flex -space-x-2 overflow-hidden px-1">
                            {activeUsers.slice(0, 5).map((u) => (
                                <div key={u.id} className={`w-6 h-6 rounded-full border-2 ${isDark ? 'border-[#0a0a0b]' : 'border-white'} bg-[#1a7a7c] flex items-center justify-center text-[8px] font-bold text-white shadow-sm`} title={u.name || u.email}>
                                    {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full rounded-full object-cover" /> : (u.name || 'U').charAt(0).toUpperCase()}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1 mt-1">
                        <div className="flex items-center gap-1.5">
                            <Activity size={10} />
                            <span>Workspace</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-green-500 font-black">Live</span>
                        </div>
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
