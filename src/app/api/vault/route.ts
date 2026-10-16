/**
 * Local Vault SQLite API Route
 * 
 * Why this exists:
 * Authoritative, local-first API endpoint for reading and persisting all user
 * financial data directly into the embedded SQLite database (`data/opennetworth.sqlite`).
 * Supports both bulk synchronization/restore and scoped single-record operations (DATA-01, DATA-05).
 * 
 * Tricky logic:
 * - Scoped saves and bulk restores strictly validate monetary values. Non-finite or non-numeric
 *   inputs ("not-money", NaN) are rejected with HTTP 400 rather than fabricating zero balances (TRUST-07).
 * - Bulk restore commits an atomic replacement across all collections. If an array (e.g. history)
 *   is empty, the corresponding table is cleared so no stale rows remain behind (DATA-08, TRUST-11).
 * 
 * TODO: Support encrypted local SQLite exports via SQLCipher in future security hardening milestones.
 */

import { NextResponse } from 'next/server';
import { getDbForRequest, demoErrorResponse, demoReadOnlyResponse } from '@/infrastructure/sqlite/db';

class ValidationError extends Error {
    statusCode = 400;
}

/**
 * Strict monetary validation helper (TRUST-07, DATA-01).
 * 
 * Why this exists:
 * Prevents non-numeric or non-finite inputs (e.g. "not-money", NaN, undefined)
 * from being silently converted to fabricated zero balances (Number(x) || 0).
 * Rejects invalid inputs with an explicit validation error.
 */
function parseFiniteNumber(
    val: any,
    fieldName: string,
    options: { allowNegative?: boolean; required?: boolean } = {}
): number {
    const { allowNegative = false, required = true } = options;
    if (val === undefined || val === null || val === '') {
        if (!required) return 0;
        throw new ValidationError(`${fieldName} is required and cannot be empty`);
    }
    const num = Number(val);
    if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
        throw new ValidationError(`${fieldName} must be a valid finite number, received: "${val}"`);
    }
    if (!allowNegative && num < 0) {
        throw new ValidationError(`${fieldName} cannot be negative, received: ${num}`);
    }
    return num;
}

/**
 * Validates ISO month format (YYYY-MM).
 */
function validateMonth(month: any): string {
    if (typeof month !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month)) {
        throw new ValidationError(`Invalid month format "${month}". Expected YYYY-MM.`);
    }
    return month;
}

/**
 * Validates real calendar date (YYYY-MM-DD) format and calendar boundary (R02, P03).
 * 
 * Why this exists:
 * Rejects impossible dates (e.g. 2026-02-31, 2026-13-01) during archive pre-validation
 * before any database modifications begin, guaranteeing atomic rejection with HTTP 400.
 * 
 * Tricky logic:
 * Date parsing in UTC ensures timezone offsets do not cause off-by-one calendar shifts.
 * 
 * TODO: Support leap-second timestamp precision if sub-second observation imports are added.
 */
function assertValidCalendarDateLocal(dateStr: any, context: string): void {
    if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new ValidationError(`${context} must be a valid date in YYYY-MM-DD format, received: "${dateStr}".`);
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    if (
        isNaN(parsed.getTime()) ||
        parsed.getUTCFullYear() !== y ||
        parsed.getUTCMonth() + 1 !== m ||
        parsed.getUTCDate() !== d
    ) {
        throw new ValidationError(`${context} is not a valid calendar date: "${dateStr}".`);
    }
}

import { CURRENCY_DECIMALS } from '@/lib/domain/accounting/types';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';
import { backfillLegacyLedgerFromPayload } from '@/lib/domain/accounting/legacyBackfill';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

export async function GET(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        const { searchParams } = new URL(request.url);
        const entity = searchParams.get('entity');
        // Demo cookie present → read-only persona vault (Phase 2.7).
        const db = getDbForRequest(request);

        if (entity) {
            const allowed = ['goals', 'recurring_schedules', 'net_worth_snapshots', 'cash_flow_summaries', 'profiles', 'settings', 'budgets'];
            const table = entity === 'recurring' ? 'recurring_schedules' :
                entity === 'history' ? 'net_worth_snapshots' :
                    entity === 'cashFlow' ? 'cash_flow_summaries' : entity;

            if (!allowed.includes(table)) {
                return secureJson({ error: `Invalid entity: ${entity}` }, { status: 400 });
            }

            const rows = db.prepare(`SELECT * FROM ${table}`).all();
            return secureJson({ data: rows });
        }

        // Return full consistent snapshot across all collections (TRUST-11, DATA-01)
        // Why: Wrapping reads inside a single read transaction guarantees point-in-time consistency
        // across all financial and document tables without partial reads.
        const snapshot = db.transaction(() => {
            const goals = db.prepare('SELECT * FROM goals').all();

            const recurring = db.prepare('SELECT * FROM recurring_schedules').all().map((r: any) => ({
                ...r,
                is_active: Boolean(r.is_active)
            }));

            const history = db.prepare('SELECT * FROM net_worth_snapshots ORDER BY date ASC').all().map((h: any) => ({
                id: h.id,
                date: h.date,
                totalAssets: h.total_assets,
                totalLiabilities: h.total_liabilities,
                netWorth: h.net_worth,
                currency: h.currency || undefined
            }));

            const cashFlow = db.prepare('SELECT * FROM cash_flow_summaries ORDER BY month ASC').all();

            const settingsRows = db.prepare('SELECT * FROM settings').all();
            const settings: Record<string, any> = {};
            for (const row of settingsRows as any[]) {
                // Security: Filter out any external API tokens, credentials, or secrets from backup export
                if (/token|secret|password|credential|apikey|api_key/i.test(row.key)) {
                    continue;
                }
                try {
                    settings[row.key] = JSON.parse(row.value);
                } catch {
                    settings[row.key] = row.value;
                }
            }

            const profile = db.prepare("SELECT * FROM profiles WHERE id = 'local_user'").get();

            const tableExists = (name: string) => {
                const res = db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) as any;
                return res && res.cnt > 0;
            };

            // Modern accounting collections
            const entities = tableExists('entities') ? db.prepare('SELECT * FROM entities').all() : [];
            const accounts = tableExists('accounts') ? db.prepare('SELECT * FROM accounts').all().map((a: any) => {
                const acc: any = {
                    id: a.id,
                    entity_id: a.entity_id,
                    name: a.name,
                    type: a.type,
                    sub_type: a.sub_type,
                    currency: a.currency,
                    is_active: a.is_active,
                    institution: a.institution,
                    account_number_mask: a.account_number_mask,
                    opening_date: a.opening_date,
                    opening_balance_cents: a.opening_balance_cents,
                    revision: a.revision,
                    created_at: a.created_at,
                    updated_at: a.updated_at
                };
                if (a.tracking_mode && a.tracking_mode !== 'transactions') {
                    acc.tracking_mode = a.tracking_mode;
                }
                if (a.balance_revision && a.balance_revision !== 1) {
                    acc.balance_revision = a.balance_revision;
                }
                return acc;
            }) : [];
            const account_ownership = tableExists('account_ownership') ? db.prepare('SELECT * FROM account_ownership').all() : [];
            const transactions = tableExists('transactions') ? db.prepare('SELECT * FROM transactions').all() : [];
            const journal_entries = tableExists('journal_entries') ? db.prepare('SELECT * FROM journal_entries').all() : [];
            const transaction_corrections = tableExists('transaction_corrections') ? db.prepare('SELECT * FROM transaction_corrections').all() : [];
            const exchange_rates = tableExists('exchange_rates') ? db.prepare('SELECT * FROM exchange_rates').all() : [];
            const asset_valuations = tableExists('asset_valuations') ? db.prepare('SELECT * FROM asset_valuations').all() : [];
            const drafts = tableExists('drafts') ? db.prepare('SELECT * FROM drafts').all() : [];
            const reimbursement_workflows = tableExists('reimbursement_workflows') ? db.prepare('SELECT * FROM reimbursement_workflows').all() : [];

            // Modern document collections
            const documents = tableExists('documents') ? db.prepare('SELECT * FROM documents').all() : [];
            const csv_mappings = tableExists('csv_mappings') ? db.prepare('SELECT * FROM csv_mappings').all() : [];
            const document_jobs = tableExists('document_jobs') ? db.prepare('SELECT * FROM document_jobs').all() : [];
            const proposals = tableExists('proposals') ? db.prepare('SELECT * FROM proposals').all() : [];

            // Balance observations, import batches, account mappings, and statement reviews (Delivery 1, 2A & 2B)
            const balance_observations = tableExists('balance_observations') ? db.prepare('SELECT * FROM balance_observations').all() : [];
            const account_source_mappings = tableExists('account_source_mappings') ? db.prepare('SELECT * FROM account_source_mappings').all() : [];
            const balance_import_batches = tableExists('balance_import_batches') ? db.prepare('SELECT * FROM balance_import_batches').all() : [];
            const statement_reviews = tableExists('statement_reviews') ? db.prepare('SELECT * FROM statement_reviews').all() : [];
            const categorization_rules = tableExists('categorization_rules') ? db.prepare('SELECT * FROM categorization_rules').all() : [];

            // Mentor chat conversations (optional: only added to the snapshot when non-empty)
            const mentor_sessions = tableExists('mentor_sessions') ? db.prepare('SELECT * FROM mentor_sessions').all() : [];
            const mentor_messages = tableExists('mentor_messages') ? db.prepare('SELECT * FROM mentor_messages ORDER BY session_id, seq ASC').all() : [];

            // Budgets (migration 0010) — optional collection, same rationale as mentor chats
            const budgets = tableExists('budgets') ? db.prepare('SELECT * FROM budgets ORDER BY category ASC, currency ASC').all() : [];

            const snapshot: any = {
                goals,
                recurring,
                history,
                cashFlow,
                settings,
                profile,
                entities,
                accounts,
                account_ownership,
                transactions,
                journal_entries,
                transaction_corrections,
                exchange_rates,
                asset_valuations,
                drafts,
                documents,
                csv_mappings,
                document_jobs,
                proposals
            };
            if (reimbursement_workflows.length > 0) {
                snapshot.reimbursement_workflows = reimbursement_workflows;
            }
            if (balance_observations.length > 0) {
                snapshot.balance_observations = balance_observations;
            }
            if (account_source_mappings.length > 0) {
                snapshot.account_source_mappings = account_source_mappings;
            }
            if (balance_import_batches.length > 0) {
                snapshot.balance_import_batches = balance_import_batches;
            }
            if (statement_reviews.length > 0) {
                snapshot.statement_reviews = statement_reviews;
            }
            if (categorization_rules.length > 0) {
                snapshot.categorization_rules = categorization_rules;
            }
            // Mentor chats travel with backups only when they exist — keeps older
            // backups byte-identical and restores backward-compatible.
            if (mentor_sessions.length > 0) {
                snapshot.mentor_sessions = mentor_sessions;
            }
            if (mentor_messages.length > 0) {
                snapshot.mentor_messages = mentor_messages;
            }
            // Budgets travel with backups only when they exist — v2 archives predate
            // them, so omitting empty arrays keeps restores backward-compatible.
            if (budgets.length > 0) {
                snapshot.budgets = budgets;
            }

            return snapshot;
        })();

        return secureJson({
            success: true,
            manifest: {
                app: 'OpenNetWorth',
                schemaVersion: 3,
                // v3 = same collections as v2, but the vault's tables carry plain
                // domain names (migration 0008). Archive JSON keys were already
                // unprefixed, so v2 archives restore into the renamed schema as-is.
                table_naming: 'plain',
                exportTimestamp: new Date().toISOString(),
                recordCounts: {
                    goals: snapshot.goals.length,
                    recurring: snapshot.recurring.length,
                    history: snapshot.history.length,
                    cashFlow: snapshot.cashFlow.length,
                    entities: snapshot.entities.length,
                    accounts: snapshot.accounts.length,
                    transactions: snapshot.transactions.length,
                    journal_entries: snapshot.journal_entries.length,
                    drafts: snapshot.drafts.length,
                    documents: snapshot.documents.length,
                    proposals: snapshot.proposals.length,
                    categorization_rules: snapshot.categorization_rules?.length || 0,
                    budgets: snapshot.budgets?.length || 0
                }
            },
            vault: {
                schemaVersion: 3,
                ...snapshot
            }
        });
    } catch (error: any) {
        // Unknown persona → 400, unseeded vault → 503 (Phase 2.7).
        const demoRes = demoErrorResponse(error);
        if (demoRes) return demoRes;
        console.error('Vault GET Error:', error);
        return secureJson({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    // Demo mode is read-only: any mutation carrying the demo cookie is refused (Phase 2.7).
    const demoDenied = demoReadOnlyResponse(request);
    if (demoDenied) return demoDenied;
    try {
        const body = await request.json();
        const db = getDbForRequest(request);

        const { action, entity, item, id } = body;

        // --- SCOPED SINGLE-RECORD OPERATIONS (DATA-05) ---
        if (action === 'scoped_save') {
            if (!entity || !item || (!item.id && entity !== 'settings' && entity !== 'cashFlow' && entity !== 'history')) {
                return secureJson({ error: 'Missing entity, item, or item ID for scoped save' }, { status: 400 });
            }

            // NOTE: `assets`/`liabilities` scoped saves were removed with the m0 tables
            // (migration 0007). Asset/liability writes go through /api/accounting instead.

            if (entity === 'goals') {
                const target_amount = parseFiniteNumber(item.target_amount, 'Target amount', { allowNegative: false, required: true });
                const current_amount = parseFiniteNumber(item.current_amount, 'Current amount', { allowNegative: false, required: false });
                const start_amount = parseFiniteNumber(item.start_amount, 'Start amount', { allowNegative: false, required: false });

                const stmt = db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
                    VALUES (@id, @user_id, @name, @target_amount, @current_amount, @start_amount, @currency, @category, @deadline, @created_at)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        target_amount = excluded.target_amount,
                        current_amount = excluded.current_amount,
                        start_amount = excluded.start_amount,
                        currency = excluded.currency,
                        category = excluded.category,
                        deadline = excluded.deadline
                `);
                stmt.run({
                    id: item.id,
                    user_id: item.user_id || 'local_user',
                    name: item.name || 'Unnamed Goal',
                    target_amount,
                    current_amount,
                    start_amount,
                    currency: item.currency || 'USD',
                    category: item.category || 'General',
                    deadline: item.deadline || null,
                    created_at: item.created_at || new Date().toISOString()
                });
                return secureJson({ success: true, item: { ...item, target_amount, current_amount, start_amount } });
            }

            if (entity === 'recurring') {
                const amount = parseFiniteNumber(item.amount, 'Recurring amount', { allowNegative: false, required: true });

                const stmt = db.prepare(`
                    INSERT INTO recurring_schedules (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
                    VALUES (@id, @user_id, @name, @amount, @type, @frequency, @category, @start_date, @end_date, @is_active, @currency, @created_at)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        amount = excluded.amount,
                        type = excluded.type,
                        frequency = excluded.frequency,
                        category = excluded.category,
                        start_date = excluded.start_date,
                        end_date = excluded.end_date,
                        is_active = excluded.is_active,
                        currency = excluded.currency
                `);
                stmt.run({
                    id: item.id,
                    user_id: item.user_id || 'local_user',
                    name: item.name || 'Unnamed Item',
                    amount,
                    type: item.type || 'expense',
                    frequency: item.frequency || 'monthly',
                    category: item.category || 'General',
                    start_date: item.start_date || new Date().toISOString().split('T')[0],
                    end_date: item.end_date || null,
                    is_active: item.is_active !== false ? 1 : 0,
                    currency: item.currency || 'USD',
                    created_at: item.created_at || new Date().toISOString()
                });
                return secureJson({ success: true, item: { ...item, amount } });
            }

            if (entity === 'cashFlow') {
                const month = validateMonth(item.month);
                const income = parseFiniteNumber(item.income, 'Income', { allowNegative: false, required: true });
                const expenses = parseFiniteNumber(item.expenses, 'Expenses', { allowNegative: false, required: true });

                /**
                 * Why this exists (Finding 4):
                 * Ensures cash flow record IDs never disagree between UI, localStorage, and SQLite.
                 * If a month was previously logged, we query and reuse its existing SQLite row ID.
                 * Tricky logic: In SQLite ON CONFLICT(user_id, month), updating a row does not change
                 * its primary key id. If we assigned a new id in the payload, the DB row kept its old id.
                 * By fetching the existing id upfront (or generating one only for new months), the UI
                 * and DB remain in exact 1-to-1 sync.
                 */
                const existing = db.prepare("SELECT * FROM cash_flow_summaries WHERE user_id = 'local_user' AND month = ?").get(month) as any;
                const finalId = existing?.id || item.id || crypto.randomUUID();

                const stmt = db.prepare(`
                    INSERT INTO cash_flow_summaries (id, user_id, month, income, expenses, currency)
                    VALUES (@id, @user_id, @month, @income, @expenses, @currency)
                    ON CONFLICT(user_id, month) DO UPDATE SET
                        income = excluded.income,
                        expenses = excluded.expenses,
                        currency = excluded.currency
                `);
                stmt.run({
                    id: finalId,
                    user_id: 'local_user',
                    month,
                    income,
                    expenses,
                    currency: item.currency || 'USD'
                });

                // Return the authoritative persisted record from the database
                const persisted = db.prepare("SELECT * FROM cash_flow_summaries WHERE user_id = 'local_user' AND month = ?").get(month) as any;
                return secureJson({
                    success: true,
                    item: {
                        id: persisted.id,
                        month: persisted.month,
                        income: persisted.income,
                        expenses: persisted.expenses,
                        currency: persisted.currency
                    }
                });
            }

            if (entity === 'history') {
                /**
                 * Why this exists (Finding 1):
                 * Provides durable SQLite persistence for net worth snapshots added/edited in HistoryEditor.
                 */
                const total_assets = parseFiniteNumber(item.totalAssets ?? item.total_assets, 'Total assets', { allowNegative: false, required: true });
                const total_liabilities = parseFiniteNumber(item.totalLiabilities ?? item.total_liabilities, 'Total liabilities', { allowNegative: false, required: true });
                const net_worth = parseFiniteNumber(item.netWorth ?? item.net_worth, 'Net worth', { allowNegative: true, required: true });
                const date = item.date;
                if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    return secureJson({ error: 'History snapshot date must be YYYY-MM-DD' }, { status: 400 });
                }

                const existing = db.prepare("SELECT id FROM net_worth_snapshots WHERE user_id = 'local_user' AND date = ?").get(date) as { id: string } | undefined;
                const finalId = existing?.id || item.id || crypto.randomUUID();
                // Why this exists:
                // Resolves Finding 2 & Clarification 4: Retains snapshot currency in SQLite
                // so comparisons across currencies are never fabricated.
                const currency = (item.currency && typeof item.currency === 'string') ? item.currency : null;

                const stmt = db.prepare(`
                    INSERT INTO net_worth_snapshots (id, user_id, date, total_assets, total_liabilities, net_worth, currency)
                    VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth, @currency)
                    ON CONFLICT(user_id, date) DO UPDATE SET
                        total_assets = excluded.total_assets,
                        total_liabilities = excluded.total_liabilities,
                        net_worth = excluded.net_worth,
                        currency = excluded.currency
                `);
                stmt.run({
                    id: finalId,
                    user_id: 'local_user',
                    date,
                    total_assets,
                    total_liabilities,
                    net_worth,
                    currency
                });

                const persisted = db.prepare("SELECT * FROM net_worth_snapshots WHERE user_id = 'local_user' AND date = ?").get(date) as any;
                return secureJson({
                    success: true,
                    item: {
                        id: persisted.id,
                        date: persisted.date,
                        totalAssets: persisted.total_assets,
                        totalLiabilities: persisted.total_liabilities,
                        netWorth: persisted.net_worth,
                        currency: persisted.currency || undefined
                    }
                });
            }

            if (entity === 'settings') {
                /**
                 * Why this exists (Finding 1):
                 * Persists user settings (currency, theme, check-in frequency, freedom settings) directly to SQLite
                 * so preferences survive browser reloads and startup synchronization.
                 */
                if (!item || typeof item !== 'object') {
                    return secureJson({ error: 'Settings payload must be an object' }, { status: 400 });
                }

                const upsertSetting = db.prepare(`
                    INSERT INTO settings (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `);

                if (item.key && item.value !== undefined) {
                    upsertSetting.run(item.key, typeof item.value === 'string' ? item.value : JSON.stringify(item.value));
                    if (item.key === 'baseCurrency' || (item.key === 'userSettings' && item.value?.baseCurrency)) {
                        const currency = item.key === 'baseCurrency' ? item.value : item.value.baseCurrency;
                        db.prepare("UPDATE profiles SET currency_code = ? WHERE id = 'local_user'").run(currency);
                    }
                } else {
                    upsertSetting.run('userSettings', JSON.stringify(item));
                    for (const [k, v] of Object.entries(item)) {
                        upsertSetting.run(k, typeof v === 'string' ? v : JSON.stringify(v));
                    }
                    if (item.baseCurrency) {
                        db.prepare("UPDATE profiles SET currency_code = ? WHERE id = 'local_user'").run(item.baseCurrency);
                    }
                }
                return secureJson({ success: true, item });
            }

            return secureJson({ error: `Unsupported entity for scoped save: ${entity}` }, { status: 400 });
        }

        // --- SCOPED SINGLE-RECORD DELETE (DATA-05) ---
        if (action === 'scoped_delete') {
            if (!entity || !id) {
                return secureJson({ error: 'Missing entity or id for scoped delete' }, { status: 400 });
            }
            const tableMap: Record<string, string> = {
                goals: 'goals',
                recurring: 'recurring_schedules',
                cashFlow: 'cash_flow_summaries',
                history: 'net_worth_snapshots'
            };
            const table = tableMap[entity];
            if (!table) {
                return secureJson({ error: `Unsupported entity for delete: ${entity}` }, { status: 400 });
            }

            let result;
            if (entity === 'cashFlow') {
                result = db.prepare("DELETE FROM cash_flow_summaries WHERE id = ? OR month = ?").run(id, id);
            } else if (entity === 'history') {
                result = db.prepare("DELETE FROM net_worth_snapshots WHERE id = ? OR date = ?").run(id, id);
            } else {
                result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
            }

            if (result.changes === 0) {
                return secureJson({ error: `Record not found for delete in ${entity} with id: ${id}` }, { status: 404 });
            }
            return secureJson({ success: true, deletedId: id });
        }

        // --- COMPLETE VAULT CLEAR/WIPE (DATA-01, DATA-05) ---
        if (action === 'clear_vault' || action === 'wipe') {
            const clearTx = db.transaction(() => {
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM recurring_schedules WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM net_worth_snapshots WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM cash_flow_summaries WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM settings").run();
                db.prepare("DELETE FROM budgets WHERE user_id = 'local_user'").run();
            });
            clearTx();
            return secureJson({ success: true, message: 'Vault wiped successfully' });
        }

        // --- BULK RESTORE OR BULK SYNCHRONIZATION ---
        const rawVault = (body.vault && typeof body.vault === 'object') ? body.vault : body;
        const schemaVersion = body.schemaVersion ?? body.manifest?.schemaVersion ?? rawVault.schemaVersion ?? 1;
        // v2 (m1_-prefixed era) and v3 (plain names) share the same collection
        // keys and validation — archive JSON keys were always unprefixed.
        const isModernArchive = schemaVersion === 2 || schemaVersion === 3;
        const isBulkRestore = action === 'bulk_restore' || action === 'restore';

        if (isBulkRestore && schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3) {
            return secureJson({
                error: `Unsupported archive schemaVersion: ${schemaVersion}`
            }, { status: 400 });
        }

        /**
         * Why this exists (Finding 5, Clarification 1):
         * Protects against incomplete destructive restore requests and cross-schema data wipes.
         * 
         * Requirements:
         * 1. Only an explicit, validated Version 2 full restore may replace the complete accounting workspace.
         * 2. Ordinary saves/synchronizations must never clear unrelated tables or modern accounting records.
         * 3. Version 1 restores must explicitly preserve existing modern accounting records without wiping them.
         * 4. Version 2 restores distinguish missing required collections (invalid archive) from explicitly empty collections (valid empty data).
         * 5. Restore validation includes balanced postings per currency, safe integer amounts, supported currencies, and evidence/source references.
         */
        if (isBulkRestore && isModernArchive) {
            // Version 2 Required Collections (13 modern + 4 planning + settings).
            // `assets`/`liabilities` are OPTIONAL: old v2 archives still carry them and
            // get mapped into the ledger by the shared backfill (same semantics as
            // migration 0006); newer archives simply omit them.
            const requiredModernCollections = [
                'entities',
                'accounts',
                'account_ownership',
                'transactions',
                'journal_entries',
                'transaction_corrections',
                'exchange_rates',
                'asset_valuations',
                'drafts',
                'documents',
                'csv_mappings',
                'document_jobs',
                'proposals'
            ];
            const requiredLegacyCollections = [
                'goals',
                'recurring',
                'history',
                'cashFlow'
            ];

            // Distinguish missing collections from explicitly empty collections ([])
            for (const col of requiredModernCollections) {
                if (!Array.isArray(rawVault[col])) {
                    return secureJson({
                        error: `Invalid Version 2 archive: required modern accounting collection "${col}" is missing. To restore an empty collection, provide an empty array [].`
                    }, { status: 400 });
                }
            }
            for (const col of requiredLegacyCollections) {
                if (!Array.isArray(rawVault[col])) {
                    return secureJson({
                        error: `Invalid Version 2 archive: required legacy collection "${col}" is missing. To restore an empty collection, provide an empty array [].`
                    }, { status: 400 });
                }
            }
            if (!rawVault.settings || typeof rawVault.settings !== 'object' || Array.isArray(rawVault.settings)) {
                return secureJson({
                    error: 'Invalid Version 2 archive: settings is required and must be an object'
                }, { status: 400 });
            }

            // 1. Validate supported currencies across all collections
            const checkCurrency = (curr: any, context: string) => {
                if (!curr || typeof curr !== 'string' || !(curr in CURRENCY_DECIMALS)) {
                    throw new ValidationError(`Unsupported currency "${curr}" in ${context}. Supported currencies: ${Object.keys(CURRENCY_DECIMALS).join(', ')}`);
                }
            };
            for (const e of rawVault.entities) checkCurrency(e.currency || 'USD', `entity "${e.name || e.id}"`);
            for (const a of rawVault.accounts) checkCurrency(a.currency || 'USD', `account "${a.name || a.id}"`);
            for (const j of rawVault.journal_entries) checkCurrency(j.currency, `journal entry "${j.id}"`);
            for (const r of rawVault.exchange_rates) {
                checkCurrency(r.from_currency, `exchange rate "${r.id}" from_currency`);
                checkCurrency(r.to_currency, `exchange rate "${r.id}" to_currency`);
            }
            for (const p of rawVault.proposals) {
                if (p.original_currency && typeof p.original_currency === 'string' && p.original_currency.trim() !== '') {
                    checkCurrency(p.original_currency, `proposal "${p.id}"`);
                }
            }
            for (const d of rawVault.drafts) {
                if (d.currency) checkCurrency(d.currency, `draft "${d.id}"`);
            }
            if (Array.isArray(rawVault.balance_observations)) {
                for (const o of rawVault.balance_observations) {
                    checkCurrency(o.currency || 'USD', `balance observation "${o.id}"`);
                }
            }

            // 2. Validate safe integer amounts across minor-unit fields
            for (const j of rawVault.journal_entries) {
                if (!Number.isSafeInteger(j.amount_cents)) {
                    throw new ValidationError(`Journal entry "${j.id}" amount_cents must be a safe integer, received: ${j.amount_cents}`);
                }
            }
            for (const v of rawVault.asset_valuations) {
                if (!Number.isSafeInteger(v.target_valuation_cents)) {
                    throw new ValidationError(`Asset valuation "${v.id}" target_valuation_cents must be a safe integer, received: ${v.target_valuation_cents}`);
                }
            }
            for (const d of rawVault.drafts) {
                if (d.amount_cents !== null && d.amount_cents !== undefined && !Number.isSafeInteger(d.amount_cents)) {
                    throw new ValidationError(`Draft "${d.id}" amount_cents must be a safe integer or null, received: ${d.amount_cents}`);
                }
            }
            for (const doc of rawVault.documents) {
                if (!Number.isSafeInteger(doc.byte_size) || doc.byte_size < 0) {
                    throw new ValidationError(`Document "${doc.id}" byte_size must be a non-negative safe integer, received: ${doc.byte_size}`);
                }
            }
            for (const p of rawVault.proposals) {
                if (!Number.isSafeInteger(p.amount_cents)) {
                    throw new ValidationError(`Proposal "${p.id}" amount_cents must be a safe integer, received: ${p.amount_cents}`);
                }
            }

            // Validate safe integer amounts and calendar dates for balance observations (R02, P12)
            // Why: Guarantees corrupt or fractional cents (e.g. 100.5) and impossible dates (2026-02-31)
            // are rejected atomically with HTTP 400 before beginning the database restore transaction.
            if (Array.isArray(rawVault.balance_observations)) {
                for (const o of rawVault.balance_observations) {
                    if (!Number.isSafeInteger(o.amount_cents)) {
                        throw new ValidationError(`Balance observation "${o.id}" amount_cents must be a safe integer, received: ${o.amount_cents}`);
                    }
                    assertValidCalendarDateLocal(o.effective_date, `Balance observation "${o.id}" effective_date`);
                }
            }

            // 3. Validate balanced postings per currency for each transaction (Sum(Debits) - Sum(Credits) === 0)
            const postingsByTx = new Map<string, Array<{ currency: string; amount_cents: number }>>();
            for (const j of rawVault.journal_entries) {
                if (!postingsByTx.has(j.transaction_id)) {
                    postingsByTx.set(j.transaction_id, []);
                }
                postingsByTx.get(j.transaction_id)!.push({ currency: j.currency, amount_cents: j.amount_cents });
            }
            for (const t of rawVault.transactions) {
                const postings = postingsByTx.get(t.id);
                if (!postings || postings.length < 2) {
                    throw new ValidationError(`Transaction "${t.id}" is missing required double-entry journal postings (found ${postings?.length || 0}, minimum 2 required)`);
                }
            }
            for (const [txId, postings] of postingsByTx.entries()) {
                const sums = new Map<string, number>();
                for (const p of postings) {
                    sums.set(p.currency, (sums.get(p.currency) || 0) + p.amount_cents);
                }
                for (const [curr, sum] of sums.entries()) {
                    if (sum !== 0) {
                        throw new ValidationError(`Transaction "${txId}" has unbalanced postings for currency ${curr}: sum of postings is ${sum} cents (must be 0)`);
                    }
                }
            }

            // 4. Validate foreign keys and evidence/source reference integrity
            const entityIds = new Set(rawVault.entities.map((e: any) => e.id));
            const accountIds = new Set(rawVault.accounts.map((a: any) => a.id));
            const transactionIds = new Set(rawVault.transactions.map((t: any) => t.id));
            const documentIds = new Set(rawVault.documents.map((d: any) => d.id));
            const accountsById = new Map<string, any>(rawVault.accounts.map((a: any) => [a.id, a]));

            for (const a of rawVault.accounts) {
                if (!entityIds.has(a.entity_id)) {
                    throw new ValidationError(`Account "${a.name || a.id}" references non-existent entity_id "${a.entity_id}"`);
                }
            }
            for (const o of rawVault.account_ownership) {
                if (!accountIds.has(o.account_id)) {
                    throw new ValidationError(`Account ownership references non-existent account_id "${o.account_id}"`);
                }
                if (!entityIds.has(o.entity_id)) {
                    throw new ValidationError(`Account ownership references non-existent entity_id "${o.entity_id}"`);
                }
            }
            if (Array.isArray(rawVault.balance_observations)) {
                const observationIds = new Set(rawVault.balance_observations.map((o: any) => o.id));
                for (const o of rawVault.balance_observations) {
                    if (!accountIds.has(o.account_id)) {
                        throw new ValidationError(`Balance observation "${o.id}" references non-existent account_id "${o.account_id}"`);
                    }
                    const targetAccount = accountsById.get(o.account_id);
                    if (targetAccount && targetAccount.currency !== o.currency) {
                        throw new ValidationError(`Balance observation "${o.id}" currency "${o.currency}" does not match account currency "${targetAccount.currency}"`);
                    }
                    // Validate superseded_by_id foreign key target exists in archive (R02)
                    // Why: Prevents dangling reference pointers if an archive contains incomplete supersession chains.
                    if (o.superseded_by_id) {
                        if (!observationIds.has(o.superseded_by_id)) {
                            throw new ValidationError(`Balance observation "${o.id}" references non-existent superseded_by_id "${o.superseded_by_id}"`);
                        }
                        if (o.superseded_by_id === o.id) {
                            throw new ValidationError(`Balance observation "${o.id}" cannot supersede itself`);
                        }
                    }
                }
            }
            for (const t of rawVault.transactions) {
                if (t.evidence_refs) {
                    let refs = t.evidence_refs;
                    if (typeof refs === 'string') {
                        try { refs = JSON.parse(refs); } catch { /* ignore */ }
                    }
                    if (Array.isArray(refs)) {
                        for (let ref of refs) {
                            if (typeof ref === 'string') {
                                try {
                                    ref = JSON.parse(ref);
                                } catch {
                                    // ignore, fallback to string handling
                                }
                            }
                            const docId = typeof ref === 'string' ? ref : ref?.document_id;
                            if (docId && !documentIds.has(docId)) {
                                throw new ValidationError(`Transaction "${t.id}" evidence references non-existent document_id "${docId}"`);
                            }
                        }
                    }
                }
            }
            for (const j of rawVault.journal_entries) {
                if (!transactionIds.has(j.transaction_id)) {
                    throw new ValidationError(`Journal entry "${j.id}" references non-existent transaction_id "${j.transaction_id}"`);
                }
                const acc = accountsById.get(j.account_id);
                if (!acc) {
                    throw new ValidationError(`Journal entry "${j.id}" references non-existent account_id "${j.account_id}"`);
                }
                if (j.currency !== acc.currency) {
                    throw new ValidationError(`Journal entry "${j.id}" currency (${j.currency}) does not match account "${acc.name || acc.id}" currency (${acc.currency})`);
                }
            }
            for (const v of rawVault.asset_valuations) {
                if (!transactionIds.has(v.transaction_id)) {
                    throw new ValidationError(`Asset valuation "${v.id}" references non-existent transaction_id "${v.transaction_id}"`);
                }
                if (!accountIds.has(v.account_id)) {
                    throw new ValidationError(`Asset valuation "${v.id}" references non-existent account_id "${v.account_id}"`);
                }
            }
            for (const c of rawVault.transaction_corrections) {
                if (!transactionIds.has(c.transaction_id)) {
                    throw new ValidationError(`Transaction correction "${c.id}" references non-existent transaction_id "${c.transaction_id}"`);
                }
            }
            for (const d of rawVault.drafts) {
                if (d.entity_id && !entityIds.has(d.entity_id)) {
                    throw new ValidationError(`Draft "${d.id}" references non-existent entity_id "${d.entity_id}"`);
                }
                if (d.payer_entity_id && !entityIds.has(d.payer_entity_id)) {
                    throw new ValidationError(`Draft "${d.id}" references non-existent payer_entity_id "${d.payer_entity_id}"`);
                }
                if (d.payment_account_id && !accountIds.has(d.payment_account_id)) {
                    throw new ValidationError(`Draft "${d.id}" references non-existent payment_account_id "${d.payment_account_id}"`);
                }
                if (d.source_document_id && !documentIds.has(d.source_document_id)) {
                    throw new ValidationError(`Draft "${d.id}" references non-existent source_document_id "${d.source_document_id}"`);
                }
                if (d.source_transaction_id && !transactionIds.has(d.source_transaction_id)) {
                    throw new ValidationError(`Draft "${d.id}" references non-existent source_transaction_id "${d.source_transaction_id}"`);
                }
            }
            for (const job of rawVault.document_jobs) {
                if (!documentIds.has(job.document_id)) {
                    throw new ValidationError(`Document job "${job.id}" references non-existent document_id "${job.document_id}"`);
                }
            }
            for (const p of rawVault.proposals) {
                if (!documentIds.has(p.document_id)) {
                    throw new ValidationError(`Proposal "${p.id}" references non-existent document_id "${p.document_id}"`);
                }
                if (p.linked_transaction_id && !transactionIds.has(p.linked_transaction_id)) {
                    throw new ValidationError(`Proposal "${p.id}" references non-existent linked_transaction_id "${p.linked_transaction_id}"`);
                }
            }

            // 5. Validate legacy amounts (optional collections — old archives only)
            if (Array.isArray(rawVault.assets)) {
                for (const a of rawVault.assets) {
                    parseFiniteNumber(a.value, `Asset "${a.name || a.id}" value`, { allowNegative: false, required: true });
                    if (a.interest_rate !== undefined && a.interest_rate !== null) {
                        parseFiniteNumber(a.interest_rate, `Asset "${a.name || a.id}" interest rate`, { allowNegative: true, required: false });
                    }
                }
            }
            if (Array.isArray(rawVault.liabilities)) {
                for (const l of rawVault.liabilities) {
                    parseFiniteNumber(l.balance, `Liability "${l.name || l.id}" balance`, { allowNegative: false, required: true });
                    if (l.interest_rate !== undefined && l.interest_rate !== null) {
                        parseFiniteNumber(l.interest_rate, `Liability "${l.name || l.id}" interest rate`, { allowNegative: true, required: false });
                    }
                }
            }
            for (const g of rawVault.goals) {
                parseFiniteNumber(g.target_amount, `Goal "${g.name || g.id}" target amount`, { allowNegative: false, required: true });
            }
            for (const r of rawVault.recurring) {
                parseFiniteNumber(r.amount, `Recurring item "${r.name || r.id}" amount`, { allowNegative: false, required: true });
            }
            for (const h of rawVault.history) {
                parseFiniteNumber(h.totalAssets ?? h.total_assets, `History record total assets`, { allowNegative: false, required: true });
                parseFiniteNumber(h.totalLiabilities ?? h.total_liabilities, `History record total liabilities`, { allowNegative: false, required: true });
                parseFiniteNumber(h.netWorth ?? h.net_worth, `History record net worth`, { allowNegative: true, required: true });
            }
            for (const cf of rawVault.cashFlow) {
                validateMonth(cf.month);
                parseFiniteNumber(cf.income, `Cash flow entry income`, { allowNegative: false, required: true });
                parseFiniteNumber(cf.expenses, `Cash flow entry expenses`, { allowNegative: false, required: true });
            }

            // Execute Version 2 Full Atomic Restore
            const v2RestoreTx = db.transaction(() => {
                // Ensure accounting and document tables exist
                const tableExists = (name: string) => (db.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) as any).cnt > 0;

                // Wipe modern tables in reverse dependency order
                if (tableExists('categorization_rules')) db.prepare('DELETE FROM categorization_rules').run();
                if (tableExists('reimbursement_workflows')) db.prepare('DELETE FROM reimbursement_workflows').run();
                if (tableExists('proposals')) db.prepare('DELETE FROM proposals').run();
                if (tableExists('document_jobs')) db.prepare('DELETE FROM document_jobs').run();
                if (tableExists('csv_mappings')) db.prepare('DELETE FROM csv_mappings').run();
                if (tableExists('documents')) db.prepare('DELETE FROM documents').run();
                if (tableExists('drafts')) db.prepare('DELETE FROM drafts').run();
                if (tableExists('asset_valuations')) db.prepare('DELETE FROM asset_valuations').run();
                if (tableExists('exchange_rates')) db.prepare('DELETE FROM exchange_rates').run();
                if (tableExists('transaction_corrections')) db.prepare('DELETE FROM transaction_corrections').run();
                if (tableExists('journal_entries')) db.prepare('DELETE FROM journal_entries').run();
                if (tableExists('transactions')) db.prepare('DELETE FROM transactions').run();
                if (tableExists('account_ownership')) db.prepare('DELETE FROM account_ownership').run();
                if (tableExists('account_source_mappings')) db.prepare('DELETE FROM account_source_mappings').run();
                if (tableExists('balance_observations')) db.prepare('DELETE FROM balance_observations').run();
                if (tableExists('balance_import_batches')) db.prepare('DELETE FROM balance_import_batches').run();
                if (tableExists('accounts')) db.prepare('DELETE FROM accounts').run();
                if (tableExists('entities')) db.prepare('DELETE FROM entities').run();

                // Wipe planning/metadata tables (m0 assets/liabilities retired by migration 0007)
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM recurring_schedules WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM net_worth_snapshots WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM cash_flow_summaries WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM settings").run();

                // Insert modern entities
                const insertEntity = db.prepare(`
                    INSERT INTO entities (id, name, type, currency, parent_entity_id, created_at, updated_at)
                    VALUES (@id, @name, @type, @currency, @parent_entity_id, @created_at, @updated_at)
                `);
                for (const e of rawVault.entities) {
                    insertEntity.run({
                        id: e.id || crypto.randomUUID(),
                        name: e.name || 'Unnamed Entity',
                        type: e.type || 'person',
                        currency: e.currency || 'USD',
                        parent_entity_id: e.parent_entity_id || null,
                        created_at: e.created_at || new Date().toISOString(),
                        updated_at: e.updated_at || new Date().toISOString()
                    });
                }

                // Insert accounts
                const insertAccount = db.prepare(`
                    INSERT INTO accounts (
                        id, entity_id, name, type, sub_type, currency, is_active, institution,
                        account_number_mask, opening_date, opening_balance_cents, tracking_mode, balance_revision, revision, created_at, updated_at,
                        interest_rate, minimum_payment_cents, investment_details
                    ) VALUES (
                        @id, @entity_id, @name, @type, @sub_type, @currency, @is_active, @institution,
                        @account_number_mask, @opening_date, @opening_balance_cents, @tracking_mode, @balance_revision, @revision, @created_at, @updated_at,
                        @interest_rate, @minimum_payment_cents, @investment_details
                    )
                `);
                for (const a of rawVault.accounts) {
                    insertAccount.run({
                        id: a.id || crypto.randomUUID(),
                        entity_id: a.entity_id,
                        name: a.name || 'Unnamed Account',
                        type: a.type || 'asset',
                        sub_type: a.sub_type || 'other',
                        currency: a.currency || 'USD',
                        is_active: a.is_active !== undefined ? (a.is_active ? 1 : 0) : 1,
                        institution: a.institution || null,
                        account_number_mask: a.account_number_mask || null,
                        opening_date: a.opening_date || null,
                        opening_balance_cents: a.opening_balance_cents !== undefined && a.opening_balance_cents !== null ? Number(a.opening_balance_cents) : null,
                        tracking_mode: a.tracking_mode || 'transactions',
                        balance_revision: a.balance_revision || 1,
                        revision: a.revision || 1,
                        created_at: a.created_at || new Date().toISOString(),
                        updated_at: a.updated_at || new Date().toISOString(),
                        interest_rate: a.interest_rate ?? null,
                        minimum_payment_cents: a.minimum_payment_cents ?? null,
                        investment_details: a.investment_details ?? null
                    });
                }

                // Insert account ownership
                const insertOwnership = db.prepare(`
                    INSERT INTO account_ownership (id, account_id, entity_id, share_percentage, created_at)
                    VALUES (@id, @account_id, @entity_id, @share_percentage, @created_at)
                `);
                for (const o of rawVault.account_ownership) {
                    insertOwnership.run({
                        id: o.id || crypto.randomUUID(),
                        account_id: o.account_id,
                        entity_id: o.entity_id,
                        share_percentage: Number(o.share_percentage),
                        created_at: o.created_at || new Date().toISOString()
                    });
                }

                // Insert transactions
                const insertTx = db.prepare(`
                    INSERT INTO transactions (
                        id, date, description, payee_or_payer, status, origin, idempotency_key, evidence_refs, revision, created_at, updated_at
                    ) VALUES (
                        @id, @date, @description, @payee_or_payer, @status, @origin, @idempotency_key, @evidence_refs, @revision, @created_at, @updated_at
                    )
                `);
                for (const t of rawVault.transactions) {
                    insertTx.run({
                        id: t.id || crypto.randomUUID(),
                        date: t.date,
                        description: t.description || '',
                        payee_or_payer: t.payee_or_payer || null,
                        status: t.status || 'posted',
                        origin: t.origin || 'manual',
                        idempotency_key: t.idempotency_key || null,
                        evidence_refs: t.evidence_refs ? (typeof t.evidence_refs === 'string' ? t.evidence_refs : JSON.stringify(t.evidence_refs)) : null,
                        revision: t.revision || 1,
                        created_at: t.created_at || new Date().toISOString(),
                        updated_at: t.updated_at || new Date().toISOString()
                    });
                }

                // Insert journal entries
                const insertJournal = db.prepare(`
                    INSERT INTO journal_entries (
                        id, transaction_id, account_id, amount_cents, currency, exchange_rate, rate_unresolved, memo
                    ) VALUES (
                        @id, @transaction_id, @account_id, @amount_cents, @currency, @exchange_rate, @rate_unresolved, @memo
                    )
                `);
                for (const j of rawVault.journal_entries) {
                    insertJournal.run({
                        id: j.id || crypto.randomUUID(),
                        transaction_id: j.transaction_id,
                        account_id: j.account_id,
                        amount_cents: Number(j.amount_cents),
                        currency: j.currency,
                        exchange_rate: j.exchange_rate !== undefined && j.exchange_rate !== null ? Number(j.exchange_rate) : null,
                        rate_unresolved: j.rate_unresolved ? 1 : 0,
                        memo: j.memo || null
                    });
                }

                // Insert transaction corrections
                const insertCorr = db.prepare(`
                    INSERT INTO transaction_corrections (
                        id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
                    ) VALUES (
                        @id, @transaction_id, @operation, @reason, @previous_state, @corrected_state, @performed_by, @timestamp
                    )
                `);
                for (const c of rawVault.transaction_corrections) {
                    insertCorr.run({
                        id: c.id || crypto.randomUUID(),
                        transaction_id: c.transaction_id,
                        operation: c.operation || 'edit',
                        reason: c.reason || 'Restored audit record',
                        previous_state: typeof c.previous_state === 'string' ? c.previous_state : JSON.stringify(c.previous_state || {}),
                        corrected_state: typeof c.corrected_state === 'string' ? c.corrected_state : JSON.stringify(c.corrected_state || {}),
                        performed_by: c.performed_by || 'system',
                        timestamp: c.timestamp || new Date().toISOString()
                    });
                }

                // Insert exchange rates
                const insertRate = db.prepare(`
                    INSERT INTO exchange_rates (id, from_currency, to_currency, rate, effective_date, source, created_at)
                    VALUES (@id, @from_currency, @to_currency, @rate, @effective_date, @source, @created_at)
                `);
                for (const r of rawVault.exchange_rates) {
                    insertRate.run({
                        id: r.id || crypto.randomUUID(),
                        from_currency: r.from_currency,
                        to_currency: r.to_currency,
                        rate: Number(r.rate),
                        effective_date: r.effective_date,
                        source: r.source || 'backup_restore',
                        created_at: r.created_at || new Date().toISOString()
                    });
                }

                // Insert asset valuations
                const insertVal = db.prepare(`
                    INSERT INTO asset_valuations (id, transaction_id, account_id, valuation_date, target_valuation_cents, source, created_at)
                    VALUES (@id, @transaction_id, @account_id, @valuation_date, @target_valuation_cents, @source, @created_at)
                `);
                for (const v of rawVault.asset_valuations) {
                    insertVal.run({
                        id: v.id || crypto.randomUUID(),
                        transaction_id: v.transaction_id,
                        account_id: v.account_id,
                        valuation_date: v.valuation_date,
                        target_valuation_cents: Number(v.target_valuation_cents),
                        source: v.source || null,
                        created_at: v.created_at || new Date().toISOString()
                    });
                }

                // Insert drafts
                const insertDraft = db.prepare(`
                    INSERT INTO drafts (
                        id, entity_id, payer_entity_id, payment_account_id, currency, amount_cents,
                        date, merchant, description, reimbursement_intent, source_document_id,
                        source_transaction_id, status, created_at, updated_at
                    ) VALUES (
                        @id, @entity_id, @payer_entity_id, @payment_account_id, @currency, @amount_cents,
                        @date, @merchant, @description, @reimbursement_intent, @source_document_id,
                        @source_transaction_id, @status, @created_at, @updated_at
                    )
                `);
                for (const d of rawVault.drafts) {
                    insertDraft.run({
                        id: d.id || crypto.randomUUID(),
                        entity_id: d.entity_id || null,
                        payer_entity_id: d.payer_entity_id || null,
                        payment_account_id: d.payment_account_id || null,
                        currency: d.currency || null,
                        amount_cents: d.amount_cents !== undefined && d.amount_cents !== null ? Number(d.amount_cents) : null,
                        date: d.date || null,
                        merchant: d.merchant || null,
                        description: d.description || null,
                        reimbursement_intent: d.reimbursement_intent || null,
                        source_document_id: d.source_document_id || null,
                        source_transaction_id: d.source_transaction_id || null,
                        status: d.status || 'draft',
                        created_at: d.created_at || new Date().toISOString(),
                        updated_at: d.updated_at || new Date().toISOString()
                    });
                }

                // Insert reimbursement workflows
                if (rawVault.reimbursement_workflows) {
                    const insertWf = db.prepare(`
                        INSERT INTO reimbursement_workflows (
                            id, personal_entity_id, business_entity_id, currency,
                            due_from_account_id, due_to_account_id, draft_id, evidence_document_id,
                            personal_transaction_id, business_transaction_id, personal_reimbursement_tx_id, business_reimbursement_tx_id,
                            amount_cents, status, last_undo_request, created_at, updated_at
                        ) VALUES (
                            @id, @personal_entity_id, @business_entity_id, @currency,
                            @due_from_account_id, @due_to_account_id, @draft_id, @evidence_document_id,
                            @personal_transaction_id, @business_transaction_id, @personal_reimbursement_tx_id, @business_reimbursement_tx_id,
                            @amount_cents, @status, @last_undo_request, @created_at, @updated_at
                        )
                    `);
                    for (const w of rawVault.reimbursement_workflows) {
                        insertWf.run({
                            id: w.id || crypto.randomUUID(),
                            personal_entity_id: w.personal_entity_id,
                            business_entity_id: w.business_entity_id,
                            currency: w.currency,
                            due_from_account_id: w.due_from_account_id,
                            due_to_account_id: w.due_to_account_id,
                            draft_id: w.draft_id || null,
                            evidence_document_id: w.evidence_document_id || null,
                            personal_transaction_id: w.personal_transaction_id,
                            business_transaction_id: w.business_transaction_id,
                            personal_reimbursement_tx_id: w.personal_reimbursement_tx_id || null,
                            business_reimbursement_tx_id: w.business_reimbursement_tx_id || null,
                            amount_cents: Number(w.amount_cents),
                            status: w.status,
                            last_undo_request: w.last_undo_request || null,
                            created_at: w.created_at || new Date().toISOString(),
                            updated_at: w.updated_at || new Date().toISOString()
                        });
                    }
                }

                // Insert documents
                const insertDoc = db.prepare(`
                    INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, storage_path, raw_content, created_at)
                    VALUES (@id, @filename, @content_hash, @mime_type, @byte_size, @storage_path, @raw_content, @created_at)
                `);
                for (const doc of rawVault.documents) {
                    insertDoc.run({
                        id: doc.id || crypto.randomUUID(),
                        filename: doc.filename || 'unnamed_file',
                        content_hash: doc.content_hash,
                        mime_type: doc.mime_type || 'application/octet-stream',
                        byte_size: Number(doc.byte_size),
                        storage_path: doc.storage_path || null,
                        raw_content: doc.raw_content || null,
                        created_at: doc.created_at || new Date().toISOString()
                    });
                }

                // Insert csv mappings
                const insertMapping = db.prepare(`
                    INSERT INTO csv_mappings (
                        id, name, header_signature, date_column, date_format, description_column,
                        amount_mode, amount_column, debit_column, credit_column, created_at, updated_at
                    ) VALUES (
                        @id, @name, @header_signature, @date_column, @date_format, @description_column,
                        @amount_mode, @amount_column, @debit_column, @credit_column, @created_at, @updated_at
                    )
                `);
                for (const m of rawVault.csv_mappings) {
                    insertMapping.run({
                        id: m.id || crypto.randomUUID(),
                        name: m.name || 'Unnamed Mapping',
                        header_signature: m.header_signature,
                        date_column: m.date_column,
                        date_format: m.date_format || 'YYYY-MM-DD',
                        description_column: m.description_column,
                        amount_mode: m.amount_mode || 'single_amount',
                        amount_column: m.amount_column || null,
                        debit_column: m.debit_column || null,
                        credit_column: m.credit_column || null,
                        created_at: m.created_at || new Date().toISOString(),
                        updated_at: m.updated_at || new Date().toISOString()
                    });
                }

                // Insert document jobs
                const insertJob = db.prepare(`
                    INSERT INTO document_jobs (id, document_id, state, attempts, lease_until, error_message, options, created_at, updated_at)
                    VALUES (@id, @document_id, @state, @attempts, @lease_until, @error_message, @options, @created_at, @updated_at)
                `);
                for (const j of rawVault.document_jobs) {
                    insertJob.run({
                        id: j.id || crypto.randomUUID(),
                        document_id: j.document_id,
                        state: j.state || 'queued',
                        attempts: j.attempts || 0,
                        lease_until: j.lease_until || null,
                        error_message: j.error_message || null,
                        options: j.options ? (typeof j.options === 'string' ? j.options : JSON.stringify(j.options)) : null,
                        created_at: j.created_at || new Date().toISOString(),
                        updated_at: j.updated_at || new Date().toISOString()
                    });
                }

                // Insert proposals
                const insertProp = db.prepare(`
                    INSERT INTO proposals (
                        id, document_id, entity_id, account_id, event_date, document_period, original_currency,
                        amount_cents, counterparty, description, event_type, suggested_category, evidence_json,
                        extraction_version, validation_findings, review_status, related_proposal_ids, linked_transaction_id,
                        created_at, updated_at
                    ) VALUES (
                        @id, @document_id, @entity_id, @account_id, @event_date, @document_period, @original_currency,
                        @amount_cents, @counterparty, @description, @event_type, @suggested_category, @evidence_json,
                        @extraction_version, @validation_findings, @review_status, @related_proposal_ids, @linked_transaction_id,
                        @created_at, @updated_at
                    )
                `);
                for (const p of rawVault.proposals) {
                    insertProp.run({
                        id: p.id || crypto.randomUUID(),
                        document_id: p.document_id,
                        entity_id: p.entity_id || null,
                        account_id: p.account_id || null,
                        event_date: p.event_date,
                        document_period: p.document_period || null,
                        original_currency: p.original_currency,
                        amount_cents: Number(p.amount_cents),
                        counterparty: p.counterparty || null,
                        description: p.description || '',
                        event_type: p.event_type || 'expense',
                        suggested_category: p.suggested_category || null,
                        evidence_json: typeof p.evidence_json === 'string' ? p.evidence_json : JSON.stringify(p.evidence_json || {}),
                        extraction_version: p.extraction_version || '1.0',
                        validation_findings: p.validation_findings ? (typeof p.validation_findings === 'string' ? p.validation_findings : JSON.stringify(p.validation_findings)) : null,
                        review_status: p.review_status || 'unreviewed',
                        related_proposal_ids: p.related_proposal_ids ? (typeof p.related_proposal_ids === 'string' ? p.related_proposal_ids : JSON.stringify(p.related_proposal_ids)) : null,
                        linked_transaction_id: p.linked_transaction_id || null,
                        created_at: p.created_at || new Date().toISOString(),
                        updated_at: p.updated_at || new Date().toISOString()
                    });
                }

                // Insert categorization rules
                if (Array.isArray(rawVault.categorization_rules) && tableExists('categorization_rules')) {
                    const insertRule = db.prepare(`
                        INSERT INTO categorization_rules (id, account_id, match_string, match_type, target_category, created_at, updated_at)
                        VALUES (@id, @account_id, @match_string, @match_type, @target_category, @created_at, @updated_at)
                    `);
                    for (const r of rawVault.categorization_rules) {
                        insertRule.run({
                            id: r.id || crypto.randomUUID(),
                            account_id: r.account_id,
                            match_string: r.match_string,
                            match_type: r.match_type || 'contains',
                            target_category: r.target_category,
                            created_at: r.created_at || new Date().toISOString(),
                            updated_at: r.updated_at || new Date().toISOString()
                        });
                    }
                }

                // Insert balance import batches (Delivery 2A: Evidence preservation)
                if (Array.isArray(rawVault.balance_import_batches) && tableExists('balance_import_batches')) {
                    const insertBatch = db.prepare(`
                        INSERT INTO balance_import_batches (id, raw_text, extraction_method, model_identifier, created_at)
                        VALUES (@id, @raw_text, @extraction_method, @model_identifier, @created_at)
                    `);
                    for (const b of rawVault.balance_import_batches) {
                        insertBatch.run({
                            id: b.id,
                            raw_text: b.raw_text,
                            extraction_method: b.extraction_method || 'local_llm',
                            model_identifier: b.model_identifier || null,
                            created_at: b.created_at || new Date().toISOString()
                        });
                    }
                }

                // Insert balance observations (Delivery 1, 2A & 2B) - Two-Pass Restore
                // Why: Pass 1 inserts all observations with superseded_by_id = NULL and parent_observation_id = NULL
                // so all observation IDs exist. Pass 2 updates superseded_by_id and parent_observation_id links,
                // preventing foreign key violations when a superseded or component row appears before its parent in the backup payload.
                if (Array.isArray(rawVault.balance_observations) && tableExists('balance_observations')) {
                    const insertObs = db.prepare(`
                        INSERT INTO balance_observations (
                            id, account_id, amount_cents, currency, balance_kind, effective_date,
                            effective_time, imported_at, source_type, source_reference, source_batch_id,
                            source_excerpt, is_user_modified, is_component_of_total, parent_observation_id,
                            document_id, page_number,
                            superseded_by_id, review_status, raw_label, created_at
                        ) VALUES (
                            @id, @account_id, @amount_cents, @currency, @balance_kind, @effective_date,
                            @effective_time, @imported_at, @source_type, @source_reference, @source_batch_id,
                            @source_excerpt, @is_user_modified, @is_component_of_total, NULL,
                            @document_id, @page_number,
                            NULL, @review_status, @raw_label, @created_at
                        )
                    `);
                    for (const o of rawVault.balance_observations) {
                        insertObs.run({
                            id: o.id || crypto.randomUUID(),
                            account_id: o.account_id,
                            amount_cents: Number(o.amount_cents),
                            currency: o.currency || 'USD',
                            balance_kind: o.balance_kind || 'current_balance',
                            effective_date: o.effective_date,
                            effective_time: o.effective_time || null,
                            imported_at: o.imported_at || new Date().toISOString(),
                            source_type: o.source_type || 'manual',
                            source_reference: o.source_reference || null,
                            source_batch_id: o.source_batch_id || null,
                            source_excerpt: o.source_excerpt || null,
                            is_user_modified: o.is_user_modified ? 1 : 0,
                            is_component_of_total: o.is_component_of_total ? 1 : 0,
                            document_id: o.document_id || null,
                            page_number: typeof o.page_number === 'number' ? o.page_number : null,
                            review_status: o.review_status || 'accepted',
                            raw_label: o.raw_label || null,
                            created_at: o.created_at || new Date().toISOString()
                        });
                    }

                    // Pass 2: Link superseded_by_id and parent_observation_id now that all IDs are present
                    const updateSuperseded = db.prepare(`
                        UPDATE balance_observations
                        SET superseded_by_id = ?, parent_observation_id = ?
                        WHERE id = ?
                    `);
                    for (const o of rawVault.balance_observations) {
                        if (o.superseded_by_id || o.parent_observation_id) {
                            updateSuperseded.run(o.superseded_by_id || null, o.parent_observation_id || null, o.id);
                        }
                    }
                }

                // Insert account source mappings (Delivery 1)
                if (Array.isArray(rawVault.account_source_mappings) && tableExists('account_source_mappings')) {
                    const insertMap = db.prepare(`
                        INSERT INTO account_source_mappings (
                            id, account_id, provider, connection_id, source_account_id, institution, created_at
                        ) VALUES (
                            @id, @account_id, @provider, @connection_id, @source_account_id, @institution, @created_at
                        )
                    `);
                    for (const m of rawVault.account_source_mappings) {
                        insertMap.run({
                            id: m.id || crypto.randomUUID(),
                            account_id: m.account_id,
                            provider: m.provider,
                            connection_id: m.connection_id || 'default',
                            source_account_id: m.source_account_id,
                            institution: m.institution || null,
                            created_at: m.created_at || new Date().toISOString()
                        });
                    }
                }

                // Insert statement reviews (Delivery 2B: Durable Pending Review State)
                if (Array.isArray(rawVault.statement_reviews) && tableExists('statement_reviews')) {
                    const insertStmtRev = db.prepare(`
                        INSERT INTO statement_reviews (
                            id, document_id, status, proposals_json, coverage_summary_json, created_at, updated_at
                        ) VALUES (
                            @id, @document_id, @status, @proposals_json, @coverage_summary_json, @created_at, @updated_at
                        )
                    `);
                    for (const r of rawVault.statement_reviews) {
                        insertStmtRev.run({
                            id: r.id || crypto.randomUUID(),
                            document_id: r.document_id,
                            status: r.status || 'pending_review',
                            proposals_json: typeof r.proposals_json === 'string' ? r.proposals_json : JSON.stringify(r.proposals || []),
                            coverage_summary_json: typeof r.coverage_summary_json === 'string' ? r.coverage_summary_json : JSON.stringify(r.coverage_summary || {}),
                            created_at: r.created_at || new Date().toISOString(),
                            updated_at: r.updated_at || new Date().toISOString()
                        });
                    }
                }

                // Insert mentor chat sessions (OPTIONAL collection — never required in a
                // backup, so older backups restore untouched. Mentor tables are also absent
                // from the global m1_ wipe above: existing chats survive restores of backups
                // that carry no mentor data, and are replaced only when the backup has any.)
                if (Array.isArray(rawVault.mentor_sessions) || Array.isArray(rawVault.mentor_messages)) {
                    db.prepare('DELETE FROM mentor_messages').run();
                    db.prepare('DELETE FROM mentor_sessions').run();

                    const insertMentorSession = db.prepare(`
                        INSERT INTO mentor_sessions (id, title, created_at, updated_at)
                        VALUES (@id, @title, @created_at, @updated_at)
                    `);
                    for (const s of Array.isArray(rawVault.mentor_sessions) ? rawVault.mentor_sessions : []) {
                        if (!s || typeof s !== 'object' || typeof s.id !== 'string' || !s.id) continue;
                        insertMentorSession.run({
                            id: s.id,
                            title: typeof s.title === 'string' && s.title.trim() ? s.title.slice(0, 120) : 'New conversation',
                            created_at: typeof s.created_at === 'string' ? s.created_at : new Date().toISOString(),
                            updated_at: typeof s.updated_at === 'string' ? s.updated_at : new Date().toISOString()
                        });
                    }

                    const insertMentorMessage = db.prepare(`
                        INSERT INTO mentor_messages (
                            id, session_id, seq, role, content, mentor_id, mentor_name,
                            action_intent_json, facts_json, pending_intent_json, action_intent_resolved, attachments_json, created_at
                        ) VALUES (
                            @id, @session_id, @seq, @role, @content, @mentor_id, @mentor_name,
                            @action_intent_json, @facts_json, @pending_intent_json, @action_intent_resolved, @attachments_json, @created_at
                        )
                    `);
                    const allowedMentorRoles = new Set(['user', 'mentor', 'consensus', 'action_confirm']);
                    const seqBySession = new Map<string, number>();
                    for (const m of Array.isArray(rawVault.mentor_messages) ? rawVault.mentor_messages : []) {
                        if (!m || typeof m !== 'object') continue;
                        if (typeof m.session_id !== 'string' || !m.session_id) continue;
                        if (!allowedMentorRoles.has(m.role)) continue; // drop malformed roles rather than failing the whole restore
                        const sessionExists = db.prepare('SELECT id FROM mentor_sessions WHERE id = ?').get(m.session_id);
                        if (!sessionExists) continue; // orphaned message — FK would abort the transaction
                        const nextSeq = Number.isInteger(m.seq) && m.seq >= 0
                            ? m.seq
                            : (seqBySession.get(m.session_id) ?? 0);
                        seqBySession.set(m.session_id, nextSeq + 1);
                        insertMentorMessage.run({
                            id: typeof m.id === 'string' && m.id ? m.id : crypto.randomUUID(),
                            session_id: m.session_id,
                            seq: nextSeq,
                            role: m.role,
                            content: typeof m.content === 'string' ? m.content : null,
                            mentor_id: typeof m.mentor_id === 'string' ? m.mentor_id : null,
                            mentor_name: typeof m.mentor_name === 'string' ? m.mentor_name : null,
                            action_intent_json: typeof m.action_intent_json === 'string' ? m.action_intent_json : null,
                            facts_json: typeof m.facts_json === 'string' ? m.facts_json : null,
                            pending_intent_json: typeof m.pending_intent_json === 'string' ? m.pending_intent_json : null,
                            action_intent_resolved: m.action_intent_resolved === 'confirmed' || m.action_intent_resolved === 'cancelled'
                                ? m.action_intent_resolved
                                : null,
                            attachments_json: typeof m.attachments_json === 'string' ? m.attachments_json : null,
                            created_at: typeof m.created_at === 'string' ? m.created_at : new Date().toISOString()
                        });
                    }
                }

                // Insert budgets (OPTIONAL collection — v2 archives predate migration 0010,
                // so older backups restore untouched. Budgets are also absent from the
                // global wipe above: existing limits survive restores of backups that carry
                // no budget data, and are replaced only when the backup has any.)
                if (Array.isArray(rawVault.budgets)) {
                    db.prepare('DELETE FROM budgets').run();

                    const insertBudget = db.prepare(`
                        INSERT INTO budgets (id, user_id, entity_id, category, limit_cents, currency, created_at, updated_at)
                        VALUES (@id, @user_id, @entity_id, @category, @limit_cents, @currency, @created_at, @updated_at)
                    `);
                    for (const b of rawVault.budgets) {
                        if (!b || typeof b !== 'object') continue;
                        if (typeof b.entity_id !== 'string' || !b.entity_id) continue;
                        if (typeof b.category !== 'string' || !b.category.trim()) continue;
                        // Skip malformed money rows rather than aborting the whole restore.
                        if (!Number.isSafeInteger(b.limit_cents) || (b.limit_cents as number) <= 0) continue;
                        const budgetCurrency = typeof b.currency === 'string' ? b.currency.trim().toUpperCase() : '';
                        if (!/^[A-Z]{3}$/.test(budgetCurrency)) continue;
                        insertBudget.run({
                            id: typeof b.id === 'string' && b.id ? b.id : crypto.randomUUID(),
                            user_id: typeof b.user_id === 'string' && b.user_id ? b.user_id : 'local_user',
                            entity_id: b.entity_id,
                            category: b.category.trim(),
                            limit_cents: b.limit_cents,
                            currency: budgetCurrency,
                            created_at: typeof b.created_at === 'string' ? b.created_at : new Date().toISOString(),
                            updated_at: typeof b.updated_at === 'string' ? b.updated_at : new Date().toISOString()
                        });
                    }
                }

                // Legacy assets/liabilities arrays (old archives only) map into the ledger via
                // the shared backfill — identical semantics to migration 0006. Rows already
                // present as accounts are skipped, so restoring is lossless and idempotent.
                if (Array.isArray(rawVault.assets) || Array.isArray(rawVault.liabilities)) {
                    backfillLegacyLedgerFromPayload(db, {
                        assets: Array.isArray(rawVault.assets) ? rawVault.assets : [],
                        liabilities: Array.isArray(rawVault.liabilities) ? rawVault.liabilities : [],
                        settings: rawVault.settings,
                        profile: rawVault.profile
                    });
                }

                const insertGoal = db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
                    VALUES (@id, @user_id, @name, @target_amount, @current_amount, @start_amount, @currency, @category, @deadline, @created_at)
                `);
                for (const g of rawVault.goals) {
                    insertGoal.run({
                        id: g.id || crypto.randomUUID(),
                        user_id: g.user_id || 'local_user',
                        name: g.name || 'Unnamed Goal',
                        target_amount: Number(g.target_amount),
                        current_amount: g.current_amount !== undefined && g.current_amount !== null ? Number(g.current_amount) : 0,
                        start_amount: g.start_amount !== undefined && g.start_amount !== null ? Number(g.start_amount) : 0,
                        currency: g.currency || 'USD',
                        category: g.category || 'General',
                        deadline: g.deadline || null,
                        created_at: g.created_at || new Date().toISOString()
                    });
                }

                const insertRec = db.prepare(`
                    INSERT INTO recurring_schedules (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
                    VALUES (@id, @user_id, @name, @amount, @type, @frequency, @category, @start_date, @end_date, @is_active, @currency, @created_at)
                `);
                for (const r of rawVault.recurring) {
                    insertRec.run({
                        id: r.id || crypto.randomUUID(),
                        user_id: r.user_id || 'local_user',
                        name: r.name || 'Unnamed Item',
                        amount: Number(r.amount),
                        type: r.type || 'expense',
                        frequency: r.frequency || 'monthly',
                        category: r.category || 'General',
                        start_date: r.start_date || new Date().toISOString().split('T')[0],
                        end_date: r.end_date || null,
                        is_active: r.is_active !== false ? 1 : 0,
                        currency: r.currency || 'USD',
                        created_at: r.created_at || new Date().toISOString()
                    });
                }

                const insertHistory = db.prepare(`
                    INSERT INTO net_worth_snapshots (id, user_id, date, total_assets, total_liabilities, net_worth, currency)
                    VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth, @currency)
                `);
                for (const h of rawVault.history) {
                    insertHistory.run({
                        id: h.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        date: h.date,
                        total_assets: Number(h.totalAssets ?? h.total_assets),
                        total_liabilities: Number(h.totalLiabilities ?? h.total_liabilities),
                        net_worth: Number(h.netWorth ?? h.net_worth),
                        currency: h.currency || null
                    });
                }

                const insertCashFlow = db.prepare(`
                    INSERT INTO cash_flow_summaries (id, user_id, month, income, expenses, currency)
                    VALUES (@id, @user_id, @month, @income, @expenses, @currency)
                `);
                for (const cf of rawVault.cashFlow) {
                    insertCashFlow.run({
                        id: cf.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        month: cf.month,
                        income: Number(cf.income),
                        expenses: Number(cf.expenses),
                        currency: cf.currency || 'USD'
                    });
                }

                const upsertSetting = db.prepare(`
                    INSERT INTO settings (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `);
                for (const [k, v] of Object.entries(rawVault.settings)) {
                    upsertSetting.run(k, typeof v === 'string' ? v : JSON.stringify(v));
                }

                if (rawVault.profile) {
                    db.prepare(`
                        INSERT INTO profiles (id, email, full_name, privacy_mode, currency_code, created_at)
                        VALUES ('local_user', @email, @full_name, @privacy_mode, @currency_code, @created_at)
                        ON CONFLICT(id) DO UPDATE SET
                            full_name = excluded.full_name,
                            currency_code = excluded.currency_code,
                            privacy_mode = excluded.privacy_mode,
                            created_at = excluded.created_at
                    `).run({
                        email: rawVault.profile.email || 'local@device',
                        full_name: rawVault.profile.full_name || 'Local Vault Owner',
                        privacy_mode: rawVault.profile.privacy_mode ? 1 : 0,
                        currency_code: rawVault.profile.currency_code || 'USD',
                        created_at: rawVault.profile.created_at || new Date().toISOString()
                    });
                }
            });

            v2RestoreTx();
            return secureJson({ success: true, message: 'Vault fully restored and verified.' });
        }

        // Handle Version 1 (Legacy) Bulk Restore
        // Why: Protects modern accounting records from silent deletion during a legacy import.
        if (isBulkRestore && !isModernArchive) {
            // assets/liabilities are OPTIONAL here too: when present they are mapped
            // into the ledger by the shared backfill instead of the retired m0 tables.
            const requiredLegacyCollections = ['goals', 'recurring', 'history', 'cashFlow'];
            for (const col of requiredLegacyCollections) {
                if (!Array.isArray(rawVault[col])) {
                    return secureJson({
                        error: `Invalid legacy restore payload: collection "${col}" is required and must be an array`
                    }, { status: 400 });
                }
            }
            if (!rawVault.settings || typeof rawVault.settings !== 'object' || Array.isArray(rawVault.settings)) {
                return secureJson({
                    error: 'Invalid legacy restore payload: settings is required and must be an object'
                }, { status: 400 });
            }

            // Validate legacy numbers (assets/liabilities optional — old archives only)
            if (Array.isArray(rawVault.assets)) {
                for (const a of rawVault.assets) {
                    parseFiniteNumber(a.value, `Asset "${a.name || a.id}" value`, { allowNegative: false, required: true });
                }
            }
            if (Array.isArray(rawVault.liabilities)) {
                for (const l of rawVault.liabilities) {
                    parseFiniteNumber(l.balance, `Liability "${l.name || l.id}" balance`, { allowNegative: false, required: true });
                }
            }
            for (const g of rawVault.goals) {
                parseFiniteNumber(g.target_amount, `Goal "${g.name || g.id}" target amount`, { allowNegative: false, required: true });
            }
            for (const r of rawVault.recurring) {
                parseFiniteNumber(r.amount, `Recurring item "${r.name || r.id}" amount`, { allowNegative: false, required: true });
            }
            for (const h of rawVault.history) {
                parseFiniteNumber(h.totalAssets ?? h.total_assets, `History record total assets`, { allowNegative: false, required: true });
                parseFiniteNumber(h.totalLiabilities ?? h.total_liabilities, `History record total liabilities`, { allowNegative: false, required: true });
                parseFiniteNumber(h.netWorth ?? h.net_worth, `History record net worth`, { allowNegative: true, required: true });
            }
            for (const cf of rawVault.cashFlow) {
                validateMonth(cf.month);
                parseFiniteNumber(cf.income, `Cash flow entry income`, { allowNegative: false, required: true });
                parseFiniteNumber(cf.expenses, `Cash flow entry expenses`, { allowNegative: false, required: true });
            }

            // Execute Version 1 Restore - Wipe ONLY legacy tables, PRESERVE all m1_ tables!
            const v1RestoreTx = db.transaction(() => {
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM recurring_schedules WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM net_worth_snapshots WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM cash_flow_summaries WHERE user_id = 'local_user'").run();
                db.prepare("DELETE FROM settings").run();

                // Legacy assets/liabilities arrays (old v1 archives) map into the PRESERVED
                // ledger via the shared backfill — rows already present as accounts are skipped.
                if (Array.isArray(rawVault.assets) || Array.isArray(rawVault.liabilities)) {
                    backfillLegacyLedgerFromPayload(db, {
                        assets: Array.isArray(rawVault.assets) ? rawVault.assets : [],
                        liabilities: Array.isArray(rawVault.liabilities) ? rawVault.liabilities : [],
                        settings: rawVault.settings,
                        profile: rawVault.profile
                    });
                }

                const insertGoal = db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
                    VALUES (@id, @user_id, @name, @target_amount, @current_amount, @start_amount, @currency, @category, @deadline, @created_at)
                `);
                for (const g of rawVault.goals) {
                    insertGoal.run({
                        id: g.id || crypto.randomUUID(),
                        user_id: g.user_id || 'local_user',
                        name: g.name || 'Unnamed Goal',
                        target_amount: Number(g.target_amount),
                        current_amount: g.current_amount !== undefined && g.current_amount !== null ? Number(g.current_amount) : 0,
                        start_amount: g.start_amount !== undefined && g.start_amount !== null ? Number(g.start_amount) : 0,
                        currency: g.currency || 'USD',
                        category: g.category || 'General',
                        deadline: g.deadline || null,
                        created_at: g.created_at || new Date().toISOString()
                    });
                }

                const insertRec = db.prepare(`
                    INSERT INTO recurring_schedules (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
                    VALUES (@id, @user_id, @name, @amount, @type, @frequency, @category, @start_date, @end_date, @is_active, @currency, @created_at)
                `);
                for (const r of rawVault.recurring) {
                    insertRec.run({
                        id: r.id || crypto.randomUUID(),
                        user_id: r.user_id || 'local_user',
                        name: r.name || 'Unnamed Item',
                        amount: Number(r.amount),
                        type: r.type || 'expense',
                        frequency: r.frequency || 'monthly',
                        category: r.category || 'General',
                        start_date: r.start_date || new Date().toISOString().split('T')[0],
                        end_date: r.end_date || null,
                        is_active: r.is_active !== false ? 1 : 0,
                        currency: r.currency || 'USD',
                        created_at: r.created_at || new Date().toISOString()
                    });
                }

                const insertHistory = db.prepare(`
                    INSERT INTO net_worth_snapshots (id, user_id, date, total_assets, total_liabilities, net_worth, currency)
                    VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth, @currency)
                `);
                for (const h of rawVault.history) {
                    insertHistory.run({
                        id: h.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        date: h.date,
                        total_assets: Number(h.totalAssets ?? h.total_assets),
                        total_liabilities: Number(h.totalLiabilities ?? h.total_liabilities),
                        net_worth: Number(h.netWorth ?? h.net_worth),
                        currency: h.currency || null
                    });
                }

                const insertCashFlow = db.prepare(`
                    INSERT INTO cash_flow_summaries (id, user_id, month, income, expenses, currency)
                    VALUES (@id, @user_id, @month, @income, @expenses, @currency)
                `);
                for (const cf of rawVault.cashFlow) {
                    insertCashFlow.run({
                        id: cf.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        month: cf.month,
                        income: Number(cf.income),
                        expenses: Number(cf.expenses),
                        currency: cf.currency || 'USD'
                    });
                }

                const upsertSetting = db.prepare(`
                    INSERT INTO settings (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `);
                for (const [k, v] of Object.entries(rawVault.settings)) {
                    upsertSetting.run(k, typeof v === 'string' ? v : JSON.stringify(v));
                }
            });

            v1RestoreTx();
            return secureJson({ success: true, message: 'Legacy vault data restored. Existing modern accounting records preserved.' });
        }

        // --- ORDINARY SYNCHRONIZATION OR SAVE ---
        // Why: Ordinary synchronizations must NEVER clear unrelated tables or modern accounting records.
        const syncTransaction = db.transaction(() => {
            // NOTE: ordinary sync no longer accepts assets/liabilities arrays — the m0
            // tables are retired by migration 0007; asset/liability writes go through
            // /api/accounting (createAccount / journal entries).

            if (Array.isArray(rawVault.goals)) {
                db.prepare("DELETE FROM goals WHERE user_id = 'local_user'").run();
                const insertGoal = db.prepare(`
                    INSERT INTO goals (id, user_id, name, target_amount, current_amount, start_amount, currency, category, deadline, created_at)
                    VALUES (@id, @user_id, @name, @target_amount, @current_amount, @start_amount, @currency, @category, @deadline, @created_at)
                `);
                for (const g of rawVault.goals) {
                    const target_amount = parseFiniteNumber(g.target_amount, `Goal "${g.name || g.id}" target amount`, { allowNegative: false, required: true });
                    const current_amount = parseFiniteNumber(g.current_amount, `Goal "${g.name || g.id}" current amount`, { allowNegative: false, required: false });
                    const start_amount = parseFiniteNumber(g.start_amount, `Goal "${g.name || g.id}" start amount`, { allowNegative: false, required: false });
                    insertGoal.run({
                        id: g.id || crypto.randomUUID(),
                        user_id: g.user_id || 'local_user',
                        name: g.name || 'Unnamed Goal',
                        target_amount,
                        current_amount,
                        start_amount,
                        currency: g.currency || 'USD',
                        category: g.category || 'General',
                        deadline: g.deadline || null,
                        created_at: g.created_at || new Date().toISOString()
                    });
                }
            }

            if (Array.isArray(rawVault.recurring)) {
                db.prepare("DELETE FROM recurring_schedules WHERE user_id = 'local_user'").run();
                const insertRec = db.prepare(`
                    INSERT INTO recurring_schedules (id, user_id, name, amount, type, frequency, category, start_date, end_date, is_active, currency, created_at)
                    VALUES (@id, @user_id, @name, @amount, @type, @frequency, @category, @start_date, @end_date, @is_active, @currency, @created_at)
                `);
                for (const r of rawVault.recurring) {
                    const amount = parseFiniteNumber(r.amount, `Recurring item "${r.name || r.id}" amount`, { allowNegative: false, required: true });
                    insertRec.run({
                        id: r.id || crypto.randomUUID(),
                        user_id: r.user_id || 'local_user',
                        name: r.name || 'Unnamed Item',
                        amount,
                        type: r.type || 'expense',
                        frequency: r.frequency || 'monthly',
                        category: r.category || 'General',
                        start_date: r.start_date || new Date().toISOString().split('T')[0],
                        end_date: r.end_date || null,
                        is_active: r.is_active !== false ? 1 : 0,
                        currency: r.currency || 'USD',
                        created_at: r.created_at || new Date().toISOString()
                    });
                }
            }

            if (Array.isArray(rawVault.history)) {
                db.prepare("DELETE FROM net_worth_snapshots WHERE user_id = 'local_user'").run();
                const insertHistory = db.prepare(`
                    INSERT INTO net_worth_snapshots (id, user_id, date, total_assets, total_liabilities, net_worth, currency)
                    VALUES (@id, @user_id, @date, @total_assets, @total_liabilities, @net_worth, @currency)
                `);
                for (const h of rawVault.history) {
                    const total_assets = parseFiniteNumber(h.totalAssets ?? h.total_assets, `History record ${h.date} total assets`, { allowNegative: false, required: true });
                    const total_liabilities = parseFiniteNumber(h.totalLiabilities ?? h.total_liabilities, `History record ${h.date} total liabilities`, { allowNegative: false, required: true });
                    const net_worth = parseFiniteNumber(h.netWorth ?? h.net_worth, `History record ${h.date} net worth`, { allowNegative: true, required: true });
                    const currency = (h.currency && typeof h.currency === 'string') ? h.currency : null;
                    insertHistory.run({
                        id: h.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        date: h.date,
                        total_assets,
                        total_liabilities,
                        net_worth,
                        currency
                    });
                }
            }

            if (Array.isArray(rawVault.cashFlow)) {
                db.prepare("DELETE FROM cash_flow_summaries WHERE user_id = 'local_user'").run();
                const insertCashFlow = db.prepare(`
                    INSERT INTO cash_flow_summaries (id, user_id, month, income, expenses, currency)
                    VALUES (@id, @user_id, @month, @income, @expenses, @currency)
                `);
                for (const cf of rawVault.cashFlow) {
                    const month = validateMonth(cf.month);
                    const income = parseFiniteNumber(cf.income, `Cash flow entry ${cf.month} income`, { allowNegative: false, required: true });
                    const expenses = parseFiniteNumber(cf.expenses, `Cash flow entry ${cf.month} expenses`, { allowNegative: false, required: true });
                    insertCashFlow.run({
                        id: cf.id || crypto.randomUUID(),
                        user_id: 'local_user',
                        month,
                        income,
                        expenses,
                        currency: cf.currency || 'USD'
                    });
                }
            }

            if (rawVault.settings && typeof rawVault.settings === 'object') {
                const upsertSetting = db.prepare(`
                    INSERT INTO settings (key, value)
                    VALUES (?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value
                `);
                for (const [k, v] of Object.entries(rawVault.settings)) {
                    upsertSetting.run(k, typeof v === 'string' ? v : JSON.stringify(v));
                }
            }

            if (rawVault.profile) {
                db.prepare(`
                    INSERT INTO profiles (id, email, full_name, privacy_mode, currency_code, created_at)
                    VALUES ('local_user', @email, @full_name, @privacy_mode, @currency_code, @created_at)
                    ON CONFLICT(id) DO UPDATE SET
                        full_name = excluded.full_name,
                        currency_code = excluded.currency_code,
                        privacy_mode = excluded.privacy_mode
                `).run({
                    email: rawVault.profile.email || 'local@device',
                    full_name: rawVault.profile.full_name || 'Local Vault Owner',
                    privacy_mode: rawVault.profile.privacy_mode ? 1 : 0,
                    currency_code: rawVault.profile.currency_code || 'USD',
                    created_at: rawVault.profile.created_at || new Date().toISOString()
                });
            }
        });

        syncTransaction();

        return secureJson({ success: true, message: 'Vault saved to local SQLite successfully' });
    } catch (error: any) {
        console.error('Vault POST Error:', error);
        const status = error instanceof ValidationError || error.name === 'ValidationError' || error.statusCode === 400 ? 400 : 500;
        return secureJson({ error: error.message || 'Internal database error' }, { status });
    }
}
