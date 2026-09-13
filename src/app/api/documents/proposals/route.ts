/**
 * Milestone 1 Document Proposals & Batch Approval API Route (Slice 1E)
 * 
 * Why this file exists:
 * Exposes local REST API endpoints for querying provisional financial proposals extracted
 * from a document, and atomically approving selected proposals into the double-entry ledger.
 * 
 * Tricky logic:
 * - Atomic approval: Wraps posting in a database transaction; if any row fails, none commit.
 * - Idempotency: Re-approving already posted proposals is safe and causes zero duplicate transactions.
 * - Error findings: Rejects attempts to approve proposals with unresolved error findings.
 * 
 * TODO: Add support for rejecting or modifying proposed categories in bulk in Slice 1F.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { approveProposals, getDocumentProposals, updateProposalReview } from '@/lib/domain/document/documentInboxService';
import { BatchApproveProposalsInput } from '@/lib/domain/document/types';

export async function GET(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const url = new URL(request.url);
        const documentId = url.searchParams.get('document_id');

        if (!documentId) {
            return NextResponse.json({ error: 'Missing required query parameter: document_id' }, { status: 400 });
        }

        const proposals = getDocumentProposals(db, documentId);
        return NextResponse.json({ success: true, proposals });
    } catch (err: any) {
        console.error('Failed to get proposals:', err);
        return NextResponse.json({ error: err.message || 'Failed to get proposals.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const { document_id, target_account_id, entity_id, items } = body;

        if (!document_id || typeof document_id !== 'string') {
            return NextResponse.json({ error: 'Missing required field: document_id' }, { status: 400 });
        }
        if (!target_account_id || typeof target_account_id !== 'string') {
            return NextResponse.json({ error: 'Missing required field: target_account_id' }, { status: 400 });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Items array must contain at least one proposal to approve.' }, { status: 400 });
        }

        const input: BatchApproveProposalsInput = {
            document_id,
            target_account_id,
            entity_id: entity_id || '',
            items
        };

        const result = approveProposals(db, input);
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        console.error('Failed to approve proposals:', err);
        return NextResponse.json({ error: err.message || 'Failed to approve proposals.' }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const { proposal_id, event_date, counterparty, description, amount_cents, original_currency, account_id, suggested_category, review_status } = body;

        if (!proposal_id || typeof proposal_id !== 'string') {
            return NextResponse.json({ error: 'Missing required field: proposal_id' }, { status: 400 });
        }

        const updated = updateProposalReview(db, {
            proposal_id,
            event_date,
            counterparty,
            description,
            amount_cents,
            original_currency,
            account_id,
            suggested_category,
            review_status
        });

        return NextResponse.json({ success: true, proposal: updated });
    } catch (err: any) {
        console.error('Failed to update proposal:', err);
        return NextResponse.json({ error: err.message || 'Failed to update proposal.' }, { status: 500 });
    }
}

