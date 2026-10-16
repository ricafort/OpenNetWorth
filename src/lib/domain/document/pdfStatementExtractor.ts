/**
 * PDF Statement Text Extractor & Context Carrier
 * 
 * Why this file exists:
 * Fulfills Delivery 2B (Statement Files to Reviewed Balances):
 * Extracts text from financial statement PDFs locally using portable Node.js `pdf-parse`
 * (zero external binary or Python environment dependencies).
 * Evaluates extraction coverage per page, identifies unreadable/scanned pages, discloses
 * partial extraction, and carries explicitly sourced account context (institution, date,
 * currency, account name/mask) across page boundaries to contextualize balance tables.
 * 
 * Tricky logic:
 * - Per-Page Coverage: Evaluates text density and token count per page rather than a naive
 *   document-wide character count. Discloses unreadable/scanned pages clearly.
 * - Context Carry: Sourced attributes on early summary pages (e.g., CBA statement date 15/03/2026,
 *   currency AUD, Account 4421) are carried forward to contextualize balance rows on later pages.
 * - Two-Column / Nearby Amount Resilience: Filters out transaction entries (e.g. Woolworths $85.20)
 *   from balance snapshot lines (Limit $10,000, Closing Balance $1,500).
 * - Evidence Linkage: Annotates each proposal with exact 1-indexed `page_number` and `source_excerpt`.
 * 
 * TODO: In Milestone 2, connect unreadable pages to local vision/OCR background queue.
 */

import Database from 'better-sqlite3';
import { PDFParse } from 'pdf-parse';
import {
    CurrencyCode,
    CURRENCY_DECIMALS,
    BalanceKind,
    BalanceExtractionProposal,
    StatementPageCoverage,
    StatementCoverageSummary
} from '../accounting/types';
import { extractBalancesFromText, simpleHash } from '../accounting/balanceExtractionService';
import { listAccounts, listEntities } from '../accounting/accountService';
import { isValidCalendarDate } from '../calendarDate';

/**
 * Normalizes an institution name into a canonical brand token.
 * 
 * Why this exists:
 * Delivery 2B: Prevents ambiguous account-mask matching across banks and entities.
 * Sourced statement text (e.g. "Commonwealth Bank", "CommBank", "CBA") and chart of accounts
 * institution fields need consistent, noise-free brand tokens for accurate comparison.
 * 
 * Tricky logic:
 * Handles major Australian retail and investment institutions, mapping colloquial acronyms
 * (CBA, WBC, NAB, ANZ) to their canonical tokens.
 * 
 * TODO: Support user-defined institution aliases in Settings.
 */
export function canonicalizeInstitution(name?: string | null): string {
    if (!name) return '';
    const lower = name.toLowerCase().trim();
    if (/\b(?:commonwealth(?:\s+bank)?|commbank|cba)\b/i.test(lower)) return 'cba';
    if (/\b(?:westpac(?:\s+banking\s+corporation)?|wbc)\b/i.test(lower)) return 'westpac';
    if (/\b(?:anz|australia\s+and\s+new\s+zealand(?:\s+banking\s+group)?)\b/i.test(lower)) return 'anz';
    if (/\b(?:nab|national\s+australia(?:\s+bank)?)\b/i.test(lower)) return 'nab';
    if (/\bmacquarie(?:\s+bank)?\b/i.test(lower)) return 'macquarie';
    if (/\bing(?:\s+bank|\s+direct)?\b/i.test(lower)) return 'ing';
    if (/\bbendigo(?:\s+bank)?\b/i.test(lower)) return 'bendigo';
    if (/\bsuncorp(?:\s+bank)?\b/i.test(lower)) return 'suncorp';
    if (/\b(?:boq|bank\s+of\s+queensland)\b/i.test(lower)) return 'boq';
    if (/\bhostplus\b/i.test(lower)) return 'hostplus';
    if (/\baustraliansuper\b/i.test(lower)) return 'australiansuper';
    if (/\bvanguard\b/i.test(lower)) return 'vanguard';
    if (/\bbetashares\b/i.test(lower)) return 'betashares';

    // Fallback: strip standard legal corporate suffixes
    return lower.replace(/\b(?:bank|banking|corporation|ltd|limited|pty|group)\b/g, '').trim();
}

/**
 * Checks if two institution names are compatible (non-contradictory).
 * Returns true if either is absent (no contradiction), or if both canonicalize to the same brand.
 */
export function areInstitutionsCompatible(docInst?: string | null, accInst?: string | null): boolean {
    if (!docInst || !accInst) return true; // No explicit contradiction
    const cDoc = canonicalizeInstitution(docInst);
    const cAcc = canonicalizeInstitution(accInst);
    if (!cDoc || !cAcc) return true;
    return cDoc === cAcc;
}

/**
 * Checks if an account's institution positively matches the document's institution.
 */
export function doesInstitutionPositivelyMatch(docInst?: string | null, accInst?: string | null): boolean {
    if (!docInst || !accInst) return false;
    const cDoc = canonicalizeInstitution(docInst);
    const cAcc = canonicalizeInstitution(accInst);
    return Boolean(cDoc && cAcc && cDoc === cAcc);
}

/**
 * Generic corporate, trust, and business entity suffixes/descriptors that must NOT establish owner identity.
 * 
 * Why this set exists:
 * Fulfills Batch A Narrow Closing Correction 2:
 * Prevents false positives where distinct corporate accounts (e.g. "Alice Smith Pty Ltd" vs "Bob Jones Pty Ltd")
 * silently match merely because "Pty" and "Ltd" satisfy the token overlap threshold.
 */
const LEGAL_ENTITY_STOP_WORDS = new Set([
    'pty', 'ltd', 'limited', 'proprietary',
    'inc', 'incorporated', 'corp', 'corporation', 'llc',
    'trust', 'the', 'and', '&', 'atf', 'ttee', 'trustee', 'co', 'company'
]);

/**
 * Splits a string into normalized tokens, stripping non-alphanumeric punctuation.
 */
function extractOwnerTokens(str: string): string[] {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 0);
}

/**
 * Checks if two token lists represent the same person name with an optional single-letter middle initial.
 * e.g. ['alice', 'm', 'smith'] vs ['alice', 'smith']
 * Narrowly defined: exactly one side has 3 tokens with a 1-character middle token,
 * the other side has 2 tokens, and both first and last name tokens match identically.
 * 
 * Why this exists:
 * Fulfills Batch A Final Focused Recheck (Correction 1):
 * Replaces unsafe business-name subset matching. Never allows distinct entities (e.g. Acme Services
 * vs Acme Services Holdings) to match merely because one token list is a subset of the other.
 */
function isPersonalMiddleInitialMatch(tokensA: string[], tokensB: string[]): boolean {
    if (tokensA.length === 3 && tokensB.length === 2) {
        return (
            tokensA[1].length === 1 &&
            tokensA[0] === tokensB[0] &&
            tokensA[2] === tokensB[1]
        );
    }
    if (tokensA.length === 2 && tokensB.length === 3) {
        return (
            tokensB[1].length === 1 &&
            tokensA[0] === tokensB[0] &&
            tokensA[1] === tokensB[2]
        );
    }
    return false;
}

/**
 * Evaluates whether an extracted statement account holder is compatible with a candidate account's owner entity.
 * 
 * Why this function exists:
 * Fulfills Remediation Requirement A3 & Batch A Closing Corrections:
 * A statement naming Alice Smith must NOT be silently assigned to Bob Jones's account, even if institution
 * and account mask match and only one candidate exists.
 * Generic legal suffixes (Pty, Ltd, Trust) and unrestricted substring matches (Smith vs Smithson) must NOT
 * establish owner identity.
 * Subsets of business-name tokens (e.g. Acme Services vs Acme Services Holdings) must NOT establish identity.
 * 
 * Tricky logic:
 * - If docOwner is absent/empty, there is no conflicting evidence -> returns compatible: true.
 * - Compares normalized docOwner against primary entity name and any co-owners in account_ownership.
 * - Strips legal entity stop words so corporate descriptors do not satisfy matching thresholds.
 * - Eliminates unrestricted substring containment; requires exact token equality.
 * - Allows narrowly defined personal middle initials ([First, M, Last] vs [First, Last]).
 * - Uncertain or contradictory ownership strictly returns compatible: false with an explicit explanation.
 * 
 * TODO: In Milestone 2, support user-confirmed alias tables for scoped owner mapping.
 */
export function isOwnerCompatible(
    docOwner: string | null | undefined,
    candidateEntity: { id: string; name: string; type?: string } | null | undefined,
    jointOwners: Array<{ name: string }> = []
): { compatible: boolean; reason?: string } {
    if (!docOwner || !docOwner.trim()) {
        return { compatible: true };
    }
    if (!candidateEntity) {
        return { compatible: true };
    }

    const docTokens = extractOwnerTokens(docOwner);
    if (docTokens.length === 0) {
        return { compatible: true };
    }

    const docCore = docTokens.filter(t => !LEGAL_ENTITY_STOP_WORDS.has(t));
    const docCoreTokens = docCore.length > 0 ? docCore : docTokens;

    const candidateNames = [candidateEntity.name, ...jointOwners.map(j => j.name)]
        .filter(Boolean);

    for (const rawName of candidateNames) {
        const nameTokens = extractOwnerTokens(rawName);
        if (nameTokens.length === 0) continue;

        // 1. Exact normalized token match (e.g. "Alice Smith Pty Ltd" vs "Alice Smith Pty. Ltd.")
        if (docTokens.join(' ') === nameTokens.join(' ')) {
            return { compatible: true };
        }

        const nameCore = nameTokens.filter(t => !LEGAL_ENTITY_STOP_WORDS.has(t));
        const nameCoreTokens = nameCore.length > 0 ? nameCore : nameTokens;

        // 2. Exact core tokens match (ignoring generic legal suffixes, e.g. "Acme Services Pty Ltd" vs "Acme Services Limited")
        if (docCoreTokens.join(' ') === nameCoreTokens.join(' ')) {
            return { compatible: true };
        }

        // 3. Narrow personal middle-initial allowance:
        // Strictly [First, MiddleInitial, Last] vs [First, Last]
        // Never accepts subsets of business names like "Acme Services" vs "Acme Services Holdings".
        if (isPersonalMiddleInitialMatch(docCoreTokens, nameCoreTokens)) {
            return { compatible: true };
        }
    }

    return {
        compatible: false,
        reason: `This statement names ${docOwner.trim()}, but the matching account belongs to ${candidateEntity.name}. Choose the correct account.`
    };
}

export interface ExtractedStatementPage {
    page_number: number;
    text: string;
    is_readable: boolean;
    reason?: string;
}

export interface StatementExtractionResult {
    supported: boolean;
    document_id?: string;
    filename: string;
    content_hash: string;
    pages: ExtractedStatementPage[];
    coverage_summary: StatementCoverageSummary;
    proposals: BalanceExtractionProposal[];
    disclosures: string[];
    error?: string;
}

export interface ActiveStatementContext {
    institution?: string;
    account_name?: string;
    account_mask?: string;
    currency?: CurrencyCode;
    effective_date?: string; // YYYY-MM-DD
    owner?: string;
}

/**
 * Normalizes Australian/ISO dates found in statement headers to canonical YYYY-MM-DD.
 */
export function normalizeStatementDate(raw: string): string | null {
    if (!raw) return null;
    const clean = raw.trim();

    // ISO format: YYYY-MM-DD
    const isoMatch = clean.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
        const d = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
        if (isValidCalendarDate(d)) return d;
    }

    // Australian format: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = clean.match(/\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d{2})\b/);
    if (dmyMatch) {
        const d = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
        if (isValidCalendarDate(d)) return d;
    }

    // Text month format: e.g. "15 Mar 2026" or "15 March 2026"
    const textMonthMatch = clean.match(/\b(0?[1-9]|[12]\d|3[01])\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i);
    if (textMonthMatch) {
        const day = textMonthMatch[1].padStart(2, '0');
        const monthStr = textMonthMatch[2].toLowerCase();
        const year = textMonthMatch[3];
        const monthMap: Record<string, string> = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const prefix = monthStr.slice(0, 3);
        const mm = monthMap[prefix];
        if (mm) {
            const d = `${year}-${mm}-${day}`;
            if (isValidCalendarDate(d)) return d;
        }
    }

    return null;
}

/**
 * Discovers contextual header attributes from a statement page's text.
 */
export function inspectPageHeaderContext(pageText: string): ActiveStatementContext {
    const context: ActiveStatementContext = {};

    // 1. Institution detection (Australian banks, super funds, brokers)
    const instPatterns = [
        { name: 'Commonwealth Bank', regex: /\b(?:Commonwealth Bank|CBA|CommBank)\b/i },
        { name: 'Westpac', regex: /\b(?:Westpac)\b/i },
        { name: 'ANZ', regex: /\b(?:ANZ|Australia and New Zealand Banking Group)\b/i },
        { name: 'NAB', regex: /\b(?:National Australia Bank|NAB)\b/i },
        { name: 'Macquarie Bank', regex: /\b(?:Macquarie Bank|Macquarie)\b/i },
        { name: 'ING', regex: /\b(?:ING Bank|ING)\b/i },
        { name: 'Hostplus', regex: /\b(?:Hostplus)\b/i },
        { name: 'AustralianSuper', regex: /\b(?:AustralianSuper)\b/i },
        { name: 'Vanguard', regex: /\b(?:Vanguard)\b/i },
        { name: 'Betashares', regex: /\b(?:Betashares)\b/i }
    ];
    for (const inst of instPatterns) {
        if (inst.regex.test(pageText)) {
            context.institution = inst.name;
            break;
        }
    }

    // 2. Statement Date detection
    // e.g. "Statement Date: 15 Mar 2026", "Period ending 31/03/2026", "Closing Date: 2026-03-31",
    // or period ranges like "01 July - 30 September 2025 | Australian dollars (AUD)"
    // Tricky logic:
    // Finding 5: Payment Due Date (e.g. 15 Apr 2026) is NOT a statement balance date!
    // We must strictly reject "Payment Due", "Due Date", "Pay by", or "Min Payment".
    const dateLinePatterns = [
        /(?:Statement|Closing|Period(?:\s+ending)?|As\s+at|Effective)\s+Date[:\s]+([^\n\r]+)/i,
        /Period\s+ending[:\s]+([^\n\r]+)/i,
        /(?:Statement\s+period|Period(?: covered)?|For the period)[:\s]+[^\n\r]*?[-–—to]+\s*([^\n\r|]+)/i,
        /(?:\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?\s*[-–—to]+\s*)(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
        /(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s*[-–—to]+\s*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
        /As\s+at[:\s]+([^\n\r]+)/i
    ];
    for (const pattern of dateLinePatterns) {
        const match = pageText.match(pattern);
        if (match && match[1]) {
            const matchedFull = match[0];
            if (/Payment\s+Due|Due\s+Date|Pay\s+by|Min(?:imum)?\s+Payment/i.test(matchedFull)) {
                continue; // Guard: skip payment due date lines
            }
            const norm = normalizeStatementDate(match[1]);
            if (norm) {
                context.effective_date = norm;
                break;
            }
        }
    }
    // Fallback: look for general Australian date if not found in labelled line,
    // strictly skipping any line describing a payment due date or looking like a transaction row
    if (!context.effective_date) {
        const lines = pageText.split(/\r?\n/);
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            if (/Payment\s+Due|Due\s+Date|Pay\s+by|Min(?:imum)?\s+Payment/i.test(line)) {
                continue;
            }
            // Skip transaction rows (starts with a date and followed by description text or amounts)
            if (/^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s+[A-Za-z]/i.test(line) ||
                /^\d{1,2}\s+[A-Za-z]{3,}\s+[A-Za-z]/i.test(line)) {
                continue;
            }
            const norm = normalizeStatementDate(line);
            if (norm) {
                context.effective_date = norm;
                break;
            }
        }
    }

    // 3. Currency detection
    if (/\b(?:All\s+amounts\s+in\s+)?(?:Australian\s+Dollars?|AUD|\$A)\b/i.test(pageText)) {
        context.currency = 'AUD';
    } else if (/\b(?:US\s+Dollars?|USD|\$US)\b/i.test(pageText)) {
        context.currency = 'USD';
    } else if (/\b(?:EUR|Euros?)\b/i.test(pageText)) {
        context.currency = 'EUR';
    } else if (/\b(?:GBP|British\s+Pounds?)\b/i.test(pageText)) {
        context.currency = 'GBP';
    } else if (/\b(?:JPY|Japanese\s+Yen)\b/i.test(pageText)) {
        context.currency = 'JPY';
    } else if (/\$/i.test(pageText) && context.institution) {
        context.currency = 'AUD'; // Australian institution default
    }

    // 4. Account mask & Product type detection
    // First check for piped format: "Account: Everyday Checking | TEST-HH-EVERYDAY"
    const pipedAccountMatch = pageText.match(/(?:(?:Account(?:\s+Number)?|Acc(?:t)?\.?)\s*(?:No\.?)?[:\s]+)([^|\r\n]+?)\s*\|\s*([A-Za-z0-9_-]+)/i);
    if (pipedAccountMatch) {
        const prodName = pipedAccountMatch[1].trim();
        const accIdentifier = pipedAccountMatch[2].trim();
        if (prodName) {
            context.account_name = prodName;
        }
        if (accIdentifier) {
            context.account_mask = accIdentifier;
        }
    }

    if (!context.account_mask) {
        // e.g. "Account: •••• 4421", "Account Number: 1234-5678", "Account: 9812", or "Smart Access •••• 1111"
        const maskMatch = pageText.match(/(?:(?:Account(?:\s+Number)?|Acc(?:t)?\.?)\s*(?:No\.?)?[:\s]+(?:[•\*\.]{3,}\s*)?(\d{4,10}|\d{3,4}[-\s]\d{3,4})|[•\*\.]{3,}\s*(\d{3,4}))/i);
        if (maskMatch) {
            const rawDigits = (maskMatch[1] || maskMatch[2]).replace(/[-\s]/g, '');
            context.account_mask = rawDigits.length >= 4 ? rawDigits.slice(-4) : rawDigits;
        }
    }

    if (!context.account_name) {
        const productPatterns = [
            { name: 'Everyday Checking', regex: /\b(?:Everyday Checking|Smart Access|Complete Freedom|Classic Banking)\b/i },
            { name: 'High Interest Savings', regex: /\b(?:High Interest Savings|NetBank Saver|Goal Saver|eSaver)\b/i },
            { name: 'Credit Card', regex: /\b(?:Credit Card|Platinum Card|Diamond Awards|Low Rate Card)\b/i },
            { name: 'Home Loan', regex: /\b(?:Home Loan|Mortgage|Smart Loan|Offset Home Loan)\b/i },
            { name: 'Superannuation', regex: /\b(?:Superannuation|Super Fund|Accumulation Account)\b/i }
        ];
        for (const prod of productPatterns) {
            if (prod.regex.test(pageText)) {
                context.account_name = prod.name;
                break;
            }
        }
    }

    // 6. Owner detection (Account Holder, Customer Name, Prepared for, Owners)
    // Why this exists:
    // Requirement A3: Bound owner extraction to horizontal whitespace so subsequent header lines are not absorbed.
    const ownerMatch = pageText.match(/(?:Account\s+Holder|Customer(?:\s+Name)?|Prepared\s+for|Account\s+Owners?|Owners?)[:\t ]+([A-Za-z'.-]+(?:[ \t,]+[A-Za-z'.-]+)+)/i);
    if (ownerMatch && ownerMatch[1]) {
        context.owner = ownerMatch[1].trim();
    }

    return context;
}

/**
 * Strips recurring boilerplate, bank legal disclaimers, ABN/AFSL notices, and page markers.
 * 
 * Why this exists:
 * Fulfills Independent Assessment Finding 5:
 * Footer-only text (e.g. bank ABN, licence, or page number) does NOT prove financial content was read.
 * We remove non-content boilerplate before evaluating page reading coverage.
 */
export function stripPageBoilerplate(rawText: string): string {
    const lines = (rawText || '').split(/\r?\n/);
    const contentLines = lines.filter(rawLine => {
        const line = rawLine.trim();
        if (!line) return false;
        // Strip page numbers (e.g. "Page 1 of 2", "Page 2", "1 / 2")
        if (/^Page\s+\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(line) || /^\d+\s*\/\s*\d+$/.test(line)) {
            return false;
        }
        // Strip bank registration / licensing notices
        if (/\b(?:ABN|ACN|AFSL|Australian\s+Credit\s+Licence|Australian\s+Financial\s+Services\s+Licen[cs]e)\b/i.test(line)) {
            return false;
        }
        // Strip contact info / URLs
        if (/\b(?:www\.[a-z0-9.-]+|[a-z0-9.-]+\.com\.au|13\s*\d{4}|1800\s*\d{3}\s*\d{3})\b/i.test(line)) {
            return false;
        }
        // Strip bank name headers and entity notices with optional page markers (e.g. "Commonwealth Bank Page 1", "Westpac Banking Corporation", "ANZ Page 2 of 2")
        // Why this exists:
        // Delivery 2B Correction 3: "Commonwealth Bank Page 1" alone must not prove financial coverage.
        // Bank headers and page numbers must be stripped before evaluating whether substantive financial content exists.
        // Tricky logic:
        // Matches bank names alone OR bank names followed by "Page X", "Page X of Y", or "X / Y".
        // TODO: In Milestone 2, expand known bank header patterns via configurable regex table.
        if (/^(?:Commonwealth\s+Bank(?:\s+of\s+Australia)?|Westpac(?:\s+Banking\s+Corporation)?|National\s+Australia\s+Bank(?:\s+Limited)?|Australia\s+and\s+New\s+Zealand\s+Banking\s+Group(?:\s+Limited)?|ANZ(?:\s+Bank)?|NAB|Macquarie(?:\s+Bank)?)(?:\s+(?:Page\s+\d+(?:\s*(?:of|\/)\s*\d+)?|\d+\s*\/\s*\d+))?$/i.test(line)) {
            return false;
        }
        // Strip corporate legal entities
        if (/^(?:Commonwealth Bank of Australia|Westpac Banking Corporation|National Australia Bank Limited|Australia and New Zealand Banking Group Limited)$/i.test(line)) {
            return false;
        }
        // Strip standard document retention disclaimers
        if (/^(?:This\s+statement\s+is\s+issued|Please\s+check\s+all\s+entries|Retain\s+this\s+statement|For\s+customer\s+service)/i.test(line)) {
            return false;
        }
        return true;
    });
    return contentLines.join('\n');
}

/**
 * Evaluates the extraction coverage of a single page's text.
 * 
 * Why this exists:
 * Fulfills Required Plan Adjustment 1 & Finding 5:
 * Does NOT use "20 characters anywhere" as proof the statement was read.
 * Evaluates non-whitespace characters and readable tokens AFTER stripping boilerplate footers,
 * and requires the presence of financial statement content.
 * 
 * Tricky logic:
 * A scanned page that only contains a selectable header/footer (e.g. "Page 2 of 2 - Commonwealth Bank ABN ..."
 * or "Commonwealth Bank Page 1") is stripped down to zero meaningful financial content and flagged as is_readable = false.
 * 
 * TODO: In Milestone 2, route unreadable pages to local OCR image processor.
 */
export function evaluatePageCoverage(pageNum: number, rawText: string): StatementPageCoverage {
    const stripped = stripPageBoilerplate(rawText || '');
    const charCount = stripped.replace(/\s+/g, '').length;
    const tokens = stripped.match(/[a-zA-Z0-9]{2,}/g) || [];
    const tokenCount = tokens.length;

    // Readable threshold: Requires >= 20 non-boilerplate characters and >= 3 readable tokens.
    // Why this exists:
    // Fulfills Required Plan Adjustment 1 & Finding 5:
    // Footer-only text (ABN, AFSL, page numbers, URLs) is stripped first, ensuring scanned pages with digital footers
    // do not falsely count as readable. Substantive pages (including cover pages and statement bodies) evaluate as readable.
    // Tricky logic:
    // Stripping boilerplate prevents image-only pages with printer/scanner footers from registering as readable text.
    // TODO: In Milestone 2, route unreadable pages to local OCR image processor.
    const isReadable = charCount >= 20 && tokenCount >= 3;

    return {
        page_number: pageNum,
        character_count: charCount,
        readable_token_count: tokenCount,
        is_readable: isReadable,
        reason: isReadable ? undefined : 'No selectable text found on this page beyond recurring boilerplate (scanned image or empty page)'
    };
}

/**
 * Contextual transaction table checkers.
 * Why these exist:
 * Fulfills Batch C1 Requirement 2:
 * Prevents transaction rows from contaminating balance proposals without
 * globally rejecting lines merely containing dates, PAYROLL, BPAY, or amounts.
 */
function isTransactionTableHeader(line: string): boolean {
    return /^(?:Date|Tx\s*Date|Transaction\s*Date)\s+(?:Description|Reference|Particulars|Narrative|Details)\b/i.test(line) &&
           /(?:Amount|Debit|Credit|Withdrawals|Deposits|Balance)\b/i.test(line);
}

function isSeparatelyLabelledSummary(line: string): boolean {
    return /^(?:Closing|Opening|Current|Statement|New|Ending)\s+(?:signed\s+)?Balance[:\s]/i.test(line) ||
           /^(?:Total\s+(?:Portfolio\s*Value|Balance|Due)|Outstanding\s*Principal|Available\s*Redraw|Credit\s*Limit|Available\s*Credit)[:\s]/i.test(line);
}

function isTransactionRow(line: string): boolean {
    const datePrefix = /^(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{2,4})?)\s+/i;
    return datePrefix.test(line);
}

function hasBalanceKeyword(line: string): boolean {
    return /\b(balance|closing|opening|limit|redraw|owing|principal|value|total|portfolio)\b/i.test(line);
}

/**
 * Extracts proposals from horizontal summary tables where column headers appear on one line
 * and corresponding monetary values appear on the subsequent line.
 * 
 * Why this exists:
 * Fulfills Batch C1 Requirement 2:
 * Bank statements (e.g. household_bank_statement.pdf) frequently format balance summaries horizontally
 * across columns: "Opening signed balance Credits Debits Closing signed balance" with amounts on the next line.
 * Extracts the evidenced closing balance fact without creating spurious transaction proposals.
 * 
 * Tricky logic:
 * Uses regex matching for summary column headers and aligns the target column index with whitespace-split amount tokens.
 * Extracts the exact column title and preserves source excerpt containing both lines.
 */
export function extractHorizontalSummaryProposals(
    pageText: string,
    defaultCurrency: CurrencyCode | undefined,
    defaultDate: string | undefined,
    accountName?: string,
    accountMask?: string
): BalanceExtractionProposal[] {
    const lines = pageText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const summaryProposals: BalanceExtractionProposal[] = [];

    for (let i = 0; i < lines.length - 1; i++) {
        const headerLine = lines[i];
        const nextLine = lines[i + 1];

        // Check if headerLine contains closing balance indicator
        if (/\b(?:closing\s*(?:signed\s*)?balance|new\s*balance|ending\s*balance|statement\s*balance)\b/i.test(headerLine)) {
            // Check if nextLine contains amounts (separated by whitespace)
            const amountTokens = nextLine.split(/\s+/).filter(t => /^[+-]?\$?\d+(?:,\d{3})*(?:\.\d+)?$/.test(t));
            if (amountTokens.length >= 2) {
                // Split header columns: Opening balance, Credits/Deposits, Debits/Withdrawals, Closing balance
                const colRegex = /(?:Opening\s*(?:signed\s*)?balance|Credits?|Debits?|Deposits?|Withdrawals?|Total\s*Credits?|Total\s*Debits?|Closing\s*(?:signed\s*)?balance|Ending\s*balance|New\s*balance|Statement\s*balance)/gi;
                const columns = Array.from(headerLine.matchAll(colRegex)).map(m => m[0]);

                if (columns.length > 0) {
                    const closingIdx = columns.findIndex(c => /closing|ending|new|statement\s*balance/i.test(c));
                    const targetIdx = closingIdx !== -1 ? closingIdx : columns.length - 1;

                    if (targetIdx < amountTokens.length) {
                        const rawAmount = amountTokens[targetIdx].replace(/[$,]/g, '');
                        const num = parseFloat(rawAmount);
                        const unresolvedFields: string[] = [];
                        let amountCents: number | null = null;
                        
                        if (!defaultCurrency) unresolvedFields.push('currency');
                        if (!defaultDate) unresolvedFields.push('effective_date');
                        if (!accountName && !accountMask) unresolvedFields.push('account');

                        if (!Number.isFinite(num)) {
                            unresolvedFields.push('amount');
                        } else {
                            const decimals = defaultCurrency ? (CURRENCY_DECIMALS[defaultCurrency] ?? 2) : 2;
                            if (rawAmount.includes('.')) {
                                const fraction = rawAmount.split('.')[1] || '';
                                if (fraction.length > decimals) {
                                    unresolvedFields.push('amount_precision');
                                }
                            }
                            amountCents = decimals === 0 ? Math.round(num) : Math.round(num * Math.pow(10, decimals));
                        }

                        if (amountCents !== null) {
                            summaryProposals.push({
                                id: '',
                                account_id: null,
                                raw_account_name: accountName || 'Unnamed Account',
                                account_name: accountName || 'Unnamed Account',
                                raw_label: columns[targetIdx],
                                balance_kind: 'statement_closing_balance',
                                amount_cents: amountCents,
                                currency: defaultCurrency || 'AUD', // Keep valid type, but unresolved
                                effective_date: defaultDate || new Date().toISOString().split('T')[0],
                                source_excerpt: `${headerLine}\n${nextLine}`,
                                account_mask: accountMask || null,
                                confidence: 0.95,
                                unresolved_fields: unresolvedFields
                            });
                        }
                    }
                }
            }
        }
    }

    return summaryProposals;
}

/**
 * Resolves a proposal against candidate accounts using mask, account name, institution, and owner evidence.
 * Ensures explicit owner conflicts in the statement are preserved and not overridden by selected workspace context.
 */
function resolveProposalAccount(
    db: Database.Database,
    prop: BalanceExtractionProposal,
    activeContext: ActiveStatementContext,
    entityId?: string,
    disclosures: string[] = []
): void {
    if (prop.account_id) return;

    const accounts = listAccounts(db);
    const entities = listEntities(db);
    const entityMap = new Map(entities.map(e => [e.id, e]));

    // Match candidate accounts by mask or name
    let candidates = accounts.filter(acc => {
        if (prop.currency && acc.currency !== prop.currency) return false;
        if (prop.account_mask && acc.account_number_mask) {
            return (
                acc.account_number_mask === prop.account_mask ||
                acc.account_number_mask.endsWith(prop.account_mask) ||
                prop.account_mask.endsWith(acc.account_number_mask)
            );
        }
        if (prop.account_name && acc.name) {
            const isGeneric = /^(?:Closing|Opening|Current|Statement|New|Ending)\s*Balance$/i.test(prop.account_name.trim());
            if (!isGeneric) {
                return acc.name.toLowerCase() === prop.account_name.toLowerCase();
            }
        }
        return false;
    });

    if (candidates.length === 0) {
        prop.account_id = null;
        if (!prop.unresolved_fields) prop.unresolved_fields = [];
        if (!prop.unresolved_fields.includes('account')) prop.unresolved_fields.push('account');
        return;
    }

    const docInst = activeContext.institution || null;
    const docOwner = activeContext.owner || null;

    // 1. Reject contradictory institutions
    const nonContradictoryInst = candidates.filter(acc =>
        areInstitutionsCompatible(docInst, acc.institution)
    );

    // 2. Narrow by positive institution evidence if available
    let filteredCandidates = nonContradictoryInst;
    if (docInst) {
        const positiveMatches = nonContradictoryInst.filter(acc =>
            doesInstitutionPositivelyMatch(docInst, acc.institution)
        );
        if (positiveMatches.length > 0) {
            filteredCandidates = positiveMatches;
        }
    }

    // 3. Evaluate owner evidence
    let nonContradictoryOwners: typeof filteredCandidates = [];
    let ownerContradictionMessage: string | null = null;

    if (docOwner) {
        const candidatesWithOwnerCheck = filteredCandidates.map(acc => {
            const ent = entityMap.get(acc.entity_id);
            const jointOwners = db.prepare(`
                SELECT e.name
                FROM account_ownership o
                JOIN entities e ON o.entity_id = e.id
                WHERE o.account_id = ?
            `).all(acc.id) as Array<{ name: string }>;

            const check = isOwnerCompatible(docOwner, ent, jointOwners);
            return { acc, ent, check };
        });

        const compatibleList = candidatesWithOwnerCheck.filter(c => c.check.compatible).map(c => c.acc);
        const contradictoryList = candidatesWithOwnerCheck.filter(c => !c.check.compatible);

        if (contradictoryList.length > 0 && compatibleList.length === 0) {
            ownerContradictionMessage = contradictoryList[0].check.reason || `This statement names ${docOwner}, but the matching account belongs to another owner. Choose the correct account.`;
            nonContradictoryOwners = [];
        } else {
            nonContradictoryOwners = compatibleList;
        }
    } else {
        nonContradictoryOwners = filteredCandidates;
    }

    // 4. Narrow by selected entityId if supplied and not "all"
    // "Selected workspace context may narrow compatible candidates, but must not override an explicit owner conflict in the document."
    if (entityId && entityId.toLowerCase() !== 'all') {
        const sameEntity = nonContradictoryOwners.filter(acc => acc.entity_id === entityId);
        if (sameEntity.length > 0) {
            nonContradictoryOwners = sameEntity;
        } else if (!ownerContradictionMessage && nonContradictoryOwners.length > 0) {
            ownerContradictionMessage = `Statement account matches an account owned by a different entity. Choose the correct account.`;
            nonContradictoryOwners = [];
        }
    }

    // 5. Decision
    if (nonContradictoryOwners.length === 1 && !ownerContradictionMessage) {
        const chosen = nonContradictoryOwners[0];
        prop.account_id = chosen.id;
        prop.account_name = chosen.name;
        prop.entity_id = chosen.entity_id;
        prop.tracking_mode = (chosen.tracking_mode || 'balance') as any;
        prop.expected_balance_revision = chosen.balance_revision || 1;
        if (prop.unresolved_fields) {
            prop.unresolved_fields = prop.unresolved_fields.filter(f => f !== 'account' && f !== 'owner');
        }
    } else if (ownerContradictionMessage) {
        prop.account_id = null;
        prop.owner_conflict_message = ownerContradictionMessage;
        if (!prop.unresolved_fields) prop.unresolved_fields = [];
        if (!prop.unresolved_fields.includes('owner')) prop.unresolved_fields.push('owner');
        if (!prop.unresolved_fields.includes('account')) prop.unresolved_fields.push('account');
        if (!disclosures.includes(ownerContradictionMessage)) {
            disclosures.push(ownerContradictionMessage);
        }
    } else if (nonContradictoryOwners.length > 1) {
        prop.account_id = null;
        if (!prop.unresolved_fields) prop.unresolved_fields = [];
        if (!prop.unresolved_fields.includes('owner')) prop.unresolved_fields.push('owner');
        if (!prop.unresolved_fields.includes('account')) prop.unresolved_fields.push('account');
    } else {
        prop.account_id = null;
        if (!prop.unresolved_fields) prop.unresolved_fields = [];
        if (!prop.unresolved_fields.includes('account')) prop.unresolved_fields.push('account');
    }
}

/**
 * Extracts account balances from a statement PDF buffer locally and portably.
 */
export async function extractStatementBalancesFromPdf(
    db: Database.Database,
    pdfBuffer: Buffer,
    filename: string,
    documentId?: string,
    entityId?: string
): Promise<StatementExtractionResult> {
    // Validate supplied specific entity ID. Treat "all" as unconstrained.
    if (entityId && entityId.toLowerCase() !== 'all') {
        const ent = db.prepare('SELECT id FROM entities WHERE id = ?').get(entityId);
        if (!ent) {
            throw new Error(`Invalid entity ID: ${entityId}`);
        }
    }

    // 1. SHA-256 hash of PDF buffer
    const crypto = await import('crypto');
    const contentHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // 2. Parse PDF locally with portable pdf-parse
    let parsedPdf: any;
    try {
        // Why this exists:
        // Next.js bundles server code into .next/dev/server/chunks. Under Turbopack/webpack,
        // pdfjs-dist's relative worker resolution fails with "Cannot find module .../pdf.worker.mjs".
        // Setting an absolute file URL worker path guarantees portable execution in both Next.js and Vitest.
        // Tricky logic:
        // Uses pathToFileURL on process.cwd()/node_modules/pdf-parse/dist/worker/pdf.worker.mjs.
        // Falls back gracefully if running in constrained environments.
        // TODO: In Milestone 2, bundle worker into standalone public directory for browser-side parsing.
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
        parsedPdf = await parser.getText();
        await parser.destroy();
    } catch (err: any) {
        const msg = err.message || String(err);
        if (/password|encrypted/i.test(msg)) {
            return {
                supported: false,
                document_id: documentId,
                filename,
                content_hash: contentHash,
                pages: [],
                coverage_summary: {
                    total_pages: 0,
                    readable_pages: 0,
                    unreadable_pages: 0,
                    coverage_level: 'none',
                    page_details: [],
                    disclosures: ['Password-protected PDF: please remove password protection before importing.']
                },
                proposals: [],
                disclosures: ['Password-protected PDF: please remove password protection before importing.'],
                error: 'Password-protected PDF: please remove password protection before importing.'
            };
        }
        return {
            supported: false,
            document_id: documentId,
            filename,
            content_hash: contentHash,
            pages: [],
            coverage_summary: {
                total_pages: 0,
                readable_pages: 0,
                unreadable_pages: 0,
                coverage_level: 'none',
                page_details: [],
                disclosures: [`Unsupported PDF structure: ${msg}`]
            },
            proposals: [],
            disclosures: [`Unsupported PDF structure: ${msg}`],
            error: `Unsupported PDF structure: ${msg}`
        };
    }

    const pagesText: string[] = Array.isArray(parsedPdf.pages)
        ? parsedPdf.pages.map((p: any) => p.text || '')
        : (parsedPdf.text || '').split(/\f/);

    const totalPages = pagesText.length;
    const extractedPages: ExtractedStatementPage[] = [];
    const pageDetails: StatementPageCoverage[] = [];
    const disclosures: string[] = [];

    let readableCount = 0;
    let unreadableCount = 0;

    for (let i = 0; i < totalPages; i++) {
        const pageNum = i + 1;
        const raw = pagesText[i] || '';
        const cov = evaluatePageCoverage(pageNum, raw);

        pageDetails.push(cov);
        if (cov.is_readable) {
            readableCount++;
        } else {
            unreadableCount++;
        }

        extractedPages.push({
            page_number: pageNum,
            text: raw,
            is_readable: cov.is_readable,
            reason: cov.reason
        });
    }

    // 3. Truthful Coverage Classification
    let coverageLevel: 'full' | 'partial' | 'none' = 'none';
    if (totalPages > 0 && readableCount === totalPages) {
        coverageLevel = 'full';
    } else if (readableCount > 0) {
        coverageLevel = 'partial';
        const unreadableList = pageDetails.filter(p => !p.is_readable).map(p => p.page_number).join(', ');
        disclosures.push(`Page(s) ${unreadableList} contain no selectable text beyond boilerplate and may be scanned or empty.`);
    } else {
        coverageLevel = 'none';
    }

    const coverageSummary: StatementCoverageSummary = {
        total_pages: totalPages,
        readable_pages: readableCount,
        unreadable_pages: unreadableCount,
        coverage_level: coverageLevel,
        page_details: pageDetails,
        disclosures
    };

    if (coverageLevel === 'none') {
        return {
            supported: false,
            document_id: documentId,
            filename,
            content_hash: contentHash,
            pages: extractedPages,
            coverage_summary: coverageSummary,
            proposals: [],
            disclosures,
            error: 'No selectable text found across any page of this PDF. This document requires OCR or manual entry.'
        };
    }

    // 4. Context propagation across pages
    // Sourced attributes (institution, date, currency) are carried forward across relevant pages.
    // Account-specific attributes (name, mask) are strictly scoped to avoid cross-account contamination.
    const activeContext: ActiveStatementContext = {};
    const allProposals: BalanceExtractionProposal[] = [];

    for (const page of extractedPages) {
        if (!page.is_readable) continue;

        // Inspect page for header context
        const pageHeader = inspectPageHeaderContext(page.text);

        // Account context scoping & new account boundary detection:
        // Why this exists:
        // Delivery 2B Correction 3: A new account must not inherit unsupported currency/date facts from a prior account,
        // while legitimate shared statement context (e.g. single multi-page statement with summary on page 1) is preserved.
        // Tricky logic:
        // A new account boundary is triggered if this page specifies a distinct account name, account mask, or owner
        // that differs from activeContext. When triggered, account-specific metadata is replaced and date/currency
        // are reset unless explicitly stated on this page.
        // TODO: In Milestone 2, support multi-column account balances within a single page section.
        const isNewAccount = (
            (pageHeader.account_name && activeContext.account_name && pageHeader.account_name !== activeContext.account_name) ||
            (pageHeader.account_mask && activeContext.account_mask && pageHeader.account_mask !== activeContext.account_mask) ||
            (pageHeader.owner && activeContext.owner && pageHeader.owner !== activeContext.owner)
        );

        if (isNewAccount) {
            activeContext.account_name = pageHeader.account_name || undefined;
            activeContext.account_mask = pageHeader.account_mask || undefined;
            activeContext.owner = pageHeader.owner || undefined;
            // Strict scoping: Do NOT inherit unsupported date or currency facts from the prior account
            activeContext.effective_date = pageHeader.effective_date || undefined;
            activeContext.currency = pageHeader.currency || undefined;
            if (pageHeader.institution) activeContext.institution = pageHeader.institution;
        } else {
            // Continuation of current account or first page: carry forward shared statement context
            if (pageHeader.institution) activeContext.institution = pageHeader.institution;
            if (pageHeader.effective_date) activeContext.effective_date = pageHeader.effective_date;
            if (pageHeader.currency) activeContext.currency = pageHeader.currency;
            if (pageHeader.owner) activeContext.owner = pageHeader.owner;
            if (pageHeader.account_name) activeContext.account_name = pageHeader.account_name;
            if (pageHeader.account_mask) activeContext.account_mask = pageHeader.account_mask;
        }

        // Pre-filter page lines & extract horizontal summaries:
        const horizontalSummaries = extractHorizontalSummaryProposals(
            page.text,
            activeContext.currency,
            activeContext.effective_date,
            activeContext.account_name,
            activeContext.account_mask
        );

        for (let hIdx = 0; hIdx < horizontalSummaries.length; hIdx++) {
            const hProp = horizontalSummaries[hIdx];
            hProp.page_number = page.page_number;
            hProp.document_id = documentId || null;

            resolveProposalAccount(db, hProp, activeContext, entityId, disclosures);

            const docKey = documentId ? documentId.slice(0, 8) : contentHash.slice(0, 8);
            const occurrenceHash = simpleHash(
                `${page.page_number}:h${hIdx}:${hProp.source_excerpt || ''}:${hProp.raw_label || ''}:${hProp.raw_account_name || ''}:${hProp.amount_cents ?? ''}:${hProp.currency}`
            );
            hProp.id = `prop-${docKey}-p${page.page_number}-h${hIdx}-${occurrenceHash}`;
            allProposals.push(hProp);
        }

        const lines = page.text.split(/\r?\n/);
        const filteredLines: string[] = [];
        let inTxTable = false;

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            // 1. Filter page numbers (e.g. "Page 1 of 2", "Page 2", "1 / 2", or ending with "Page 2")
            if (/^Page\s+\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(line) || /^\d+\s*\/\s*\d+$/.test(line) || /\bPage\s+\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(line)) {
                continue;
            }

            // Filter test banners / synthetic test notices
            if (/\b(?:SYNTHETIC\s+TEST\s+DATA|Australian_Finance_Test_Pack)\b/i.test(line)) {
                continue;
            }

            // 2. Filter minimum payment notices (e.g. "Minimum Payment Due: $50.00", "Min Payment: $25.00")
            if (/(?:Minimum\s*(?:Payment|Amount)(?:\s*Due)?|Min\s*Payment|Payment\s*Due(?:\s*Date)?|Pay\s*by)[:\s]/i.test(line)) {
                continue;
            }

            // Filter period header lines (e.g. "Statement Period: 01 October 2025 - 31 October 2025", "Period: ...")
            if (/^(?:Statement\s+Period|Period\s+Covered|For\s+the\s+period|Period)[:\s]/i.test(line)) {
                continue;
            }

            // Filter horizontal summary headers and multi-amount rows already processed by extractHorizontalSummaryProposals
            if (/\b(?:closing\s*(?:signed\s*)?balance|new\s*balance|ending\s*balance|statement\s*balance)\b/i.test(line) && /\b(?:opening|credits?|debits?)\b/i.test(line)) {
                continue;
            }
            const amtMatches = line.match(/\$?\d[\d,]*\.\d{2}/g);
            if (amtMatches && amtMatches.length >= 2 && !hasBalanceKeyword(line)) {
                continue;
            }

            // Contextual transaction table tracking
            if (isTransactionTableHeader(line)) {
                inTxTable = true;
                continue;
            }

            if (inTxTable) {
                if (isSeparatelyLabelledSummary(line)) {
                    inTxTable = false; // Transaction table ended, summary row begins
                } else if (isTransactionRow(line)) {
                    continue; // Contextual transaction row
                } else if (!hasBalanceKeyword(line)) {
                    continue; // Transaction continuation text
                }
            }

            // 3. Filter individual transactions (e.g. "12 Mar Woolworths $85.20" or "14 Mar Shell Coles Express $110.00")
            const isTxLine = /^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+.*?\$\d+/i.test(line) ||
                             /^\d{1,2}[/-]\d{1,2}\s+.*?\$\d+/i.test(line);
            if (isTxLine) continue;

            // 4. Filter pure statement date / due date lines without a balance amount
            const isPureDateHeader = /^(?:Statement|Closing|Period(?:\s+ending)?|Effective|Payment\s+Due|Due)\s+Date[:\s]+[^\$\d]*\d+/i.test(line) && !/\$(?:[0-9]{1,3}(?:,[0-9]{3})*|\d+)/.test(line);
            if (isPureDateHeader) continue;

            // Filter pure period range headers e.g. "01 July - 30 September 2025 | Australian dollars (AUD)"
            const isPurePeriodHeader = /^\d{1,2}\s+[A-Za-z]+\s*[-–—to]+\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}/i.test(line) && !/:\s*[-+]?\$?\d/.test(line);
            if (isPurePeriodHeader) continue;

            // Filter pure customer / owner header lines without balance amounts
            if (/^(?:Customer|Account\s*Holder|Prepared\s*for)[:\s]/i.test(line) && !/:\s*[-+]?\$?\d/.test(line)) {
                continue;
            }

            // 5. Filter standalone account title/mask lines without a balance amount (e.g. "•••• 4421", "Account Number: 1234-5678")
            const isAccountMaskHeader = (
                (/[•\*\.]{3,}\s*\d{3,4}$/.test(line) && !/[:\$]/.test(line)) ||
                (/^(?:Account(?:\s+Number)?|Acc(?:t)?\.?)\s*(?:No\.?)?[:\s]+(?:[•\*\.]{3,}\s*)?\d+[-\s]?\d*$/i.test(line) && !/\$/.test(line)) ||
                (/^(?:Account(?:\s+Number)?|Acc(?:t)?\.?)\s*(?:No\.?)?[:\s]+[^|\r\n]+\|\s*[A-Za-z0-9_-]+$/i.test(line) && !/\$/.test(line))
            );
            if (isAccountMaskHeader) continue;

            filteredLines.push(line);
        }

        const cleanPageText = filteredLines.join('\n');

        // Why this exists:
        // Delivery 2B Clarification & Requirement 3:
        // Selectable-text PDFs are extracted deterministically using parseStructuredTable via extractBalancesFromText.
        // Using strategy: 'table' ensures fast, deterministic, offline execution without LLM network timeouts on text-only pages.
        // Tricky logic:
        // Sourced header context (currency, date) is passed cleanly as defaults without polluting the raw page text.
        // TODO: In Milestone 2, allow optional local LLM second-pass for unstructured freeform cover letters if requested.
        const extractRes = await extractBalancesFromText(db, {
            text: cleanPageText,
            defaultCurrency: activeContext.currency || 'AUD',
            defaultDate: activeContext.effective_date,
            strategy: 'table',
            entityId
        });

        for (let pIdx = 0; pIdx < extractRes.proposals.length; pIdx++) {
            const prop = extractRes.proposals[pIdx];

            // Attribute to page and document
            prop.page_number = page.page_number;
            prop.document_id = documentId || null;

            // Avoid duplicating proposals already extracted by horizontal summary
            const isDuplicateOfHorizontal = horizontalSummaries.some(h =>
                h.amount_cents === prop.amount_cents &&
                h.balance_kind === prop.balance_kind &&
                h.effective_date === (prop.effective_date || activeContext.effective_date)
            );
            if (isDuplicateOfHorizontal) {
                continue;
            }

            // Context carry: if proposal has no date, apply active context date
            if (!prop.effective_date && activeContext.effective_date) {
                prop.effective_date = activeContext.effective_date;
            }

            // Extract inline account mask from proposal's own line if present
            const inlineMaskMatch = (prop.source_excerpt || prop.raw_account_name || '').match(/(?:[•\*\.]{3,}\s*|\bAcc(?:t)?\.?\s*(?:No\.?)?[:\s]*)(\d{4,10}|\d{3,4}[-\s]\d{3,4})\b/i);
            if (inlineMaskMatch && inlineMaskMatch[1]) {
                const rawDigits = inlineMaskMatch[1].replace(/[-\s]/g, '');
                prop.account_mask = rawDigits.length >= 4 ? rawDigits.slice(-4) : rawDigits;
            } else if (!prop.account_mask && activeContext.account_mask) {
                prop.account_mask = activeContext.account_mask;
            }

            // Generic balance label inherit account name
            const isGenericBalanceLabel = !prop.raw_account_name ||
                /^(?:Closing\s*Balance|Current\s*Balance|Statement\s*Balance|Account\s*Balance|Balance|Limit|Credit\s*Limit|Available\s*Credit|Available\s*Redraw|Outstanding\s*Principal|Total\s*Portfolio\s*Value)$/i.test(prop.raw_account_name.trim());

            if (isGenericBalanceLabel && activeContext.account_name) {
                prop.raw_account_name = activeContext.account_name;
                prop.account_name = activeContext.account_name;
            }

            // Resolve candidate account & owner evidence
            resolveProposalAccount(db, prop, activeContext, entityId, disclosures);

            // Two-column / line-item filter:
            // Ensure single transaction lines with merchant names aren't misclassified as balances
            const excerpt = prop.source_excerpt || prop.raw_label || '';
            const isIndividualTx = /^(?:\d{1,2}[/-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3})\s+(?:Woolworths|Coles|Uber|Netflix|Spotify|Pharmacy|Cafe|Restaurant|Direct Debit|Transfer to)/i.test(excerpt);
            if (isIndividualTx) {
                continue; // Skip individual transaction rows in 2-column statements
            }

            // Stable unique proposal ID per occurrence across all pages and accounts (Finding 2)
            const docKey = documentId ? documentId.slice(0, 8) : contentHash.slice(0, 8);
            const occurrenceHash = simpleHash(
                `${page.page_number}:${pIdx}:${prop.source_excerpt || ''}:${prop.raw_label || ''}:${prop.raw_account_name || ''}:${prop.amount_cents ?? ''}:${prop.currency}`
            );
            prop.id = `prop-${docKey}-p${page.page_number}-r${pIdx}-${occurrenceHash}`;

            allProposals.push(prop);
        }
    }

    return {
        supported: true,
        document_id: documentId,
        filename,
        content_hash: contentHash,
        pages: extractedPages,
        coverage_summary: coverageSummary,
        proposals: allProposals,
        disclosures
    };
}
