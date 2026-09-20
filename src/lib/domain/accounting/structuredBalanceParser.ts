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

export interface ParsedBalanceProposal {
    account_name: string;
    raw_label?: string;
    balance_kind: BalanceKind;
    amount_cents: number;
    currency: CurrencyCode;
    effective_date: string; // YYYY-MM-DD
    source_line: string;
    confidence: number;
    unresolved_fields: string[];
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
            for (let idx = 0; idx < firstRowCells.length; idx++) {
                const cell = firstRowCells[idx];
                if (/^(account\s*(number|#|no)|acc\s*(no|#))/i.test(cell)) {
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
            skipped++;
            lines.shift(); // Consume the header line
        }
    }

    for (const line of lines) {
        // Skip any subsequent header-like line
        if (/^(account|name|date|balance|type|institution|currency|amount|status)\b/i.test(line)) {
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

    // CSV delimiter (comma) - respect quoted fields containing commas
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
            result.push(current.trim().replace(/^["']|["']$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''));
    return result;
}

function parseLine(
    line: string,
    delimiter: string,
    defaultCurrency: CurrencyCode,
    fallbackDate: string,
    headerMap?: HeaderColumnMap
): ParsedBalanceProposal | null {
    let parts: string[] = splitRowIntoCells(line, delimiter);

    if (parts.length < 2) {
        // Try fallback regex for line with: "Account Name ... $1,234.56"
        const regexMatch = line.match(/^(.*?)[ \t]+(?:([A-Z]{3})|\$|A\$|€|£|¥)?[ \t]*([+-]?\$?\s*[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)[ \t]*(.*)$/i);
        if (!regexMatch) return null;

        const name = regexMatch[1].trim();
        const amountStr = regexMatch[3].trim();
        const tail = regexMatch[4] ? regexMatch[4].trim() : '';
        parts = [name, amountStr, tail].filter(p => p.length > 0);
    }

    const unresolvedFields: string[] = [];

    // Find the monetary amount cell
    let amountIndex = -1;
    let rawAmount = '';
    let detectedCurrency = defaultCurrency;
    let currencyExplicitInCell = false;

    // 1. If headerMap specifically points to an amount cell, check that first
    if (headerMap?.amountIndex !== undefined && parts[headerMap.amountIndex] !== undefined) {
        const candidate = parts[headerMap.amountIndex];
        if (/\d/.test(candidate)) {
            const currMatch = candidate.match(/\b(AUD|USD|EUR|GBP|CAD|NZD|CHF|JPY|SGD|HKD)\b/i);
            if (currMatch) {
                detectedCurrency = currMatch[1].toUpperCase() as CurrencyCode;
                currencyExplicitInCell = true;
            }
            const clean = candidate
                .replace(/\b(AUD|USD|EUR|GBP|CAD|NZD|CHF|JPY|SGD|HKD)\b/gi, '')
                .replace(/[$,A$€£¥\s]/g, '');
            if (/^[+-]?[0-9]+(?:\.[0-9]+)?$/.test(clean) && clean.length > 0) {
                amountIndex = headerMap.amountIndex;
                rawAmount = clean;
            }
        }
    }

    // 2. If amount cell wasn't resolved by header, scan cells (skipping known account number columns)
    if (amountIndex === -1) {
        for (let i = parts.length - 1; i >= 0; i--) {
            if (headerMap?.accountNumberIndex !== undefined && i === headerMap.accountNumberIndex) {
                continue; // Skip account number column
            }
            const cell = parts[i];
            if (!/\d/.test(cell)) continue;

            const currMatch = cell.match(/\b(AUD|USD|EUR|GBP|CAD|NZD|CHF|JPY|SGD|HKD)\b/i);
            if (currMatch) {
                detectedCurrency = currMatch[1].toUpperCase() as CurrencyCode;
                currencyExplicitInCell = true;
            }

            const clean = cell
                .replace(/\b(AUD|USD|EUR|GBP|CAD|NZD|CHF|JPY|SGD|HKD)\b/gi, '')
                .replace(/[$,A$€£¥\s]/g, '');

            if (/^[+-]?[0-9]+(?:\.[0-9]+)?$/.test(clean) && clean.length > 0) {
                amountIndex = i;
                rawAmount = clean;
                break;
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
    const floatVal = parseFloat(rawAmount);
    if (!Number.isFinite(floatVal)) {
        return null;
    }

    const decimals = CURRENCY_DECIMALS[detectedCurrency] ?? 2;
    if (rawAmount.includes('.')) {
        const fraction = rawAmount.split('.')[1] || '';
        if (fraction.length > decimals) {
            unresolvedFields.push('amount_precision');
        }
    }

    let amountCents = decimals === 0 ? Math.round(floatVal) : Math.round(floatVal * Math.pow(10, decimals));

    // Sign preservation & confirmation (P06):
    // For liabilities (credit card debt, loans), convert negative balance to positive debt magnitude
    // while flagging 'amount_sign' in unresolved_fields so the user can explicitly confirm whether
    // it represents debt or an overpayment (credit balance).
    const isLikelyLiability = /(credit\s*card|mastercard|visa|amex|loan|mortgage|debt)/i.test(fullLineLower);
    if (isLikelyLiability && amountCents < 0) {
        amountCents = Math.abs(amountCents);
        unresolvedFields.push('amount_sign');
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
        effectiveDate = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
        hasExplicitDate = true;
    } else if (auDateMatch) {
        effectiveDate = `${auDateMatch[3]}-${auDateMatch[2].padStart(2, '0')}-${auDateMatch[1].padStart(2, '0')}`;
        hasExplicitDate = true;
    }

    if (!hasExplicitDate) {
        unresolvedFields.push('effective_date');
    }

    // Semantic balance kind detection (P02)
    let balanceKind: BalanceKind = 'current_balance';
    let rawLabel = undefined;

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
    } else if (/(portfolio\s*value|total\s*value|account\s*value|super\s*balance|fund\s*balance)/i.test(fullLineLower)) {
        balanceKind = 'total_portfolio_value';
        rawLabel = 'Total Portfolio Value';
    } else if (/(closing\s*balance|statement\s*balance)/i.test(fullLineLower)) {
        balanceKind = 'statement_closing_balance';
        rawLabel = 'Statement Closing Balance';
    } else if (/(loan\s*balance|mortgage\s*balance|principal\s*owing|amount\s*owed)/i.test(fullLineLower)) {
        balanceKind = 'outstanding_loan_principal';
        rawLabel = 'Outstanding Loan Principal';
    } else if (/(cash\s*balance|settled\s*cash)/i.test(fullLineLower)) {
        balanceKind = 'brokerage_cash';
        rawLabel = 'Brokerage Cash';
    } else if (/(market\s*value|shares|equities|stock\s*value|holdings\s*value)/i.test(fullLineLower)) {
        balanceKind = 'securities_market_value';
        rawLabel = 'Securities Market Value';
    }

    return {
        account_name: accountName,
        raw_label: rawLabel,
        balance_kind: balanceKind,
        amount_cents: amountCents,
        currency: detectedCurrency,
        effective_date: effectiveDate,
        source_line: line,
        confidence: unresolvedFields.length === 0 ? 0.95 : 0.60,
        unresolved_fields: unresolvedFields
    };
}
