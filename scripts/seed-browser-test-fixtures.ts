/**
 * Seed Browser-Test Fixtures
 * 
 * Why this file exists:
 * Seeds an isolated SQLite database (`data/test_browser_vault.sqlite`) with fictional
 * entities, bank accounts, and initial balances for repeatable browser-based end-to-end
 * testing. Never modifies or connects to the live user vault (`data/opennetworth.sqlite`).
 * 
 * Tricky logic:
 * - Completely unlinks and recreates `data/test_browser_vault.sqlite` so every test launch
 *   starts from a pristine, known baseline.
 * - Seeds standard fictional accounts in AUD (checking, savings, credit card) ready for
 *   bank CSV imports and receipt matching workflows.
 * 
 * TODO: Add multi-currency sample fixtures (USD / EUR) when international tests are introduced.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { initSchema } from '../src/infrastructure/sqlite/db';
import { initAccountingSchema } from '../src/lib/domain/accounting/schema';
import { createAccount, createEntity } from '../src/lib/domain/accounting/accountService';

export const TEST_VAULT_PATH = path.resolve(process.cwd(), 'data', 'test_browser_vault.sqlite');

export function seedBrowserTestFixtures(targetDbPath: string = TEST_VAULT_PATH): void {
    const dataDir = path.dirname(targetDbPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Never overwrite live vault
    const liveVaultPath = path.resolve(process.cwd(), 'data', 'opennetworth.sqlite');
    if (path.resolve(targetDbPath) === liveVaultPath) {
        throw new Error('SECURITY VIOLATION: Cannot seed fixtures directly into live vault (opennetworth.sqlite)!');
    }

    // If test database file exists, delete it for a clean baseline
    if (fs.existsSync(targetDbPath)) {
        try {
            fs.unlinkSync(targetDbPath);
        } catch {
            // If file lock is temporarily held, log and continue
        }
    }

    const db = new Database(targetDbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Initialize all schemas
    initSchema(db);
    initAccountingSchema(db);

    // Why this exists:
    // If the test server holds a Windows file lock on targetDbPath, unlinking fails.
    // Explicitly truncating all tables guarantees a 100% pristine fixture baseline on every re-seed.
    db.exec(`
        PRAGMA foreign_keys = OFF;
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
        DELETE FROM assets;
        DELETE FROM liabilities;
        DELETE FROM goals;
        DELETE FROM recurring_transactions;
        DELETE FROM net_worth_history;
        DELETE FROM cash_flow_history;
        PRAGMA foreign_keys = ON;
    `);

    // 1. Seed Fictional Sovereign Entity
    const entity = createEntity(db, {
        name: 'Fictional Family Trust',
        type: 'household',
        currency: 'AUD'
    });

    // 2. Seed Everyday Checking Account (AUD, $5,000.00 opening balance)
    createAccount(db, {
        entity_id: entity.id,
        name: 'Everyday Checking',
        type: 'asset',
        sub_type: 'checking',
        currency: 'AUD',
        institution: 'Fictional National Bank',
        account_number_mask: '•••• 4421',
        opening_balance_cents: 500000,
        opening_date: '2026-01-01'
    });

    // 3. Seed High Interest Savings Account (AUD, $12,500.00 opening balance)
    createAccount(db, {
        entity_id: entity.id,
        name: 'High Interest Savings',
        type: 'asset',
        sub_type: 'savings',
        currency: 'AUD',
        institution: 'Fictional National Bank',
        account_number_mask: '•••• 9876',
        opening_balance_cents: 1250000,
        opening_date: '2026-01-01'
    });

    // 4. Seed Platinum Rewards Credit Card (AUD, $0.00 opening balance)
    createAccount(db, {
        entity_id: entity.id,
        name: 'Platinum Rewards Card',
        type: 'liability',
        sub_type: 'credit_card',
        currency: 'AUD',
        institution: 'Fictional Card Services',
        account_number_mask: '•••• 1234',
        opening_balance_cents: 0,
        opening_date: '2026-01-01'
    });

    /**
     * Why this entity exists:
     * Seeds a business entity in the isolated test environment so that
     * the contextual "This was paid with personal funds for a business" draft
     * flow is enabled and testable without requiring manual setup.
     */
    const bizEntity = createEntity(db, {
        name: 'Acme Consulting Pty Ltd',
        type: 'business',
        currency: 'AUD'
    });

    /**
     * Why this JPY account & draft exist:
     * Seeds a JPY zero-decimal currency payment account and draft item in the isolated
     * test environment to verify the React edit/save workflow preserves 500 JPY minor units
     * without unwanted 100x scaling (5.00 -> 5 JPY).
     */
    const jpyAccount = createAccount(db, {
        entity_id: entity.id,
        name: 'Tokyo IC Card',
        type: 'liability',
        sub_type: 'credit_card',
        currency: 'JPY',
        institution: 'Pasmo Services',
        account_number_mask: '•••• 7788',
        opening_balance_cents: 10000,
        opening_date: '2026-01-01'
    }).account;

    db.prepare(`
        INSERT INTO m1_drafts (
            id, entity_id, payer_entity_id, payment_account_id, currency,
            amount_cents, date, merchant, description, reimbursement_intent, status, created_at, updated_at
        ) VALUES (
            'draft-jpy-500', ?, ?, ?, 'JPY',
            500, '2026-09-16', 'Tokyo Metro', 'Tokyo Metro Pass', 'yes', 'draft', datetime('now'), datetime('now')
        )
    `).run(bizEntity.id, entity.id, jpyAccount.id);

    db.close();
    console.log(`[Test Vault] Successfully seeded isolated test fixtures in: ${targetDbPath}`);
}

// Auto-run when executed directly via CLI
if (require.main === module || process.argv[1]?.includes('seed-browser-test-fixtures')) {
    seedBrowserTestFixtures();
}
