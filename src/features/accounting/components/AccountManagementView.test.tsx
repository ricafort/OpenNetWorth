/**
 * @vitest-environment happy-dom
 * 
 * Why this test exists:
 * Verifies AccountManagementView UI integration for:
 * - Opening categorization rules modal per account.
 * - Closing Batch Item 3 (Functional Record Balance recovery): opens manual observation flow
 *   preserving the target account (even for accounts with an existing opening balance),
 *   and reopens the balance check modal after save to verify the updated balance.
 * - Liability debt terms (interest rate / minimum payment): card display, edit pre-population,
 *   create/update payloads, and blank-clears-terms semantics (null = clear the column).
 * 
 * Tricky logic:
 * Simulates the modal handoff sequence: click "Check balance" -> click "Record Balance" ->
 * enter balance in UpdateBalancesModal -> on save, recheck target account in BalanceCheckModal.
 * 
 * TODO: Add e2e test covering CSV statement upload inside the check balance modal.
 */
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AccountManagementView } from './AccountManagementView';
import { Entity, Account } from '@/lib/domain/accounting/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./BalanceCheckModal', () => ({
    BalanceCheckModal: ({ isOpen, onClose, accountId, onActionSetup, onActionRecordBalance }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="mock-balance-modal">
                <span data-testid="check-account-id">{accountId}</span>
                <button onClick={onActionRecordBalance} data-testid="record-balance-btn">Record current balance</button>
                <button onClick={onActionSetup} data-testid="set-starting-balance-btn">Set starting balance</button>
                <button onClick={onClose} data-testid="check-close-btn">Close</button>
            </div>
        );
    }
}));

vi.mock('@/features/sync/components/UpdateBalancesModal', () => ({
    default: ({ isOpen, onClose, initialMode, initialAccountId }: any) => {
        if (!isOpen) return null;
        return (
            <div data-testid="mock-update-balances-modal">
                <span data-testid="update-mode">{initialMode}</span>
                <span data-testid="update-account-id">{initialAccountId}</span>
                <button
                    onClick={() => onClose({ balancesUpdated: 1, accountId: initialAccountId })}
                    data-testid="update-save-btn"
                >
                    Save
                </button>
                <button onClick={() => onClose()} data-testid="update-close-btn">Cancel</button>
            </div>
        );
    }
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
        interest_rate: 18.99,
        minimum_payment_cents: 3500,
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

    it('implements Functional Record Balance recovery: opens manual entry with preserved account and rechecks on save', async () => {
        await act(async () => {
            root.render(
                <AccountManagementView 
                    entities={mockEntities}
                    selectedEntityId="all"
                />
            );
        });

        // 1. Initial render: no modals open
        expect(container.querySelector('[data-testid="mock-balance-modal"]')).toBeNull();
        expect(container.querySelector('[data-testid="mock-update-balances-modal"]')).toBeNull();

        // 2. Click "Check balance" on acc-1 (Checking Account)
        const checkButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Check balance');
        expect(checkButtons.length).toBeGreaterThan(0);

        act(() => {
            checkButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 3. BalanceCheckModal is open with preserved accountId = acc-1
        expect(container.querySelector('[data-testid="mock-balance-modal"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="check-account-id"]')?.textContent).toBe('acc-1');

        // 4. Click "Record current balance" action within BalanceCheckModal
        act(() => {
            container.querySelector('[data-testid="record-balance-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 5. BalanceCheckModal closes and UpdateBalancesModal opens in manual mode preserving acc-1
        expect(container.querySelector('[data-testid="mock-balance-modal"]')).toBeNull();
        expect(container.querySelector('[data-testid="mock-update-balances-modal"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="update-mode"]')?.textContent).toBe('manual');
        expect(container.querySelector('[data-testid="update-account-id"]')?.textContent).toBe('acc-1');

        // 6. Enter amount/date and click save
        await act(async () => {
            container.querySelector('[data-testid="update-save-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 7. BalanceCheckModal automatically reopens with acc-1 to display the rechecked balance!
        expect(container.querySelector('[data-testid="mock-update-balances-modal"]')).toBeNull();
        expect(container.querySelector('[data-testid="mock-balance-modal"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="check-account-id"]')?.textContent).toBe('acc-1');
    });

    it('implements Set starting balance recovery: opens edit account modal with preserved account context to establish opening balance', async () => {
        await act(async () => {
            root.render(
                <AccountManagementView 
                    entities={mockEntities}
                    selectedEntityId="all"
                />
            );
        });

        // 1. Click "Check balance" on acc-2 (Credit Card)
        const checkButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Check balance');
        act(() => {
            checkButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 2. BalanceCheckModal is open for acc-2
        expect(container.querySelector('[data-testid="mock-balance-modal"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="check-account-id"]')?.textContent).toBe('acc-2');

        // 3. Click "Set starting balance"
        act(() => {
            container.querySelector('[data-testid="set-starting-balance-btn"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 4. BalanceCheckModal closes and Edit Account modal opens preserving account details
        expect(container.querySelector('[data-testid="mock-balance-modal"]')).toBeNull();
        expect(container.textContent).toContain('Edit account');
        const nameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
        expect(nameInput?.value).toBe('Credit Card');
    });

    // --- Liability debt terms (interest_rate / minimum_payment_cents) ---

    const setInputValue = (el: Element | null, value: string) => {
        act(() => {
            // Native setter bypasses React's value tracker so the synthetic onChange fires
            // (same approach as DailyEventsView.test.tsx).
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            nativeInputValueSetter?.call(el, value);
            (el as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }));
        });
    };

    const postedPayloads = () =>
        (global.fetch as any).mock.calls
            .filter((c: any[]) => typeof c[1]?.body === 'string')
            .map((c: any[]) => JSON.parse(c[1].body));

    it('shows stored debt terms on liability cards only', async () => {
        await act(async () => {
            root.render(<AccountManagementView entities={mockEntities} selectedEntityId="all" />);
        });

        const terms = container.querySelector('[data-testid="terms-acc-2"]');
        expect(terms?.textContent).toContain('18.99% p.a.');
        expect(terms?.textContent).toContain('min payment $35.00');
        // Asset cards never show a terms row.
        expect(container.querySelector('[data-testid="terms-acc-1"]')).toBeNull();
    });

    it('pre-populates debt terms when editing a liability and sends them in update_account', async () => {
        await act(async () => {
            root.render(<AccountManagementView entities={mockEntities} selectedEntityId="all" />);
        });

        const editButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Edit');
        act(() => {
            editButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const rateInput = container.querySelector('input[placeholder="e.g. 18.99"]');
        const minInput = container.querySelector('input[placeholder="e.g. 35.00"]');
        expect((rateInput as HTMLInputElement)?.value).toBe('18.99');
        expect((minInput as HTMLInputElement)?.value).toBe('35.00');

        setInputValue(minInput, '50.00');

        const submit = Array.from(container.querySelectorAll('button[type="submit"]'))
            .find(b => b.textContent?.includes('Save changes'));
        await act(async () => {
            submit?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const updateCall = postedPayloads().find((p: any) => p.action === 'update_account');
        expect(updateCall).toBeTruthy();
        expect(updateCall.account_id).toBe('acc-2');
        expect(updateCall.updates.interest_rate).toBe(18.99);
        expect(updateCall.updates.minimum_payment_cents).toBe(5000);
    });

    it('clearing the minimum payment input sends null to clear the stored terms', async () => {
        await act(async () => {
            root.render(<AccountManagementView entities={mockEntities} selectedEntityId="all" />);
        });

        const editButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Edit');
        act(() => {
            editButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        setInputValue(container.querySelector('input[placeholder="e.g. 35.00"]'), '');

        const submit = Array.from(container.querySelectorAll('button[type="submit"]'))
            .find(b => b.textContent?.includes('Save changes'));
        await act(async () => {
            submit?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const updateCall = postedPayloads().find((p: any) => p.action === 'update_account');
        expect(updateCall).toBeTruthy();
        // null = clear the column (updateAccount semantics); untouched rate is resent as-is.
        expect(updateCall.updates.minimum_payment_cents).toBeNull();
        expect(updateCall.updates.interest_rate).toBe(18.99);
    });

    it('includes debt terms in the create_account payload for new liabilities', async () => {
        await act(async () => {
            root.render(<AccountManagementView entities={mockEntities} selectedEntityId="all" />);
        });

        const addBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Add account'));
        act(() => {
            addBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Switch the type selector to Liability (terms inputs only render for liabilities).
        const liabilityBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('What you owe'));
        act(() => {
            liabilityBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        setInputValue(container.querySelector('input[placeholder="e.g. Chase Total Checking"]'), 'Store Card');
        setInputValue(container.querySelector('input[placeholder="e.g. 18.99"]'), '22.5');
        setInputValue(container.querySelector('input[placeholder="e.g. 35.00"]'), '40.50');

        const submit = Array.from(container.querySelectorAll('button[type="submit"]'))
            .find(b => b.textContent?.includes('Save account'));
        await act(async () => {
            submit?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        const createCall = postedPayloads().find((p: any) => p.action === 'create_account');
        expect(createCall).toBeTruthy();
        expect(createCall.account.name).toBe('Store Card');
        expect(createCall.account.type).toBe('liability');
        expect(createCall.account.interest_rate).toBe(22.5);
        expect(createCall.account.minimum_payment_cents).toBe(4050);
    });
});
