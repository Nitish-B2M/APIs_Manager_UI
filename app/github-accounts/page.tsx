'use client';
import { useState, useEffect } from 'react';
import { Github, Plus, Loader2, Check, X, AlertTriangle, ExternalLink, Shield, Key, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';
import { useGithubAccounts, GithubAccount } from '../../context/GithubAccountContext';
import { ProtectedRoute } from '../../components/AuthGuard';

export default function GitHubAccountsPage() {
    const { theme } = useTheme();
    const {
        accounts,
        activeAccount,
        loading,
        error,
        successMessage,
        gitStatus,
        addAccount,
        switchAccount,
        removeAccount,
        clearError,
        clearSuccess,
    } = useGithubAccounts();

    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
    const [localSuccess, setLocalSuccess] = useState<string | null>(null);

    const mainBg = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
    const cardBg = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm';
    const subTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

    // Check URL for success callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const login = params.get('login');
        if (params.get('success') === 'true' && login) {
            setLocalSuccess(`Successfully connected @${login}!`);
            setTimeout(() => setLocalSuccess(null), 5000);
        }
    }, []);

    const handleRemove = (id: string) => {
        if (confirmRemoveId === id) {
            removeAccount(id);
            setConfirmRemoveId(null);
        } else {
            setConfirmRemoveId(id);
        }
    };

    return (
        <ProtectedRoute>
            <div className={`min-h-[calc(100vh-64px)] ${mainBg} p-8 transition-colors duration-300`}>
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Link
                            href="/dashboard"
                            className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 text-white shadow-lg">
                                <Github size={22} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">GitHub Accounts</h1>
                                <p className={`text-sm ${subTextColor}`}>Connect and manage your GitHub accounts for seamless integration</p>
                            </div>
                        </div>
                    </div>

                    {/* Success Banners */}
                    {(localSuccess || successMessage) && (
                        <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                            <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                            <p className="text-sm text-green-300 font-medium flex-1">{localSuccess || successMessage}</p>
                            {successMessage && (
                                <button onClick={clearSuccess} className="text-xs text-green-400 hover:text-green-300 underline">Dismiss</button>
                            )}
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-red-300 font-medium">{error}</p>
                                <button onClick={clearError} className="text-xs text-red-400 hover:text-red-300 mt-1 underline">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Current Git Config Status */}
                    {gitStatus && (gitStatus.name || gitStatus.email) && (
                        <div className={`${cardBg} border rounded-xl p-5 mb-6`}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`p-1.5 rounded-lg ${theme === 'dark' ? 'bg-[#249d9f]/10 text-[#2ec4c7]' : 'bg-indigo-50 text-[#1a7a7c]'}`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Current Git Identity</h3>
                                    <p className={`text-xs ${subTextColor}`}>Switching accounts updates all of these automatically</p>
                                </div>
                            </div>
                            <div className={`rounded-lg p-3 font-mono text-xs space-y-2 ${theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'}`}>
                                {/* Git Config */}
                                <div>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${subTextColor}`}>~/.gitconfig</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`${subTextColor}`}>user.name</span>
                                        <span className="text-[#2ec4c7]">=</span>
                                        <span className="font-semibold">{gitStatus.name || '(not set)'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`${subTextColor}`}>user.email</span>
                                        <span className="text-[#2ec4c7]">=</span>
                                        <span className="font-semibold">{gitStatus.email || '(not set)'}</span>
                                    </div>
                                </div>

                                {/* Credential Manager */}
                                {gitStatus.credentials && (
                                    <div className={`pt-2 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <p className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${subTextColor}`}>Push Authentication (Credential Manager)</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`${subTextColor}`}>git push / git CLI</span>
                                            <span className="text-[#2ec4c7]">&rarr;</span>
                                            <span className="font-semibold">
                                                {gitStatus.credentials.gitCli ? (
                                                    <span className="text-green-400">@{gitStatus.credentials.gitCli}</span>
                                                ) : (
                                                    <span className="text-amber-400">(none)</span>
                                                )}
                                            </span>
                                        </div>
                                        {gitStatus.credentials.githubDesktop && gitStatus.credentials.gitCli && gitStatus.credentials.githubDesktop !== gitStatus.credentials.gitCli && (
                                            <div className={`mt-2 p-2 rounded text-[11px] ${theme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                                                <strong>Note:</strong> GitHub Desktop is signed in as <strong>@{gitStatus.credentials.githubDesktop}</strong> — this is a separate login session.
                                                GitHub Desktop manages its own sign-in. To switch it, use GitHub Desktop &rarr; File &rarr; Options &rarr; Accounts &rarr; Sign out, then sign in with the desired account.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Accounts List */}
                    <div className={`${cardBg} border rounded-xl overflow-hidden mb-6`}>
                        <div className="px-6 py-4 border-b border-inherit flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-base">Connected Accounts</h2>
                                <p className={`text-xs ${subTextColor}`}>{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</p>
                            </div>
                            <button
                                onClick={addAccount}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-[#1a7a7c] hover:bg-[#1a7a7c] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {loading ? 'Redirecting...' : 'Add Account'}
                            </button>
                        </div>

                        {accounts.length === 0 ? (
                            <div className="p-12 text-center">
                                <Github size={40} className={`mx-auto mb-4 ${subTextColor} opacity-30`} />
                                <p className="font-medium mb-1">No GitHub accounts connected</p>
                                <p className={`text-sm ${subTextColor} mb-4`}>Click "Add Account" to connect your first GitHub account via OAuth</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-inherit">
                                {accounts.map((account) => (
                                    <AccountRow
                                        key={account.id}
                                        account={account}
                                        isActive={account.isActive}
                                        onSwitch={() => switchAccount(account.id)}
                                        onRemove={() => handleRemove(account.id)}
                                        isConfirmingRemove={confirmRemoveId === account.id}
                                        onCancelRemove={() => setConfirmRemoveId(null)}
                                        theme={theme}
                                        subTextColor={subTextColor}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Security Info */}
                    <div className={`${cardBg} border rounded-xl p-6`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                                <Shield size={18} />
                            </div>
                            <h3 className="font-bold">Security & Privacy</h3>
                        </div>
                        <div className={`space-y-3 text-sm ${subTextColor}`}>
                            <div className="flex items-start gap-3">
                                <Key size={14} className="flex-shrink-0 mt-0.5 text-[#2ec4c7]" />
                                <p><strong className="text-foreground">Encrypted at rest</strong> — Tokens are encrypted using AES-256-GCM before being stored in the database</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Shield size={14} className="flex-shrink-0 mt-0.5 text-[#2ec4c7]" />
                                <p><strong className="text-foreground">Server-side only</strong> — Tokens never reach your browser. The server handles all GitHub API communication</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Github size={14} className="flex-shrink-0 mt-0.5 text-[#2ec4c7]" />
                                <p><strong className="text-foreground">Standard OAuth 2.0</strong> — Uses GitHub's official OAuth flow. You can revoke access anytime from GitHub Settings &gt; Applications</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}

function AccountRow({
    account,
    isActive,
    onSwitch,
    onRemove,
    isConfirmingRemove,
    onCancelRemove,
    theme,
    subTextColor,
}: {
    account: GithubAccount;
    isActive: boolean;
    onSwitch: () => void;
    onRemove: () => void;
    isConfirmingRemove: boolean;
    onCancelRemove: () => void;
    theme: string;
    subTextColor: string;
}) {
    return (
        <div className="px-6 py-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                    <img
                        src={account.avatarUrl}
                        alt={account.login}
                        className="w-12 h-12 rounded-full border-2 border-white/10"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${account.login}&background=6366f1&color=fff&size=48`;
                        }}
                    />
                    {isActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center">
                            <Check size={10} className="text-white" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold">{account.login}</span>
                        {isActive && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                Active
                            </span>
                        )}
                    </div>
                    <p className={`text-sm ${subTextColor} truncate`}>
                        {account.name || ''}{account.name && account.email ? ' · ' : ''}{account.email || ''}
                    </p>
                    <p className={`text-xs ${subTextColor} mt-0.5`}>
                        Added {new Date(account.addedAt).toLocaleDateString()} · Last used {new Date(account.lastUsed).toLocaleDateString()}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {!isActive && (
                        <button
                            onClick={onSwitch}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1a7a7c] hover:bg-[#1a7a7c] text-white transition-colors"
                        >
                            Switch
                        </button>
                    )}
                    <a
                        href={`https://github.com/${account.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        title="View on GitHub"
                    >
                        <ExternalLink size={14} />
                    </a>
                    <button
                        onClick={onRemove}
                        className="p-2 rounded-lg transition-all text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                        title="Remove account"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {isConfirmingRemove && (
                <div className="mt-3 ml-16 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-300 mb-2">
                        Remove <strong>{account.login}</strong>? This will delete the stored token permanently.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={onRemove} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">
                            Confirm Remove
                        </button>
                        <button onClick={onCancelRemove} className="text-xs px-3 py-1.5 rounded-lg text-gray-400 hover:text-white transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
