/**
 * Deterministic Structured Balance Parser
 * 
 * Why this file exists:
 * Implements Delivery 1 deterministic parsing for structured CSV, TSV, and tabular pasted text.
 * Allows users to paste spreadsheets or bank tables without depending on external AI models.
 * Strictly converts monetary amounts to integer minor units (cents) and identifies financial balance kinds.
 * 
 * Tricky logic:
 * - Header detection & mapping: Prioritizes explicitly labelled Balance/Amount columns over trailing account numbers.
 * - Currency scaling: Respects CURRENCY_DECIMALS (JPY = scale 0, AUD/USD = scale 2), flagging excess precision.
 * - Balance kind semantic detection: Distinguishes non-valuation lines (credit limits, redraw, projected values)
 *   from true valuation lines (current balance, portfolio value) to prevent inflated net worth calculations.
 * - Negative and liability handling: Preserves the source magnitude and negative sign for credit balances / overpayments.
 * - Date validation: Normalizes Australian hyphen DD-MM-YYYY and ISO YYYY-MM-DD dates; flags absent dates as unresolved.
 * 
 * TODO: Add automatic delimiter auto-detection (comma vs tab vs semicolon) benchmark suite in Delivery 2.
 */

import { BalanceKind, CurrencyCode, CURRENCY_DECIMALS } from './types';
import { assertValidCalendarDate } from './transactionService';

export interface ParsedBalanceProposal {
    account_name: string;
    raw_label?: string;
    balance_kind: BalanceKind;
    amount_cents: number | null;
    raw_amount?: string;
    currency: CurrencyCode;
    effective_date: string; // YYYY-MM-DD
    source_line: string;
    confidence: number;
    unresolved_fields: string[];
    is_component_of_total?: boolean;
}

export interface ParseStructuredTableResult {
    proposals: ParsedBalanceProposal[];
    total_lines: number;
    parsed_count: number;
    skipped_count: number;
    detected_delimiter: string;
}

interface HeaderColumnMap {
    accountNameIndex?: number;
    amountIndex?: number;
    currencyIndex?: number;
    dateIndex?: number;
    balanceKindIndex?: number;
    accountNumberIndex?: number;
}

/**
 * Parses structured table lines (CSV, TSV, pipe-delimited, or multi-space).
 */
export function parseStructuredTable(
    rawText: string,
    defaultCurrency: CurrencyCode = 'AUD',
    defaultDate?: string
): ParseStructuredTableResult {
    const today = defaultDate || new Date().toISOString().split('T')[0];
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    const proposals: ParsedBalanceProposal[] = [];
    let skipped = 0;

    // Detect delimiter from first non-empty lines
    let delimiter = ',';
    const sample = lines.slice(0, 5).join('\n');
    if (sample.includes('\t')) delimiter = '\t';
    else if (sample.includes('|')) delimiter = '|';
    else if (!sample.includes(',') && /\s{2,}/.test(sample)) delimiter = 'MULTI_SPACE';

    let headerMap: HeaderColumnMap | undefined = undefined;

    // Detect if first non-empty row is a header row
    if (lines.length > 1) {
        const firstRowCells = splitRowIntoCells(lines[0], delimiter).map(c => c.toLowerCase().trim());
        const hasHeaderKeyword = firstRowCells.some(c =>
            /^(account|name|date|balance|type|institution|currency|amount|status|account\s*(number|#|no))/i.test(c)
        );

        if (hasHeaderKeyword) {
            headerMap = {};
            let isTransactionTable = false;

            for (let idx = 0; idx < firstRowCells.length; idx++) {
                const cell = firstRowCells[idx];
                if (/^(debit|credit|withdrawal|deposit|payment)$/i.test(cell)) {
                    isTransactionTable = true;
                } else if (/^(account\s*(number|#|no)|acc\s*(no|#))/i.test(cell)) {
                    headerMap.accountNumberIndex = idx;
                } else if (/^(balance|amount|current\s*balance|statement\s*balance|value)/i.test(cell)) {
                    headerMap.amountIndex = idx;
                } else if (/^(account|account\s*name|name|description)/i.test(cell)) {
                    headerMap.accountNameIndex = idx;
                } else if (/^(currency|curr)/i.test(cell)) {
                    headerMap.currencyIndex = idx;
                } else if (/^(date|as\s*of|effective\s*date|statement\s*date)/i.test(cell)) {
                    headerMap.dateIndex = idx;
                } else if (/^(type|balance\s*type|kind)/i.test(cell)) {
                    headerMap.balanceKindIndex = idx;
                }
            }

            const hasDebitCredit = firstRowCells.some(c => /^(debit|credit|withdrawal|deposit|payment)$/i.test(c));
            const hasDateCol = firstRowCells.some(c => /^(date|tx\s*date|transaction\s*date)$/i.test(c));
            const hasDescCol = firstRowCells.some(c => /^(description|reference|particulars|narrative|details)$/i.test(c));
            const hasAmountCol = firstRowCells.some(c => /^(amount|amount\s*[a-z]{3}|amount\s*\(.*?\))$/i.test(c));
            const hasBalanceCol = firstRowCells.some(c => /^(balance|running\s*balance|balance\s*[a-z]{3})$/i.test(c));

            if (hasDebitCredit || (hasDateCol && hasDescCol && hasAmountCol && hasBalanceCol)) {
                isTransactionTable = true;
            }

            if (isTransactionTable) {
                // Reject transaction ledgers from being parsed as balance summaries
                return {
                    proposals: [],
                    total_lines: lines.length,
                    parsed_count: 0,
                    skipped_count: lines.length,
                    detected_delimiter: delimiter
                };
            }

            skipped++;
            lines.shift(); // Consume the header line
        }
    }

    for (const line of lines) {
        // Skip any subsequent header-like line (e.g. repeated in multi-page pastes)
        const rowCells = splitRowIntoCells(line, delimiter).map(c => c.toLowerCase().trim());
        const headerMatches = rowCells.filter(c => /^(account|name|date|balance|type|institution|currency|amount|status|account\s*(number|#|no))$/i.test(c));
        if (headerMatches.length >= 2 && !rowCells.some(c => /\d/.test(c))) {
            skipped++;
            continue;
        }

        const proposal = parseLine(line, delimiter, defaultCurrency, today, headerMap);
        if (proposal) {
            proposals.push(proposal);
        } else {
            skipped++;
        }
    }

    // Check for batch-level portfolio total vs unclassified cash ambiguity (Delivery 2A Item 2)
    // Why this exists:
    // Delivery 2A Requirement 2: When cash appears alongside a portfolio total without explicit inclusion/exclusion,
    // it must be flagged with 'component_ambiguity' so user can review whether it is included or separate.
    // Tricky logic:
    // Cross-references rows across the entire parsed table batch.
    // TODO: Support multi-tiered entity hierarchy matching in future deliveries.
    const hasPortfolioTotal = proposals.some(p => p.balance_kind === 'total_portfolio_value');
    if (hasPortfolioTotal) {
        for (const p of proposals) {
            if (p.balance_kind === 'brokerage_cash' && !p.is_component_of_total) {
                const rawLower = (p.source_line || p.account_name).toLowerCase();
                const isExplicitlyExcluded = /(not\s+included|excluded\s+from|separate\s+from)/i.test(rawLower);
                if (!isExplicitlyExcluded && !p.unresolved_fields.includes('component_ambiguity')) {
                    p.unresolved_fields.push('component_ambiguity');
                }
            }
        }
    }

    return {
        proposals,
        total_lines: lines.length + (headerMap ? 1 : 0),
        parsed_count: proposals.length,
        skipped_count: skipped,
        detected_delimiter: delimiter
    };
}

function splitRowIntoCells(line: string, delimiter: string): string[] {
    if (delimiter === 'MULTI_SPACE') {
        return line.split(/\s{2,}/).map(p => p.trim());
    }
    if (delimiter === '|') {
        return line.split('|').map(p => p.trim()).filter(p => p.length > 0);
    }
    if (delimiter === '\t') {
        return line.split('\t').map(p => p.trim().replace(/^["']|["']$/g, ''));
    }

    // CSV delimiter (comma) - respect quoted fields containing commas AND unquoted numbers with embedded commas (e.g. 1,234 or 1,23)
    // Why this exists:
    // Delivery 2A Requirement 3: Commas between digits without spaces in unquoted CSV (e.g. "Checking Account, 1,23")
    // should not split into columns prematurely; they must stay together so strict numeric validation can inspect grouping.
    // Tricky logic:
    // If comma is flanked by digits on both sides, it's part of a numeric token rather than a column boundary.
    // TODO: Support locale-specific decimal separators if European formatting is added.
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '"';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if ((char === '"' || char === "'") && (!inQuotes || char === quoteChar)) {
            inQuotes = !inQuotes;
            quoteChar = char;
        } else if (char === ',' && !inQuotes) {
            const isEmbeddedInDigits = i > 0 && i < line.length - 1 && /\d/.test(line[i - 1]) && /\d/.test(line[i + 1]);
            if (isEmbeddedInDigits) {
                current += char;
            } else {
                result.push(current.trim().replace(/^["']|["']$/g, ''));
                current = '';
            }
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
}

/**
 * Extracts and isolates the numeric candidate from a cell, validating permitted currency decorations
 * without blindly stripping arbitrary characters or digits.
 * 
 * Why this exists:
 * Fulfills Delivery 2A Requirement 3 & Requirement B4:
 * - Accurately strips recognized currency symbols ($, A$, €, £, ¥) and ISO codes (AUD, USD, etc.).
 * - Does NOT use loose character sets like [$,A$€£¥\s] which mistakenly strip the letter 'A' from strings like "120A".
 * - Preserves negative parentheses e.g. "(1,234.56)" -> "-1,234.56" and "($450.00)" -> "-450.00".
 * - Handles leading signs before currency symbols (e.g. "-$450.00" -> "-450.00") or after ("$-450.00").
 * 
 * Tricky logic:
 * Checks for leading signs both before and after the currency code/symbol, and strips outer parenthesis if present,
 * ensuring the resulting candidate retains the negative sign for debt confirmation / amount_sign checks.
 * 
 * TODO: Support additional international currency codes as needed.
 */
function extractAmountCandidate(cell: string): {
    candidate: string;
    detectedCurrency: CurrencyCode | null;
    currencyExplicit: boolean;
} {
    // Strip leading colons or whitespace if present (e.g. ": $4,250.00" -> "$4,250.00")
    let trimmed = cell.trim().replace(/^[:\s]+/, '');
    let detectedCurrency: CurrencyCode | null = null;
    let currencyExplicit = false;

    // 1. Check for negative parentheses: "(1,234.56)" -> "-1,234.56" or "($450.00)" -> "-450.00"
    let isParenthesesNegative = false;
    if (/^\(.*\)$/.test(trimmed)) {
        isParenthesesNegative = true;
        trimmed = trimmed.slice(1, -1).trim();
    }

    // 2. Check for leading sign before currency (e.g. "-$450.00" or "+$1,000")
    let leadingSign = '';
    if (trimmed.startsWith('-') || trimmed.startsWith('+')) {
        leadingSign = trimmed[0];
        trimmed = trimmed.substring(1).trim();
    }

    // 3. Check for currency prefix (e.g. "A$", "$", "€", "£", "¥", "AUD", "USD")
    const prefixMatch = trimmed.match(/^(A\$|\$|€|£|¥|AUD|USD|EUR|GBP|CAD|NZD|CHF|JPY|SGD|HKD)\s*/i);
    if (prefixMatch) {
        const symbolOrCode = prefixMatch[1].toUpperCase();
        if (symbolOrCode === 'A$' || symbolOrCode === 'AUD') {
            detectedCurrency = 'AUD';
            currencyExplicit = true;
        } else if (symbolOrCode === '€' || symbolOrCode === 'EUR') {
            detectedCurrency = 'EUR';
            currencyExplicit = true;
        } else if (symbolOrCode === '£' || symbolOrCode === 'GBP') {
            detectedCurrency = 'GBP';
            currencyExplicit = true;
        } else if (symbolOrCode === '¥' || symbolOrCode === 'JPY') {
            detectedCurrency = 'JPY';
            currencyExplicit = true;
        } else if (symbolOrCode === '$') {
            currencyExplicit = false;
        } else if (symbolOrCode in CURRENCY_DECIMALS) {
            detectedCurrency = symbolOrCode as CurrencyCode;
            currencyExplicit = true;
        }
        trimmed = trimmed.substring(prefixMatch[0].length).trim();
    }

    // 4. If no leading sign before currency symbol, check if sign exists after currency (e.g. "$-450.00")
    if (!leadingSign && (trimmed.startsWith('-') || trimmed.startsWith('+'))) {
        leadingSign = trimmed[0];
        trimmed = trimmed.substring(1).trim();
    }

    // 5. Check for currency suffix (e.g. "AUD", "USD")
    const suffixMatch = trimmed.match(/\s*(AUD|USD|EUR|GBP|CAD|NZD|CHF|JPY|SGD|HKD)$/i);
    if (suffixMatch) {
        const code = suffixMatch[1].toUpperCase() as CurrencyCode;
        if (!detectedCurrency || detectedCurrency === 'AUD') {
            detectedCurrency = code;
            currencyExplicit = true;
        }
        trimmed = trimmed.substring(0, trimmed.length - suffixMatch[0].length).trim();
    }

    // Reattach sign: parentheses take priority as negative, otherwise leading sign
    const finalSign = isParenthesesNegative ? '-' : leadingSign;
    const candidate = finalSign + trimmed;

    return {
        candidate,
        detectedCurrency,
        currencyExplicit
    };
}

function parseLine(
    line: string,
    delimiter: string,
    defaultCurrency: CurrencyCode,
    fallbackDate: string,
    headerMap?: HeaderColumnMap
): ParsedBalanceProposal | null {
    const trimmedLine = line.trim();
    if (!trimmedLine) return null;

    // Delivery 2B Remediation (Finding 1):
    // Ignore lines that represent metadata rather than balance snapshot rows:
    // 1. Page numbers (e.g. "Page 1 of 2", "Page 2", "1 / 2")
    if (/^Page\s+\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(trimmedLine) || /^\d+\s*\/\s*\d+$/.test(trimmedLine)) {
        return null;
    }

    // 2. Minimum payment notices (e.g. "Minimum Payment Due: $50.00", "Min Payment: $25.00", "Payment Due Date: 15/04/2026")
    // Why this exists:
    // Finding 1: Minimum payment due is an installment notice, never an account valuation balance.
    // Tricky logic:
    // Skips both "Minimum Payment Due: $50.00" and standalone "Payment Due Date: ..." lines.
    // TODO: In Milestone 2, track minimum payment due as a liability cashflow alert if requested.
    if (/(?:Minimum\s*(?:Payment|Amount)(?:\s*Due)?|Min\s*Payment|Payment\s*Due(?:\s*Date)?|Pay\s*by)[:\s]/i.test(trimmedLine)) {
        return null;
    }

    // 3. Pure statement date or period header lines
    if (/^(?:Statement|Closing|Period(?:\s+ending)?|As\s+at|Effective)\s+Date[:\s]+[^\$\d]*\d+/i.test(trimmedLine) && !/\$(?:[0-9]{1,3}(?:,[0-9]{3})*|\d+)/.test(trimmedLine)) {
        return null;
    }

    // 4. Standalone account number/mask lines (e.g. "Account: •••• 4421", "Account Number: 1234-5678", "•••• 4421")
    if (/^(?:Account(?:\s+Number)?|Acc(?:t)?\.?)\s*(?:No\.?)?[:\s]+(?:[•\*\.]{3,}\s*)?\d+[-\s]?\d*$/i.test(trimmedLine) && !/\$/.test(trimmedLine)) {
        return null;
    }
    if (/^[•\*\.]{3,}\s*\d{3,4}$/.test(trimmedLine) && !/\$/.test(trimmedLine)) {
        return null;
    }

    let parts: string[] = splitRowIntoCells(line, delimiter);

    if (parts.length < 2) {
        // Fallback parsing for single-line unstructured rows (e.g. "Everyday Checking •••• 1111: $4,250.00" or "Equities: 12.345")
        // Why this exists:
        // Delivery 2B Correction 1: Prevents loose numbers (e.g. "BSB 062-000", "Phone 132221", or account mask "1111")
        // from being falsely chosen as balance amounts instead of the actual monetary amount.
        // Tricky logic:
        // 1. First test if line contains a colon followed by a monetary amount:
        //    Splits "Everyday Checking •••• 1111: $4,250.00" into Group 1 (Account Name + Mask) and Group 2 ($4,250.00).
        // 2. If no colon, anchor the currency and numeric amount to the end of the line so that mask digits preceding
        //    the amount are never captured as the amount.
        // TODO: In Milestone 2, support tab-separated key-value pairs without colons.
        const hasColonWithValue = /:\s*[-+]?\$?\s*\d/.test(line);
        const hasCurrencySymbol = /(?:[A-Z]{3}|\$|A\$|€|£|¥)/.test(line);
        const hasBalanceKeyword = /\b(balance|closing|opening|limit|redraw|owing|principal|value|total|cash|super|holding|drawn|equities|shares|stock|options?|crypto|asset|liability)\b/i.test(line);
        if (!hasColonWithValue && !hasCurrencySymbol && !hasBalanceKeyword) {
            return null; // Not a balance row
        }

        const colonMatch = line.match(/^(.*?):[ \t]*([+-]?(?:(?:[A-Z]{3}|\$|A\$|€|£|¥)\s*)?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?(?:\s*(?:[A-Z]{3}|\$|A\$|€|£|¥|CR|DR))?)\s*$/i);
        if (colonMatch) {
            const name = colonMatch[1].replace(/[:\s]+$/, '').trim();
            const amountStr = colonMatch[2].trim();
            parts = [name, amountStr].filter(p => p.length > 0);
        } else {
            const endAmountMatch = line.match(/^(.*?)(?:[ \t]{2,}|\t|[ \t]+)(?:([A-Z]{3}|\$|A\$|€|£|¥)[ \t]*)?([+-]?[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)(?:[ \t]*(?:[A-Z]{3}|CR|DR))?\s*$/i);
            if (!endAmountMatch) return null;

            const name = endAmountMatch[1].replace(/[:\s]+$/, '').trim();
            const curr = endAmountMatch[2] ? endAmountMatch[2].trim() : '';
            const num = endAmountMatch[3].trim();
            if (name.toLowerCase().endsWith('page')) {
                return null;
            }
            // Contextual check: If candidate name begins with a transaction date and contains another decimal amount,
            // this is an individual transaction row with a running balance, not an account snapshot.
            if (/^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s+/i.test(name) && /[+-]?\$?\d+\.\d{2}/.test(name)) {
                return null;
            }
            const amountStr = curr ? `${curr} ${num}` : num;
            parts = [name, amountStr].filter(p => p.length > 0);
        }
    }

    const unresolvedFields: string[] = [];

    // Find the monetary amount cell
    let amountIndex = -1;
    let rawAmount = '';
    let detectedCurrency = defaultCurrency;
    let currencyExplicitInCell = false;

    // 1. If headerMap specifically points to an amount cell, check that first
    if (headerMap?.amountIndex !== undefined && parts[headerMap.amountIndex] !== undefined) {
        amountIndex = headerMap.amountIndex;
        const cell = parts[headerMap.amountIndex];
        if (/\d/.test(cell)) {
            const extracted = extractAmountCandidate(cell);
            if (extracted.detectedCurrency) {
                detectedCurrency = extracted.detectedCurrency;
                currencyExplicitInCell = extracted.currencyExplicit;
            }
            // Strict grouping check: numbers without commas OR numbers with standard thousands grouping (e.g. 1,234 or 12,345)
            const isValidGrouping = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(extracted.candidate);
            if (isValidGrouping && extracted.candidate.length > 0) {
                rawAmount = extracted.candidate.replace(/,/g, '');
            } else {
                // Partially numeric text (e.g. "123oops", "1,23", "120A") or invalid format
                rawAmount = extracted.candidate;
                unresolvedFields.push('amount');
            }
        } else {
            // Missing or non-numeric amount in expected column
            rawAmount = '';
            unresolvedFields.push('amount');
        }
    }

    // 2. If amount cell wasn't resolved by header, scan cells (skipping known account number columns and date cells)
    if (amountIndex === -1) {
        // Pass 1: Look for a clean, valid numeric amount with proper grouping
        for (let i = parts.length - 1; i >= 0; i--) {
            if (headerMap?.accountNumberIndex !== undefined && i === headerMap.accountNumberIndex) {
                continue; // Skip account number column
            }
            if (headerMap?.dateIndex !== undefined && i === headerMap.dateIndex) {
                continue; // Skip date column
            }
            const cell = parts[i];
            if (!/\d/.test(cell)) continue;
            // Delivery 2B Correction 1: Skip cells containing bullet masks (•••• 1111) or starting with account keywords
            if (/[•\*\.]{3,}/.test(cell) || /^(?:Account|Acc|BSB|Ref|No|Number)\b/i.test(cell.trim())) {
                continue;
            }
            // Skip cells formatted as calendar dates
            if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cell.trim()) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(cell.trim())) {
                continue;
            }

            const extracted = extractAmountCandidate(cell);
            const isValidGrouping = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(extracted.candidate);

            if (isValidGrouping && extracted.candidate.length > 0) {
                amountIndex = i;
                rawAmount = extracted.candidate.replace(/,/g, '');
                if (extracted.detectedCurrency) {
                    detectedCurrency = extracted.detectedCurrency;
                    currencyExplicitInCell = extracted.currencyExplicit;
                }
                break;
            }
        }

        // Pass 2: If no valid numeric grouping found, check for non-date candidate (e.g. "123oops", "1,23", "120A")
        if (amountIndex === -1) {
            for (let i = parts.length - 1; i >= 0; i--) {
                if (headerMap?.accountNumberIndex !== undefined && i === headerMap.accountNumberIndex) continue;
                if (headerMap?.dateIndex !== undefined && i === headerMap.dateIndex) continue;
                const cell = parts[i];
                if (!/\d/.test(cell)) continue;
                // Delivery 2B Correction 1: Skip cells containing bullet masks (•••• 1111) or starting with account keywords
                if (/[•\*\.]{3,}/.test(cell) || /^(?:Account|Acc|BSB|Ref|No|Number)\b/i.test(cell.trim())) {
                    continue;
                }
                if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(cell.trim()) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(cell.trim())) {
                    continue;
                }

                const extracted = extractAmountCandidate(cell);
                if (extracted.candidate.length > 0 && /\d/.test(extracted.candidate)) {
                    amountIndex = i;
                    rawAmount = extracted.candidate;
                    unresolvedFields.push('amount');
                    if (extracted.detectedCurrency) {
                        detectedCurrency = extracted.detectedCurrency;
                        currencyExplicitInCell = extracted.currencyExplicit;
                    }
                    break;
                }
            }
        }
    }

    if (amountIndex === -1) {
        return null; // No valid balance found in row
    }

    // Currency detection across entire line if not captured in the amount cell
    const fullLineLower = line.toLowerCase();
    let hasExplicitCurrency = currencyExplicitInCell;

    if (line.includes('A$') || fullLineLower.includes('aud')) {
        detectedCurrency = 'AUD';
        hasExplicitCurrency = true;
    } else if (line.includes('€') || fullLineLower.includes('eur')) {
        detectedCurrency = 'EUR';
        hasExplicitCurrency = true;
    } else if (line.includes('£') || fullLineLower.includes('gbp')) {
        detectedCurrency = 'GBP';
        hasExplicitCurrency = true;
    } else if (line.includes('¥') || fullLineLower.includes('jpy')) {
        detectedCurrency = 'JPY';
        hasExplicitCurrency = true;
    } else if (fullLineLower.includes('cad') || line.includes('c$')) {
        detectedCurrency = 'CAD';
        hasExplicitCurrency = true;
    } else if (fullLineLower.includes('nzd') || line.includes('nz$')) {
        detectedCurrency = 'NZD';
        hasExplicitCurrency = true;
    } else if (fullLineLower.includes('usd')) {
        detectedCurrency = 'USD';
        hasExplicitCurrency = true;
    } else if (!hasExplicitCurrency && line.includes('$')) {
        // Ambiguous bare dollar currency symbol (P01)
        detectedCurrency = defaultCurrency;
        unresolvedFields.push('currency');
    }

    // Currency scaling & excess precision detection (P12)
    let amountCents: number | null = null;
    if (unresolvedFields.includes('amount') || rawAmount === '') {
        amountCents = null;
    } else {
        const floatVal = parseFloat(rawAmount);
        if (!Number.isFinite(floatVal)) {
            unresolvedFields.push('amount');
            amountCents = null;
        } else {
            const decimals = CURRENCY_DECIMALS[detectedCurrency] ?? 2;
            if (rawAmount.includes('.')) {
                const fraction = rawAmount.split('.')[1] || '';
                if (fraction.length > decimals) {
                    unresolvedFields.push('amount_precision');
                }
            }

            amountCents = decimals === 0 ? Math.round(floatVal) : Math.round(floatVal * Math.pow(10, decimals));

            // Sign preservation & confirmation (P06):
            // For liabilities (credit card debt, loans), convert negative balance to positive debt magnitude
            // while flagging 'amount_sign' in unresolved_fields so the user can explicitly confirm whether
            // it represents debt or an overpayment (credit balance).
            const isLikelyLiability = /(credit\s*card|mastercard|visa|amex|loan|mortgage|debt)/i.test(fullLineLower);
            if (isLikelyLiability && amountCents < 0) {
                amountCents = Math.abs(amountCents);
                unresolvedFields.push('amount_sign');
            } else if (amountCents < 0) {
                unresolvedFields.push('amount_sign');
            }
        }
    }

    // Account Name: Use header index if available, otherwise parts[0]
    let accountName = parts[0] || 'Unnamed Account';
    if (headerMap?.accountNameIndex !== undefined && parts[headerMap.accountNameIndex]) {
        accountName = parts[headerMap.accountNameIndex];
    }

    // Date detection (P04, P01)
    let effectiveDate = fallbackDate;
    let hasExplicitDate = false;

    const dateSource = (headerMap?.dateIndex !== undefined && parts[headerMap.dateIndex])
        ? parts[headerMap.dateIndex]
        : line;

    const isoDateMatch = dateSource.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    const auDateMatch = dateSource.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);

    if (isoDateMatch) {
        const candidate = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
        effectiveDate = candidate;
        hasExplicitDate = true;
        try {
            assertValidCalendarDate(candidate, 'Statement date');
        } catch {
            unresolvedFields.push('effective_date');
        }
    } else if (auDateMatch) {
        const candidate = `${auDateMatch[3]}-${auDateMatch[2].padStart(2, '0')}-${auDateMatch[1].padStart(2, '0')}`;
        effectiveDate = candidate;
        hasExplicitDate = true;
        try {
            assertValidCalendarDate(candidate, 'Statement date');
        } catch {
            unresolvedFields.push('effective_date');
        }
    }

    if (!hasExplicitDate && !unresolvedFields.includes('effective_date')) {
        unresolvedFields.push('effective_date');
    }

    // Semantic balance kind detection (P02)
    let balanceKind: BalanceKind = 'current_balance';
    let rawLabel: string | undefined = undefined;

    if (/(projected\s*(future\s*)?value|projected|projection|forecast)/i.test(fullLineLower)) {
        balanceKind = 'projected_future_value';
        rawLabel = 'Projected Future Value';
    } else if (/(credit\s*limit|card\s*limit|limit\b)/i.test(fullLineLower)) {
        balanceKind = 'credit_limit';
        rawLabel = 'Credit Limit';
    } else if (/(available\s*credit|credit\s*available)/i.test(fullLineLower)) {
        balanceKind = 'available_credit';
        rawLabel = 'Available Credit';
    } else if (/(redraw|available\s*redraw)/i.test(fullLineLower)) {
        balanceKind = 'available_redraw';
        rawLabel = 'Available Redraw';
    } else if (/(buying\s*power)/i.test(fullLineLower)) {
        balanceKind = 'buying_power';
        rawLabel = 'Buying Power';
    } else if (/(available\s*funds|available\s*balance|available\b)/i.test(fullLineLower)) {
        balanceKind = 'available_balance';
        rawLabel = 'Available Funds';
    } else if (/(portfolio\s*value|total\s*value|account\s*value|super\s*balance|fund\s*balance|portfolio\s*total|total\s*portfolio)/i.test(fullLineLower)) {
        balanceKind = 'total_portfolio_value';
        rawLabel = 'Total Portfolio Value';
    } else if (/(closing\s*balance|statement\s*balance)/i.test(fullLineLower)) {
        balanceKind = 'statement_closing_balance';
        rawLabel = 'Statement Closing Balance';
    } else if (/(loan\s*balance|mortgage\s*balance|principal\s*owing|amount\s*owed|loan\s*principal|outstanding\s*loan\s*principal|outstanding\s*principal|principal\s*balance)/i.test(fullLineLower)) {
        balanceKind = 'outstanding_loan_principal';
        rawLabel = 'Outstanding Loan Principal';
    } else if (/(cash\s*balance|settled\s*cash|brokerage\s*cash|\bcash\b)/i.test(fullLineLower)) {
        balanceKind = 'brokerage_cash';
        rawLabel = 'Brokerage Cash';
    } else if (/(market\s*value|shares|equities|stock\s*value|holdings\s*value)/i.test(fullLineLower)) {
        balanceKind = 'securities_market_value';
        rawLabel = 'Securities Market Value';
    } else if (/(current\s*balance|current\b|balance\b)/i.test(fullLineLower)) {
        balanceKind = 'current_balance';
        rawLabel = 'Current Balance';
    } else if (headerMap?.balanceKindIndex !== undefined && parts[headerMap.balanceKindIndex]) {
        balanceKind = 'unresolved';
        rawLabel = parts[headerMap.balanceKindIndex];
        unresolvedFields.push('balance_kind');
    }

    // Check for explicit "not included" / separate (Finding 2)
    const isExplicitlyExcluded = /(not\s+included|excluded\s+from|separate\s+from)/i.test(fullLineLower);

    // Check if this line describes a parent total that includes cash (Finding 2: "Total includes cash" describes parent total)
    const isParentTotalWithInclusion = /(total\s+includes|portfolio\s+includes|balance\s+includes)/i.test(fullLineLower);

    // Check if this line explicitly describes an included component / supporting detail
    const isExplicitlyIncludedComponent = !isExplicitlyExcluded && !isParentTotalWithInclusion && (
        /\b(included\s+cash|included\s+component|cash\s+component|cash\s+option|of\s+which\s+cash|holding\s+component)\b/i.test(fullLineLower) ||
        /\b(included\s+in\s+total|portion\s+of\s+total|part\s+of\s+portfolio|within\s+portfolio)\b/i.test(fullLineLower)
    );

    // Keep ambiguous relationships unresolved (Finding 2)
    if (/include|portion|component/i.test(fullLineLower) && !isExplicitlyIncludedComponent && !isParentTotalWithInclusion && !isExplicitlyExcluded) {
        unresolvedFields.push('component_ambiguity');
    }

    const isComponentOfTotal = isExplicitlyIncludedComponent;

    return {
        account_name: accountName,
        raw_label: rawLabel,
        balance_kind: balanceKind,
        amount_cents: amountCents,
        raw_amount: rawAmount || undefined,
        currency: detectedCurrency,
        effective_date: effectiveDate,
        source_line: line,
        confidence: unresolvedFields.length === 0 ? 0.95 : 0.60,
        unresolved_fields: unresolvedFields,
        is_component_of_total: isComponentOfTotal
    };
}
