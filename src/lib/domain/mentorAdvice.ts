import { getGeminiModel, generateContentWithRetry } from '@/lib/api/gemini';

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

const getMentorPersona = (mentorId: string) => {
    // Ideally this comes from a database or constant file, but for now we inline common ones
    // or we could fetch from localStorage on the client and pass it in, but this is server/lib side.
    // simpler: Pass the name/archetype in. 
    // Actually, looking at the code structure, it's best if we demand the persona description/name 
    // as an argument to avoid duplication.
    return "";
};

export const getMentorDebtAdvice = async (
    mentorName: string,
    mentorArchetype: string,
    context: DebtAdviceContext
): Promise<string> => {
    const model = getGeminiModel();

    const prompt = `
        You are acting as ${mentorName}, known for being ${mentorArchetype}.
        
        Analyze this user's debt situation:
        - Total Debt: $${context.totalDebt.toLocaleString()}
        - Highest Interest Rate: ${context.highestInterestRate}%
        - Monthly Disposable Income: $${(context.monthlyIncome - context.monthlyExpenses).toLocaleString()}
        - Chosen Strategy: ${context.payoffStrategy}

        Provide specific, tactical advice in your unique voice. 
        Focus on their chosen strategy. If they chose 'snowball' but have high interest debt, maybe gently challenge it (or support it depending on your persona).
        Keep it under 3 sentences. Be punchy.
    `;

    try {
        const result = await generateContentWithRetry(model, prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating debt advice:", error);
        return "Focus on paying off your highest interest debt first. That is the mathematical certainty of wealth.";
    }
};

export const getMentorInvestmentAdvice = async (
    mentorName: string,
    mentorArchetype: string,
    context: InvestmentAdviceContext
): Promise<string> => {
    const model = getGeminiModel();

    const prompt = `
        You are acting as ${mentorName}, known for being ${mentorArchetype}.
        
        Analyze this user's investment portfolio:
        - Total Value: $${context.totalValue.toLocaleString()}
        - Total Return: ${context.totalGainPercent.toFixed(2)}%
        - Top Holdings: ${context.topHoldings.map(h => `${h.ticker} (${h.percentage.toFixed(1)}%)`).join(', ')}
        - Sectors: ${context.sectorAllocation.map(s => `${s.sector} (${s.percentage.toFixed(1)}%)`).join(', ')}
        ${context.concentratedStock ? `- WARNING: High concentration in ${context.concentratedStock}` : ''}

        Provide specific advice on their allocation and risk. 
        If you see high concentration, comment on it.
        Keep it under 3 sentences. Be punchy and authentic to your persona.
    `;

    try {
        const result = await generateContentWithRetry(model, prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Error generating investment advice:", error);
        return "Diversification is protection against ignorance. Ensure you are not too exposed to a single failure point.";
    }
};
