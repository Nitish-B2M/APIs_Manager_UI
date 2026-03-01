'use client';

import React from 'react';
import { NoteListItem } from '../utils/api';
import { StickyNote, Trash2, FileText, Pin } from 'lucide-react';

interface NotesListProps {
    notes: NoteListItem[];
    activeId: string | null;
    collapsed: boolean;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onPin?: (id: string) => void;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function NotesList({ notes, activeId, collapsed, onSelect, onDelete, onPin }: NotesListProps) {
    if (notes.length === 0) {
        return (
            <div className={`notes-list-empty ${collapsed ? 'collapsed' : ''}`}>
                <FileText size={collapsed ? 24 : 48} />
                {!collapsed && <p>No notes yet.<br />Create your first note!</p>}
            </div>
        );
    }

    return (
        <div className={`notes-list ${collapsed ? 'collapsed' : ''}`}>
            {notes.map((note) => (
                <div
                    key={note.id}
                    className={`note-card ${activeId === note.id ? 'active' : ''} border border-transparent`}
                    onClick={() => onSelect(note.id)}
                    title={collapsed ? note.title || 'Untitled Note' : undefined}
                >
                    <div className="note-card-title flex items-center gap-3">
                        {note.is_pinned && <Pin size={12} className="text-violet-400 flex-shrink-0" style={{ transform: 'rotate(45deg)' }} />}
                        <StickyNote size={16} className={`note-icon ${activeId === note.id ? 'text-violet-400' : 'text-slate-400'}`} />
                        {!collapsed && <span className={`text-[14px] font-semibold truncate ${activeId === note.id ? 'text-white' : 'text-slate-300'}`}>{note.title || 'Untitled Note'}</span>}
                    </div>
                    {!collapsed && <div className="note-card-date text-[11px] text-slate-500 mt-1 font-medium">{formatDate(note.updatedAt)}</div>}

                    {!collapsed && (
                        <div className="note-card-actions">
                            {onPin && (
                                <button
                                    className="note-card-action-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPin(note.id);
                                    }}
                                    title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                                >
                                    <Pin size={14} className={note.is_pinned ? 'text-amber-500' : ''} />
                                </button>
                            )}
                            <button
                                className="note-card-action-btn danger"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(note.id);
                                }}
                                title="Delete note"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
