'use client';

import React, { useRef } from 'react';
import { Trash2, Plus, Upload, FileText } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';
import { FormDataField } from '@/types';

interface FormDataEditorProps {
    fields: FormDataField[];
    canEdit: boolean;
    onChange: (fields: FormDataField[]) => void;
}

export function FormDataEditor({ fields, canEdit, onChange }: FormDataEditorProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);
    const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

    const handleAddField = () => {
        onChange([...fields, { key: '', value: '', type: 'text' }]);
    };

    const handleRemoveField = (i: number) => {
        onChange(fields.filter((_, idx) => idx !== i));
    };

    const handleUpdateField = (i: number, updates: Partial<FormDataField>) => {
        const next = [...fields];
        next[i] = { ...next[i], ...updates };
        // Clear file when switching to text
        if (updates.type === 'text') {
            next[i].file = null;
            next[i].value = '';
        }
        if (updates.type === 'file') {
            next[i].value = '';
        }
        onChange(next);
    };

    const handleFileSelect = (i: number, file: File | null) => {
        const next = [...fields];
        next[i] = { ...next[i], file, value: file?.name || '' };
        onChange(next);
    };

    return (
        <div className="space-y-2 p-4 min-h-[200px]">
            <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${themeClasses.subTextColor}`}>
                    Form Data Fields
                </span>
                {canEdit && (
                    <button
                        onClick={handleAddField}
                        className="text-[10px] text-indigo-400 font-bold hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                        <Plus size={10} /> ADD FIELD
                    </button>
                )}
            </div>

            {fields.length === 0 && (
                <div className={`text-center py-8 ${themeClasses.subTextColor}`}>
                    <Upload size={24} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No form data fields yet</p>
                    {canEdit && (
                        <button
                            onClick={handleAddField}
                            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                        >
                            + Add your first field
                        </button>
                    )}
                </div>
            )}

            {fields.map((field, i) => (
                <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${theme === 'dark'
                        ? 'bg-[#1e1e36] border-gray-800'
                        : 'bg-gray-50 border-gray-200'
                        }`}
                >
                    {/* Type toggle */}
                    <select
                        value={field.type}
                        disabled={!canEdit}
                        onChange={(e) => handleUpdateField(i, { type: e.target.value as 'text' | 'file' })}
                        className={`text-[10px] font-bold px-1.5 py-1 rounded border ${theme === 'dark'
                            ? 'bg-[#2a2a3e] border-gray-700 text-gray-300'
                            : 'bg-white border-gray-300 text-gray-600'
                            } outline-none cursor-pointer`}
                    >
                        <option value="text">Text</option>
                        <option value="file">File</option>
                    </select>

                    {/* Key input */}
                    <input
                        value={field.key}
                        readOnly={!canEdit}
                        onChange={(e) => handleUpdateField(i, { key: e.target.value })}
                        placeholder="Key"
                        className={`flex-1 min-w-0 text-xs px-2 py-1 rounded border ${themeClasses.inputBg} ${themeClasses.borderCol} ${themeClasses.textColor} outline-none focus:ring-1 focus:ring-indigo-500`}
                    />

                    {/* Value — text input or file picker */}
                    {field.type === 'text' ? (
                        <input
                            value={field.value}
                            readOnly={!canEdit}
                            onChange={(e) => handleUpdateField(i, { value: e.target.value })}
                            placeholder="Value"
                            className={`flex-1 min-w-0 text-xs px-2 py-1 rounded border ${themeClasses.inputBg} ${themeClasses.borderCol} ${themeClasses.textColor} outline-none focus:ring-1 focus:ring-indigo-500`}
                        />
                    ) : (
                        <div className="flex-1 flex items-center gap-1.5 min-w-0">
                            <input
                                ref={el => { fileInputRefs.current[i] = el; }}
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileSelect(i, e.target.files?.[0] || null)}
                            />
                            <button
                                onClick={() => fileInputRefs.current[i]?.click()}
                                disabled={!canEdit}
                                className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${theme === 'dark'
                                    ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30'
                                    : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100'
                                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Upload size={10} className="inline mr-1" />
                                Choose
                            </button>
                            {field.file && (
                                <span className={`text-[10px] truncate max-w-[140px] ${themeClasses.subTextColor} flex items-center gap-1`}>
                                    <FileText size={10} />
                                    {field.file.name}
                                </span>
                            )}
                            {!field.file && field.value && (
                                <span className={`text-[10px] truncate max-w-[140px] ${themeClasses.subTextColor}`}>
                                    {field.value}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Delete button */}
                    {canEdit && (
                        <button
                            onClick={() => handleRemoveField(i)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
