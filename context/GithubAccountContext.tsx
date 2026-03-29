'use client';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';

export interface GithubAccount {
    id: string;
    githubId: number;
    login: string;
    name: string | null;
    email: string | null;
    avatarUrl: string;
    isActive: boolean;
    addedAt: string;
    lastUsed: string;
}

export interface GitStatus {
    name: string | null;
    email: string | null;
    credentials?: {
        gitCli: string | null;
        githubDesktop: string | null;
    };
}

interface GithubAccountContextType {
    accounts: GithubAccount[];
    activeAccount: GithubAccount | null;
    loading: boolean;
    error: string | null;
    successMessage: string | null;
    gitStatus: GitStatus | null;
    addAccount: () => Promise<void>;
    switchAccount: (id: string) => Promise<void>;
    removeAccount: (id: string) => Promise<void>;
    refreshAccounts: () => Promise<void>;
    refreshGitStatus: () => Promise<void>;
    clearError: () => void;
    clearSuccess: () => void;
}

const GithubAccountContext = createContext<GithubAccountContextType | undefined>(undefined);

export function GithubAccountProvider({ children }: { children: React.ReactNode }) {
    const [accounts, setAccounts] = useState<GithubAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
    const { isLoggedIn } = useAuth();

    const activeAccount = accounts.find(a => a.isActive) || null;

    const refreshAccounts = useCallback(async () => {
        if (!isLoggedIn) {
            setAccounts([]);
            return;
        }
        try {
            const res = await api.github.listAccounts();
            setAccounts(res.data || []);
        } catch (err) {
            console.error('[GithubAccountContext] Failed to fetch accounts:', err);
        }
    }, [isLoggedIn]);

    const refreshGitStatus = useCallback(async () => {
        if (!isLoggedIn) return;
        try {
            const res = await api.github.getGitStatus();
            setGitStatus(res.data || null);
        } catch {
            // non-critical
        }
    }, [isLoggedIn]);

    useEffect(() => {
        refreshAccounts();
        refreshGitStatus();
    }, [refreshAccounts, refreshGitStatus]);

    useEffect(() => {
        if (activeAccount) {
            localStorage.setItem('github_active_account_id', activeAccount.id);
        } else {
            localStorage.removeItem('github_active_account_id');
        }
    }, [activeAccount]);

    // Check URL params for OAuth callback results
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const errorParam = params.get('error');

        if (success === 'true') {
            refreshAccounts();
            refreshGitStatus();
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (errorParam) {
            const messages: Record<string, string> = {
                missing_params: 'GitHub authorization was cancelled or incomplete.',
                invalid_state: 'Security error: OAuth state mismatch. Please try again.',
                not_configured: 'GitHub OAuth is not configured on the server.',
                token_exchange_failed: 'Failed to exchange authorization code with GitHub.',
                profile_fetch_failed: 'Failed to fetch your GitHub profile.',
                server_error: 'An unexpected server error occurred.',
            };
            setError(messages[errorParam] || `GitHub authorization failed: ${errorParam}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [refreshAccounts, refreshGitStatus]);

    const addAccount = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.github.getAuthUrl();
            const authUrl = res.data?.authUrl;
            if (authUrl) {
                window.location.href = authUrl;
            } else {
                setError('Failed to get GitHub authorization URL');
                setLoading(false);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to initiate GitHub authorization');
            setLoading(false);
        }
    }, []);

    const switchAccount = useCallback(async (id: string) => {
        try {
            setError(null);
            setSuccessMessage(null);
            const res = await api.github.activateAccount(id);
            await refreshAccounts();
            await refreshGitStatus();

            // Show git config update result
            const gitData = res.data;
            if (gitData?.gitConfig?.updated) {
                setSuccessMessage(
                    `Switched! Git config updated → ${gitData.gitConfig.name} <${gitData.gitConfig.email}>${gitData.gitCredentials?.updated ? ' · Credentials stored for git push' : ''}`
                );
            } else if (gitData?.gitConfig?.error) {
                setError(`Account switched but git config update failed: ${gitData.gitConfig.error}`);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to switch account');
        }
    }, [refreshAccounts, refreshGitStatus]);

    const removeAccount = useCallback(async (id: string) => {
        try {
            await api.github.removeAccount(id);
            await refreshAccounts();
        } catch (err: any) {
            setError(err?.message || 'Failed to remove account');
        }
    }, [refreshAccounts]);

    const clearError = useCallback(() => setError(null), []);
    const clearSuccess = useCallback(() => setSuccessMessage(null), []);

    return (
        <GithubAccountContext.Provider
            value={{
                accounts,
                activeAccount,
                loading,
                error,
                successMessage,
                gitStatus,
                addAccount,
                switchAccount,
                removeAccount,
                refreshAccounts,
                refreshGitStatus,
                clearError,
                clearSuccess,
            }}
        >
            {children}
        </GithubAccountContext.Provider>
    );
}

export function useGithubAccounts() {
    const context = useContext(GithubAccountContext);
    if (context === undefined) {
        throw new Error('useGithubAccounts must be used within a GithubAccountProvider');
    }
    return context;
}
