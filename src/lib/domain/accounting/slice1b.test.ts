/**
 * Milestone 1 — Slice 1B: Isolated Accounts & Opening Balances Automated Tests
 * 
 * Why this file exists:
 * Verifies the implementation of Slice 1B:
 * 1. Acceptance Scenario T1: Opening bank balance 1,000 creates balanced entries; net worth is 1,000.
 * 2. Liability opening balances: Balanced postings reduce equity without inventing transactions.
 * 3. As-of date calculation accuracy: Balances before the opening date are strictly zero.
 * 4. Optimistic concurrency control (M1-SAFE-06): Revisions prevent silent overwrite.
 * 5. Input validation & atomic rollbacks (M1-SAFE-04).
 * 6. Test database isolation (M1-SAFE-01): 100% in-memory (:memory:).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import {
    createEntity,
    createAccount,
    updateAccount,
    listAccounts,
    ValidationError,
    ConflictError
} from './accountService';
import {
    getAccountBalance,
    getEntityNetWorth
} from './balanceService';
import { validateTransactionBalance } from './types';

describe('Milestone 1 — Slice 1B: Accounts, Opening Balances & Calculations', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Pristine in-memory database for each test (M1-SAFE-01)
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initAccountingSchema(db);
    });

    afterEach(() => {
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    describe('Acceptance Scenario T1: Bank Opening Balance & Net Worth', () => {
        it('T1: opening bank balance 1,000 creates balanced entries and net worth of 1,000 in that currency', () => {
            // 1. Create Sovereign Entity
            const entity = createEntity(db, {
                name: 'Alice Vault Owner',
                type: 'person',
                currency: 'USD'
            });

            // 2. Create Bank Account with Opening Balance of $1,000.00 (100,000 cents)
            const result = createAccount(db, {
                entity_id: entity.id,
                name: 'Chase Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD',
                institution: 'Chase',
                opening_date: '2026-09-01',
                opening_balance_cents: 100000 // $1,000.00
            });

            expect(result.account.id).toBeDefined();
            expect(result.account.name).toBe('Chase Checking');
            expect(result.account.opening_balance_cents).toBe(100000);
            expect(result.openingTransaction).toBeDefined();

            // 3. Verify Balanced Entries in Database
            const txId = result.openingTransaction!.id;
            const postings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(txId) as any[];

            expect(postings).toHaveLength(2);

            // Double-entry invariant check: Sum of postings must equal 0
            const balanceValidation = validateTransactionBalance(postings);
            expect(balanceValidation.isValid).toBe(true);
            expect(balanceValidation.delta_cents).toBe(0);

            // Asset leg: Debit (+100,000 cents)
            const assetLeg = postings.find(p => p.account_id === result.account.id);
            expect(assetLeg).toBeDefined();
            expect(assetLeg.amount_cents).toBe(100000);

            // Equity leg: Credit (-100,000 cents)
            const equityLeg = postings.find(p => p.account_id !== result.account.id);
            expect(equityLeg).toBeDefined();
            expect(equityLeg.amount_cents).toBe(-100000);

            // 4. Verify Account Balance Calculation
            const accountBal = getAccountBalance(db, result.account.id, '2026-09-13');
            expect(accountBal.balance_cents).toBe(100000);
            expect(accountBal.formatted_balance).toBe('$1,000.00');

            // 5. Verify Entity Net Worth Calculation
            const netWorthResult = getEntityNetWorth(db, entity.id, '2026-09-13');
            expect(netWorthResult.total_assets_cents_by_currency['USD']).toBe(100000);
            expect(netWorthResult.total_liabilities_cents_by_currency['USD'] || 0).toBe(0);
            expect(netWorthResult.net_worth_cents_by_currency['USD']).toBe(100000);
            expect(netWorthResult.formatted_net_worth_by_currency['USD']).toBe('$1,000.00');
        });
    });

    describe('Liability Opening Balances & Combined Net Worth', () => {
        it('creates balanced opening entries for credit card and calculates net debt reduction to net worth', () => {
            const entity = createEntity(db, {
                name: 'Bob Vault Owner',
                type: 'person',
                currency: 'USD'
            });

            // 1. Asset: $2,000 cash
            const checking = createAccount(db, {
                entity_id: entity.id,
                name: 'Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 200000
            });

            // 2. Liability: $500 credit card debt
            const card = createAccount(db, {
                entity_id: entity.id,
                name: 'Amex Gold',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'USD',
                opening_date: '2026-09-01',
                opening_balance_cents: 50000
            });

            // Verify liability postings balance
            const cardPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(card.openingTransaction!.id) as any[];
            expect(validateTransactionBalance(cardPostings).isValid).toBe(true);

            // Credit Card leg: Credit (-50,000 cents, increasing liability)
            const cardLeg = cardPostings.find(p => p.account_id === card.account.id);
            expect(cardLeg.amount_cents).toBe(-50000);

            // Liability balance check
            const cardBal = getAccountBalance(db, card.account.id, '2026-09-13');
            expect(cardBal.balance_cents).toBe(50000);
            expect(cardBal.formatted_balance).toBe('$500.00');

            // Combined Net Worth check: $2,000 - $500 = $1,500
            const netWorthResult = getEntityNetWorth(db, entity.id, '2026-09-13');
            expect(netWorthResult.total_assets_cents_by_currency['USD']).toBe(200000);
            expect(netWorthResult.total_liabilities_cents_by_currency['USD']).toBe(50000);
            expect(netWorthResult.net_worth_cents_by_currency['USD']).toBe(150000);
            expect(netWorthResult.formatted_net_worth_by_currency['USD']).toBe('$1,500.00');
        });
    });

    describe('As-Of Date Invariant (M1-FLOW-01, M1-CALC-01)', () => {
        it('calculates zero balance prior to opening date and exact balance on or after opening date', () => {
            const entity = createEntity(db, { name: 'Owner', type: 'person', currency: 'USD' });

            const acc = createAccount(db, {
                entity_id: entity.id,
                name: 'Brokerage',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'USD',
                opening_date: '2026-06-15',
                opening_balance_cents: 500000 // $5,000.00
            });

            // Day before opening date: balance is $0.00
            const balBefore = getAccountBalance(db, acc.account.id, '2026-06-14');
            expect(balBefore.balance_cents).toBe(0);
            expect(balBefore.contributor_count).toBe(0);

            // On opening date: balance is $5,000.00
            const balOn = getAccountBalance(db, acc.account.id, '2026-06-15');
            expect(balOn.balance_cents).toBe(500000);
            expect(balOn.contributor_count).toBe(1);

            // Three months after opening date: balance is $5,000.00
            const balAfter = getAccountBalance(db, acc.account.id, '2026-09-15');
            expect(balAfter.balance_cents).toBe(500000);
        });
    });

    describe('M1-SAFE-06: Optimistic Concurrency Control via Revision Check', () => {
        it('increments revision on update and rejects stale revisions with ConflictError', () => {
            const entity = createEntity(db, { name: 'Owner', type: 'person', currency: 'USD' });
            const acc = createAccount(db, {
                entity_id: entity.id,
                name: 'First National Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'USD'
            });

            expect(acc.account.revision).toBe(1);

            // 1. First update with expectedRevision: 1 succeeds
            const updated = updateAccount(db, acc.account.id, 1, { name: 'First National Premier Checking' });
            expect(updated.name).toBe('First National Premier Checking');
            expect(updated.revision).toBe(2);

            // 2. Second update using stale revision 1 throws ConflictError (simulating concurrent edit)
            expect(() => {
                updateAccount(db, acc.account.id, 1, { name: 'Conflicting Name' });
            }).toThrow(ConflictError);

            // Confirm database retains premier name
            const current = listAccounts(db, entity.id).find(a => a.id === acc.account.id);
            expect(current?.name).toBe('First National Premier Checking');
            expect(current?.revision).toBe(2);
        });
    });

    describe('M1-SAFE-04: Input Validation & Atomic Rollback', () => {
        it('rejects invalid inputs without persisting partial records', () => {
            const entity = createEntity(db, { name: 'Owner', type: 'person', currency: 'USD' });

            // Blank name
            expect(() => {
                createAccount(db, {
                    entity_id: entity.id,
                    name: '   ',
                    type: 'asset',
                    sub_type: 'checking',
                    currency: 'USD'
                });
            }).toThrow(ValidationError);

            // Non-integer float cents
            expect(() => {
                createAccount(db, {
                    entity_id: entity.id,
                    name: 'Test',
                    type: 'asset',
                    sub_type: 'checking',
                    currency: 'USD',
                    opening_date: '2026-09-01',
                    opening_balance_cents: 100.5 as any
                });
            }).toThrow(/must be a safe, finite integer/);

            // Missing date when opening balance specified
            expect(() => {
                createAccount(db, {
                    entity_id: entity.id,
                    name: 'Test',
                    type: 'asset',
                    sub_type: 'checking',
                    currency: 'USD',
                    opening_balance_cents: 5000
                });
            }).toThrow(ValidationError);

            // Verify zero accounts were created in database
            const accounts = listAccounts(db, entity.id);
            expect(accounts).toHaveLength(0);
        });
    });
});
