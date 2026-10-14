/**
 * Why this file exists:
 * Mentor chat accepts PDF attachments, and the answer must be grounded in the
 * document's text. This is the small, single-purpose sibling of
 * pdfStatementExtractor.ts: it returns the whole-document plain text (no page
 * coverage analysis, no proposals) plus an explicit failure `reason` so the
 * mentor route can disclose *why* a PDF could not be read instead of silently
 * answering without it.
 *
 * Tricky logic:
 * - pdf-parse v2's PDFParse needs an absolute file-URL worker path; Next.js
 *   bundling breaks its relative worker resolution (same fix as
 *   pdfStatementExtractor.ts around line 810).
 * - A PDF with a zero-text layer is a scan, not an error — callers disclose it
 *   differently from a corrupt file.
 */

export interface PdfTextResult {
    text: string;
    pages: number;
    /** Present when extraction failed or produced nothing usable. */
    reason?: 'password' | 'scanned' | 'error';
    /** Human-readable disclosure line for `reason` (already sentence-cased). */
    detail?: string;
}

export async function extractPdfText(pdfBuffer: Buffer): Promise<PdfTextResult> {
    const { PDFParse } = await import('pdf-parse');

    try {
        // Absolute file-URL worker path — relative resolution fails under the
        // Next.js server bundle (see pdfStatementExtractor.ts for the full story).
        try {
            const path = await import('path');
            const { pathToFileURL } = await import('url');
            const workerPath = path.resolve(process.cwd(), 'node_modules/pdf-parse/dist/worker/pdf.worker.mjs');
            PDFParse.setWorker(pathToFileURL(workerPath).href);
        } catch {
            // Fall back to default worker if path resolution fails
        }

        const parser = new PDFParse({ data: pdfBuffer });
        await (parser as any).load();
        const parsed = await parser.getText();
        await parser.destroy();

        // pdf-parse v2 injects "-- N of M --" page separators; a document whose
        // only "text" is separators has no selectable layer — it is a scan.
        const text = (parsed?.text || '').replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gm, '').trim();
        const pages = Number(parsed?.total) || (Array.isArray(parsed?.pages) ? parsed.pages.length : 0);

        if (!text) {
            return {
                text: '',
                pages,
                reason: 'scanned',
                detail: 'No selectable text found — the PDF looks like a scan, so its content was not analyzed.'
            };
        }
        return { text, pages };
    } catch (err: any) {
        const msg = err?.message || String(err);
        if (/password|encrypted/i.test(msg)) {
            return {
                text: '',
                pages: 0,
                reason: 'password',
                detail: 'Password-protected PDF: its content was not analyzed.'
            };
        }
        return {
            text: '',
            pages: 0,
            reason: 'error',
            detail: `Could not read the PDF (${msg}); its content was not analyzed.`
        };
    }
}
