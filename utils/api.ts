export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export function getHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export async function apiFetch(path: string, options: RequestInit = {}) {
    const headers = {
        ...getHeaders(),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}/api${path}`, {
        ...options,
        headers,
    });

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

        // Global Environments
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
        listCollaborators: (docId: string) => apiFetch(`/collaboration/documentation/${docId}/collaborators`),
        addCollaborator: (docId: string, email: string, role: string) => apiFetch(`/collaboration/documentation/${docId}/collaborators`, { method: 'POST', body: JSON.stringify({ email, role }) }),
        updateCollaborator: (docId: string, collabId: string, role: string) => apiFetch(`/collaboration/documentation/${docId}/collaborators/${collabId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
        removeCollaborator: (id: string) => apiFetch(`/collaboration/collaborator/${id}`, { method: 'DELETE' }),
        updatePresence: (docId: string, metadata: any) => apiFetch(`/collaboration/presence/${docId}`, { method: 'POST', body: JSON.stringify({ metadata }) }),
        invite: (data: any) => apiFetch('/collaboration/invite', { method: 'POST', body: JSON.stringify(data) }),
        updateRole: (id: string, role: string) => apiFetch(`/collaboration/collaborator/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
        cancelInvite: (id: string) => apiFetch(`/collaboration/invite/${id}`, { method: 'DELETE' }),
        listMyInvitations: () => apiFetch('/collaboration/invitations/me'),
        acceptInvite: (token: string) => apiFetch(`/collaboration/invite/${token}/accept`, { method: 'POST' }),
        rejectInvite: (token: string) => apiFetch(`/collaboration/invite/${token}/reject`, { method: 'POST' }),
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
        getStats: () => apiFetch('/admin/stats'),
        getUsers: () => apiFetch('/admin/users'),
        getLogs: () => apiFetch('/admin/logs'),
        listTemplates: () => apiFetch('/admin/templates'),
        listLogs: () => apiFetch('/admin/logs'),
        deleteTemplate: (id: string) => apiFetch(`/admin/templates/${id}`, { method: 'DELETE' }),
        updateTemplate: (id: string, data: any) => apiFetch(`/admin/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        createTemplate: (data: any) => apiFetch('/admin/templates', { method: 'POST', body: JSON.stringify(data) }),
    },
    snapshot: {
        list: (id: string) => apiFetch(`/documentation/${id}/snapshots`),
        create: (data: { documentationId: string; name: string }) => apiFetch('/documentation/snapshots', { method: 'POST', body: JSON.stringify(data) }),
        restore: (id: string) => apiFetch(`/documentation/snapshots/${id}/restore`, { method: 'POST' }),
        delete: (id: string) => apiFetch(`/documentation/snapshots/${id}`, { method: 'DELETE' }),
        getOne: (id: string) => apiFetch(`/documentation/snapshots/${id}`),
    },
    todos: {
        list: () => apiFetch('/todos'),
        create: (data: any) => apiFetch('/todos', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiFetch(`/todos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/todos/${id}`, { method: 'DELETE' }),
        toggle: (id: string) => apiFetch(`/todos/${id}/toggle`, { method: 'PATCH' }),
    },
    notes: {
        list: () => apiFetch('/notes'),
        create: (data: any) => apiFetch('/notes', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiFetch(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
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
        submit: (data: any) => apiFetch('/contact/submit', { method: 'POST', body: JSON.stringify(data) }),
        list: (status?: string) => apiFetch(`/contact/list${status ? `?status=${status}` : ''}`),
        updateStatus: (id: string, status: string) => apiFetch(`/contact/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
        delete: (id: string) => apiFetch(`/contact/${id}`, { method: 'DELETE' }),
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
    }
};
