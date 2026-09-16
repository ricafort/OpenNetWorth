/**
 * OpenTax-AU Extraction Adapter Service (Milestone 1 Slice 1F)
 * 
 * Why this file exists:
 * Provides the decoupled adapter interface between OpenNetWorth and OpenTax-AU's
 * document extraction pipeline. Reuses OpenTax-AU's InvoiceParser to extract
 * structured supplier, date, currency, line item, and tax facts from text-based
 * PDFs without replicating Python tax parsing logic or pulling in Australian tax return bias.
 * 
 * Tricky logic:
 * - Subprocess execution: Spawns the dedicated bridge script `scripts/opentax_reader.py`
 *   using OpenTax-AU's virtual environment (`.venv/Scripts/python.exe`), passing the file path.
 * - Integer minor-unit conversion: Translates floating-point values from the Python parser
 *   into exact integer minor units (cents) according to the extracted currency's scale.
 * - Layout boundary enforcement: Documents that fail the supported layout (e.g. non-invoice,
 *   unidentified supplier, missing total) are marked `supported: false` and given descriptive
 *   validation findings. No amounts are guessed.
 * - Test Isolation / Injection: Allows injecting a custom extractor function so unit tests
 *   can run deterministically with or without an active Python interpreter.
 * 
 * TODO:
 * - Support batch multi-document extraction via background job queue in Slice 1G.
 * - Add local vision model integration for scanned receipt images in Slice 1G.
 */

import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { promisify } from 'util';
import { CurrencyCode, CURRENCY_DECIMALS, assertValidMoneyCents } from '../accounting/types';
import { ValidationFinding } from './types';

const execFileAsync = promisify(execFile);

export interface ExtractedPdfLineItem {
    description: string;
    amount_cents: number;
    source_line?: number;
}

export interface ExtractedPdfDocument {
    supported: boolean;
    layout_name?: string;
    supplier_name?: string | null;
    invoice_number?: string | null;
    date?: string | null; // ISO YYYY-MM-DD
    currency: CurrencyCode | null;
    total_cents: number;
    tax_cents: number;
    net_cents: number;
    line_items: ExtractedPdfLineItem[];
    source_snippet: string;
    validation_findings: ValidationFinding[];
    raw_text?: string;
}

/**
 * Type definition for mockable extractor function.
 */
export type ExtractorFn = (filePath: string) => Promise<ExtractedPdfDocument>;

let customExtractor: ExtractorFn | null = null;

/**
 * Sets a custom extractor function for isolated unit testing.
 */
export function setCustomExtractor(extractor: ExtractorFn | null): void {
    customExtractor = extractor;
}

/**
 * Resolves the path to the Python executable in OpenTax-AU.
 */
function getPythonPath(): string {
    if (process.env.OPENTAX_PYTHON) {
        return process.env.OPENTAX_PYTHON;
    }
    const standardVenv = path.resolve('D:\\', 'AntiGravityProjects', 'opentax-au', '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(standardVenv)) {
        return standardVenv;
    }
    return 'python';
}

/**
 * Resolves the path to the bridge reader script.
 */
function getBridgeScriptPath(): string {
    return path.resolve(process.cwd(), 'scripts', 'opentax_reader.py');
}

/**
 * Converts a float amount to exact integer minor units (cents) for a currency.
 * 
 * Why this exists:
 * Ensures money amounts extracted from PDFs are accurately converted to safe integer
 * minor units before entering domain models and double-entry postings.
 * 
 * Tricky logic:
 * - Nullable currency: when currency is unresolved/null, defaults to scale 2 (standard cents).
 * - Multiplies by 10^scale and rounds to avoid floating point representation issues.
 * - Asserts safe integer bounds to prevent overflows.
 * 
 * TODO: Support 3-decimal currencies if introduced in later slices.
 */
function toMinorUnits(amount: number | null | undefined, currency: CurrencyCode | null): number {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return 0;
    }
    const scale = currency ? (CURRENCY_DECIMALS[currency] ?? 2) : 2;
    const factor = Math.pow(10, scale);
    const cents = Math.round(amount * factor);
    assertValidMoneyCents(cents, `Extracted ${currency || 'unspecified'} amount`);
    return cents;
}

/**
 * Extracts structured financial facts from a text-based PDF invoice or receipt.
 * 
 * @param source Either an absolute file path on disk or a Buffer containing the raw PDF bytes.
 * @returns Standardized ExtractedPdfDocument.
 */
export async function extractInvoiceFromPdf(source: string | Buffer): Promise<ExtractedPdfDocument> {
    if (customExtractor) {
        if (typeof source === 'string') {
            return customExtractor(source);
        }
        // If buffer, write to temp file for custom extractor
        const tmpPath = path.join(os.tmpdir(), `test_extract_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
        try {
            fs.writeFileSync(tmpPath, source);
            return await customExtractor(tmpPath);
        } finally {
            if (fs.existsSync(tmpPath)) {
                fs.unlinkSync(tmpPath);
            }
        }
    }

    let filePath: string;
    let isTempFile = false;

    if (typeof source === 'string') {
        filePath = source;
    } else {
        // Write buffer to temporary file for python reader
        isTempFile = true;
        const tmpFilename = `onw_invoice_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
        filePath = path.join(os.tmpdir(), tmpFilename);
        fs.writeFileSync(filePath, source);
    }

    try {
        const pythonExe = getPythonPath();
        const scriptPath = getBridgeScriptPath();

        const { stdout, stderr } = await execFileAsync(pythonExe, [scriptPath, filePath], {
            timeout: 20000,
            maxBuffer: 10 * 1024 * 1024,
            env: {
                ...process.env,
                PYTHONIOENCODING: 'utf-8'
            }
        });

        if (!stdout || !stdout.trim()) {
            return {
                supported: false,
                currency: null,
                total_cents: 0,
                tax_cents: 0,
                net_cents: 0,
                line_items: [],
                source_snippet: stderr || 'No output received from OpenTax-AU reader.',
                validation_findings: [{
                    severity: 'error',
                    code: 'EXTRACTOR_EMPTY_OUTPUT',
                    message: 'OpenTax-AU reader returned no structured output.'
                }]
            };
        }

        const rawResult = JSON.parse(stdout);

        // Preserve extracted currency without fallback (Fix 1)
        let currency: CurrencyCode | null = rawResult.currency ? (rawResult.currency.toUpperCase() as CurrencyCode) : null;
        if (currency && CURRENCY_DECIMALS[currency] === undefined) {
            currency = null; // Ignore invalid currency strings like "DUE"
        }
        const totalCents = toMinorUnits(rawResult.total_amount, currency);
        const taxCents = toMinorUnits(rawResult.gst_amount, currency);
        const netCents = toMinorUnits(rawResult.subtotal, currency);

        const findings: ValidationFinding[] = [];

        // Missing currency must remain unresolved with a blocking error until reviewed (Fix 1)
        if (!currency) {
            findings.push({
                severity: 'error',
                code: 'MISSING_CURRENCY',
                message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
            });
        }

        // Map python warnings to validation findings
        if (Array.isArray(rawResult.warnings)) {
            for (const warning of rawResult.warnings) {
                findings.push({
                    severity: 'warning',
                    code: 'EXTRACTOR_WARNING',
                    message: String(warning)
                });
            }
        }

        if (!rawResult.supported) {
            findings.push({
                severity: 'error',
                code: 'UNSUPPORTED_LAYOUT',
                message: rawResult.error || 'Document does not match the supported text-based supplies invoice layout and has been retained as unresolved.'
            });
        }

        const lineItems: ExtractedPdfLineItem[] = Array.isArray(rawResult.line_items)
            ? rawResult.line_items.map((item: any) => ({
                description: String(item.description || 'Invoice Item'),
                amount_cents: toMinorUnits(item.amount, currency),
                source_line: item.source_line ? Number(item.source_line) : undefined
            }))
            : [];

        let supplierName = rawResult.supplier_name || null;
        if (supplierName && (supplierName.toUpperCase().includes('TAX INVOICE') || supplierName.toUpperCase().includes('RECEIPT') || supplierName.toUpperCase().includes('STATEMENT') || supplierName.toUpperCase().includes('SYNTHETIC SAMPLE'))) {
            supplierName = null; // Reject common banner text masquerading as supplier name
        }

        return {
            supported: Boolean(rawResult.supported),
            layout_name: rawResult.layout,
            supplier_name: supplierName,
            invoice_number: rawResult.invoice_number || null,
            date: rawResult.date || null,
            currency,
            total_cents: totalCents,
            tax_cents: taxCents,
            net_cents: netCents,
            line_items: lineItems,
            source_snippet: rawResult.source_snippet || '',
            validation_findings: findings,
            raw_text: rawResult.raw_text
        };
    } catch (err: any) {
        return {
            supported: false,
            currency: null,
            total_cents: 0,
            tax_cents: 0,
            net_cents: 0,
            line_items: [],
            source_snippet: `Execution error: ${err.message}`,
            validation_findings: [{
                severity: 'error',
                code: 'ADAPTER_EXECUTION_FAILED',
                message: `Failed to execute OpenTax-AU reader: ${err.message}`
            }]
        };
    } finally {
        if (isTempFile && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch {
                // Ignore cleanup errors
            }
        }
    }
}
