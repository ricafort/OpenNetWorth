/**
 * Double-Entry Accounting Relational Database Schema
 *
 * Why this file exists:
 * Defines the DDL schema for OpenNetWorth's double-entry accounting engine:
 * entities, financial accounts, ownership shares, transactions, journal entries,
 * and auditable correction trails.
 *
 * Tricky logic:
 * - Foreign keys enforce referential integrity between postings and transactions.
 * - Idempotency key uniqueness on transactions prevents duplicate submissions on retry.
 * - Optimistic concurrency control is backed by `revision INTEGER NOT NULL DEFAULT 1`.
 *
 * TODO: Add partitioned tables for high-volume enterprise ledgers in future milestones.
 */

import Database from 'better-sqlite3';

export const ACCOUNTING_SCHEMA_DDL = `
    -- Entities (Persons, Households, Businesses, Trusts)
    CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('person', 'household', 'business', 'trust')),
        currency TEXT NOT NULL DEFAULT 'USD',
        parent_entity_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_entity_id) REFERENCES entities(id) ON DELETE SET NULL
    );

    -- Financial Accounts
    CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense', 'suspense')),
        sub_type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        is_active INTEGER NOT NULL DEFAULT 1,
        institution TEXT,
        account_number_mask TEXT,
        opening_date TEXT,
        opening_balance_cents INTEGER,
        tracking_mode TEXT NOT NULL DEFAULT 'transactions' CHECK (tracking_mode IN ('balance', 'transactions')),
        balance_revision INTEGER NOT NULL DEFAULT 1,
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
    );

    -- Account Ownership Allocations (e.g. 50/50 joint property)
    CREATE TABLE IF NOT EXISTS account_ownership (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        share_percentage REAL NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        UNIQUE(account_id, entity_id)
    );

    -- Transactions (Header)
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL, -- YYYY-MM-DD
        description TEXT NOT NULL,
        payee_or_payer TEXT,
        status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
        origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'document_extraction', 'opening_balance', 'migration', 'recurring')),
        idempotency_key TEXT UNIQUE,
        evidence_refs TEXT, -- JSON array of evidence reference strings
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- Journal Entries / Postings (Legs)
    CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL, -- Signed integer: positive = Debit, negative = Credit
        currency TEXT NOT NULL,
        exchange_rate REAL,
        rate_unresolved INTEGER DEFAULT 0,
        memo TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Auditable Transaction Corrections
    CREATE TABLE IF NOT EXISTS transaction_corrections (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('edit', 'void', 'reversal', 'revaluation_cascade')),
        reason TEXT NOT NULL,
        previous_state TEXT NOT NULL, -- JSON string
        corrected_state TEXT NOT NULL, -- JSON string
        performed_by TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    -- Dated Exchange Rates (Slice 1D: Currency Completeness & Conversion)
    CREATE TABLE IF NOT EXISTS exchange_rates (
        id TEXT PRIMARY KEY,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate REAL NOT NULL CHECK (rate > 0),
        effective_date TEXT NOT NULL, -- YYYY-MM-DD
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(from_currency, to_currency, effective_date)
    );

    -- Asset Valuations (Slice 1D: Historical Valuation Target Tracking & Cascading)
    -- Why this table exists:
    -- Preserves the absolute target valuation for non-cash assets across time.
    -- When earlier or backdated valuations are inserted, subsequent valuation transactions
    -- can be cascaded so that later valuation targets are strictly preserved (M1-FLOW-06, T6).
    CREATE TABLE IF NOT EXISTS asset_valuations (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL UNIQUE,
        account_id TEXT NOT NULL,
        valuation_date TEXT NOT NULL,
        target_valuation_cents INTEGER NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    -- Indices for high performance ledger and report queries
    CREATE INDEX IF NOT EXISTS idx_journal_entries_account ON journal_entries(account_id);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_tx ON journal_entries(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_accounts_entity ON accounts(entity_id);
    CREATE INDEX IF NOT EXISTS idx_account_ownership_acc ON account_ownership(account_id);
    CREATE INDEX IF NOT EXISTS idx_account_ownership_ent ON account_ownership(entity_id);
    CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, effective_date);
    CREATE INDEX IF NOT EXISTS idx_asset_valuations_acc_date ON asset_valuations(account_id, valuation_date);

    -- Draft Items (Personally Paid Business Expenses & Unresolved Financial Tasks)
    -- Why this table exists:
    -- Persists financial drafts directly into SQLite vault storage.
    -- Separates payer entity from payment account and allows missing facts to remain explicitly unresolved.
    -- Completely excluded from double-entry journal postings until finalized.
    CREATE TABLE IF NOT EXISTS drafts (
        id TEXT PRIMARY KEY,
        entity_id TEXT,
        payer_entity_id TEXT,
        payment_account_id TEXT,
        currency TEXT,
        amount_cents INTEGER,
        date TEXT,
        merchant TEXT,
        description TEXT,
        reimbursement_intent TEXT CHECK (reimbursement_intent IN ('yes', 'no', 'not_sure') OR reimbursement_intent IS NULL),
        source_document_id TEXT,
        source_transaction_id TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL,
        FOREIGN KEY (payer_entity_id) REFERENCES entities(id) ON DELETE SET NULL,
        FOREIGN KEY (payment_account_id) REFERENCES accounts(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_drafts_entity ON drafts(entity_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_payer ON drafts(payer_entity_id);

    -- Reimbursement Workflows (Batch D1)
    -- Why this table exists:
    -- Uses one durable workflow reference linking the draft, source transaction, evidence,
    -- both transactions and reimbursement. Identifies clearing accounts by owner pair and currency.
    CREATE TABLE IF NOT EXISTS reimbursement_workflows (
        id TEXT PRIMARY KEY,
        personal_entity_id TEXT NOT NULL,
        business_entity_id TEXT NOT NULL,
        currency TEXT NOT NULL,
        due_from_account_id TEXT NOT NULL,
        due_to_account_id TEXT NOT NULL,
        draft_id TEXT,
        evidence_document_id TEXT,
        personal_transaction_id TEXT NOT NULL,
        business_transaction_id TEXT NOT NULL,
        personal_reimbursement_tx_id TEXT,
        business_reimbursement_tx_id TEXT,
        amount_cents INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'awaiting_reimbursement' CHECK (status IN ('awaiting_reimbursement', 'reimbursed', 'cancelled')),
        last_undo_request TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (personal_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (business_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (due_from_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (due_to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (personal_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
        FOREIGN KEY (business_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
        FOREIGN KEY (personal_reimbursement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL,
        FOREIGN KEY (business_reimbursement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL,
        FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reimb_workflow_pers ON reimbursement_workflows(personal_entity_id);
    CREATE INDEX IF NOT EXISTS idx_reimb_workflow_bus ON reimbursement_workflows(business_entity_id);

    -- Dated Balance Observations (Slice 1H / Delivery 1: Balance Updates & Account Reconciliation)
    -- Why this table exists:
    -- Records reported balances as evidence from statements, CSVs, manual entries, or APIs.
    -- Bypasses legacy floating-point tables and preserves balance semantics (posted, available, limit, portfolio).
    -- Delivery 2A: Preserves verbatim source excerpts, tracks user modifications, flags portfolio components,
    -- and links back to the originating import batch for end-to-end evidence traceability.
    CREATE TABLE IF NOT EXISTS balance_observations (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL,
        balance_kind TEXT NOT NULL CHECK (balance_kind IN (
            'posted_balance',
            'current_balance',
            'available_balance',
            'statement_closing_balance',
            'credit_limit',
            'available_credit',
            'outstanding_loan_principal',
            'available_redraw',
            'brokerage_cash',
            'buying_power',
            'securities_market_value',
            'total_portfolio_value',
            'projected_future_value',
            'unresolved'
        )),
        effective_date TEXT NOT NULL, -- YYYY-MM-DD
        effective_time TEXT,
        imported_at TEXT NOT NULL,
        source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'table_paste', 'document', 'api')),
        source_reference TEXT,
        source_batch_id TEXT,
        source_excerpt TEXT,
        is_user_modified INTEGER NOT NULL DEFAULT 0,
        is_component_of_total INTEGER NOT NULL DEFAULT 0,
        parent_observation_id TEXT,
        -- Delivery 2B: Evidence links to retained PDF documents and specific page numbers
        document_id TEXT,
        page_number INTEGER,
        superseded_by_id TEXT,
        review_status TEXT NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed', 'accepted', 'superseded', 'rejected')),
        raw_label TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (superseded_by_id) REFERENCES balance_observations(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_observation_id) REFERENCES balance_observations(id) ON DELETE SET NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_obs_account_date ON balance_observations(account_id, effective_date);
    CREATE INDEX IF NOT EXISTS idx_obs_status ON balance_observations(review_status);
    CREATE INDEX IF NOT EXISTS idx_obs_batch ON balance_observations(source_batch_id);
    -- Note: idx_obs_doc is created in migrateAccountingSchema() to ensure safe forward-migration
    -- on databases that were created before the document_id column existed.

    -- Balance Import Batches (Delivery 2A: Evidence Preservation for Raw Pasted Statement Text)
    -- Why this table exists:
    -- Retains the exact verbatim pasted statement text once per batch, associating individual balance observations
    -- with their originating import batch, extraction method, and model identifier for full provenance and auditability.
    CREATE TABLE IF NOT EXISTS balance_import_batches (
        id TEXT PRIMARY KEY,
        raw_text TEXT NOT NULL,
        extraction_method TEXT NOT NULL,
        model_identifier TEXT,
        created_at TEXT NOT NULL
    );

    -- Account Source Mappings (delivery 1: Confirmed mappings between external institutions and internal accounts)
    CREATE TABLE IF NOT EXISTS account_source_mappings (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        connection_id TEXT NOT NULL DEFAULT 'default',
        source_account_id TEXT NOT NULL,
        institution TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(provider, connection_id, source_account_id),
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_asm_account ON account_source_mappings(account_id);

    -- Categorization Rules (Batch C3: Remember deliberate categorisation choices)
    CREATE TABLE IF NOT EXISTS categorization_rules (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        match_string TEXT NOT NULL,
        match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains')),
        target_category TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_cat_rules_account ON categorization_rules(account_id);

    -- Statement Reviews (Delivery 2B: Durable Pending Review State)
    -- Why this table exists:
    -- Preserves in-flight parsed statement proposals, per-page coverage summaries,
    -- and user edits across browser reloads before the user explicitly commits them.
    --
    -- Tricky logic:
    -- Status transitions from 'pending_review' -> 'saved' when explicit save occurs.
    -- On reload, the user can resume editing their proposals without losing modifications.
    --
    -- TODO: Add support for multi-statement batch review sessions in future milestones.
    CREATE TABLE IF NOT EXISTS statement_reviews (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('pending_review', 'saved', 'failed')),
        proposals_json TEXT NOT NULL,
        coverage_summary_json TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_stmt_rev_doc ON statement_reviews(document_id);
    CREATE INDEX IF NOT EXISTS idx_stmt_rev_status ON statement_reviews(status);

    -- Evidence Links (Slice 1D: receipts/documents anchored to ledger transactions)
    -- Promoted from test-only fixtures into the canonical schema by migration 0005.
    CREATE TABLE IF NOT EXISTS evidence_links (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        document_id TEXT NOT NULL,
        content_hash TEXT,
        page_number INTEGER,
        bounding_box TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_evidence_links_tx ON evidence_links(transaction_id);
`;

/**
 * Transactionally upgrades an existing SQLite database schema to match the latest
 * accounting schema requirements (Assessor Finding 1).
 * 
 * Why this exists:
 * In SQLite, `CREATE TABLE IF NOT EXISTS` does not modify existing tables if new columns
 * or CHECK constraints are added in later versions.
 * When an application database is opened that was created on an earlier commit:
 * 1. `asset_valuations` may lack the `source TEXT` column.
 * 2. `transaction_corrections` may have an older CHECK constraint lacking `'revaluation_cascade'`.
 * This function inspects the existing table structures and transactionally upgrades them
 * without altering existing rows, balances, revisions, evidence, or audit records.
 * 
 * Tricky logic:
 * - In SQLite, CHECK constraints cannot be updated with `ALTER TABLE`.
 *   We use the standard SQLite table migration pattern:
 *   1. Create `transaction_corrections_new` with the updated CHECK constraint.
 *   2. Copy all existing rows from `transaction_corrections`.
 *   3. Drop `transaction_corrections`.
 *   4. Rename `transaction_corrections_new` to `transaction_corrections`.
 * - All operations execute inside an explicit `db.transaction()` block.
 * - Foreign keys are temporarily set to OFF during table replacement to prevent foreign key errors on drop/rename.
 * 
 * TODO: Support automated forward-migration logging in `schema_migrations` table for multi-version tracking in Milestone 2.
 */
export function migrateAccountingSchema(db: Database.Database): void {
    const runMigration = db.transaction(() => {
        // 1. Check if asset_valuations table exists
        const valTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'asset_valuations'"
        ).get() as any).cnt > 0;

        if (valTableExists) {
            const columns = db.prepare("PRAGMA table_info(asset_valuations)").all() as Array<{ name: string }>;
            const hasSource = columns.some(c => c.name === 'source');
            if (!hasSource) {
                db.prepare("ALTER TABLE asset_valuations ADD COLUMN source TEXT").run();
            }
        }

        // 2. Check if transaction_corrections table exists and needs CHECK constraint upgrade
        const corrTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'transaction_corrections'"
        ).get() as any).cnt > 0;

        if (corrTableExists) {
            const tableSql = (db.prepare(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'transaction_corrections'"
            ).get() as any)?.sql || '';

            // If the table definition does not include 'revaluation_cascade', upgrade it
            if (!tableSql.includes('revaluation_cascade')) {
                // Table rebuild pattern
                db.prepare(`
                    CREATE TABLE transaction_corrections_new (
                        id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL,
                        operation TEXT NOT NULL CHECK (operation IN ('edit', 'void', 'reversal', 'revaluation_cascade')),
                        reason TEXT NOT NULL,
                        previous_state TEXT NOT NULL,
                        corrected_state TEXT NOT NULL,
                        performed_by TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
                    )
                `).run();

                db.prepare(`
                    INSERT INTO transaction_corrections_new (
                        id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
                    ) SELECT id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
                    FROM transaction_corrections
                `).run();

                db.prepare("DROP TABLE transaction_corrections").run();
                db.prepare("ALTER TABLE transaction_corrections_new RENAME TO transaction_corrections").run();
            }
        }

        // 3. Ensure drafts table and indices exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS drafts (
                id TEXT PRIMARY KEY,
                entity_id TEXT,
                payer_entity_id TEXT,
                payment_account_id TEXT,
                currency TEXT,
                amount_cents INTEGER,
                date TEXT,
                merchant TEXT,
                description TEXT,
                reimbursement_intent TEXT CHECK (reimbursement_intent IN ('yes', 'no', 'not_sure') OR reimbursement_intent IS NULL),
                source_document_id TEXT,
                source_transaction_id TEXT,
                status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void', 'archived')),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL,
                FOREIGN KEY (payer_entity_id) REFERENCES entities(id) ON DELETE SET NULL,
                FOREIGN KEY (payment_account_id) REFERENCES accounts(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_drafts_entity ON drafts(entity_id);
            CREATE INDEX IF NOT EXISTS idx_drafts_payer ON drafts(payer_entity_id);
        `);

        // 4. Check if accounts table exists and needs tracking_mode or balance_revision columns
        const accTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'accounts'"
        ).get() as any).cnt > 0;

        if (accTableExists) {
            const accColumns = db.prepare("PRAGMA table_info(accounts)").all() as Array<{ name: string }>;
            const hasTrackingMode = accColumns.some(c => c.name === 'tracking_mode');
            if (!hasTrackingMode) {
                db.prepare("ALTER TABLE accounts ADD COLUMN tracking_mode TEXT NOT NULL DEFAULT 'transactions' CHECK (tracking_mode IN ('balance', 'transactions'))").run();
            }
            const hasBalanceRev = accColumns.some(c => c.name === 'balance_revision');
            if (!hasBalanceRev) {
                db.prepare("ALTER TABLE accounts ADD COLUMN balance_revision INTEGER NOT NULL DEFAULT 1").run();
            }
        }

        // 5. Ensure balance_import_batches, balance_observations, and account_source_mappings tables exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS balance_import_batches (
                id TEXT PRIMARY KEY,
                raw_text TEXT NOT NULL,
                extraction_method TEXT NOT NULL,
                model_identifier TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS balance_observations (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                amount_cents INTEGER NOT NULL,
                currency TEXT NOT NULL,
                balance_kind TEXT NOT NULL CHECK (balance_kind IN (
                    'posted_balance',
                    'current_balance',
                    'available_balance',
                    'statement_closing_balance',
                    'credit_limit',
                    'available_credit',
                    'outstanding_loan_principal',
                    'available_redraw',
                    'brokerage_cash',
                    'buying_power',
                    'securities_market_value',
                    'total_portfolio_value',
                    'projected_future_value',
                    'unresolved'
                )),
                effective_date TEXT NOT NULL,
                effective_time TEXT,
                imported_at TEXT NOT NULL,
                source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'table_paste', 'document', 'api')),
                source_reference TEXT,
                source_batch_id TEXT,
                source_excerpt TEXT,
                is_user_modified INTEGER NOT NULL DEFAULT 0,
                is_component_of_total INTEGER NOT NULL DEFAULT 0,
                parent_observation_id TEXT,
                superseded_by_id TEXT,
                review_status TEXT NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed', 'accepted', 'superseded', 'rejected')),
                raw_label TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
                FOREIGN KEY (superseded_by_id) REFERENCES balance_observations(id) ON DELETE SET NULL,
                FOREIGN KEY (parent_observation_id) REFERENCES balance_observations(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_obs_account_date ON balance_observations(account_id, effective_date);
            CREATE INDEX IF NOT EXISTS idx_obs_status ON balance_observations(review_status);
            CREATE INDEX IF NOT EXISTS idx_obs_batch ON balance_observations(source_batch_id);

            CREATE TABLE IF NOT EXISTS account_source_mappings (
                id TEXT PRIMARY KEY,
                account_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                connection_id TEXT NOT NULL DEFAULT 'default',
                source_account_id TEXT NOT NULL,
                institution TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(provider, connection_id, source_account_id),
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_asm_account ON account_source_mappings(account_id);
        `);

        // 6. Check if balance_observations needs newly introduced evidence columns
        const obsColumns = db.prepare("PRAGMA table_info(balance_observations)").all() as Array<{ name: string }>;
        if (obsColumns.length > 0) {
            if (!obsColumns.some(c => c.name === 'source_excerpt')) {
                db.prepare("ALTER TABLE balance_observations ADD COLUMN source_excerpt TEXT").run();
            }
            if (!obsColumns.some(c => c.name === 'is_user_modified')) {
                db.prepare("ALTER TABLE balance_observations ADD COLUMN is_user_modified INTEGER NOT NULL DEFAULT 0").run();
            }
            if (!obsColumns.some(c => c.name === 'is_component_of_total')) {
                db.prepare("ALTER TABLE balance_observations ADD COLUMN is_component_of_total INTEGER NOT NULL DEFAULT 0").run();
            }
            if (!obsColumns.some(c => c.name === 'parent_observation_id')) {
                db.prepare("ALTER TABLE balance_observations ADD COLUMN parent_observation_id TEXT").run();
            }
            // Delivery 2B: Document evidence links and page number tracking
            // Why this exists:
            // Upgrades existing databases to retain PDF document foreign keys and page numbers.
            // Tricky logic:
            // We must add the columns first before creating idx_obs_doc to prevent SQLite "no such column: document_id" errors.
            // We create idx_obs_doc unconditionally once document_id is guaranteed to exist on both fresh and migrated vaults.
            // TODO: In Milestone 2, partition observation indices by review status if rows exceed 100k.
            if (!obsColumns.some(c => c.name === 'document_id')) {
                db.prepare("ALTER TABLE balance_observations ADD COLUMN document_id TEXT").run();
            }
            if (!obsColumns.some(c => c.name === 'page_number')) {
                db.prepare("ALTER TABLE balance_observations ADD COLUMN page_number INTEGER").run();
            }
            db.prepare("CREATE INDEX IF NOT EXISTS idx_obs_doc ON balance_observations(document_id)").run();
        }

        // 7. Check if statement_reviews table exists (Delivery 2B: Durable Pending Review State)
        db.exec(`
            CREATE TABLE IF NOT EXISTS statement_reviews (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL CHECK (status IN ('pending_review', 'saved', 'failed')),
                proposals_json TEXT NOT NULL,
                coverage_summary_json TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_stmt_rev_doc ON statement_reviews(document_id);
            CREATE INDEX IF NOT EXISTS idx_stmt_rev_status ON statement_reviews(status);
        `);

        const stmtRevCols = db.prepare("PRAGMA table_info(statement_reviews)").all() as Array<{ name: string }>;
        if (stmtRevCols.length > 0 && !stmtRevCols.some(c => c.name === 'version')) {
            db.prepare("ALTER TABLE statement_reviews ADD COLUMN version INTEGER NOT NULL DEFAULT 1").run();
        }
        // 5. Ensure categorization_rules exists (Batch C3)
        const catRulesTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'categorization_rules'"
        ).get() as any).cnt > 0;

        if (!catRulesTableExists) {
            db.prepare(`
                CREATE TABLE IF NOT EXISTS categorization_rules (
                    id TEXT PRIMARY KEY,
                    account_id TEXT NOT NULL,
                    match_string TEXT NOT NULL,
                    match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains')),
                    target_category TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
                )
            `).run();
            db.prepare(`CREATE INDEX IF NOT EXISTS idx_cat_rules_account ON categorization_rules(account_id)`).run();
        }

        // 6. Ensure reimbursement_workflows exists (Batch D1)
        const reimbTableExists = (db.prepare(
            "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'reimbursement_workflows'"
        ).get() as any).cnt > 0;

        if (!reimbTableExists) {
            db.prepare(`
                CREATE TABLE IF NOT EXISTS reimbursement_workflows (
                    id TEXT PRIMARY KEY,
                    personal_entity_id TEXT NOT NULL,
                    business_entity_id TEXT NOT NULL,
                    currency TEXT NOT NULL,
                    due_from_account_id TEXT NOT NULL,
                    due_to_account_id TEXT NOT NULL,
                    draft_id TEXT,
                    evidence_document_id TEXT,
                    personal_transaction_id TEXT NOT NULL,
                    business_transaction_id TEXT NOT NULL,
                    personal_reimbursement_tx_id TEXT,
                    business_reimbursement_tx_id TEXT,
                    amount_cents INTEGER NOT NULL,
                    status TEXT NOT NULL DEFAULT 'awaiting_reimbursement' CHECK (status IN ('awaiting_reimbursement', 'reimbursed')),
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (personal_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
                    FOREIGN KEY (business_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
                    FOREIGN KEY (due_from_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
                    FOREIGN KEY (due_to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
                    FOREIGN KEY (personal_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
                    FOREIGN KEY (business_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
                    FOREIGN KEY (personal_reimbursement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL,
                    FOREIGN KEY (business_reimbursement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL,
                    FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE SET NULL
                )
            `).run();
            db.prepare(`CREATE INDEX IF NOT EXISTS idx_reimb_workflow_pers ON reimbursement_workflows(personal_entity_id)`).run();
            db.prepare(`CREATE INDEX IF NOT EXISTS idx_reimb_workflow_bus ON reimbursement_workflows(business_entity_id)`).run();
        } else {
            // Check for legacy reimbursement_transaction_id column
            const reimbCols = db.prepare("PRAGMA table_info(reimbursement_workflows)").all() as Array<{ name: string }>;
            if (reimbCols.some(c => c.name === 'reimbursement_transaction_id')) {
                db.prepare(`
                    CREATE TABLE reimbursement_workflows_new (
                        id TEXT PRIMARY KEY,
                        personal_entity_id TEXT NOT NULL,
                        business_entity_id TEXT NOT NULL,
                        currency TEXT NOT NULL,
                        due_from_account_id TEXT NOT NULL,
                        due_to_account_id TEXT NOT NULL,
                        draft_id TEXT,
                        evidence_document_id TEXT,
                        personal_transaction_id TEXT NOT NULL,
                        business_transaction_id TEXT NOT NULL,
                        personal_reimbursement_tx_id TEXT,
                        business_reimbursement_tx_id TEXT,
                        amount_cents INTEGER NOT NULL,
                        status TEXT NOT NULL DEFAULT 'awaiting_reimbursement' CHECK (status IN ('awaiting_reimbursement', 'reimbursed')),
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (personal_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
                        FOREIGN KEY (business_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
                        FOREIGN KEY (due_from_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
                        FOREIGN KEY (due_to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
                        FOREIGN KEY (personal_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
                        FOREIGN KEY (business_transaction_id) REFERENCES transactions(id) ON DELETE RESTRICT,
                        FOREIGN KEY (personal_reimbursement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL,
                        FOREIGN KEY (business_reimbursement_tx_id) REFERENCES transactions(id) ON DELETE SET NULL,
                        FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE SET NULL
                    )
                `).run();
                
                db.prepare(`
                    INSERT INTO reimbursement_workflows_new (
                        id, personal_entity_id, business_entity_id, currency, due_from_account_id, due_to_account_id,
                        draft_id, evidence_document_id, personal_transaction_id, business_transaction_id,
                        personal_reimbursement_tx_id, business_reimbursement_tx_id, amount_cents, status, created_at, updated_at
                    )
                    SELECT 
                        id, personal_entity_id, business_entity_id, currency, due_from_account_id, due_to_account_id,
                        draft_id, evidence_document_id, personal_transaction_id, business_transaction_id,
                        reimbursement_transaction_id as personal_reimbursement_tx_id, NULL as business_reimbursement_tx_id,
                        amount_cents, status, created_at, updated_at
                    FROM reimbursement_workflows
                `).run();
                
                db.prepare("DROP TABLE reimbursement_workflows").run();
                db.prepare("ALTER TABLE reimbursement_workflows_new RENAME TO reimbursement_workflows").run();
                db.prepare(`CREATE INDEX IF NOT EXISTS idx_reimb_workflow_pers ON reimbursement_workflows(personal_entity_id)`).run();
                db.prepare(`CREATE INDEX IF NOT EXISTS idx_reimb_workflow_bus ON reimbursement_workflows(business_entity_id)`).run();
            }
        }
        
        try {
            db.prepare('ALTER TABLE reimbursement_workflows ADD COLUMN last_undo_request TEXT').run();
        } catch (err: any) {
            if (!err.message.includes('duplicate column name')) throw err;
        }
    });

    // Run migration safely with foreign key toggle
    const currentFk = db.prepare("PRAGMA foreign_keys").get() as any;
    const wasFkOn = currentFk?.foreign_keys === 1;
    if (wasFkOn) db.pragma("foreign_keys = OFF");
    try {
        runMigration();
    } finally {
        if (wasFkOn) db.pragma("foreign_keys = ON");
    }
}

