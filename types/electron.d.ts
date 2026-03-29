export interface GithubAccount {
    id: string;
    githubId: number;
    login: string;
    name: string | null;
    email: string | null;
    avatarUrl: string;
    addedAt: string;
    lastUsed: string;
}

export interface GithubAccountsAPI {
    getAll: () => Promise<GithubAccount[]>;
    getActive: () => Promise<GithubAccount | null>;
    getActiveId: () => Promise<string | null>;
    add: () => Promise<GithubAccount[]>;
    switch: (id: string) => Promise<GithubAccount | null>;
    remove: (id: string) => Promise<GithubAccount[]>;
    validateAll: () => Promise<Record<string, boolean>>;
    onUpdated: (cb: (accounts: GithubAccount[]) => void) => void;
    onActiveChanged: (cb: (account: GithubAccount | null) => void) => void;
    onValidated: (cb: (results: Record<string, boolean>) => void) => void;
    offUpdated: () => void;
    offActiveChanged: () => void;
    offValidated: () => void;
}

export interface DesktopAPI {
    platform: string;
    isDesktop: boolean;
    toggleAutoStart: (enable: boolean) => Promise<any>;
    onConnectionStatus: (callback: (status: 'online' | 'offline') => void) => void;
    getVersion: () => Promise<string>;
    onSystemMetrics: (callback: (metrics: any) => void) => void;
    offSystemMetrics: () => void;
    toggleMetricsWidget: (enable: boolean) => Promise<any>;
    onDeepLink: (callback: (url: string) => void) => void;
    offDeepLink: () => void;
    showNotification: (title: string, body: string, urgency?: string) => Promise<any>;
    getProxySettings: () => Promise<any>;
    setProxySettings: (config: any) => Promise<any>;
}

declare global {
    interface Window {
        desktopAPI?: DesktopAPI;
        githubAccounts?: GithubAccountsAPI;
    }
}
