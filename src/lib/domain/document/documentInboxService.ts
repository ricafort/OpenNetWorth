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
    IngestPdfInput,
    ProposalReviewStatus,
    ValidationFinding
} from './types';
import { computeHeaderSignature, parseCsvWithMapping } from './csvParserService';
import { extractInvoiceFromPdf } from './openTaxAdapter';
import {
    ensureExpenseAccount,
    ensureIncomeAccount,
    postTransaction
} from '../accounting/transactionService';
import { AccountSubType, CurrencyCode, CURRENCY_DECIMALS } from '../accounting/types';

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

            // Requirement 3 (Slice 1F Fix 1): Approval must match the reviewed account and currency
            if (rawProp.account_id && rawProp.account_id !== targetAccount.id) {
                throw new Error(
                    `Cannot approve proposal "${item.proposal_id}": reviewed account "${rawProp.account_id}" does not match approval target account "${targetAccount.id}".`
                );
            }

            // Missing currency must remain unresolved until reviewed; approval is blocked
            if (!rawProp.original_currency || rawProp.original_currency.trim() === '') {
                throw new Error(
                    `Cannot approve proposal "${item.proposal_id}": missing currency must remain unresolved until reviewed.`
                );
            }

            // Payment account must use the same currency
            if (rawProp.original_currency.toUpperCase() !== targetAccount.currency.toUpperCase()) {
                throw new Error(
                    `Cannot approve proposal "${item.proposal_id}": reviewed currency "${rawProp.original_currency}" does not match approval target account currency "${targetAccount.currency}".`
                );
            }

            const evidence: EvidenceReference = JSON.parse(rawProp.evidence_json);
            const description = item.description || rawProp.description;
            const counterparty = item.counterparty || rawProp.counterparty || null;
            const category = (item.category || rawProp.suggested_category || 'living_expense') as AccountSubType;
            const absAmount = Math.abs(rawProp.amount_cents);

            // Requirement 4 (Slice 1F): Explicit payment confirmation required before recording an expense for invoice proposals
            const isInvoiceDoc = doc.mime_type === 'application/pdf' || (rawProp.evidence_json && rawProp.evidence_json.includes('opentax'));
            if (isInvoiceDoc && rawProp.event_type === 'expense' && item.payment_confirmed !== true) {
                throw new Error(
                    `Cannot approve proposal "${item.proposal_id}": payment must be explicitly confirmed before recording an expense.`
                );
            }

            // Deterministic idempotency key
            const idempotencyKey = `doc:${doc.content_hash}:prop:${rawProp.id}`;

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

/**
 * Retrieves an individual proposal by ID with parsed JSON fields.
 * 
 * Why this exists:
 * Provides a single retrieval point for proposal inspection and post-update verification.
 */
export function getProposalById(
    db: Database.Database,
    proposalId: string
): ExtractedFinancialProposal | null {
    const r = db.prepare('SELECT * FROM m1_proposals WHERE id = ?').get(proposalId) as any;
    if (!r) return null;

    return {
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
    };
}

/**
 * Updates reviewed fields on a provisional proposal before approval (Slice 1F Fix 2 & 3).
 * 
 * Why this exists:
 * Allows users to correct extracted fields (supplier, date, amount, currency, category, payment account)
 * through the review UI before approving the proposal into the ledger. Ensures that untrusted
 * extracted data can be reviewed and validated prior to double-entry posting.
 * 
 * Tricky logic:
 * - Fix 3: Strict approval guard: Rejects attempts to set review_status to 'approved'.
 *   Proposals can ONLY transition to 'approved' through successful ledger posting in `approveProposals`.
 * - Fix 2: Field validation:
 *   - Date: verifies strict YYYY-MM-DD pattern and validates that it corresponds to a real calendar date.
 *   - Amount: verifies it is a safe integer minor unit.
 *   - Currency: verifies it exists in CURRENCY_DECIMALS.
 *   - Account: verifies target account exists and that its currency matches the proposal currency.
 *   - Category: verifies non-empty category string.
 * - Dynamic resolution of validation findings:
 *   - When the user provides a valid currency, any unresolved `MISSING_CURRENCY` error finding is cleared.
 *   - When the payment account and currency match, any `CURRENCY_MISMATCH` finding is cleared.
 * 
 * TODO:
 * - Add field-level audit trail logging previous and updated values in Slice 1G.
 */
export function updateProposalReview(
    db: Database.Database,
    input: {
        proposal_id: string;
        event_date?: string;
        counterparty?: string;
        description?: string;
        amount_cents?: number;
        original_currency?: CurrencyCode;
        account_id?: string;
        suggested_category?: string;
        review_status?: ProposalReviewStatus;
    }
): ExtractedFinancialProposal {
    const existing = db.prepare('SELECT * FROM m1_proposals WHERE id = ?').get(input.proposal_id) as any;
    if (!existing) {
        throw new Error(`Proposal not found: ${input.proposal_id}`);
    }
    if (existing.review_status === 'approved') {
        throw new Error(`Cannot modify proposal "${input.proposal_id}" because it has already been approved into the ledger.`);
    }

    // Fix 3: Prevent review/PATCH from setting approved status
    if (input.review_status === 'approved') {
        throw new Error("Proposals cannot be marked approved via review updates. Only successful ledger posting may set approved status.");
    }

    // Fix 2: Validate corrections
    // 1. Date validation
    if (input.event_date !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.event_date)) {
            throw new Error(`Invalid event_date format: "${input.event_date}". Expected YYYY-MM-DD.`);
        }
        const parsedDate = new Date(input.event_date);
        if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().substring(0, 10) !== input.event_date) {
            throw new Error(`Invalid calendar date: "${input.event_date}".`);
        }
    }

    // 2. Amount validation
    if (input.amount_cents !== undefined) {
        if (!Number.isInteger(input.amount_cents)) {
            throw new Error(`Invalid amount_cents: "${input.amount_cents}". Amount must be a safe integer.`);
        }
    }

    // 3. Currency validation
    if (input.original_currency !== undefined) {
        const currCode = input.original_currency.toUpperCase() as CurrencyCode;
        if (CURRENCY_DECIMALS[currCode] === undefined) {
            throw new Error(`Unsupported or invalid currency code: "${input.original_currency}".`);
        }
    }

    // 4. Payment account validation
    if (input.account_id !== undefined && input.account_id !== null && input.account_id !== '') {
        const acc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.account_id) as any;
        if (!acc) {
            throw new Error(`Target account not found: "${input.account_id}".`);
        }
        const effectiveCurrency = (input.original_currency || existing.original_currency || '').toUpperCase();
        if (effectiveCurrency && acc.currency.toUpperCase() !== effectiveCurrency) {
            throw new Error(`Account currency "${acc.currency}" does not match proposal currency "${effectiveCurrency}".`);
        }
    }

    // 5. Category validation
    if (input.suggested_category !== undefined && input.suggested_category.trim() === '') {
        throw new Error('Suggested category cannot be empty.');
    }

    const now = new Date().toISOString();
    const eventDate = input.event_date !== undefined ? input.event_date : existing.event_date;
    const counterparty = input.counterparty !== undefined ? input.counterparty.trim() : existing.counterparty;
    const description = input.description !== undefined ? input.description.trim() : existing.description;
    const amountCents = input.amount_cents !== undefined ? input.amount_cents : existing.amount_cents;
    const finalCurrency = input.original_currency !== undefined ? (input.original_currency.toUpperCase() as CurrencyCode) : existing.original_currency;
    const finalAccountId = input.account_id !== undefined ? input.account_id : existing.account_id;
    const category = input.suggested_category !== undefined ? input.suggested_category.trim() : existing.suggested_category;
    const status = input.review_status !== undefined ? input.review_status : 'modified';

    // Update validation findings: if user provided a valid currency, clear MISSING_CURRENCY
    let findings: ValidationFinding[] = existing.validation_findings ? JSON.parse(existing.validation_findings) : [];
    if (finalCurrency && CURRENCY_DECIMALS[finalCurrency] !== undefined) {
        findings = findings.filter(f => f.code !== 'MISSING_CURRENCY');
    }
    // Also clear CURRENCY_MISMATCH if account and currency now match
    if (finalAccountId && finalCurrency) {
        const acc = db.prepare('SELECT currency FROM m1_accounts WHERE id = ?').get(finalAccountId) as any;
        if (acc && acc.currency.toUpperCase() === finalCurrency.toUpperCase()) {
            findings = findings.filter(f => f.code !== 'CURRENCY_MISMATCH');
        }
    }

    db.prepare(`
        UPDATE m1_proposals
        SET event_date = ?,
            counterparty = ?,
            description = ?,
            amount_cents = ?,
            original_currency = ?,
            account_id = ?,
            suggested_category = ?,
            review_status = ?,
            validation_findings = ?,
            updated_at = ?
        WHERE id = ?
    `).run(
        eventDate,
        counterparty,
        description,
        amountCents,
        finalCurrency,
        finalAccountId,
        category,
        status,
        JSON.stringify(findings),
        now,
        input.proposal_id
    );

    return getProposalById(db, input.proposal_id)!;
}

/**
 * Ingests a text-based invoice/receipt PDF document using OpenTax-AU's reader (Slice 1F).
 * 
 * Why this exists:
 * Turns a supported text-based PDF invoice or receipt into reviewable, source-linked
 * financial proposals in OpenNetWorth's inbox without direct ledger mutations.
 * 
 * Tricky logic:
 * - Content hash uniqueness: Computes SHA-256 hash on PDF bytes to detect reimports.
 * - Non-destructive reimport: If a document with the same content hash was already
 *   ingested and has approved proposals, preserves the approved proposals untouched
 *   and flags `already_approved: true`.
 * - Safe layout rejection: If the PDF does not match the supported single-item/supplies
 *   layout (or missing totals/supplier), creates an unreviewed proposal with amount_cents: 0
 *   and error finding UNSUPPORTED_LAYOUT. Never guesses amounts!
 * - Category matching: Assigns suggested_category (e.g. 'office_supplies') and links
 *   the original file bytes in `m1_documents.raw_content` as base64 for offline durability.
 * 
 * TODO: Support multi-page rental statements and bank statement PDFs in Slice 1G.
 */
export async function ingestPdfDocument(
    db: Database.Database,
    input: IngestPdfInput
): Promise<{
    document: DocumentMetadata;
    proposals: ExtractedFinancialProposal[];
    already_approved?: boolean;
    supported: boolean;
}> {
    // 1. Resolve buffer and content hash
    let buffer: Buffer;
    if (input.file_buffer) {
        buffer = input.file_buffer;
    } else if (input.file_base64) {
        buffer = Buffer.from(input.file_base64, 'base64');
    } else {
        throw new Error('Either file_buffer or file_base64 must be provided for PDF ingestion.');
    }

    const contentHash = computeContentHash(buffer);
    const now = new Date().toISOString();

    // Check if document already exists
    const existingDoc = db.prepare('SELECT * FROM m1_documents WHERE content_hash = ?').get(contentHash) as any;
    if (existingDoc) {
        const existingProposals = getDocumentProposals(db, existingDoc.id);
        const hasApproved = existingProposals.some(p => p.review_status === 'approved');
        if (hasApproved) {
            return {
                document: {
                    id: existingDoc.id,
                    filename: existingDoc.filename,
                    content_hash: existingDoc.content_hash,
                    mime_type: existingDoc.mime_type,
                    byte_size: existingDoc.byte_size,
                    created_at: existingDoc.created_at,
                    storage_path: existingDoc.storage_path
                },
                proposals: existingProposals,
                already_approved: true,
                supported: true
            };
        }
    }

    // Persist document record
    const docId = existingDoc ? existingDoc.id : `doc-${crypto.randomUUID()}`;
    if (!existingDoc) {
        db.prepare(`
            INSERT INTO m1_documents (
                id, filename, content_hash, mime_type, byte_size, storage_path, raw_content, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            docId,
            input.filename,
            contentHash,
            'application/pdf',
            buffer.length,
            null,
            buffer.toString('base64'),
            now
        );
    }

    // 2. Extract using OpenTax-AU adapter
    const extractionResult = await extractInvoiceFromPdf(buffer);

    // 3. Resolve target account & currency (Slice 1F Fix 1)
    let targetAccount: any = null;
    if (input.target_account_id) {
        targetAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.target_account_id);
    }
    // Fix 1: Preserve extracted currency from PDF directly, never overwrite with target account's currency
    const originalCurrency = extractionResult.currency ? (extractionResult.currency.toUpperCase() as CurrencyCode) : '';
    const entityId = input.entity_id || (targetAccount ? targetAccount.entity_id : null);

    // Remove any previously generated unapproved proposals for this document
    db.prepare(`DELETE FROM m1_proposals WHERE document_id = ? AND review_status != 'approved'`).run(docId);

    const proposals: ExtractedFinancialProposal[] = [];
    const propId = `prop-${crypto.randomUUID()}`;

    if (extractionResult.supported) {
        // Negative amount for expense
        const amountCents = -Math.abs(extractionResult.total_cents);
        const description = extractionResult.line_items[0]?.description
            ? `${extractionResult.supplier_name} - ${extractionResult.line_items[0].description}`
            : `${extractionResult.supplier_name || 'Invoice'} purchase`;

        const evidence: EvidenceReference = {
            document_id: docId,
            content_hash: contentHash,
            page_number: 1,
            extraction_version: 'opentax_invoice_v1',
            source_snippet: extractionResult.source_snippet
        };

        const findings = [...extractionResult.validation_findings];

        // Missing currency must remain unresolved with a blocking error until reviewed (Fix 1)
        if (!originalCurrency && !findings.some(f => f.code === 'MISSING_CURRENCY')) {
            findings.push({
                severity: 'error',
                code: 'MISSING_CURRENCY',
                message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
            });
        }

        // If target account is specified and its currency differs from the extracted document currency, add warning
        if (targetAccount && originalCurrency && targetAccount.currency.toUpperCase() !== originalCurrency.toUpperCase()) {
            findings.push({
                severity: 'warning',
                code: 'CURRENCY_MISMATCH',
                message: `Document currency (${originalCurrency}) does not match payment account currency (${targetAccount.currency}). Approval will be blocked until payment account matches.`
            });
        }

        // Check external duplicate in ledger
        if (input.target_account_id && extractionResult.date) {
            const externalDuplicate = db.prepare(`
                SELECT t.id, t.date, t.description
                FROM m1_transactions t
                JOIN m1_journal_entries j ON j.transaction_id = t.id
                WHERE j.account_id = ?
                  AND t.date = ?
                  AND ABS(j.amount_cents) = ?
                LIMIT 1
            `).get(input.target_account_id, extractionResult.date, Math.abs(amountCents)) as any;

            if (externalDuplicate) {
                findings.push({
                    severity: 'warning',
                    code: 'POSSIBLE_DUPLICATE_EXISTING',
                    message: `Possible duplicate: a ledger transaction already exists on ${extractionResult.date} for this account with matching amount.`
                });
            }
        }

        db.prepare(`
            INSERT INTO m1_proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            propId,
            docId,
            entityId,
            input.target_account_id || null,
            extractionResult.date || now.substring(0, 10),
            null,
            originalCurrency,
            amountCents,
            extractionResult.supplier_name || null,
            description,
            'expense',
            input.default_category || 'office_supplies',
            JSON.stringify(evidence),
            'opentax_invoice_v1',
            JSON.stringify(findings),
            'unreviewed',
            now,
            now
        );

        proposals.push({
            id: propId,
            document_id: docId,
            entity_id: entityId,
            account_id: input.target_account_id || null,
            event_date: extractionResult.date || now.substring(0, 10),
            original_currency: originalCurrency,
            amount_cents: amountCents,
            counterparty: extractionResult.supplier_name || null,
            description,
            event_type: 'expense',
            suggested_category: input.default_category || 'office_supplies',
            evidence,
            extraction_version: 'opentax_invoice_v1',
            validation_findings: findings,
            review_status: 'unreviewed',
            created_at: now,
            updated_at: now
        });
    } else {
        // Unsupported layout: Retain as unresolved, do not guess amounts!
        const evidence: EvidenceReference = {
            document_id: docId,
            content_hash: contentHash,
            page_number: 1,
            extraction_version: 'opentax_invoice_v1',
            source_snippet: extractionResult.source_snippet
        };

        const findings: ValidationFinding[] = [
            {
                severity: 'error',
                code: 'UNSUPPORTED_LAYOUT',
                message: 'This document does not match the supported text-based supplies invoice layout and has been retained as unresolved.'
            },
            ...extractionResult.validation_findings
        ];

        if (!originalCurrency && !findings.some(f => f.code === 'MISSING_CURRENCY')) {
            findings.push({
                severity: 'error',
                code: 'MISSING_CURRENCY',
                message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
            });
        }

        db.prepare(`
            INSERT INTO m1_proposals (
                id, document_id, entity_id, account_id, event_date, document_period,
                original_currency, amount_cents, counterparty, description, event_type,
                suggested_category, evidence_json, extraction_version, validation_findings,
                review_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            propId,
            docId,
            entityId,
            input.target_account_id || null,
            now.substring(0, 10),
            null,
            originalCurrency,
            0,
            null,
            `${input.filename} (unresolved layout)`,
            'expense',
            null,
            JSON.stringify(evidence),
            'opentax_invoice_v1',
            JSON.stringify(findings),
            'unreviewed',
            now,
            now
        );

        proposals.push({
            id: propId,
            document_id: docId,
            entity_id: entityId,
            account_id: input.target_account_id || null,
            event_date: now.substring(0, 10),
            original_currency: originalCurrency,
            amount_cents: 0,
            counterparty: null,
            description: `${input.filename} (unresolved layout)`,
            event_type: 'expense',
            suggested_category: null,
            evidence,
            extraction_version: 'opentax_invoice_v1',
            validation_findings: findings,
            review_status: 'unreviewed',
            created_at: now,
            updated_at: now
        });
    }

    const document: DocumentMetadata = {
        id: docId,
        filename: input.filename,
        content_hash: contentHash,
        mime_type: 'application/pdf',
        byte_size: buffer.length,
        created_at: existingDoc ? existingDoc.created_at : now,
        storage_path: null
    };

    return {
        document,
        proposals,
        supported: extractionResult.supported
    };
}

