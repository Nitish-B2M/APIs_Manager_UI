'use client';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function Provider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        mutationCache: new MutationCache({
            onError: (error) => {
                // Toasts are handled individually in components
                console.error('Mutation Error:', error);
            },
        }),
        queryCache: new QueryCache({
            onError: (error) => {
                // Toasts are handled individually in components
                console.error('Query Error:', error);
            },
        }),
    }));

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
