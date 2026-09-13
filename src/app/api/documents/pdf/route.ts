/**
 * Milestone 1 PDF Invoice Ingestion API Route (Slice 1F)
 * 
 * Why this file exists:
 * Provides the HTTP API endpoint for uploading and extracting text-based invoice and receipt PDFs
 * through OpenTax-AU's specialized parser, producing reviewable financial proposals.
 * 
 * Tricky logic:
 * - Supports both `multipart/form-data` (file upload from browser) and JSON payload (`file_base64`).
 * - Preserves original binary content in `m1_documents` and generates SHA-256 content hashes.
 * - Non-destructive reimport: If already approved, returns existing document without duplicate postings.
 * 
 * TODO: Add background asynchronous worker job dispatch for multi-page batch PDFs in Slice 1G.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { ingestPdfDocument } from '@/lib/domain/document/documentInboxService';

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const contentType = request.headers.get('content-type') || '';

        let filename = 'invoice.pdf';
        let buffer: Buffer | null = null;
        let targetAccountId: string | undefined;
        let defaultCategory: string | undefined;
        let entityId: string | undefined;

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File | null;
            if (!file) {
                return NextResponse.json({ error: 'Missing required file in form data.' }, { status: 400 });
            }

            filename = file.name || 'uploaded_invoice.pdf';
            const arrayBuffer = await file.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);

            targetAccountId = (formData.get('target_account_id') as string) || undefined;
            defaultCategory = (formData.get('default_category') as string) || undefined;
            entityId = (formData.get('entity_id') as string) || undefined;
        } else {
            const body = await request.json();
            filename = body.filename || 'uploaded_invoice.pdf';
            if (body.file_base64) {
                buffer = Buffer.from(body.file_base64, 'base64');
            }
            targetAccountId = body.target_account_id;
            defaultCategory = body.default_category;
            entityId = body.entity_id;
        }

        if (!buffer || buffer.length === 0) {
            return NextResponse.json({ error: 'No PDF file content was provided.' }, { status: 400 });
        }

        const result = await ingestPdfDocument(db, {
            filename,
            file_buffer: buffer,
            target_account_id: targetAccountId,
            default_category: defaultCategory,
            entity_id: entityId
        });

        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        console.error('Failed to ingest PDF document:', err);
        return NextResponse.json({ error: err.message || 'Failed to ingest PDF document.' }, { status: 500 });
    }
}
