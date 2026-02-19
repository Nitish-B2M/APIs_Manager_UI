'use client';

import React, { memo, useState } from 'react';
import { 
    ChevronRight, 
    ChevronDown, 
    Folder, 
    FolderOpen,
    MoreVertical,
    Edit3,
    Trash2,
    FolderPlus
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Folder as FolderType, Endpoint, HttpMethod } from '@/types';

interface FolderItemProps {
    folder: FolderType;
    requests: Endpoint[];
    childFolders: FolderType[];
    allFolders: FolderType[];
    allRequests: Endpoint[];
    selectedRequestIdx: number;
    selectedRequestId?: string;
    isExpanded: boolean;
    canEdit: boolean;
    onToggleExpand: (folderId: string) => void;
    onSelectRequest: (idx: number) => void;
    onEditFolder: (folder: FolderType) => void;
    onDeleteFolder: (folder: FolderType) => void;
    onAddSubfolder: (parentId: string) => void;
    onDragStartRequest: (idx: number) => void;
    onDragOverRequest: (e: React.DragEvent, idx: number) => void;
    onDragEndRequest: () => void;
    onDropOnFolder: (folderId: string | null) => void;
    draggedRequestIdx: number | null;
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

function FolderItemComponent({
    folder,
    requests,
    childFolders,
    allFolders,
    allRequests,
    selectedRequestIdx,
    selectedRequestId,
    isExpanded,
    canEdit,
    onToggleExpand,
    onSelectRequest,
    onEditFolder,
    onDeleteFolder,
    onAddSubfolder,
    onDragStartRequest,
    onDragOverRequest,
    onDragEndRequest,
    onDropOnFolder,
    draggedRequestIdx,
}: FolderItemProps) {
    const { theme } = useTheme();
    const [showMenu, setShowMenu] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    // Theme colors following existing pattern
    const secondaryBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const hoverBg = theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100';
    const folderBg = theme === 'dark' ? 'bg-gray-750' : 'bg-gray-50';
    const dragOverBg = theme === 'dark' ? 'bg-indigo-600/20' : 'bg-indigo-50';

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        onDropOnFolder(folder.id);
    };

    // Get child folders for this folder
    const children = childFolders.filter(f => f.parentId === folder.id);
    // Get requests in this folder
    const folderRequests = requests.filter(r => r.folderId === folder.id);

    return (
        <div className="select-none">
            {/* Folder Header */}
            <div
                className={`group flex items-center justify-between px-2 py-1.5 cursor-pointer transition-all ${hoverBg} ${isDragOver ? dragOverBg : ''}`}
                onClick={() => onToggleExpand(folder.id)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                    <span className={subTextColor}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                    <span className={theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}>
                        {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
                    </span>
                    <span className={`truncate text-[11px] font-medium ${textColor}`}>
                        {folder.name}
                    </span>
                    <span className={`text-[9px] ${subTextColor}`}>
                        ({folderRequests.length})
                    </span>
                </div>

                {canEdit && (
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${subTextColor} ${hoverBg}`}
                        >
                            <MoreVertical size={12} />
                        </button>

                        {showMenu && (
                            <div
                                className={`absolute right-0 top-full mt-1 w-36 ${secondaryBg} border ${borderCol} rounded-lg shadow-xl z-50 py-1 text-[10px]`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => {
                                        onAddSubfolder(folder.id);
                                        setShowMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                                >
                                    <FolderPlus size={12} className={theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'} /> Add Subfolder
                                </button>
                                <button
                                    onClick={() => {
                                        onEditFolder(folder);
                                        setShowMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 ${hoverBg} flex items-center gap-2 ${textColor}`}
                                >
                                    <Edit3 size={12} className="text-blue-500" /> Rename
                                </button>
                                <div className={`h-px ${borderCol} my-1 opacity-50`} />
                                <button
                                    onClick={() => {
                                        onDeleteFolder(folder);
                                        setShowMenu(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 hover:bg-red-500/10 text-red-500 flex items-center gap-2`}
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
                    {/* Child Folders */}
                    {children.map((childFolder) => (
                        <FolderItemComponent
                            key={childFolder.id}
                            folder={childFolder}
                            requests={allRequests}
                            childFolders={allFolders}
                            allFolders={allFolders}
                            allRequests={allRequests}
                            selectedRequestIdx={selectedRequestIdx}
                            selectedRequestId={selectedRequestId}
                            isExpanded={true}
                            canEdit={canEdit}
                            onToggleExpand={onToggleExpand}
                            onSelectRequest={onSelectRequest}
                            onEditFolder={onEditFolder}
                            onDeleteFolder={onDeleteFolder}
                            onAddSubfolder={onAddSubfolder}
                            onDragStartRequest={onDragStartRequest}
                            onDragOverRequest={onDragOverRequest}
                            onDragEndRequest={onDragEndRequest}
                            onDropOnFolder={onDropOnFolder}
                            draggedRequestIdx={draggedRequestIdx}
                        />
                    ))}

                    {/* Requests in this folder */}
                    {folderRequests.map((request) => {
                        const globalIdx = allRequests.findIndex(r => r.id === request.id);
                        const isSelected = selectedRequestId ? request.id === selectedRequestId : globalIdx === selectedRequestIdx;

                        return (
                            <div
                                key={request.id || globalIdx}
                                onClick={() => onSelectRequest(globalIdx)}
                                draggable={canEdit}
                                onDragStart={() => canEdit && onDragStartRequest(globalIdx)}
                                onDragOver={(e) => canEdit && onDragOverRequest(e, globalIdx)}
                                onDragEnd={() => canEdit && onDragEndRequest()}
                                className={`group flex items-center gap-2 px-2 py-1.5 cursor-pointer border-l-2 transition-all ${
                                    isSelected
                                        ? theme === 'dark'
                                            ? 'bg-indigo-600/20 border-indigo-500'
                                            : 'bg-indigo-50 border-indigo-500'
                                        : `border-transparent ${hoverBg}`
                                } ${draggedRequestIdx === globalIdx ? 'opacity-50' : ''}`}
                            >
                                <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-10 text-center flex-shrink-0 ${getMethodColor(request.method)}`}>
                                    {request.method}
                                </span>
                                <span className={`truncate text-[11px] ${
                                    isSelected
                                        ? `font-bold ${textColor}`
                                        : subTextColor
                                }`}>
                                    {request.name || 'Untitled'}
                                </span>
                            </div>
                        );
                    })}

                    {/* Empty folder message */}
                    {folderRequests.length === 0 && children.length === 0 && (
                        <div className={`px-3 py-2 text-[10px] ${subTextColor} italic`}>
                            Drag requests here
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export const FolderItem = memo(FolderItemComponent);
