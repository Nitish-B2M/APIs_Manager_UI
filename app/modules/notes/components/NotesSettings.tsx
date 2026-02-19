import React, { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';

interface CustomFont {
    name: string;
    url: string;
    value: string;
}

interface NotesSettingsProps {
    autoSaveEnabled: boolean;
    onToggleAutoSave: () => void;
    customFonts: CustomFont[];
    onAddFont: (font: CustomFont) => void;
    onRemoveFont: (fontName: string) => void;
}

export default function NotesSettings({
    autoSaveEnabled,
    onToggleAutoSave,
    customFonts,
    onAddFont,
    onRemoveFont,
}: NotesSettingsProps) {
    const [newFontName, setNewFontName] = useState('');
    const [newFontUrl, setNewFontUrl] = useState('');

    const handleAddFont = () => {
        if (!newFontName.trim() || !newFontUrl.trim()) return;

        try {
            new URL(newFontUrl);
        } catch {
            alert('Please enter a valid URL');
            return;
        }

        onAddFont({
            name: newFontName.trim(),
            url: newFontUrl.trim(),
            value: `${newFontName.trim()}, sans-serif`,
        });

        setNewFontName('');
        setNewFontUrl('');
    };

    return (
        <div className="notes-main p-8 overflow-y-auto bg-[var(--notes-bg)] text-[var(--notes-text)]">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8 border-b border-[var(--notes-border)] pb-4">
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Settings className="w-8 h-8 text-[var(--notes-accent)]" />
                        Settings
                    </h1>
                    <p className="text-[var(--notes-text-secondary)] mt-1">
                        Manage your preferences and customization.
                    </p>
                </header>

                <div className="space-y-12">
                    {/* General Section */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-[var(--notes-text-secondary)] text-sm">
                            General
                        </h2>
                        <div className="bg-[var(--notes-surface)] rounded-xl border border-[var(--notes-border)] p-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <div className="flex flex-col">
                                    <span className="font-medium text-[var(--notes-text)]">Auto-save changes</span>
                                    <span className="text-sm text-[var(--notes-text-secondary)]">
                                        Automatically save your notes as you type
                                    </span>
                                </div>
                                <div className="relative inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={autoSaveEnabled}
                                        onChange={onToggleAutoSave}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--notes-accent)] rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[var(--notes-accent)]"></div>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* Custom Fonts Section */}
                    <section>
                        <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-[var(--notes-text-secondary)] text-sm">
                            Custom Fonts
                        </h2>

                        <div className="bg-[var(--notes-surface)] rounded-xl border border-[var(--notes-border)] p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-[var(--notes-text-secondary)]">Font Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Lobster"
                                        className="w-full px-4 py-2 rounded-lg border border-[var(--notes-border)] bg-[var(--notes-bg)] text-[var(--notes-text)] focus:outline-none focus:ring-2 focus:ring-[var(--notes-accent)] transition-all"
                                        value={newFontName}
                                        onChange={(e) => setNewFontName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-[var(--notes-text-secondary)]">Font URL (CSS)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., https://fonts.googleapis.com..."
                                        className="w-full px-4 py-2 rounded-lg border border-[var(--notes-border)] bg-[var(--notes-bg)] text-[var(--notes-text)] focus:outline-none focus:ring-2 focus:ring-[var(--notes-accent)] transition-all"
                                        value={newFontUrl}
                                        onChange={(e) => setNewFontUrl(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAddFont}
                                disabled={!newFontName || !newFontUrl}
                                className="w-full md:w-auto px-6 py-2 bg-[var(--notes-accent)] text-white rounded-lg font-medium hover:bg-[var(--notes-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={18} /> Add Font
                            </button>

                            <div className="pt-4 border-t border-[var(--notes-border)]">
                                <h3 className="text-sm font-medium mb-3 text-[var(--notes-text-secondary)]">Installed Fonts</h3>
                                <div className="space-y-2">
                                    {customFonts.length === 0 && (
                                        <p className="text-sm text-[var(--notes-text-secondary)] italic">No custom fonts added yet.</p>
                                    )}
                                    {customFonts.map((font) => (
                                        <div key={font.name} className="flex items-center justify-between p-3 bg-[var(--notes-bg)] rounded-lg border border-[var(--notes-border)] group hover:border-[var(--notes-accent)] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-[var(--notes-accent-light)] text-[var(--notes-accent)] flex items-center justify-center font-bold text-xs">
                                                    Aa
                                                </div>
                                                <span className="font-medium text-[var(--notes-text)]">{font.name}</span>
                                            </div>
                                            <button
                                                onClick={() => onRemoveFont(font.name)}
                                                className="p-2 text-[var(--notes-text-secondary)] hover:text-[var(--notes-danger)] hover:bg-[var(--notes-danger)]/10 rounded-full transition-all"
                                                title="Remove Font"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
