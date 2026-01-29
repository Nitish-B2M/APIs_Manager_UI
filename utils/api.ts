const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
    },
    documentation: {
        list: () => apiFetch('/documentation/list'),
        getById: (id: string) => apiFetch(`/documentation/${id}`),
        create: (data: any) => apiFetch('/documentation/create', { method: 'POST', body: JSON.stringify(data) }),
        createEmpty: (data: any) => apiFetch('/documentation/create-empty', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, content: any) => apiFetch(`/documentation/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
        updateRequest: (requestId: string, data: any) => apiFetch(`/documentation/request/${requestId}`, { method: 'PATCH', body: JSON.stringify(data) }),
        createRequest: (id: string, data: any = {}) => apiFetch(`/documentation/${id}/request`, { method: 'POST', body: JSON.stringify(data) }),
        delete: (id: string) => apiFetch(`/documentation/${id}`, { method: 'DELETE' }),
        togglePublic: (id: string, isPublic: boolean) => apiFetch(`/documentation/${id}/toggle-public`, { method: 'PATCH', body: JSON.stringify({ isPublic }) }),
    },
    ai: {
        generateDocs: (data: any) => apiFetch('/ai/generate-docs', { method: 'POST', body: JSON.stringify(data) }),
    }
};
