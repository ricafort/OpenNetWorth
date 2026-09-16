/**
 * Bank Transaction Candidates for Receipt Proposal Linking Route (Slice 1G)
 * 
 * Why this file exists:
 * Exposes a local GET endpoint for querying candidate bank transactions in the ledger
 * that match a provisional document proposal in currency, amount, account, and nearby date.
 * 
 * Tricky logic:
 * - Requires `proposal_id` query parameter.
 * - Enforces isolated test/prod SQLite connection via `getDb()`.
 * - Returns ranked candidates sorted by date proximity and match quality.
 * 
 * TODO: Support custom date window query parameters if user overrides search range in UI.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { getCandidateTransactionsForProposal } from '@/lib/domain/document/documentInboxService';

export async function GET(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const url = new URL(request.url);
        const proposalId = url.searchParams.get('proposal_id');

        if (!proposalId) {
            return NextResponse.json(
                { error: 'Missing required query parameter: proposal_id' },
                { status: 400 }
            );
        }

        const candidates = getCandidateTransactionsForProposal(db, proposalId);
        return NextResponse.json({ success: true, candidates });
    } catch (err: any) {
        console.error('Failed to get candidate transactions for proposal:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to get candidate transactions.' },
            { status: 500 }
        );
    }
}
