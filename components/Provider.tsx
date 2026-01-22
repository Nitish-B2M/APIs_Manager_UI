'use client';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function Provider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        mutationCache: new MutationCache({
            onError: (error) => {
                toast.error(`Error: ${error.message}`);
            },
        }),
        queryCache: new QueryCache({
            onError: (error) => {
                toast.error(`Error: ${error.message}`);
            },
        }),
    }));

    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
}
