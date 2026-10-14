/**
 * Why this file exists:
 * Guards the failure-mode contract of extractPdfText: the mentor route discloses
 * *why* a PDF could not be read, and that depends on distinguishing a scan
 * ('scanned') from an encrypted file ('password') from a corrupt/invalid one
 * ('error'). Success is verified against the real pdf-parse stack using the
 * synthetic jsPDF statement fixtures.
 *
 * Tricky logic:
 * - The pdf-parse mock wraps the REAL class and only intercepts load() for two
 *   sentinel buffers, so password/corrupt branches are deterministic while the
 *   scanned and success paths still exercise the actual parser.
 * - The wrapper must forward the static setWorker, which the extractor calls
 *   before instantiating.
 *
 * All operations execute strictly in-memory; zero live storage modifications.
 */

import { describe, it, expect, vi } from 'vitest';
import { createCreditCardStatementPdf, createScannedImageStatementPdf } from './fixtures/statementFixtures';

vi.mock('pdf-parse', async (importOriginal: () => Promise<any>) => {
    const actual = await importOriginal();
    const wrapper: any = function (this: any, opts: any) {
        const real = new (actual.PDFParse as any)(opts);
        const originalLoad = (real as any).load.bind(real);
        (real as any).load = async () => {
            const data: Buffer = opts?.data;
            if (data && Buffer.from('SIMULATE_PASSWORD').equals(data)) {
                throw new Error('PasswordException: Password required');
            }
            if (data && Buffer.from('SIMULATE_CORRUPT').equals(data)) {
                throw new Error('Invalid PDF structure');
            }
            return originalLoad();
        };
        return real;
    };
    wrapper.setWorker = (url: string) => (actual.PDFParse as any).setWorker(url);
    return { ...actual, PDFParse: wrapper };
});

import { extractPdfText } from './pdfTextExtractor';

describe('extractPdfText', () => {
    it('extracts selectable text from a real text-layer PDF', async () => {
        const result = await extractPdfText(createCreditCardStatementPdf());
        expect(result.reason).toBeUndefined();
        expect(result.text).toContain('Closing Balance');
        expect(result.pages).toBeGreaterThanOrEqual(1);
    });

    it('classifies a zero-text-layer PDF as a scan, not an error', async () => {
        const result = await extractPdfText(createScannedImageStatementPdf());
        expect(result.text).toBe('');
        expect(result.reason).toBe('scanned');
        expect(result.detail).toContain('scan');
    });

    it('classifies an encrypted PDF as password-protected', async () => {
        const result = await extractPdfText(Buffer.from('SIMULATE_PASSWORD'));
        expect(result.text).toBe('');
        expect(result.reason).toBe('password');
        expect(result.detail).toContain('Password-protected');
    });

    it('classifies a corrupt PDF as an error and keeps the parser message in detail', async () => {
        const result = await extractPdfText(Buffer.from('SIMULATE_CORRUPT'));
        expect(result.text).toBe('');
        expect(result.reason).toBe('error');
        expect(result.detail).toContain('Invalid PDF structure');
    });

    it('returns an error result (never throws) for a non-PDF buffer', async () => {
        const result = await extractPdfText(Buffer.from('plain text pretending to be a PDF'));
        expect(result.text).toBe('');
        expect(['error', 'scanned']).toContain(result.reason);
        expect(result.detail).toBeTruthy();
    });
});
