/**
 * Milestone 1 Document Inbox & Proposal Review Orchestration Service (Slice 1E)
 * 
 * Why this file exists:
 * Implements the domain service layer for Document Ingestion, Column Mapping Profile persistence,
 * Internal/External Duplicate Detection, and Atomic Double-Entry Approval.
 * Conforms to ADR 001: Untrusted CSV documents produce provisional proposals, and only existing
 * accounting services (`postTransaction`) record confirmed financial reality.
 * 
 * Tricky logic:
 * - Content hash uniqueness: SHA-256 hash guarantees identical files uploaded multiple times
 *   map to the same document record, preventing orphaned storage duplication.
 * - Deterministic idempotency keys (`csv:${content_hash}:row:${row_number}`): Calling approval
 *   repeatedly or reimporting an existing file results in $0 duplicate financial postings.
 * - Internal vs External Duplicate Detection: Distinguishes between duplicate lines within the
 *   same CSV file vs matching existing transactions already recorded in the ledger.
 * - Double-entry posting: Correctly signs Debits and Credits so Sum(amount_cents) === 0:
 *   - Inflow (deposit): Debit Bank Account (+cents), Credit Income/Transfer Account (-cents).
 *   - Outflow (withdrawal): Debit Expense/Transfer Account (+cents), Credit Bank Account (-cents).
 * 
 * TODO: Add automatic merchant-to-category learning based on user's past approved proposals in Slice 1F.
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import {
    BatchApproveProposalsInput,
    CsvMappingProfile,
    DocumentMetadata,
    EvidenceReference,
    ExtractedFinancialProposal,
    IngestCsvInput,
    ProposalReviewStatus,
    ValidationFinding
} from './types';
import { computeHeaderSignature, parseCsvWithMapping } from './csvParserService';
import {
    ensureExpenseAccount,
    ensureIncomeAccount,
    postTransaction
} from '../accounting/transactionService';
import { AccountSubType, CurrencyCode } from '../accounting/types';

/**
 * Computes a SHA-256 hexadecimal content hash for raw file text or binary data.
 */
export function computeContentHash(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Persists or updates a reusable bank CSV column mapping profile.
 * 
 * Why this exists:
 * Allows users to configure column mappings once and reuse them across subsequent imports.
 */
export function saveCsvMapping(
    db: Database.Database,
    mapping: Omit<CsvMappingProfile, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): CsvMappingProfile {
    const id = mapping.id || `map-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id, created_at FROM m1_csv_mappings WHERE id = ?').get(id) as any;
    const createdAt = existing ? existing.created_at : now;

    db.prepare(`
        INSERT INTO m1_csv_mappings (
            id, name, header_signature, date_column, date_format, description_column,
            amount_mode, amount_column, debit_column, credit_column, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            header_signature = excluded.header_signature,
            date_column = excluded.date_column,
            date_format = excluded.date_format,
            description_column = excluded.description_column,
            amount_mode = excluded.amount_mode,
            amount_column = excluded.amount_column,
            debit_column = excluded.debit_column,
            credit_column = excluded.credit_column,
            updated_at = excluded.updated_at
    `).run(
        id,
        mapping.name,
        mapping.header_signature,
        mapping.date_column,
        mapping.date_format,
        mapping.description_column,
        mapping.amount_mode,
        mapping.amount_column || null,
        mapping.debit_column || null,
        mapping.credit_column || null,
        createdAt,
        now
    );

    return {
        id,
        name: mapping.name,
        header_signature: mapping.header_signature,
        date_column: mapping.date_column,
        date_format: mapping.date_format,
        description_column: mapping.description_column,
        amount_mode: mapping.amount_mode,
        amount_column: mapping.amount_column || null,
        debit_column: mapping.debit_column || null,
        credit_column: mapping.credit_column || null,
        created_at: createdAt,
        updated_at: now
    };
}

/**
 * Lists all saved reusable CSV column mapping profiles.
 */
export function listCsvMappings(db: Database.Database): CsvMappingProfile[] {
    const rows = db.prepare('SELECT * FROM m1_csv_mappings ORDER BY updated_at DESC').all() as any[];
    return rows.map(r => ({
        id: r.id,
        name: r.name,
        header_signature: r.header_signature,
        date_column: r.date_column,
        date_format: r.date_format,
        description_column: r.description_column,
        amount_mode: r.amount_mode,
        amount_column: r.amount_column,
        debit_column: r.debit_column,
        credit_column: r.credit_column,
        created_at: r.created_at,
        updated_at: r.updated_at
    }));
}

/**
 * Finds a saved mapping profile that matches a given header signature.
 */
export function findMatchingMapping(db: Database.Database, headerSignature: string): CsvMappingProfile | null {
    const row = db.prepare('SELECT * FROM m1_csv_mappings WHERE header_signature = ? LIMIT 1').get(headerSignature) as any;
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        header_signature: row.header_signature,
        date_column: row.date_column,
        date_format: row.date_format,
        description_column: row.description_column,
        amount_mode: row.amount_mode,
        amount_column: row.amount_column,
        debit_column: row.debit_column,
        credit_column: row.credit_column,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

/**
 * Ingests a raw bank CSV document:
 * 1. Hashes content and stores or retrieves document record in `m1_documents`.
 * 2. Parses rows using column mapping.
 * 3. Detects internal duplicates (same file) and external duplicates (existing ledger transactions).
 * 4. Persists proposals in `m1_proposals` with `review_status = 'unreviewed'`.
 * 
 * Why this exists:
 * Bridge between untrusted external files and structured reviewable proposals.
 */
export function ingestCsvDocument(
    db: Database.Database,
    input: IngestCsvInput
): {
    document: DocumentMetadata;
    proposals: ExtractedFinancialProposal[];
    internal_duplicates_count: number;
    external_duplicates_count: number;
} {
    const contentHash = computeContentHash(input.raw_content);
    const byteSize = Buffer.byteLength(input.raw_content, 'utf8');
    const now = new Date().toISOString();

    // Verify target account exists
    const targetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.target_account_id) as any;
    if (!targetAccount) {
        throw new Error(`Target account not found: ${input.target_account_id}`);
    }

    const entityId = input.entity_id || targetAccount.entity_id;
    const currency = targetAccount.currency as CurrencyCode;

    // 1. Store or retrieve document record
    let documentId: string;
    const existingDoc = db.prepare('SELECT * FROM m1_documents WHERE content_hash = ?').get(contentHash) as any;
    if (existingDoc) {
        documentId = existingDoc.id;
    } else {
        documentId = `doc-${crypto.randomUUID()}`;
        db.prepare(`
            INSERT INTO m1_documents (id, filename, content_hash, mime_type, byte_size, raw_content, created_at)
            VALUES (?, ?, ?, 'text/csv', ?, ?, ?)
        `).run(documentId, input.filename, contentHash, byteSize, input.raw_content, now);
    }

    const docMetadata: DocumentMetadata = {
        id: documentId,
        filename: existingDoc ? existingDoc.filename : input.filename,
        content_hash: contentHash,
        mime_type: 'text/csv',
        byte_size: byteSize,
        created_at: existingDoc ? existingDoc.created_at : now
    };

    // 2. Parse CSV rows with exact account currency scale
    const parseResult = parseCsvWithMapping(input.raw_content, input.mapping, currency);

    // 3. Duplicate detection tracking
    const seenInternalRows = new Map<string, number>(); // key -> row_number
    let internalDuplicatesCount = 0;
    let externalDuplicatesCount = 0;

    // Prepare external ledger check query
    const checkLedgerStmt = db.prepare(`
        SELECT tx.id, tx.date, tx.description, je.amount_cents
        FROM m1_transactions tx
        JOIN m1_journal_entries je ON tx.id = je.transaction_id
        WHERE je.account_id = ? AND tx.date = ? AND je.amount_cents = ?
        LIMIT 1
    `);

    // Prepare proposal queries
    const getExistingPropStmt = db.prepare('SELECT * FROM m1_proposals WHERE id = ?');
    const insertPropStmt = db.prepare(`
        INSERT INTO m1_proposals (
            id, document_id, entity_id, account_id, event_date, document_period,
            original_currency, amount_cents, counterparty, description, event_type,
            suggested_category, evidence_json, extraction_version, validation_findings,
            review_status, related_proposal_ids, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateUnapprovedPropStmt = db.prepare(`
        UPDATE m1_proposals SET
            entity_id = ?,
            account_id = ?,
            event_date = ?,
            document_period = ?,
            original_currency = ?,
            amount_cents = ?,
            counterparty = ?,
            description = ?,
            event_type = ?,
            suggested_category = ?,
            evidence_json = ?,
            extraction_version = ?,
            validation_findings = ?,
            updated_at = ?
        WHERE id = ? AND review_status != 'approved'
    `);

    const proposals: ExtractedFinancialProposal[] = [];

    const saveTransaction = db.transaction(() => {
        for (const row of parseResult.rows) {
            const proposalId = `prop-${documentId}-r${row.row_number}`;
            const existingProp = getExistingPropStmt.get(proposalId) as any;

            // Requirement 2: If proposal was already approved into the ledger, preserve it unchanged!
            if (existingProp && existingProp.review_status === 'approved') {
                proposals.push({
                    id: existingProp.id,
                    document_id: existingProp.document_id,
                    entity_id: existingProp.entity_id,
                    account_id: existingProp.account_id,
                    event_date: existingProp.event_date,
                    document_period: existingProp.document_period,
                    original_currency: existingProp.original_currency,
                    amount_cents: existingProp.amount_cents,
                    counterparty: existingProp.counterparty,
                    description: existingProp.description,
                    event_type: existingProp.event_type,
                    suggested_category: existingProp.suggested_category,
                    evidence: JSON.parse(existingProp.evidence_json),
                    extraction_version: existingProp.extraction_version,
                    validation_findings: existingProp.validation_findings ? JSON.parse(existingProp.validation_findings) : [],
                    review_status: 'approved',
                    related_proposal_ids: existingProp.related_proposal_ids ? JSON.parse(existingProp.related_proposal_ids) : [],
                    created_at: existingProp.created_at,
                    updated_at: existingProp.updated_at
                });
                continue;
            }

            const findings: ValidationFinding[] = [...row.validation_findings];

            // Only perform duplicate matching on valid rows with date and amount
            if (row.date && row.amount_cents !== null) {
                // A. Internal duplicate detection (same date, same amount, same description)
                const internalKey = `${row.date}:${row.amount_cents}:${row.description.trim().toLowerCase()}`;
                if (seenInternalRows.has(internalKey)) {
                    const firstRowNumber = seenInternalRows.get(internalKey)!;
                    findings.push({
                        severity: 'warning',
                        code: 'SUSPECTED_DUPLICATE_INTERNAL',
                        message: `Row matches earlier row #${firstRowNumber} in this file with identical date and amount.`,
                        field: 'row'
                    });
                    internalDuplicatesCount++;
                } else {
                    seenInternalRows.set(internalKey, row.row_number);
                }

                // B. External duplicate detection against confirmed ledger transactions
                // Note: Posting on bank account is positive for income, negative for expense
                const expectedBankPostingCents = row.event_type === 'income'
                    ? Math.abs(row.amount_cents)
                    : -Math.abs(row.amount_cents);

                const existingTx = checkLedgerStmt.get(
                    input.target_account_id,
                    row.date,
                    expectedBankPostingCents
                ) as any;

                if (existingTx) {
                    findings.push({
                        severity: 'warning',
                        code: 'POSSIBLE_DUPLICATE_EXISTING',
                        message: `A posted transaction ("${existingTx.description}") with matching date and amount already exists on this account.`,
                        field: 'row'
                    });
                    externalDuplicatesCount++;
                }
            }

            const evidence: EvidenceReference = {
                document_id: documentId,
                content_hash: contentHash,
                cell_reference: `Row ${row.row_number}`,
                extraction_version: 'slice1e-csv-v1',
                source_snippet: row.raw_snippet
            };

            const proposal: ExtractedFinancialProposal = {
                id: proposalId,
                document_id: documentId,
                entity_id: entityId,
                account_id: input.target_account_id,
                event_date: row.date || '1970-01-01',
                document_period: row.date ? row.date.substring(0, 7) : null,
                original_currency: currency,
                amount_cents: row.amount_cents ?? 0,
                counterparty: row.description,
                description: row.description,
                event_type: row.event_type,
                suggested_category: input.default_category || (row.event_type === 'income' ? 'salary' : 'living_expense'),
                evidence,
                extraction_version: 'slice1e-csv-v1',
                validation_findings: findings,
                review_status: 'unreviewed',
                related_proposal_ids: [],
                created_at: existingProp ? existingProp.created_at : now,
                updated_at: now
            };

            if (existingProp) {
                // Requirement 2: Corrected mapping reprocessing updates unapproved proposals
                updateUnapprovedPropStmt.run(
                    proposal.entity_id,
                    proposal.account_id,
                    proposal.event_date,
                    proposal.document_period,
                    proposal.original_currency,
                    proposal.amount_cents,
                    proposal.counterparty,
                    proposal.description,
                    proposal.event_type,
                    proposal.suggested_category,
                    JSON.stringify(proposal.evidence),
                    proposal.extraction_version,
                    JSON.stringify(proposal.validation_findings),
                    now,
                    proposal.id
                );
            } else {
                insertPropStmt.run(
                    proposal.id,
                    proposal.document_id,
                    proposal.entity_id,
                    proposal.account_id,
                    proposal.event_date,
                    proposal.document_period,
                    proposal.original_currency,
                    proposal.amount_cents,
                    proposal.counterparty,
                    proposal.description,
                    proposal.event_type,
                    proposal.suggested_category,
                    JSON.stringify(proposal.evidence),
                    proposal.extraction_version,
                    JSON.stringify(proposal.validation_findings),
                    proposal.review_status,
                    JSON.stringify(proposal.related_proposal_ids),
                    proposal.created_at,
                    proposal.updated_at
                );
            }

            proposals.push(proposal);
        }
    });

    saveTransaction();

    return {
        document: docMetadata,
        proposals,
        internal_duplicates_count: internalDuplicatesCount,
        external_duplicates_count: externalDuplicatesCount
    };
}

/**
 * Lists all ingested documents along with summary proposal status statistics.
 */
export function listDocuments(db: Database.Database): Array<
    DocumentMetadata & {
        total_proposals: number;
        unreviewed_proposals: number;
        approved_proposals: number;
        rejected_proposals: number;
    }
> {
    const docs = db.prepare('SELECT * FROM m1_documents ORDER BY created_at DESC').all() as any[];
    const propStats = db.prepare(`
        SELECT
            document_id,
            COUNT(*) as total,
            SUM(CASE WHEN review_status = 'unreviewed' THEN 1 ELSE 0 END) as unreviewed,
            SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN review_status = 'rejected' THEN 1 ELSE 0 END) as rejected
        FROM m1_proposals
        GROUP BY document_id
    `).all() as any[];

    const statsMap = new Map<string, any>();
    for (const stat of propStats) {
        statsMap.set(stat.document_id, stat);
    }

    return docs.map(d => {
        const stats = statsMap.get(d.id) || { total: 0, unreviewed: 0, approved: 0, rejected: 0 };
        return {
            id: d.id,
            filename: d.filename,
            content_hash: d.content_hash,
            mime_type: d.mime_type,
            byte_size: d.byte_size,
            storage_path: d.storage_path,
            created_at: d.created_at,
            total_proposals: stats.total,
            unreviewed_proposals: stats.unreviewed,
            approved_proposals: stats.approved,
            rejected_proposals: stats.rejected
        };
    });
}

/**
 * Retrieves all proposals for a specific document with parsed JSON structures.
 */
export function getDocumentProposals(
    db: Database.Database,
    documentId: string
): ExtractedFinancialProposal[] {
    const rows = db.prepare('SELECT * FROM m1_proposals WHERE document_id = ? ORDER BY id ASC').all(documentId) as any[];

    return rows.map(r => ({
        id: r.id,
        document_id: r.document_id,
        entity_id: r.entity_id,
        account_id: r.account_id,
        event_date: r.event_date,
        document_period: r.document_period,
        original_currency: r.original_currency,
        amount_cents: r.amount_cents,
        counterparty: r.counterparty,
        description: r.description,
        event_type: r.event_type,
        suggested_category: r.suggested_category,
        evidence: JSON.parse(r.evidence_json),
        extraction_version: r.extraction_version,
        validation_findings: r.validation_findings ? JSON.parse(r.validation_findings) : [],
        review_status: r.review_status,
        related_proposal_ids: r.related_proposal_ids ? JSON.parse(r.related_proposal_ids) : [],
        created_at: r.created_at,
        updated_at: r.updated_at
    }));
}

/**
 * Atomically approves a batch of proposals:
 * 1. Checks that target accounts exist and match currencies.
 * 2. Posts balanced double-entry transactions via `postTransaction`.
 * 3. Uses deterministic idempotency keys (`csv:${content_hash}:row:${proposal.id}`)
 *    ensuring safe reimport and zero duplicate postings.
 * 4. Updates `m1_proposals.review_status = 'approved'`.
 * 
 * Why this exists:
 * The single, authoritative gateway converting provisional document proposals into
 * confirmed ledger transactions.
 */
export function approveProposals(
    db: Database.Database,
    input: BatchApproveProposalsInput
): {
    approved_count: number;
    transaction_ids: string[];
} {
    const doc = db.prepare('SELECT * FROM m1_documents WHERE id = ?').get(input.document_id) as any;
    if (!doc) {
        throw new Error(`Document not found: ${input.document_id}`);
    }

    const targetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.target_account_id) as any;
    if (!targetAccount) {
        throw new Error(`Target account not found: ${input.target_account_id}`);
    }

    const entityId = input.entity_id || targetAccount.entity_id;
    const currency = targetAccount.currency as CurrencyCode;

    const getPropStmt = db.prepare('SELECT * FROM m1_proposals WHERE id = ? AND document_id = ?');
    const updatePropStmt = db.prepare(`
        UPDATE m1_proposals
        SET review_status = 'approved',
            description = ?,
            counterparty = ?,
            suggested_category = ?,
            updated_at = ?
        WHERE id = ?
    `);

    const transactionIds: string[] = [];
    let approvedCount = 0;

    const approveBatchTx = db.transaction(() => {
        for (const item of input.items) {
            const rawProp = getPropStmt.get(item.proposal_id, input.document_id) as any;
            if (!rawProp) {
                throw new Error(`Proposal not found: ${item.proposal_id}`);
            }

            const findings: ValidationFinding[] = rawProp.validation_findings ? JSON.parse(rawProp.validation_findings) : [];
            const hasBlockingError = findings.some(f => f.severity === 'error');
            if (hasBlockingError) {
                throw new Error(`Cannot approve proposal "${item.proposal_id}" because it contains unresolved error findings.`);
            }

            // Requirement 3: Approval must match the reviewed account and currency
            if (rawProp.account_id && rawProp.account_id !== targetAccount.id) {
                throw new Error(
                    `Cannot approve proposal "${item.proposal_id}": reviewed account "${rawProp.account_id}" does not match approval target account "${targetAccount.id}".`
                );
            }

            if (rawProp.original_currency && rawProp.original_currency.toUpperCase() !== targetAccount.currency.toUpperCase()) {
                throw new Error(
                    `Cannot approve proposal "${item.proposal_id}": reviewed currency "${rawProp.original_currency}" does not match approval target account currency "${targetAccount.currency}".`
                );
            }

            const evidence: EvidenceReference = JSON.parse(rawProp.evidence_json);
            const description = item.description || rawProp.description;
            const counterparty = item.counterparty || rawProp.counterparty || null;
            const category = (item.category || rawProp.suggested_category || 'living_expense') as AccountSubType;
            const absAmount = Math.abs(rawProp.amount_cents);

            if (absAmount === 0) {
                throw new Error(`Cannot post transaction for proposal "${item.proposal_id}" with zero amount.`);
            }

            // Deterministic idempotency key
            const idempotencyKey = `csv:${doc.content_hash}:prop:${rawProp.id}`;

            let txResult;

            if (rawProp.event_type === 'income') {
                // Inflow / Deposit: Debit Bank Account (+cents), Credit Income Account (-cents)
                const incomeAccount = ensureIncomeAccount(db, entityId, category, currency);

                txResult = postTransaction(db, {
                    date: rawProp.event_date,
                    description,
                    payee_or_payer: counterparty,
                    origin: 'document_extraction',
                    idempotency_key: idempotencyKey,
                    evidence_refs: [evidence as any],
                    postings: [
                        {
                            account_id: targetAccount.id,
                            amount_cents: absAmount, // Debit asset (increase)
                            currency
                        },
                        {
                            account_id: incomeAccount.id,
                            amount_cents: -absAmount, // Credit income (increase)
                            currency
                        }
                    ]
                });
            } else if (rawProp.event_type === 'transfer' && item.transfer_account_id) {
                // Transfer between two balance sheet accounts
                const transferAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(item.transfer_account_id) as any;
                if (!transferAccount) {
                    throw new Error(`Transfer counterpart account not found: ${item.transfer_account_id}`);
                }
                if (transferAccount.currency.toUpperCase() !== targetAccount.currency.toUpperCase()) {
                    throw new Error(
                        `Cannot approve transfer for proposal "${item.proposal_id}": counterpart account currency "${transferAccount.currency}" does not match target account currency "${targetAccount.currency}".`
                    );
                }

                // If transferring out of bank to another account:
                // Debit destination (+absAmount), Credit bank (-absAmount)
                txResult = postTransaction(db, {
                    date: rawProp.event_date,
                    description,
                    payee_or_payer: counterparty,
                    origin: 'document_extraction',
                    idempotency_key: idempotencyKey,
                    evidence_refs: [evidence as any],
                    postings: [
                        {
                            account_id: transferAccount.id,
                            amount_cents: absAmount,
                            currency
                        },
                        {
                            account_id: targetAccount.id,
                            amount_cents: -absAmount,
                            currency
                        }
                    ]
                });
            } else {
                // Default: Outflow / Expense
                // Debit Expense Account (+absAmount), Credit Bank Account (-absAmount)
                const expenseAccount = ensureExpenseAccount(db, entityId, category, currency);

                txResult = postTransaction(db, {
                    date: rawProp.event_date,
                    description,
                    payee_or_payer: counterparty,
                    origin: 'document_extraction',
                    idempotency_key: idempotencyKey,
                    evidence_refs: [evidence as any],
                    postings: [
                        {
                            account_id: expenseAccount.id,
                            amount_cents: absAmount, // Debit expense (increase)
                            currency
                        },
                        {
                            account_id: targetAccount.id,
                            amount_cents: -absAmount, // Credit asset (decrease)
                            currency
                        }
                    ]
                });
            }

            // Mark proposal as approved in database
            const now = new Date().toISOString();
            updatePropStmt.run(description, counterparty, category, now, rawProp.id);

            transactionIds.push(txResult.id);
            approvedCount++;
        }
    });

    approveBatchTx();

    return {
        approved_count: approvedCount,
        transaction_ids: transactionIds
    };
}

/**
 * Reprocesses an existing ingested document using a corrected column/date mapping profile.
 * 
 * Why this exists:
 * Users occasionally upload statements with the wrong mapping or date format.
 * This allows re-parsing unapproved proposals with the corrected mapping without losing
 * or modifying previously approved ledger records.
 * 
 * Tricky logic:
 * - Preserves every proposal with review_status === 'approved' untouched.
 * - Updates unapproved proposals (review_status !== 'approved') with new extracted dates, amounts, and findings.
 * - Guarantees zero duplicate postings or ledger mutation.
 * 
 * TODO: Add automatic diff summary showing which fields changed across reprocessings in Slice 1F.
 */
export function reprocessDocumentWithMapping(
    db: Database.Database,
    input: {
        document_id: string;
        mapping: CsvMappingProfile;
        target_account_id?: string;
        default_category?: string;
        entity_id?: string;
    }
): {
    document: DocumentMetadata;
    proposals: ExtractedFinancialProposal[];
    internal_duplicates_count: number;
    external_duplicates_count: number;
} {
    const doc = db.prepare('SELECT * FROM m1_documents WHERE id = ?').get(input.document_id) as any;
    if (!doc) {
        throw new Error(`Document not found: ${input.document_id}`);
    }
    if (!doc.raw_content) {
        throw new Error(`Cannot reprocess document ${input.document_id}: raw file content is missing.`);
    }

    let targetAccountId = input.target_account_id;
    if (!targetAccountId) {
        const existingProp = db.prepare('SELECT account_id FROM m1_proposals WHERE document_id = ? AND account_id IS NOT NULL LIMIT 1').get(input.document_id) as any;
        if (existingProp) {
            targetAccountId = existingProp.account_id;
        }
    }
    if (!targetAccountId) {
        throw new Error('Target account ID is required to reprocess document proposals.');
    }

    return ingestCsvDocument(db, {
        filename: doc.filename,
        raw_content: doc.raw_content,
        mapping: input.mapping,
        target_account_id: targetAccountId,
        default_category: input.default_category,
        entity_id: input.entity_id
    });
}
