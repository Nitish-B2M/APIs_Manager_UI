// ============================================
// HTTP & Request Types
// ============================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

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

export interface RequestBody {
    mode: 'raw' | 'formdata' | 'urlencoded';
    raw: string;
}

export interface ApiResponse {
    status: number;
    statusText: string;
    time: number;
    data: unknown;
    timestamp: string;
}

export interface ApiErrorResponse {
    error: true;
    message: string;
}

export type ResponseResult = ApiResponse | ApiErrorResponse;

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

export interface Endpoint {
    id?: string;
    name: string;
    method: HttpMethod;
    url: string;
    headers: RequestHeader[];
    body: RequestBody;
    params: RequestParam[];
    description: string;
    lastResponse: ApiResponse | null;
    history: HistoryItem[];
    createdAt?: string;
    updatedAt?: string;
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
    createdAt: string;
    updatedAt: string;
    requests?: Endpoint[];
}

// ============================================
// User & Auth Types
// ============================================

export interface User {
    id: string;
    email: string;
    userId?: string;
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

export type TabType = 'params' | 'headers' | 'body' | 'docs' | 'ai' | 'share';

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

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreateCollectionFormData = z.infer<typeof createCollectionSchema>;

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
