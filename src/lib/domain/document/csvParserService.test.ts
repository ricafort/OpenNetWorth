/**
 * Unit Tests for RFC 4180 Bank CSV Parser & Row Validation Service (Slice 1E)
 * 
 * Why this file exists:
 * Verifies that untrusted bank CSV files are parsed deterministically, date formats
 * are correctly converted, money strings are parsed into exact minor-unit cents,
 * and malformed/missing fields are strictly flagged with validation findings without guessing.
 */

import { describe, it, expect } from 'vitest';
import {
    computeHeaderSignature,
    parseRawCsv,
    parseCsvDate,
    parseCsvAmount,
    parseCsvWithMapping
} from './csvParserService';
import { CsvMappingProfile } from './types';

describe('CSV Parser Service (Slice 1E)', () => {
    describe('RFC 4180 Parsing & Header Signatures', () => {
        it('parses standard comma-separated lines and trims whitespace', () => {
            const csv = `Date, Description, Amount\n2026-08-01, Salary Deposit, 3000.00\n2026-08-02, Groceries, -85.50`;
            const { headers, rows, rawLines } = parseRawCsv(csv);

            expect(headers).toEqual(['Date', 'Description', 'Amount']);
            expect(rows).toHaveLength(2);
            expect(rows[0]).toEqual(['2026-08-01', 'Salary Deposit', '3000.00']);
            expect(rows[1]).toEqual(['2026-08-02', 'Groceries', '-85.50']);
            expect(rawLines[0]).toBe('2026-08-01, Salary Deposit, 3000.00');
        });

        it('handles quotes with embedded commas and escaped double quotes', () => {
            const csv = `Date,Description,Amount\n2026-08-01,"Coffee Shop, Downtown",-4.50\n2026-08-02,"Book: ""The Great Gatsby""",-15.00`;
            const { rows } = parseRawCsv(csv);

            expect(rows).toHaveLength(2);
            expect(rows[0][1]).toBe('Coffee Shop, Downtown');
            expect(rows[1][1]).toBe('Book: "The Great Gatsby"');
        });

        it('handles Windows CRLF and trailing empty lines cleanly', () => {
            const csv = "Date,Description,Amount\r\n2026-08-01,Salary,3000.00\r\n2026-08-02,Gas,-40.00\r\n\r\n";
            const { rows } = parseRawCsv(csv);

            expect(rows).toHaveLength(2);
        });

        it('computes canonical header signature', () => {
            const sig1 = computeHeaderSignature(['Date', 'Description', 'Amount']);
            const sig2 = computeHeaderSignature(['Amount', 'date', 'Description']);
            expect(sig1).toBe('amount|date|description');
            expect(sig1).toBe(sig2);
        });
    });

    describe('Calendar Date Parsing & Validation', () => {
        it('parses ISO YYYY-MM-DD dates', () => {
            expect(parseCsvDate('2026-08-15', 'YYYY-MM-DD')).toEqual({ date: '2026-08-15' });
            expect(parseCsvDate('2026/08/15', 'YYYY-MM-DD')).toEqual({ date: '2026-08-15' });
        });

        it('parses Australian/UK DD/MM/YYYY dates', () => {
            expect(parseCsvDate('15/08/2026', 'DD/MM/YYYY')).toEqual({ date: '2026-08-15' });
            expect(parseCsvDate('5/8/2026', 'DD/MM/YYYY')).toEqual({ date: '2026-08-05' });
            expect(parseCsvDate('15-08-2026', 'DD/MM/YYYY')).toEqual({ date: '2026-08-15' });
        });

        it('parses US MM/DD/YYYY dates', () => {
            expect(parseCsvDate('08/15/2026', 'MM/DD/YYYY')).toEqual({ date: '2026-08-15' });
            expect(parseCsvDate('8/5/2026', 'MM/DD/YYYY')).toEqual({ date: '2026-08-05' });
        });

        it('rejects invalid or impossible calendar dates', () => {
            // Leap year check: 2026 is not a leap year -> Feb 29 is invalid
            expect(parseCsvDate('2026-02-29', 'YYYY-MM-DD').date).toBeNull();
            // Impossible day 31 in April (30 days)
            expect(parseCsvDate('2026-04-31', 'YYYY-MM-DD').date).toBeNull();
            // Non-numeric
            expect(parseCsvDate('invalid-date', 'YYYY-MM-DD').date).toBeNull();
            expect(parseCsvDate('', 'YYYY-MM-DD').date).toBeNull();
        });
    });

    describe('Monetary Amount Parsing & Exact Cents', () => {
        it('parses standard positive and negative decimals into cents', () => {
            expect(parseCsvAmount('3500.00')).toEqual({ amount_cents: 350000 });
            expect(parseCsvAmount('-124.50')).toEqual({ amount_cents: -12450 });
            expect(parseCsvAmount('0.00')).toEqual({ amount_cents: 0 });
            expect(parseCsvAmount('0.05')).toEqual({ amount_cents: 5 });
            expect(parseCsvAmount('-0.99')).toEqual({ amount_cents: -99 });
        });

        it('parses parentheses accounting notation as negative amounts', () => {
            expect(parseCsvAmount('(124.50)')).toEqual({ amount_cents: -12450 });
            expect(parseCsvAmount('($50.00)')).toEqual({ amount_cents: -5000 });
        });

        it('strips currency signs and thousand commas', () => {
            expect(parseCsvAmount('$1,250.50')).toEqual({ amount_cents: 125050 });
            expect(parseCsvAmount('-$45.20')).toEqual({ amount_cents: -4520 });
            expect(parseCsvAmount('£10,000.00')).toEqual({ amount_cents: 1000000 });
        });

        it('parses DR and CR suffixes', () => {
            expect(parseCsvAmount('100.00 DR')).toEqual({ amount_cents: -10000 });
            expect(parseCsvAmount('100.00 CR')).toEqual({ amount_cents: 10000 });
        });

        it('rejects non-numeric and empty values without defaulting to zero', () => {
            expect(parseCsvAmount('N/A').amount_cents).toBeNull();
            expect(parseCsvAmount('').amount_cents).toBeNull();
            expect(parseCsvAmount('abc').amount_cents).toBeNull();
        });
    });

    describe('Full CSV Parsing with Mapping Profiles', () => {
        const standardProfile: CsvMappingProfile = {
            id: 'map-std',
            name: 'Standard Single Amount',
            header_signature: 'amount|date|description',
            date_column: 'Date',
            date_format: 'YYYY-MM-DD',
            description_column: 'Description',
            amount_mode: 'single_amount',
            amount_column: 'Amount',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        it('parses single-amount CSV and distinguishes income from expense', () => {
            const csv = `Date,Description,Amount
2026-08-01,"Employer Salary",3500.00
2026-08-02,"Supermarket",-124.50
2026-08-03,"Coffee Shop",-4.50`;

            const result = parseCsvWithMapping(csv, standardProfile);

            expect(result.total_rows).toBe(3);
            expect(result.valid_rows).toBe(3);
            expect(result.error_rows).toBe(0);

            // Row 1: Income
            expect(result.rows[0].date).toBe('2026-08-01');
            expect(result.rows[0].amount_cents).toBe(350000);
            expect(result.rows[0].event_type).toBe('income');
            expect(result.rows[0].description).toBe('Employer Salary');

            // Row 2: Expense
            expect(result.rows[1].date).toBe('2026-08-02');
            expect(result.rows[1].amount_cents).toBe(-12450);
            expect(result.rows[1].event_type).toBe('expense');
            expect(result.rows[1].description).toBe('Supermarket');
        });

        it('flags rows with missing or invalid amounts and dates as unresolved errors', () => {
            const csv = `Date,Description,Amount
2026-08-01,"Valid Row",100.00
2026-02-31,"Invalid Calendar Date",-50.00
2026-08-03,"Missing Amount",
2026-08-04,"Not A Number",invalid_amt`;

            const result = parseCsvWithMapping(csv, standardProfile);

            expect(result.total_rows).toBe(4);
            expect(result.valid_rows).toBe(1);
            expect(result.error_rows).toBe(3);

            // Row 2: Invalid Date error
            expect(result.rows[1].validation_findings).toEqual(
                expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'INVALID_DATE' })])
            );

            // Row 3: Missing Amount error
            expect(result.rows[2].validation_findings).toEqual(
                expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'INVALID_AMOUNT' })])
            );

            // Row 4: Non-numeric Amount error
            expect(result.rows[3].validation_findings).toEqual(
                expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'INVALID_AMOUNT' })])
            );
        });

        it('parses Debit/Credit split mode CSVs', () => {
            const debitCreditProfile: CsvMappingProfile = {
                id: 'map-dc',
                name: 'Debit Credit Mode',
                header_signature: 'credit|date|debit|description',
                date_column: 'Date',
                date_format: 'DD/MM/YYYY',
                description_column: 'Description',
                amount_mode: 'debit_credit',
                debit_column: 'Debit',
                credit_column: 'Credit',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const csv = `Date,Description,Debit,Credit
01/08/2026,"Salary Payout",,3500.00
02/08/2026,"Grocery Store",124.50,
03/08/2026,"Ambiguous Row",50.00,50.00`;

            const result = parseCsvWithMapping(csv, debitCreditProfile);

            expect(result.total_rows).toBe(3);
            expect(result.valid_rows).toBe(2);
            expect(result.error_rows).toBe(1);

            // Row 1: Credit (Income)
            expect(result.rows[0].date).toBe('2026-08-01');
            expect(result.rows[0].amount_cents).toBe(350000);
            expect(result.rows[0].event_type).toBe('income');

            // Row 2: Debit (Expense)
            expect(result.rows[1].date).toBe('2026-08-02');
            expect(result.rows[1].amount_cents).toBe(-12450);
            expect(result.rows[1].event_type).toBe('expense');

            // Row 3: Ambiguous Row (both non-zero)
            expect(result.rows[2].validation_findings).toEqual(
                expect.arrayContaining([expect.objectContaining({ severity: 'error', code: 'AMBIGUOUS_AMOUNT' })])
            );
        });
    });
});
