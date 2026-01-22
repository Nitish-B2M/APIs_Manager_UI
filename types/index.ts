export interface Documentation {
    id: string;
    title: string;
    content: any;
    layout: string;
    userId: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    email: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}
