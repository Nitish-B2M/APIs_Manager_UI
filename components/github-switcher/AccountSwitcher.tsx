'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Github, AlertCircle } from 'lucide-react';
import { useGithubAccounts } from '../../context/GithubAccountContext';
import { useAuth } from '../../context/AuthContext';
import AccountCard from './AccountCard';
import AddAccountButton from './AddAccountButton';

export default function AccountSwitcher() {
    const { isLoggedIn } = useAuth();
    const {
        accounts,
        activeAccount,
        loading,
        error,
        addAccount,
        switchAccount,
        removeAccount,
        clearError,
    } = useGithubAccounts();

    const [open, setOpen] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
                setConfirmRemove(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    // Close dropdown on Escape
    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setOpen(false); setConfirmRemove(null); }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    // Don't render if not logged in (must be after all hooks)
    if (!isLoggedIn) return null;

    const handleRemove = (id: string) => {
        if (confirmRemove === id) {
            removeAccount(id);
            setConfirmRemove(null);
        } else {
            setConfirmRemove(id);
        }
    };

    const handleSwitch = (id: string) => {
        switchAccount(id);
        setOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 p-1 pr-2.5 rounded-full bg-white/5 border border-white/5 hover:border-[#249d9f]/30 transition-all"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="GitHub account switcher"
            >
                {activeAccount ? (
                    <>
                        <img
                            src={activeAccount.avatarUrl}
                            alt={activeAccount.login}
                            className="w-7 h-7 rounded-full border border-white/10"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${activeAccount.login}&background=6366f1&color=fff&size=28`;
                            }}
                        />
                        <span className="text-xs font-semibold text-secondary max-w-[100px] truncate">
                            {activeAccount.login}
                        </span>
                    </>
                ) : (
                    <>
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                            <Github size={14} className="text-muted" />
                        </div>
                        <span className="text-xs text-muted">GitHub</span>
                    </>
                )}
                <ChevronDown size={12} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-72 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    role="listbox"
                    aria-label="GitHub accounts"
                >
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-[var(--border-primary)]">
                        <div className="flex items-center gap-2">
                            <Github size={14} className="text-muted" />
                            <span className="text-xs font-bold uppercase tracking-wider text-muted">GitHub Accounts</span>
                            {accounts.length > 0 && (
                                <span className="ml-auto text-[10px] font-bold text-muted bg-white/5 px-1.5 py-0.5 rounded-full">
                                    {accounts.length}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mx-3 mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                            <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-xs text-red-300">{error}</p>
                                <button onClick={clearError} className="text-[10px] text-red-400 hover:text-red-300 mt-1 underline">Dismiss</button>
                            </div>
                        </div>
                    )}

                    {/* Account List */}
                    <div className="p-1.5 max-h-64 overflow-y-auto">
                        {accounts.length === 0 && !loading && (
                            <div className="text-center py-6 text-muted">
                                <Github size={24} className="mx-auto mb-2 opacity-30" />
                                <p className="text-xs">No GitHub accounts connected</p>
                            </div>
                        )}

                        {accounts.map((account) => (
                            <div key={account.id}>
                                <AccountCard
                                    account={account}
                                    isActive={account.isActive}
                                    onSwitch={() => handleSwitch(account.id)}
                                    onRemove={() => handleRemove(account.id)}
                                />
                                {confirmRemove === account.id && (
                                    <div className="mx-3 mb-1 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <p className="text-[11px] text-red-300 mb-1.5">
                                            Remove <strong>{account.login}</strong>? This will delete the stored token.
                                        </p>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRemove(account.id)} className="text-[10px] font-bold px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">
                                                Confirm Remove
                                            </button>
                                            <button onClick={() => setConfirmRemove(null)} className="text-[10px] px-2 py-1 rounded text-muted hover:text-heading transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add Button */}
                    <div className="border-t border-[var(--border-primary)] p-1.5">
                        <AddAccountButton onClick={addAccount} loading={loading} />
                    </div>
                </div>
            )}
        </div>
    );
}
