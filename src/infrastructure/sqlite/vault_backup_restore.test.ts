/**
 * Backup and Restore Safety Integration Tests (Batch A2)
 * 
 * Why this test file exists:
 * Verifies critical data safety and integrity guarantees for local vault backup/restore:
 * 1. Only an explicit, validated Version 2 full restore may replace the complete accounting workspace.
 * 2. Ordinary saves and synchronizations must never clear unrelated tables or modern accounting records.
 * 3. Version 1 legacy restores must preserve existing modern accounting records without wiping them.
 * 4. Version 2 restores distinguish missing required collections (invalid archive) from explicitly empty collections (valid empty data).
 * 5. Deep domain validation: balanced postings per currency, safe integer amounts, supported currencies, and evidence/source references.
 * 6. Full round-trip consistent snapshot export and restore.
 * 
 * Tricky logic:
 * Every test runs in an isolated in-memory SQLite database (:memory:) via `createTestDb()` and `setTestDb()`.
 * This strictly isolates test execution and guarantees zero side effects on the live vault (`data/opennetworth.sqlite`).
 * 
 * TODO: Add encrypted SQLCipher archive testing when local encryption is introduced.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST as vaultPost, GET as vaultGet } from '@/app/api/vault/route';
import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import Database from 'better-sqlite3';

describe('Vault Backup & Restore Safety (Batch A2)', () => {
    let testDb: Database.Database;

    beforeEach(() => {
        testDb = createTestDb();
        initAccountingSchema(testDb);
        setTestDb(testDb);
    });

    afterEach(() => {
        closeDb();
        setTestDb(null);
    });

    // Helper to populate modern accounting test fixtures
    function seedModernAccountingData(db: Database.Database) {
        db.prepare(`
            INSERT INTO m1_entities (id, name, type, currency, created_at, updated_at)
            VALUES ('ent-person', 'Personal Owner', 'person', 'AUD', datetime('now'), datetime('now')),
                   ('ent-biz', 'Consulting Co', 'business', 'AUD', datetime('now'), datetime('now'))
        `).run();

        db.prepare(`
            INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, created_at, updated_at)
            VALUES ('acc-chk', 'ent-person', 'Personal Checking', 'asset', 'checking', 'AUD', datetime('now'), datetime('now')),
                   ('acc-exp', 'ent-biz', 'Business Expenses', 'expense', 'other', 'AUD', datetime('now'), datetime('now'))
        `).run();

        db.prepare(`
            INSERT INTO m1_transactions (id, date, description, status, origin, revision, created_at, updated_at)
            VALUES ('tx-100', '2026-09-17', 'Client lunch', 'posted', 'manual', 1, datetime('now'), datetime('now'))
        `).run();

        db.prepare(`
            INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency)
            VALUES ('je-1', 'tx-100', 'acc-exp', 5000, 'AUD'),
                   ('je-2', 'tx-100', 'acc-chk', -5000, 'AUD')
        `).run();

        db.prepare(`
            INSERT INTO m1_drafts (id, entity_id, payer_entity_id, payment_account_id, currency, amount_cents, date, description, status, created_at, updated_at)
            VALUES ('draft-1', 'ent-biz', 'ent-person', 'acc-chk', 'AUD', 3500, '2026-09-17', 'Unresolved coffee', 'draft', datetime('now'), datetime('now'))
        `).run();
    }

    it('Test 1: Ordinary saves/synchronizations must never clear or wipe modern accounting tables', async () => {
        seedModernAccountingData(testDb);

        // Perform an ordinary scoped save of an asset
        const scopedReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'assets',
                item: {
                    id: 'asset-1',
                    name: 'Test Vehicle',
                    type: 'vehicle',
                    value: 25000,
                    currency: 'AUD'
                }
            })
        });
        const scopedRes = await vaultPost(scopedReq);
        expect(scopedRes.status).toBe(200);

        // Perform an ordinary bulk synchronization of legacy assets
        const syncReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'sync',
                assets: [
                    { id: 'asset-1', name: 'Test Vehicle', type: 'vehicle', value: 25000, currency: 'AUD' }
                ]
            })
        });
        const syncRes = await vaultPost(syncReq);
        expect(syncRes.status).toBe(200);

        // Verify modern accounting tables are untouched
        const entitiesCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_entities").get() as any).cnt;
        const accountsCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_accounts").get() as any).cnt;
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_transactions").get() as any).cnt;
        const jeCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_journal_entries").get() as any).cnt;
        const draftCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_drafts").get() as any).cnt;

        expect(entitiesCnt).toBe(2);
        expect(accountsCnt).toBe(2);
        expect(txCnt).toBe(1);
        expect(jeCnt).toBe(2);
        expect(draftCnt).toBe(1);
    });

    it('Test 2: Legacy Version 1 archive restore preserves existing modern accounting records', async () => {
        seedModernAccountingData(testDb);

        // Seed a legacy asset to verify it gets replaced by the legacy restore
        testDb.prepare(`
            INSERT INTO assets (id, user_id, name, type, value, is_liquid, currency, interest_rate, last_updated)
            VALUES ('old-asset', 'local_user', 'Old Asset', 'other', 1000, 1, 'USD', 0, datetime('now'))
        `).run();

        // Perform a legacy restore (Version 1 archive without m1_ collections)
        const legacyReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                schemaVersion: 1,
                assets: [
                    { id: 'new-legacy-asset', name: 'Restored Bond', type: 'bond', value: 5000, currency: 'USD' }
                ],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: { baseCurrency: 'USD' }
            })
        });

        const legacyRes = await vaultPost(legacyReq);
        const resJson = await legacyRes.json();
        expect(legacyRes.status).toBe(200);
        expect(resJson.message).toContain('Legacy vault data restored. Existing modern accounting records preserved.');

        // Verify legacy tables were updated
        const legacyAssets = testDb.prepare("SELECT * FROM assets WHERE user_id = 'local_user'").all();
        expect(legacyAssets.length).toBe(1);
        expect((legacyAssets[0] as any).id).toBe('new-legacy-asset');

        // CRITICAL: Verify modern accounting records were NOT wiped!
        const entitiesCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_entities").get() as any).cnt;
        const accountsCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_accounts").get() as any).cnt;
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_transactions").get() as any).cnt;
        const jeCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_journal_entries").get() as any).cnt;
        const draftCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_drafts").get() as any).cnt;

        expect(entitiesCnt).toBe(2);
        expect(accountsCnt).toBe(2);
        expect(txCnt).toBe(1);
        expect(jeCnt).toBe(2);
        expect(draftCnt).toBe(1);
    });

    it('Test 3: Version 2 restore rejects missing required collections (invalid archive) with 400', async () => {
        seedModernAccountingData(testDb);

        // Omit required modern collection 'journal_entries'
        const invalidReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                schemaVersion: 2,
                entities: [],
                accounts: [],
                account_ownership: [],
                transactions: [],
                // journal_entries is omitted!
                transaction_corrections: [],
                exchange_rates: [],
                asset_valuations: [],
                drafts: [],
                documents: [],
                csv_mappings: [],
                document_jobs: [],
                proposals: [],
                assets: [],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: {}
            })
        });

        const res = await vaultPost(invalidReq);
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toContain('required modern accounting collection "journal_entries" is missing');

        // Verify modern tables were NOT modified or wiped
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_transactions").get() as any).cnt;
        expect(txCnt).toBe(1);
    });

    it('Test 4: Version 2 restore permits explicitly empty collections ([]) as valid empty data', async () => {
        seedModernAccountingData(testDb);

        // Valid Version 2 payload where all modern collections are explicitly empty arrays ([])
        const validEmptyReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                schemaVersion: 2,
                entities: [],
                accounts: [],
                account_ownership: [],
                transactions: [],
                journal_entries: [],
                transaction_corrections: [],
                exchange_rates: [],
                asset_valuations: [],
                drafts: [],
                documents: [],
                csv_mappings: [],
                document_jobs: [],
                proposals: [],
                assets: [],
                liabilities: [],
                goals: [],
                recurring: [],
                history: [],
                cashFlow: [],
                settings: { baseCurrency: 'USD' }
            })
        });

        const res = await vaultPost(validEmptyReq);
        expect(res.status).toBe(200);

        // Tables are now cleanly empty
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_transactions").get() as any).cnt;
        const draftCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM m1_drafts").get() as any).cnt;
        expect(txCnt).toBe(0);
        expect(draftCnt).toBe(0);
    });

    it('Test 5: Version 2 restore validates balanced postings per currency', async () => {
        const payload: any = {
            action: 'bulk_restore',
            schemaVersion: 2,
            entities: [{ id: 'e1', name: 'Entity 1', type: 'person', currency: 'USD' }],
            accounts: [
                { id: 'a1', entity_id: 'e1', name: 'Cash', type: 'asset', sub_type: 'cash', currency: 'USD' },
                { id: 'a2', entity_id: 'e1', name: 'Food', type: 'expense', sub_type: 'other', currency: 'USD' }
            ],
            account_ownership: [],
            transactions: [{ id: 'tx-unbalanced', date: '2026-09-17', description: 'Unbalanced tx' }],
            journal_entries: [
                // Unbalanced: +1000 and -800 => sum is +200
                { id: 'j1', transaction_id: 'tx-unbalanced', account_id: 'a2', amount_cents: 1000, currency: 'USD' },
                { id: 'j2', transaction_id: 'tx-unbalanced', account_id: 'a1', amount_cents: -800, currency: 'USD' }
            ],
            transaction_corrections: [],
            exchange_rates: [],
            asset_valuations: [],
            drafts: [],
            documents: [],
            csv_mappings: [],
            document_jobs: [],
            proposals: [],
            assets: [],
            liabilities: [],
            goals: [],
            recurring: [],
            history: [],
            cashFlow: [],
            settings: {}
        };

        const res = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }));

        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toContain('has unbalanced postings for currency USD: sum of postings is 200 cents (must be 0)');
    });

    it('Test 6: Version 2 restore validates safe integer amounts and supported currencies', async () => {
        const payloadWithFloatingPoint: any = {
            action: 'bulk_restore',
            schemaVersion: 2,
            entities: [{ id: 'e1', name: 'Entity 1', type: 'person', currency: 'USD' }],
            accounts: [
                { id: 'a1', entity_id: 'e1', name: 'Cash', type: 'asset', sub_type: 'cash', currency: 'USD' }
            ],
            account_ownership: [],
            transactions: [{ id: 'tx-1', date: '2026-09-17', description: 'Fractional cent' }],
            journal_entries: [
                { id: 'j1', transaction_id: 'tx-1', account_id: 'a1', amount_cents: 10.5, currency: 'USD' }
            ],
            transaction_corrections: [],
            exchange_rates: [],
            asset_valuations: [],
            drafts: [],
            documents: [],
            csv_mappings: [],
            document_jobs: [],
            proposals: [],
            assets: [],
            liabilities: [],
            goals: [],
            recurring: [],
            history: [],
            cashFlow: [],
            settings: {}
        };

        const res1 = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadWithFloatingPoint)
        }));
        expect(res1.status).toBe(400);
        expect((await res1.json()).error).toContain('amount_cents must be a safe integer');

        // Test unsupported currency
        const payloadWithBadCurrency: any = {
            ...payloadWithFloatingPoint,
            journal_entries: [],
            transactions: [],
            entities: [{ id: 'e1', name: 'Entity 1', type: 'person', currency: 'FAKE_CURRENCY' }]
        };
        const res2 = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadWithBadCurrency)
        }));
        expect(res2.status).toBe(400);
        expect((await res2.json()).error).toContain('Unsupported currency "FAKE_CURRENCY"');
    });

    it('Test 7: Version 2 restore validates evidence/source references (referential integrity)', async () => {
        const payloadWithBrokenRef: any = {
            action: 'bulk_restore',
            schemaVersion: 2,
            entities: [{ id: 'e1', name: 'Entity 1', type: 'person', currency: 'USD' }],
            accounts: [
                // References non-existent entity!
                { id: 'a1', entity_id: 'non-existent-entity', name: 'Cash', type: 'asset', sub_type: 'cash', currency: 'USD' }
            ],
            account_ownership: [],
            transactions: [],
            journal_entries: [],
            transaction_corrections: [],
            exchange_rates: [],
            asset_valuations: [],
            drafts: [],
            documents: [],
            csv_mappings: [],
            document_jobs: [],
            proposals: [],
            assets: [],
            liabilities: [],
            goals: [],
            recurring: [],
            history: [],
            cashFlow: [],
            settings: {}
        };

        const res = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadWithBrokenRef)
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('references non-existent entity_id "non-existent-entity"');
    });

    it('Test 8: Version 2 consistent snapshot export and round-trip restore', async () => {
        seedModernAccountingData(testDb);

        // Fetch full snapshot via GET /api/vault
        const getRes = await vaultGet(new Request('http://localhost:4000/api/vault'));
        expect(getRes.status).toBe(200);
        const snapshot = await getRes.json();

        expect(snapshot.success).toBe(true);
        expect(snapshot.manifest.schemaVersion).toBe(2);
        expect(snapshot.vault.schemaVersion).toBe(2);
        expect(snapshot.vault.entities.length).toBe(2);
        expect(snapshot.vault.accounts.length).toBe(2);
        expect(snapshot.vault.transactions.length).toBe(1);
        expect(snapshot.vault.journal_entries.length).toBe(2);
        expect(snapshot.vault.drafts.length).toBe(1);

        // Restore snapshot back into database via POST /api/vault
        const restoreRes = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                schemaVersion: 2,
                manifest: snapshot.manifest,
                vault: snapshot.vault
            })
        }));

        expect(restoreRes.status).toBe(200);

        // Verify records restored accurately
        const entities = testDb.prepare("SELECT * FROM m1_entities ORDER BY id").all();
        const drafts = testDb.prepare("SELECT * FROM m1_drafts").all();
        const journal = testDb.prepare("SELECT * FROM m1_journal_entries ORDER BY id").all();

        expect(entities.length).toBe(2);
        expect((entities[0] as any).name).toBe('Consulting Co');
        expect(drafts.length).toBe(1);
        expect((drafts[0] as any).amount_cents).toBe(3500);
        expect(journal.length).toBe(2);
    });
});
