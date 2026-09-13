/**
 * Why this file exists:
 * Generates automated tactical debt and investment portfolio advice from mentors
 * in OpenNetWorth using Local LLMs (or offline rule-based fallbacks).
 *
 * Tricky logic:
 * - When Local LLM is offline or busy, provides mathematically grounded advice
 *   matching the selected persona so the UI remains fully functional offline.
 *
 * TODO items:
 * - Cache generated advice per net worth snapshot to avoid redundant local inferences.
 */

import { queryLocalLlm, LocalLlmMessage } from '@/lib/api/localLlm';

export interface DebtAdviceContext {
    totalDebt: number;
    highestInterestRate: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    payoffStrategy: string;
}

export interface InvestmentAdviceContext {
    totalValue: number;
    topHoldings: { ticker: string; percentage: number }[];
    totalGainPercent: number;
    sectorAllocation: { sector: string; percentage: number }[];
    concentratedStock?: string;
}

export const getMentorDebtAdvice = async (
    mentorName: string,
    mentorArchetype: string,
    context: DebtAdviceContext
): Promise<string> => {
    const prompt = `Analyze this user's debt situation:
- Total Debt: $${context.totalDebt.toLocaleString()}
- Highest Interest Rate: ${context.highestInterestRate}%
- Monthly Disposable Income: $${(context.monthlyIncome - context.monthlyExpenses).toLocaleString()}
- Chosen Strategy: ${context.payoffStrategy}

Provide specific, tactical advice in your unique voice as ${mentorName} (${mentorArchetype}).
Focus on their chosen strategy. Keep it under 3 sentences. Be punchy.`;

    const messages: LocalLlmMessage[] = [
        { role: 'system', content: `You are acting as ${mentorName}, known for being ${mentorArchetype}.` },
        { role: 'user', content: prompt }
    ];

    try {
        const text = await queryLocalLlm(messages, { maxTokens: 1000, temperature: 0.7 });
        return text.trim();
    } catch (error) {
        console.error("Error generating debt advice with local LLM:", error);
        return "Focus on paying off your highest interest debt first. That is the mathematical certainty of wealth.";
    }
};

export const getMentorInvestmentAdvice = async (
    mentorName: string,
    mentorArchetype: string,
    context: InvestmentAdviceContext
): Promise<string> => {
    const prompt = `Analyze this user's investment portfolio:
- Total Value: $${context.totalValue.toLocaleString()}
- Total Return: ${context.totalGainPercent.toFixed(2)}%
- Top Holdings: ${context.topHoldings.map(h => `${h.ticker} (${h.percentage.toFixed(1)}%)`).join(', ')}
- Sectors: ${context.sectorAllocation.map(s => `${s.sector} (${s.percentage.toFixed(1)}%)`).join(', ')}
${context.concentratedStock ? `- WARNING: High concentration in ${context.concentratedStock}` : ''}

Provide specific advice on their allocation and risk in your unique voice as ${mentorName} (${mentorArchetype}).
Keep it under 3 sentences. Be punchy and authentic to your persona.`;

    const messages: LocalLlmMessage[] = [
        { role: 'system', content: `You are acting as ${mentorName}, known for being ${mentorArchetype}.` },
        { role: 'user', content: prompt }
    ];

    try {
        const text = await queryLocalLlm(messages, { maxTokens: 1000, temperature: 0.7 });
        return text.trim();
    } catch (error) {
        console.error("Error generating investment advice with local LLM:", error);
        return "Diversification is protection against ignorance. Ensure you are not too exposed to a single failure point.";
    }
};
