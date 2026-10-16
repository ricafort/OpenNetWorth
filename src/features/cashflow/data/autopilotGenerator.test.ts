/**
 * Why this file exists:
 * The Autopilot generator turns schedules into REAL ledger postings via
 * /api/accounting. The ledger-side behavior (origin passthrough, idempotent
 * replay) is covered by `recurring_origin.test.ts`; this file covers the
 * generator itself: which schedules it posts, the exact payload shape it
 * sends, monthly normalization, currency-honest skipping, and error capture.
 * The debt sibling (`applyDebtPaymentsToMonth`) is covered here too: the
 * amount-free payload contract (the server derives the minimum from stored
 * terms) and the client-side skip rules. Server-side guards live in
 * `debtAutopay.test.ts`.
 *
 * Tricky logic:
 * - fetch is stubbed: the generator must send `recurring:<id>:<month>`
 *   idempotency keys (the ledger dedupes replays server-side, so the test
 *   asserts the KEY is stable across runs, not the dedup itself).
 * - All names are synthetic fixtures; no real financial data.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    applyRecurringToMonth,
    applyDebtPaymentsToMonth,
    AutopilotDebt,
    AutopilotTarget
} from './autopilotGenerator';
import { RecurringTransaction } from '@/features/cashflow/types';

interface PostedCall {
    action: string;
    payload: Record<string, any>;
}

const TARGET: AutopilotTarget = {
    entityId: 'entity-1',
    bankAccountId: 'bank-1',
    bankAccountCurrency: 'USD'
};

function schedule(over: Partial<RecurringTransaction> = {}): RecurringTransaction {
    return {
        id: 'sch-salary',
        name: 'Monthly Salary',
        amount: 3200,
        type: 'income',
        frequency: 'monthly',
        category: 'Salary',
        start_date: '2024-01-01',
        is_active: true,
        currency: 'USD',
        ...over
    };
}

describe('applyRecurringToMonth (Autopilot generator)', () => {
    let calls: PostedCall[];
    let respond: (url: string, init: any) => Promise<any>;

    beforeEach(() => {
        calls = [];
        respond = async (_url: string, init: any) => {
            calls.push(JSON.parse(init.body));
            return { ok: true, status: 201, json: async () => ({ success: true, transaction: {} }) };
        };
        vi.stubGlobal('fetch', (url: string, init: any) => respond(url, init));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts income and expense with the ledger payload contract', async () => {
        const result = await applyRecurringToMonth(
            [
                schedule(),
                schedule({
                    id: 'sch-rent', name: 'Rent Payment', type: 'expense',
                    amount: 1500, category: 'Housing Costs'
                })
            ],
            '2026-10',
            TARGET
        );

        expect(result).toEqual({ month: '2026-10', posted: 2, skipped: 0, errors: [] });
        expect(calls).toHaveLength(2);

        const [income, expense] = calls;
        expect(income.action).toBe('record_income');
        expect(income.payload).toMatchObject({
            entity_id: 'entity-1',
            bank_account_id: 'bank-1',
            amount_cents: 320000,
            date: '2026-10-01',
            description: 'Monthly Salary',
            payer: 'Monthly Salary',
            idempotency_key: 'recurring:sch-salary:2026-10',
            origin: 'recurring',
            category: 'Salary'
        });

        expect(expense.action).toBe('record_expense');
        expect(expense.payload).toMatchObject({
            payment_account_id: 'bank-1',
            amount_cents: 150000,
            payee: 'Rent Payment',
            idempotency_key: 'recurring:sch-rent:2026-10',
            origin: 'recurring',
            // Free-text schedule categories become snake_case ledger categories.
            category: 'Housing_Costs'
        });
        // Income never carries a payment account and vice versa.
        expect(income.payload.payment_account_id).toBeUndefined();
        expect(expense.payload.bank_account_id).toBeUndefined();
    });

    it('normalizes non-monthly frequencies to monthly cents', async () => {
        await applyRecurringToMonth(
            [schedule({ id: 'sch-w', amount: 100, frequency: 'weekly' })],
            '2026-10',
            TARGET
        );
        expect(calls[0].payload.amount_cents).toBe(43300); // 100 × 4.33
    });

    it('skips inactive, not-yet-started, ended, and non-positive schedules', async () => {
        const result = await applyRecurringToMonth(
            [
                schedule({ id: 'off', is_active: false }),
                schedule({ id: 'future', start_date: '2026-11-15' }),
                schedule({ id: 'ended', end_date: '2026-09-30' }),
                schedule({ id: 'zero', amount: 0 })
            ],
            '2026-10',
            TARGET
        );
        expect(result).toEqual({ month: '2026-10', posted: 0, skipped: 4, errors: [] });
        expect(calls).toHaveLength(0);
    });

    it('skips schedules whose currency differs from the funding account (no fake FX)', async () => {
        const result = await applyRecurringToMonth(
            [
                schedule({ id: 'eur', currency: 'EUR' as any }),
                schedule({ id: 'usd', currency: 'USD' }),
                schedule({ id: 'none', currency: undefined })
            ],
            '2026-10',
            TARGET
        );
        expect(result.posted).toBe(2);
        expect(result.skipped).toBe(1);
        expect(calls.map(c => c.payload.idempotency_key)).toEqual([
            'recurring:usd:2026-10',
            'recurring:none:2026-10'
        ]);
    });

    it('captures per-schedule errors without aborting the run', async () => {
        respond = async (_url: string, init: any) => {
            const body = JSON.parse(init.body);
            calls.push(body);
            if (body.payload.description === 'Rent Payment') {
                return { ok: false, status: 403, json: async () => ({ error: 'Demo mode is read-only.' }) };
            }
            return { ok: true, status: 201, json: async () => ({ success: true }) };
        };

        const result = await applyRecurringToMonth(
            [schedule(), schedule({ id: 'sch-rent', name: 'Rent Payment', type: 'expense' })],
            '2026-10',
            TARGET
        );
        expect(result.posted).toBe(1);
        expect(result.errors).toEqual(['Rent Payment: Demo mode is read-only.']);
    });

    it('re-running the same month sends identical idempotency keys (ledger dedupes replays)', async () => {
        const first = await applyRecurringToMonth([schedule()], '2026-10', TARGET);
        const second = await applyRecurringToMonth([schedule()], '2026-10', TARGET);
        expect(first.posted).toBe(1);
        expect(second.posted).toBe(1);
        expect(calls[0].payload.idempotency_key).toBe(calls[1].payload.idempotency_key);
    });

    it('rejects an invalid month or a missing target instead of guessing', async () => {
        await expect(applyRecurringToMonth([schedule()], '2026-13', TARGET))
            .rejects.toThrow(/Invalid month/);
        await expect(applyRecurringToMonth([schedule()], '2026-10', { entityId: '', bankAccountId: 'bank-1' }))
            .rejects.toThrow(/explicit entity and bank account/);
        expect(calls).toHaveLength(0);
    });
});

function debt(over: Partial<AutopilotDebt> = {}): AutopilotDebt {
    return {
        id: 'debt-card',
        name: 'Visa Card',
        sub_type: 'credit_card',
        currency: 'USD',
        minimum_payment_cents: 3500,
        balance_cents: 100000,
        is_active: true,
        ...over
    };
}

describe('applyDebtPaymentsToMonth (Autopilot debt generator)', () => {
    let calls: PostedCall[];
    let respond: (url: string, init: any) => Promise<any>;

    beforeEach(() => {
        calls = [];
        respond = async (_url: string, init: any) => {
            calls.push(JSON.parse(init.body));
            return { ok: true, status: 201, json: async () => ({ success: true, transaction: {} }) };
        };
        vi.stubGlobal('fetch', (url: string, init: any) => respond(url, init));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sends the amount-free payload contract — the server derives the minimum', async () => {
        const result = await applyDebtPaymentsToMonth([debt()], '2026-10', TARGET, []);

        expect(result).toEqual({ month: '2026-10', posted: 1, skipped: 0, skipped_details: [], errors: [] });
        expect(calls).toHaveLength(1);
        expect(calls[0].action).toBe('autopay_debt');
        expect(calls[0].payload).toEqual({
            entity_id: 'entity-1',
            bank_account_id: 'bank-1',
            debt_account_id: 'debt-card',
            month: '2026-10'
        });
        // No amount, no idempotency key: both are the server's job.
        expect(calls[0].payload.amount_cents).toBeUndefined();
        expect(calls[0].payload.idempotency_key).toBeUndefined();
    });

    it('skips inactive, term-less, wrong-currency, and paid-off debts before any fetch', async () => {
        const result = await applyDebtPaymentsToMonth(
            [
                debt({ id: 'off', is_active: false }),
                debt({ id: 'noterms', minimum_payment_cents: null }),
                debt({ id: 'eur', currency: 'EUR' }),
                debt({ id: 'paidoff', balance_cents: 0 }),
                debt({ id: 'unknown-balance', balance_cents: null })
            ],
            '2026-10',
            TARGET,
            []
        );
        // Unknown balance does NOT skip — explicit terms post regardless.
        expect(result.posted).toBe(1);
        expect(result.skipped_details).toEqual([
            { id: 'off', name: 'Visa Card', reason: 'inactive' },
            { id: 'noterms', name: 'Visa Card', reason: 'no_explicit_minimum' },
            { id: 'eur', name: 'Visa Card', reason: 'currency_mismatch' },
            { id: 'paidoff', name: 'Visa Card', reason: 'nothing_owed' }
        ]);
        expect(calls.map(c => c.payload.debt_account_id)).toEqual(['unknown-balance']);
    });

    it('skips debts covered by a projected schedule — free-text and sub_type categories both match', async () => {
        // 'Debt Repayment' must lowercase to 'debt_repayment' (shared
        // normalizeCategory), otherwise the forecast's suppression and this
        // skip would disagree about coverage.
        const byCategory = await applyDebtPaymentsToMonth(
            [debt({ id: 'covered' })],
            '2026-10',
            TARGET,
            [schedule({ id: 'sch-dr', type: 'expense', category: 'Debt Repayment' })]
        );
        expect(byCategory.skipped_details).toEqual([
            { id: 'covered', name: 'Visa Card', reason: 'covered_by_recurring_schedule' }
        ]);

        // A category matching the debt's sub_type covers it too.
        const bySubType = await applyDebtPaymentsToMonth(
            [debt({ id: 'covered-2' })],
            '2026-10',
            TARGET,
            [schedule({ id: 'sch-cc', type: 'expense', category: 'Credit Card' })]
        );
        expect(bySubType.posted).toBe(0);
        expect(calls).toHaveLength(0);
    });

    it('does NOT skip when the covering schedule is inactive, ended, or another currency', async () => {
        const result = await applyDebtPaymentsToMonth(
            [debt({ id: 'd1' }), debt({ id: 'd2' }), debt({ id: 'd3' })],
            '2026-10',
            TARGET,
            [
                schedule({ id: 's-off', type: 'expense', category: 'Debt Repayment', is_active: false }),
                schedule({ id: 's-ended', type: 'expense', category: 'Debt Repayment', end_date: '2026-09-30' }),
                schedule({ id: 's-eur', type: 'expense', category: 'Debt Repayment', currency: 'EUR' as any })
            ]
        );
        expect(result.posted).toBe(3);
        expect(result.skipped).toBe(0);
    });

    it('counts a server-side skip (200) as skipped with its reason, not as an error', async () => {
        respond = async (_url: string, init: any) => {
            calls.push(JSON.parse(init.body));
            return { ok: true, status: 200, json: async () => ({ success: true, skipped: true, reason: 'already_paid' }) };
        };
        const result = await applyDebtPaymentsToMonth([debt()], '2026-10', TARGET, []);
        expect(result).toEqual({
            month: '2026-10',
            posted: 0,
            skipped: 1,
            skipped_details: [{ id: 'debt-card', name: 'Visa Card', reason: 'already_paid' }],
            errors: []
        });
    });

    it('captures per-debt errors without aborting the run', async () => {
        respond = async (_url: string, init: any) => {
            const body = JSON.parse(init.body);
            calls.push(body);
            if (body.payload.debt_account_id === 'boom') {
                return { ok: false, status: 409, json: async () => ({ error: 'Idempotency key conflict.' }) };
            }
            return { ok: true, status: 201, json: async () => ({ success: true }) };
        };
        const result = await applyDebtPaymentsToMonth(
            [debt({ id: 'boom' }), debt({ id: 'fine' })],
            '2026-10',
            TARGET,
            []
        );
        expect(result.posted).toBe(1);
        expect(result.errors).toEqual(['Visa Card: Idempotency key conflict.']);
    });

    it('rejects an invalid month or a missing target instead of guessing', async () => {
        await expect(applyDebtPaymentsToMonth([debt()], '2026-13', TARGET, []))
            .rejects.toThrow(/Invalid month/);
        await expect(applyDebtPaymentsToMonth([debt()], '2026-10', { entityId: 'entity-1', bankAccountId: '' }, []))
            .rejects.toThrow(/explicit entity and bank account/);
        expect(calls).toHaveLength(0);
    });
});
