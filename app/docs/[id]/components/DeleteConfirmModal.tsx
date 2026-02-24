'use client';

import React from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { getThemeClasses } from '../utils/theme';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    itemName: string;
    itemType?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, itemName, itemType = 'request', onConfirm, onCancel }: DeleteConfirmModalProps) {
    const { theme } = useTheme();
    const themeClasses = getThemeClasses(theme);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
            <div
                className={`w-[400px] rounded-2xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#1a1a2e] border border-gray-800' : 'bg-white border border-gray-200'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`px-5 py-4 flex items-center gap-3 border-b ${themeClasses.borderCol}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === 'dark' ? 'bg-red-600/20' : 'bg-red-50'
                        }`}>
                        <AlertTriangle size={18} className="text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-sm font-bold ${themeClasses.textColor}`}>Delete {itemType}</h3>
                        <p className={`text-xs ${themeClasses.subTextColor}`}>This action cannot be undone</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className={`p-1.5 rounded-lg ${themeClasses.subTextColor} hover:bg-gray-500/10 transition-colors`}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                    <p className={`text-xs leading-relaxed ${themeClasses.subTextColor}`}>
                        Are you sure you want to delete{' '}
                        <span className={`font-bold ${themeClasses.textColor}`}>
                            {itemName || 'this ' + itemType}
                        </span>
                        ? This will permanently remove it from your collection.
                    </p>
                </div>

                {/* Actions */}
                <div className={`px-5 py-3 flex items-center justify-end gap-2 border-t ${themeClasses.borderCol} ${theme === 'dark' ? 'bg-[#16162a]' : 'bg-gray-50'
                    }`}>
                    <button
                        onClick={onCancel}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${theme === 'dark'
                                ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-md shadow-red-600/20 flex items-center gap-1.5"
                    >
                        <Trash2 size={12} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
