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
import fs from 'fs';
import path from 'path';
import { POST as vaultPost, GET as vaultGet } from '@/app/api/vault/route';
import { createTestDb, setTestDb, closeDb } from '@/infrastructure/sqlite/db';
import { appendMessage, createSession } from '@/lib/domain/mentor/mentorSessionService';
import Database from 'better-sqlite3';

describe('Vault Backup & Restore Safety (Batch A2)', () => {
    let testDb: Database.Database;

    beforeEach(() => {
        testDb = createTestDb();
        setTestDb(testDb);
    });

    afterEach(() => {
        closeDb();
        setTestDb(null);
    });

    // Helper to populate modern accounting test fixtures
    function seedModernAccountingData(db: Database.Database) {
        db.prepare(`
            INSERT INTO entities (id, name, type, currency, created_at, updated_at)
            VALUES ('ent-person', 'Personal Owner', 'person', 'AUD', datetime('now'), datetime('now')),
                   ('ent-biz', 'Consulting Co', 'business', 'AUD', datetime('now'), datetime('now'))
        `).run();

        db.prepare(`
            INSERT INTO accounts (id, entity_id, name, type, sub_type, currency, created_at, updated_at)
            VALUES ('acc-chk', 'ent-person', 'Personal Checking', 'asset', 'checking', 'AUD', datetime('now'), datetime('now')),
                   ('acc-exp', 'ent-biz', 'Business Expenses', 'expense', 'other', 'AUD', datetime('now'), datetime('now'))
        `).run();

        db.prepare(`
            INSERT INTO transactions (id, date, description, status, origin, revision, created_at, updated_at)
            VALUES ('tx-100', '2026-09-17', 'Client lunch', 'posted', 'manual', 1, datetime('now'), datetime('now'))
        `).run();

        db.prepare(`
            INSERT INTO journal_entries (id, transaction_id, account_id, amount_cents, currency)
            VALUES ('je-1', 'tx-100', 'acc-exp', 5000, 'AUD'),
                   ('je-2', 'tx-100', 'acc-chk', -5000, 'AUD')
        `).run();

        db.prepare(`
            INSERT INTO drafts (id, entity_id, payer_entity_id, payment_account_id, currency, amount_cents, date, description, status, created_at, updated_at)
            VALUES ('draft-1', 'ent-biz', 'ent-person', 'acc-chk', 'AUD', 3500, '2026-09-17', 'Unresolved coffee', 'draft', datetime('now'), datetime('now'))
        `).run();
    }

    it('Test 1: Ordinary saves/synchronizations must never clear or wipe modern accounting tables', async () => {
        seedModernAccountingData(testDb);

        // Perform an ordinary scoped save of a goal (the retired m0 asset entity
        // is no longer a scoped-save target — assets and liabilities live in the ledger)
        const scopedReq = new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: 'goals',
                item: {
                    id: 'goal-1',
                    name: 'Emergency Fund',
                    target_amount: 10000,
                    currency: 'AUD'
                }
            })
        });
        const scopedRes = await vaultPost(scopedReq);
        expect(scopedRes.status).toBe(200);

        // Perform an ordinary synchronization still carrying a legacy assets array:
        // it is ignored now and must not touch the ledger.
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
        const entitiesCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM entities").get() as any).cnt;
        const accountsCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM accounts").get() as any).cnt;
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM transactions").get() as any).cnt;
        const jeCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM journal_entries").get() as any).cnt;
        const draftCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM drafts").get() as any).cnt;

        expect(entitiesCnt).toBe(2);
        expect(accountsCnt).toBe(2);
        expect(txCnt).toBe(1);
        expect(jeCnt).toBe(2);
        expect(draftCnt).toBe(1);
    });

    it('Test 2: Legacy Version 1 archive restore preserves existing modern accounting records', async () => {
        seedModernAccountingData(testDb);

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

        // The retired m0 tables are gone: the restore backfills the legacy asset
        // into the ledger with deterministic ids and a balanced opening entry.
        const backfilledAccount = testDb.prepare("SELECT * FROM accounts WHERE id = 'account-asset-new-legacy-asset'").get() as any;
        expect(backfilledAccount).toBeDefined();
        expect(backfilledAccount.entity_id).toBe('entity-default-vault-owner');
        expect(backfilledAccount.type).toBe('asset');
        expect(backfilledAccount.sub_type).toBe('other');
        expect(backfilledAccount.opening_balance_cents).toBe(500000);

        const openingTx = testDb.prepare("SELECT * FROM transactions WHERE id = 'tx-opening-asset-new-legacy-asset'").get() as any;
        expect(openingTx).toBeDefined();
        expect(openingTx.origin).toBe('opening_balance');

        const openingPostings = testDb.prepare("SELECT account_id, amount_cents FROM journal_entries WHERE transaction_id = 'tx-opening-asset-new-legacy-asset'").all() as any[];
        expect(openingPostings.map(p => `${p.account_id}:${p.amount_cents}`).sort()).toEqual([
            'account-asset-new-legacy-asset:500000',
            'account-opening-balance-equity:-500000'
        ]);

        const backfillMarker = testDb.prepare("SELECT value FROM settings WHERE key = 'legacy_ledger_backfill_v1'").get() as any;
        expect(backfillMarker.value).toBe('"1"');

        // CRITICAL: Verify modern accounting records were NOT wiped — the restore
        // only ADDS the backfilled ledger rows on top of the seeded fixtures.
        const entitiesCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM entities").get() as any).cnt;
        const accountsCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM accounts").get() as any).cnt;
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM transactions").get() as any).cnt;
        const jeCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM journal_entries").get() as any).cnt;
        const draftCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM drafts").get() as any).cnt;

        expect(entitiesCnt).toBe(3); // seeded two + backfilled vault-owner entity
        expect(accountsCnt).toBe(4); // seeded two + backfilled asset + opening-balance equity account
        expect(txCnt).toBe(2);       // seeded one + backfilled opening transaction
        expect(jeCnt).toBe(4);       // seeded two + balanced opening postings
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
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM transactions").get() as any).cnt;
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
        const txCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM transactions").get() as any).cnt;
        const draftCnt = (testDb.prepare("SELECT COUNT(*) as cnt FROM drafts").get() as any).cnt;
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
        expect(snapshot.manifest.schemaVersion).toBe(3);
        expect(snapshot.vault.schemaVersion).toBe(3);
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
                schemaVersion: 3,
                manifest: snapshot.manifest,
                vault: snapshot.vault
            })
        }));

        expect(restoreRes.status).toBe(200);

        // Verify records restored accurately
        const entities = testDb.prepare("SELECT * FROM entities ORDER BY id").all();
        const drafts = testDb.prepare("SELECT * FROM drafts").all();
        const journal = testDb.prepare("SELECT * FROM journal_entries ORDER BY id").all();

        expect(entities.length).toBe(2);
        expect((entities[0] as any).name).toBe('Consulting Co');
        expect(drafts.length).toBe(1);
        expect((drafts[0] as any).amount_cents).toBe(3500);
        expect(journal.length).toBe(2);
    });

    // Mentor chat collections are OPTIONAL in backups: they are never in the required
    // list, older archives omit them entirely, and restores must not disturb existing
    // conversations unless the archive actually carries mentor data.
    function validV2Payload(extra: Record<string, any> = {}): any {
        return {
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
            settings: { baseCurrency: 'USD' },
            ...extra
        };
    }

    it('Test 9: Version 2 restore without mentor collections succeeds and preserves existing mentor chats', async () => {
        // Seed a live conversation before the restore
        const session = createSession(testDb, 'Moats and margins');
        appendMessage(testDb, session.id, { id: 'msg-u1', role: 'user', content: 'How is my posture?' });
        appendMessage(testDb, session.id, { id: 'msg-m1', role: 'mentor', mentorName: 'Warren Buffett', content: 'Moats matter.' });

        // Restore an older-style V2 archive that knows nothing about mentor chats
        const res = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validV2Payload())
        }));
        expect(res.status).toBe(200);

        // CRITICAL: mentor conversations survived the restore untouched
        const sessions = testDb.prepare('SELECT * FROM mentor_sessions').all();
        const messages = testDb.prepare('SELECT * FROM mentor_messages ORDER BY seq ASC').all();
        expect(sessions.length).toBe(1);
        expect((sessions[0] as any).title).toBe('Moats and margins');
        expect(messages.length).toBe(2);
        expect((messages[0] as any).content).toBe('How is my posture?');
    });

    it('Test 10: Mentor chats round-trip through snapshot export and V2 restore', async () => {
        const session = createSession(testDb, 'Liquidity ratios');
        appendMessage(testDb, session.id, { id: 'msg-u1', role: 'user', content: 'Explain liquidity ratios.' });
        appendMessage(testDb, session.id, {
            id: 'msg-a1',
            role: 'action_confirm',
            actionIntent: { action: 'add_asset', name: 'Savings', amount: 5000 },
            actionIntentResolved: 'confirmed'
        });

        // GET snapshot must carry the optional mentor collections
        const getRes = await vaultGet(new Request('http://localhost:4000/api/vault'));
        expect(getRes.status).toBe(200);
        const snapshot = await getRes.json();
        expect(snapshot.vault.mentor_sessions.length).toBe(1);
        expect(snapshot.vault.mentor_messages.length).toBe(2);

        // Wipe and restore from the snapshot — chats come back exactly, including
        // the resolved action_confirm payload.
        testDb.prepare('DELETE FROM mentor_messages').run();
        testDb.prepare('DELETE FROM mentor_sessions').run();

        const restoreRes = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                schemaVersion: 3,
                manifest: snapshot.manifest,
                vault: snapshot.vault
            })
        }));
        expect(restoreRes.status).toBe(200);

        const sessions = testDb.prepare('SELECT * FROM mentor_sessions').all();
        const messages = testDb.prepare('SELECT * FROM mentor_messages ORDER BY seq ASC').all();
        expect(sessions.length).toBe(1);
        expect((sessions[0] as any).title).toBe('Liquidity ratios');
        expect(messages.length).toBe(2);
        expect((messages[1] as any).role).toBe('action_confirm');
        expect((messages[1] as any).action_intent_resolved).toBe('confirmed');
        expect(JSON.parse((messages[1] as any).action_intent_json).name).toBe('Savings');
    });

    // Regression (Phase 4 rename): archives exported in the m1_-prefixed era
    // (schemaVersion 2) must restore cleanly into the plain-named (v3) schema.
    // Archive JSON keys were always unprefixed, so the table rename never
    // touched backup compatibility — this fixture proves it end-to-end.
    it('Test 9: checked-in v2 archive (m1_-era) restores into the plain-named schema', async () => {
        const fixturePath = path.join(
            process.cwd(), 'src', 'infrastructure', 'sqlite', 'fixtures', 'v2_archive_sample.json'
        );
        const archive = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
        expect(archive.manifest.schemaVersion).toBe(2);

        const restoreRes = await vaultPost(new Request('http://localhost:4000/api/vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'bulk_restore',
                schemaVersion: archive.manifest.schemaVersion,
                manifest: archive.manifest,
                vault: archive.vault
            })
        }));
        const body = await restoreRes.json();
        expect(restoreRes.status).toBe(200);

        // Ledger rows landed in the renamed tables.
        const entities = testDb.prepare('SELECT id FROM entities').all() as any[];
        expect(entities.map(e => e.id)).toContain('ent-fixture-owner');
        expect(entities.map(e => e.id)).toContain('ent-fixture-biz');

        const fixturePostings = testDb
            .prepare("SELECT account_id, amount_cents FROM journal_entries WHERE transaction_id = 'tx-fixture-1'")
            .all() as any[];
        expect(fixturePostings.map(p => `${p.account_id}:${p.amount_cents}`).sort())
            .toEqual(['acc-fixture-chk:-450', 'acc-fixture-exp:450']);

        // The legacy `assets` collection is backfilled into the ledger (same
        // semantics as migration 0006) — never written to a retired table.
        const backfilled = testDb
            .prepare("SELECT * FROM accounts WHERE id = 'account-asset-fixture-legacy-car'")
            .get() as any;
        expect(backfilled).toBeDefined();
        expect(backfilled.type).toBe('asset');
        expect(backfilled.opening_balance_cents).toBe(1200000);

        // Kept metadata tables carry their renamed names.
        expect((testDb.prepare('SELECT COUNT(*) AS cnt FROM goals').get() as any).cnt).toBe(1);
        expect((testDb.prepare('SELECT COUNT(*) AS cnt FROM recurring_schedules').get() as any).cnt).toBe(1);
        expect((testDb.prepare('SELECT COUNT(*) AS cnt FROM net_worth_snapshots').get() as any).cnt).toBe(1);
        expect((testDb.prepare('SELECT COUNT(*) AS cnt FROM cash_flow_summaries').get() as any).cnt).toBe(1);
        // Restore stores string settings verbatim (only non-strings get JSON-wrapped).
        expect((testDb.prepare("SELECT value FROM settings WHERE key = 'baseCurrency'").get() as any).value)
            .toBe('AUD');
    });
});
