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
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import {
    recordBalanceObservation,
    recordSourceMapping,
    RecordObservationInput
} from '@/lib/domain/accounting/balanceObservationService';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';
import { BalanceObservation, CURRENCY_DECIMALS } from '@/lib/domain/accounting/types';
import { ValidationError, ConflictError } from '@/lib/domain/accounting/accountService';
import { assertValidCalendarDate } from '@/lib/domain/accounting/transactionService';

export async function GET(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const { searchParams } = new URL(request.url);
        const scopeEntityId = searchParams.get('scopeEntityId') || searchParams.get('entity_id') || undefined;
        const asOfDate = searchParams.get('asOfDate') || searchParams.get('as_of_date') || undefined;
        const reportingCurrency = searchParams.get('reportingCurrency') || searchParams.get('reporting_currency') || undefined;

        const summary = getSharedFinancialSummary(db, {
            scopeEntityId,
            asOfDate,
            reportingCurrency
        });

        return NextResponse.json({
            success: true,
            summary
        });
    } catch (error: any) {
        console.error('Balances GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const { items, provider, connectionId } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Payload must contain a non-empty "items" array of balance observations.' }, { status: 400 });
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
                    source_batch_id: item.source_batch_id,
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
        });

        tx();

        return NextResponse.json({
            success: true,
            count: savedObservations.length,
            items: savedObservations
        });
    } catch (error: any) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error instanceof ConflictError) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        console.error('Balances POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
