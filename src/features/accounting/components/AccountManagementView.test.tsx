/**
 * @vitest-environment happy-dom
 */
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AccountManagementView } from './AccountManagementView';
import { Entity, Account } from '@/lib/domain/accounting/types';

vi.mock('./BalanceCheckModal', () => ({
    BalanceCheckModal: () => <div data-testid="mock-balance-modal" />
}));

vi.mock('./CategorizationRulesModal', () => ({
    CategorizationRulesModal: ({ isOpen, onClose, accountId, accountName }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="mock-rules-modal">
                <span data-testid="modal-account-id">{accountId}</span>
                <span data-testid="modal-account-name">{accountName}</span>
                <button onClick={onClose} data-testid="modal-close-btn">Close</button>
            </div>
        );
    }
}));

const mockEntities: Entity[] = [
    {
        id: 'ent-1',
        name: 'Household',
        type: 'household',
        currency: 'USD',
        parent_entity_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

type AccountWithBalance = Account & { formatted_balance: string };

const mockAccounts: AccountWithBalance[] = [
    {
        id: 'acc-1',
        entity_id: 'ent-1',
        name: 'Checking Account',
        type: 'asset',
        sub_type: 'checking',
        currency: 'USD',
        is_active: true,
        institution: 'Bank A',
        account_number_mask: '1234',
        opening_date: '2026-01-01',
        opening_balance_cents: 100000,
        tracking_mode: 'transactions',
        balance_revision: 1,
        revision: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        formatted_balance: '$1,000.00'
    },
    {
        id: 'acc-2',
        entity_id: 'ent-1',
        name: 'Credit Card',
        type: 'liability',
        sub_type: 'credit_card',
        currency: 'USD',
        is_active: true,
        institution: 'Bank B',
        account_number_mask: '5678',
        opening_date: '2026-01-01',
        opening_balance_cents: -50000,
        tracking_mode: 'transactions',
        balance_revision: 1,
        revision: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        formatted_balance: '$-500.00'
    }
];

// Mock fetch
const originalFetch = global.fetch;

describe('AccountManagementView', () => {
    let container: HTMLDivElement;
    let root: ReactDOM.Root;

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ accounts: mockAccounts, net_worth: null })
        });

        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        global.fetch = originalFetch;
    });

    it('renders CategorizationRulesModal correctly when rules button is clicked', async () => {
        await act(async () => {
            root.render(
                <AccountManagementView 
                    entities={mockEntities}
                    selectedEntityId="all"
                />
            );
        });

        // 1. Render Accounts with two accounts (Checking and Credit Card)
        expect(container.textContent).toContain('Checking Account');
        expect(container.textContent).toContain('Credit Card');

        // Modal should not be open initially
        expect(container.querySelector('[data-testid="mock-rules-modal"]')).toBeNull();

        // 2. Click the first account's Rules button
        const rulesButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Rules');
        expect(rulesButtons).toHaveLength(2);
        
        act(() => {
            rulesButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 3. Confirm its modal opens and requests that account's rules
        expect(container.querySelector('[data-testid="mock-rules-modal"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="modal-account-id"]')?.textContent).toBe('acc-1');
        expect(container.querySelector('[data-testid="modal-account-name"]')?.textContent).toBe('Checking Account');

        // 4. Close and confirm it resets
        act(() => {
            container.querySelector('[data-testid="modal-close-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        expect(container.querySelector('[data-testid="mock-rules-modal"]')).toBeNull();

        // 5. Open the other account; confirm correct isolation
        act(() => {
            rulesButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        expect(container.querySelector('[data-testid="mock-rules-modal"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="modal-account-id"]')?.textContent).toBe('acc-2');
        expect(container.querySelector('[data-testid="modal-account-name"]')?.textContent).toBe('Credit Card');
    });
});
