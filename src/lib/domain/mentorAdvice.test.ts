import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMentorDebtAdvice, getMentorInvestmentAdvice } from './mentorAdvice';
import * as localLlmApi from '@/lib/api/localLlm';

// Mock the Local LLM dependencies
vi.mock('@/lib/api/localLlm', () => ({
    queryLocalLlm: vi.fn(),
    checkLocalLlmHealth: vi.fn(),
    ruleBasedParseIntent: vi.fn()
}));

describe('MentorAdvice Service (Local LLM)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockResponseText = "Here is some wise financial advice.";

    const setupSuccessMock = () => {
        (localLlmApi.queryLocalLlm as any).mockResolvedValue(mockResponseText);
    };

    const setupErrorMock = () => {
        (localLlmApi.queryLocalLlm as any).mockRejectedValue(new Error("Local LLM Offline"));
    };

    it('should return AI advice for debt scenarios via local LLM', async () => {
        setupSuccessMock();

        const advice = await getMentorDebtAdvice('Naval', 'Philosopher', {
            totalDebt: 5000,
            highestInterestRate: 20,
            monthlyIncome: 3000,
            monthlyExpenses: 2000,
            payoffStrategy: 'avalanche'
        });

        expect(advice).toBe(mockResponseText);
        expect(localLlmApi.queryLocalLlm).toHaveBeenCalled();
    });

    it('should return fallback advice on Local LLM failure (Debt)', async () => {
        setupErrorMock();

        const advice = await getMentorDebtAdvice('Naval', 'Philosopher', {
            totalDebt: 5000,
            highestInterestRate: 20,
            monthlyIncome: 3000,
            monthlyExpenses: 2000,
            payoffStrategy: 'avalanche'
        });

        expect(advice).toContain("mathematical certainty"); // Fallback text
    });

    it('should return AI advice for investment scenarios via local LLM', async () => {
        setupSuccessMock();

        const advice = await getMentorInvestmentAdvice('Buffett', 'Sage', {
            totalValue: 100000,
            topHoldings: [{ ticker: 'AAPL', percentage: 10 }],
            totalGainPercent: 5,
            sectorAllocation: [{ sector: 'Tech', percentage: 30 }]
        });

        expect(advice).toBe(mockResponseText);
        expect(localLlmApi.queryLocalLlm).toHaveBeenCalled();
    });

    it('should return fallback advice on Local LLM failure (Investment)', async () => {
        setupErrorMock();

        const advice = await getMentorInvestmentAdvice('Buffett', 'Sage', {
            totalValue: 100000,
            topHoldings: [],
            totalGainPercent: 0,
            sectorAllocation: []
        });

        expect(advice).toContain("Diversification is protection"); // Fallback text
    });
});
