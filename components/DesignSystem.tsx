'use client';
import React from 'react';

/**
 * DevManus Design System — standardized tokens and components.
 * All components support dark/light mode via CSS variables.
 */

// ─── Design Tokens ───────────────────────────────────────────────────

export const tokens = {
    colors: {
        primary: '#6366f1',
        primaryHover: '#4f46e5',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
    },
    spacing: {
        xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px', xxl: '32px',
    },
    radius: {
        sm: '6px', md: '8px', lg: '12px', xl: '16px', full: '9999px',
    },
    fontSize: {
        xs: '10px', sm: '12px', md: '14px', lg: '16px', xl: '20px', xxl: '24px',
    },
};

// ─── Form Input ──────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export function FormInput({ label, error, hint, className, ...props }: InputProps) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                    {label}
                    {props.required && <span className="text-red-400 ml-1">*</span>}
                </label>
            )}
            <input
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all
                    ${error
                        ? 'border-red-500 bg-red-500/5'
                        : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'
                    }
                    ${className || ''}`}
                {...props}
            />
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            {hint && !error && <p className="text-[11px] text-muted">{hint}</p>}
        </div>
    );
}

// ─── Form Select ─────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    options: Array<{ value: string; label: string }>;
}

export function FormSelect({ label, error, options, className, ...props }: SelectProps) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-xs font-bold uppercase tracking-wider text-muted">{label}</label>}
            <select
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all border-[var(--border-primary)] bg-[var(--bg-secondary)] ${className || ''}`}
                {...props}
            >
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
    );
}

// ─── Form Textarea ───────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export function FormTextarea({ label, error, className, ...props }: TextareaProps) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-xs font-bold uppercase tracking-wider text-muted">{label}</label>}
            <textarea
                className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none border-[var(--border-primary)] bg-[var(--bg-secondary)] ${className || ''}`}
                {...props}
            />
            {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
    );
}

// ─── Button Variants ─────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20',
    secondary: 'bg-white/5 hover:bg-white/10 text-heading border border-white/10',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20',
    ghost: 'hover:bg-white/5 text-muted hover:text-heading',
    outline: 'border border-[var(--border-primary)] hover:bg-white/5 text-heading',
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: ButtonProps) {
    return (
        <button
            className={`font-semibold transition-all inline-flex items-center justify-center gap-2
                ${variantClasses[variant]} ${sizeClasses[size]}
                ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
                ${className || ''}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : icon}
            {children}
        </button>
    );
}

// ─── Status Badge ────────────────────────────────────────────────────

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const statusStyles: Record<StatusVariant, string> = {
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export function StatusBadge({ variant = 'neutral', children }: { variant?: StatusVariant; children: React.ReactNode }) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyles[variant]}`}>
            {children}
        </span>
    );
}

// ─── Empty State ─────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-muted opacity-30 mb-3">{icon}</div>
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            {description && <p className="text-sm text-muted mb-4 max-w-sm">{description}</p>}
            {action}
        </div>
    );
}

// ─── Card ────────────────────────────────────────────────────────────

export function Card({ children, className, padding = 'lg' }: {
    children: React.ReactNode;
    className?: string;
    padding?: 'sm' | 'md' | 'lg';
}) {
    const paddings = { sm: 'p-3', md: 'p-5', lg: 'p-6' };
    return (
        <div className={`rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] ${paddings[padding]} ${className || ''}`}>
            {children}
        </div>
    );
}
