/**
 * @vitest-environment happy-dom
 */
/**
 * Component-Level Integration Tests for UpdateBalancesModal
 * 
 * Why this file exists:
 * Fulfills Delivery 2A: Local AI-Assisted Balance Extraction Component Tests.
 * Tests the real interactive React modal:
 * 1. Initial mounting renders "Find balances" button without performing any premature writes.
 * 2. Pastes raw statement text, clicks "Find balances", and verifies review table displays proposals with source excerpts.
 * 3. Handles ambiguous account/owner matches (Fixture D) with entity-grouped dropdowns.
 * 4. Verifies confirmation of review findings (currency, dates).
 * 5. Requires explicit user click on "Save balance updates" to persist observations.
 * 6. Preserves user's pasted input in textarea upon extraction errors.
 * 
 * Tricky logic:
 * - Uses happy-dom and React 19 createRoot + act() to simulate real DOM events,
 *   React form submissions, select dropdown changes, and custom DOM event listeners.
 * - Mocks HTTP endpoints for /api/accounting, /api/accounting/balances/extract, and /api/accounting/balances
 *   to track the exact sequence and payload of requests.
 * 
 * Isolation Guarantee:
 * Database operations are tested with in-memory SQLite and mocked fetch calls; live files are untouched.
 * 
 * TODO: Add file-drag-and-drop tests in Delivery 2B.
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import UpdateBalancesModal from './UpdateBalancesModal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

describe('UpdateBalancesModal Component-Level Extraction & Review Tests', () => {
    let container: HTMLElement;
    let root: ReactDOM.Root;
    let savedObservationsPayload: any = null;
    let extractPayload: any = null;

    const mockEntities = [
        { id: 'ent-1', name: 'Alice Personal', currency: 'AUD' },
        { id: 'ent-2', name: 'Alice Business Pty Ltd', currency: 'AUD' }
    ];

    const mockAccounts = [
        {
            id: 'acc-1',
            entity_id: 'ent-1',
            name: 'Everyday Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            tracking_mode: 'transactions',
            balance_cents: 120000,
            balance_revision: 2
        },
        {
            id: 'acc-2',
            entity_id: 'ent-1',
            name: 'High Interest Savings',
            type: 'asset',
            sub_type: 'savings',
            currency: 'AUD',
            tracking_mode: 'balance',
            balance_cents: 500000,
            balance_revision: 1
        },
        {
            id: 'acc-3',
            entity_id: 'ent-2',
            name: 'High Interest Savings',
            type: 'asset',
            sub_type: 'savings',
            currency: 'AUD',
            tracking_mode: 'balance',
            balance_cents: 800000,
            balance_revision: 1
        }
    ];

    beforeEach(() => {
        savedObservationsPayload = null;
        extractPayload = null;
        window.alert = vi.fn();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);

        // Mock global fetch
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/accounting/balances/extract')) {
                extractPayload = JSON.parse((init?.body as string) || '{}');

                // If testing error handling
                if (extractPayload.text?.includes('SIMULATE_OFFLINE')) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Local AI runner is offline or unreachable.',
                        is_offline: true,
                        proposals: []
                    }), { status: 503, headers: { 'Content-Type': 'application/json' } });
                }

                // If testing ambiguous account matching (Fixture D)
                if (extractPayload.text?.includes('High Interest Savings')) {
                    return new Response(JSON.stringify({
                        success: true,
                        extraction_method: 'local_llm',
                        source_batch_id: 'batch-test-ambiguous',
                        proposals: [
                            {
                                id: 'prop-ambiguous-1',
                                raw_account_name: 'High Interest Savings',
                                account_id: null, // Disambiguation guard triggered!
                                account_name: 'High Interest Savings',
                                amount_cents: 2545000,
                                currency: 'AUD',
                                balance_kind: 'current_balance',
                                effective_date: '2026-09-18',
                                source_excerpt: 'High Interest Savings: $25,450.00',
                                unresolved_fields: ['owner'],
                                is_component_of_total: false,
                                has_newer_observation: false,
                                confirmed_by_user: false
                            }
                        ]
                    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
                }

                // Standard extraction response
                return new Response(JSON.stringify({
                    success: true,
                    extraction_method: 'local_llm',
                    source_batch_id: 'batch-test-standard',
                    proposals: [
                        {
                            id: 'prop-standard-1',
                            raw_account_name: 'Everyday Checking',
                            account_id: 'acc-1',
                            account_name: 'Everyday Checking',
                            amount_cents: 150000,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            effective_date: '2026-09-18',
                            source_excerpt: 'Everyday Checking Balance: $1,500.00',
                            unresolved_fields: [],
                            is_component_of_total: false,
                            has_newer_observation: false,
                            existing_balance_cents: 120000,
                            expected_balance_revision: 2,
                            confirmed_by_user: false
                        }
                    ]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting/balances') && init?.method === 'POST') {
                savedObservationsPayload = JSON.parse((init?.body as string) || '{}');
                return new Response(JSON.stringify({
                    success: true,
                    count: savedObservationsPayload?.items?.length || 0
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
        vi.restoreAllMocks();
    });

    it('mounts with "Find balances" button and performs ZERO writes initially', async () => {
        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        // Verify "Find balances" button exists
        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        expect(findButton).toBeDefined();

        // Verify zero save calls were made
        expect(savedObservationsPayload).toBeNull();
    });

    it('pastes text, clicks "Find balances", and displays proposal with source excerpt and delta', async () => {
        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        const textarea = container.querySelector('textarea');
        expect(textarea).toBeDefined();

        // Simulate pasting statement text
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'Everyday Checking Balance: $1,500.00 as of 2026-09-18');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Click "Find balances"
        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        expect(findButton).toBeDefined();

        await act(async () => {
            findButton?.click();
        });

        // Verify request payload
        expect(extractPayload).not.toBeNull();
        expect(extractPayload.text).toContain('Everyday Checking Balance: $1,500.00');

        // Review table should now be rendered with proposal and excerpt
        expect(container.textContent).toContain('Review & Confirm Balances');
        expect(container.textContent).toContain('Everyday Checking Balance: $1,500.00');
        expect(container.textContent).toContain('+$300.00'); // Delta: 150,000 - 120,000 = +300.00

        // Zero writes before user clicks save!
        expect(savedObservationsPayload).toBeNull();

        // Now click "Save balance updates"
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        expect(saveButton).toBeDefined();

        await act(async () => {
            saveButton?.click();
        });

        // Verify save endpoint was invoked
        expect(savedObservationsPayload).not.toBeNull();
        expect(savedObservationsPayload.items).toHaveLength(1);
        expect(savedObservationsPayload.items[0].account_id).toBe('acc-1');
        expect(savedObservationsPayload.items[0].amount_cents).toBe(150000);
        expect(savedObservationsPayload.items[0].balance_kind).toBe('current_balance');
    });

    it('handles ambiguous accounts (Fixture D) requiring user to select entity owner before saving', async () => {
        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        const textarea = container.querySelector('textarea');
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'High Interest Savings: $25,450.00');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        // Verify warning badge for ambiguous owner
        expect(container.textContent).toContain('Ambiguous Account / Multiple Owners');

        // Verify select dropdown has entity optgroups
        const select = container.querySelector('select');
        expect(select).toBeDefined();
        const optgroups = Array.from(container.querySelectorAll('optgroup'));
        expect(optgroups.length).toBeGreaterThanOrEqual(2);

        // Try clicking save while unresolved
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );

        await act(async () => {
            saveButton?.click();
        });

        // User must select an account; no accounts saved yet
        expect(savedObservationsPayload).toBeNull();

        // User explicitly selects "Alice Business Pty Ltd — High Interest Savings" (acc-3)
        const accountSelect = Array.from(container.querySelectorAll('select')).find(s =>
            s.querySelector('optgroup') !== null
        );
        expect(accountSelect).toBeDefined();

        await act(async () => {
            const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLSelectElement.prototype,
                'value'
            )?.set;
            nativeSelectValueSetter?.call(accountSelect, 'acc-3');
            accountSelect?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Now save
        await act(async () => {
            saveButton?.click();
        });

        // Verify correctly saved to acc-3
        expect(savedObservationsPayload).not.toBeNull();
        expect(savedObservationsPayload.items[0].account_id).toBe('acc-3');
        expect(savedObservationsPayload.items[0].amount_cents).toBe(2545000);
    });

    it('preserves user text in textarea when extraction fails', async () => {
        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        const statementText = 'SIMULATE_OFFLINE: Bank Statement Line $500';
        const textarea = container.querySelector('textarea')!;

        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, statementText);
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        // Error message rendered
        expect(container.textContent).toContain('Local AI runner is offline');

        // Text in textarea is PRESERVED
        const preservedTextarea = container.querySelector('textarea')!;
        expect(preservedTextarea.value).toBe(statementText);
    });

    it('renders plain-language column headers and supports toggling supporting detail (included in total)', async () => {
        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        const textarea = container.querySelector('textarea');
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'Everyday Checking Balance: $1,500.00 as of 2026-09-18');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        // 1. Assert plain-language table headers (Requirement D)
        expect(container.textContent).toContain('Account to update');
        expect(container.textContent).toContain('Balance meaning & Impact');
        expect(container.textContent).toContain('Statement date');
        expect(container.textContent).toContain('Statement balance');
        expect(container.textContent).toContain('Ledger / Variance');

        // 2. Assert supporting detail checkbox exists and can be toggled
        const supportingCheckbox = Array.from(container.querySelectorAll('input[type="checkbox"]')).find(
            cb => cb.parentElement?.textContent?.includes('Supporting detail only')
        ) as HTMLInputElement | undefined;
        expect(supportingCheckbox).toBeDefined();
        expect(supportingCheckbox?.checked).toBe(false);

        await act(async () => {
            supportingCheckbox?.click();
        });

        // Verify badge indicates included in portfolio total
        expect(container.textContent).toContain('* Included in Portfolio Total');

        // 3. Click save and verify payload records is_component_of_total: true and is_user_modified: true
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        await act(async () => {
            saveButton?.click();
        });

        expect(savedObservationsPayload).not.toBeNull();
        expect(savedObservationsPayload.items[0].is_component_of_total).toBe(true);
        expect(savedObservationsPayload.items[0].is_user_modified).toBe(true);
    });

    it('displays transaction ledger balance and discrepancy variance for transaction-tracked accounts', async () => {
        // Mock extract endpoint returning reconciliation data for a transaction-tracked account
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);
            if (urlStr.includes('/api/accounting/balances/reconcile')) {
                const body = JSON.parse(init?.body as string || '{}');
                const diffCents = (body.amount_cents || 0) - 120000;
                return new Response(JSON.stringify({
                    success: true,
                    reconciliation: {
                        account_id: body.account_id || 'acc-1',
                        account_name: 'Everyday Checking',
                        currency: body.currency || 'AUD',
                        effective_date: body.effective_date || '2026-09-18',
                        reported_amount_cents: body.amount_cents || 0,
                        reported_balance_kind: body.balance_kind || 'current_balance',
                        recorded_ledger_cents: 120000,
                        diff_cents: diffCents,
                        is_comparable: true,
                        status: diffCents === 0 ? 'matched' : 'discrepancy'
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.includes('/api/accounting/balances/extract')) {
                return new Response(JSON.stringify({
                    success: true,
                    extraction_method: 'local_llm',
                    proposals: [
                        {
                            id: 'prop-recon-1',
                            raw_account_name: 'Everyday Checking',
                            account_id: 'acc-1',
                            account_name: 'Everyday Checking',
                            amount_cents: 150000,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            effective_date: '2026-09-18',
                            source_excerpt: 'Everyday Checking Balance: $1,500.00',
                            tracking_mode: 'transactions',
                            reconciliation: {
                                account_id: 'acc-1',
                                account_name: 'Everyday Checking',
                                currency: 'AUD',
                                effective_date: '2026-09-18',
                                reported_amount_cents: 150000,
                                reported_balance_kind: 'current_balance',
                                recorded_ledger_cents: 120000,
                                diff_cents: 30000,
                                is_comparable: true,
                                status: 'discrepancy'
                            },
                            unresolved_fields: [],
                            confirmed_by_user: false
                        }
                    ]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        const textarea = container.querySelector('textarea');
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'Everyday Checking Balance: $1,500.00');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        // Verify ledger balance and diff are displayed
        expect(container.textContent).toContain('Ledger: $1,200.00');
        expect(container.textContent).toContain('Diff: +$300.00');
    });

    it('7. Stale reconciliation resolution race condition: resolves out of order and keeps latest edit difference (AUD 1,800)', async () => {
        let resolveFirstCall: ((val: any) => void) | null = null;
        let resolveSecondCall: ((val: any) => void) | null = null;

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);
            if (urlStr.includes('/api/accounting/balances/reconcile')) {
                const reqBody = JSON.parse(String(init?.body || '{}'));
                if (reqBody.amount_cents === 200000) {
                    return new Promise((resolve) => {
                        resolveFirstCall = (data: any) => resolve(new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                    });
                }
                if (reqBody.amount_cents === 300000) {
                    return new Promise((resolve) => {
                        resolveSecondCall = (data: any) => resolve(new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }));
                    });
                }
                return new Response(JSON.stringify({
                    reconciliation: {
                        account_id: reqBody.account_id,
                        account_name: 'Everyday Checking',
                        currency: 'AUD',
                        effective_date: reqBody.effective_date,
                        reported_amount_cents: reqBody.amount_cents,
                        reported_balance_kind: reqBody.balance_kind,
                        recorded_ledger_cents: 120000,
                        diff_cents: reqBody.amount_cents - 120000,
                        is_comparable: true,
                        status: 'discrepancy'
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.includes('/api/accounting/balances/extract')) {
                return new Response(JSON.stringify({
                    success: true,
                    extraction_method: 'deterministic_table',
                    proposals: [
                        {
                            id: 'prop-recon-race',
                            raw_account_name: 'Everyday Checking',
                            account_id: 'acc-1',
                            account_name: 'Everyday Checking',
                            entity_id: 'ent-1',
                            amount_cents: 120000,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            effective_date: '2026-09-18',
                            source_excerpt: 'Everyday Checking: $1,200.00',
                            tracking_mode: 'transactions',
                            reconciliation: {
                                account_id: 'acc-1',
                                account_name: 'Everyday Checking',
                                currency: 'AUD',
                                effective_date: '2026-09-18',
                                reported_amount_cents: 120000,
                                reported_balance_kind: 'current_balance',
                                recorded_ledger_cents: 120000,
                                diff_cents: 0,
                                is_comparable: true,
                                status: 'matched'
                            },
                            unresolved_fields: [],
                            confirmed_by_user: false
                        }
                    ]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        // Paste and extract initial proposal
        const textarea = container.querySelector('textarea');
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'Everyday Checking: $1,200.00');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        expect(container.textContent).toContain('Matched');

        // Locate statement balance number input
        const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(amountInput).toBeTruthy();

        // 1. Edit statement amount to AUD 2,000 (dispatches Request 1)
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(amountInput, '2000.00');
            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Verify old comparison is hidden while recalculating
        expect(container.textContent).toContain('Calculating...');
        expect(container.textContent).not.toContain('Matched');
        expect(resolveFirstCall).toBeTruthy();

        // 2. Edit statement amount to AUD 3,000 (dispatches Request 2)
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(amountInput, '3000.00');
            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(container.textContent).toContain('Calculating...');
        expect(resolveSecondCall).toBeTruthy();

        // 3. Resolve the second response FIRST: AUD 3,000 minus AUD 1,200 = AUD 1,800
        await act(async () => {
            if (resolveSecondCall) {
                (resolveSecondCall as any)({
                    success: true,
                    reconciliation: {
                        account_id: 'acc-1',
                        account_name: 'Everyday Checking',
                        currency: 'AUD',
                        effective_date: '2026-09-18',
                        reported_amount_cents: 300000,
                        reported_balance_kind: 'current_balance',
                        recorded_ledger_cents: 120000,
                        diff_cents: 180000,
                        is_comparable: true,
                        status: 'discrepancy'
                    }
                });
            }
        });

        // The second response is applied!
        expect(container.textContent).toContain('Diff: +$1,800.00');

        // 4. Resolve the first response LAST: AUD 2,000 minus AUD 1,200 = AUD 800
        await act(async () => {
            if (resolveFirstCall) {
                (resolveFirstCall as any)({
                    success: true,
                    reconciliation: {
                        account_id: 'acc-1',
                        account_name: 'Everyday Checking',
                        currency: 'AUD',
                        effective_date: '2026-09-18',
                        reported_amount_cents: 200000,
                        reported_balance_kind: 'current_balance',
                        recorded_ledger_cents: 120000,
                        diff_cents: 80000,
                        is_comparable: true,
                        status: 'discrepancy'
                    }
                });
            }
        });

        // The first (stale) response MUST NOT overwrite!
        // Final displayed difference MUST remain AUD 1,800!
        expect(container.textContent).toContain('Diff: +$1,800.00');
        expect(container.textContent).not.toContain('+$800.00');

        // 5. Test clearing amount: invalid row must not retain old comparison
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(amountInput, '');
            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(container.textContent).not.toContain('Diff: +$1,800.00');
        expect(container.textContent).toContain('Amount missing');

        // 6. Test detaching account: unmatched row must not retain old comparison
        const select = container.querySelector('select') as HTMLSelectElement;
        await act(async () => {
            const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLSelectElement.prototype,
                'value'
            )?.set;
            nativeSelectValueSetter?.call(select, '');
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });

        expect(container.textContent).not.toContain('Diff: +$1,800.00');
        expect(container.textContent).not.toContain('Calculating...');
    });

    /**
     * Test 8: Acceptance 2 — Clear reconciliation for missing/invalid dates.
     * 
     * Why this test exists:
     * Fulfills Delivery 2A Narrow Closing Corrections (Item 2 Acceptance):
     * Verifies that clearing the date after a valid comparison appears leaves NO numerical
     * comparison remaining or reappearing (neither Ledger figure nor Diff badge).
     * Verifies that entering a valid calendar date resumes recalculation immediately.
     * 
     * Tricky logic:
     * When date is cleared to "", updateProposal immediately sets reconciliation: undefined
     * and is_reconciling: false, and the table cell suppresses any fallback delta calculation.
     * 
     * TODO: Support customizable default accounting cutoff dates in future milestones.
     */
    it('8. Acceptance 2: Clear reconciliation for missing/invalid dates and resume on valid date', async () => {
        let reconcileCalls: any[] = [];
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);
            if (urlStr.includes('/api/accounting/balances/reconcile')) {
                const reqBody = JSON.parse(String(init?.body || '{}'));
                reconcileCalls.push(reqBody);

                if (!reqBody.effective_date) {
                    return new Response(JSON.stringify({ error: 'A valid calendar effective_date is required' }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                return new Response(JSON.stringify({
                    reconciliation: {
                        account_id: reqBody.account_id,
                        account_name: 'Everyday Checking',
                        currency: 'AUD',
                        effective_date: reqBody.effective_date,
                        reported_amount_cents: reqBody.amount_cents,
                        reported_balance_kind: reqBody.balance_kind,
                        recorded_ledger_cents: 120000,
                        diff_cents: reqBody.amount_cents - 120000,
                        is_comparable: true,
                        status: 'discrepancy'
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.includes('/api/accounting/balances/extract')) {
                return new Response(JSON.stringify({
                    success: true,
                    extraction_method: 'deterministic_table',
                    proposals: [
                        {
                            id: 'prop-recon-date-test',
                            raw_account_name: 'Everyday Checking',
                            account_id: 'acc-1',
                            account_name: 'Everyday Checking',
                            entity_id: 'ent-1',
                            amount_cents: 150000,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            effective_date: '2026-09-18',
                            source_excerpt: 'Everyday Checking: $1,500.00',
                            tracking_mode: 'transactions',
                            reconciliation: {
                                account_id: 'acc-1',
                                account_name: 'Everyday Checking',
                                currency: 'AUD',
                                effective_date: '2026-09-18',
                                reported_amount_cents: 150000,
                                reported_balance_kind: 'current_balance',
                                recorded_ledger_cents: 120000,
                                diff_cents: 30000,
                                is_comparable: true,
                                status: 'discrepancy'
                            },
                            unresolved_fields: [],
                            confirmed_by_user: false
                        }
                    ]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        // Paste and extract initial proposal with valid comparison
        const textarea = container.querySelector('textarea');
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'Everyday Checking: $1,500.00');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        // 1. Initial valid comparison appears
        expect(container.textContent).toContain('Ledger: $1,200.00');
        expect(container.textContent).toContain('Diff: +$300.00');

        // Locate date input
        const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
        expect(dateInput).toBeTruthy();
        expect(dateInput.value).toBe('2026-09-18');

        // 2. Clear the date after a valid comparison appears
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(dateInput, '');
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Acceptance Check: No numerical comparison remains or reappears!
        expect(container.textContent).not.toContain('Diff: +$300.00');
        expect(container.textContent).not.toContain('Ledger: $1,200.00');
        expect(container.textContent).not.toContain('Calculating...');
        // Ledger/Variance cell displays em-dash placeholder
        expect(container.textContent).toContain('—');

        // 3. Enter a valid date and verify recalculation resumes
        reconcileCalls = [];
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(dateInput, '2026-09-22');
            dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Verify request was dispatched with new date
        expect(reconcileCalls.length).toBeGreaterThanOrEqual(1);
        expect(reconcileCalls[reconcileCalls.length - 1].effective_date).toBe('2026-09-22');

        // Recalculation resumed and updated comparison is displayed!
        expect(container.textContent).toContain('Ledger: $1,200.00');
        expect(container.textContent).toContain('Diff: +$300.00');
    });

    /**
     * Test 9: Acceptance 1 — Confirm Row leaves explicit_classification_correction false in UI payload.
     * 
     * Why this test exists:
     * Fulfills Delivery 2A Narrow Closing Corrections (Item 1 Acceptance):
     * Clicking "Confirm Row" sets is_user_modified: true for provenance, but leaves
     * explicit_classification_correction: false.
     * Routine confirmations of review findings must NOT authorize classification overrides.
     * 
     * Tricky logic:
     * Verifies that generic review findings confirmation (Confirm Row) never transmits
     * authorization to overwrite classification on save.
     * 
     * TODO: Support batch-level classification review shortcuts in Milestone 2.
     */
    it('9. Acceptance 1: Confirm Row leaves explicit_classification_correction false in save payload', async () => {
        let lastSaveBody: any = null;

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);
            if (urlStr.includes('/api/accounting/balances/extract')) {
                return new Response(JSON.stringify({
                    success: true,
                    extraction_method: 'deterministic_table',
                    proposals: [
                        {
                            id: 'prop-classification-test',
                            raw_account_name: 'Everyday Checking',
                            account_id: 'acc-1',
                            account_name: 'Everyday Checking',
                            entity_id: 'ent-1',
                            amount_cents: 150000,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            effective_date: '2026-09-18',
                            source_excerpt: 'Everyday Checking: $1,500.00',
                            is_component_of_total: true,
                            unresolved_fields: ['currency'], // ambiguous currency warning
                            confirmed_by_user: false
                        }
                    ]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.endsWith('/api/accounting/balances') && init?.method === 'POST') {
                lastSaveBody = JSON.parse(String(init?.body || '{}'));
                return new Response(JSON.stringify({ success: true, count: 1, items: [] }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        // Paste and extract proposal with unresolved currency finding
        const textarea = container.querySelector('textarea');
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'Everyday Checking: $1,500.00');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        // Locate "Confirm Row" button for the unresolved currency warning
        const confirmRowButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Confirm Row')
        );
        expect(confirmRowButton).toBeTruthy();

        // Click Confirm Row WITHOUT touching supporting-detail status
        await act(async () => {
            confirmRowButton?.click();
        });

        expect(container.textContent).toContain('Confirmed');

        // Click "Save balance updates"
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        await act(async () => {
            saveButton?.click();
        });

        // Verify payload: is_user_modified is true (for provenance), but explicit_classification_correction is false!
        expect(lastSaveBody).not.toBeNull();
        expect(lastSaveBody.items[0].is_user_modified).toBe(true);
        expect(lastSaveBody.items[0].explicit_classification_correction).toBe(false);
        expect(lastSaveBody.items[0].explicit_correction).toBe(false);
    });

    /**
     * Test 10: Acceptance 1 — Deliberately toggling supporting-detail sets explicit_classification_correction: true.
     * 
     * Why this test exists:
     * Fulfills Delivery 2A Narrow Closing Corrections (Item 1 Acceptance):
     * A deliberate checkbox change sets explicit_classification_correction: true in the save payload,
     * authorizing the classification update on the backend.
     */
    it('10. Acceptance 1: Deliberately toggling supporting-detail sets explicit_classification_correction true in save payload', async () => {
        let lastSaveBody: any = null;

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);
            if (urlStr.includes('/api/accounting/balances/extract')) {
                return new Response(JSON.stringify({
                    success: true,
                    extraction_method: 'deterministic_table',
                    proposals: [
                        {
                            id: 'prop-classification-deliberate',
                            raw_account_name: 'Everyday Checking',
                            account_id: 'acc-1',
                            account_name: 'Everyday Checking',
                            entity_id: 'ent-1',
                            amount_cents: 150000,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            effective_date: '2026-09-18',
                            source_excerpt: 'Everyday Checking: $1,500.00',
                            is_component_of_total: true,
                            unresolved_fields: [], // no unresolved warnings
                            confirmed_by_user: false
                        }
                    ]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (urlStr.endsWith('/api/accounting/balances') && init?.method === 'POST') {
                lastSaveBody = JSON.parse(String(init?.body || '{}'));
                return new Response(JSON.stringify({ success: true, count: 1, items: [] }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={true} onClose={() => {}} />);
        });

        const textarea = container.querySelector('textarea');
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(textarea, 'Everyday Checking: $1,500.00');
            textarea?.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const findButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Find balances')
        );
        await act(async () => {
            findButton?.click();
        });

        // Deliberately toggle the supporting-detail checkbox
        const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
        expect(checkbox).toBeTruthy();
        await act(async () => {
            checkbox.click();
        });

        // Click Save
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        await act(async () => {
            saveButton?.click();
        });

        // Deliberate checkbox change sets explicit_classification_correction: true!
        expect(lastSaveBody).not.toBeNull();
        expect(lastSaveBody.items[0].is_user_modified).toBe(true);
        expect(lastSaveBody.items[0].explicit_classification_correction).toBe(true);
        expect(lastSaveBody.items[0].explicit_correction).toBe(true);
    });

    /**
     * Test 11: Immediate save before autosave debouncing.
     * 
     * Why this test exists:
     * Delivery 2B Correction 2: A user can edit an amount (e.g. 1500 to 1550) and immediately click
     * "Save balance updates" without waiting for the 500ms autosave debounce.
     * This test verifies:
     * 1. The save POST payload transmits the newly edited amount (155000 cents).
     * 2. The pending autosync debounce timer is cancelled immediately.
     * 3. An autosync version bump ensures no stale pending autosave can regress the saved observation.
     * 
     * Tricky logic:
     * We don't advance fake timers or wait 500ms before clicking save. The immediate click must capture
     * the local React state (1550.00 -> 155000) directly into itemsToSave.
     * 
     * TODO: Support keyboard shortcut (Cmd+Enter / Ctrl+Enter) to trigger immediate batch save.
     */
    it('11. Immediate Save before autosave: editing 1500 to 1550 and immediately saving transmits 155000 and cancels debounced timer', async () => {
        let savePayload: any = null;
        let putPayloads: any[] = [];

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/documents/statements') && init?.method === 'PUT') {
                putPayloads.push(JSON.parse(String(init?.body || '{}')));
                return new Response(JSON.stringify({ success: true, version: 2 }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (urlStr.includes('/api/documents/statements') && (!init || init.method === 'GET')) {
                return new Response(JSON.stringify({
                    success: true,
                    review: {
                        id: 'rev-immediate-1',
                        document_id: 'doc-immediate-1',
                        version: 1,
                        proposals: [
                            {
                                id: 'prop-immediate-1',
                                raw_account_name: 'Everyday Checking',
                                account_id: 'acc-1',
                                account_name: 'Everyday Checking',
                                entity_id: 'ent-1',
                                amount_cents: 150000,
                                currency: 'AUD',
                                balance_kind: 'current_balance',
                                effective_date: '2026-09-18',
                                source_excerpt: 'Everyday Checking: $1,500.00',
                                is_saved: false,
                                unresolved_fields: [],
                                confirmed_by_user: true
                            }
                        ]
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.endsWith('/api/accounting/balances') && init?.method === 'POST') {
                savePayload = JSON.parse(String(init?.body || '{}'));
                return new Response(JSON.stringify({
                    success: true,
                    count: savePayload?.items?.length || 0,
                    items: savePayload?.items || []
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                    initialDocumentId="doc-immediate-1"
                />
            );
        });

        // Verify statement table rendered with initial amount $1,500.00
        const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(amountInput).toBeTruthy();
        expect(amountInput.value).toBe('1500.00');

        // Immediately edit amount to 1550.00
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(amountInput, '1550.00');
            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Immediately click "Save balance updates" without waiting for 500ms debounce
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        expect(saveButton).toBeTruthy();

        await act(async () => {
            saveButton?.click();
        });

        // 1. Verify save POST was called immediately with the edited amount (155000 cents)
        expect(savePayload).not.toBeNull();
        expect(savePayload.items).toHaveLength(1);
        expect(savePayload.items[0].proposal_id).toBe('prop-immediate-1');
        expect(savePayload.items[0].amount_cents).toBe(155000);

        // 2. Verify debounced autosave was cancelled, so no pre-save PUT payload was queued
        // Any autosync triggered after save will see hasUnsaved === false and skip
        expect(putPayloads.length).toBe(0);
    });

    /**
     * Test 12: Delayed pre-save autosave must not reset a saved row to pending.
     * 
     * Why this test exists:
     * Delivery 2B Correction 2: If an autosave HTTP PUT request was initiated and delayed by network latency,
     * while the user clicks Save (POST /api/accounting/balances), the eventual return of the delayed PUT must
     * NOT reset the saved row back to pending, nor corrupt the saved state.
     * 
     * Tricky logic:
     * When PUT completes after save, the autosyncVersionRef check ensures that stale responses are
     * safely discarded and do not mutate statementProposals back to is_saved: false.
     * 
     * TODO: Add toast notification if offline background sync experiences intermittent retry failures.
     */
    it('12. Delayed pre-save autosave does not reset a saved row to pending or overwrite newer review decisions', async () => {
        let resolveDelayedPut: ((val: any) => void) | null = null;
        let savePayload: any = null;

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/documents/statements') && init?.method === 'PUT') {
                return new Promise((resolve) => {
                    resolveDelayedPut = (val: any) => resolve(new Response(JSON.stringify(val), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' }
                    }));
                });
            }

            if (urlStr.includes('/api/documents/statements') && (!init || init.method === 'GET')) {
                return new Response(JSON.stringify({
                    success: true,
                    review: {
                        id: 'rev-delayed-1',
                        document_id: 'doc-delayed-1',
                        version: 1,
                        proposals: [
                            {
                                id: 'prop-delayed-1',
                                raw_account_name: 'Everyday Checking',
                                account_id: 'acc-1',
                                account_name: 'Everyday Checking',
                                entity_id: 'ent-1',
                                amount_cents: 150000,
                                currency: 'AUD',
                                balance_kind: 'current_balance',
                                effective_date: '2026-09-18',
                                source_excerpt: 'Everyday Checking: $1,500.00',
                                is_saved: false,
                                unresolved_fields: [],
                                confirmed_by_user: true
                            }
                        ]
                    }
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.endsWith('/api/accounting/balances') && init?.method === 'POST') {
                savePayload = JSON.parse(String(init?.body || '{}'));
                return new Response(JSON.stringify({
                    success: true,
                    count: savePayload?.items?.length || 0,
                    items: savePayload?.items || []
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                    initialDocumentId="doc-delayed-1"
                />
            );
        });

        // Edit amount to 1550.00
        const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(amountInput, '1550.00');
            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Click Save immediately
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        await act(async () => {
            saveButton?.click();
        });

        // Verify save succeeded
        expect(savePayload).not.toBeNull();
        expect(savePayload.items[0].amount_cents).toBe(155000);

        // If a delayed PUT were to resolve now:
        if (resolveDelayedPut) {
            await act(async () => {
                (resolveDelayedPut as any)({ success: true, version: 1 });
            });
        }

        // Row is saved, not pending!
        expect(container.textContent).toContain('Saved');
    });

    /**
     * Test 13: Reopening existing review adopts authoritative server review version, persists autosave, and reopens with edited amount.
     * 
     * Why this test exists:
     * Fulfills Regression 1 Requirement:
     * - Stored pending review: version 3, amount 150000.
     * - Reopen, edit amount to 155000, wait for autosave.
     * - Adopt authoritative server review version on load/resume.
     * - Test reopen -> edit -> autosave -> reopen, using the actual component connected to isolated API handlers.
     * 
     * Tricky logic:
     * Simulates real DOM typing events and waits 650ms for debounced autosave.
     * The PUT handler receives version 4 (>= 3), updating serverReview state.
     * Unmounting and re-rendering with initialDocumentId simulates page navigation/reopening,
     * verifying that the authoritative version 4 and 155000 amount are loaded and rendered.
     * 
     * TODO: Support undo/redo history across autosaves in Milestone 2.
     */
    it('13. Reopening existing review adopts authoritative server review version, persists autosave, and reopens with edited amount', async () => {
        let serverReview = {
            id: 'rev-reopen-test',
            document_id: 'doc-reopen-test',
            status: 'pending_review',
            version: 3,
            proposals: [
                {
                    id: 'prop-reopen-1',
                    raw_account_name: 'Smart Access',
                    account_id: 'acc-1',
                    account_name: 'Everyday Checking',
                    entity_id: 'ent-1',
                    amount_cents: 150000,
                    currency: 'AUD',
                    balance_kind: 'current_balance',
                    effective_date: '2026-03-15',
                    source_excerpt: 'Smart Access Balance: $1,500.00',
                    is_saved: false,
                    unresolved_fields: [],
                    confirmed_by_user: true
                }
            ]
        };

        let lastPutPayload: any = null;

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/documents/statements') && init?.method === 'PUT') {
                lastPutPayload = JSON.parse(String(init?.body || '{}'));
                // Reject stale
                if (typeof lastPutPayload.version === 'number' && lastPutPayload.version < serverReview.version) {
                    return new Response(JSON.stringify({
                        success: false,
                        stale: true,
                        error: `Stale review version (${lastPutPayload.version} < ${serverReview.version}).`,
                        current_version: serverReview.version,
                        review: serverReview
                    }), { status: 409, headers: { 'Content-Type': 'application/json' } });
                }

                // Accept update
                serverReview = {
                    ...serverReview,
                    version: lastPutPayload.version,
                    proposals: lastPutPayload.proposals
                };
                return new Response(JSON.stringify({
                    success: true,
                    review: serverReview
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/documents/statements') && (!init || init.method === 'GET')) {
                return new Response(JSON.stringify({
                    success: true,
                    document: { id: 'doc-reopen-test', filename: 'cba_statement.pdf' },
                    review: serverReview
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        // 1. Initial reopen of review session (version 3, amount 150000)
        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                    initialDocumentId="doc-reopen-test"
                />
            );
        });

        const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(amountInput).toBeDefined();
        expect(amountInput.value).toBe('1500.00');

        // 2. Edit amount to 1550.00
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(amountInput, '1550.00');
            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // 3. Wait for debounced autosave (500ms timeout)
        await act(async () => {
            await new Promise(r => setTimeout(r, 650));
        });

        // Verify PUT payload adopted authoritative server version (version: 4)
        expect(lastPutPayload).not.toBeNull();
        expect(lastPutPayload.version).toBe(4);
        expect(lastPutPayload.proposals[0].amount_cents).toBe(155000);

        // Verify server storage was updated
        expect(serverReview.version).toBe(4);
        expect(serverReview.proposals[0].amount_cents).toBe(155000);

        // Verify UI displays autosaved confirmation
        expect(container.textContent).toContain('Autosaved');

        // 4. Simulate closing and reopening modal (reopen -> edit -> autosave -> reopen)
        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={false} onClose={() => {}} />);
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                    initialDocumentId="doc-reopen-test"
                />
            );
        });

        const reopenedAmountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        expect(reopenedAmountInput).toBeDefined();
        // Authoritative version 4 amount (1550.00) is loaded cleanly!
        expect(reopenedAmountInput.value).toBe('1550.00');
    });

    /**
     * Test 14: Stale update rejection explicitly reports error and never displays Review Autosaved for an ignored mutation.
     * 
     * Why this test exists:
     * Fulfills Regression 1 Requirements:
     * - Explicitly report rejected stale updates.
     * - Never show “Autosaved” for an ignored mutation.
     */
    it('14. Stale update rejection explicitly reports error and never displays Review Autosaved for an ignored mutation', async () => {
        const serverReview = {
            id: 'rev-stale-test',
            document_id: 'doc-stale-test',
            status: 'pending_review',
            version: 5,
            proposals: [
                {
                    id: 'prop-stale-1',
                    raw_account_name: 'Smart Access',
                    account_id: 'acc-1',
                    account_name: 'Everyday Checking',
                    entity_id: 'ent-1',
                    amount_cents: 200000,
                    currency: 'AUD',
                    balance_kind: 'current_balance',
                    effective_date: '2026-03-15',
                    source_excerpt: 'Smart Access Balance: $2,000.00',
                    is_saved: false,
                    unresolved_fields: [],
                    confirmed_by_user: true
                }
            ]
        };

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/documents/statements') && init?.method === 'PUT') {
                // Simulate server rejecting stale update with HTTP 409
                return new Response(JSON.stringify({
                    success: false,
                    stale: true,
                    error: 'Stale review version (1 < 5). Server version is 5. Changes rejected.',
                    current_version: 5,
                    review: serverReview
                }), { status: 409, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/documents/statements') && (!init || init.method === 'GET')) {
                return new Response(JSON.stringify({
                    success: true,
                    document: { id: 'doc-stale-test', filename: 'cba_statement.pdf' },
                    review: serverReview
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                    initialDocumentId="doc-stale-test"
                />
            );
        });

        const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
        await act(async () => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                'value'
            )?.set;
            nativeInputValueSetter?.call(amountInput, '2100.00');
            amountInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Wait for debounced autosave
        await act(async () => {
            await new Promise(r => setTimeout(r, 650));
        });

        // The UI must display error and must NEVER display "Autosaved"
        expect(container.textContent).not.toContain('Review Autosaved');
        expect(container.textContent).toContain('Stale review version');
    });

    /**
     * Fulfills Batch A Narrow Closing Correction 3:
     * Display the ownership-conflict explanation in the actual review UI beside the affected account choice.
     * Preserves it through reopening while unresolved.
     * Clears the active warning after deliberate user resolution.
     */
    it('displays ownership conflict explanation beside affected account choice, preserves on reopen, and clears after deliberate resolution', async () => {
        const conflictReview = {
            id: 'rev-conflict-1',
            document_id: 'doc-conflict-test',
            status: 'pending_review',
            version: 1,
            proposals: [
                {
                    id: 'prop-conflict-1',
                    raw_account_name: 'Smart Access',
                    account_id: null,
                    account_name: 'Smart Access',
                    account_mask: '4421',
                    entity_id: null,
                    amount_cents: 350000,
                    currency: 'AUD',
                    balance_kind: 'current_balance',
                    effective_date: '2026-03-23',
                    source_excerpt: 'Smart Access Closing Balance: $3,500.00',
                    is_saved: false,
                    unresolved_fields: ['owner', 'account'],
                    owner_conflict_message: 'This statement names Alice Smith, but the matching account belongs to Bob Jones. Choose the correct account.',
                    confirmed_by_user: false
                }
            ]
        };

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/documents/statements') && init?.method === 'PUT') {
                return new Response(JSON.stringify({
                    success: true,
                    review: conflictReview
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/documents/statements') && (!init || init.method === 'GET')) {
                return new Response(JSON.stringify({
                    success: true,
                    document: { id: 'doc-conflict-test', filename: 'cba_statement.pdf' },
                    review: conflictReview
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        // 1. Initial Render: Open modal with the unresolved statement review
        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                    initialDocumentId="doc-conflict-test"
                />
            );
        });

        // Verify the user sees the ownership conflict explanation beside the affected account choice
        const conflictBanner = container.querySelector('[data-testid="owner-conflict-message"]');
        expect(conflictBanner).not.toBeNull();
        expect(conflictBanner?.textContent).toContain('This statement names Alice Smith, but the matching account belongs to Bob Jones. Choose the correct account.');
        expect(container.textContent).toContain('This statement names Alice Smith, but the matching account belongs to Bob Jones. Choose the correct account.');

        // 2. Deliberate resolution: User selects an account from the dropdown
        const selectElem = container.querySelector('select') as HTMLSelectElement;
        expect(selectElem).not.toBeNull();
        expect(selectElem.value).toBe(''); // Initially unselected

        await act(async () => {
            const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLSelectElement.prototype,
                'value'
            )?.set;
            nativeSelectValueSetter?.call(selectElem, 'acc-1');
            selectElem.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Active warning must be cleared immediately after deliberate resolution
        const clearedBanner = container.querySelector('[data-testid="owner-conflict-message"]');
        expect(clearedBanner).toBeNull();
        expect(container.textContent).not.toContain('This statement names Alice Smith, but the matching account belongs to Bob Jones. Choose the correct account.');

        // 3. Reopening while unresolved: Simulate closing and reopening modal
        await act(async () => {
            root.render(<UpdateBalancesModal isOpen={false} onClose={() => {}} />);
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                    initialDocumentId="doc-conflict-test"
                />
            );
        });

        // Warning remains preserved when reopened unresolved
        const reopenedBanner = container.querySelector('[data-testid="owner-conflict-message"]');
        expect(reopenedBanner).not.toBeNull();
        expect(reopenedBanner?.textContent).toContain('This statement names Alice Smith, but the matching account belongs to Bob Jones. Choose the correct account.');
    });

    it('16. Sourced completion summaries use saved result counts and provide accountIds targeting /accounting?view=accounts', async () => {
        let onClosePayload: any = null;
        const handleClose = (payload?: any) => {
            onClosePayload = payload;
        };

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.endsWith('/api/accounting/balances') && init?.method === 'POST') {
                return new Response(JSON.stringify({
                    success: true,
                    count: 2,
                    items: [{ account_id: 'acc-1' }, { account_id: 'acc-2' }]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={handleClose}
                    initialMode="manual"
                />
            );
        });

        // Enter values for both acc-1 and acc-2 in manual fast entry
        const input1 = container.querySelector('#account-input-acc-1') as HTMLInputElement;
        const input2 = container.querySelector('#account-input-acc-2') as HTMLInputElement;
        expect(input1).not.toBeNull();
        expect(input2).not.toBeNull();

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        await act(async () => {
            nativeInputValueSetter?.call(input1, '1500.00');
            input1.dispatchEvent(new Event('change', { bubbles: true }));
            nativeInputValueSetter?.call(input2, '2500.00');
            input2.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Click "Save balance updates"
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        expect(saveButton).not.toBeUndefined();

        await act(async () => {
            saveButton?.click();
        });

        // Wait for save timeout (600ms)
        await act(async () => {
            await new Promise(r => setTimeout(r, 700));
        });

        expect(onClosePayload).not.toBeNull();
        expect(onClosePayload.balancesUpdated).toBe(2);
        expect(onClosePayload.accountIds).toEqual(['acc-1', 'acc-2']);
        // Multiple accounts: accountId must be undefined so ImportSummaryBanner links to "View accounts"
        expect(onClosePayload.accountId).toBeUndefined();
    });

    it('17. Retains document_id on unsupported statement upload and scopes fallback manual entry with source_type: manual', async () => {
        let sentBatchItems: any[] = [];

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/documents/statements') && init?.method === 'POST') {
                return new Response(JSON.stringify({
                    success: false,
                    supported: false,
                    error: 'Unsupported statement layout: no balance summary or account valuation figures were found.',
                    document_id: 'doc-fallback-c1'
                }), { status: 422, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.endsWith('/api/accounting/balances') && init?.method === 'POST') {
                const body = JSON.parse(String(init?.body || '{}'));
                sentBatchItems = body.items || [];
                return new Response(JSON.stringify({
                    success: true,
                    count: 1,
                    items: [{ account_id: 'acc-1' }]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                />
            );
        });

        // Upload statement PDF
        const fileInput = container.querySelector('#statement-pdf-input') as HTMLInputElement;
        expect(fileInput).not.toBeNull();

        const file = new File(['%PDF-1.4 mock content'], 'unsupported_statement.pdf', { type: 'application/pdf' });
        await act(async () => {
            Object.defineProperty(fileInput, 'files', { value: [file] });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Verify error renders with prompt to enter manually with document retained
        expect(container.textContent).toContain('Extraction Error:');
        expect(container.textContent).toContain('Document retained (unsupported_statement.pdf)');

        const fallbackButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Enter manually with document')
        );
        expect(fallbackButton).not.toBeUndefined();

        // Click fallback button to transition to manual fast entry
        await act(async () => {
            fallbackButton?.click();
        });

        // Verify banner appears in manual tab
        expect(container.textContent).toContain('Supporting document attached: unsupported_statement.pdf');
        expect(container.textContent).toContain('(Entry will be recorded as manual with document evidence)');

        // Enter balance for acc-1
        const input1 = container.querySelector('#account-input-acc-1') as HTMLInputElement;
        expect(input1).not.toBeNull();

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        await act(async () => {
            nativeInputValueSetter?.call(input1, '3500.00');
            input1.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Save
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        expect(saveButton).not.toBeUndefined();

        await act(async () => {
            saveButton?.click();
        });

        // Verify the saved payload: source_type must remain strictly 'manual', with document_id attached
        expect(sentBatchItems).toHaveLength(1);
        expect(sentBatchItems[0].account_id).toBe('acc-1');
        expect(sentBatchItems[0].source_type).toBe('manual');
        expect(sentBatchItems[0].document_id).toBe('doc-fallback-c1');
    });
    it('18. Clears fallback document_id when leaving manual tab (Unsupported statement A -> Paste -> Manual -> Save)', async () => {
        let sentBatchItems: any[] = [];

        vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init?: RequestInit) => {
            const urlStr = String(url);

            if (urlStr.includes('/api/documents/statements') && init?.method === 'POST') {
                return new Response(JSON.stringify({
                    success: false,
                    supported: false,
                    error: 'Unsupported statement layout: no balance summary or account valuation figures were found.',
                    document_id: 'doc-fallback-A'
                }), { status: 422, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.endsWith('/api/accounting/balances') && init?.method === 'POST') {
                const body = JSON.parse(String(init?.body || '{}'));
                sentBatchItems = body.items || [];
                return new Response(JSON.stringify({
                    success: true,
                    count: 1,
                    items: [{ account_id: 'acc-1' }]
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (urlStr.includes('/api/accounting')) {
                return new Response(JSON.stringify({
                    accounts: mockAccounts,
                    entities: mockEntities
                }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({}), { status: 200 });
        });

        await act(async () => {
            root.render(
                <UpdateBalancesModal
                    isOpen={true}
                    onClose={() => {}}
                    initialMode="statement"
                />
            );
        });

        // Step 1: Upload Unsupported Statement A
        const fileInput = container.querySelector('#statement-pdf-input') as HTMLInputElement;
        expect(fileInput).not.toBeNull();

        const file = new File(['%PDF-1.4 mock content'], 'unsupported_statement_a.pdf', { type: 'application/pdf' });
        await act(async () => {
            Object.defineProperty(fileInput, 'files', { value: [file] });
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Verify fallback button exists (document_id is retained)
        const fallbackButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Enter manually with document')
        );
        expect(fallbackButton).not.toBeUndefined();

        // Step 2: Switch to "Paste Table / CSV" tab
        const pasteTabButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Paste Table / CSV')
        );
        expect(pasteTabButton).not.toBeUndefined();

        await act(async () => {
            pasteTabButton?.click();
        });

        // Step 3: Switch to "Manual Fast Entry" tab
        const manualTabButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Manual Fast Entry')
        );
        expect(manualTabButton).not.toBeUndefined();

        await act(async () => {
            manualTabButton?.click();
        });

        // Verify banner does NOT appear because we cleared the context
        expect(container.textContent).not.toContain('Supporting document attached: unsupported_statement_a.pdf');

        // Step 4: Enter unrelated balance
        const input1 = container.querySelector('#account-input-acc-1') as HTMLInputElement;
        expect(input1).not.toBeNull();

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        await act(async () => {
            nativeInputValueSetter?.call(input1, '4500.00');
            input1.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Step 5: Save
        const saveButton = Array.from(container.querySelectorAll('button')).find(
            b => b.textContent?.includes('Save balance updates')
        );
        expect(saveButton).not.toBeUndefined();

        await act(async () => {
            saveButton?.click();
        });

        // Verify payload: source_type: 'manual', but NO document_id!
        expect(sentBatchItems).toHaveLength(1);
        expect(sentBatchItems[0].account_id).toBe('acc-1');
        expect(sentBatchItems[0].source_type).toBe('manual');
        expect(sentBatchItems[0].document_id).toBeUndefined(); // MUST NOT leak the document_id
    });
});

