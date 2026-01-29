'use client';

import { X, Keyboard } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { SHORTCUT_DEFINITIONS } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    const { theme } = useTheme();

    if (!isOpen) return null;

    const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
    const textColor = theme === 'dark' ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
    const kbdBg = theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-gray-100 border-gray-300';

    // Group shortcuts by category
    const groupedShortcuts = SHORTCUT_DEFINITIONS.reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, typeof SHORTCUT_DEFINITIONS>);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className={`relative w-full max-w-lg ${bgColor} rounded-2xl shadow-2xl border ${borderCol} overflow-hidden`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${borderCol}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-indigo-600/20' : 'bg-indigo-50'}`}>
                            <Keyboard size={20} className="text-indigo-500" />
                        </div>
                        <div>
                            <h2 className={`font-bold ${textColor}`}>Keyboard Shortcuts</h2>
                            <p className={`text-xs ${subTextColor}`}>Quick actions to boost your productivity</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className={`p-2 rounded-lg ${subTextColor} hover:bg-gray-500/10 transition-colors`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                        <div key={category} className="mb-6 last:mb-0">
                            <h3 className={`text-xs font-bold ${subTextColor} uppercase tracking-wider mb-3`}>
                                {category}
                            </h3>
                            <div className="space-y-2">
                                {shortcuts.map((shortcut, idx) => (
                                    <div 
                                        key={idx}
                                        className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}
                                    >
                                        <span className={`text-sm ${textColor}`}>{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIdx) => (
                                                <span key={keyIdx} className="flex items-center gap-1">
                                                    <kbd className={`px-2 py-1 text-xs font-mono rounded border ${kbdBg} ${textColor} min-w-[28px] text-center`}>
                                                        {key}
                                                    </kbd>
                                                    {keyIdx < shortcut.keys.length - 1 && (
                                                        <span className={`text-xs ${subTextColor}`}>+</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${borderCol} ${theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${subTextColor} text-center`}>
                        Press <kbd className={`px-1.5 py-0.5 rounded ${kbdBg} text-[10px]`}>Esc</kbd> to close this modal
                    </p>
                </div>
            </div>
        </div>
    );
}
