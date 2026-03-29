/**
 * Component tests for AccountSwitcher and related components.
 *
 * These tests mock window.githubAccounts to simulate the Electron bridge.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AccountSwitcher from '../AccountSwitcher';
import AccountCard from '../AccountCard';
import AddAccountButton from '../AddAccountButton';
import { GithubAccountProvider } from '../../../context/GithubAccountContext';
import type { GithubAccount } from '../../../types/electron';

const mockAccount: GithubAccount = {
    id: 'acct-1',
    githubId: 12345,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    addedAt: '2024-01-01T00:00:00.000Z',
    lastUsed: '2024-06-01T00:00:00.000Z',
};

const mockAccount2: GithubAccount = {
    id: 'acct-2',
    githubId: 67890,
    login: 'anotheruser',
    name: 'Another User',
    email: 'another@example.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/67890',
    addedAt: '2024-02-01T00:00:00.000Z',
    lastUsed: '2024-05-01T00:00:00.000Z',
};

function setupMockGithubAccounts(accounts: GithubAccount[] = [], activeId: string | null = null) {
    const api = {
        getAll: vi.fn().mockResolvedValue(accounts),
        getActive: vi.fn().mockResolvedValue(activeId ? accounts.find(a => a.id === activeId) || null : null),
        getActiveId: vi.fn().mockResolvedValue(activeId),
        add: vi.fn().mockResolvedValue(accounts),
        switch: vi.fn().mockResolvedValue(accounts.find(a => a.id !== activeId) || null),
        remove: vi.fn().mockResolvedValue(accounts.filter(a => a.id !== activeId)),
        validateAll: vi.fn().mockResolvedValue({}),
        onUpdated: vi.fn(),
        onActiveChanged: vi.fn(),
        onValidated: vi.fn(),
        offUpdated: vi.fn(),
        offActiveChanged: vi.fn(),
        offValidated: vi.fn(),
    };
    (window as any).githubAccounts = api;
    return api;
}

function renderWithProvider(ui: React.ReactElement) {
    return render(
        <GithubAccountProvider>{ui}</GithubAccountProvider>
    );
}

// --- AccountCard Tests ---
describe('AccountCard', () => {
    it('renders account info', () => {
        render(
            <AccountCard
                account={mockAccount}
                isActive={false}
                onSwitch={vi.fn()}
                onRemove={vi.fn()}
            />
        );
        expect(screen.getByText('testuser')).toBeDefined();
    });

    it('shows active indicator when isActive is true', () => {
        render(
            <AccountCard
                account={mockAccount}
                isActive={true}
                onSwitch={vi.fn()}
                onRemove={vi.fn()}
            />
        );
        expect(screen.getByText('Active')).toBeDefined();
    });

    it('calls onSwitch when non-active card is clicked', () => {
        const onSwitch = vi.fn();
        render(
            <AccountCard
                account={mockAccount}
                isActive={false}
                onSwitch={onSwitch}
                onRemove={vi.fn()}
            />
        );
        fireEvent.click(screen.getByRole('button'));
        expect(onSwitch).toHaveBeenCalled();
    });

    it('shows warning badge when isInvalid is true', () => {
        render(
            <AccountCard
                account={mockAccount}
                isActive={false}
                isInvalid={true}
                onSwitch={vi.fn()}
                onRemove={vi.fn()}
            />
        );
        expect(screen.getByText(/Token expired/)).toBeDefined();
    });
});

// --- AddAccountButton Tests ---
describe('AddAccountButton', () => {
    it('renders add button text', () => {
        render(<AddAccountButton onClick={vi.fn()} loading={false} />);
        expect(screen.getByText('Add GitHub Account')).toBeDefined();
    });

    it('shows loading text when loading', () => {
        render(<AddAccountButton onClick={vi.fn()} loading={true} />);
        expect(screen.getByText('Opening browser...')).toBeDefined();
    });

    it('is disabled when loading', () => {
        render(<AddAccountButton onClick={vi.fn()} loading={true} />);
        const btn = screen.getByRole('button');
        expect(btn).toHaveProperty('disabled', true);
    });
});

// --- AccountSwitcher Tests ---
describe('AccountSwitcher', () => {
    beforeEach(() => {
        delete (window as any).githubAccounts;
    });

    it('does not render when not in desktop mode', () => {
        const { container } = renderWithProvider(<AccountSwitcher />);
        expect(container.innerHTML).toBe('');
    });

    it('renders trigger button when in desktop mode with accounts', async () => {
        setupMockGithubAccounts([mockAccount], 'acct-1');

        renderWithProvider(<AccountSwitcher />);

        await waitFor(() => {
            expect(screen.getByText('testuser')).toBeDefined();
        });
    });

    it('opens dropdown on trigger click', async () => {
        setupMockGithubAccounts([mockAccount, mockAccount2], 'acct-1');

        renderWithProvider(<AccountSwitcher />);

        await waitFor(() => {
            expect(screen.getByText('testuser')).toBeDefined();
        });

        fireEvent.click(screen.getByLabelText('GitHub account switcher'));

        await waitFor(() => {
            expect(screen.getByText('GitHub Accounts')).toBeDefined();
            expect(screen.getByText('anotheruser')).toBeDefined();
        });
    });

    it('shows empty state when no accounts connected', async () => {
        setupMockGithubAccounts([], null);

        renderWithProvider(<AccountSwitcher />);

        await waitFor(() => {
            expect(screen.getByLabelText('GitHub account switcher')).toBeDefined();
        });

        fireEvent.click(screen.getByLabelText('GitHub account switcher'));

        await waitFor(() => {
            expect(screen.getByText('No GitHub accounts connected')).toBeDefined();
        });
    });
});
