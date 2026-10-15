/**
 * Balance Observations & Shared Financial Summary API Route
 * 
 * Why this file exists:
 * Implements Delivery 1 endpoints for:
 * 1. GET: Fetching the shared financial summary (net worth, assets, liabilities, account breakdown, freshness, and reconciliation differences).
 * 2. POST: Atomically committing approved balance observations into m1_balance_observations and updating source mappings.
 * 
 * Tricky logic:
 * - Atomic commits: Multiple observation updates are executed inside a single SQLite transaction.
 * - Concurrency control: Respects expected_balance_revision to reject stale commits.
 * - Validation: Rejects invalid currencies, non-numeric values, or non-calendar dates.
 * 
 * TODO: Add batch pagination if an institution returns over 200 accounts in a single request.
 */

import { NextResponse } from 'next/server';
import { getDbForRequest, demoErrorResponse, demoReadOnlyResponse } from '@/infrastructure/sqlite/db';
import {
    recordBalanceObservation,
    recordBalanceImportBatch,
    recordSourceMapping,
    RecordObservationInput
} from '@/lib/domain/accounting/balanceObservationService';
import { markStatementProposalsSaved } from '@/lib/domain/accounting/statementReviewService';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';
import { BalanceObservation, BalanceImportBatch, CURRENCY_DECIMALS } from '@/lib/domain/accounting/types';
import { ValidationError, ConflictError } from '@/lib/domain/accounting/accountService';
import { assertValidCalendarDate } from '@/lib/domain/accounting/transactionService';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';
import { getLocalTodayCalendarDate } from '@/lib/domain/calendarDate';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

export async function GET(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        // Demo cookie present → persona vault's ledger (Phase 2.7).
        const db = getDbForRequest(request);

        const { searchParams } = new URL(request.url);
        const scopeEntityId = searchParams.get('scopeEntityId') || searchParams.get('entity_id') || undefined;
        const asOfDate = searchParams.get('asOfDate') || searchParams.get('as_of_date') || getLocalTodayCalendarDate();
        const reportingCurrency = searchParams.get('reportingCurrency') || searchParams.get('reporting_currency') || undefined;

        const summary = getSharedFinancialSummary(db, {
            scopeEntityId,
            asOfDate,
            reportingCurrency
        });

        return secureJson({
            success: true,
            summary
        });
    } catch (error: any) {
        const demoRes = demoErrorResponse(error);
        if (demoRes) return demoRes;
        console.error('Balances GET Error:', error);
        return secureJson({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    // Demo mode is read-only (Phase 2.7).
    const demoDenied = demoReadOnlyResponse(request);
    if (demoDenied) return demoDenied;
    try {
        const db = getDbForRequest(request);

        const body = await request.json();
        const { items, provider, connectionId, batch } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return secureJson({ error: 'Payload must contain a non-empty "items" array of balance observations.' }, { status: 400 });
        }

        // Pre-validate all items before opening the database transaction
        // Why: Ensures invalid amounts, impossible calendar dates, unsupported currencies, or unreviewed findings
        // are rejected with HTTP 400 before any row is inserted or revision incremented (P03, P16).
        // Tricky logic: Items with unresolved_fields must be explicitly confirmed by user before committing.
        for (const item of items) {
            if (!item.account_id) {
                throw new ValidationError('Missing required account_id for balance observation item.');
            }
            if (!Number.isSafeInteger(item.amount_cents)) {
                throw new ValidationError(`Balance observation amount_cents must be a safe integer, received: ${item.amount_cents}`);
            }
            assertValidCalendarDate(item.effective_date, `Balance observation for account "${item.account_id}" effective_date`);
            if (item.currency && !(item.currency in CURRENCY_DECIMALS)) {
                throw new ValidationError(`Unsupported currency "${item.currency}". Supported: ${Object.keys(CURRENCY_DECIMALS).join(', ')}`);
            }
            if (Array.isArray(item.unresolved_fields) && item.unresolved_fields.length > 0 && !item.confirmed_by_user) {
                throw new ValidationError(
                    `Balance observation for account "${item.account_id}" has unconfirmed review findings: ${item.unresolved_fields.join(', ')}. Please confirm or resolve before saving.`
                );
            }
        }

        const savedObservations: BalanceObservation[] = [];
        const accountsRevisionChecked = new Set<string>();

        // Atomic commit across all approved observations in batch
        const tx = db.transaction(() => {
            // Delivery 2A Requirement C: If this batch contains raw statement text, persist evidence
            if (batch && batch.id && batch.raw_text) {
                recordBalanceImportBatch(db, {
                    id: batch.id,
                    raw_text: batch.raw_text,
                    extraction_method: batch.extraction_method || 'local_llm',
                    model_identifier: batch.model_identifier || null,
                    created_at: new Date().toISOString()
                });
            }

            for (const item of items) {
                // If this account was already verified and revision-incremented in this batch,
                // do not re-check expected_balance_revision to prevent intra-batch 409 conflicts (P10)
                const shouldCheckRevision = !accountsRevisionChecked.has(item.account_id);
                const expectedRevision = shouldCheckRevision ? item.expected_balance_revision : undefined;

                const obs = recordBalanceObservation(db, {
                    account_id: item.account_id,
                    amount_cents: item.amount_cents,
                    currency: item.currency,
                    balance_kind: item.balance_kind,
                    effective_date: item.effective_date,
                    effective_time: item.effective_time,
                    source_type: item.source_type || 'manual',
                    source_reference: item.source_reference,
                    source_batch_id: item.source_batch_id || (batch ? batch.id : null),
                    source_excerpt: item.source_excerpt || null,
                    is_user_modified: Boolean(item.is_user_modified),
                    // Why this exists:
                    // Delivery 2A Narrow Closing Corrections: Forward explicit classification correction
                    // intent separate from is_user_modified. Only deliberate changes to supporting-detail
                    // status authorize mutating an existing observation's classification.
                    //
                    // Tricky logic:
                    // If explicit_classification_correction is provided, prioritize it. Fall back to
                    // explicit_correction for backward compatibility with existing tests/callers.
                    //
                    // TODO: Deprecate explicit_correction alias in favor of explicit_classification_correction.
                    explicit_classification_correction: item.explicit_classification_correction !== undefined
                        ? Boolean(item.explicit_classification_correction)
                        : (item.explicit_correction !== undefined ? Boolean(item.explicit_correction) : undefined),
                    explicit_correction: item.explicit_classification_correction !== undefined
                        ? Boolean(item.explicit_classification_correction)
                        : (item.explicit_correction !== undefined ? Boolean(item.explicit_correction) : undefined),
                    is_correction: item.is_correction !== undefined ? Boolean(item.is_correction) : undefined,
                    is_component_of_total: Boolean(item.is_component_of_total),
                    parent_observation_id: item.parent_observation_id || null,
                    // Delivery 2B: Forward document_id and page_number
                    document_id: item.document_id || null,
                    page_number: typeof item.page_number === 'number' ? item.page_number : null,
                    review_status: 'accepted',
                    raw_label: item.raw_label,
                    expected_balance_revision: expectedRevision
                });

                accountsRevisionChecked.add(item.account_id);
                savedObservations.push(obs);

                // If source mapping is present, remember it
                if (provider && item.source_account_id) {
                    recordSourceMapping(db, {
                        accountId: item.account_id,
                        provider,
                        connectionId: connectionId || 'default',
                        sourceAccountId: item.source_account_id,
                        institution: item.institution
                    });
                }
            }

            // Why this exists:
            // Fulfills Independent Assessment Finding 4: Partial saves leave remaining items visibly pending.
            // If only a subset of proposals from a statement document are approved and saved, the remaining
            // proposals must remain in 'pending_review' state rather than being marked saved or discarded.
            //
            // Tricky logic:
            // Groups saved proposals by document_id. If specific proposal IDs are provided, calls markStatementProposalsSaved
            // which sets is_saved = true on those items and sets status = 'saved' ONLY IF all proposals are saved.
            // Why this exists:
            // Fulfills Independent Assessment Finding 4 & Delivery 2B Correction 2:
            // Partial saves leave remaining items visibly pending, and committed values (amount_cents, account_id, etc.)
            // are persisted directly into m1_statement_reviews so reopened reviews match committed observations.
            //
            // Tricky logic:
            // Groups saved proposals by document_id. Passes the full committed item list to markStatementProposalsSaved
            // which updates amount_cents and tags is_saved = true, setting review status = 'saved' ONLY IF all proposals are saved.
            //
            // TODO: In Milestone 2, return saved proposal IDs directly in the API response payload.
            const savedByDoc = new Map<string, any[]>();
            for (const item of items) {
                if (item.document_id) {
                    const list = savedByDoc.get(item.document_id) || [];
                    list.push(item);
                    savedByDoc.set(item.document_id, list);
                }
            }

            for (const [docId, savedItems] of savedByDoc.entries()) {
                try {
                    if (savedItems.length > 0) {
                        markStatementProposalsSaved(db, docId, savedItems);
                    } else {
                        db.prepare("UPDATE m1_statement_reviews SET status = 'saved', updated_at = ? WHERE document_id = ?")
                            .run(new Date().toISOString(), docId);
                    }
                } catch {
                    // Safe if table doesn't exist yet
                }
            }
        });

        tx();

        return secureJson({
            success: true,
            count: savedObservations.length,
            items: savedObservations
        });
    } catch (error: any) {
        if (error instanceof ValidationError) {
            return secureJson({ error: error.message }, { status: 400 });
        }
        if (error instanceof ConflictError) {
            return secureJson({ error: error.message }, { status: 409 });
        }
        console.error('Balances POST Error:', error);
        return secureJson({ error: error.message }, { status: 500 });
    }
}
