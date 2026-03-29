'use client';
import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import type { GithubAccount } from '../../context/GithubAccountContext';

interface AccountCardProps {
    account: GithubAccount;
    isActive: boolean;
    isInvalid?: boolean;
    onSwitch: () => void;
    onRemove: () => void;
}

export default function AccountCard({ account, isActive, isInvalid, onSwitch, onRemove }: AccountCardProps) {
    return (
        <div
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                    : 'hover:bg-white/5 border border-transparent cursor-pointer'
            }`}
            onClick={!isActive ? onSwitch : undefined}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (!isActive && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onSwitch();
                }
            }}
            aria-label={`${isActive ? 'Active account' : 'Switch to'} ${account.login}`}
        >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <img
                    src={account.avatarUrl}
                    alt={account.login}
                    className="w-8 h-8 rounded-full border border-white/10"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${account.login}&background=6366f1&color=fff&size=32`;
                    }}
                />
                {isActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center">
                        <Check size={8} className="text-white" />
                    </div>
                )}
                {isInvalid && (
                    <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center">
                        <AlertTriangle size={8} className="text-white" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-heading truncate">{account.login}</span>
                    {isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Active</span>
                    )}
                </div>
                {(account.name || account.email) && (
                    <p className="text-xs text-muted truncate">
                        {account.name}{account.name && account.email ? ' · ' : ''}{account.email}
                    </p>
                )}
                {isInvalid && (
                    <p className="text-[10px] text-amber-400 mt-0.5">Token expired — click to re-authenticate</p>
                )}
            </div>

            {/* Remove button (visible on hover) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                title={`Remove ${account.login}`}
                aria-label={`Remove ${account.login}`}
            >
                <X size={14} />
            </button>
        </div>
    );
}
