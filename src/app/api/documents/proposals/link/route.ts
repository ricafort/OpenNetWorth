/**
 * Receipt Proposal to Transaction Linking API Route (Slice 1G)
 * 
 * Why this file exists:
 * Exposes a local POST endpoint to attach an extracted PDF receipt/invoice proposal
 * as supporting evidence to an existing bank transaction without creating another expense.
 * 
 * Tricky logic:
 * - Validates proposal_id and transaction_id.
 * - Invariant: Zero new financial postings created, zero account balance change.
 * - Updates proposal review_status to 'linked' and links transaction evidence_refs.
 * 
 * TODO: Support unlinking / detaching evidence in future slices.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { linkProposalToTransaction } from '@/lib/domain/document/documentInboxService';

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const { proposal_id, transaction_id } = body;

        if (!proposal_id || typeof proposal_id !== 'string') {
            return NextResponse.json(
                { error: 'Missing required field: proposal_id' },
                { status: 400 }
            );
        }
        if (!transaction_id || typeof transaction_id !== 'string') {
            return NextResponse.json(
                { error: 'Missing required field: transaction_id' },
                { status: 400 }
            );
        }

        const result = linkProposalToTransaction(db, {
            proposal_id,
            transaction_id
        });

        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        console.error('Failed to link proposal to transaction:', err);
        return NextResponse.json(
            { error: err.message || 'Failed to link proposal to transaction.' },
            { status: 400 }
        );
    }
}
