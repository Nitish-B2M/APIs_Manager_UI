'use client';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { trpc } from '../utils/trpc';

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
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/trpc`,
                    headers() {
                        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                        return token ? { Authorization: `Bearer ${token}` } : {};
                    },
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}
