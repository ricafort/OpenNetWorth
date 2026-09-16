(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/domain/accounting/types.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Accounting Domain Models & Exact Monetary Representation
 * 
 * Why this file exists:
 * Provides the foundational domain models and mathematical invariants for OpenNetWorth's
 * double-entry accounting engine. Establishes exact integer minor-unit (cents) arithmetic
 * to eliminate binary floating-point errors (IEEE 754) and defines entities, accounts,
 * balanced transactions, postings, and correction trails.
 * 
 * Tricky logic:
 * - Monetary amounts are strictly safe integers representing minor currency units (cents).
 *   For example, USD 12.50 is stored as 1250 cents. JPY has scale 0 (100 JPY is 100).
 * - Multi-currency support enforces that unlike currencies cannot be added directly.
 * - Transactions must balance: Sum(Debits) - Sum(Credits) = 0. We represent Debits as positive
 *   and Credits as negative, so Sum(amount_cents) === 0.
 * 
 * TODO: Add support for multi-currency automated revaluation journals in future milestones.
 */ // Supported ISO 4217 Currency Codes with their minor unit scale (decimals)
__turbopack_context__.s([
    "CURRENCY_DECIMALS",
    ()=>CURRENCY_DECIMALS,
    "addMoney",
    ()=>addMoney,
    "assertValidMoneyCents",
    ()=>assertValidMoneyCents,
    "formatMoney",
    ()=>formatMoney,
    "multiplyMoneyRatio",
    ()=>multiplyMoneyRatio,
    "parseToCents",
    ()=>parseToCents,
    "subtractMoney",
    ()=>subtractMoney,
    "validateTransactionBalance",
    ()=>validateTransactionBalance
]);
const CURRENCY_DECIMALS = {
    USD: 2,
    AUD: 2,
    EUR: 2,
    GBP: 2,
    CAD: 2,
    NZD: 2,
    CHF: 2,
    JPY: 0,
    SGD: 2,
    HKD: 2
};
function assertValidMoneyCents(cents, context = 'Amount') {
    if (!Number.isFinite(cents) || !Number.isInteger(cents) || !Number.isSafeInteger(cents)) {
        throw new Error(`${context} must be a safe, finite integer representing minor currency units (cents), received: ${cents}`);
    }
}
function addMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Cannot add unlike currencies: ${a.currency} and ${b.currency}. Explicit currency conversion is required.`);
    }
    const sum = a.amount_cents + b.amount_cents;
    assertValidMoneyCents(sum, 'Sum of money');
    return {
        amount_cents: sum,
        currency: a.currency
    };
}
function subtractMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Cannot subtract unlike currencies: ${a.currency} and ${b.currency}. Explicit currency conversion is required.`);
    }
    const diff = a.amount_cents - b.amount_cents;
    assertValidMoneyCents(diff, 'Difference of money');
    return {
        amount_cents: diff,
        currency: a.currency
    };
}
function multiplyMoneyRatio(m, ratio) {
    if (!Number.isFinite(ratio)) {
        throw new Error(`Multiplication ratio must be a finite number, received: ${ratio}`);
    }
    const result = Math.round(m.amount_cents * ratio);
    assertValidMoneyCents(result, 'Multiplied money');
    return {
        amount_cents: result,
        currency: m.currency
    };
}
function parseToCents(val, currency = 'USD') {
    if (val === null || val === undefined || val === '') {
        throw new Error('Monetary value cannot be null, undefined, or empty.');
    }
    const num = typeof val === 'string' ? parseFloat(val.replace(/[$, ]/g, '')) : val;
    if (!Number.isFinite(num)) {
        throw new Error(`Invalid monetary value: "${val}". Value must be a finite number.`);
    }
    const decimals = CURRENCY_DECIMALS[currency] ?? 2;
    const factor = Math.pow(10, decimals);
    const cents = Math.round(num * factor);
    assertValidMoneyCents(cents, `Parsed cents for ${val}`);
    return cents;
}
function formatMoney(money) {
    const decimals = CURRENCY_DECIMALS[money.currency] ?? 2;
    const divisor = Math.pow(10, decimals);
    const major = money.amount_cents / divisor;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: money.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(major);
}
function validateTransactionBalance(postings) {
    if (!postings || postings.length < 2) {
        throw new Error('Transaction must contain at least two postings to satisfy double-entry accounting.');
    }
    const primaryCurrency = postings[0].currency;
    let sumCents = 0;
    for (const p of postings){
        if (p.currency !== primaryCurrency) {
            throw new Error(`Cross-currency postings within a single un-hedged transaction are not supported in Milestone 1: encountered ${p.currency} vs ${primaryCurrency}.`);
        }
        assertValidMoneyCents(p.amount_cents, 'Posting amount');
        sumCents += p.amount_cents;
    }
    return {
        isValid: sumCents === 0,
        delta_cents: sumCents,
        currency: primaryCurrency
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/domain/document/csvParserService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Milestone 1 Bank CSV Parser & Row Validation Service (Slice 1E)
 * 
 * Why this file exists:
 * Provides robust, pure-TypeScript CSV parsing, header signature detection, calendar date
 * normalization, exact minor-unit money parsing, and row-level validation findings for bank CSVs.
 * Conforms to ADR 001 Decision 2 (Tier 1 direct native TS parser).
 * 
 * Tricky logic:
 * - RFC 4180 compliance: Handles quotes with embedded commas, escaped quotes (""), and multiline cells.
 * - Accounting amounts: Recognizes parentheses negatives (e.g. "(45.50)" -> -4550 cents) as well as
 *   minus signs ("-45.50" -> -4550 cents) and currency symbols ("$1,250.00").
 * - Calendar dates: Strictly checks day-of-month and month bounds (e.g. 2026-02-31 is rejected).
 * - Zero guesswork: If an amount or date is missing, empty, or unparseable, it is recorded as an error
 *   finding and amount_cents / date remains null. Unsupported rows remain unresolved; never guess missing amounts.
 * 
 * TODO: Add support for custom locale thousand/decimal delimiters (e.g. European "1.250,50 €") in future milestones.
 */ __turbopack_context__.s([
    "computeHeaderSignature",
    ()=>computeHeaderSignature,
    "parseCsvAmount",
    ()=>parseCsvAmount,
    "parseCsvDate",
    ()=>parseCsvDate,
    "parseCsvWithMapping",
    ()=>parseCsvWithMapping,
    "parseRawCsv",
    ()=>parseRawCsv
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-client] (ecmascript)");
;
function computeHeaderSignature(headers) {
    return headers.map((h)=>h.trim().toLowerCase()).filter(Boolean).sort().join('|');
}
function parseRawCsv(content) {
    if (!content || !content.trim()) {
        return {
            headers: [],
            rows: [],
            rawLines: []
        };
    }
    const rows = [];
    const rawLines = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    let currentLineStartIndex = 0;
    const chars = content;
    const len = chars.length;
    for(let i = 0; i < len; i++){
        const char = chars[i];
        const nextChar = i + 1 < len ? chars[i + 1] : '';
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped double quote
                currentCell += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            // Handle \r\n or \n
            if (char === '\r' && nextChar === '\n') {
                i++; // Consume \n
            }
            currentRow.push(currentCell.trim());
            currentCell = '';
            // Extract raw line text
            const lineEndIndex = i + 1;
            const lineText = content.substring(currentLineStartIndex, lineEndIndex).replace(/[\r\n]+$/, '');
            currentLineStartIndex = lineEndIndex;
            // Only add non-empty rows
            const hasAnyContent = currentRow.some((c)=>c.length > 0);
            if (hasAnyContent) {
                rows.push(currentRow);
                rawLines.push(lineText);
            }
            currentRow = [];
        } else {
            currentCell += char;
        }
    }
    // Process last cell/row if content didn't end with newline
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        const lineText = content.substring(currentLineStartIndex).replace(/[\r\n]+$/, '');
        if (currentRow.some((c)=>c.length > 0)) {
            rows.push(currentRow);
            rawLines.push(lineText);
        }
    }
    if (rows.length === 0) {
        return {
            headers: [],
            rows: [],
            rawLines: []
        };
    }
    const headers = rows[0].map((h)=>h.trim());
    const dataRows = rows.slice(1);
    const dataRawLines = rawLines.slice(1);
    return {
        headers,
        rows: dataRows,
        rawLines: dataRawLines
    };
}
function parseCsvDate(dateStr, format) {
    if (!dateStr || !dateStr.trim()) {
        return {
            date: null,
            error: 'Date field is empty or missing.'
        };
    }
    const trimmed = dateStr.trim();
    let year = 0;
    let month = 0;
    let day = 0;
    if (format === 'YYYY-MM-DD') {
        const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (!match) {
            return {
                date: null,
                error: `Date "${trimmed}" does not match expected format YYYY-MM-DD.`
            };
        }
        year = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        day = parseInt(match[3], 10);
    } else if (format === 'DD/MM/YYYY') {
        const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (!match) {
            return {
                date: null,
                error: `Date "${trimmed}" does not match expected format DD/MM/YYYY.`
            };
        }
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
    } else if (format === 'MM/DD/YYYY') {
        const match = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (!match) {
            return {
                date: null,
                error: `Date "${trimmed}" does not match expected format MM/DD/YYYY.`
            };
        }
        month = parseInt(match[1], 10);
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
    } else {
        return {
            date: null,
            error: `Unsupported date format: ${format}`
        };
    }
    // Validate real calendar bounds
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(parsed.getTime()) || parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) {
        return {
            date: null,
            error: `Date "${trimmed}" is not a valid calendar day.`
        };
    }
    const isoYear = String(year).padStart(4, '0');
    const isoMonth = String(month).padStart(2, '0');
    const isoDay = String(day).padStart(2, '0');
    return {
        date: `${isoYear}-${isoMonth}-${isoDay}`
    };
}
function parseCsvAmount(amountStr, currency = 'USD') {
    if (!amountStr || !amountStr.trim()) {
        return {
            amount_cents: null,
            error: 'Amount field is empty or missing.'
        };
    }
    const curr = (currency || 'USD').toUpperCase();
    if (!(curr in __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"])) {
        return {
            amount_cents: null,
            error: `Unsupported currency code: "${currency}". Supported currencies are: ${Object.keys(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"]).join(', ')}.`
        };
    }
    const decimals = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][curr];
    const factor = Math.pow(10, decimals);
    let str = amountStr.trim();
    let isNegative = false;
    // 1. Check for parentheses negatives: e.g. "(124.50)" or "($124.50)"
    if (str.startsWith('(') && str.endsWith(')')) {
        isNegative = true;
        str = str.substring(1, str.length - 1).trim();
    }
    // 2. Check for DR / CR suffixes
    if (str.endsWith('DR') || str.endsWith('dr')) {
        isNegative = true;
        str = str.substring(0, str.length - 2).trim();
    } else if (str.endsWith('CR') || str.endsWith('cr')) {
        isNegative = false;
        str = str.substring(0, str.length - 2).trim();
    }
    // 3. Check for leading/trailing sign
    if (str.startsWith('-')) {
        isNegative = !isNegative;
        str = str.substring(1).trim();
    } else if (str.startsWith('+')) {
        str = str.substring(1).trim();
    }
    if (str.endsWith('-')) {
        isNegative = !isNegative;
        str = str.substring(0, str.length - 1).trim();
    } else if (str.endsWith('+')) {
        str = str.substring(0, str.length - 1).trim();
    }
    // 4. Strip known currency symbol or 3-letter currency code prefix/suffix
    str = str.replace(/^[$£€¥]\s*/, '');
    str = str.replace(/^[A-Za-z]{3}\s+/, '');
    str = str.replace(/\s+[A-Za-z]{3}$/, '');
    // Re-check leading sign after currency symbol (e.g. "$-124.50")
    if (str.startsWith('-')) {
        isNegative = !isNegative;
        str = str.substring(1).trim();
    } else if (str.startsWith('+')) {
        str = str.substring(1).trim();
    }
    // 5. Strict Whole-Value Validation:
    // Must strictly match either grouped format (1,234.56) or plain digits with optional decimal (1234.56 or 1234)
    // No trailing garbage (like "100.50abc"), no multiple dots ("12.34.56"), no malformed separators ("12,34,56")
    const isGrouped = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(str);
    const isPlain = /^\d+(\.\d+)?$/.test(str);
    if (!isGrouped && !isPlain) {
        return {
            amount_cents: null,
            error: `Invalid monetary value: "${amountStr}". Entire value must be a valid numeric amount.`
        };
    }
    // 6. Scale and Decimal Places Enforcement
    const plain = str.replace(/,/g, '');
    const parts = plain.split('.');
    const wholeStr = parts[0];
    const fracStr = parts.length > 1 ? parts[1] : '';
    if (decimals === 0) {
        // Zero-scale currencies (e.g. JPY)
        if (fracStr.length > 0 && parseInt(fracStr, 10) !== 0) {
            return {
                amount_cents: null,
                error: `Currency ${curr} does not support fractional decimal units: "${amountStr}".`
            };
        }
    } else if (fracStr.length > decimals) {
        return {
            amount_cents: null,
            error: `Amount "${amountStr}" has ${fracStr.length} decimal places, exceeding the maximum scale of ${decimals} for ${curr}.`
        };
    }
    const whole = parseInt(wholeStr, 10);
    const frac = decimals > 0 ? parseInt(fracStr.padEnd(decimals, '0'), 10) : 0;
    let cents = whole * factor + frac;
    if (isNegative && cents > 0) {
        cents = -cents;
    }
    try {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["assertValidMoneyCents"])(cents, `Parsed CSV amount for "${amountStr}"`);
    } catch (err) {
        return {
            amount_cents: null,
            error: err.message
        };
    }
    return {
        amount_cents: cents
    };
}
function parseCsvWithMapping(content, mapping, currency = 'USD') {
    const { headers, rows, rawLines } = parseRawCsv(content);
    const signature = computeHeaderSignature(headers);
    const lowerHeaders = headers.map((h)=>h.toLowerCase());
    const dateColIdx = lowerHeaders.indexOf(mapping.date_column.toLowerCase());
    const descColIdx = lowerHeaders.indexOf(mapping.description_column.toLowerCase());
    let amountColIdx = -1;
    let debitColIdx = -1;
    let creditColIdx = -1;
    if (mapping.amount_mode === 'single_amount') {
        if (mapping.amount_column) {
            amountColIdx = lowerHeaders.indexOf(mapping.amount_column.toLowerCase());
        }
    } else {
        if (mapping.debit_column) {
            debitColIdx = lowerHeaders.indexOf(mapping.debit_column.toLowerCase());
        }
        if (mapping.credit_column) {
            creditColIdx = lowerHeaders.indexOf(mapping.credit_column.toLowerCase());
        }
    }
    const parsedRows = [];
    let validCount = 0;
    let errorCount = 0;
    for(let r = 0; r < rows.length; r++){
        const row = rows[r];
        const rawLine = rawLines[r] || row.join(',');
        const rowNumber = r + 2; // +1 for 1-based index, +1 for header row
        const findings = [];
        // 1. Date Extraction & Validation
        let canonicalDate = null;
        const rawDate = dateColIdx >= 0 && dateColIdx < row.length ? row[dateColIdx] : '';
        if (dateColIdx === -1) {
            findings.push({
                severity: 'error',
                code: 'MISSING_DATE_COLUMN',
                message: `Date column "${mapping.date_column}" not found in CSV headers.`,
                field: 'date'
            });
        } else {
            const dateResult = parseCsvDate(rawDate, mapping.date_format);
            if (dateResult.date) {
                canonicalDate = dateResult.date;
            } else {
                findings.push({
                    severity: 'error',
                    code: 'INVALID_DATE',
                    message: dateResult.error || 'Failed to parse date.',
                    field: 'date'
                });
            }
        }
        // 2. Description Extraction & Validation
        let description = '';
        if (descColIdx >= 0 && descColIdx < row.length) {
            description = row[descColIdx].trim();
        }
        if (!description) {
            findings.push({
                severity: 'warning',
                code: 'EMPTY_DESCRIPTION',
                message: 'Transaction description is empty.',
                field: 'description'
            });
            description = 'Unspecified Transaction';
        }
        // 3. Amount Extraction & Validation
        let amountCents = null;
        let rawAmount = '';
        let eventType = 'expense';
        if (mapping.amount_mode === 'single_amount') {
            if (amountColIdx === -1) {
                findings.push({
                    severity: 'error',
                    code: 'MISSING_AMOUNT_COLUMN',
                    message: `Amount column "${mapping.amount_column}" not found in CSV headers.`,
                    field: 'amount'
                });
            } else {
                rawAmount = amountColIdx < row.length ? row[amountColIdx] : '';
                const amtResult = parseCsvAmount(rawAmount, currency);
                if (amtResult.amount_cents !== null) {
                    amountCents = amtResult.amount_cents;
                    if (amountCents > 0) {
                        eventType = 'income';
                    } else if (amountCents < 0) {
                        eventType = 'expense';
                    } else {
                        findings.push({
                            severity: 'warning',
                            code: 'ZERO_AMOUNT',
                            message: 'Transaction amount is zero cents.',
                            field: 'amount'
                        });
                        eventType = 'expense';
                    }
                } else {
                    findings.push({
                        severity: 'error',
                        code: 'INVALID_AMOUNT',
                        message: amtResult.error || 'Failed to parse amount.',
                        field: 'amount'
                    });
                }
            }
        } else {
            // Debit / Credit mode
            const rawDebit = debitColIdx >= 0 && debitColIdx < row.length ? row[debitColIdx] : '';
            const rawCredit = creditColIdx >= 0 && creditColIdx < row.length ? row[creditColIdx] : '';
            rawAmount = `Debit: ${rawDebit || '-'}, Credit: ${rawCredit || '-'}`;
            const hasDebit = rawDebit && rawDebit.trim().length > 0 && rawDebit.trim() !== '0' && rawDebit.trim() !== '0.00';
            const hasCredit = rawCredit && rawCredit.trim().length > 0 && rawCredit.trim() !== '0' && rawCredit.trim() !== '0.00';
            if (hasDebit && hasCredit) {
                findings.push({
                    severity: 'error',
                    code: 'AMBIGUOUS_AMOUNT',
                    message: 'Both Debit and Credit have non-zero amounts on the same row.',
                    field: 'amount'
                });
            } else if (hasDebit) {
                const debitResult = parseCsvAmount(rawDebit, currency);
                if (debitResult.amount_cents !== null) {
                    // Outflow / Debit to bank is an expense (negative minor unit)
                    const absDebit = Math.abs(debitResult.amount_cents);
                    amountCents = -absDebit;
                    eventType = 'expense';
                } else {
                    findings.push({
                        severity: 'error',
                        code: 'INVALID_DEBIT_AMOUNT',
                        message: debitResult.error || 'Failed to parse debit amount.',
                        field: 'amount'
                    });
                }
            } else if (hasCredit) {
                const creditResult = parseCsvAmount(rawCredit, currency);
                if (creditResult.amount_cents !== null) {
                    // Inflow / Credit to bank is income (positive minor unit)
                    amountCents = Math.abs(creditResult.amount_cents);
                    eventType = 'income';
                } else {
                    findings.push({
                        severity: 'error',
                        code: 'INVALID_CREDIT_AMOUNT',
                        message: creditResult.error || 'Failed to parse credit amount.',
                        field: 'amount'
                    });
                }
            } else {
                findings.push({
                    severity: 'error',
                    code: 'MISSING_AMOUNT',
                    message: 'Neither Debit nor Credit column has an amount.',
                    field: 'amount'
                });
            }
        }
        const hasErrors = findings.some((f)=>f.severity === 'error');
        if (hasErrors) {
            errorCount++;
        } else {
            validCount++;
        }
        parsedRows.push({
            row_number: rowNumber,
            raw_snippet: rawLine,
            date: canonicalDate,
            raw_date: rawDate,
            description,
            amount_cents: amountCents,
            raw_amount: rawAmount,
            event_type: eventType,
            validation_findings: findings
        });
    }
    return {
        headers,
        header_signature: signature,
        matched_mapping: mapping,
        rows: parsedRows,
        total_rows: parsedRows.length,
        valid_rows: validCount,
        error_rows: errorCount
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_lib_domain_67e11091._.js.map