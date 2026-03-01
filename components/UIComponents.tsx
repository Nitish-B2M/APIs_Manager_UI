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
}: {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}) => {
    return (
        <div className={cn(
            "glass-effect rounded-2xl p-6 transition-all duration-300",
            hoverEffect && "hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]",
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
    className
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <span className={cn("text-gradient font-bold", className)}>
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
    variant?: 'primary' | 'outline' | 'ghost'
}) => {
    const variants = {
        primary: "bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-lg shadow-violet-500/20",
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
