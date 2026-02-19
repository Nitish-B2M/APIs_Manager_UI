export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function apiFetch(path: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        updateProfile: (data: { name?: string; avatarUrl?: string | null }) => apiFetch('/auth/profile', { method: 'PATCH', body: JSON.stringify(data) }),
        forgotPassword: (email: string) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
        resetPassword: (token: string, password: string) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
    },
    documentation: {
        list: () => apiFetch('/documentation/list'),
        getById: (id: string) => apiFetch(`/documentation/${id}`),
        create: (data: any) => apiFetch('/documentation/create', { method: 'POST', body: JSON.stringify(data) }),
        createEmpty: (data: any) => apiFetch('/documentation/create-empty', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, content: any) => apiFetch(`/documentation/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
        updateRequest: (requestId: string, data: any) => apiFetch(`/documentation/request/${requestId}`, { method: 'PATCH', body: JSON.stringify(data) }),
        createRequest: (id: string, data: any = {}) => apiFetch(`/documentation/${id}/request`, { method: 'POST', body: JSON.stringify(data) }),
        deleteRequest: (requestId: string) => apiFetch(`/documentation/request/${requestId}`, { method: 'DELETE' }),
        reorderRequests: (id: string, requests: { id: string; order: number }[]) =>
            apiFetch(`/documentation/${id}/requests/reorder`, { method: 'PATCH', body: JSON.stringify({ requests }) }),
        delete: (id: string) => apiFetch(`/documentation/${id}`, { method: 'DELETE' }),
        togglePublic: (id: string, isPublic: boolean) => apiFetch(`/documentation/${id}/toggle-public`, { method: 'PATCH', body: JSON.stringify({ isPublic }) }),
        getSnippets: (requestId: string) => apiFetch(`/documentation/request/${requestId}/snippets`),
        getPublic: (slug: string) => fetch(`${API_URL}/api/documentation/public/${slug}`).then(r => r.json()),
        updateSlug: (id: string, slug: string) => apiFetch(`/documentation/${id}/slug`, { method: 'PATCH', body: JSON.stringify({ slug }) }),
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
        create: (documentationId: string, data: { name: string; variables?: Record<string, string>; isActive?: boolean }) =>
            apiFetch(`/documentation/${documentationId}/environments`, { method: 'POST', body: JSON.stringify(data) }),
        update: (environmentId: string, data: { name?: string; variables?: Record<string, string>; isActive?: boolean; order?: number }) =>
            apiFetch(`/documentation/environments/${environmentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (environmentId: string) =>
            apiFetch(`/documentation/environments/${environmentId}`, { method: 'DELETE' }),
        setActive: (documentationId: string, environmentId: string | null) =>
            apiFetch(`/documentation/${documentationId}/environments/set-active`, { method: 'PATCH', body: JSON.stringify({ environmentId }) }),
    },
    ai: {
        generateDocs: (data: any) => apiFetch('/ai/generate-docs', { method: 'POST', body: JSON.stringify(data) }),
    }
};
