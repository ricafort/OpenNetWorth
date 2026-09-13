/**
 * Milestone 1 Document Inbox API Route (Slice 1E)
 * 
 * Why this file exists:
 * Exposes local REST API endpoints for listing ingested financial documents and uploading/parsing
 * untrusted bank CSV files into reviewable proposals.
 * Conforms to ADR 001: Untrusted inputs produce proposals in SQLite, not ledger mutations.
 * 
 * Tricky logic:
 * - Content hash deduplication: Ingesting an identical CSV returns the existing document record
 *   and retains existing proposal approval states without creating duplicate proposals.
 * - Always runs `initAccountingSchema(db)` to ensure document and accounting tables exist.
 * 
 * TODO: Add support for multipart/form-data file uploads alongside raw JSON strings.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { ingestCsvDocument, listDocuments } from '@/lib/domain/document/documentInboxService';
import { IngestCsvInput } from '@/lib/domain/document/types';

export async function GET() {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const documents = listDocuments(db);
        return NextResponse.json({ success: true, documents });
    } catch (err: any) {
        console.error('Failed to list documents:', err);
        return NextResponse.json({ error: err.message || 'Failed to list documents.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const { filename, raw_content, mapping, target_account_id, default_category, entity_id } = body;

        if (!filename || typeof filename !== 'string') {
            return NextResponse.json({ error: 'Missing required field: filename.' }, { status: 400 });
        }
        if (!raw_content || typeof raw_content !== 'string') {
            return NextResponse.json({ error: 'Missing required field: raw_content.' }, { status: 400 });
        }
        if (!mapping || !mapping.date_column || !mapping.description_column) {
            return NextResponse.json({ error: 'Invalid or missing mapping configuration.' }, { status: 400 });
        }
        if (!target_account_id || typeof target_account_id !== 'string') {
            return NextResponse.json({ error: 'Missing required field: target_account_id.' }, { status: 400 });
        }

        const input: IngestCsvInput = {
            filename,
            raw_content,
            mapping,
            target_account_id,
            default_category,
            entity_id
        };

        const result = ingestCsvDocument(db, input);
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        console.error('Failed to ingest document:', err);
        return NextResponse.json({ error: err.message || 'Failed to ingest document.' }, { status: 500 });
    }
}
