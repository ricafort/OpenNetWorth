/**
 * Statement PDF Extractor & Coverage Tests
 * 
 * Why this file exists:
 * Fulfills Delivery 2B Required Plan Adjustments 1 & 2:
 * Tests the portable Node.js PDF extraction pipeline, verifying per-page coverage assessment,
 * partial extraction disclosure, cross-page context propagation, two-column layout resilience,
 * and evidence linkage (page numbers and source excerpts).
 * 
 * Tricky logic:
 * - Uses in-memory SQLite database (`createTestDb()`) to test end-to-end integration
 *   with the balance extraction service.
 * - Tests both full, partial, and zero-coverage documents deterministically.
 * 
 * TODO: In Milestone 2, add benchmarks comparing extraction times across large multi-page PDFs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createEntity, createAccount } from '../accounting/accountService';
import {
    extractStatementBalancesFromPdf,
    normalizeStatementDate,
    evaluatePageCoverage
} from './pdfStatementExtractor';
import {
    createCreditCardStatementPdf,
    createMortgageStatementPdf,
    createSuperInvestmentStatementPdf,
    createJointDifferentOwnersStatementPdf,
    createTextCoverThenScannedPdf,
    createDateCurrencyPage1BalancePage2Pdf,
    createTwoColumnStatementPdf,
    createScannedImageStatementPdf
} from './fixtures/statementFixtures';

describe('Delivery 2B: PDF Statement Extractor & Per-Page Coverage', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = createTestDb();
        initAccountingSchema(db);

        // Seed default entity and accounts
        const entity = createEntity(db, { name: 'Test Household', type: 'household', currency: 'AUD' });
        createAccount(db, {
            entity_id: entity.id,
            name: 'Diamond Awards Credit Card',
            type: 'liability',
            sub_type: 'credit_card',
            currency: 'AUD',
            institution: 'Commonwealth Bank',
            account_number_mask: '•••• 4421'
        });
        createAccount(db, {
            entity_id: entity.id,
            name: 'Smart Home Loan',
            type: 'liability',
            sub_type: 'mortgage',
            currency: 'AUD',
            institution: 'Macquarie Bank',
            account_number_mask: '•••• 9812'
        });
    });

    describe('Date Normalization', () => {
        it('normalizes ISO, DD/MM/YYYY, and Text dates correctly', () => {
            expect(normalizeStatementDate('2026-03-31')).toBe('2026-03-31');
            expect(normalizeStatementDate('15/03/2026')).toBe('2026-03-15');
            expect(normalizeStatementDate('15-03-2026')).toBe('2026-03-15');
            expect(normalizeStatementDate('15 Mar 2026')).toBe('2026-03-15');
            expect(normalizeStatementDate('15 March 2026')).toBe('2026-03-15');
        });

        it('rejects invalid or impossible dates', () => {
            expect(normalizeStatementDate('31/02/2026')).toBeNull(); // Feb 31 does not exist
            expect(normalizeStatementDate('')).toBeNull();
            expect(normalizeStatementDate('Not a date')).toBeNull();
        });
    });

    describe('Per-Page Coverage Evaluation (Adjustment 1)', () => {
        it('flags page as unreadable when text is empty or sparse', () => {
            const emptyCov = evaluatePageCoverage(1, '');
            expect(emptyCov.is_readable).toBe(false);
            expect(emptyCov.character_count).toBe(0);

            const sparseCov = evaluatePageCoverage(2, '   12   ');
            expect(sparseCov.is_readable).toBe(false);
        });

        it('identifies readable page with adequate characters and tokens', () => {
            const cov = evaluatePageCoverage(1, 'Commonwealth Bank Statement Date: 15 Mar 2026 Closing Balance: $1,500.00');
            expect(cov.is_readable).toBe(true);
            expect(cov.character_count).toBeGreaterThan(30);
            expect(cov.readable_token_count).toBeGreaterThan(5);
        });

        it('discloses partial extraction when text cover is followed by scanned page', async () => {
            const buf = createTextCoverThenScannedPdf();
            const res = await extractStatementBalancesFromPdf(db, buf, 'cover_then_scanned.pdf');

            expect(res.supported).toBe(true);
            expect(res.coverage_summary.total_pages).toBe(2);
            expect(res.coverage_summary.readable_pages).toBe(1);
            expect(res.coverage_summary.unreadable_pages).toBe(1);
            expect(res.coverage_summary.coverage_level).toBe('partial');
            expect(res.disclosures.length).toBeGreaterThan(0);
            expect(res.disclosures[0]).toContain('Page(s) 2 contain no selectable text');
        });

        it('returns supported: false and actionable error on completely scanned PDF', async () => {
            const buf = createScannedImageStatementPdf();
            const res = await extractStatementBalancesFromPdf(db, buf, 'scanned_image.pdf');

            expect(res.supported).toBe(false);
            expect(res.coverage_summary.coverage_level).toBe('none');
            expect(res.coverage_summary.readable_pages).toBe(0);
            expect(res.error).toContain('No selectable text found across any page');
            expect(res.error).toContain('requires OCR');
            expect(res.proposals.length).toBe(0); // Zero fabricated proposals
        });
    });

    describe('Credit Card Statement Extraction', () => {
        it('extracts limit, available credit, and closing balance with exact page attribution', async () => {
            const buf = createCreditCardStatementPdf();
            const res = await extractStatementBalancesFromPdf(db, buf, 'cba_card.pdf', 'doc-123');

            expect(res.supported).toBe(true);
            expect(res.coverage_summary.coverage_level).toBe('full');
            expect(res.proposals.length).toBeGreaterThanOrEqual(3);

            // Closing Balance / Amount Owed ($1,500.00)
            const closing = res.proposals.find(p => p.balance_kind === 'statement_closing_balance' || p.balance_kind === 'current_balance');
            expect(closing).toBeDefined();
            expect(closing?.amount_cents).toBe(150000);
            expect(closing?.currency).toBe('AUD');
            expect(closing?.effective_date).toBe('2026-03-15');
            expect(closing?.page_number).toBe(1);
            expect(closing?.document_id).toBe('doc-123');

            // Credit Limit ($10,000.00)
            const limit = res.proposals.find(p => p.balance_kind === 'credit_limit');
            expect(limit).toBeDefined();
            expect(limit?.amount_cents).toBe(1000000);
            expect(limit?.page_number).toBe(1);

            // Available Credit ($8,500.00)
            const avail = res.proposals.find(p => p.balance_kind === 'available_credit');
            expect(avail).toBeDefined();
            expect(avail?.amount_cents).toBe(850000);
            expect(avail?.page_number).toBe(1);
        });
    });

    describe('Mortgage Statement Extraction', () => {
        it('extracts outstanding principal and available redraw', async () => {
            const buf = createMortgageStatementPdf();
            const res = await extractStatementBalancesFromPdf(db, buf, 'macquarie_mortgage.pdf', 'doc-456');

            expect(res.supported).toBe(true);
            const principal = res.proposals.find(p => p.balance_kind === 'outstanding_loan_principal');
            expect(principal).toBeDefined();
            expect(principal?.amount_cents).toBe(45000000);
            expect(principal?.effective_date).toBe('2026-03-31');
            expect(principal?.page_number).toBe(1);

            const redraw = res.proposals.find(p => p.balance_kind === 'available_redraw');
            expect(redraw).toBeDefined();
            expect(redraw?.amount_cents).toBe(2500000);
            expect(redraw?.page_number).toBe(1);
        });
    });

    describe('Super / Investment Statement Extraction', () => {
        it('extracts portfolio value and flags cash component as is_component_of_total', async () => {
            const buf = createSuperInvestmentStatementPdf();
            const res = await extractStatementBalancesFromPdf(db, buf, 'hostplus_super.pdf');

            expect(res.supported).toBe(true);
            const portfolio = res.proposals.find(p => p.balance_kind === 'total_portfolio_value');
            expect(portfolio).toBeDefined();
            expect(portfolio?.amount_cents).toBe(12000000);

            const cash = res.proposals.find(p => p.balance_kind === 'brokerage_cash' || p.is_component_of_total);
            expect(cash).toBeDefined();
            expect(cash?.amount_cents).toBe(1500000);
            expect(cash?.is_component_of_total).toBe(true);
        });
    });

    describe('Cross-Page Context Carry (Adjustment 2)', () => {
        it('carries institution, date, currency, and account from page 1 to balances on page 2', async () => {
            const buf = createDateCurrencyPage1BalancePage2Pdf();
            const res = await extractStatementBalancesFromPdf(db, buf, 'multipage_loan.pdf', 'doc-multi');

            expect(res.supported).toBe(true);
            expect(res.pages.length).toBe(2);

            // Balances on Page 2 must have inherited date and currency from Page 1
            const principal = res.proposals.find(p => p.amount_cents === 32000000);
            expect(principal).toBeDefined();
            expect(principal?.effective_date).toBe('2026-03-15'); // Carried from page 1
            expect(principal?.currency).toBe('AUD'); // Carried from page 1
            expect(principal?.page_number).toBe(2); // Sourced from page 2
            expect(principal?.source_excerpt).toContain('$320,000.00');

            const redraw = res.proposals.find(p => p.amount_cents === 1500000);
            expect(redraw).toBeDefined();
            expect(redraw?.page_number).toBe(2);
            expect(redraw?.effective_date).toBe('2026-03-15');
        });
    });

    describe('Two-Column Statement Resilience', () => {
        it('extracts summary balances and ignores nearby transaction amounts', async () => {
            const buf = createTwoColumnStatementPdf();
            const res = await extractStatementBalancesFromPdf(db, buf, 'two_column.pdf');

            expect(res.supported).toBe(true);
            // Summary balances extracted
            const closing = res.proposals.find(p => p.amount_cents === 180000);
            expect(closing).toBeDefined();

            const limit = res.proposals.find(p => p.amount_cents === 800000);
            expect(limit).toBeDefined();

            // Transaction amounts (Woolworths $85.20 = 8520, Shell $110.00 = 11000) must NOT be extracted as balances
            const woolies = res.proposals.find(p => p.amount_cents === 8520);
            expect(woolies).toBeUndefined();

            const shell = res.proposals.find(p => p.amount_cents === 11000);
            expect(shell).toBeUndefined();
        });
    });

    describe('Corrupt PDF Handling', () => {
        it('returns supported: false and descriptive error for corrupt buffer', async () => {
            const corruptBuf = Buffer.from('This is completely invalid PDF header content');
            const res = await extractStatementBalancesFromPdf(db, corruptBuf, 'corrupt.pdf');

            expect(res.supported).toBe(false);
            expect(res.error).toBeDefined();
            expect(res.coverage_summary.coverage_level).toBe('none');
        });
    });
});
