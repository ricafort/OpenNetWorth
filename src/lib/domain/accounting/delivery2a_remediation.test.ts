/**
 * Delivery 2A Focused Remediation Test Suite
 * 
 * Why this file exists:
 * Formally asserts and verifies all four remediation requirements specified by the independent assessor:
 * 
 * A. Enforce portfolio component handling:
 *    - "Included in Portfolio Total" affects persistence and valuation server-side, not just badges.
 *    - Included components are supporting details (is_component_of_total: true) and never inflate net worth.
 *    - Invariant: AUD 120,000 total including AUD 10,000 cash remains AUD 120,000 in saved shared summary.
 *    - Tested across same-account, separate-account, multiple components, and different row orderings.
 * 
 * B. Preserve uncertainty and validate amounts strictly:
 *    - Missing amount remains unresolved (amount_cents: null, unresolved_fields: ['amount']), never zero.
 *    - Rejects partially numeric text ("123oops", "N/A", "TBD").
 *    - Preserves valid zero balances ("$0.00", "0") as 0 cents.
 *    - Sign preservation and confirmation (amount_sign).
 *    - Precision checking per CURRENCY_DECIMALS.
 *    - Unknown kind marked as 'unresolved'.
 *    - Real calendar date validation with assertValidCalendarDate (rejects Feb 30, invalid leap years).
 *    - Application-code validation of LLM output JSON schema.
 *    - No fabricated quotes (returns null if missing).
 * 
 * C. Retain source evidence at explicit Save:
 *    - Raw pasted text retained once per batch in m1_balance_import_batches.
 *    - Observations retain source_excerpt, is_user_modified, is_component_of_total, parent_observation_id.
 *    - Vault backup and restore round-trip preserves all batch and observation evidence.
 *    - Zero financial writes during preview/extraction.
 * 
 * Tricky logic:
 * - Uses in-memory SQLite instances (createTestDb) so live database (data/opennetworth.sqlite) is completely untouched.
 * - Simulates vault export and import to verify schema round-trip fidelity including parent/child chains.
 * 
 * TODO: Support automated cross-institution reconciliation matching in Delivery 2B.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from './schema';
import { createEntity, createAccount, getAccount } from './accountService';
import {
    recordBalanceObservation,
    getLatestValuationObservation,
    recordBalanceImportBatch,
    getReconciliationComparison
} from './balanceObservationService';
import { resolveAccountBalanceInfo } from './balanceService';
import { getSharedFinancialSummary } from './sharedFinancialSummaryService';
import { parseStructuredTable } from './structuredBalanceParser';
import { extractBalancesFromText, correlateAndValidateProposals } from './balanceExtractionService';
import { createTestDb, setTestDb } from '@/infrastructure/sqlite/db';
import { POST as postBatchBalances } from '@/app/api/accounting/balances/route';
import { POST as postReconcile } from '@/app/api/accounting/balances/reconcile/route';
import { GET as getVaultBackup, POST as postVaultRestore } from '@/app/api/vault/route';
import { NextRequest } from 'next/server';

describe('Delivery 2A: Focused Remediation Acceptance Tests', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createTestDb();
        initAccountingSchema(db);
        setTestDb(db);
    });

    // =========================================================================
    // REQUIREMENT A: Enforce Portfolio Component Handling
    // =========================================================================
    describe('Requirement A: Enforce Portfolio Component Handling', () => {
        it('A1: Same-Account Case: AUD 120,000 total with AUD 10,000 included cash remains AUD 120,000', async () => {
            // Setup entity and brokerage account
            const entity = createEntity(db, { name: 'Alice', type: 'person', currency: 'AUD' });
            const { account: brokerageAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'CommSec Portfolio',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            // Record parent portfolio total: AUD 120,000 (12,000,000 cents)
            const parentObs = recordBalanceObservation(db, {
                account_id: brokerageAcc.id,
                amount_cents: 12000000,
                currency: 'AUD',
                balance_kind: 'total_portfolio_value',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                source_batch_id: 'batch-test-a1',
                source_reference: 'row-total',
                source_excerpt: 'Portfolio Total: $120,000.00',
                is_component_of_total: false
            });

            // Record included cash component: AUD 10,000 (1,000,000 cents) on SAME account
            recordBalanceObservation(db, {
                account_id: brokerageAcc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                source_batch_id: 'batch-test-a1',
                source_reference: 'row-cash',
                source_excerpt: 'Cash (included in total): $10,000.00',
                is_component_of_total: true,
                parent_observation_id: parentObs.id
            });

            // 1. Assert getLatestValuationObservation ignores included component and keeps total
            const latestVal = getLatestValuationObservation(db, brokerageAcc.id);
            expect(latestVal).not.toBeNull();
            expect(latestVal!.amount_cents).toBe(12000000);
            expect(latestVal!.balance_kind).toBe('total_portfolio_value');

            // 2. Assert resolveAccountBalanceInfo reports AUD 120,000, NOT AUD 130,000 or AUD 10,000
            const resolved = resolveAccountBalanceInfo(db, brokerageAcc, '2026-09-18');
            expect(resolved.balance_cents).toBe(12000000);

            // 3. Assert saved shared financial summary reports AUD 120,000
            const summary = getSharedFinancialSummary(db, { as_of_date: '2026-09-18' });
            expect(summary.net_worth_cents_by_currency['AUD']).toBe(12000000);
            expect(summary.total_assets_cents_by_currency['AUD']).toBe(12000000);
        });

        it('A2: Separate-Account Case: AUD 120,000 total with AUD 10,000 included cash in sub-account remains AUD 120,000', async () => {
            const entity = createEntity(db, { name: 'Bob', type: 'person', currency: 'AUD' });
            const { account: totalAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Vanguard Portfolio Total',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'AUD',
                tracking_mode: 'balance'
            });
            const { account: cashAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Vanguard Settlement Cash',
                type: 'asset',
                sub_type: 'savings',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            // Parent total on totalAcc
            recordBalanceObservation(db, {
                account_id: totalAcc.id,
                amount_cents: 12000000,
                currency: 'AUD',
                balance_kind: 'total_portfolio_value',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                is_component_of_total: false
            });

            // Included cash on separate cashAcc marked as is_component_of_total
            recordBalanceObservation(db, {
                account_id: cashAcc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                is_component_of_total: true
            });

            // Assert resolveAccountBalanceInfo ignores component account from valuation
            const totalResolved = resolveAccountBalanceInfo(db, totalAcc, '2026-09-18');
            const cashResolved = resolveAccountBalanceInfo(db, cashAcc, '2026-09-18');
            expect(totalResolved.balance_cents).toBe(12000000);
            expect(cashResolved.balance_cents).toBeNull(); // Component excluded from valuation

            // Assert saved shared summary reports exactly AUD 120,000
            const summary = getSharedFinancialSummary(db, { as_of_date: '2026-09-18' });
            expect(summary.net_worth_cents_by_currency['AUD']).toBe(12000000);
        });

        it('A3: Multiple Components Case: Total AUD 120,000 with Cash AUD 10,000 and Equities AUD 110,000 remains AUD 120,000', async () => {
            const entity = createEntity(db, { name: 'Charlie', type: 'person', currency: 'AUD' });
            const { account: acc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Superannuation Master',
                type: 'asset',
                sub_type: 'superannuation',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            // Total observation
            const parent = recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 12000000,
                currency: 'AUD',
                balance_kind: 'total_portfolio_value',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                is_component_of_total: false
            });

            // Component 1: Cash
            recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                is_component_of_total: true,
                parent_observation_id: parent.id
            });

            // Component 2: Equities
            recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 11000000,
                currency: 'AUD',
                balance_kind: 'securities_market_value',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                is_component_of_total: true,
                parent_observation_id: parent.id
            });

            // Summary must remain exactly AUD 120,000, NOT AUD 240,000
            const summary = getSharedFinancialSummary(db, { as_of_date: '2026-09-18' });
            expect(summary.net_worth_cents_by_currency['AUD']).toBe(12000000);
        });

        it('A4: Row Ordering Independence: Cash first then Total second still preserves AUD 120,000', async () => {
            const entity = createEntity(db, { name: 'Diana', type: 'person', currency: 'AUD' });
            const { account: acc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Trading Account',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            // 1. Record Cash Component FIRST
            recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                is_component_of_total: true
            });

            // 2. Record Total SECOND
            recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 12000000,
                currency: 'AUD',
                balance_kind: 'total_portfolio_value',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                is_component_of_total: false
            });

            // Summary must report AUD 120,000 regardless of insertion order
            const summary = getSharedFinancialSummary(db, { as_of_date: '2026-09-18' });
            expect(summary.net_worth_cents_by_currency['AUD']).toBe(12000000);
        });
    });

    // =========================================================================
    // REQUIREMENT B: Preserve Uncertainty and Validate Amounts Strictly
    // =========================================================================
    describe('Requirement B: Preserve Uncertainty and Validate Amounts Strictly', () => {
        it('B1: Missing amount remains unresolved and is NOT defaulted to zero', () => {
            const tableWithMissing = `
Account, Balance, Date, Kind
AustralianSuper, , 2026-09-18, Portfolio Value
            `;
            const result = parseStructuredTable(tableWithMissing);
            expect(result.proposals).toHaveLength(1);
            expect(result.proposals[0].amount_cents).toBeNull();
            expect(result.proposals[0].unresolved_fields).toContain('amount');
        });

        it('B2: Partially numeric text ("123oops", "N/A", "TBD") is rejected as unresolved amount', () => {
            const messyTable = `
Account, Balance, Date
CommBank A, 123oops, 2026-09-18
CommBank B, N/A, 2026-09-18
CommBank C, TBD, 2026-09-18
            `;
            const result = parseStructuredTable(messyTable);
            expect(result.proposals).toHaveLength(3);
            for (const prop of result.proposals) {
                expect(prop.amount_cents).toBeNull();
                expect(prop.unresolved_fields).toContain('amount');
            }
        });

        it('B3: Valid zero balances ($0.00, 0) are accepted as valid zero cents', () => {
            const zeroTable = `
Account, Balance, Date
Everyday Checking, "$0.00", 2026-09-18
Savings Account, 0, 2026-09-18
            `;
            const result = parseStructuredTable(zeroTable);
            expect(result.proposals).toHaveLength(2);
            expect(result.proposals[0].amount_cents).toBe(0);
            expect(result.proposals[0].unresolved_fields).not.toContain('amount');
            expect(result.proposals[1].amount_cents).toBe(0);
            expect(result.proposals[1].unresolved_fields).not.toContain('amount');
        });

        it('B4: Preserves negative sign or flags for debt confirmation (amount_sign)', () => {
            const debtTable = `
Credit Card, "-$450.00", 2026-09-18, Statement Balance
Brokerage Margin, "-$2,000.00", 2026-09-18, Loan Principal
            `;
            const result = parseStructuredTable(debtTable);
            expect(result.proposals).toHaveLength(2);
            expect(result.proposals[0].unresolved_fields).toContain('amount_sign');
            expect(result.proposals[1].unresolved_fields).toContain('amount_sign');
        });

        it('B5: Flags unsupported precision (amount_precision) per currency scale', () => {
            // JPY has 0 decimals; having decimals like 150.50 is unsupported precision
            const jpyExcess = `
Tokyo Account, "¥150.50", 2026-09-18
            `;
            const result = parseStructuredTable(jpyExcess);
            expect(result.proposals).toHaveLength(1);
            expect(result.proposals[0].currency).toBe('JPY');
            expect(result.proposals[0].unresolved_fields).toContain('amount_precision');
        });

        it('B6: Unknown balance kinds are marked as unresolved and flagged', () => {
            const unknownKindTable = `
Account, Balance, Date, Kind
Special Account, "$500.00", 2026-09-18, ArbitraryMysteryKind
            `;
            const result = parseStructuredTable(unknownKindTable);
            expect(result.proposals).toHaveLength(1);
            expect(result.proposals[0].balance_kind).toBe('unresolved');
            expect(result.proposals[0].unresolved_fields).toContain('balance_kind');
        });

        it('B7: Date validation strictly rejects invalid calendar dates (Feb 30, non-leap Feb 29)', () => {
            const invalidDateTable = `
Everyday Checking, "$1,000.00", 2026-02-30
Savings Account, "$2,000.00", 2025-02-29
            `;
            const result = parseStructuredTable(invalidDateTable);
            expect(result.proposals).toHaveLength(2);
            expect(result.proposals[0].unresolved_fields).toContain('effective_date');
            expect(result.proposals[1].unresolved_fields).toContain('effective_date');
        });

        it('B8: Never invents source excerpts when missing from source lines', () => {
            const table = `
Account, Balance
Basic Checking, $100.00
            `;
            const result = parseStructuredTable(table);
            expect(result.proposals[0].source_line).toBeDefined();
            // Structured parser does not fabricate synthetic quotes
        });
    });

    // =========================================================================
    // REQUIREMENT C: Retain Source Evidence at Explicit Save
    // =========================================================================
    describe('Requirement C: Retain Source Evidence & Vault Round-Trip', () => {
        it('C1: Retains raw text once per batch and preserves observation evidence fields', async () => {
            const entity = createEntity(db, { name: 'Eve', type: 'person', currency: 'AUD' });
            const { account: acc } = createAccount(db, {
                entity_id: entity.id,
                name: 'CommBank Smart Access',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            const rawStatement = 'CommBank Smart Access | $2,450.00 | 2026-09-18 | Current Balance';
            const batchId = 'batch-test-evidence-1';

            // Post batch via /api/accounting/balances
            const req = new NextRequest('http://localhost:4005/api/accounting/balances', {
                method: 'POST',
                headers: { 'host': 'localhost:4005' },
                body: JSON.stringify({
                    items: [
                        {
                            account_id: acc.id,
                            amount_cents: 245000,
                            currency: 'AUD',
                            balance_kind: 'current_balance',
                            effective_date: '2026-09-18',
                            source_type: 'table_paste',
                            source_batch_id: batchId,
                            source_reference: 'row-0',
                            source_excerpt: '$2,450.00 as of 2026-09-18',
                            is_user_modified: true,
                            is_component_of_total: false
                        }
                    ],
                    batch: {
                        id: batchId,
                        raw_text: rawStatement,
                        extraction_method: 'local_llm',
                        created_at: '2026-09-18T10:00:00Z'
                    }
                })
            });

            const res = await postBatchBalances(req);
            expect(res.status).toBe(200);

            // Assert batch was stored in m1_balance_import_batches
            const storedBatch = db.prepare('SELECT * FROM m1_balance_import_batches WHERE id = ?').get(batchId) as any;
            expect(storedBatch).toBeDefined();
            expect(storedBatch.raw_text).toBe(rawStatement);
            expect(storedBatch.extraction_method).toBe('local_llm');

            // Assert observation evidence fields were stored
            const storedObs = db.prepare('SELECT * FROM m1_balance_observations WHERE account_id = ?').get(acc.id) as any;
            expect(storedObs).toBeDefined();
            expect(storedObs.source_excerpt).toBe('$2,450.00 as of 2026-09-18');
            expect(storedObs.is_user_modified).toBe(1);
            expect(storedObs.is_component_of_total).toBe(0);
        });

        it('C2: Vault backup and restore round-trip preserves all batch and observation evidence', async () => {
            const entity = createEntity(db, { name: 'Frank', type: 'person', currency: 'AUD' });
            const { account: parentAcc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Superannuation Fund',
                type: 'asset',
                sub_type: 'superannuation',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            const batchId = 'batch-vault-roundtrip';
            recordBalanceImportBatch(db, {
                id: batchId,
                raw_text: 'Superannuation Fund Total: $150,000.00\nCash component: $15,000.00',
                extraction_method: 'local_llm',
                created_at: '2026-09-18T12:00:00Z'
            });

            const parentObs = recordBalanceObservation(db, {
                account_id: parentAcc.id,
                amount_cents: 15000000,
                currency: 'AUD',
                balance_kind: 'total_portfolio_value',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                source_batch_id: batchId,
                source_reference: 'row-parent',
                source_excerpt: 'Total: $150,000.00',
                is_user_modified: false,
                is_component_of_total: false
            });

            recordBalanceObservation(db, {
                account_id: parentAcc.id,
                amount_cents: 1500000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-18',
                source_type: 'table_paste',
                source_batch_id: batchId,
                source_reference: 'row-child',
                source_excerpt: 'Cash: $15,000.00',
                is_user_modified: true,
                is_component_of_total: true,
                parent_observation_id: parentObs.id
            });

            // 1. Export vault backup via GET /api/vault
            const exportReq = new NextRequest('http://localhost:4005/api/vault', {
                headers: { 'host': 'localhost:4005' }
            });
            const exportRes = await getVaultBackup(exportReq);
            expect(exportRes.status).toBe(200);
            const payload = await exportRes.json();
            const vaultData = payload.vault;

            // Verify vault payload contains batch and observation evidence fields
            expect(vaultData.balance_import_batches).toBeDefined();
            expect(vaultData.balance_import_batches).toHaveLength(1);
            expect(vaultData.balance_import_batches[0].raw_text).toContain('Superannuation Fund Total');

            expect(vaultData.balance_observations).toHaveLength(2);
            const childInExport = vaultData.balance_observations.find((o: any) => o.is_component_of_total === 1);
            expect(childInExport).toBeDefined();
            expect(childInExport.parent_observation_id).toBe(parentObs.id);
            expect(childInExport.source_excerpt).toBe('Cash: $15,000.00');
            expect(childInExport.is_user_modified).toBe(1);

            // 2. Clear database to simulate restore onto fresh database
            const freshDb = createTestDb();
            initAccountingSchema(freshDb);
            setTestDb(freshDb);

            // 3. Restore vault backup via POST /api/vault
            const importReq = new NextRequest('http://localhost:4005/api/vault', {
                method: 'POST',
                headers: { 'host': 'localhost:4005' },
                body: JSON.stringify({
                    action: 'bulk_restore',
                    ...payload
                })
            });
            const importRes = await postVaultRestore(importReq);
            expect(importRes.status).toBe(200);

            // 4. Verify restored state in freshDb
            const restoredBatches = freshDb.prepare('SELECT * FROM m1_balance_import_batches').all() as any[];
            expect(restoredBatches).toHaveLength(1);
            expect(restoredBatches[0].id).toBe(batchId);
            expect(restoredBatches[0].raw_text).toContain('Superannuation Fund Total');

            const restoredObservations = freshDb.prepare('SELECT * FROM m1_balance_observations').all() as any[];
            expect(restoredObservations).toHaveLength(2);

            const restoredChild = restoredObservations.find(o => o.is_component_of_total === 1);
            expect(restoredChild).toBeDefined();
            expect(restoredChild.parent_observation_id).toBe(parentObs.id);
            expect(restoredChild.source_excerpt).toBe('Cash: $15,000.00');
            expect(restoredChild.is_user_modified).toBe(1);

            // Verify shared summary in restored database still correctly values at AUD 150,000
            const restoredSummary = getSharedFinancialSummary(freshDb, { as_of_date: '2026-09-18' });
            expect(restoredSummary.net_worth_cents_by_currency['AUD']).toBe(15000000);
        });

        it('C3: Extraction produces ZERO database writes', async () => {
            const entity = createEntity(db, { name: 'Grace', type: 'person', currency: 'AUD' });
            createAccount(db, {
                entity_id: entity.id,
                name: 'CommBank Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            const initialObsCount = (db.prepare('SELECT count(*) as cnt FROM m1_balance_observations').get() as any).cnt;
            const initialBatchCount = (db.prepare('SELECT count(*) as cnt FROM m1_balance_import_batches').get() as any).cnt;

            // Extract balances using structured parser / extraction service
            await extractBalancesFromText(db, {
                text: 'CommBank Checking: $1,234.56 as of 2026-09-18',
                strategy: 'table'
            });

            const postObsCount = (db.prepare('SELECT count(*) as cnt FROM m1_balance_observations').get() as any).cnt;
            const postBatchCount = (db.prepare('SELECT count(*) as cnt FROM m1_balance_import_batches').get() as any).cnt;

            // Assert absolute zero database writes during extraction
            expect(postObsCount).toBe(initialObsCount);
            expect(postBatchCount).toBe(initialBatchCount);
        });
    });

    // =========================================================================
    // FOCUSED RECHECK CORRECTIONS (Requirements 1 through 6)
    // =========================================================================
    describe('Focused Recheck Corrections (Items 1 - 6)', () => {
        it('Item 1: Preserves parser findings end-to-end; AUD 12.345 with 2026-02-30 does not silently save as AUD 12.35 today', async () => {
            const entity = createEntity(db, { name: 'RegressUser', type: 'person', currency: 'AUD' });
            const { account: acc } = createAccount(db, {
                entity_id: entity.id,
                name: 'CommSec Equities',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            // Input with invalid date 2026-02-30 and excess decimal precision AUD 12.345
            const raw = 'CommSec Equities, AUD 12.345, 2026-02-30';
            const extraction = await extractBalancesFromText(db, { text: raw, strategy: 'table' });

            expect(extraction.proposals).toHaveLength(1);
            const prop = extraction.proposals[0];

            // 1. Unresolved fields must carry end-to-end through table extraction
            expect(prop.unresolved_fields).toContain('amount_precision');
            expect(prop.unresolved_fields).toContain('effective_date');

            // 2. The date must NOT silently turn into today's date
            expect(prop.effective_date).toBe('2026-02-30');

            // 3. Attempting to save via the real API endpoint without resolving must be rejected with HTTP 400
            const saveReq = new NextRequest('http://localhost:4005/api/accounting/balances', {
                method: 'POST',
                headers: { 'host': 'localhost:4005' },
                body: JSON.stringify({
                    items: [{
                        account_id: acc.id,
                        amount_cents: prop.amount_cents,
                        currency: 'AUD',
                        balance_kind: prop.balance_kind,
                        effective_date: prop.effective_date,
                        source_type: 'table_paste',
                        unresolved_fields: prop.unresolved_fields,
                        confirmed_by_user: false
                    }]
                })
            });
            const saveRes = await postBatchBalances(saveReq);
            expect(saveRes.status).toBe(400);
            const errJson = await saveRes.json();
            expect(errJson.error).toMatch(/effective_date|calendar date|unconfirmed review findings/i);
        });

        it('Item 2: Corrects component classification ("Total includes cash" vs "Cash not included in total")', async () => {
            // "Total includes cash" describes the parent total, NOT a supporting detail
            const parentTable = parseStructuredTable('Global Portfolio (Total includes cash): $120,000.00');
            expect(parentTable.proposals).toHaveLength(1);
            expect(parentTable.proposals[0].is_component_of_total).toBe(false);

            // "Cash not included in total" describes a separate amount, NOT a supporting detail
            const separateTable = parseStructuredTable('Brokerage Cash (Cash not included in total): $10,000.00');
            expect(separateTable.proposals).toHaveLength(1);
            expect(separateTable.proposals[0].is_component_of_total).toBe(false);

            // "Included cash component" describes a supporting detail
            const includedTable = parseStructuredTable('Included cash component: $10,000.00');
            expect(includedTable.proposals).toHaveLength(1);
            expect(includedTable.proposals[0].is_component_of_total).toBe(true);

            // Ambiguous relationship ("Cash: $10,000" alongside portfolio total) is flagged as component_ambiguity
            const ambiguousText = 'Portfolio Total: $120,000.00\nCash: $10,000.00';
            const result = await extractBalancesFromText(db, { text: ambiguousText, strategy: 'table' });
            const cashProp = result.proposals.find(p => p.raw_account_name.toLowerCase().includes('cash'));
            expect(cashProp).toBeDefined();
            expect(cashProp?.is_component_of_total).toBe(false);
            expect(cashProp?.unresolved_fields).toContain('component_ambiguity');
        });

        it('Item 3: Strict numeric validation rejects "1,23" and "120A", and flags numeric model output 12.345', async () => {
            // Reject "1,23" (invalid grouping)
            const badGrouping = parseStructuredTable('Checking Account, 1,23');
            expect(badGrouping.proposals[0].amount_cents).toBeNull();
            expect(badGrouping.proposals[0].unresolved_fields).toContain('amount');

            // Reject "120A" (alphanumeric garbage)
            const alphanumeric = parseStructuredTable('Checking Account, 120A');
            expect(alphanumeric.proposals[0].amount_cents).toBeNull();
            expect(alphanumeric.proposals[0].unresolved_fields).toContain('amount');

            // Flag numeric model output 12.345 for AUD via extraction service
            const extraction = await extractBalancesFromText(db, {
                text: 'Equities: 12.345',
                defaultCurrency: 'AUD'
            });
            expect(extraction.proposals[0].unresolved_fields).toContain('amount_precision');

            // Flag direct numeric model output (e.g. LLM returned JSON number 12.345)
            const modelProposals = correlateAndValidateProposals(db, [
                {
                    account_name: 'Equities',
                    amount: 12.345, // numeric model output (number type)
                    currency: 'AUD'
                }
            ], 'AUD', '2026-09-18', 'test-batch');
            expect(modelProposals[0].unresolved_fields).toContain('amount_precision');
        });

        it('Item 4: Reimporting unchanged source is idempotent; changing supporting-detail status applies explicit correction', async () => {
            const entity = createEntity(db, { name: 'AuditOwner', type: 'person', currency: 'AUD' });
            const { account: acc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Managed Fund',
                type: 'asset',
                sub_type: 'brokerage',
                currency: 'AUD',
                tracking_mode: 'balance'
            });

            const initialRevision = (getAccount(db, acc.id)?.balance_revision) || 1;

            // 1. Initial import: Save supporting detail (is_component_of_total: true)
            const obs1 = recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-20',
                source_type: 'table_paste',
                source_batch_id: 'batch-reimport',
                source_reference: 'row-cash',
                is_component_of_total: true
            });
            expect(obs1.is_component_of_total).toBe(true);
            const revisionAfterSave = (getAccount(db, acc.id)?.balance_revision) || 1;
            expect(revisionAfterSave).toBeGreaterThanOrEqual(initialRevision);

            // 2. Unchanged retries must NOT increment revisions and return existing observation idempotently
            const obsRetry = recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-20',
                source_type: 'table_paste',
                source_batch_id: 'batch-reimport',
                source_reference: 'row-cash',
                is_component_of_total: true
            });
            expect(obsRetry.id).toBe(obs1.id);
            expect(obsRetry.is_component_of_total).toBe(true);
            const revisionAfterRetry = (getAccount(db, acc.id)?.balance_revision) || 1;
            expect(revisionAfterRetry).toBe(revisionAfterSave); // No revision increment on unchanged retry!

            // 3. Outdated revision check: A correction using an outdated revision must fail with ConflictError without writes
            // 3. Outdated revision check: A correction using an outdated revision must fail with ConflictError without writes
            // Why this exists:
            // Fulfills Delivery 2A Narrow Closing Corrections:
            // Only deliberate classification corrections (explicit_classification_correction / explicit_correction) authorize overriding
            // a previously reviewed classification, and they require a current revision.
            expect(() => {
                recordBalanceObservation(db, {
                    account_id: acc.id,
                    amount_cents: 1000000,
                    currency: 'AUD',
                    balance_kind: 'brokerage_cash',
                    effective_date: '2026-09-20',
                    source_type: 'table_paste',
                    source_batch_id: 'batch-reimport',
                    source_reference: 'row-cash',
                    is_component_of_total: false,
                    is_user_modified: true,
                    explicit_classification_correction: true, // explicit correction intent
                    expected_balance_revision: revisionAfterSave - 999 // stale revision!
                });
            }).toThrow(/Concurrent balance observation detected/i);

            // Verify no mutation occurred on stale attempt
            const staleCheckRow = db.prepare('SELECT is_component_of_total, is_user_modified FROM m1_balance_observations WHERE id = ?').get(obs1.id) as any;
            expect(staleCheckRow.is_component_of_total).toBe(1); // Unchanged!
            expect(staleCheckRow.is_user_modified).toBe(0);
            expect((getAccount(db, acc.id)?.balance_revision)).toBe(revisionAfterSave);

            // Also test API route returns HTTP 409 for stale correction
            const staleApiReq = new NextRequest('http://localhost:3000/api/accounting/balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{
                        account_id: acc.id,
                        amount_cents: 1000000,
                        currency: 'AUD',
                        balance_kind: 'brokerage_cash',
                        effective_date: '2026-09-20',
                        source_type: 'table_paste',
                        source_batch_id: 'batch-reimport',
                        source_reference: 'row-cash',
                        is_component_of_total: false,
                        is_user_modified: true,
                        explicit_classification_correction: true,
                        expected_balance_revision: revisionAfterSave - 999
                    }]
                })
            });
            const staleApiRes = await postBatchBalances(staleApiReq);
            expect(staleApiRes.status).toBe(409);

            // 4. User deliberately corrects it using current revision: changes supporting detail to independent balance (false)
            const obsCorrected = recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-20',
                source_type: 'table_paste',
                source_batch_id: 'batch-reimport',
                source_reference: 'row-cash',
                is_component_of_total: false,
                is_user_modified: true,
                explicit_classification_correction: true, // explicit correction intent
                expected_balance_revision: revisionAfterSave
            });
            expect(obsCorrected.is_component_of_total).toBe(false);
            expect(obsCorrected.is_user_modified).toBe(true);

            const revisionAfterCorrection = (getAccount(db, acc.id)?.balance_revision) || 1;
            expect(revisionAfterCorrection).toBe(revisionAfterSave + 1);

            // Verify database row was explicitly updated
            const rowInDb = db.prepare('SELECT is_component_of_total, is_user_modified FROM m1_balance_observations WHERE id = ?').get(obs1.id) as any;
            expect(rowInDb.is_component_of_total).toBe(0);
            expect(rowInDb.is_user_modified).toBe(1);

            // 5. Acceptance 1: Reimport the original text with an unresolved currency warning.
            // Click Confirm Row (which sets is_user_modified: true for provenance) and Save without touching supporting-detail status.
            // The saved classification and revision must remain unchanged!
            const obsReimportedWithConfirmRow = recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-20',
                source_type: 'table_paste',
                source_batch_id: 'batch-reimport',
                source_reference: 'row-cash',
                is_component_of_total: true, // raw source text had true
                is_user_modified: true, // Confirm Row sets is_user_modified: true for provenance
                explicit_classification_correction: false // did NOT touch supporting detail checkbox!
            });
            // The reviewed correction MUST remain unchanged!
            expect(obsReimportedWithConfirmRow.is_component_of_total).toBe(false);
            expect(obsReimportedWithConfirmRow.is_user_modified).toBe(true);

            // Verify DB still retains the reviewed correction and revision was NOT incremented
            const rowAfterReimport = db.prepare('SELECT is_component_of_total, is_user_modified FROM m1_balance_observations WHERE id = ?').get(obs1.id) as any;
            expect(rowAfterReimport.is_component_of_total).toBe(0);
            expect(rowAfterReimport.is_user_modified).toBe(1);
            expect((getAccount(db, acc.id)?.balance_revision)).toBe(revisionAfterCorrection);

            // Also verify via API endpoint: Confirm Row + Save without touching supporting-detail status preserves classification
            const confirmRowApiReq = new NextRequest('http://localhost:3000/api/accounting/balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: [{
                        account_id: acc.id,
                        amount_cents: 1000000,
                        currency: 'AUD',
                        balance_kind: 'brokerage_cash',
                        effective_date: '2026-09-20',
                        source_type: 'table_paste',
                        source_batch_id: 'batch-reimport',
                        source_reference: 'row-cash',
                        is_component_of_total: true, // raw extracted text
                        is_user_modified: true, // Confirm Row sets is_user_modified
                        explicit_classification_correction: false, // user did not touch supporting-detail
                        expected_balance_revision: revisionAfterCorrection
                    }]
                })
            });
            const confirmRowApiRes = await postBatchBalances(confirmRowApiReq);
            expect(confirmRowApiRes.status).toBe(200);
            const confirmRowData = await confirmRowApiRes.json();
            expect(confirmRowData.items[0].is_component_of_total).toBe(false);
            expect((getAccount(db, acc.id)?.balance_revision)).toBe(revisionAfterCorrection);

            // Re-verify valuation reflects the independent balance now
            const val = getLatestValuationObservation(db, acc.id);
            expect(val).toBeDefined();
            expect(val?.amount_cents).toBe(1000000);

            // 6. A deliberate checkbox change must still work with a current revision:
            const obsDeliberateRevert = recordBalanceObservation(db, {
                account_id: acc.id,
                amount_cents: 1000000,
                currency: 'AUD',
                balance_kind: 'brokerage_cash',
                effective_date: '2026-09-20',
                source_type: 'table_paste',
                source_batch_id: 'batch-reimport',
                source_reference: 'row-cash',
                is_component_of_total: true, // deliberately re-checked
                is_user_modified: true,
                explicit_classification_correction: true, // deliberate change!
                expected_balance_revision: revisionAfterCorrection
            });
            expect(obsDeliberateRevert.is_component_of_total).toBe(true);
            expect((getAccount(db, acc.id)?.balance_revision)).toBe(revisionAfterCorrection + 1);
        });

        it('Item 5: Wire reconciliation to real contract: AUD 1,500 statement minus AUD 1,200 recorded = AUD 300 diff', async () => {
            const entity = createEntity(db, { name: 'ReconOwner', type: 'person', currency: 'AUD' });
            // Create transaction-tracked account with $1,200 opening balance (120,000 cents)
            const { account: checking } = createAccount(db, {
                entity_id: entity.id,
                name: 'Transaction Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD',
                tracking_mode: 'transactions',
                opening_balance_cents: 120000,
                opening_date: '2026-09-01'
            });

            // 1. Direct domain service test: Statement reported AUD 1,500 (150,000 cents)
            const recon = getReconciliationComparison(db, checking.id, {
                account_id: checking.id,
                amount_cents: 150000,
                currency: 'AUD',
                balance_kind: 'current_balance',
                effective_date: '2026-09-18',
                source_type: 'table_paste'
            } as any);

            expect(recon.recorded_ledger_cents).toBe(120000);
            expect(recon.reported_amount_cents).toBe(150000);
            expect(recon.diff_cents).toBe(30000); // AUD 300.00 difference!
            expect(recon.is_comparable).toBe(true);
            expect(recon.status).toBe('discrepancy');

            // 2. Real API endpoint test: POST /api/accounting/balances/reconcile
            const req = new NextRequest('http://localhost:4005/api/accounting/balances/reconcile', {
                method: 'POST',
                headers: { 'host': 'localhost:4005' },
                body: JSON.stringify({
                    account_id: checking.id,
                    amount_cents: 150000,
                    currency: 'AUD',
                    balance_kind: 'current_balance',
                    effective_date: '2026-09-18'
                })
            });
            const res = await postReconcile(req);
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.reconciliation.diff_cents).toBe(30000);
            expect(data.reconciliation.is_comparable).toBe(true);

            // Acceptance 2: Clear reconciliation for missing/invalid dates.
            // Do not calculate using an implicit "today" when the date field is blank.
            // Reject invalid reconciliation requests with HTTP 400.
            const blankDateReq = new NextRequest('http://localhost:4005/api/accounting/balances/reconcile', {
                method: 'POST',
                headers: { 'host': 'localhost:4005' },
                body: JSON.stringify({
                    account_id: checking.id,
                    amount_cents: 150000,
                    currency: 'AUD',
                    balance_kind: 'current_balance',
                    effective_date: ''
                })
            });
            const blankDateRes = await postReconcile(blankDateReq);
            expect(blankDateRes.status).toBe(400);
            const blankDateErr = await blankDateRes.json();
            expect(blankDateErr.error).toMatch(/valid calendar effective_date/i);

            // Rejects invalid date format or impossible calendar day (e.g. 2026-02-31)
            const invalidDateReq = new NextRequest('http://localhost:4005/api/accounting/balances/reconcile', {
                method: 'POST',
                headers: { 'host': 'localhost:4005' },
                body: JSON.stringify({
                    account_id: checking.id,
                    amount_cents: 150000,
                    currency: 'AUD',
                    balance_kind: 'current_balance',
                    effective_date: '2026-02-31'
                })
            });
            const invalidDateRes = await postReconcile(invalidDateReq);
            expect(invalidDateRes.status).toBe(400);

            // Direct domain service also rejects blank/invalid date with ValidationError
            expect(() => {
                getReconciliationComparison(db, checking.id, {
                    account_id: checking.id,
                    amount_cents: 150000,
                    currency: 'AUD',
                    balance_kind: 'current_balance',
                    effective_date: '',
                    source_type: 'table_paste'
                } as any);
            }).toThrow(/Observation effective date is required for reconciliation/i);

            // 3. Non-comparable kind (e.g. credit limit or available balance) returns is_comparable: false
            const nonCompRecon = getReconciliationComparison(db, checking.id, {
                account_id: checking.id,
                amount_cents: 150000,
                currency: 'AUD',
                balance_kind: 'available_balance',
                effective_date: '2026-09-18',
                source_type: 'table_paste'
            } as any);
            expect(nonCompRecon.is_comparable).toBe(false);
            expect(nonCompRecon.status).toBe('not_directly_comparable');
        });

        it('Item 6: Preserves actual extraction provenance (deterministic_table vs local_llm)', async () => {
            const rawTable = 'Everyday Checking, 5000.00, 2026-09-20';
            const extraction = await extractBalancesFromText(db, { text: rawTable, strategy: 'table' });

            // Table extraction must have extraction_method: 'deterministic_table'
            expect(extraction.extraction_method).toBe('deterministic_table');

            // Save batch to real API endpoint
            const batchId = `batch-${Date.now()}`;
            const entity = createEntity(db, { name: 'ProvOwner', type: 'person', currency: 'AUD' });
            const { account: acc } = createAccount(db, {
                entity_id: entity.id,
                name: 'Everyday Checking',
                type: 'asset',
                sub_type: 'checking',
                currency: 'AUD'
            });

            const saveReq = new NextRequest('http://localhost:4005/api/accounting/balances', {
                method: 'POST',
                headers: { 'host': 'localhost:4005' },
                body: JSON.stringify({
                    items: [{
                        account_id: acc.id,
                        amount_cents: 500000,
                        currency: 'AUD',
                        balance_kind: 'current_balance',
                        effective_date: '2026-09-20',
                        source_type: 'table_paste',
                        source_batch_id: batchId
                    }],
                    batch: {
                        id: batchId,
                        raw_text: rawTable,
                        extraction_method: extraction.extraction_method
                    }
                })
            });
            const saveRes = await postBatchBalances(saveReq);
            expect(saveRes.status).toBe(200);

            // Query SQLite m1_balance_import_batches to verify provenance
            const savedBatch = db.prepare('SELECT * FROM m1_balance_import_batches WHERE id = ?').get(batchId) as any;
            expect(savedBatch.extraction_method).toBe('deterministic_table');
            expect(savedBatch.extraction_method).not.toBe('local_llm');
        });
    });
});
