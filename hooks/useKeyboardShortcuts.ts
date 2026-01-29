import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    action: () => void;
    description?: string;
    preventDefault?: boolean;
}

interface UseKeyboardShortcutsProps {
    shortcuts: KeyboardShortcut[];
    enabled?: boolean;
}

export function useKeyboardShortcuts({ 
    shortcuts, 
    enabled = true 
}: UseKeyboardShortcutsProps): void {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs (unless it's a global shortcut)
        const target = e.target as HTMLElement;
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

        for (const shortcut of shortcuts) {
            const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = !!shortcut.ctrlKey === (e.ctrlKey || e.metaKey);
            const shiftMatch = !!shortcut.shiftKey === e.shiftKey;
            const altMatch = !!shortcut.altKey === e.altKey;

            if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
                // For Ctrl+key or Alt+key combos, always trigger even in inputs
                if (shortcut.ctrlKey || shortcut.altKey || !isInput) {
                    if (shortcut.preventDefault !== false) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    shortcut.action();
                    return;
                }
            }
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        // Use capture phase to intercept before browser handles it
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);
}

// Predefined common shortcuts
export const createCommonShortcuts = (handlers: {
    onSend?: () => void;
    onSave?: () => void;
    onNewRequest?: () => void;
    onSearch?: () => void;
    onToggleTheme?: () => void;
    onShowShortcuts?: () => void;
}): KeyboardShortcut[] => {
    const shortcuts: KeyboardShortcut[] = [];

    if (handlers.onSend) {
        shortcuts.push({
            key: 'Enter',
            ctrlKey: true,
            action: handlers.onSend,
            description: 'Send Request'
        });
    }

    if (handlers.onSave) {
        shortcuts.push({
            key: 's',
            ctrlKey: true,
            action: handlers.onSave,
            description: 'Save Request'
        });
    }

    if (handlers.onNewRequest) {
        // Use Alt+N instead of Ctrl+N (browser protects Ctrl+N)
        shortcuts.push({
            key: 'n',
            altKey: true,
            action: handlers.onNewRequest,
            description: 'New Request'
        });
    }

    if (handlers.onSearch) {
        shortcuts.push({
            key: 'k',
            ctrlKey: true,
            action: handlers.onSearch,
            description: 'Search Endpoints'
        });
        // Also add Ctrl+P as alternative
        shortcuts.push({
            key: 'p',
            ctrlKey: true,
            action: handlers.onSearch,
            description: 'Search Endpoints'
        });
    }

    if (handlers.onToggleTheme) {
        shortcuts.push({
            key: 'd',
            ctrlKey: true,
            shiftKey: true,
            action: handlers.onToggleTheme,
            description: 'Toggle Dark Mode'
        });
    }

    if (handlers.onShowShortcuts) {
        shortcuts.push({
            key: '/',
            ctrlKey: true,
            action: handlers.onShowShortcuts,
            description: 'Show Keyboard Shortcuts'
        });
    }

    return shortcuts;
};

// Export shortcut definitions for displaying in UI
export const SHORTCUT_DEFINITIONS = [
    { keys: ['Ctrl', 'Enter'], description: 'Send Request', category: 'Request' },
    { keys: ['Ctrl', 'S'], description: 'Save Request', category: 'Request' },
    { keys: ['Alt', 'N'], description: 'New Request', category: 'Request' },
    { keys: ['Ctrl', 'K'], description: 'Search Endpoints', category: 'Navigation' },
    { keys: ['Ctrl', 'P'], description: 'Search Endpoints (Alt)', category: 'Navigation' },
    { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle Dark/Light Mode', category: 'View' },
    { keys: ['Ctrl', '/'], description: 'Show Keyboard Shortcuts', category: 'Help' },
    { keys: ['Esc'], description: 'Close Modal / Cancel', category: 'General' },
];
