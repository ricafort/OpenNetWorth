/**
 * Recurring origin passthrough (Autopilot generator support).
 *
 * Why this exists:
 * The Autopilot generator (`src/features/cashflow/data/autopilotGenerator.ts`)
 * posts scheduled amounts through record_income / record_expense with
 * origin='recurring' so ledger activity is distinguishable from manual entries.
 * The service must:
 * 1. Honor an explicit origin on both income and expense inputs.
 * 2. Default to 'manual' when origin is omitted (no behavior change for
 *    every existing caller).
 * 3. Stay idempotent on generator re-runs: the same
 *    `recurring:<schedule id>:<month>` key returns the existing transaction
 *    instead of duplicating postings.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { createEntity, createAccount } from './accountService';
import { recordIncome, recordExpense, RecordIncomeInput } from './transactionService';

describe('Recurring origin passthrough (Autopilot generator)', () => {
    let db: Database.Database;
    let entityId: string;
    let bankAccountId: string;

    beforeEach(() => {
        db = createTestDb();
        setTestDb(db);

        const entity = createEntity(db, { name: 'Autopilot Household', type: 'household', currency: 'USD' });
        entityId = entity.id;
        const bank = createAccount(db, {
            entity_id: entity.id,
            name: 'Main Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            opening_date: '2026-10-01',
            opening_balance_cents: 100000
        });
        bankAccountId = bank.account.id;
    });

    afterEach(() => {
        setTestDb(null);
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    it('records income and expense with origin="recurring"', () => {
        const income = recordIncome(db, {
            entity_id: entityId,
            bank_account_id: bankAccountId,
            amount_cents: 320000,
            date: '2026-10-01',
            payer: 'Employer',
            description: 'Monthly salary',
            idempotency_key: 'recurring:schedule-salary:2026-10',
            origin: 'recurring'
        });
        expect(income.origin).toBe('recurring');

        // Free-text schedule categories become account sub_type values (no CHECK constraint).
        const expense = recordExpense(db, {
            entity_id: entityId,
            payment_account_id: bankAccountId,
            category: 'Debt_Repayment' as any,
            amount_cents: 150000,
            date: '2026-10-01',
            payee: 'Lender',
            description: 'Loan instalment',
            idempotency_key: 'recurring:schedule-loan:2026-10',
            origin: 'recurring'
        });
        expect(expense.origin).toBe('recurring');

        const count = db
            .prepare("SELECT COUNT(*) AS c FROM m1_transactions WHERE origin = 'recurring'")
            .get() as any;
        expect(count.c).toBe(2);
    });

    it('defaults origin to "manual" when omitted (existing callers unchanged)', () => {
        const income = recordIncome(db, {
            entity_id: entityId,
            bank_account_id: bankAccountId,
            amount_cents: 50000,
            date: '2026-10-05',
            description: 'One-off deposit'
        });
        expect(income.origin).toBe('manual');
    });

    it('re-running the same schedule+month key returns the existing transaction without duplicating', () => {
        const payload: RecordIncomeInput = {
            entity_id: entityId,
            bank_account_id: bankAccountId,
            amount_cents: 320000,
            date: '2026-10-01',
            payer: 'Employer',
            description: 'Monthly salary',
            idempotency_key: 'recurring:schedule-salary:2026-10',
            origin: 'recurring'
        };

        const first = recordIncome(db, payload);
        const replay = recordIncome(db, payload);
        expect(replay.id).toBe(first.id);

        const count = db
            .prepare("SELECT COUNT(*) AS c FROM m1_transactions WHERE origin = 'recurring'")
            .get() as any;
        expect(count.c).toBe(1);
    });
});
