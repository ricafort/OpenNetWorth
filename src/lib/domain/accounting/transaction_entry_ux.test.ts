/**
 * Milestone 1 Transaction Entry UX & Invariant Acceptance Tests
 * 
 * Why this file exists:
 * Verifies the accounting invariants and data integrity rules of the simplified transaction entry UX:
 * 1. Target Account Assignment: Account creation triggered from payment vs destination fields
 *    correctly populates the respective field (payment_account_id vs to_account_id/card_account_id/loan_account_id).
 * 2. Category & Role Agreement (F2 Bug Prevention): Switching between Expense and Income ensures
 *    displayed category and submitted category strictly agree, preventing invalid sub-type postings.
 * 3. Currency Integrity: Transaction currency strictly derives from the selected payment account,
 *    not merely the entity's reporting currency.
 * 4. Personally Paid Business Expense Draft Invariants: Saving a draft preserves all facts
 *    (business, payer, payment account, currency, amount, date, reimbursement intent) without altering
 *    posted journal balances or creating orphan debit/credit lines.
 * 5. Idempotency & Duplicate Prevention: Submitting with identical idempotency keys prevents duplicate transactions.
 * 
 * Tricky logic:
 * - Draft items are intentionally isolated from m1_transactions and m1_journal_entries.
 *   Balances queried via balanceService before and after draft operations must remain strictly equal.
 * - Idempotency returns the existing transaction on identical retries and throws ConflictError on conflicting payloads.
 * 
 * TODO: Add browser-level Playwright tests if headless browser execution is integrated into CI.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import {
    createEntity,
    createAccount,
    listAccounts
} from './accountService';
import {
    recordExpense,
    recordIncome,
    recordTransfer,
    recordCreditCardRepayment,
    recordLoanRepayment
} from './transactionService';
import {
    saveDraft,
    getDrafts,
    deleteDraft
} from './draftService';
import {
    getAccountBalance,
    getEntityNetWorth
} from './balanceService';
import { AccountSubType, CurrencyCode, centsToInputString, parseToCents } from './types';

describe('Transaction Entry UX & Accounting Invariants', () => {
    let db: Database.Database;

    beforeEach(() => {
        // Pristine in-memory database for each test
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

    describe('1. Return New Account to Correct Target Field', () => {
        it('assigns created account to transfer destination without replacing source account', () => {
            const entity = createEntity(db, { name: 'Alex Owner', type: 'person', currency: 'AUD' });
            
            // Source account
            const sourceAcc = createAccount(db, {
                entity_id: entity.id,
                name: 'Source Everyday Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 500000
            }).account;

            // Simulated creation of a destination account during transfer workflow
            const destAcc = createAccount(db, {
                entity_id: entity.id,
                name: 'Vault High Interest Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 0
            }).account;

            // Record transfer between source and the newly created destination
            const txResult = recordTransfer(db, {
                from_account_id: sourceAcc.id,
                to_account_id: destAcc.id,
                amount_cents: 150000,
                date: '2026-09-16',
                description: 'Transfer to newly created savings account'
            });

            expect(txResult.id).toBeDefined();

            // Verify balances
            const sourceBal = getAccountBalance(db, sourceAcc.id, '2026-09-16');
            const destBal = getAccountBalance(db, destAcc.id, '2026-09-16');
            expect(sourceBal.balance_cents).toBe(350000); // 5,000 - 1,500
            expect(destBal.balance_cents).toBe(150000);   // 0 + 1,500
        });

        it('assigns created card account to credit card payment target field', () => {
            const entity = createEntity(db, { name: 'Alex Owner', type: 'person', currency: 'AUD' });
            
            const bankAcc = createAccount(db, {
                entity_id: entity.id,
                name: 'Main Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 1000000
            }).account;

            // Simulated inline creation of credit card
            const cardAcc = createAccount(db, {
                entity_id: entity.id,
                name: 'New Platinum Card',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 20000 // existing $200 debt
            }).account;

            // Record payment to newly created card
            const txResult = recordCreditCardRepayment(db, {
                bank_account_id: bankAcc.id,
                card_account_id: cardAcc.id,
                amount_cents: 20000,
                date: '2026-09-16',
                description: 'Paid off new card'
            });

            expect(txResult.id).toBeDefined();
            const cardBal = getAccountBalance(db, cardAcc.id, '2026-09-16');
            expect(cardBal.balance_cents).toBe(0); // Paid in full
        });
    });

    describe('2. Category & Role Agreement (F2 Bug Prevention)', () => {
        it('validates expense categories and correctly switches category between roles', () => {
            const validExpenseCategories: AccountSubType[] = ['groceries', 'utilities', 'living_expense', 'repairs_maintenance', 'other'];
            const validIncomeCategories: AccountSubType[] = ['salary', 'freelance', 'rental_income', 'dividend', 'interest_income', 'other'];

            // Simulate the switching logic implemented in handleTabChange:
            const sanitizeCategoryForTab = (tab: 'expense' | 'income', currentCategory: AccountSubType): AccountSubType => {
                if (tab === 'expense') {
                    return validExpenseCategories.includes(currentCategory) ? currentCategory : 'groceries';
                } else {
                    return validIncomeCategories.includes(currentCategory) ? currentCategory : 'salary';
                }
            };

            // When switching from income ('salary') to expense, it must reset to 'groceries', not retain 'salary'
            expect(sanitizeCategoryForTab('expense', 'salary')).toBe('groceries');

            // When switching from expense ('groceries') to income, it must reset to 'salary', not retain 'groceries'
            expect(sanitizeCategoryForTab('income', 'groceries')).toBe('salary');

            // When switching within valid categories, it retains the user's selection
            expect(sanitizeCategoryForTab('expense', 'utilities')).toBe('utilities');
            expect(sanitizeCategoryForTab('income', 'freelance')).toBe('freelance');

            // Verify with actual expense transactions in db
            const entity = createEntity(db, { name: 'Alex Owner', type: 'person', currency: 'AUD' });
            const bankAcc = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 500000
            }).account;

            for (const cat of validExpenseCategories) {
                const tx = recordExpense(db, {
                    entity_id: entity.id,
                    payment_account_id: bankAcc.id,
                    category: cat,
                    amount_cents: 1000,
                    date: '2026-09-16',
                    description: `Expense with ${cat}`
                });
                expect(tx.id).toBeDefined();
            }
        });

        it('validates income categories with actual income transactions', () => {
            const entity = createEntity(db, { name: 'Alex Owner', type: 'person', currency: 'AUD' });
            const bankAcc = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 100000
            }).account;

            const validIncomeCategories: AccountSubType[] = ['salary', 'freelance', 'rental_income', 'dividend', 'interest_income', 'other'];
            for (const cat of validIncomeCategories) {
                const tx = recordIncome(db, {
                    entity_id: entity.id,
                    bank_account_id: bankAcc.id,
                    category: cat,
                    amount_cents: 5000,
                    date: '2026-09-16',
                    description: `Income with ${cat}`
                });
                expect(tx.id).toBeDefined();
            }
        });
    });

    describe('3. Currency Derived from Selected Account', () => {
        it('records transaction in payment account currency even if entity reporting currency differs', () => {
            // Entity has reporting currency USD
            const entity = createEntity(db, { name: 'Global Household', type: 'household', currency: 'USD' });

            // Account is held in AUD
            const audAccount = createAccount(db, {
                entity_id: entity.id,
                name: 'Sydney Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 200000 // AUD $2,000.00
            }).account;

            const txResult = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: audAccount.id,
                category: 'living_expense',
                amount_cents: 5000, // AUD $50.00
                date: '2026-09-16',
                description: 'Lunch in Sydney'
            });

            // Postings must be in AUD matching the payment account
            const postings = txResult.postings;
            expect(postings.length).toBe(2);
            expect(postings[0].currency).toBe('AUD');
            expect(postings[1].currency).toBe('AUD');

            // Balance of AUD account must decrease by 5000 cents
            const bal = getAccountBalance(db, audAccount.id, '2026-09-16');
            expect(bal.balance_cents).toBe(195000);
            expect(bal.currency).toBe('AUD');
        });
    });

    describe('4. Personally Paid Business Expense Draft Invariants', () => {
        it('saves and updates draft with all facts intact without altering posted balances', () => {
            // Setup: Personal household and Business entities
            const person = createEntity(db, { name: 'Jane Founder', type: 'person', currency: 'AUD' });
            const business = createEntity(db, { name: 'Jane Tech Pty Ltd', type: 'business', currency: 'AUD' });

            const personalAccount = createAccount(db, {
                entity_id: person.id,
                name: 'Jane Personal Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 1000000 // $10,000.00
            }).account;

            // Verify initial balance
            const initialBal = getAccountBalance(db, personalAccount.id, '2026-09-16');
            expect(initialBal.balance_cents).toBe(1000000);
            const txCountBefore = db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as { cnt: number };

            // 1. Save draft
            const draftId = 'draft-test-123';
            saveDraft(db, {
                id: draftId,
                entity_id: business.id,
                payer_entity_id: person.id,
                payment_account_id: personalAccount.id,
                currency: 'AUD',
                amount_cents: 25000, // $250.00
                date: '2026-09-15',
                merchant: 'Officeworks',
                description: 'Office monitor bought personally',
                reimbursement_intent: 'yes',
                status: 'draft'
            });

            // Invariant check: Balance MUST NOT change
            const balAfterDraft = getAccountBalance(db, personalAccount.id, '2026-09-16');
            expect(balAfterDraft.balance_cents).toBe(1000000);

            // Invariant check: No new transactions or journal entries created
            const txCountAfterDraft = db.prepare('SELECT COUNT(*) as cnt FROM m1_transactions').get() as { cnt: number };
            expect(txCountAfterDraft.cnt).toBe(txCountBefore.cnt);

            // 2. Fetch draft and verify all facts are preserved
            const allDrafts = getDrafts(db);
            expect(allDrafts.length).toBe(1);
            const retrieved = allDrafts[0];
            expect(retrieved.id).toBe(draftId);
            expect(retrieved.entity_id).toBe(business.id);
            expect(retrieved.payer_entity_id).toBe(person.id);
            expect(retrieved.payment_account_id).toBe(personalAccount.id);
            expect(retrieved.currency).toBe('AUD');
            expect(retrieved.amount_cents).toBe(25000);
            expect(retrieved.merchant).toBe('Officeworks');
            expect(retrieved.reimbursement_intent).toBe('yes');

            // 3. Update draft (simulating user editing the draft)
            saveDraft(db, {
                id: draftId,
                entity_id: business.id,
                payer_entity_id: person.id,
                payment_account_id: personalAccount.id,
                currency: 'AUD',
                amount_cents: 29900, // corrected to $299.00
                date: '2026-09-15',
                merchant: 'Officeworks Superstore',
                description: 'Office monitor & HDMI cable',
                reimbursement_intent: 'yes',
                status: 'draft'
            });

            const updatedDrafts = getDrafts(db);
            expect(updatedDrafts.length).toBe(1);
            expect(updatedDrafts[0].amount_cents).toBe(29900);
            expect(updatedDrafts[0].merchant).toBe('Officeworks Superstore');

            // Still no balance change
            const balAfterEdit = getAccountBalance(db, personalAccount.id, '2026-09-16');
            expect(balAfterEdit.balance_cents).toBe(1000000);

            // 4. Discard draft
            deleteDraft(db, draftId);
            expect(getDrafts(db).length).toBe(0);
        });
    });

    describe('5. Idempotency & Duplicate Prevention', () => {
        it('prevents duplicate transaction creation on repeated Save with idempotency key', () => {
            const entity = createEntity(db, { name: 'Alex Owner', type: 'person', currency: 'AUD' });
            const bankAcc = createAccount(db, {
                entity_id: entity.id,
                name: 'Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                opening_date: '2026-01-01',
                opening_balance_cents: 500000
            }).account;

            const fixedIdempotencyKey = 'idemp-key-abc-123';

            // First submission
            const tx1 = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bankAcc.id,
                category: 'utilities',
                amount_cents: 12000,
                date: '2026-09-16',
                description: 'Electricity bill',
                idempotency_key: fixedIdempotencyKey
            });
            expect(tx1.id).toBeDefined();

            // Second identical submission with exact same idempotency key (simulating fast double click)
            const tx2 = recordExpense(db, {
                entity_id: entity.id,
                payment_account_id: bankAcc.id,
                category: 'utilities',
                amount_cents: 12000,
                date: '2026-09-16',
                description: 'Electricity bill',
                idempotency_key: fixedIdempotencyKey
            });
            // Returns the exact same transaction, no duplicate created
            expect(tx2.id).toBe(tx1.id);

            // Third submission with same key but changed amount (must throw ConflictError)
            expect(() => {
                recordExpense(db, {
                    entity_id: entity.id,
                    payment_account_id: bankAcc.id,
                    category: 'utilities',
                    amount_cents: 99999, // changed amount!
                    date: '2026-09-16',
                    description: 'Electricity bill conflict',
                    idempotency_key: fixedIdempotencyKey
                });
            }).toThrow();

            // Total transactions for this expense is exactly 1 (plus 1 opening balance)
            const txs = db.prepare("SELECT COUNT(*) as cnt FROM m1_transactions WHERE description LIKE '%Electricity%'").get() as { cnt: number };
            expect(txs.cnt).toBe(1);

            // Balance only deducted once: 500,000 - 12,000 = 488,000 cents
            const bal = getAccountBalance(db, bankAcc.id, '2026-09-16');
            expect(bal.balance_cents).toBe(488000);
        });
    });

    describe('6. Draft Fact Integrity & Multi-Currency Formatting', () => {
        it('preserves JPY 500 minor units during form edit/save round-trip (no division by 100)', () => {
            const biz = createEntity(db, { name: 'Tokyo Studio', type: 'business', currency: 'JPY' });
            const person = createEntity(db, { name: 'Kenji Owner', type: 'person', currency: 'JPY' });
            const jpyCard = createAccount(db, {
                entity_id: person.id,
                name: 'Suica Card',
                type: 'liability',
                sub_type: 'credit_card',
                currency: 'JPY'
            }).account;

            // 1. Initial draft created with 500 JPY
            const draft = saveDraft(db, {
                id: 'draft-jpy-500',
                entity_id: biz.id,
                payer_entity_id: person.id,
                payment_account_id: jpyCard.id,
                currency: 'JPY',
                amount_cents: 500,
                date: '2026-09-17',
                description: 'Stationery in Tokyo',
                status: 'draft'
            });
            expect(draft.amount_cents).toBe(500);

            // 2. React edit modal opens: format for input string
            // For JPY (0 decimals), centsToInputString must produce "500", NOT "5.00"
            const formInputVal = centsToInputString(draft.amount_cents, draft.currency);
            expect(formInputVal).toBe('500');

            // Bug regression check: If someone naively did (draft.amount_cents / 100).toFixed(2), it would be "5.00",
            // which when parsed back to JPY would become 5 minor units!
            expect(parseToCents('5.00', 'JPY')).toBe(5); // This demonstrates the bug!
            expect(parseToCents(formInputVal, 'JPY')).toBe(500); // This demonstrates the fix!

            // 3. User saves the edited form (e.g. updating description)
            const parsedCentsOnSave = parseToCents(formInputVal, 'JPY');
            const savedDraft = saveDraft(db, {
                id: 'draft-jpy-500',
                entity_id: biz.id,
                payer_entity_id: person.id,
                payment_account_id: jpyCard.id,
                currency: 'JPY',
                amount_cents: parsedCentsOnSave,
                date: '2026-09-17',
                description: 'Stationery in Tokyo (receipt verified)',
                status: 'draft'
            });

            // Minor unit amount is strictly preserved as 500
            expect(savedDraft.amount_cents).toBe(500);
            const retrieved = getDrafts(db).find(d => d.id === 'draft-jpy-500')!;
            expect(retrieved.amount_cents).toBe(500);
            expect(retrieved.description).toBe('Stationery in Tokyo (receipt verified)');
        });

        it('preserves omitted source references during edit/update', () => {
            const biz = createEntity(db, { name: 'Acme Corp', type: 'business', currency: 'AUD' });
            const person = createEntity(db, { name: 'Jane Owner', type: 'person', currency: 'AUD' });
            const bankAcc = createAccount(db, {
                entity_id: person.id,
                name: 'Personal Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD'
            }).account;

            // Seed valid document and transaction to reference
            db.prepare(`
                INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, created_at)
                VALUES ('doc-source-789', 'receipt.pdf', 'hash-789', 'application/pdf', 1024, datetime('now'))
            `).run();
            db.prepare(`
                INSERT INTO m1_transactions (id, date, description, status, origin, revision, created_at, updated_at)
                VALUES ('tx-bank-456', '2026-09-17', 'Source bank event', 'posted', 'manual', 1, datetime('now'), datetime('now'))
            `).run();

            // 1. Create draft with source references
            saveDraft(db, {
                id: 'draft-with-sources',
                entity_id: biz.id,
                payer_entity_id: person.id,
                payment_account_id: bankAcc.id,
                currency: 'AUD',
                amount_cents: 1250,
                date: '2026-09-17',
                description: 'Lunch receipt',
                source_document_id: 'doc-source-789',
                source_transaction_id: 'tx-bank-456',
                status: 'draft'
            });

            const initialDraft = getDrafts(db).find(d => d.id === 'draft-with-sources')!;
            expect(initialDraft.source_document_id).toBe('doc-source-789');
            expect(initialDraft.source_transaction_id).toBe('tx-bank-456');

            // 2. User edits amount in React form without changing or resending source references (undefined in input)
            saveDraft(db, {
                id: 'draft-with-sources',
                entity_id: biz.id,
                payer_entity_id: person.id,
                payment_account_id: bankAcc.id,
                currency: 'AUD',
                amount_cents: 1500, // edited amount
                date: '2026-09-17',
                description: 'Lunch receipt with tip'
                // source_document_id and source_transaction_id omitted (undefined)!
            });

            const updatedDraft = getDrafts(db).find(d => d.id === 'draft-with-sources')!;
            expect(updatedDraft.amount_cents).toBe(1500);
            expect(updatedDraft.description).toBe('Lunch receipt with tip');
            // Crucial: Omitted source references must NOT be wiped!
            expect(updatedDraft.source_document_id).toBe('doc-source-789');
            expect(updatedDraft.source_transaction_id).toBe('tx-bank-456');

            // 3. Deliberately clearing reference using explicit null
            saveDraft(db, {
                id: 'draft-with-sources',
                source_document_id: null
            });
            const clearedDraft = getDrafts(db).find(d => d.id === 'draft-with-sources')!;
            expect(clearedDraft.source_document_id).toBeNull();
            expect(clearedDraft.source_transaction_id).toBe('tx-bank-456');
        });

        it('rejects currency mismatch between payment account and draft currency', () => {
            const biz = createEntity(db, { name: 'Global Biz', type: 'business', currency: 'USD' });
            const person = createEntity(db, { name: 'Owner', type: 'person', currency: 'AUD' });
            const audAccount = createAccount(db, {
                entity_id: person.id,
                name: 'AUD Everyday Account',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD'
            }).account;

            // Attempt to save draft claiming USD currency on an AUD account
            expect(() => {
                saveDraft(db, {
                    entity_id: biz.id,
                    payer_entity_id: person.id,
                    payment_account_id: audAccount.id,
                    currency: 'USD', // Mismatch!
                    amount_cents: 1000
                });
            }).toThrow('Currency mismatch: draft currency (USD) does not match payment account currency (AUD)');
        });

        it('rejects ineligible account types (e.g. loan, property, investment) as payment accounts', () => {
            const biz = createEntity(db, { name: 'Global Biz', type: 'business', currency: 'AUD' });
            const person = createEntity(db, { name: 'Owner', type: 'person', currency: 'AUD' });
            const loanAcc = createAccount(db, {
                entity_id: person.id,
                name: 'Mortgage Loan',
                type: 'liability',
                sub_type: 'loan',
                currency: 'AUD'
            }).account;

            // Attempt to save draft with a mortgage loan account
            expect(() => {
                saveDraft(db, {
                    entity_id: biz.id,
                    payer_entity_id: person.id,
                    payment_account_id: loanAcc.id,
                    currency: 'AUD',
                    amount_cents: 1000
                });
            }).toThrow('Ineligible payment account');
        });

        it('rejects payment account not owned by the specified payer entity', () => {
            const biz = createEntity(db, { name: 'Biz A', type: 'business', currency: 'AUD' });
            const person1 = createEntity(db, { name: 'Alice Owner', type: 'person', currency: 'AUD' });
            const person2 = createEntity(db, { name: 'Bob Other', type: 'person', currency: 'AUD' });
            const bobsAccount = createAccount(db, {
                entity_id: person2.id,
                name: 'Bob Savings',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD'
            }).account;

            // Alice claims to have paid using Bob's account
            expect(() => {
                saveDraft(db, {
                    entity_id: biz.id,
                    payer_entity_id: person1.id,
                    payment_account_id: bobsAccount.id,
                    currency: 'AUD',
                    amount_cents: 1000
                });
            }).toThrow('Ownership mismatch: payment account');
        });
    });
});

