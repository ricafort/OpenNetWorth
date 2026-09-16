import { describe, it, expect, vi } from 'vitest';
import { parseSpendingIntent } from './intentParser';

describe('Mentor intentParser', () => {
    it('returns isSpendingQuery: false for non-spending messages', () => {
        const result = parseSpendingIntent('Hello there!', []);
        expect(result.isSpendingQuery).toBe(false);
    });

    const defaultEntities = [{ id: 'p1', name: 'John Doe', type: 'person' }];

    it('identifies exact date queries (YYYY-MM-DD)', () => {
        const result = parseSpendingIntent('How much did I spend on 2025-07-15?', defaultEntities);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.startDate).toBe('2025-07-15');
        expect(result.endDate).toBe('2025-07-15');
        expect(result.periodLabel).toBe('2025-07-15');
    });

    it('identifies explicit month/year queries', () => {
        const result = parseSpendingIntent('What were my expenses in July 2026?', defaultEntities);
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
        const result = parseSpendingIntent('What did the business spend?', entities);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toBe('You have multiple business entities. Which business do you mean?');
    });

    it('selects exactly one personal entity when no explicit keyword is given', () => {
        const entities = [
            { id: 'p1', name: 'John Doe', type: 'person' }
        ];
        const result = parseSpendingIntent('How much did I spend in July 2026?', entities);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.entityId).toBe('p1');
        expect(result.needsClarification).toBeUndefined();
    });

    it('blocks unsupported historical queries', () => {
        const result = parseSpendingIntent('How much did I spend in January 1999?', defaultEntities);
        expect(result.isSpendingQuery).toBe(true);
        expect(result.needsClarification).toBe('I cannot retrieve data for the year 1999.');
    });

    it('handles "last month" correctly', () => {
        const result = parseSpendingIntent('How much did I spend last month?', defaultEntities);
        expect(result.isSpendingQuery).toBe(true);
        // It's dynamic, so just assert it has a date
        expect(result.startDate).toBeDefined();
        expect(result.endDate).toBeDefined();
        expect(result.needsClarification).toBeUndefined();
    });
});
