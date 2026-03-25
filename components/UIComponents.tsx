import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import xl from 'react-syntax-highlighter/dist/esm/languages/hljs/xl';
import { duration } from 'moment';

/**
 * Utility to merge tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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
        default: "hover:border-violet-500/30",
        blue: "hover:border-blue-500/50 hover:shadow-[0_0_50px_rgba(59,130,246,0.15)]",
        green: "hover:border-emerald-500/50 hover:shadow-[0_0_50px_rgba(16,185,129,0.15)]",
        amber: "hover:border-amber-500/50 hover:shadow-[0_0_50px_rgba(245,158,11,0.15)]",
        purple: "hover:border-fuchsia-500/50 hover:shadow-[0_0_50px_rgba(217,70,239,0.15)]"
    };

    return (
        <div className={cn(
            "glass-effect rounded-[2.5rem] p-10 transition-all duration-700 bg-black/40 backdrop-blur-3xl border border-white/5",
            hoverEffect && variants[variant],
            className
        )}>
            {children}
        </div>
    );
};

/**
 * Text component with a vibrant gradient
 */
export const TextGradient = ({
    children,
    className,
    from = "from-indigo-400",
    to = "to-purple-500"
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
 * Premium styled button with gradient background
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
        primary: "bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-lg shadow-violet-500/20",
        'solid-purple': "bg-gradient-to-r from-[#A855F7] to-[#D946EF] text-white hover:scale-[1.02] transition-all shadow-[0_0_40px_rgba(168,85,247,0.3)] border-none",
        'neon-blue': "bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white hover:scale-[1.02] transition-all shadow-[0_0_40px_rgba(59,130,246,0.3)] border-none",
        outline: "border border-violet-500/50 text-violet-400 hover:bg-violet-500/10",
        ghost: "text-slate-400 hover:text-white hover:bg-white/5"
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
        indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
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
                "w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-500",
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
