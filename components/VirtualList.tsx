'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * VirtualList — renders only visible items in a scrollable container.
 * Lightweight alternative to @tanstack/virtual — no extra dependency.
 *
 * Usage:
 *   <VirtualList items={data} itemHeight={40} renderItem={(item, i) => <div>{item.name}</div>} />
 */

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (item: T, index: number) => React.ReactNode;
    overscan?: number;
    className?: string;
    style?: React.CSSProperties;
}

export default function VirtualList<T>({ items, itemHeight, renderItem, overscan = 5, className, style }: VirtualListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        setContainerHeight(el.clientHeight);

        const observer = new ResizeObserver(() => setContainerHeight(el.clientHeight));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const onScroll = useCallback(() => {
        if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
    }, []);

    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);
    const visibleItems = items.slice(startIndex, endIndex);

    return (
        <div ref={containerRef} onScroll={onScroll} className={className} style={{ overflow: 'auto', ...style }}>
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map((item, i) => (
                    <div
                        key={startIndex + i}
                        style={{ position: 'absolute', top: (startIndex + i) * itemHeight, height: itemHeight, width: '100%' }}
                    >
                        {renderItem(item, startIndex + i)}
                    </div>
                ))}
            </div>
        </div>
    );
}
