// ============================================
// HTTP & Request Types
// ============================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ProtocolType = 'REST' | 'WS' | 'SSE' | 'GRAPHQL';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type ParamType = 'path' | 'query';

export interface RequestParam {
    key: string;
    value: string;
    type: ParamType;
}

export interface RequestHeader {
    key: string;
    value: string;
}

export interface FormDataField {
    key: string;
    value: string;
    type: 'text' | 'file';
    file?: File | null;
}

export interface RequestBody {
    mode: 'raw' | 'formdata' | 'urlencoded' | 'graphql';
    raw: string;
    formdata?: FormDataField[];
    graphql?: {
        query: string;
        variables: string;
    };
}

export interface ApiResponse {
    status: number;
    statusText: string;
    time: number;
    size: number;
    data: unknown;
    timestamp: string;
    testResults?: TestResult[];
}

export interface ApiErrorResponse {
    error: true;
    message: string;
}

export type ResponseResult = ApiResponse | ApiErrorResponse;

// ============================================
// Assertion / Test Types
// ============================================

export type AssertionType = 'status_code' | 'response_time' | 'body_contains' | 'json_value';

export interface RequestAssertion {
    id: string;
    type: AssertionType;
    expected: string;
    property?: string; // dot-path for json_value, e.g. "data.user.id"
}

export interface TestResult {
    assertionId: string;
    name: string;
    passed: boolean;
    message: string;
}

// ============================================
// Protocol-Specific Types
// ============================================

export interface WebsocketMessage {
    id: string;
    type: 'sent' | 'received';
    data: string;
    timestamp: string;
}

export interface SSEEvent {
    id: string;
    event?: string;
    data: string;
    timestamp: string;
}

// ============================================
// Endpoint / Request Types
// ============================================

export interface HistoryItem {
    name: string;
    method: HttpMethod;
    url: string;
    headers: RequestHeader[];
    body: RequestBody;
    params: RequestParam[];
    description: string;
    lastResponse: ApiResponse | null;
    timestamp: string;
}

// ============================================
// Auth Config Types
// ============================================

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface AuthNone { type: 'none' }
export interface AuthBearer { type: 'bearer'; token: string }
export interface AuthBasic { type: 'basic'; username: string; password: string }
export interface AuthApiKey { type: 'apikey'; key: string; value: string; addTo: 'header' | 'query' }

export type AuthConfig = AuthNone | AuthBearer | AuthBasic | AuthApiKey;

export interface Endpoint {
    id?: string;
    name: string;
    method: HttpMethod;
    protocol?: ProtocolType;
    url: string;
    headers: RequestHeader[];
    body: RequestBody;
    params: RequestParam[];
    description: string;
    auth?: AuthConfig;
    assertions?: RequestAssertion[];
    lastResponse: ApiResponse | null;
    history: HistoryItem[];
    folderId?: string | null;
    order?: number;
    createdAt?: string;
    updatedAt?: string;
}

// ============================================
// Folder Types
// ============================================

export interface Folder {
    id: string;
    documentationId: string;
    name: string;
    description?: string | null;
    parentId?: string | null;
    order: number;
    createdAt: string;
    updatedAt: string;
}

export interface FolderWithChildren extends Folder {
    children: FolderWithChildren[];
    requests: Endpoint[];
}

// ============================================
// Environment Types
// ============================================

export interface Environment {
    id: string;
    documentationId: string | null;
    userId: string;
    name: string;
    variables: Record<string, string>;
    secrets: string[];
    scope: 'COLLECTION' | 'GLOBAL';
    isActive: boolean;
    order: number;
    createdAt: string;
    updatedAt: string;
}

// ============================================
// Documentation Types
// ============================================

export type LayoutType = 'STANDARD' | 'MINIMAL' | 'DETAILED';

export interface DocumentationContent {
    endpoints?: Endpoint[];
    variables?: Record<string, string>;
}

export interface Documentation {
    id: string;
    title: string;
    content: DocumentationContent | string;
    layout: LayoutType;
    userId: string;
    isPublic: boolean;
    slug?: string;
    createdAt: string;
    updatedAt: string;
    requests?: Endpoint[];
    role?: UserRole; // Current user's role in this documentation
    collaborators?: Collaborator[];
}

// ============================================
// Collaboration & RBAC Types
// ============================================

export type UserRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface Collaborator {
    id: string;
    role: UserRole;
    createdAt: string;
    email: string;
    name?: string;
    avatarUrl?: string;
}

export interface Invitation {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string;
    expiresAt: string;
}

// ============================================
// User & Auth Types
// ============================================

export interface User {
    id: string;
    email: string;
    userId?: string;
    name?: string;
    avatarUrl?: string;
}

export interface AuthResponse {
    status: boolean;
    message: string;
    token: string;
    data: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    email: string;
    password: string;
}

// ============================================
// API Response Wrapper Types
// ============================================

export interface ApiSuccessResponse<T> {
    status: boolean;
    message: string;
    data: T;
}

export interface ApiListResponse<T> {
    status: boolean;
    message: string;
    data: T[];
}

// ============================================
// UI State Types
// ============================================

export type TabType = 'params' | 'headers' | 'auth' | 'body' | 'docs' | 'ai' | 'share' | 'code';

export type PaneLayout = 'horizontal' | 'vertical';

export type ThemeMode = 'light' | 'dark';

// ============================================
// Form Validation Schemas (Zod)
// ============================================

import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createCollectionSchema = z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
});

export const createFolderSchema = z.object({
    name: z.string().min(1, 'Folder name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreateCollectionFormData = z.infer<typeof createCollectionSchema>;
export type CreateFolderFormData = z.infer<typeof createFolderSchema>;

// ============================================
// Utility Types
// ============================================

export interface EnvironmentVariable {
    key: string;
    value: string;
}

export interface CopyFormat {
    type: 'curl' | 'fetch' | 'markdown' | 'url';
}
