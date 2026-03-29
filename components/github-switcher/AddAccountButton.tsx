'use client';
import React from 'react';
import { Plus, Loader2 } from 'lucide-react';

interface AddAccountButtonProps {
    onClick: () => void;
    loading: boolean;
}

export default function AddAccountButton({ onClick, loading }: AddAccountButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-heading hover:bg-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {loading ? (
                <Loader2 size={16} className="animate-spin text-indigo-400" />
            ) : (
                <Plus size={16} />
            )}
            <span>{loading ? 'Opening browser...' : 'Add GitHub Account'}</span>
        </button>
    );
}
