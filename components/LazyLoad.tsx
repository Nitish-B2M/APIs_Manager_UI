'use client';
import React, { Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LazyLoad wrapper — wraps React.lazy with a consistent loading fallback.
 *
 * Usage:
 *   const HeavyEditor = lazyComponent(() => import('./HeavyEditor'));
 *   <HeavyEditor />
 */

const DefaultFallback = () => (
    <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin text-[#249d9f]" />
    </div>
);

export function lazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    fallback?: React.ReactNode
) {
    const LazyComponent = React.lazy(importFn);

    return function WrappedLazy(props: React.ComponentProps<T>) {
        return (
            <Suspense fallback={fallback || <DefaultFallback />}>
                <LazyComponent {...props} />
            </Suspense>
        );
    };
}

/**
 * LazySection — renders children only when the section is visible in the viewport.
 * Uses IntersectionObserver to defer rendering of off-screen content.
 */
export function LazySection({ children, className, minHeight = 200 }: { children: React.ReactNode; className?: string; minHeight?: number }) {
    const [visible, setVisible] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={ref} className={className} style={{ minHeight: visible ? undefined : minHeight }}>
            {visible ? children : <DefaultFallback />}
        </div>
    );
}
