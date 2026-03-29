'use client';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    /** Override width — default uses the standard 72vw */
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'max-w-md w-full',
    md: 'min-w-[640px] max-w-[78vw] w-[72vw]',
    lg: 'min-w-[640px] max-w-[85vw] w-[80vw]',
    xl: 'min-w-[640px] max-w-[92vw] w-[88vw]',
};

export default function Modal({ isOpen, onClose, title, subtitle, icon, children, size = 'md' }: ModalProps) {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className={`${sizeClasses[size]} overflow-hidden animate-in zoom-in-95 duration-200`}
                style={{
                    background: '#161B22',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.16)',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {icon && (
                        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(36,157,159,0.1)', color: '#249d9f', flexShrink: 0 }}>
                            {icon}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#E6EDF3', margin: 0, lineHeight: 1.3 }}>{title}</h3>
                        {subtitle && <p style={{ fontSize: 13, color: '#8B949E', margin: '2px 0 0', lineHeight: 1.4 }}>{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B949E', background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#21262D'; e.currentTarget.style.color = '#E6EDF3'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8B949E'; }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

/**
 * ModalDivider — use between sections inside a modal.
 */
export function ModalDivider() {
    return <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '20px 0' }} />;
}
