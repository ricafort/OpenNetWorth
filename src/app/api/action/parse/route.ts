import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/api/gemini';

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const model = getGeminiModel();

        const systemPrompt = `
      You are a financial data parser. Your job is to extract structured data from natural language inputs for a Net Worth Dashboard.
      
      RETURN JSON ONLY. No markdown formatting.
      
      OUTPUT FORMAT:
      {
        "action": "add_asset" | "add_liability" | "add_goal" | "log_expense" | null,
        "type": "Cash" | "Investment" | "Property" | "Vehicle" | "Valuable" | "Mortgage" | "Credit Card" | "Loan" | "Other" | null,
        "name": string | null,
        "amount": number | null,
        "currency": "USD" | "EUR" | "GBP" | "AUD" | "CAD" | "JPY" | "CNY",
        "confidence": number (0-1)
      }

      RULES:
      - "add_asset": Adding money, accounts, stocks, homes, cars.
      - "add_liability": Adding debt, loans, mortgages.
      - "add_goal": Creating a new financial target/goal (e.g. "save for a house", "pay off debt").
      - "log_expense": Spending money.
      - If the user is just asking a question or chatting, set "action" to null and "confidence" to 0.
      - Default currency is USD if not specified.
    `;

        const prompt = `Parse this user command: "${message}"`;

        const result = await model.generateContent([systemPrompt, prompt]);
        const responseText = result.response.text();

        // Clean markdown if present (sometimes Gemini adds it)
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        return NextResponse.json(JSON.parse(cleanedText));
    } catch (error: any) {
        console.error('Gemini Parse Error Details:', JSON.stringify(error, null, 2));

        // Extract useful error info
        let errorMessage = 'Failed to parse intent';
        let status = 500;

        if (error.message?.includes('429') || error.status === 429) {
            errorMessage = 'Usage Limit Exceeded (429). Try again later.';
            status = 429;
        }

        return NextResponse.json({ error: errorMessage }, { status });
    }
}
