/**
 * Seed Browser Test Vault for Batch B Remediation Visual Walkthrough
 * 
 * Why this file exists:
 * Sets up `data/test_browser_vault.sqlite` with the exact test scenarios for all 4 remediation areas:
 * 1. JPY 10,000 asset and liability (¥10,000 display, zero decimal currency scaling).
 * 2. AUD 989.77 asset and liability (A$989.77 standard minor currency scaling).
 * 3. AUD 75,000 balance-only liquid bank account (tests honest cash flow reporting, known observed balance, no false reconciliation).
 * 4. Deduplicated vs distinct same-named items between modern ledger and legacy vault.
 * 
 * Tricky logic:
 * Targets exclusively `data/test_browser_vault.sqlite`. Live vault `data/opennetworth.sqlite` is NEVER touched.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { initSchema } from '../src/infrastructure/sqlite/db';
import { initAccountingSchema } from '../src/lib/domain/accounting/schema';
import { createEntity, createAccount } from '../src/lib/domain/accounting/accountService';
import { recordBalanceObservation } from '../src/lib/domain/accounting/balanceObservationService';

const TEST_VAULT_PATH = path.resolve(process.cwd(), 'data', 'test_browser_vault.sqlite');

export function seedBatchBRemediation() {
    console.log(`[Batch B Remediation Seed] Seeding browser test database at: ${TEST_VAULT_PATH}`);

    const liveVaultPath = path.resolve(process.cwd(), 'data', 'opennetworth.sqlite');
    if (path.resolve(TEST_VAULT_PATH) === liveVaultPath) {
        throw new Error('SECURITY VIOLATION: Cannot touch live vault!');
    }

    const db = new Database(TEST_VAULT_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = OFF');

    initSchema(db);
    initAccountingSchema(db);

    // Clean test tables
    db.exec(`
        DELETE FROM m1_proposals;
        DELETE FROM m1_document_jobs;
        DELETE FROM m1_documents;
        DELETE FROM m1_csv_mappings;
        DELETE FROM m1_transaction_corrections;
        DELETE FROM m1_journal_entries;
        DELETE FROM m1_transactions;
        DELETE FROM m1_account_ownership;
        DELETE FROM m1_accounts;
        DELETE FROM m1_entities;
        DELETE FROM m1_balance_observations;
        DELETE FROM m1_drafts;
        DELETE FROM assets;
        DELETE FROM liabilities;
        DELETE FROM goals;
        DELETE FROM recurring_transactions;
        DELETE FROM net_worth_history;
        DELETE FROM cash_flow_history;
    `);

    db.pragma('foreign_keys = ON');

    // 1. Create Sovereign Entity
    const entity = createEntity(db, {
        name: 'Remediation Test Household',
        type: 'household',
        currency: 'AUD'
    });

    // 2. JPY 10,000 Asset (Tokyo Savings)
    const { account: jpyAsset } = createAccount(db, {
        entity_id: entity.id,
        name: 'Tokyo Savings',
        type: 'asset',
        sub_type: 'savings',
        currency: 'JPY',
        institution: 'Bank of Tokyo',
        opening_balance_cents: 10000, // 10,000 JPY
        opening_date: '2026-09-01'
    });

    // 3. JPY 10,000 Liability (Tokyo Travel Loan)
    const { account: jpyLiability } = createAccount(db, {
        entity_id: entity.id,
        name: 'Tokyo Travel Loan',
        type: 'liability',
        sub_type: 'loan',
        currency: 'JPY',
        institution: 'Tokyo Consumer Finance',
        opening_balance_cents: 10000, // 10,000 JPY
        opening_date: '2026-09-01'
    });

    // 4. AUD 989.77 Asset (Sydney Everyday)
    const { account: audAsset } = createAccount(db, {
        entity_id: entity.id,
        name: 'Sydney Everyday',
        type: 'asset',
        sub_type: 'checking',
        currency: 'AUD',
        institution: 'Commonwealth Bank',
        opening_balance_cents: 98977, // A$989.77
        opening_date: '2026-09-01'
    });

    // 5. AUD 989.77 Liability (Melbourne Card)
    const { account: audLiability } = createAccount(db, {
        entity_id: entity.id,
        name: 'Melbourne Card',
        type: 'liability',
        sub_type: 'credit_card',
        currency: 'AUD',
        institution: 'NAB',
        opening_balance_cents: 98977, // A$989.77
        opening_date: '2026-09-01'
    });

    // 6. AUD 75,000 Balance-Only Checking Account (NAB Classic Reserve)
    const { account: balanceOnlyAcc } = createAccount(db, {
        entity_id: entity.id,
        name: 'NAB Classic Reserve (Balance Only)',
        type: 'asset',
        sub_type: 'checking',
        currency: 'AUD',
        institution: 'NAB',
        tracking_mode: 'balance'
    });

    recordBalanceObservation(db, {
        account_id: balanceOnlyAcc.id,
        amount_cents: 7500000, // A$75,000.00
        currency: 'AUD',
        effective_date: '2026-09-15',
        balance_kind: 'statement_closing_balance',
        source_type: 'manual',
        review_status: 'accepted'
    });

    // 7. AUD Unobserved Checking Account (Westpac Spare Cash)
    createAccount(db, {
        entity_id: entity.id,
        name: 'Westpac Spare Cash (Unobserved)',
        type: 'asset',
        sub_type: 'savings',
        currency: 'AUD',
        institution: 'Westpac',
        tracking_mode: 'balance'
    });

    // 8. Legacy unlinked items to demonstrate deduplication and native subtotals
    // Distinct unlinked item with the SAME name "Melbourne Card" (MUST NOT be deduplicated by name alone!)
    db.prepare(`
        INSERT INTO liabilities (id, user_id, name, type, balance, currency, interest_rate, is_good_debt, last_updated)
        VALUES (?, 'local_user', 'Melbourne Card', 'credit_card', 450.00, 'AUD', 15.00, 0, '2026-09-01')
    `).run(crypto.randomUUID());

    // Multi-currency unlinked legacy assets
    db.prepare(`
        INSERT INTO assets (id, user_id, name, type, value, currency, interest_rate, last_updated)
        VALUES (?, 'local_user', 'US Tech ETF', 'investment', 2000.00, 'USD', 0, '2026-09-01')
    `).run(crypto.randomUUID());

    db.prepare(`
        INSERT INTO assets (id, user_id, name, type, value, currency, interest_rate, last_updated)
        VALUES (?, 'local_user', 'Euro Blue Chip', 'investment', 1500.00, 'EUR', 0, '2026-09-01')
    `).run(crypto.randomUUID());

    db.close();
    console.log('[Batch B Remediation Seed] Seeding complete! All test fixtures ready.');
}

if (require.main === module) {
    seedBatchBRemediation();
}
