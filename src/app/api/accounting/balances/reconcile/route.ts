/**
 * Balance Reconciliation Comparison API Route
 * 
 * Why this file exists:
 * Fulfills Delivery 2A Finding 5:
 * Exposes authoritative domain-service reconciliation comparisons (`ReconciliationComparison`)
 * for transaction-tracked accounts, computing `diff_cents` and `is_comparable` against settled double-entry postings.
 * Allows the review modal to dynamically refresh comparisons when account, date, amount, or kind changes.
 * 
 * Tricky logic:
 * - Reconciles against the observation's *effective date*, NOT today's date.
 * - Flags non-comparable balance kinds (available balance, credit limits, redraw) with is_comparable: false.
 * - Strictly guarded by local security headers.
 * 
 * TODO: In Milestone 2, support linking reconciliation variance to unmatched draft items.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { getReconciliationComparison, getObservationById, getLatestObservation } from '@/lib/domain/accounting/balanceObservationService';
import { ValidationError } from '@/lib/domain/accounting/accountService';
import { isValidCalendarDate } from '@/lib/domain/calendarDate';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        const db = getDb();

        const body = await request.json();
        const { account_id, amount_cents, currency, balance_kind, effective_date, observation_id, latest } = body;

        if (!account_id) {
            return applySensitiveHeaders(NextResponse.json({ error: 'account_id is required' }, { status: 400 }));
        }

        // Count modes to reject ambiguous combinations
        let modeCount = 0;
        if (observation_id) modeCount++;
        if (latest !== undefined) {
            if (latest !== true) {
                return applySensitiveHeaders(NextResponse.json({ error: 'latest must be boolean true' }, { status: 400 }));
            }
            modeCount++;
        }
        if (amount_cents !== undefined || currency || balance_kind || effective_date !== undefined) modeCount++;

        if (modeCount !== 1) {
            return applySensitiveHeaders(NextResponse.json({ error: 'Ambiguous request: Must specify exactly one of: observation_id, latest, or preview facts (amount, currency, kind, date).' }, { status: 400 }));
        }

        let obsForComparison: any;

        if (observation_id) {
            const savedObs = getObservationById(db, observation_id);
            if (!savedObs) {
                return applySensitiveHeaders(NextResponse.json({ error: 'Observation not found' }, { status: 404 }));
            }
            if (savedObs.account_id !== account_id) {
                return applySensitiveHeaders(NextResponse.json({ error: 'Observation does not belong to the requested account' }, { status: 400 }));
            }
            if (savedObs.review_status === 'superseded') {
                return applySensitiveHeaders(NextResponse.json({ error: 'This balance was replaced by a reviewed correction. Check the current accepted balance.' }, { status: 400 }));
            }
            if (savedObs.review_status !== 'accepted') {
                return applySensitiveHeaders(NextResponse.json({ error: 'Observation is not in an accepted state.' }, { status: 400 }));
            }
            obsForComparison = savedObs;
        } else if (latest) {
            const latestObs = getLatestObservation(db, account_id);
            if (!latestObs) {
                return applySensitiveHeaders(NextResponse.json({ error: 'No saved observation found for this account' }, { status: 404 }));
            }
            obsForComparison = latestObs;
        } else {
            // Unsaved preview mode
            if (typeof amount_cents !== 'number') {
                return applySensitiveHeaders(NextResponse.json({ error: 'amount_cents is required and must be a number' }, { status: 400 }));
            }
            if (!currency || typeof currency !== 'string') {
                return applySensitiveHeaders(NextResponse.json({ error: 'currency is required' }, { status: 400 }));
            }
            if (!balance_kind || typeof balance_kind !== 'string') {
                return applySensitiveHeaders(NextResponse.json({ error: 'balance_kind is required' }, { status: 400 }));
            }
            if (!effective_date || typeof effective_date !== 'string' || !effective_date.trim()) {
                return applySensitiveHeaders(NextResponse.json({ error: 'A valid calendar effective_date (YYYY-MM-DD) is required for preview.' }, { status: 400 }));
            }
            
            obsForComparison = {
                account_id,
                amount_cents,
                currency,
                balance_kind,
                effective_date: effective_date.trim(),
                source_type: 'table_paste'
            };
        }

        // Validate effective_date: must not be blank, and must be a valid calendar date (YYYY-MM-DD)
        // Why this exists:
        // Fulfills Delivery 2A Narrow Closing Corrections (Item 2):
        // Rejects invalid reconciliation requests with HTTP 400.
        // Prevents calculating using an implicit "today" when the date field is blank.
        // 
        // Tricky logic:
        // Must reject impossible calendar dates (e.g. 2026-02-31) and blank/missing dates.
        // 
        // TODO: In Milestone 2, support explicit date range reconciliation queries.
        if (!obsForComparison.effective_date || typeof obsForComparison.effective_date !== 'string' || !obsForComparison.effective_date.trim() || !isValidCalendarDate(obsForComparison.effective_date.trim())) {
            return applySensitiveHeaders(NextResponse.json({
                error: 'A valid calendar effective_date (YYYY-MM-DD) is required for reconciliation'
            }, { status: 400 }));
        }

        const recon = getReconciliationComparison(db, account_id, obsForComparison);

        return applySensitiveHeaders(NextResponse.json({
            success: true,
            reconciliation: recon
        }));
    } catch (error: any) {
        if (error instanceof ValidationError) {
            return applySensitiveHeaders(NextResponse.json({ error: error.message }, { status: 400 }));
        }
        console.error('Reconciliation comparison error:', error);
        return applySensitiveHeaders(NextResponse.json({ error: error.message }, { status: 500 }));
    }
}
