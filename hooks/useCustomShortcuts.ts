'use client';
import { useEffect, useCallback, useState } from 'react';

export interface ShortcutBinding {
    id: string;
    keys: string; // e.g. "ctrl+k", "ctrl+shift+s"
    description: string;
    action: () => void;
    category?: string;
}

interface ShortcutConfig {
    [id: string]: string; // shortcut id -> key binding
}

const STORAGE_KEY = 'devmanus_keyboard_shortcuts';

/**
 * Load user's custom shortcut mappings from localStorage.
 */
function loadCustomBindings(): ShortcutConfig {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

/**
 * Save custom shortcut mappings to localStorage.
 */
function saveCustomBindings(config: ShortcutConfig) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Parse a key string like "ctrl+shift+k" into components.
 */
function parseKeys(keys: string): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean; key: string } {
    const parts = keys.toLowerCase().split('+');
    return {
        ctrl: parts.includes('ctrl') || parts.includes('control'),
        shift: parts.includes('shift'),
        alt: parts.includes('alt'),
        meta: parts.includes('meta') || parts.includes('cmd'),
        key: parts.filter(p => !['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd'].includes(p))[0] || '',
    };
}

/**
 * Check if a keyboard event matches a key binding.
 */
function matchesBinding(e: KeyboardEvent, keys: string): boolean {
    const parsed = parseKeys(keys);
    return (
        e.ctrlKey === parsed.ctrl &&
        e.shiftKey === parsed.shift &&
        e.altKey === parsed.alt &&
        e.metaKey === parsed.meta &&
        e.key.toLowerCase() === parsed.key
    );
}

/**
 * Detect conflicts between shortcut bindings.
 */
export function detectConflicts(bindings: ShortcutBinding[]): Array<{ ids: string[]; keys: string }> {
    const conflicts: Array<{ ids: string[]; keys: string }> = [];
    const keyMap = new Map<string, string[]>();

    for (const binding of bindings) {
        const normalized = binding.keys.toLowerCase().split('+').sort().join('+');
        const existing = keyMap.get(normalized) || [];
        existing.push(binding.id);
        keyMap.set(normalized, existing);
    }

    for (const [keys, ids] of keyMap) {
        if (ids.length > 1) conflicts.push({ ids, keys });
    }

    return conflicts;
}

/**
 * useCustomShortcuts — hook for managing keyboard shortcuts with customization.
 *
 * Usage:
 *   const { shortcuts, updateBinding, resetBinding } = useCustomShortcuts([
 *     { id: 'search', keys: 'ctrl+k', description: 'Open search', action: () => setSearchOpen(true) },
 *     { id: 'save', keys: 'ctrl+s', description: 'Save', action: handleSave },
 *   ]);
 */
export function useCustomShortcuts(defaultBindings: ShortcutBinding[]) {
    const [customConfig, setCustomConfig] = useState<ShortcutConfig>({});

    // Load custom bindings on mount
    useEffect(() => {
        setCustomConfig(loadCustomBindings());
    }, []);

    // Build effective bindings (defaults + custom overrides)
    const effectiveBindings = defaultBindings.map(binding => ({
        ...binding,
        keys: customConfig[binding.id] || binding.keys,
    }));

    // Register keyboard event listeners
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't fire shortcuts when typing in inputs
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                // Only allow ctrl/cmd shortcuts in inputs
                if (!e.ctrlKey && !e.metaKey) return;
            }

            for (const binding of effectiveBindings) {
                if (matchesBinding(e, binding.keys)) {
                    e.preventDefault();
                    binding.action();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [effectiveBindings]);

    const updateBinding = useCallback((id: string, newKeys: string) => {
        const updated = { ...customConfig, [id]: newKeys };
        setCustomConfig(updated);
        saveCustomBindings(updated);
    }, [customConfig]);

    const resetBinding = useCallback((id: string) => {
        const updated = { ...customConfig };
        delete updated[id];
        setCustomConfig(updated);
        saveCustomBindings(updated);
    }, [customConfig]);

    const resetAll = useCallback(() => {
        setCustomConfig({});
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        shortcuts: effectiveBindings,
        updateBinding,
        resetBinding,
        resetAll,
        conflicts: detectConflicts(effectiveBindings),
    };
}
