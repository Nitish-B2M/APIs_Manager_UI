'use client';

import React from 'react';
import { X, StickyNote, Settings } from 'lucide-react';
import { NoteDetail, NoteListItem } from '../utils/api';

interface NotesTabsProps {
    openNotes: (NoteDetail | NoteListItem | { id: string, title: string })[];
    activeNoteId: string | null;
    onSelect: (id: string) => void;
    onClose: (id: string) => void;
}

export default function NotesTabs({ openNotes, activeNoteId, onSelect, onClose }: NotesTabsProps) {
    if (openNotes.length === 0) return null;

    return (
        <div className="notes-tabs-container">
            {openNotes.map((note) => (
                <div
                    key={note.id}
                    className={`notes-tab ${activeNoteId === note.id ? 'active' : ''}`}
                    onClick={() => onSelect(note.id)}
                    title={note.title || 'Untitled Note'}
                >
                    {note.id === 'settings' ? (
                        <Settings size={14} className="notes-tab-icon" />
                    ) : (
                        <StickyNote size={14} className="notes-tab-icon" />
                    )}
                    <span className="notes-tab-title">{note.title || 'Untitled Note'}</span>
                    <button
                        className="notes-tab-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose(note.id);
                        }}
                    >
                        <X size={12} />
                    </button>
                </div>
            ))}
        </div>
    );
}
