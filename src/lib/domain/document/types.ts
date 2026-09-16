/**
 * Milestone 1 Neutral Document Ingestion Contracts
 * 
 * Why this file exists:
 * Defines the neutral data structures that bridge untrusted extracted document data
 * (from PDFs, bank CSVs, XLSX spreadsheets, and local vision receipt models) into
 * reviewable financial proposals.
 * 
 * Tricky logic:
 * - Documents produce *Proposals*, never accepted financial records directly.
 * - Supports 1:N (one statement yielding multiple transactions, e.g. rental payouts and fees)
 *   and N:1 (multiple invoices settled by a single payment).
 * - Evidence references maintain immutable SHA-256 content hashes and page/cell coordinates
 *   so every financial fact remains permanently drillable to its original source.
 * 
 * TODO: Add support for multi-page bounding box coordinate transforms when visual rendering UI is built.
 */

import { CurrencyCode } from '../accounting/types';

export interface DocumentMetadata {
    id: string;
    filename: string;
    content_hash: string; // SHA-256 hex digest
    mime_type: string;
    byte_size: number;
    created_at: string;
    storage_path?: string | null;
}

export interface EvidenceReference {
    document_id: string;
    content_hash: string;
    page_number?: number | null;
    cell_reference?: string | null; // e.g. "Sheet1!C14"
    bounding_box?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    extraction_version: string;
    source_snippet?: string | null;
}

export type ProposalReviewStatus = 'unreviewed' | 'approved' | 'rejected' | 'modified' | 'linked';

export type FinancialEventType = 'income' | 'expense' | 'transfer' | 'repayment' | 'valuation_adjustment';

export interface ValidationFinding {
    severity: 'info' | 'warning' | 'error';
    code: string;
    message: string;
    field?: string;
}

export interface ExtractedFinancialProposal {
    id: string;
    document_id: string;
    entity_id?: string | null;
    account_id?: string | null;
    event_date: string; // YYYY-MM-DD
    document_period?: string | null; // e.g. "2026-08"
    original_currency: CurrencyCode;
    amount_cents: number; // Signed integer minor unit
    counterparty?: string | null;
    description: string;
    event_type: FinancialEventType;
    suggested_category?: string | null;
    evidence: EvidenceReference;
    extraction_version: string;
    validation_findings: ValidationFinding[];
    review_status: ProposalReviewStatus;
    related_proposal_ids?: string[];
    linked_transaction_id?: string | null; // Target transaction when linked as supporting evidence (Slice 1G)
    created_at: string;
    updated_at: string;
}

export type DocumentJobState = 'queued' | 'processing' | 'ready_for_review' | 'partially_extracted' | 'failed';

export interface DocumentJob {
    id: string;
    document_id: string;
    state: DocumentJobState;
    attempts: number;
    lease_until?: number | null; // Unix timestamp
    error_message?: string | null;
    options?: Record<string, any> | null;
    created_at: string;
    updated_at: string;
}

export interface HealthFinding {
    id: string;
    type: 'missing_account' | 'missing_currency' | 'unmatched_transfer' | 'suspected_duplicate' | 'reconciliation_gap';
    title: string;
    description: string;
    severity: 'warning' | 'error';
    document_id?: string;
    proposal_id?: string;
}

// ============================================================================
// Slice 1E: Reusable Bank CSV Mapping Profiles & Parsed Contracts
// ============================================================================

export type CsvDateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type CsvAmountMode = 'single_amount' | 'debit_credit';

/**
 * Reusable column mapping profile for Bank CSV imports.
 * 
 * Why this exists:
 * Users import statements from the same bank repeatedly. Storing the column mapping
 * keyed to a canonical header signature enables zero-friction repeated imports without
 * re-specifying column mappings every time.
 * 
 * Tricky logic:
 * - In 'single_amount' mode: positive numbers represent inflows (deposits/credits),
 *   negative numbers represent outflows (debits/withdrawals).
 * - In 'debit_credit' mode: separate columns specify debit and credit amounts.
 * 
 * TODO: Add regex support for automated description cleanups (e.g. stripping POS store IDs).
 */
export interface CsvMappingProfile {
    id: string;
    name: string;
    header_signature: string; // Canonical signature (sorted lowercase column names)
    date_column: string;
    date_format: CsvDateFormat;
    description_column: string;
    amount_mode: CsvAmountMode;
    amount_column?: string | null;
    debit_column?: string | null;
    credit_column?: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Structure of an individual parsed CSV row before conversion into a proposal.
 * 
 * Why this exists:
 * Separates raw text parsing from financial proposal generation so validation
 * errors can be flagged with exact row numbers and original line snippets.
 * 
 * Tricky logic:
 * - If date or amount cannot be parsed, amount_cents or date is null and validation_findings
 *   contains an error-level finding. Unsupported rows remain unresolved; never guess missing amounts.
 * 
 * TODO: Support multi-currency CSVs where original currency is indicated in a separate column.
 */
export interface ParsedCsvRow {
    row_number: number; // 1-based index (including or relative to header)
    raw_snippet: string; // Exact text snippet of the line for immutable evidence linking
    date: string | null; // Canonical YYYY-MM-DD date if valid, or null
    raw_date: string;
    description: string;
    amount_cents: number | null; // Signed integer cents: positive = inflow, negative = outflow
    raw_amount: string;
    event_type: FinancialEventType;
    validation_findings: ValidationFinding[];
}

/**
 * Summary result of parsing a CSV file with a given mapping profile.
 */
export interface CsvParseResult {
    headers: string[];
    header_signature: string;
    matched_mapping?: CsvMappingProfile | null;
    rows: ParsedCsvRow[];
    total_rows: number;
    valid_rows: number;
    error_rows: number;
}

/**
 * Input payload for ingesting a bank CSV document.
 */
export interface IngestCsvInput {
    filename: string;
    raw_content: string;
    mapping: CsvMappingProfile;
    target_account_id: string; // Target liquid asset/bank account
    default_category?: string; // Optional default expense category
    entity_id?: string; // Target sovereign entity
}

/**
 * Input payload for batch approving proposals.
 */
export interface BatchApproveProposalsInput {
    document_id: string;
    target_account_id: string;
    entity_id: string;
    items: Array<{
        proposal_id: string;
        category?: string; // e.g. 'groceries', 'utilities', 'salary', 'transfer', 'office_supplies'
        counterparty?: string;
        description?: string;
        transfer_account_id?: string; // If event_type is transfer
        payment_confirmed?: boolean; // Required when approving invoice/receipt expense proposals
        duplicate_confirmed?: boolean; // Required when approving proposals flagged as possible duplicates
    }>;
}

/**
 * Input payload for ingesting a text-based invoice/receipt PDF document (Slice 1F).
 */
export interface IngestPdfInput {
    filename: string;
    file_buffer?: Buffer;
    file_base64?: string;
    target_account_id?: string; // Target payment asset/credit account
    default_category?: string; // Optional default expense category (e.g. 'office_supplies')
    entity_id?: string; // Target sovereign entity
}

/**
 * Bank transaction candidate for receipt linking (Slice 1G).
 * 
 * Why this exists:
 * Presents users with ranked candidate ledger transactions that match an extracted
 * PDF invoice/receipt proposal in account, currency, amount, and approximate date.
 */
export interface TransactionCandidate {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    payee_or_payer: string | null;
    amount_cents: number; // Signed amount of posting on the account
    currency: CurrencyCode;
    account_id: string;
    account_name: string;
    date_difference_days: number;
    match_score: number;
    has_existing_evidence: boolean;
}

/**
 * Input payload for linking a document proposal to an existing bank transaction (Slice 1G).
 */
export interface LinkProposalInput {
    proposal_id: string;
    transaction_id: string;
}


