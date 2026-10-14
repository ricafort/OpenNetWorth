/**
 * @vitest-environment happy-dom
 */
import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DailyEventsView } from './DailyEventsView';
import { Entity } from '@/lib/domain/accounting/types';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams()
}));

const mockEntities: Entity[] = [
    {
        id: 'ent-household',
        name: 'Household',
        type: 'household',
        currency: 'AUD',
        parent_entity_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'ent-business',
        name: 'My Business',
        type: 'business',
        currency: 'AUD',
        parent_entity_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

const mockAccounts = [
    { id: 'acc-checking-household', name: 'Household Checking', type: 'asset', sub_type: 'checking', currency: 'AUD', entity_id: 'ent-household' },
    { id: 'acc-checking-business', name: 'Business Checking', type: 'asset', sub_type: 'checking', currency: 'AUD', entity_id: 'ent-business' }
];

const mockWorkflows = [
    {
        id: 'wf-123',
        status: 'awaiting_reimbursement',
        personal_entity_id: 'ent-household',
        business_entity_id: 'ent-business',
        amount_cents: 11000,
        currency: 'AUD',
        revision: 1,
        created_at: '2026-09-24T10:00:00Z',
        due_from_account_id: 'acc-rec',
        due_to_account_id: 'acc-pay'
    }
];

const mockTransactions = [
    {
        id: 'tx-456',
        date: '2026-09-24',
        description: 'Test transaction for matching',
        status: 'posted',
        revision: 2,
        postings: [
            { account_id: 'acc-checking-household', amount_cents: 11000, currency: 'AUD' },
            { account_id: 'some-other-acc', amount_cents: -11000, currency: 'AUD' }
        ]
    }
];

const originalFetch = global.fetch;

describe('DailyEventsView Reimbursement Interactions', () => {
    let container: HTMLDivElement;
    let root: ReactDOM.Root;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-01T12:00:00Z'));
        vi.clearAllMocks();
        fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
            if (url.includes('view=reimbursements')) {
                return Promise.resolve({ ok: true, json: async () => ({ workflows: mockWorkflows }) });
            }
            if (url.includes('view=drafts')) {
                return Promise.resolve({ ok: true, json: async () => ({ drafts: [] }) });
            }
            if (url.includes('view=reimbursement_candidates')) {
                const isPersonal = url.includes('leg=personal');
                return Promise.resolve({ ok: true, json: async () => ({ candidates: isPersonal ? [mockTransactions[0]] : [] }) });
            }
            if (url.includes('include_transactions=true')) {
                return Promise.resolve({ ok: true, json: async () => ({ accounts: mockAccounts, transactions: mockTransactions, total_count: 1, net_worth: null }) });
            }
            if (options?.method === 'POST') {
                return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
            }
            return Promise.resolve({ ok: true, json: async () => ({}) });
        });
        global.fetch = fetchMock as unknown as typeof fetch;

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
        vi.useRealTimers();
    });

    it('renders awaiting_reimbursement records and allows matching with the correct payload', async () => {
        await act(async () => {
            root.render(
                <DailyEventsView 
                    entities={mockEntities}
                    selectedEntityId="all"
                />
            );
        });

        // 1. Assert Outstanding Reimbursements are shown correctly
        expect(container.textContent).toContain('Outstanding Reimbursements (1)');
        expect(container.textContent).toContain('$110.00'); // amount_cents = 11000
        expect(container.textContent).toContain('Due from My Business');
        expect(container.textContent).toContain('Personal Payer: Household');

        // 2. Click "Match Payment" button
        const matchButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Match Payment');
        expect(matchButtons.length).toBe(1);

        await act(async () => {
            matchButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 3. Confirm Match Reimbursement modal opens
        expect(container.textContent).toContain('Match Reimbursement');
        expect(container.textContent).toContain('Test transaction for matching'); // from tx-456

        // 4. Select the transaction inside the modal (Personal side)
        const clickableTxDivs = Array.from(container.querySelectorAll('div')).filter(d => 
            d.textContent?.includes('Test transaction for matching') && d.className.includes('p-3 border rounded-lg cursor-pointer')
        );
        expect(clickableTxDivs.length).toBeGreaterThan(0);
        
        await act(async () => {
            clickableTxDivs[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 5. Select "Record missing payment manually" for the Business side
        const missingPaymentDiv = Array.from(container.querySelectorAll('div')).filter(d => 
            d.textContent?.includes('Record missing payment manually') && d.className.includes('p-3 border rounded-lg cursor-pointer')
        );
        expect(missingPaymentDiv.length).toBeGreaterThan(0);

        await act(async () => {
            missingPaymentDiv[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 5b. Explicitly select the missing business payment’s date to ensure determinism
        const dateInputs = Array.from(container.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
        const busDateInput = dateInputs[dateInputs.length - 1]; // The newly revealed missing payment date input
        
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            nativeInputValueSetter?.call(busDateInput, '2026-09-25');
            busDateInput.dispatchEvent(new Event('input', { bubbles: true }));
            busDateInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Verify it was selected (button should be enabled)
        const confirmButtons = Array.from(container.querySelectorAll('button')).filter(b => b.textContent === 'Match Reimbursement');
        expect(confirmButtons.length).toBe(1);
        expect((confirmButtons[0] as HTMLButtonElement).disabled).toBe(false);

        await act(async () => {
            confirmButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // 6. Verify fetch POST payload matches MatchReimbursementInput contract exactly
        const postCall = fetchMock.mock.calls.find(call => call[1]?.method === 'POST');
        expect(postCall).toBeDefined();
        if (!postCall || !postCall[1]?.body) {
            throw new Error('Expected POST call with body');
        }

        const body = JSON.parse(String(postCall[1].body));
        expect(body.action).toBe('match_reimbursement');
        
        const payload = body.payload;
        expect(payload).toBeDefined();
        
        expect(payload.workflowId).toBe('wf-123');
        expect(payload.personalDate).toBe('2026-09-24'); // Preserves the imported receipt’s date
        expect(payload.businessDate).toBe('2026-09-25'); // Preserves the selected manual payment date
        expect(payload.personalReceivingAccountId).toBe('acc-checking-household');
        expect(payload.businessBankAccountId).toBe('acc-checking-business'); // Inferred from entities
        expect(payload.personalReceivingBankTxId).toBe('tx-456');
        expect(payload.businessBankTxId).toBeUndefined();
        expect(payload.expectedPersonalRevision).toBe(2); // tx revision
        expect(payload.createMissingBusinessPayment).toBe(true);
        expect(payload.createMissingPersonalReceipt).toBe(false);
    });

    it('renders empty state when there are no reimbursement workflows', async () => {
        fetchMock.mockImplementation((url: string) => {
            if (url.includes('view=reimbursements')) {
                return Promise.resolve({ ok: true, json: async () => ({ workflows: [] }) }); // empty array
            }
            if (url.includes('view=drafts')) {
                return Promise.resolve({ ok: true, json: async () => ({ drafts: [] }) });
            }
            if (url.includes('include_transactions=true')) {
                return Promise.resolve({ ok: true, json: async () => ({ accounts: mockAccounts, transactions: [], total_count: 0, net_worth: null }) });
            }
            return Promise.resolve({ ok: true, json: async () => ({}) });
        });

        await act(async () => {
            root.render(
                <DailyEventsView 
                    entities={mockEntities}
                    selectedEntityId="all"
                />
            );
        });

        // Should render "successful empty result" message
        expect(container.textContent).toContain('No outstanding reimbursements at this time.');
    });
});
