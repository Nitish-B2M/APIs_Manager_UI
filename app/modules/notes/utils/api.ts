const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

function getAuthHeaders(): HeadersInit {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export interface NoteListItem {
    id: string;
    title: string;
    default_font: string;
    is_pinned?: boolean;
    createdAt: string;
    updatedAt: string;
    is_deleted?: boolean;
    deleted_at?: string | null;
}

export interface NoteDetail {
    id: string;
    title: string;
    content_json: any;
    content_html: string | null;
    default_font: string;
    is_pinned?: boolean;
    createdAt: string;
    updatedAt: string;
    is_deleted?: boolean;
    deleted_at?: string | null;
}

export async function fetchNotes(): Promise<NoteListItem[]> {
    const res = await fetch(`${API_BASE}/api/notes`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notes');
    const json = await res.json();
    return json.data;
}

export async function fetchNote(id: string): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE}/api/notes/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch note');
    const json = await res.json();
    return json.data;
}

export async function createNote(data: { title: string }): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create note');
    const json = await res.json();
    return json.data;
}

export async function updateNote(
    id: string,
    data: Partial<{ title: string; content_json: any; content_html: string | null; default_font: string }>
): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE}/api/notes/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update note');
    const json = await res.json();
    return json.data;
}

export async function deleteNote(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/notes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete note');
}

export async function pinNote(id: string): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE}/api/notes/${id}/pin`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle pin');
    const json = await res.json();
    return json.data;
}

export async function fetchTrash(): Promise<NoteListItem[]> {
    const res = await fetch(`${API_BASE}/api/notes/trash/list`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch trash');
    const json = await res.json();
    return json.data;
}

export async function restoreNote(id: string): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE}/api/notes/${id}/restore`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to restore note');
    const json = await res.json();
    return json.data;
}
