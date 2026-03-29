'use client';
import React from 'react';

/**
 * SkipLink — hidden link that appears on focus for keyboard users.
 * Jumps to main content, bypassing navigation.
 */
export function SkipLink({ href = '#main-content' }: { href?: string }) {
    return (
        <a
            href={href}
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold focus:shadow-lg"
        >
            Skip to main content
        </a>
    );
}

/**
 * FocusTrap — traps focus within a container (for modals/dialogs).
 */
export function FocusTrap({ children, active = true }: { children: React.ReactNode; active?: boolean }) {
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!active || !containerRef.current) return;

        const container = containerRef.current;
        const focusables = container.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
        };

        container.addEventListener('keydown', handleKeyDown);
        first?.focus();
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [active]);

    return <div ref={containerRef}>{children}</div>;
}

/**
 * VisuallyHidden — hides content visually but keeps it accessible to screen readers.
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
    return <span className="sr-only">{children}</span>;
}

/**
 * LiveRegion — announces dynamic content to screen readers.
 */
export function LiveRegion({ children, role = 'status' }: { children: React.ReactNode; role?: 'status' | 'alert' }) {
    return (
        <div role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'} aria-atomic="true" className="sr-only">
            {children}
        </div>
    );
}

/**
 * ReducedMotion — respects user's prefers-reduced-motion setting.
 */
export function useReducedMotion(): boolean {
    const [reduced, setReduced] = React.useState(false);

    React.useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduced(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return reduced;
}
