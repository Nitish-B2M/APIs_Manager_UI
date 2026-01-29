import { useState, useEffect, useCallback } from 'react';

interface UseResizableProps {
    initialSize: number;
    minSize?: number;
    maxSize?: number;
    direction: 'horizontal' | 'vertical';
    containerOffset?: number;
}

interface UseResizableReturn {
    size: number;
    setSize: (size: number) => void;
    isResizing: boolean;
    startResizing: () => void;
    stopResizing: () => void;
}

export function useResizable({
    initialSize,
    minSize = 200,
    maxSize = 600,
    direction,
    containerOffset = 0
}: UseResizableProps): UseResizableReturn {
    const [size, setSize] = useState(initialSize);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const position = direction === 'horizontal' 
                ? e.clientX - containerOffset
                : e.clientY - containerOffset;
            const newSize = Math.max(minSize, Math.min(maxSize, position));
            setSize(newSize);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, direction, minSize, maxSize, containerOffset]);

    return {
        size,
        setSize,
        isResizing,
        startResizing,
        stopResizing
    };
}

interface UseSplitPaneProps {
    initialRatio?: number;
    minRatio?: number;
    maxRatio?: number;
    direction: 'horizontal' | 'vertical';
    containerOffset?: number;
}

interface UseSplitPaneReturn {
    ratio: number;
    setRatio: (ratio: number) => void;
    isResizing: boolean;
    startResizing: () => void;
}

export function useSplitPane({
    initialRatio = 50,
    minRatio = 20,
    maxRatio = 80,
    direction,
    containerOffset = 0
}: UseSplitPaneProps): UseSplitPaneReturn {
    const [ratio, setRatio] = useState(initialRatio);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const isHorizontal = direction === 'horizontal';
            const containerSize = isHorizontal 
                ? window.innerWidth - containerOffset
                : window.innerHeight - containerOffset;
            const mousePosition = isHorizontal 
                ? e.clientX - containerOffset
                : e.clientY - containerOffset;
            
            const newRatio = Math.max(
                minRatio, 
                Math.min(maxRatio, (mousePosition / containerSize) * 100)
            );
            setRatio(newRatio);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, direction, minRatio, maxRatio, containerOffset]);

    return {
        ratio,
        setRatio,
        isResizing,
        startResizing
    };
}
