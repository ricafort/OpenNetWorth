import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMentorDebtAdvice, getMentorInvestmentAdvice } from './mentorAdvice';
import * as geminiApi from '@/lib/api/gemini';

// Mock the dependencies
vi.mock('@/lib/api/gemini', () => ({
    getGeminiModel: vi.fn(),
    generateContentWithRetry: vi.fn()
}));

describe('MentorAdvice Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockResponseText = "Here is some wise financial advice.";
    const mockModel = {};

    const setupSuccessMock = () => {
        (geminiApi.getGeminiModel as any).mockReturnValue(mockModel);
        (geminiApi.generateContentWithRetry as any).mockResolvedValue({
            response: Promise.resolve({
                text: () => mockResponseText
            })
        });
    };

    const setupErrorMock = () => {
        (geminiApi.getGeminiModel as any).mockReturnValue(mockModel);
        (geminiApi.generateContentWithRetry as any).mockRejectedValue(new Error("API Error"));
    };

    it('should return AI advice for debt scenarios', async () => {
        setupSuccessMock();

        const advice = await getMentorDebtAdvice('Naval', 'Philosopher', {
            totalDebt: 5000,
            highestInterestRate: 20,
            monthlyIncome: 3000,
            monthlyExpenses: 2000,
            payoffStrategy: 'avalanche'
        });

        expect(advice).toBe(mockResponseText);
        expect(geminiApi.generateContentWithRetry).toHaveBeenCalled();
    });

    it('should return fallback advice on API failure (Debt)', async () => {
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

    it('should return AI advice for investment scenarios', async () => {
        setupSuccessMock();

        const advice = await getMentorInvestmentAdvice('Buffett', 'Sage', {
            totalValue: 100000,
            topHoldings: [{ ticker: 'AAPL', percentage: 10 }],
            totalGainPercent: 5,
            sectorAllocation: [{ sector: 'Tech', percentage: 30 }]
        });

        expect(advice).toBe(mockResponseText);
    });

    it('should return fallback advice on API failure (Investment)', async () => {
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
