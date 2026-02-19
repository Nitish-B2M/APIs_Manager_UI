import { useState, useEffect, useCallback } from 'react';

interface UseResizableOptions {
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    initialRatio?: number;
    minRatio?: number;
    maxRatio?: number;
}

interface UseSidebarResizeResult {
    width: number;
    isResizing: boolean;
    startResizing: () => void;
}

interface UsePanelResizeResult {
    ratio: number;
    isResizing: boolean;
    startResizing: () => void;
}

/**
 * Hook for sidebar resizing (horizontal width-based)
 */
export function useSidebarResize(options: UseResizableOptions = {}): UseSidebarResizeResult {
    const {
        initialWidth = 260,
        minWidth = 200,
        maxWidth = 600,
    } = options;

    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
            setWidth(newWidth);
        };

        const handleMouseUp = () => setIsResizing(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, minWidth, maxWidth]);

    const startResizing = useCallback(() => setIsResizing(true), []);

    return { width, isResizing, startResizing };
}

/**
 * Hook for horizontal panel split (left/right ratio-based)
 */
export function useHorizontalPanelResize(
    sidebarWidth: number,
    isSidebarCollapsed: boolean,
    options: UseResizableOptions = {}
): UsePanelResizeResult {
    const {
        initialRatio = 50,
        minRatio = 20,
        maxRatio = 80,
    } = options;

    const [ratio, setRatio] = useState(initialRatio);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const sidebarOffset = isSidebarCollapsed ? 48 : sidebarWidth;
            const availableWidth = window.innerWidth - sidebarOffset;
            const mouseXRelative = e.clientX - sidebarOffset;
            const newRatio = Math.max(minRatio, Math.min(maxRatio, (mouseXRelative / availableWidth) * 100));
            setRatio(newRatio);
        };

        const handleMouseUp = () => setIsResizing(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, sidebarWidth, isSidebarCollapsed, minRatio, maxRatio]);

    const startResizing = useCallback(() => setIsResizing(true), []);

    return { ratio, isResizing, startResizing };
}

/**
 * Hook for vertical panel split (top/bottom ratio-based)
 */
export function useVerticalPanelResize(
    topBarHeight: number = 135,
    options: UseResizableOptions = {}
): UsePanelResizeResult {
    const {
        initialRatio = 50,
        minRatio = 20,
        maxRatio = 80,
    } = options;

    const [ratio, setRatio] = useState(initialRatio);
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const availableHeight = window.innerHeight - topBarHeight;
            const mouseYRelative = e.clientY - topBarHeight;
            const newRatio = Math.max(minRatio, Math.min(maxRatio, (mouseYRelative / availableHeight) * 100));
            setRatio(newRatio);
        };

        const handleMouseUp = () => setIsResizing(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, topBarHeight, minRatio, maxRatio]);

    const startResizing = useCallback(() => setIsResizing(true), []);

    return { ratio, isResizing, startResizing };
}
