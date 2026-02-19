'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { StickyNote, Plus, FileText, Save, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import NotesList from './components/NotesList';
import NotesEditor from './components/NotesEditor';
import NotesSettings from './components/NotesSettings';
import NotesTabs from './components/NotesTabs';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import {
    fetchNotes, fetchNote, createNote, updateNote, deleteNote, pinNote,
    NoteListItem, NoteDetail,
} from './utils/api';
import './notes.css';

function isNoteDetail(note: NoteDetail | { id: string; title: string } | null): note is NoteDetail {
    return note !== null && 'content_json' in note;
}

export default function NotesPage() {
    const [notes, setNotes] = useState<NoteListItem[]>([]);
    const [openNotes, setOpenNotes] = useState<(NoteDetail | { id: string; title: string; })[]>([]);
    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

    // Sidebar State
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; noteId: string | null; noteTitle: string }>({
        isOpen: false,
        noteId: null,
        noteTitle: ''
    });

    // Debounce autosave
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Derived active note
    const activeNote = useMemo(() =>
        openNotes.find(n => n.id === activeNoteId) || null
        , [openNotes, activeNoteId]);

    // --- Load Persistence & Notes ---
    useEffect(() => {
        // 1. Load AutoSave Preference
        const savedAutoSave = localStorage.getItem('notes_autosave');
        if (savedAutoSave !== null) {
            setAutoSaveEnabled(savedAutoSave === 'true');
        }

        // Load Sidebar Preference
        const savedCollapsed = localStorage.getItem('notes_sidebar_collapsed');
        if (savedCollapsed !== null) {
            setIsSidebarCollapsed(savedCollapsed === 'true');
        }

        // 2. Fetch all notes list
        fetchNotes().then(data => {
            setNotes(data);
            setLoading(false);
        }).catch(() => {
            toast.error('Failed to load notes');
            setLoading(false);
        });

        // 3. Restore Open Tabs
        const savedOpenIds = localStorage.getItem('notes_open_tabs');
        const savedActiveId = localStorage.getItem('notes_active_id');

        if (savedOpenIds) {
            try {
                const ids = JSON.parse(savedOpenIds) as string[];
                if (Array.isArray(ids) && ids.length > 0) {
                    // Fetch details for these notes
                    Promise.all(ids.map(id => fetchNote(id)))
                        .then(details => {
                            setOpenNotes(details);
                            if (savedActiveId && ids.includes(savedActiveId)) {
                                setActiveNoteId(savedActiveId);
                            } else if (details.length > 0) {
                                setActiveNoteId(details[0].id);
                            }
                        })
                        .catch(() => {
                            console.warn('Failed to restore some open tabs');
                        });
                }
            } catch (e) {
                console.error('Failed to parse saved tabs', e);
            }
        }
    }, []);

    // --- Persist Tabs on Change ---
    useEffect(() => {
        if (!loading) {
            const ids = openNotes.map(n => n.id);
            localStorage.setItem('notes_open_tabs', JSON.stringify(ids));
        }
    }, [openNotes, loading]);

    useEffect(() => {
        if (!loading && activeNoteId) {
            localStorage.setItem('notes_active_id', activeNoteId);
        }
    }, [activeNoteId, loading]);

    // --- Toggle AutoSave ---
    const toggleAutoSave = () => {
        const newValue = !autoSaveEnabled;
        setAutoSaveEnabled(newValue);
        localStorage.setItem('notes_autosave', String(newValue));
        toast.success(`Auto-save ${newValue ? 'enabled' : 'disabled'}`);
    };

    // --- Toggle Sidebar ---
    const toggleSidebar = () => {
        const newValue = !isSidebarCollapsed;
        setIsSidebarCollapsed(newValue);
        localStorage.setItem('notes_sidebar_collapsed', String(newValue));
    };

    // --- Manual Save ---
    const handleManualSave = async () => {
        if (!activeNote || !isNoteDetail(activeNote)) return;
        setSaving(true);
        try {
            await updateNote(activeNote.id, {
                content_json: activeNote.content_json,
                content_html: activeNote.content_html,
                title: activeNote.title
            });
            // Update list's updatedAt
            setNotes((prev) =>
                prev.map((n) => n.id === activeNote.id ? { ...n, updatedAt: new Date().toISOString() } : n)
            );
            toast.success('Saved');
        } catch {
            toast.error('Save failed');
        } finally {
            setSaving(false);
        }
    };

    // --- Handle Content Change (Auto/Manual) ---
    const updateOpenNoteState = useCallback((id: string, updates: Partial<NoteDetail>) => {
        setOpenNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
    }, []);

    const handleContentChange = useCallback((json: any, html: string) => {
        if (!activeNoteId) return;
        const currentId = activeNoteId;

        // Optimistic UI update
        updateOpenNoteState(currentId, { content_json: json, content_html: html });

        // Auto Save Logic
        if (autoSaveEnabled) {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(async () => {
                setSaving(true);
                try {
                    await updateNote(currentId, { content_json: json, content_html: html });
                    setNotes((prev) =>
                        prev.map((n) => n.id === currentId ? { ...n, updatedAt: new Date().toISOString() } : n)
                    );
                } catch {
                    // silent fail on debounce
                } finally {
                    setSaving(false);
                }
            }, 1500);
        }
    }, [activeNoteId, updateOpenNoteState, autoSaveEnabled]);

    const handleTitleChange = useCallback((title: string) => {
        if (!activeNoteId) return;
        const currentId = activeNoteId;

        updateOpenNoteState(currentId, { title });
        setNotes((prev) =>
            prev.map((n) => n.id === currentId ? { ...n, title } : n)
        );

        if (autoSaveEnabled) {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(async () => {
                setSaving(true);
                try {
                    await updateNote(currentId, { title });
                } catch { } finally { setSaving(false); }
            }, 1500);
        }
    }, [activeNoteId, updateOpenNoteState, autoSaveEnabled]);

    // --- Select note (Open in tab) ---
    const handleSelect = useCallback(async (id: string) => {
        if (openNotes.some(n => n.id === id)) {
            setActiveNoteId(id);
            return;
        }

        try {
            const detail = await fetchNote(id);
            setOpenNotes(prev => [...prev, detail]);
            setActiveNoteId(id);
        } catch {
            toast.error('Failed to load note');
        }
    }, [openNotes]);

    // --- Close Tab ---
    const handleCloseTab = useCallback((id: string) => {
        setOpenNotes(prev => {
            const newNotes = prev.filter(n => n.id !== id);

            if (id === activeNoteId) {
                const newActiveId = newNotes.length > 0 ? newNotes[newNotes.length - 1].id : null;
                setActiveNoteId(newActiveId);
            }

            return newNotes;
        });
    }, [activeNoteId]);

    // --- Create note ---
    const handleCreate = useCallback(async () => {
        try {
            const newNote = await createNote({ title: 'Untitled Note' });
            setNotes((prev) => [
                { id: newNote.id, title: newNote.title, default_font: newNote.default_font, createdAt: newNote.createdAt, updatedAt: newNote.updatedAt },
                ...prev,
            ]);
            setOpenNotes(prev => [...prev, newNote]);
            setActiveNoteId(newNote.id);
            toast.success('Note created');
        } catch {
            toast.error('Failed to create note');
        }
    }, []);

    // --- Delete Flow ---
    const confirmDelete = (id: string) => {
        const note = notes.find(n => n.id === id);
        if (note) {
            setDeleteModal({ isOpen: true, noteId: id, noteTitle: note.title || 'Untitled Note' });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal.noteId) return;
        const id = deleteModal.noteId;

        try {
            await deleteNote(id);
            setNotes((prev) => prev.filter((n) => n.id !== id));

            setOpenNotes(prev => {
                const newNotes = prev.filter(n => n.id !== id);
                if (id === activeNoteId) {
                    const newActiveId = newNotes.length > 0 ? newNotes[newNotes.length - 1].id : null;
                    setActiveNoteId(newActiveId);
                }
                return newNotes;
            });

            toast.success('Note deleted');
        } catch {
            toast.error('Failed to delete note');
        } finally {
            setDeleteModal({ isOpen: false, noteId: null, noteTitle: '' });
        }
    };

    // --- Pin/Unpin Note ---
    const handlePinNote = useCallback(async (id: string) => {
        const noteToPin = notes.find(n => n.id === id);
        if (!noteToPin) return;

        // Check limit if we are pinning (currently not pinned)
        if (!noteToPin.is_pinned) {
            const pinnedCount = notes.filter(n => n.is_pinned).length;
            if (pinnedCount >= 3) {
                toast.error('You can only pin up to 3 notes');
                return;
            }
        }

        try {
            const result = await pinNote(id);
            // Update the local notes list with new pin state
            setNotes(prev => {
                const updated = prev.map(n =>
                    n.id === id ? { ...n, is_pinned: result.is_pinned } : n
                );
                // Re-sort: pinned first (by updated), then others (by updated)
                return updated.sort((a, b) => {
                    if (a.is_pinned && !b.is_pinned) {
                        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                    }
                    if (a.is_pinned && !b.is_pinned) return -1;
                    if (!a.is_pinned && b.is_pinned) return 1;
                    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
                });
            });
            toast.success(result.is_pinned ? 'Note pinned' : 'Note unpinned');
        } catch {
            toast.error('Failed to pin note');
        }
    }, [notes]);

    const handleFontChange = useCallback((font: string) => {
        if (!activeNoteId) return;
        updateOpenNoteState(activeNoteId, { default_font: font });
        updateNote(activeNoteId, { default_font: font }).catch(() => { });
    }, [activeNoteId, updateOpenNoteState]);

    // --- Settings & Custom Fonts (Preserved) ---
    const [customFonts, setCustomFonts] = useState<{ name: string; value: string; url: string }[]>([]);

    useEffect(() => {
        const savedFonts = localStorage.getItem('notes_custom_fonts');
        if (savedFonts) {
            try {
                const parsed = JSON.parse(savedFonts);
                if (Array.isArray(parsed)) {
                    setCustomFonts(parsed);
                }
            } catch (e) {
                console.error('Failed to parse custom fonts', e);
            }
        }
    }, []);

    // Inject styles for custom fonts
    useEffect(() => {
        customFonts.forEach(font => {
            if (!document.querySelector(`link[href="${font.url}"]`)) {
                const link = document.createElement('link');
                link.href = font.url;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
        });
    }, [customFonts]);

    const handleAddFont = (font: { name: string; url: string; value: string }) => {
        const newFonts = [...customFonts, font];
        setCustomFonts(newFonts);
        localStorage.setItem('notes_custom_fonts', JSON.stringify(newFonts));
    };

    const handleRemoveFont = (fontName: string) => {
        const newFonts = customFonts.filter(f => f.name !== fontName);
        setCustomFonts(newFonts);
        localStorage.setItem('notes_custom_fonts', JSON.stringify(newFonts));
    };

    const fontOptions = [
        { label: 'Inter', value: 'Inter, sans-serif' },
        { label: 'Roboto', value: 'Roboto, sans-serif' },
        { label: 'Lora', value: 'Lora, serif' },
        { label: 'Merriweather', value: 'Merriweather, serif' },
        { label: 'Monospace', value: 'ui-monospace, monospace' },
        { label: 'System Default', value: 'inherit' },
        ...customFonts.map(f => ({ label: f.name, value: f.value }))
    ];

    const handleClickSettings = () => {
        const settingsTabId = 'settings';
        if (!openNotes.some(n => n.id === settingsTabId)) {
            setOpenNotes(prev => [...prev, { id: settingsTabId, title: 'Settings' }]);
        }
        setActiveNoteId(settingsTabId);
    };

    return (
        <div className="notes-module">
            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteModal.isOpen}
                noteTitle={deleteModal.noteTitle}
                onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={handleConfirmDelete}
            />

            <div className="notes-layout">
                {/* Sidebar */}
                <div className={`notes-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="notes-sidebar-header">
                        <div className="gap-2 flex items-center">
                            {/* Collapse Toggle */}
                            <button
                                className="notes-icon-btn toggle-sidebar"
                                onClick={toggleSidebar}
                                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                            >
                                {isSidebarCollapsed ? <ChevronRight size={18} /> : <StickyNote size={20} />}
                            </button>

                            {!isSidebarCollapsed && (
                                <div className="notes-sidebar-title">
                                    Notes
                                </div>
                            )}
                        </div>

                        {!isSidebarCollapsed ? (
                            <div className="flex gap-1">
                                <button
                                    className="notes-icon-btn"
                                    onClick={handleClickSettings}
                                    title="Settings"
                                >
                                    <Settings size={18} />
                                </button>
                                <button className="notes-create-btn" onClick={handleCreate}>
                                    <Plus size={14} /> New
                                </button>
                            </div>
                        ) : (
                            // Collapsed Actions
                            <div className="flex flex-col gap-2 mt-2">
                                <button
                                    className="notes-icon-btn"
                                    onClick={handleClickSettings}
                                    title="Settings"
                                >
                                    <Settings size={18} />
                                </button>
                                <button
                                    className="notes-icon-btn"
                                    onClick={handleCreate}
                                    title="New Note"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="notes-list-empty">
                            {!isSidebarCollapsed && <p>Loading...</p>}
                        </div>
                    ) : (
                        <NotesList
                            notes={notes}
                            activeId={activeNoteId}
                            collapsed={isSidebarCollapsed}
                            onSelect={handleSelect}
                            onDelete={confirmDelete}
                            onPin={handlePinNote}
                        />
                    )}
                </div>

                {/* Main */}
                <div className="notes-main">
                    {/* Tabs */}
                    <NotesTabs
                        openNotes={openNotes}
                        activeNoteId={activeNoteId}
                        onSelect={setActiveNoteId}
                        onClose={handleCloseTab}
                    />

                    {/* Manual Save Bar (if AutoSave is OFF) */}
                    {!autoSaveEnabled && activeNote && activeNoteId !== 'settings' && (
                        <div className="flex justify-end px-4 py-2 border-b border-[var(--notes-border)] bg-[var(--notes-surface)]">
                            <button
                                onClick={handleManualSave}
                                disabled={saving}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-white transition-colors
                                    ${saving ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                <Save size={14} />
                                {saving ? 'Saving...' : 'Save Now'}
                            </button>
                        </div>
                    )}

                    {activeNoteId === 'settings' ? (
                        <NotesSettings
                            autoSaveEnabled={autoSaveEnabled}
                            onToggleAutoSave={toggleAutoSave}
                            customFonts={customFonts}
                            onAddFont={handleAddFont}
                            onRemoveFont={handleRemoveFont}
                        />
                    ) : isNoteDetail(activeNote) ? (
                        <>
                            <NotesEditor
                                key={activeNote.id}
                                content={activeNote.content_json}
                                title={activeNote.title}
                                defaultFont={activeNote.default_font}
                                fontOptions={fontOptions}
                                onContentChange={handleContentChange}
                                onTitleChange={handleTitleChange}
                                onFontChange={handleFontChange}
                            />
                            {/* Autosave indicator - Only show if AutoSave is ON */}
                            {autoSaveEnabled && (
                                <div className="notes-autosave" style={{ position: 'absolute', bottom: 16, right: 24 }}>
                                    <span className={`notes-autosave-dot ${saving ? 'saving' : ''}`} />
                                    {saving ? 'Saving...' : 'Saved'}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="notes-main-empty">
                            <FileText size={72} />
                            <p>Select a note or create a new one</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
