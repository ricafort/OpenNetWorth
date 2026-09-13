import { describe, it, expect } from 'vitest';
import { ruleBasedParseIntent } from './localLlm';

describe('Local LLM Rule-Based Intent Parser', () => {
    it('should parse asset additions correctly', () => {
        const res = ruleBasedParseIntent('Add a savings account with $5,000');
        expect(res.action).toBe('add_asset');
        expect(res.amount).toBe(5000);
        expect(res.type).toBe('cash');
        expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('should parse real estate asset with k abbreviation', () => {
        const res = ruleBasedParseIntent('Track my home value at $450k');
        expect(res.action).toBe('add_asset');
        expect(res.amount).toBe(450000);
        expect(res.type).toBe('real_estate');
    });

    it('should parse liabilities and credit card debt', () => {
        const res = ruleBasedParseIntent('Add a credit card balance of $1,200');
        expect(res.action).toBe('add_liability');
        expect(res.amount).toBe(1200);
        expect(res.type).toBe('credit_card');
    });

    it('should parse mortgage liabilities', () => {
        const res = ruleBasedParseIntent('Add home mortgage debt of $350,000');
        expect(res.action).toBe('add_liability');
        expect(res.amount).toBe(350000);
        expect(res.type).toBe('mortgage');
    });

    it('should parse financial goals', () => {
        const res = ruleBasedParseIntent('Set a goal to save $50,000 for emergency fund');
        expect(res.action).toBe('add_goal');
        expect(res.amount).toBe(50000);
    });

    it('should detect currencies correctly', () => {
        const audRes = ruleBasedParseIntent('Add savings of A$10,000');
        expect(audRes.currency).toBe('AUD');

        const eurRes = ruleBasedParseIntent('Add investment of €25,000');
        expect(eurRes.currency).toBe('EUR');
    });

    it('should ignore regular questions and return null action', () => {
        const res = ruleBasedParseIntent('What is compound interest?');
        expect(res.action).toBeNull();
        expect(res.confidence).toBe(0);
    });
});
