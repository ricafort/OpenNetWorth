/**
 * Why this file exists:
 * Ingests files attached to a mentor chat message (text/CSV, images, PDFs) into
 * the existing documents table so they reuse the vault's dedup, storage, and
 * GET /api/documents/raw serving — no parallel attachment blob store.
 *
 * Tricky logic:
 * - content_hash is UNIQUE on documents: an identical file re-attached under a
 *   different name reuses the existing row instead of failing or duplicating.
 *   A reused row missing extracted_text gets backfilled (e.g. first attach was
 *   before the PDF extractor existed).
 * - raw_content convention matches /api/documents/raw: text files store UTF-8,
 *   binary files (images, PDFs) store base64.
 * - PDF extraction failures never reject the upload — the file is stored and the
 *   reason is returned as a disclosure so the chat can say why it wasn't read.
 * - Limits: ≤4 files per message, 10 MB per file (413), strict mime allowlist (400).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getDb } from '@/infrastructure/sqlite/db';
import { extractPdfText } from '@/lib/domain/document/pdfTextExtractor';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

const MAX_FILES_PER_MESSAGE = 4;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);

function isAllowedMime(mime: string): boolean {
    return mime.startsWith('text/') || mime === 'application/pdf' || ALLOWED_IMAGE_MIMES.has(mime);
}

function sanitizeFilename(name: string): string {
    const base = (name || 'attachment').split(/[\\/]/).pop() || 'attachment';
    return base.slice(0, 200);
}

export async function POST(req: NextRequest) {
    const securityCheck = validateLocalSecurity(req);
    if (securityCheck) return securityCheck;
    try {
        const body = await req.json();
        const files = Array.isArray(body?.files) ? body.files : null;
        if (!files || files.length === 0) {
            return secureJson({ error: 'files array is required' }, { status: 400 });
        }
        if (files.length > MAX_FILES_PER_MESSAGE) {
            return secureJson({ error: `At most ${MAX_FILES_PER_MESSAGE} files per message` }, { status: 400 });
        }

        const db = getDb();

        const attachments: { id: string; filename: string; mimeType: string; byteSize: number }[] = [];
        const disclosures: string[] = [];

        for (const file of files) {
            const filename = sanitizeFilename(typeof file?.filename === 'string' ? file.filename : '');
            const mimeType = typeof file?.mimeType === 'string' ? file.mimeType.toLowerCase() : '';
            const dataBase64 = typeof file?.dataBase64 === 'string' ? file.dataBase64 : '';

            if (!mimeType || !isAllowedMime(mimeType) || !dataBase64) {
                return secureJson(
                    { error: `Unsupported or empty file: ${filename || 'unnamed'} (${mimeType || 'unknown type'})` },
                    { status: 400 }
                );
            }

            const buffer = Buffer.from(dataBase64, 'base64');
            if (buffer.byteLength === 0) {
                return secureJson({ error: `Empty file: ${filename}` }, { status: 400 });
            }
            if (buffer.byteLength > MAX_FILE_BYTES) {
                return secureJson({ error: `File exceeds 10 MB limit: ${filename}` }, { status: 413 });
            }

            const contentHash = createHash('sha256').update(buffer).digest('hex');
            const isText = mimeType.startsWith('text/');
            const isPdf = mimeType === 'application/pdf';
            const rawContent = isText ? buffer.toString('utf-8') : buffer.toString('base64');

            let extractedText: string | null = isText ? buffer.toString('utf-8') : null;
            if (isPdf) {
                const pdf = await extractPdfText(buffer);
                extractedText = pdf.text || null;
                if (pdf.reason) disclosures.push(`${filename}: ${pdf.detail}`);
            }
            if (ALLOWED_IMAGE_MIMES.has(mimeType)) {
                disclosures.push(`${filename}: image attached — vision is off, so the model was not shown its content.`);
            }

            const existing = db.prepare('SELECT id, extracted_text FROM documents WHERE content_hash = ?').get(contentHash) as any;
            if (existing) {
                // Backfill extraction for rows stored before text extraction existed.
                if (!existing.extracted_text && extractedText) {
                    db.prepare('UPDATE documents SET extracted_text = ? WHERE id = ?').run(extractedText, existing.id);
                }
                attachments.push({ id: existing.id, filename, mimeType, byteSize: buffer.byteLength });
                continue;
            }

            const id = crypto.randomUUID();
            db.prepare(`
                INSERT INTO documents (id, filename, content_hash, mime_type, byte_size, raw_content, extracted_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, filename, contentHash, mimeType, buffer.byteLength, rawContent, extractedText, new Date().toISOString());
            attachments.push({ id, filename, mimeType, byteSize: buffer.byteLength });
        }

        return secureJson({ success: true, attachments, disclosures });
    } catch (error: any) {
        console.error('Mentor attachment ingest error:', error);
        return secureJson({ error: error.message || 'Failed to ingest attachments' }, { status: 500 });
    }
}
