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

export type ProposalReviewStatus = 'unreviewed' | 'approved' | 'rejected' | 'modified';

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
