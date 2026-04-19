export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export function getHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const githubAccountId = typeof window !== 'undefined' ? localStorage.getItem('github_active_account_id') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(githubAccountId ? { 'x-github-account-id': githubAccountId } : {}),
    };
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Try to refresh the access token using the httpOnly refresh cookie.
 * Returns the new access token or null if refresh failed.
 */
async function tryRefreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh calls
    if (isRefreshing && refreshPromise) return refreshPromise;

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_URL}/api/auth/refresh`, {
                method: 'POST',
                credentials: 'include', // Send httpOnly cookie
                headers: { 'Content-Type': 'application/json' },
            });
            const json = await res.json();
            if (json.status && json.data?.token) {
                localStorage.setItem('token', json.data.token);
                return json.data.token as string;
            }
            return null;
        } catch {
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const headers = {
        ...getHeaders(),
        ...options.headers,
    };

    let response = await fetch(`${API_URL}/api${path}`, {
        ...options,
        headers,
        credentials: 'include', // Always send cookies for refresh token
    });

    // If 401, try refreshing the token once
    if (response.status === 401 && !path.includes('/auth/refresh') && !path.includes('/auth/login')) {
        const newToken = await tryRefreshToken();
        if (newToken) {
            // Retry the original request with the new token
            const retryHeaders = {
                ...options.headers,
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newToken}`,
            };
            response = await fetch(`${API_URL}/api${path}`, {
                ...options,
                headers: retryHeaders,
                credentials: 'include',
            });
        }
    }

    const json = await response.json();
    if (!json.status) {
        throw new Error(json.message || 'An error occurred');
    }

    return json;
}

export const api = {
    auth: {
        login: (data: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
        register: (data: any) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
        me: () => apiFetch('/auth/me'),
        updateProfile: (data: { name?: string; avatarUrl?: string | null; settings?: Record<string, any> }) => apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
        resetPassword: (token: string, password: string) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
        forgotPassword: (email: string) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
        verifyEmail: (token: string) => apiFetch('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
        resendVerification: () => apiFetch('/auth/resend-verification', { method: 'POST' }),
        refreshToken: () => apiFetch('/auth/refresh', { method: 'POST' }),
        logout: async () => {
            try { await apiFetch('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
            localStorage.removeItem('token');
        },
        getPresence: (docId: string) => apiFetch(`/collaboration/presence/${docId}`),
    },
    documentation: {
        list: () => apiFetch('/documentation/list'),
        create: (data: any) => apiFetch('/documentation/create', { method: 'POST', body: JSON.stringify(data) }),
        createEmpty: (data: any) => apiFetch('/documentation/create-empty', { method: 'POST', body: JSON.stringify(data) }),
        getById: (id: string) => apiFetch(`/documentation/${id}`),
        update: (id: string, content: any) => apiFetch(`/documentation/${id}`, { method: 'PATCH', body: typeof content === 'string' ? content : JSON.stringify(content) }),
        delete: (id: string) => apiFetch(`/documentation/${id}`, { method: 'DELETE' }),
        createRequest: (id: string, data: any) => apiFetch(`/documentation/${id}/request`, { method: 'POST', body: JSON.stringify(data) }),
        updateRequest: (requestId: string, content: any) => apiFetch(`/documentation/request/${requestId}`, { method: 'PATCH', body: JSON.stringify(content) }),
        deleteRequest: (requestId: string) => apiFetch(`/documentation/request/${requestId}`, { method: 'DELETE' }),
        bulkDeleteRequests: (requestIds: string[]) => apiFetch(`/documentation/request/bulk-delete`, { method: 'POST', body: JSON.stringify({ requestIds }) }),
        bulkMoveRequests: (requestIds: string[], folderId: string | null) => apiFetch(`/documentation/request/bulk-move`, { method: 'PATCH', body: JSON.stringify({ requestIds, folderId }) }),
        reorderRequests: (id: string, requests: any[]) => apiFetch(`/documentation/${id}/requests/reorder`, { method: 'PATCH', body: JSON.stringify({ requests }) }),
        togglePublic: (id: string, isPublic: boolean) => apiFetch(`/documentation/${id}/toggle-public`, { method: 'PATCH', body: JSON.stringify({ isPublic }) }),
        getSnippets: (requestId: string) => apiFetch(`/documentation/request/${requestId}/snippets`),
        getPublic: (slug: string) => fetch(`${API_URL}/api/documentation/public/${slug}`).then(r => r.json()),
        updateSlug: (id: string, slug: string) => apiFetch(`/documentation/${id}/slug`, { method: 'PATCH', body: JSON.stringify({ slug }) }),
        exportPostman: (id: string) => fetch(`${API_URL}/api/documentation/${id}/export/postman`, { headers: getHeaders() }).then(r => r.blob()),
        exportOpenApi: (id: string) => fetch(`${API_URL}/api/documentation/${id}/export/openapi`, { headers: getHeaders() }).then(r => r.blob()),
        getAuditLogs: (id: string) => apiFetch(`/documentation/${id}/audit-logs`),
        getRequestHistory: (requestId: string, page = 1, limit = 30) => apiFetch(`/documentation/request/${requestId}/history?page=${page}&limit=${limit}`),
        clearRequestHistory: (requestId: string) => apiFetch(`/documentation/request/${requestId}/history`, { method: 'DELETE' }),
    },
    folders: {
        list: (documentationId: string) => apiFetch(`/documentation/${documentationId}/folders`),
        create: (documentationId: string, data: { name: string; description?: string; parentId?: string | null }) =>
            apiFetch(`/documentation/${documentationId}/folders`, { method: 'POST', body: JSON.stringify(data) }),
        update: (folderId: string, data: { name?: string; description?: string | null; parentId?: string | null; order?: number }) =>
            apiFetch(`/documentation/folders/${folderId}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (folderId: string, moveRequestsToParent?: boolean) =>
            apiFetch(`/documentation/folders/${folderId}?moveRequestsToParent=${moveRequestsToParent || false}`, { method: 'DELETE' }),
        moveRequest: (requestId: string, folderId: string | null) =>
            apiFetch(`/documentation/request/${requestId}/move`, { method: 'PATCH', body: JSON.stringify({ folderId }) }),
        reorder: (documentationId: string, folders: { id: string; order: number; parentId?: string | null }[]) =>
            apiFetch(`/documentation/${documentationId}/folders/reorder`, { method: 'PATCH', body: JSON.stringify({ folders }) }),
    },
    environments: {
        list: (documentationId: string) => apiFetch(`/documentation/${documentationId}/environments`),
        create: (documentationId: string, data: { name: string; variables?: Record<string, string>; isActive?: boolean; secrets?: string[] }) =>
            apiFetch(`/documentation/${documentationId}/environments`, { method: 'POST', body: JSON.stringify(data) }),
        update: (environmentId: string, data: { name?: string; variables?: Record<string, string>; isActive?: boolean; order?: number; secrets?: string[] }) =>
            apiFetch(`/documentation/environments/${environmentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (environmentId: string) =>
            apiFetch(`/documentation/environments/${environmentId}`, { method: 'DELETE' }),
        setActive: (documentationId: string, environmentId: string | null) =>
            apiFetch(`/documentation/${documentationId}/environments/set-active`, { method: 'PATCH', body: JSON.stringify({ environmentId }) }),
        promote: (documentationId: string, data: { sourceId: string; targetId: string; keys?: string[]; overwrite?: boolean }) =>
            apiFetch(`/documentation/${documentationId}/environments/promote`, { method: 'POST', body: JSON.stringify(data) }),
        listGlobal: () => apiFetch('/documentation/global/list'),
        createGlobal: (data: { name: string; variables?: Record<string, string>; isActive?: boolean; secrets?: string[] }) =>
            apiFetch('/documentation/global', { method: 'POST', body: JSON.stringify(data) }),
        setActiveGlobal: (environmentId: string | null) =>
            apiFetch('/documentation/global/set-active', { method: 'PATCH', body: JSON.stringify({ environmentId }) }),
    },
    ai: {
        generateDocs: (data: any) => apiFetch('/ai/generate', { method: 'POST', body: JSON.stringify(data) }),
        generateTests: (data: any) => apiFetch('/ai/generate-tests', { method: 'POST', body: JSON.stringify(data) }),
        generateRequest: (prompt: string) => apiFetch('/ai/generate-request', { method: 'POST', body: JSON.stringify({ prompt }) }),
        explainError: (data: any) => apiFetch('/ai/explain-error', { method: 'POST', body: JSON.stringify(data) }),
        generateReadme: (data: { title: string; endpoints: any[] }) => apiFetch('/ai/generate-readme', { method: 'POST', body: JSON.stringify(data) }),
    },
    collaboration: {
        listCollaborators: (docId: string) => apiFetch(`/collaboration/${docId}/collaborators`),
        addCollaborator: (docId: string, email: string, role: string) => apiFetch('/collaboration/invite', { method: 'POST', body: JSON.stringify({ email, role, documentationId: docId }) }),
        updateCollaborator: (docId: string, collabId: string, role: string) => apiFetch(`/collaboration/collaborators/${collabId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
        removeCollaborator: (id: string) => apiFetch(`/collaboration/collaborators/${id}`, { method: 'DELETE' }),
        updatePresence: (docId: string, metadata: any) => apiFetch(`/collaboration/presence/${docId}/update`, { method: 'POST', body: JSON.stringify({ metadata }) }),
        invite: (data: any) => apiFetch('/collaboration/invite', { method: 'POST', body: JSON.stringify(data) }),
        updateRole: (id: string, role: string) => apiFetch(`/collaboration/collaborators/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
        cancelInvite: (id: string) => apiFetch(`/collaboration/invitations/${id}`, { method: 'DELETE' }),
        listMyInvitations: () => apiFetch('/collaboration/my-invitations'),
        acceptInvite: (token: string) => apiFetch('/collaboration/accept', { method: 'POST', body: JSON.stringify({ token }) }),
        rejectInvite: (token: string) => apiFetch('/collaboration/accept', { method: 'POST', body: JSON.stringify({ token, reject: true }) }),
    },
    monitor: {
        create: (data: any) => apiFetch('/monitor/create', { method: 'POST', body: JSON.stringify(data) }),
        list: (documentationId: string) => apiFetch(`/monitor/list?documentationId=${documentationId}`),
        getHistory: (monitorId: string) => apiFetch(`/monitor/history/${monitorId}`),
        update: (monitorId: string, data: any) => apiFetch(`/monitor/${monitorId}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (monitorId: string) => apiFetch(`/monitor/${monitorId}`, { method: 'DELETE' }),
        trigger: (monitorId: string) => apiFetch(`/monitor/trigger/${monitorId}`, { method: 'POST' }),
        heatmap: (monitorId: string) => apiFetch(`/monitor/${monitorId}/heatmap`),
        getPublicStatus: (slug: string) => fetch(`${API_URL}/api/monitor/public/${slug}`).then(r => r.json()),
        history: (monitorId: string, limit: number) => apiFetch(`/monitor/${monitorId}/history?limit=${limit}`),
        check: (monitorId: string) => apiFetch(`/monitor/${monitorId}/check`, { method: 'POST' }),
    },
    admin: {
        // Templates
        listTemplates: () => apiFetch('/admin/templates'),
        listLogs: () => apiFetch('/admin/logs'),
        deleteTemplate: (id: string) => apiFetch(`/admin/templates/${id}`, { method: 'DELETE' }),
        updateTemplate: (id: string, data: any) => apiFetch(`/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        createTemplate: (data: any) => apiFetch('/admin/templates', { method: 'POST', body: JSON.stringify(data) }),
        // Overview
        overviewStats: () => apiFetch('/admin/overview/stats'),
        overviewCharts: () => apiFetch('/admin/overview/charts'),
        // User Management
        getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; verified?: string }) => {
            const qs = new URLSearchParams();
            if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
            return apiFetch(`/admin/users?${qs.toString()}`);
        },
        updateUser: (id: string, data: any) => apiFetch(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        deleteUser: (id: string) => apiFetch(`/admin/users/${id}`, { method: 'DELETE' }),
        resetUserPassword: (id: string) => apiFetch(`/admin/users/${id}/reset-password`, { method: 'POST' }),
        // Settings
        getFeatureFlags: () => apiFetch('/admin/settings/feature-flags'),
        getSmtpStatus: () => apiFetch('/admin/settings/smtp-status'),
        getMigrationStatus: () => apiFetch('/admin/settings/migrations'),
        clearSessions: () => apiFetch('/admin/settings/clear-sessions', { method: 'POST' }),
    },
    snapshot: {
        list: (id: string) => apiFetch(`/snapshot/list/${id}`),
        create: (data: { documentationId: string; name: string }) => apiFetch('/snapshot/create', { method: 'POST', body: JSON.stringify(data) }),
        restore: (id: string) => apiFetch(`/snapshot/restore/${id}`, { method: 'POST' }),
        delete: (id: string) => apiFetch(`/snapshot/${id}`, { method: 'DELETE' }),
        getOne: (id: string) => apiFetch(`/snapshot/${id}`),
    },
    todos: {
        list: (referenceId?: string, referenceType?: string) => {
            const params = new URLSearchParams();
            if (referenceId) params.append('referenceId', referenceId);
            if (referenceType) params.append('referenceType', referenceType);
            const query = params.toString();
            return apiFetch(`/todos${query ? `?${query}` : ''}`);
        },
        create: (data: any) => apiFetch('/todos', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiFetch(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/todos/${id}`, { method: 'DELETE' }),
        toggle: (id: string) => apiFetch(`/todos/${id}/toggle`, { method: 'PATCH' }),
    },
    notes: {
        list: (referenceId?: string, referenceType?: string) => {
            const params = new URLSearchParams();
            if (referenceId) params.append('referenceId', referenceId);
            if (referenceType) params.append('referenceType', referenceType);
            const query = params.toString();
            return apiFetch(`/notes${query ? `?${query}` : ''}`);
        },
        create: (data: any) => apiFetch('/notes', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiFetch(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/notes/${id}`, { method: 'DELETE' }),
    },
    scheduler: {
        getTasks: () => apiFetch('/scheduler/tasks'),
        getHabits: () => apiFetch('/scheduler/habits'),
        getEvents: (start: string, end: string) => apiFetch('/scheduler/events', { method: 'POST', body: JSON.stringify({ start, end }) }),
        optimize: () => apiFetch('/scheduler/optimize', { method: 'POST' }),
        createTask: (data: any) => apiFetch('/scheduler/tasks', { method: 'POST', body: JSON.stringify(data) }),
        updateTask: (id: string, data: any) => apiFetch(`/scheduler/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        deleteTask: (id: string) => apiFetch(`/scheduler/tasks/${id}`, { method: 'DELETE' }),
        createHabit: (data: any) => apiFetch('/scheduler/habits', { method: 'POST', body: JSON.stringify(data) }),
    },
    contact: {
        submit: (data: any) => apiFetch('/contact', { method: 'POST', body: JSON.stringify(data) }),
        list: (status?: string) => apiFetch(`/contact${status ? `?status=${status}` : ''}`),
        updateStatus: (id: string, status: string) => apiFetch(`/contact/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
        delete: (id: string) => apiFetch(`/contact/${id}`, { method: 'DELETE' }),
        reply: (id: string, replyBody: string) => apiFetch(`/contact/${id}/reply`, { method: 'POST', body: JSON.stringify({ replyBody }) }),
    },
    emailTemplates: {
        list: () => apiFetch('/email-templates'),
        get: (id: string) => apiFetch(`/email-templates/${id}`),
        create: (data: any) => apiFetch('/email-templates', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiFetch(`/email-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/email-templates/${id}`, { method: 'DELETE' }),
        sendTest: (id: string, to: string, variables: Record<string, string>) => apiFetch(`/email-templates/${id}/test`, { method: 'POST', body: JSON.stringify({ to, variables }) }),
        logs: () => apiFetch('/email-templates/logs/all'),
    },
    errorLogs: {
        list: (params?: { page?: number; limit?: number; level?: string; service?: string; errorCode?: string; search?: string; dateFrom?: string; dateTo?: string }) => {
            const qs = new URLSearchParams();
            if (params) Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
            return apiFetch(`/error-logs?${qs.toString()}`);
        },
        get: (id: string) => apiFetch(`/error-logs/${id}`),
        stats: () => apiFetch('/error-logs/stats/summary'),
        cleanup: (days?: number) => apiFetch(`/error-logs/cleanup${days ? `?days=${days}` : ''}`, { method: 'DELETE' }),
    },
    webhooks: {
        list: (documentationId: string) => apiFetch(`/webhooks?documentationId=${documentationId}`),
        create: (data: any) => apiFetch('/webhooks', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiFetch(`/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/webhooks/${id}`, { method: 'DELETE' }),
        test: (id: string) => apiFetch(`/webhooks/${id}/test`, { method: 'POST' }),
        getLogs: (id: string) => apiFetch(`/webhooks/${id}/logs`),
    },
    mock: {
        getConfig: (requestId: string) => apiFetch(`/mock/config/${requestId}`),
        updateConfig: (data: any) => apiFetch('/mock/config', { method: 'POST', body: JSON.stringify(data) }),
    },
    workspaces: {
        list: (page = 1, limit = 20) => apiFetch(`/workspaces?page=${page}&limit=${limit}`),
        create: (data: { name: string; description?: string }) => apiFetch('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
        getById: (id: string) => apiFetch(`/workspaces/${id}`),
        update: (id: string, data: any) => apiFetch(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/workspaces/${id}`, { method: 'DELETE' }),
        addMember: (id: string, email: string, role = 'MEMBER') => apiFetch(`/workspaces/${id}/members`, { method: 'POST', body: JSON.stringify({ email, role }) }),
        removeMember: (id: string, userId: string) => apiFetch(`/workspaces/${id}/members/${userId}`, { method: 'DELETE' }),
        moveCollection: (wsId: string, docId: string) => apiFetch(`/workspaces/${wsId}/collections/${docId}`, { method: 'PATCH' }),
    },
    tags: {
        list: () => apiFetch('/tags'),
        create: (name: string, color?: string) => apiFetch('/tags', { method: 'POST', body: JSON.stringify({ name, color }) }),
        update: (id: string, data: { name?: string; color?: string }) => apiFetch(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/tags/${id}`, { method: 'DELETE' }),
        assign: (tagId: string, entityId: string, entityType: string) => apiFetch('/tags/assign', { method: 'POST', body: JSON.stringify({ tagId, entityId, entityType }) }),
        unassign: (tagId: string, entityId: string, entityType: string) => apiFetch('/tags/unassign', { method: 'POST', body: JSON.stringify({ tagId, entityId, entityType }) }),
        getForEntity: (entityType: string, entityId: string) => apiFetch(`/tags/entity/${entityType}/${entityId}`),
        search: (tagId: string) => apiFetch(`/tags/search/${tagId}`),
    },
    notifications: {
        list: (page = 1) => apiFetch(`/notifications?page=${page}`),
        markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
        markAllRead: () => apiFetch('/notifications/read-all', { method: 'PATCH' }),
        delete: (id: string) => apiFetch(`/notifications/${id}`, { method: 'DELETE' }),
        getPreferences: () => apiFetch('/notifications/preferences'),
        updatePreference: (code: string, in_app: boolean, email: boolean) => apiFetch('/notifications/preferences', { method: 'PUT', body: JSON.stringify({ code, in_app, email }) }),
        listCodes: () => apiFetch('/notifications/codes'),
        createCode: (data: any) => apiFetch('/notifications/codes', { method: 'POST', body: JSON.stringify(data) }),
        updateCode: (code: string, data: any) => apiFetch(`/notifications/codes/${code}`, { method: 'PATCH', body: JSON.stringify(data) }),
        deleteCode: (code: string) => apiFetch(`/notifications/codes/${code}`, { method: 'DELETE' }),
    },
    comments: {
        list: (requestId: string) => apiFetch(`/comments/${requestId}`),
        create: (requestId: string, content: string, parentId?: string) => apiFetch(`/comments/${requestId}`, { method: 'POST', body: JSON.stringify({ content, parentId }) }),
        update: (commentId: string, content: string) => apiFetch(`/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
        resolve: (commentId: string) => apiFetch(`/comments/${commentId}/resolve`, { method: 'PATCH' }),
        delete: (commentId: string) => apiFetch(`/comments/${commentId}`, { method: 'DELETE' }),
    },
    requestTemplates: {
        list: (category?: string) => apiFetch(`/templates${category ? `?category=${category}` : ''}`),
        create: (data: any) => apiFetch('/templates', { method: 'POST', body: JSON.stringify(data) }),
        createFromRequest: (requestId: string) => apiFetch(`/templates/from-request/${requestId}`, { method: 'POST' }),
        delete: (id: string) => apiFetch(`/templates/${id}`, { method: 'DELETE' }),
    },
    search: {
        query: (q: string, type = 'all', method?: string) => {
            const params = new URLSearchParams({ q, type });
            if (method) params.set('method', method);
            return apiFetch(`/search?${params.toString()}`);
        },
    },
    execute: {
        run: (data: any) => apiFetch('/execute', { method: 'POST', body: JSON.stringify(data) }),
        graphqlIntrospect: (url: string, headers?: Record<string, string>) => apiFetch('/execute/graphql/introspect', { method: 'POST', body: JSON.stringify({ url, headers }) }),
        collection: (data: any) => apiFetch('/execute/collection', { method: 'POST', body: JSON.stringify(data) }),
    },
    git: {
        listRepos: () => apiFetch('/git/repos'),
        addRepo: (path: string) => apiFetch('/git/repos', { method: 'POST', body: JSON.stringify({ path }) }),
        removeRepo: (id: string) => apiFetch(`/git/repos/${id}`, { method: 'DELETE' }),
        status: (path: string) => apiFetch('/git/status', { method: 'POST', body: JSON.stringify({ path }) }),
        diff: (path: string, file: string, staged = false) => apiFetch('/git/diff', { method: 'POST', body: JSON.stringify({ path, file, staged }) }),
        stage: (path: string, files?: string[], all = false) => apiFetch('/git/stage', { method: 'POST', body: JSON.stringify({ path, files, all }) }),
        unstage: (path: string, files?: string[], all = false) => apiFetch('/git/unstage', { method: 'POST', body: JSON.stringify({ path, files, all }) }),
        discard: (path: string, files: string[]) => apiFetch('/git/discard', { method: 'POST', body: JSON.stringify({ path, files }) }),
        commit: (path: string, message: string) => apiFetch('/git/commit', { method: 'POST', body: JSON.stringify({ path, message }) }),
        push: (path: string, remote?: string, branch?: string) => apiFetch('/git/push', { method: 'POST', body: JSON.stringify({ path, remote, branch }) }),
        pull: (path: string, remote?: string, branch?: string) => apiFetch('/git/pull', { method: 'POST', body: JSON.stringify({ path, remote, branch }) }),
        fetch: (path: string, remote?: string) => apiFetch('/git/fetch', { method: 'POST', body: JSON.stringify({ path, remote }) }),
        branches: (path: string) => apiFetch('/git/branches', { method: 'POST', body: JSON.stringify({ path }) }),
        switchBranch: (path: string, branch: string) => apiFetch('/git/branches/switch', { method: 'POST', body: JSON.stringify({ path, branch }) }),
        createBranch: (path: string, branch: string) => apiFetch('/git/branches/create', { method: 'POST', body: JSON.stringify({ path, branch }) }),
        deleteBranch: (path: string, branch: string, force = false) => apiFetch('/git/branches/delete', { method: 'POST', body: JSON.stringify({ path, branch, force }) }),
        mergeBranch: (path: string, branch: string) => apiFetch('/git/branches/merge', { method: 'POST', body: JSON.stringify({ path, branch }) }),
        log: (path: string, limit = 50, skip = 0) => apiFetch('/git/log', { method: 'POST', body: JSON.stringify({ path, limit, skip }) }),
        stash: (path: string, message?: string) => apiFetch('/git/stash', { method: 'POST', body: JSON.stringify({ path, message }) }),
        stashPop: (path: string) => apiFetch('/git/stash/pop', { method: 'POST', body: JSON.stringify({ path }) }),
        stashList: (path: string) => apiFetch('/git/stash/list', { method: 'POST', body: JSON.stringify({ path }) }),
        clone: (url: string, targetDir: string) => apiFetch('/git/clone', { method: 'POST', body: JSON.stringify({ url, targetDir }) }),
        remotes: (path: string) => apiFetch('/git/remotes', { method: 'POST', body: JSON.stringify({ path }) }),
        addRemote: (path: string, name: string, url: string) => apiFetch('/git/remotes/add', { method: 'POST', body: JSON.stringify({ path, name, url }) }),
        removeRemote: (path: string, name: string) => apiFetch('/git/remotes/remove', { method: 'POST', body: JSON.stringify({ path, name }) }),
    },
    github: {
        getAuthUrl: () => apiFetch('/auth/github/authorize'),
        listAccounts: () => apiFetch('/auth/github/accounts'),
        activateAccount: (id: string) => apiFetch(`/auth/github/accounts/${id}/activate`, { method: 'PATCH' }),
        removeAccount: (id: string) => apiFetch(`/auth/github/accounts/${id}`, { method: 'DELETE' }),
        validateAccount: (id: string) => apiFetch(`/auth/github/accounts/${id}/validate`),
        getGitStatus: () => apiFetch('/auth/github/git-status'),
    },
};
