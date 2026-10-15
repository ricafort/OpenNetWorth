/**
 * Statement Document Ingestion & Durable Review API Route
 * 
 * Why this file exists:
 * Fulfills Delivery 2B (Statement Files to Reviewed Balances):
 * Exposes endpoints for uploading financial statement PDFs, assessing per-page coverage,
 * running the portable PDF extraction pipeline with cross-page context propagation,
 * and managing durable pending review sessions in SQLite (`m1_statement_reviews`).
 * 
 * Tricky logic:
 * - Duplicate Detection & Preservation: If a statement PDF with the exact same SHA-256 hash
 *   is re-uploaded, inspects whether it was already saved. If saved, preserves saved decisions.
 *   If pending review, returns the preserved modified proposals so users can resume review.
 * - Multi-Part Form Data: Reads incoming PDF file buffers safely without external upload dependencies.
 * - Non-Posting Invariant: Uploading and updating proposals NEVER posts to the transaction ledger (`m1_transactions`).
 * - Debounced Review Autosync: PUT endpoint allows the review modal to autosync modified proposal fields
 *   so browser reloads don't discard in-flight user adjustments.
 * 
 * TODO: In Milestone 2, support batch multi-statement concurrent uploads.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/infrastructure/sqlite/db';
import { extractStatementBalancesFromPdf } from '@/lib/domain/document/pdfStatementExtractor';
import {
    saveStatementReview,
    getStatementReviewByDocumentId,
    updateStatementReviewProposals,
    listStatementReviews
} from '@/lib/domain/accounting/statementReviewService';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;

    try {
        const db = getDb();

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const entityId = formData.get('entity_id') as string | null;

        if (!file) {
            return applySensitiveHeaders(NextResponse.json({ error: 'No file uploaded' }, { status: 400 }));
        }

        const filename = file.name || 'statement.pdf';
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length === 0) {
            return applySensitiveHeaders(NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 }));
        }

        const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
        const now = new Date().toISOString();

        // 1. Check if document already exists in m1_documents
        const existingDoc = db.prepare('SELECT * FROM m1_documents WHERE content_hash = ?').get(contentHash) as any;

        if (existingDoc) {
            const existingReview = getStatementReviewByDocumentId(db, existingDoc.id);

            // If already saved, preserve saved decisions and notify caller
            if (existingReview && existingReview.status === 'saved') {
                return applySensitiveHeaders(NextResponse.json({
                    success: true,
                    is_duplicate: true,
                    already_saved: true,
                    document: {
                        id: existingDoc.id,
                        filename: existingDoc.filename,
                        content_hash: existingDoc.content_hash,
                        byte_size: existingDoc.byte_size
                    },
                    review: existingReview,
                    proposals: existingReview.proposals,
                    coverage_summary: existingReview.coverage_summary,
                    message: 'This statement document was previously imported and its balances were saved.'
                }));
            }

            // If pending review, resume review with preserved in-flight modifications
            if (existingReview && existingReview.status === 'pending_review') {
                return applySensitiveHeaders(NextResponse.json({
                    success: true,
                    is_resumed: true,
                    document: {
                        id: existingDoc.id,
                        filename: existingDoc.filename,
                        content_hash: existingDoc.content_hash,
                        byte_size: existingDoc.byte_size
                    },
                    review: existingReview,
                    proposals: existingReview.proposals,
                    coverage_summary: existingReview.coverage_summary,
                    message: 'Resuming existing statement review session.'
                }));
            }
        }

        // 2. Persist new document record in m1_documents
        const docId = existingDoc ? existingDoc.id : `doc-${crypto.randomUUID()}`;
        if (!existingDoc) {
            db.prepare(`
                INSERT INTO m1_documents (
                    id, filename, content_hash, mime_type, byte_size, storage_path, raw_content, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                docId,
                filename,
                contentHash,
                'application/pdf',
                buffer.length,
                null,
                buffer.toString('base64'),
                now
            );
        }

        // 3. Extract statement balances with per-page coverage evaluation & context carry
        const extraction = await extractStatementBalancesFromPdf(db, buffer, filename, docId, entityId || undefined);

        // If extraction is completely unsupported (e.g. scanned image or password-protected) or has zero balance proposals
        if (!extraction.supported || extraction.proposals.length === 0) {
            saveStatementReview(db, {
                document_id: docId,
                status: 'failed',
                proposals: [],
                coverage_summary: extraction.coverage_summary
            });

            const unsupportedMsg = extraction.proposals.length === 0
                ? 'Unsupported statement layout: no balance summary or account valuation figures were found in this document. You can enter the balance manually using the document as reference.'
                : (extraction.error || 'Failed to extract statement text.');

            return applySensitiveHeaders(NextResponse.json({
                success: false,
                supported: false,
                error: unsupportedMsg,
                coverage_summary: extraction.coverage_summary,
                disclosures: extraction.disclosures,
                document_id: docId
            }, { status: 422 }));
        }

        // 4. Save durable pending review session in m1_statement_reviews
        const review = saveStatementReview(db, {
            document_id: docId,
            status: 'pending_review',
            proposals: extraction.proposals,
            coverage_summary: extraction.coverage_summary
        });

        return applySensitiveHeaders(NextResponse.json({
            success: true,
            document: {
                id: docId,
                filename,
                content_hash: contentHash,
                byte_size: buffer.length
            },
            review,
            proposals: extraction.proposals,
            coverage_summary: extraction.coverage_summary,
            disclosures: extraction.disclosures
        }));

    } catch (err: any) {
        console.error('Statement upload error:', err);
        return applySensitiveHeaders(NextResponse.json({
            error: 'Internal Server Error',
            details: err.message
        }, { status: 500 }));
    }
}

export async function GET(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;

    try {
        const db = getDb();

        const url = new URL(request.url);
        const documentId = url.searchParams.get('document_id');

        if (documentId) {
            const review = getStatementReviewByDocumentId(db, documentId);
            if (!review) {
                return applySensitiveHeaders(NextResponse.json({ error: 'Review session not found' }, { status: 404 }));
            }
            return applySensitiveHeaders(NextResponse.json({ success: true, review }));
        }

        // List all statement reviews
        const reviews = listStatementReviews(db);
        return applySensitiveHeaders(NextResponse.json({ success: true, reviews }));
    } catch (err: any) {
        console.error('Statement GET error:', err);
        return applySensitiveHeaders(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

export async function PUT(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;

    try {
        const db = getDb();

        const body = await request.json();
        const { document_id, proposals, version } = body;

        // Why this exists:
        // Fulfills Independent Assessment Finding 4 & Delivery 2B Correction 2:
        // Validates required document identifier and proposals array.
        // Rejects updates against non-existent review sessions with HTTP 404.
        // Prevents overwriting already completed and saved review sessions.
        // Drops stale older autosaves that arrive out of order, returning HTTP 409 Conflict.
        //
        // Tricky logic:
        // Returns the updated review state so callers can verify merged flags (is_saved, explicit_classification_correction).
        // If the review was already fully saved, ignores mutation and returns the preserved saved review.
        // If clientVersion is strictly older than SQLite version, explicitly returns HTTP 409 with stale: true,
        // preventing the UI from falsely displaying "Review Autosaved" for an ignored update.
        //
        // TODO: In Milestone 2, accept an optional expected_review_version for optimistic concurrency control.
        if (!document_id || !Array.isArray(proposals)) {
            return applySensitiveHeaders(NextResponse.json({
                error: 'document_id and proposals array are required'
            }, { status: 400 }));
        }

        const existingReview = getStatementReviewByDocumentId(db, document_id);
        if (!existingReview) {
            return applySensitiveHeaders(NextResponse.json({
                error: 'Statement review session not found'
            }, { status: 404 }));
        }

        if (existingReview.status === 'saved') {
            return applySensitiveHeaders(NextResponse.json({
                success: true,
                message: 'Statement review is already saved; modifications ignored.',
                review: existingReview
            }));
        }

        const clientVersionNum = typeof version === 'number' ? version : undefined;
        const result = updateStatementReviewProposals(db, document_id, proposals, clientVersionNum);

        if (!result) {
            return applySensitiveHeaders(NextResponse.json({
                error: 'Statement review session not found'
            }, { status: 404 }));
        }

        // Explicitly report rejected stale updates so the client never displays "Review Autosaved" for ignored mutations
        if (result.stale) {
            return applySensitiveHeaders(NextResponse.json({
                success: false,
                stale: true,
                error: `Stale review version (${clientVersionNum} < ${result.current_version}). Server version is ${result.current_version}. Changes rejected.`,
                current_version: result.current_version,
                review: result
            }, { status: 409 }));
        }

        return applySensitiveHeaders(NextResponse.json({
            success: true,
            review: result
        }));
    } catch (err: any) {
        console.error('Statement PUT error:', err);
        return applySensitiveHeaders(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}
