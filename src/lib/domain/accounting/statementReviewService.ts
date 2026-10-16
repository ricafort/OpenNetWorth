/**
 * Statement Review Persistence Service
 * 
 * Why this file exists:
 * Fulfills Delivery 2B Required Plan Adjustment 4:
 * Manages durable pending review state for statement balance extractions in SQLite (`statement_reviews`).
 * When a user uploads a statement PDF, parses proposals, and modifies account mappings, amounts,
 * or classifications in the review modal, this service preserves their modifications across browser
 * reloads so they can resume review without silently losing corrections.
 * 
 * Tricky logic:
 * - Upsert on document_id: A single document has at most one review session. Re-extracting or re-saving
 *   updates the existing review session rather than creating duplicate orphaned rows.
 * - JSON Serialization: Proposals array and coverage summary are serialized to structured JSON strings
 *   with safe parsing and fallback defaults on deserialization.
 * - Non-destructive: Does NOT post or mutate the double-entry transaction ledger (`transactions`).
 * 
 * TODO: Support multi-statement batched review sessions in future milestones.
 */

import Database from 'better-sqlite3';
import {
    BalanceExtractionProposal,
    StatementCoverageSummary,
    StatementReviewState,
    CurrencyCode,
    BalanceKind
} from './types';

export interface SaveStatementReviewInput {
    id?: string;
    document_id: string;
    status?: 'pending_review' | 'saved' | 'failed';
    proposals: BalanceExtractionProposal[];
    coverage_summary: StatementCoverageSummary;
    version?: number;
}

/**
 * Saves or updates a statement review session in SQLite.
 */
export function saveStatementReview(
    db: Database.Database,
    input: SaveStatementReviewInput
): StatementReviewState {
    const id = input.id || `rev-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const status = input.status || 'pending_review';
    const proposalsJson = JSON.stringify(input.proposals || []);
    const coverageJson = JSON.stringify(input.coverage_summary || {
        total_pages: 0,
        readable_pages: 0,
        unreadable_pages: 0,
        coverage_level: 'none',
        page_details: [],
        disclosures: []
    });

    const version = input.version || 1;

    // Upsert on document_id
    db.prepare(`
        INSERT INTO statement_reviews (
            id, document_id, status, proposals_json, coverage_summary_json, version, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?
        )
        ON CONFLICT(document_id) DO UPDATE SET
            status = excluded.status,
            proposals_json = excluded.proposals_json,
            coverage_summary_json = excluded.coverage_summary_json,
            version = excluded.version,
            updated_at = excluded.updated_at
    `).run(
        id,
        input.document_id,
        status,
        proposalsJson,
        coverageJson,
        version,
        now,
        now
    );

    return {
        id,
        document_id: input.document_id,
        status,
        proposals: input.proposals,
        coverage_summary: input.coverage_summary,
        version,
        created_at: now,
        updated_at: now
    };
}

/**
 * Retrieves a statement review session by document ID.
 */
export function getStatementReviewByDocumentId(
    db: Database.Database,
    documentId: string
): StatementReviewState | null {
    const row = db.prepare(`
        SELECT * FROM statement_reviews WHERE document_id = ?
    `).get(documentId) as any;

    if (!row) return null;

    let proposals: BalanceExtractionProposal[] = [];
    let coverage_summary: StatementCoverageSummary = {
        total_pages: 0,
        readable_pages: 0,
        unreadable_pages: 0,
        coverage_level: 'none',
        page_details: [],
        disclosures: []
    };

    try {
        proposals = JSON.parse(row.proposals_json || '[]');
    } catch {
        proposals = [];
    }

    try {
        coverage_summary = JSON.parse(row.coverage_summary_json || '{}');
    } catch {
        // Fallback default
    }

    return {
        id: row.id,
        document_id: row.document_id,
        status: row.status,
        proposals,
        coverage_summary,
        version: row.version !== undefined ? row.version : 1,
        created_at: row.created_at,
        updated_at: row.updated_at
    };
}

export interface SavedProposalCommitItem {
    proposal_id?: string;
    id?: string;
    amount_cents?: number | null;
    account_id?: string | null;
    effective_date?: string | null;
    currency?: CurrencyCode;
    balance_kind?: BalanceKind;
    is_component_of_total?: boolean;
    explicit_classification_correction?: boolean;
}

/**
 * Updates pending proposals for a statement review session (e.g. on debounced user edit).
 * 
 * Why this exists:
 * Fulfills Independent Assessment Finding 4 & Delivery 2B Correction 2:
 * 1. Prevents debounced autosync from overwriting a completed review (status = 'saved').
 * 2. Preserves already saved flags (is_saved: true) and deliberate correction flags
 *    (explicit_classification_correction) across autosaves.
 * 3. Prevents a delayed pre-save autosave from resetting a saved row to pending or overwriting
 *    a newer review decision.
 * 4. Keeps remaining unsaved proposals pending if only some proposals were saved.
 * 
 * Merges incoming proposal edits with existing stored proposals by proposal ID.
 * If an item was previously marked is_saved in SQLite (prev?.is_saved === true), an in-flight client
 * autosave cannot reset it to pending or overwrite its committed amount.
 */
export interface StatementReviewUpdateResult extends StatementReviewState {
    stale: boolean;
    already_saved: boolean;
    current_version: number;
}

/**
 * Updates the in-flight proposals array of an existing statement review session.
 * 
 * Why this exists:
 * Fulfills Delivery 2B: Statement PDF Autosave & State Resumption.
 * Persists intermediate user edits (amounts, entity, flags) during statement review
 * without creating formal accounting balance observations until explicit user save.
 * 
 * Tricky logic:
 * 1. Optimistic Concurrency Control: If clientVersion is provided and is less than the current
 *    server review version, the mutation is REJECTED as stale, returning { stale: true, current_version }.
 *    This prevents delayed out-of-order network responses from overwriting newer edits or reviews.
 * 2. Saved Review Immutability: If existing.status === 'saved', in-flight client autosaves are ignored,
 *    returning { already_saved: true, current_version }.
 * 3. Row-Level Committed Observation Protection: If an individual proposal row was previously marked
 *    is_saved in SQLite (prev?.is_saved === true), an in-flight client autosave cannot reset it to pending
 *    or overwrite its committed amount.
 * 
 * TODO: In Milestone 2, support collaborative concurrent multi-user editing with operational transformation.
 */
export function updateStatementReviewProposals(
    db: Database.Database,
    documentId: string,
    proposals: BalanceExtractionProposal[],
    clientVersion?: number
): StatementReviewUpdateResult | null {
    const existing = getStatementReviewByDocumentId(db, documentId);
    if (!existing) return null;

    const currentVersion = (existing as any).version !== undefined ? (existing as any).version : 1;

    // 1. If review session is already saved, completely ignore in-flight autosync mutations
    if (existing.status === 'saved') {
        return {
            ...existing,
            stale: false,
            already_saved: true,
            current_version: currentVersion
        };
    }

    // 2. Reject stale older autosaves if clientVersion is strictly older than current server version
    if (clientVersion !== undefined && clientVersion < currentVersion) {
        return {
            ...existing,
            stale: true,
            already_saved: false,
            current_version: currentVersion
        };
    }

    const nextVersion = clientVersion !== undefined ? Math.max(clientVersion, currentVersion + 1) : currentVersion + 1;

    const existingMap = new Map<string, any>();
    for (const p of existing.proposals) {
        existingMap.set(p.id, p);
    }

    const merged = proposals.map(p => {
        const prev = existingMap.get(p.id);
        // Delivery 2B Correction 2:
        // A delayed pre-save autosave must NOT reset a saved row to pending or revert its committed amount!
        // If an item was previously marked is_saved in SQLite, preserve it as saved.
        if (prev?.is_saved) {
            return prev;
        }

        return {
            ...p,
            is_saved: false,
            explicit_classification_correction: p.explicit_classification_correction !== undefined
                ? Boolean(p.explicit_classification_correction)
                : Boolean(prev?.explicit_classification_correction)
        };
    });

    const allSaved = merged.length > 0 && merged.every(p => Boolean((p as any).is_saved));
    const nextStatus = allSaved ? 'saved' : 'pending_review';
    const now = new Date().toISOString();

    db.prepare(`
        UPDATE statement_reviews
        SET proposals_json = ?, status = ?, updated_at = ?, version = ?
        WHERE document_id = ?
    `).run(JSON.stringify(merged), nextStatus, now, nextVersion, documentId);

    return {
        ...existing,
        status: nextStatus,
        proposals: merged,
        version: nextVersion,
        updated_at: now,
        stale: false,
        already_saved: false,
        current_version: nextVersion
    };
}

/**
 * Updates status of a statement review session (e.g. 'saved').
 */
export function markStatementReviewStatus(
    db: Database.Database,
    documentId: string,
    status: 'pending_review' | 'saved' | 'failed'
): void {
    const now = new Date().toISOString();
    db.prepare(`
        UPDATE statement_reviews
        SET status = ?, updated_at = ?
        WHERE document_id = ?
    `).run(status, now, documentId);
}

/**
 * Marks specific proposals as saved within a statement review session,
 * recording committed values (amount_cents, account_id, effective_date) into statement_reviews.
 * Automatically transitions review status to 'saved' ONLY IF all proposals are now saved.
 * If some proposals remain unsaved, retains status = 'pending_review' so the remaining
 * items remain visibly pending and actionable.
 * 
 * Why this exists:
 * Fulfills Delivery 2B Correction 2 & Finding 4:
 * When a user edits a proposal (e.g. 1500 to 1550) and immediately saves before autosave fires,
 * both the accepted balance observation and the reopened saved review in SQLite must show 1550.
 * Passing the committed items ensures the SQLite review reflects exactly what was saved.
 * 
 * Tricky logic:
 * Updates the serialized JSON array inside SQLite transactionally, updating amount_cents and setting
 * is_saved = true on each committed item.
 * Evaluates whether any proposals remain with is_saved !== true to decide overall review status.
 * 
 * TODO: In Milestone 2, track individual observation IDs linked to each saved proposal.
 */
export function markStatementProposalsSaved(
    db: Database.Database,
    documentId: string,
    savedProposalIdsOrItems: string[] | SavedProposalCommitItem[]
): StatementReviewState | null {
    const review = getStatementReviewByDocumentId(db, documentId);
    if (!review) return null;

    const itemMap = new Map<string, SavedProposalCommitItem>();
    const savedIdSet = new Set<string>();

    const matchedProposalIds = new Set<string>();

    for (const entry of savedProposalIdsOrItems) {
        if (typeof entry === 'string') {
            savedIdSet.add(entry);
            matchedProposalIds.add(entry);
        } else if (entry && typeof entry === 'object') {
            const pid = entry.proposal_id || entry.id;
            if (pid) {
                savedIdSet.add(pid);
                itemMap.set(pid, entry);
                matchedProposalIds.add(pid);
            } else {
                // Why this exists:
                // Callers or integration tests may commit observations with document_id and account_id
                // without supplying an explicit proposal_id.
                // Tricky logic:
                // We match first by account_id among unmatched proposals, and fallback to matching by
                // single-proposal statements or identical amount_cents.
                // TODO: Enforce strict proposal_id across all external client schemas in Milestone 2.
                let matched = review.proposals.find(p =>
                    !matchedProposalIds.has(p.id) &&
                    p.account_id &&
                    p.account_id === entry.account_id
                );
                if (!matched) {
                    matched = review.proposals.find(p =>
                        !matchedProposalIds.has(p.id) &&
                        (review.proposals.length === 1 || p.amount_cents === entry.amount_cents)
                    );
                }
                if (matched) {
                    savedIdSet.add(matched.id);
                    itemMap.set(matched.id, entry);
                    matchedProposalIds.add(matched.id);
                }
            }
        }
    }

    const updatedProposals = review.proposals.map(p => {
        if (savedIdSet.has(p.id)) {
            const commitItem = itemMap.get(p.id);
            return {
                ...p,
                is_saved: true,
                amount_cents: (commitItem?.amount_cents !== undefined && commitItem?.amount_cents !== null)
                    ? commitItem.amount_cents
                    : p.amount_cents,
                account_id: commitItem?.account_id !== undefined ? commitItem.account_id : p.account_id,
                effective_date: commitItem?.effective_date !== undefined && commitItem?.effective_date !== null
                    ? commitItem.effective_date
                    : p.effective_date,
                currency: commitItem?.currency !== undefined ? commitItem.currency : p.currency,
                balance_kind: commitItem?.balance_kind !== undefined ? commitItem.balance_kind : p.balance_kind,
                is_component_of_total: commitItem?.is_component_of_total !== undefined
                    ? commitItem.is_component_of_total
                    : p.is_component_of_total,
                explicit_classification_correction: commitItem?.explicit_classification_correction !== undefined
                    ? commitItem.explicit_classification_correction
                    : p.explicit_classification_correction,
                confirmed_by_user: true,
                is_user_modified: true
            };
        }
        return p;
    });

    const allSaved = updatedProposals.length > 0 && updatedProposals.every(p => Boolean((p as any).is_saved));
    const nextStatus = allSaved ? 'saved' : 'pending_review';
    const now = new Date().toISOString();
    const nextVersion = ((review as any).version !== undefined ? (review as any).version : 1) + 1;

    db.prepare(`
        UPDATE statement_reviews
        SET proposals_json = ?, status = ?, updated_at = ?, version = ?
        WHERE document_id = ?
    `).run(JSON.stringify(updatedProposals), nextStatus, now, nextVersion, documentId);

    return {
        ...review,
        status: nextStatus,
        proposals: updatedProposals,
        version: nextVersion,
        updated_at: now
    };
}

/**
 * Lists all statement reviews joined with document metadata.
 */
export function listStatementReviews(
    db: Database.Database
): Array<StatementReviewState & { filename: string; byte_size: number }> {
    const rows = db.prepare(`
        SELECT 
            r.id, r.document_id, r.status, r.proposals_json, r.coverage_summary_json,
            r.created_at, r.updated_at,
            d.filename, d.byte_size
        FROM statement_reviews r
        JOIN documents d ON r.document_id = d.id
        ORDER BY r.created_at DESC
    `).all() as any[];

    return rows.map(row => {
        let proposals: BalanceExtractionProposal[] = [];
        let coverage_summary: StatementCoverageSummary = {
            total_pages: 0,
            readable_pages: 0,
            unreadable_pages: 0,
            coverage_level: 'none',
            page_details: [],
            disclosures: []
        };
        try {
            proposals = JSON.parse(row.proposals_json || '[]');
        } catch { proposals = []; }
        try {
            coverage_summary = JSON.parse(row.coverage_summary_json || '{}');
        } catch { }

        return {
            id: row.id,
            document_id: row.document_id,
            status: row.status,
            proposals,
            coverage_summary,
            created_at: row.created_at,
            updated_at: row.updated_at,
            filename: row.filename,
            byte_size: row.byte_size
        };
    });
}
