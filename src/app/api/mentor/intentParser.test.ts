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
});
