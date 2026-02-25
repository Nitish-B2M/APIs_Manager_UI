import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Endpoint } from '@/types';

interface PostmanDocsDB extends DBSchema {
    collections: {
        key: string;
        value: {
            id: string;
            title: string;
            description?: string;
            isPublic: boolean;
            updatedAt: string;
            folders: any[];
            requests: Endpoint[];
        };
    };
    environments: {
        key: string;
        value: {
            documentationId: string;
            id: string;
            name: string;
            variables: Record<string, string>;
        }[];
    };
    syncQueue: {
        key: number;
        value: {
            id?: number;
            type: 'saveRequest' | 'createRequest' | 'deleteRequest';
            data: any;
            timestamp: number;
        };
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'postmanDocsDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PostmanDocsDB>> | null = null;

if (typeof window !== 'undefined') {
    dbPromise = openDB<PostmanDocsDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('collections')) {
                db.createObjectStore('collections', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('environments')) {
                db.createObjectStore('environments', { keyPath: 'documentationId' });
            }
            if (!db.objectStoreNames.contains('syncQueue')) {
                const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                queueStore.createIndex('by-timestamp', 'timestamp');
            }
        },
    });
}

// Collections
export async function cacheCollection(id: string, data: any) {
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.put('collections', { ...data, id });
}

export async function getCachedCollection(id: string) {
    if (!dbPromise) return null;
    const db = await dbPromise;
    return db.get('collections', id);
}

// Environments
export async function cacheEnvironments(documentationId: string, envs: any[]) {
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.put('environments', envs as any);
}

export async function getCachedEnvironments(documentationId: string) {
    if (!dbPromise) return null;
    const db = await dbPromise;
    return db.get('environments', documentationId);
}

// Sync Queue
export async function enqueueSync(type: 'saveRequest' | 'createRequest' | 'deleteRequest', data: any) {
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.add('syncQueue', {
        type,
        data,
        timestamp: Date.now(),
    });
}

export async function getSyncQueue() {
    if (!dbPromise) return [];
    const db = await dbPromise;
    return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

export async function clearSyncQueueItem(id: number) {
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.delete('syncQueue', id);
}

export async function clearAllSyncQueue() {
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.clear('syncQueue');
}
