import { describe, it, expect } from 'vitest';
import { parseSpendingIntent } from './intentParser';

/**
 * Mentor Intent Parser Acceptance Tests
 * 
 * Why this file exists:
 * Verifies intent parsing for entity scopes, timezone-safe calendar date queries,
 * rejection of impossible calendar dates (Handover Case 13),
 * and preservation of full explicit date ranges (Handover Case 14).
 * 
 * Reference Date: 2026-09-22 (Australia/Sydney fixed acceptance reference)
 */
describe('Mentor intentParser', () => {
    const referenceDate = '2026-09-22';
    const defaultEntities = [{ id: 'p1', name: 'John Doe', type: 'person' }];

    it('returns isSpendingQuery: false for non-spending messages', () => {
        const result = parseSpendingIntent('Hello there!', []);
        expect(result.isSpendingQuery).toBe(false);
    });

    it('identifies exact date queries (YYYY-MM-DD)', () => {
        const result = parseSpendingIntent('How much did I spend on 2025-07-15?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2025-07-15');
        expect(result.endDate).toBe('2025-07-15');
        expect(result.periodLabel).toBe('2025-07-15');
    });

    it('identifies explicit month/year queries', () => {
        const result = parseSpendingIntent('What were my expenses in July 2026?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-07-01');
        expect(result.endDate).toBe('2026-07-31');
        expect(result.periodLabel).toBe('July 2026');
    });

    it('requests clarification when multiple entities are found matching business', () => {
        const entities = [
            { id: 'b1', name: 'Biz One', type: 'business' },
            { id: 'b2', name: 'Biz Two', type: 'business' }
        ];
        const result = parseSpendingIntent('What did the business spend?', entities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toBe('You have multiple business entities. Which business do you mean?');
    });

    it('selects exactly one personal entity when no explicit keyword is given', () => {
        const entities = [
            { id: 'p1', name: 'John Doe', type: 'person' }
        ];
        const result = parseSpendingIntent('How much did I spend in July 2026?', entities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.entityId).toBe('p1');
        expect(result.needsClarification).toBeUndefined();
    });

    it('blocks unsupported historical queries', () => {
        const result = parseSpendingIntent('How much did I spend in January 1999?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toBe('I cannot retrieve data for the year 1999.');
    });

    // Case 11: Ask "last month"
    it('Case 11: resolves "last month" to 2026-08-01 through 2026-08-31 for Sept 2026 reference date', () => {
        const result = parseSpendingIntent('How much did I spend last month?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-08-01');
        expect(result.endDate).toBe('2026-08-31');
        expect(result.periodLabel).toBe('August 2026');
        expect(result.needsClarification).toBeUndefined();
    });

    // Case 12: Ask "this month"
    it('Case 12: resolves "this month" to 2026-09-01 through 2026-09-30 for Sept 2026 reference date', () => {
        const result = parseSpendingIntent('How much did I spend this month?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-09-01');
        expect(result.endDate).toBe('2026-09-30');
        expect(result.periodLabel).toContain('September 2026');
        expect(result.needsClarification).toBeUndefined();
    });

    // Case 13: Supply 2026-02-31
    it('Case 13: rejects impossible calendar date 2026-02-31 with explicit clarification', () => {
        const result = parseSpendingIntent('What did I spend on 2026-02-31?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toBe("Invalid calendar date: '2026-02-31' does not exist.");
        expect(result.startDate).toBeUndefined();
    });

    // Case 14: Supply an explicit date range
    it('Case 14: preserves explicit date range 2026-08-01 to 2026-08-15 without collapsing to a single day', () => {
        const result = parseSpendingIntent('How much did I spend from 2026-08-01 to 2026-08-15?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-08-01');
        expect(result.endDate).toBe('2026-08-15');
        expect(result.periodLabel).toBe('2026-08-01 to 2026-08-15');
        expect(result.needsClarification).toBeUndefined();
    });

    it('Case 14b: rejects date range containing an invalid calendar date', () => {
        const result = parseSpendingIntent('How much did I spend between 2026-02-31 and 2026-03-05?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toBe("Invalid calendar date: '2026-02-31' does not exist.");
    });

    // Why this test exists:
    // Resolves Assessor Finding D: "until" was not recognized as a range separator.
    it('Case 14c: parses ISO range with "until" keyword', () => {
        const result = parseSpendingIntent('How much did I spend from 2026-08-01 until 2026-08-15?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-08-01');
        expect(result.endDate).toBe('2026-08-15');
        expect(result.needsClarification).toBeUndefined();
    });

    // Why this test exists:
    // Resolves Assessor Finding D: Natural month ranges ("between July 1 and July 31") previously collapsed
    // into single-day queries ("July 1st").
    it('Case 14d: parses natural month range "between July 1 and July 31" without collapsing to single day', () => {
        const result = parseSpendingIntent('What did I spend between July 1 and July 31?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-07-01');
        expect(result.endDate).toBe('2026-07-31');
        expect(result.needsClarification).toBeUndefined();
    });

    // Closing Batch: Australian Day-First natural and numeric dates
    it('parses Day-First Australian natural date "15 March 2026"', () => {
        const result = parseSpendingIntent('How much was spent on 15 March 2026?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-03-15');
        expect(result.endDate).toBe('2026-03-15');
        expect(result.periodLabel).toBe('March 15, 2026');
    });

    it('parses Day-First Australian natural date with ordinal "15th of March"', () => {
        const result = parseSpendingIntent('How much was spent on the 15th of March?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-03-15');
        expect(result.endDate).toBe('2026-03-15');
        expect(result.periodLabel).toBe('March 15, 2026');
    });

    it('parses Australian slash date DD/MM/YYYY (15/03/2026)', () => {
        const result = parseSpendingIntent('What did I spend on 15/03/2026?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-03-15');
        expect(result.endDate).toBe('2026-03-15');
    });

    // Closing Batch: Relative dates "yesterday" and "today"
    it('resolves "yesterday" relative to reference date', () => {
        const result = parseSpendingIntent('How much did I spend yesterday?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-09-21');
        expect(result.endDate).toBe('2026-09-21');
        expect(result.periodLabel).toContain('Yesterday (2026-09-21)');
    });

    it('resolves "today" relative to reference date', () => {
        const result = parseSpendingIntent('How much did I spend today?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2026-09-22');
        expect(result.endDate).toBe('2026-09-22');
        expect(result.periodLabel).toContain('Today (2026-09-22)');
    });

    // Closing Batch: Full year queries
    it('resolves full year query "in 2025" to full calendar year without defaulting to current month', () => {
        const result = parseSpendingIntent('How much did I spend in 2025?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2025-01-01');
        expect(result.endDate).toBe('2025-12-31');
        expect(result.periodLabel).toBe('2025');
    });

    // Closing Batch: Explicit unsupported period asks for clarification
    it('asks for clarification when an unsupported period (e.g. "last week") is requested', () => {
        const result = parseSpendingIntent('How much did I spend last week?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toContain("Queries for 'last week' are not directly supported yet");
    });

    it('asks for clarification for FY 2025 and Q1 2025 rather than collapsing to calendar year', () => {
        const fyResult = parseSpendingIntent('How much did I spend in FY 2025?', defaultEntities, referenceDate);
        expect(fyResult.isSpendingQuery).toBe(true);
        expect(fyResult.needsClarification).toContain("Queries for 'fy' are not directly supported yet");
        expect(fyResult.startDate).toBeUndefined();

        const q1Result = parseSpendingIntent('What was spent in Q1 2025?', defaultEntities, referenceDate);
        expect(q1Result.isSpendingQuery).toBe(true);
        expect(q1Result.needsClarification).toContain("Queries for 'q1' are not directly supported yet");
        expect(q1Result.startDate).toBeUndefined();
    });

    it('resolves plain calendar year "in 2025" without unsupported keywords', () => {
        const result = parseSpendingIntent('How much did I spend in 2025?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toBeUndefined();
        expect(result.startDate).toBe('2025-01-01');
        expect(result.endDate).toBe('2025-12-31');
    });

    // Closing Batch: All accounts scope
    it('sets entityId to "all" when user explicitly queries across all accounts', () => {
        const result = parseSpendingIntent('How much did I spend across all accounts in July 2026?', defaultEntities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.entityId).toBe('all');
        expect(result.startDate).toBe('2026-07-01');
        expect(result.endDate).toBe('2026-07-31');
    });

    // Closing Batch: Retains business scope when "in total" is present
    it('retains business scope when user asks "my business ... in total"', () => {
        const entities = [
            { id: 'p1', name: 'John Doe', type: 'person' },
            { id: 'ent-biz', name: 'Acme Corp', type: 'business' }
        ];
        const result = parseSpendingIntent('How much did my business spend in total in July 2026?', entities, referenceDate);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.entityId).toBe('ent-biz');
        expect(result.startDate).toBe('2026-07-01');
        expect(result.endDate).toBe('2026-07-31');
    });
});
