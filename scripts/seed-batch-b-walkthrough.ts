/**
 * Seed Isolated Test Database for Batch B Walkthrough
 *
 * Why this exists:
 * Seeds `data/test_browser_vault.sqlite` with the exact initial state specified by the user:
 * - Bank Account: AUD 1,000.00 opening balance
 * - Loan Account: AUD 300.00 opening balance
 * - Dining & Supplies Expense Account for the AUD 10.23 transaction
 *
 * Live user vault `data/opennetworth.sqlite` is NEVER touched.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { runMigrations } from '../src/infrastructure/sqlite/migrations';
import { createEntity, createAccount } from '../src/lib/domain/accounting/accountService';

const TEST_VAULT_PATH = path.resolve(process.cwd(), 'data', 'test_browser_vault.sqlite');

export function seedBatchBWalkthrough() {
    console.log(`[Batch B Seed] Resetting test database at: ${TEST_VAULT_PATH}`);

    const liveVaultPath = path.resolve(process.cwd(), 'data', 'opennetworth.sqlite');
    if (path.resolve(TEST_VAULT_PATH) === liveVaultPath) {
        throw new Error('SECURITY VIOLATION: Cannot touch live vault!');
    }

    const db = new Database(TEST_VAULT_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF');

    runMigrations(db);

    // Truncate tables for a completely pristine walkthrough
    db.exec(`
        DELETE FROM proposals;
        DELETE FROM document_jobs;
        DELETE FROM documents;
        DELETE FROM csv_mappings;
        DELETE FROM transaction_corrections;
        DELETE FROM journal_entries;
        DELETE FROM transactions;
        DELETE FROM account_ownership;
        DELETE FROM accounts;
        DELETE FROM entities;
        DELETE FROM balance_observations;
        DELETE FROM drafts;
        DELETE FROM assets;
        DELETE FROM liabilities;
        DELETE FROM goals;
        DELETE FROM recurring_schedules;
        DELETE FROM net_worth_snapshots;
        DELETE FROM cash_flow_summaries;
    `);

    db.pragma('foreign_keys = ON');

    // 1. Create Walkthrough Sovereign Entity
    const entity = createEntity(db, {
        name: 'Batch B Walkthrough Entity',
        type: 'household',
        currency: 'AUD'
    });

    // 2. Bank AUD 1,000.00
    createAccount(db, {
        entity_id: entity.id,
        name: 'Walkthrough Bank Checking',
        type: 'asset',
        sub_type: 'checking',
        currency: 'AUD',
        institution: 'Commonwealth Bank',
        account_number_mask: '•••• 1000',
        opening_balance_cents: 100000, // $1,000.00 AUD
        opening_date: '2026-01-01'
    });

    // 3. Loan AUD 300.00
    createAccount(db, {
        entity_id: entity.id,
        name: 'Walkthrough Personal Loan',
        type: 'liability',
        sub_type: 'loan',
        currency: 'AUD',
        institution: 'NAB',
        account_number_mask: '•••• 0300',
        opening_balance_cents: 30000, // $300.00 AUD
        opening_date: '2026-01-01'
    });

    // 4. Expense Account for AUD 10.23 lunch/supplies
    createAccount(db, {
        entity_id: entity.id,
        name: 'Supplies & Lunch Expense',
        type: 'expense',
        sub_type: 'living_expense',
        currency: 'AUD',
        tracking_mode: 'transactions'
    });

    db.close();
    console.log('[Batch B Seed] Successfully seeded Bank AUD 1,000 and Loan AUD 300.');
}

if (require.main === module) {
    seedBatchBWalkthrough();
}
