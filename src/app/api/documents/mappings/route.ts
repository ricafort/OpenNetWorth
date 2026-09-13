/**
 * Milestone 1 Reusable CSV Mappings API Route (Slice 1E)
 * 
 * Why this file exists:
 * Exposes local REST API endpoints to save, update, and retrieve reusable bank CSV column
 * mapping profiles.
 * 
 * Tricky logic:
 * - Upserts mapping based on id or header signature.
 * 
 * TODO: Add preset templates for major Australian and international retail banks in Slice 1F.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { listCsvMappings, saveCsvMapping } from '@/lib/domain/document/documentInboxService';

export async function GET() {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const mappings = listCsvMappings(db);
        return NextResponse.json({ success: true, mappings });
    } catch (err: any) {
        console.error('Failed to list mappings:', err);
        return NextResponse.json({ error: err.message || 'Failed to list mappings.' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const {
            id,
            name,
            header_signature,
            date_column,
            date_format,
            description_column,
            amount_mode,
            amount_column,
            debit_column,
            credit_column
        } = body;

        if (!name || !header_signature || !date_column || !description_column || !amount_mode) {
            return NextResponse.json({ error: 'Missing required mapping profile fields.' }, { status: 400 });
        }

        const saved = saveCsvMapping(db, {
            id,
            name,
            header_signature,
            date_column,
            date_format: date_format || 'YYYY-MM-DD',
            description_column,
            amount_mode: amount_mode || 'single_amount',
            amount_column,
            debit_column,
            credit_column
        });

        return NextResponse.json({ success: true, mapping: saved });
    } catch (err: any) {
        console.error('Failed to save mapping:', err);
        return NextResponse.json({ error: err.message || 'Failed to save mapping.' }, { status: 500 });
    }
}
