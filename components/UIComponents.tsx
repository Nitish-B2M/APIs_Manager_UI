import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Brand color constants — single source of truth
 */
export const BRAND = {
    primary: '#249d9f',
    light: '#2ec4c7',
    dark: '#1a7a7c',
    glow: 'rgba(36, 157, 159, 0.15)',
    subtle: 'rgba(36, 157, 159, 0.08)',
};

/**
 * A container with a glassmorphism effect
 */
export const GlassCard = ({
    children,
    className,
    hoverEffect = true,
    variant = 'default',
}: {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    variant?: 'default' | 'blue' | 'green' | 'amber' | 'purple'
}) => {
    const variants = {
        default: "hover:border-[#249d9f]/30 hover:shadow-[0_0_30px_rgba(36,157,159,0.06)]",
        blue: "hover:border-[#249d9f]/40 hover:shadow-[0_0_40px_rgba(36,157,159,0.1)]",
        green: "hover:border-emerald-500/40 hover:shadow-[0_0_40px_rgba(16,185,129,0.1)]",
        amber: "hover:border-amber-500/40 hover:shadow-[0_0_40px_rgba(245,158,11,0.1)]",
        purple: "hover:border-[#249d9f]/40 hover:shadow-[0_0_40px_rgba(36,157,159,0.1)]"
    };

    return (
        <div className={cn(
            "glass-effect rounded-2xl p-8 transition-all duration-300 bg-white/[0.02] backdrop-blur-xl border border-white/[0.06]",
            hoverEffect && variants[variant],
            className
        )}>
            {children}
        </div>
    );
};

/**
 * Text component with a brand gradient
 */
export const TextGradient = ({
    children,
    className,
    from = "from-[#249d9f]",
    to = "to-[#2ec4c7]"
}: {
    children: React.ReactNode;
    className?: string;
    from?: string;
    to?: string;
}) => {
    return (
        <span className={cn(
            "bg-gradient-to-r bg-clip-text text-transparent",
            from, to,
            className
        )}>
            {children}
        </span>
    );
};

/**
 * Premium styled button
 */
export const PremiumButton = ({
    children,
    className,
    variant = 'primary',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'outline' | 'ghost' | 'solid-purple' | 'neon-blue'
}) => {
    const variants = {
        primary: "bg-[#249d9f] text-white hover:bg-[#1a7a7c] shadow-lg shadow-[rgba(36,157,159,0.2)]",
        'solid-purple': "bg-[#249d9f] text-white hover:bg-[#1a7a7c] hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(36,157,159,0.2)] border-none",
        'neon-blue': "bg-[#249d9f] text-white hover:bg-[#2ec4c7] hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(36,157,159,0.25)] border-none",
        outline: "border border-[#249d9f]/40 text-[#249d9f] hover:bg-[#249d9f]/10",
        ghost: "text-[#71717a] hover:text-white hover:bg-white/5"
    };

    return (
        <button
            className={cn(
                "px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

/**
 * Modern Badge component
 */
export const Badge = ({
    children,
    className,
    variant = 'default'
}: {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'success' | 'error' | 'warning' | 'indigo' | 'outline'
}) => {
    const variants = {
        default: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        indigo: "bg-[#249d9f]/10 text-[#249d9f] border-[#249d9f]/20",
        success: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        error: "bg-red-500/10 text-red-500 border-red-500/20",
        warning: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        outline: "bg-transparent border-white/10 text-gray-400"
    };

    return (
        <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
};

/**
 * Standard Styled Input
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => {
    return (
        <input
            ref={ref}
            className={cn(
                "w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/[0.06] text-sm outline-none focus:ring-2 focus:ring-[#249d9f]/20 focus:border-[#249d9f] transition-all placeholder:text-gray-500",
                className
            )}
            {...props}
        />
    );
});
Input.displayName = 'Input';

/**
 * Standard Styled Label
 */
export const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <label className={cn("text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1 mb-1.5 block", className)}>
        {children}
    </label>
);
