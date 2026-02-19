import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnvironments } from '../../hooks/useEnvironments';
import React from 'react';

// Mock the API
vi.mock('../../utils/api', () => ({
    api: {
        environments: {
            list: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            setActive: vi.fn(),
        },
    },
}));

import { api } from '../../utils/api';

// Wrapper for React Query
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('useEnvironments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch environments', async () => {
        const mockEnvironments = [
            { id: 'env-1', name: 'Development', variables: { baseUrl: 'http://dev.api.com' }, isActive: true },
            { id: 'env-2', name: 'Production', variables: { baseUrl: 'http://api.com' }, isActive: false },
        ];

        (api.environments.list as any).mockResolvedValue({ data: mockEnvironments });

        const { result } = renderHook(
            () => useEnvironments({ documentationId: 'doc-1', enabled: true }),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.environments).toHaveLength(2);
        });

        expect(result.current.activeEnvironment).toEqual(mockEnvironments[0]);
        expect(api.environments.list).toHaveBeenCalledWith('doc-1');
    });

    it('should return null activeEnvironment when none is active', async () => {
        const mockEnvironments = [
            { id: 'env-1', name: 'Development', variables: {}, isActive: false },
        ];

        (api.environments.list as any).mockResolvedValue({ data: mockEnvironments });

        const { result } = renderHook(
            () => useEnvironments({ documentationId: 'doc-1', enabled: true }),
            { wrapper: createWrapper() }
        );

        await waitFor(() => {
            expect(result.current.environments).toHaveLength(1);
        });

        expect(result.current.activeEnvironment).toBeNull();
    });

    it('should not fetch when disabled', async () => {
        (api.environments.list as any).mockResolvedValue({ data: [] });

        const { result } = renderHook(
            () => useEnvironments({ documentationId: 'doc-1', enabled: false }),
            { wrapper: createWrapper() }
        );

        expect(api.environments.list).not.toHaveBeenCalled();
        expect(result.current.environments).toEqual([]);
    });
});
