import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { initAccountingSchema } from '../src/lib/domain/accounting/schema';
import { createEntity, createAccount } from '../src/lib/domain/accounting/accountService';
import { postTransaction } from '../src/lib/domain/accounting/transactionService';
import { saveDraft } from '../src/lib/domain/accounting/draftService';
import { processPersonallyPaidBusinessExpense } from '../src/features/reimbursement/reimbursementService';
import { getAccountBalance } from '../src/lib/domain/accounting/balanceService';

const demoDbPath = path.resolve('data', 'test_demo_vault.sqlite');
if (fs.existsSync(demoDbPath)) {
    fs.unlinkSync(demoDbPath);
}

const db = new Database(demoDbPath);
db.pragma('foreign_keys = ON');
initAccountingSchema(db);

const personal = createEntity(db, { name: 'Household', type: 'household', currency: 'AUD' });
const business = createEntity(db, { name: 'Acme Pty Ltd', type: 'business', currency: 'AUD' });

const personalBank = createAccount(db, {
    entity_id: personal.id,
    name: 'Personal Checking',
    type: 'asset',
    sub_type: 'checking',
    currency: 'AUD',
    tracking_mode: 'transactions',
    opening_balance_cents: 100000,
    opening_date: '2025-01-01'
}).account;

const businessBank = createAccount(db, {
    entity_id: business.id,
    name: 'Business Checking',
    type: 'asset',
    sub_type: 'checking',
    currency: 'AUD',
    tracking_mode: 'transactions',
    opening_balance_cents: 50000,
    opening_date: '2025-01-01'
}).account;

const officeSupplies = createAccount(db, {
    entity_id: business.id,
    name: 'Office Supplies',
    type: 'expense',
    sub_type: 'other',
    currency: 'AUD',
    tracking_mode: 'transactions'
}).account;

const pSuspense = createAccount(db, { entity_id: personal.id, name: 'Personal Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account;
const bSuspense = createAccount(db, { entity_id: business.id, name: 'Business Suspense', type: 'expense', sub_type: 'other', currency: 'AUD', tracking_mode: 'transactions' }).account;

const draft = saveDraft(db, {
    payer_entity_id: personal.id,
    entity_id: business.id,
    amount_cents: 11000,
    currency: 'AUD',
    date: '2025-01-02',
    merchant: 'Officeworks',
    description: 'Printer ink (Personally Paid)',
    reimbursement_intent: 'yes'
});

const wf = processPersonallyPaidBusinessExpense(db, {
    personalEntityId: personal.id,
    businessEntityId: business.id,
    currency: 'AUD',
    amountCents: 11000,
    date: '2025-01-02',
    merchant: 'Officeworks',
    description: 'Printer ink (Personally Paid)',
    sourceType: 'draft',
    sourceId: draft.id,
    paymentAccountId: personalBank.id,
    businessExpenseAccountId: officeSupplies.id,
    performedBy: 'Owner'
});

postTransaction(db, {
    date: '2025-01-10',
    description: 'Transfer from Acme Pty Ltd',
    payee_or_payer: 'Acme Pty Ltd',
    origin: 'document_extraction',
    postings: [
        { account_id: personalBank.id, amount_cents: 11000, currency: 'AUD' },
        { account_id: pSuspense.id, amount_cents: -11000, currency: 'AUD' }
    ]
});

postTransaction(db, {
    date: '2025-01-09',
    description: 'Reimbursement to Owner',
    payee_or_payer: 'Household',
    origin: 'document_extraction',
    postings: [
        { account_id: bSuspense.id, amount_cents: 11000, currency: 'AUD' },
        { account_id: businessBank.id, amount_cents: -11000, currency: 'AUD' }
    ]
});

const pBal = getAccountBalance(db, personalBank.id, '2025-01-15').balance_cents;
const bBal = getAccountBalance(db, businessBank.id, '2025-01-15').balance_cents;
console.log('Seeded demo database at data/test_demo_vault.sqlite');
console.log(`Initial Balances: Personal = AUD ${pBal / 100}, Business = AUD ${bBal / 100}`);
db.close();
