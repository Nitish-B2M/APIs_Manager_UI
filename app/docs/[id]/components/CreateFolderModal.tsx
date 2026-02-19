'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Folder } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { createFolderSchema, Folder as FolderType } from '@/types';
import { ZodError } from 'zod';

interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description?: string; parentId?: string | null }) => Promise<void>;
    parentFolder?: FolderType | null;
    editingFolder?: FolderType | null;
}

interface FormErrors {
    name?: string;
    description?: string;
}

export default function CreateFolderModal({
    isOpen,
    onClose,
    onSubmit,
    parentFolder,
    editingFolder
}: CreateFolderModalProps) {
    const { theme } = useTheme();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    // Theme colors following existing pattern
    const secondaryBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const inputBg = theme === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
    const inputErrorBg = theme === 'dark' ? 'bg-gray-900 border-red-500 text-white' : 'bg-gray-50 border-red-500 text-gray-900';

    // Reset form when modal opens/closes or editing folder changes
    useEffect(() => {
        if (isOpen) {
            if (editingFolder) {
                setName(editingFolder.name);
                setDescription(editingFolder.description || '');
            } else {
                setName('New Folder');
                setDescription('');
            }
            setFormErrors({});
        }
    }, [isOpen, editingFolder]);

    // Clear errors when typing
    useEffect(() => {
        if (name && formErrors.name) {
            setFormErrors(prev => ({ ...prev, name: undefined }));
        }
    }, [name, formErrors.name]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    const validateForm = (): boolean => {
        try {
            createFolderSchema.parse({ name, description: description || undefined });
            setFormErrors({});
            return true;
        } catch (error) {
            if (error instanceof ZodError) {
                const fieldErrors: FormErrors = {};
                error.errors.forEach((err) => {
                    const field = err.path[0] as keyof FormErrors;
                    if (!fieldErrors[field]) {
                        fieldErrors[field] = err.message;
                    }
                });
                setFormErrors(fieldErrors);
            }
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit({
                name: name.trim(),
                description: description.trim() || undefined,
                parentId: parentFolder?.id || null
            });
            onClose();
        } catch (error) {
            console.error('Failed to save folder:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const title = editingFolder ? 'Edit Folder' : (parentFolder ? 'Create Subfolder' : 'Create Folder');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`${secondaryBg} border ${borderCol} rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex justify-between items-center p-4 border-b ${borderCol}`}>
                    <div className="flex items-center gap-2">
                        <Folder size={20} className={theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'} />
                        <h3 className={`text-xl font-semibold ${textColor}`}>{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className={`${subTextColor} hover:${textColor} transition-colors p-1 rounded-md ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4" noValidate>
                    {/* Parent folder indicator */}
                    {parentFolder && (
                        <div className={`text-xs ${subTextColor} flex items-center gap-1`}>
                            <span>Inside:</span>
                            <span className={`font-medium ${textColor}`}>{parentFolder.name}</span>
                        </div>
                    )}

                    {/* Folder Name */}
                    <div>
                        <label htmlFor="folder-name" className={`block text-sm font-medium ${subTextColor} mb-1`}>
                            Folder Name
                        </label>
                        <input
                            id="folder-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. User Endpoints"
                            className={`w-full rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${formErrors.name ? inputErrorBg : inputBg}`}
                            autoFocus
                            aria-invalid={!!formErrors.name}
                            aria-describedby={formErrors.name ? 'name-error' : undefined}
                        />
                        {formErrors.name && (
                            <div id="name-error" className="flex items-center gap-1.5 text-red-500 text-xs mt-1">
                                <AlertCircle size={12} />
                                <span>{formErrors.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Description (optional) */}
                    <div>
                        <label htmlFor="folder-description" className={`block text-sm font-medium ${subTextColor} mb-1`}>
                            Description <span className={`font-normal ${subTextColor}`}>(optional)</span>
                        </label>
                        <textarea
                            id="folder-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this folder..."
                            rows={2}
                            className={`w-full rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 border resize-none ${inputBg}`}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 text-sm ${subTextColor} hover:text-indigo-500 transition-colors`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? 'Saving...' : (editingFolder ? 'Save Changes' : 'Create Folder')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
