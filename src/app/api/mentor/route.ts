import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { mentor, mode, userContext, message } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const model = getGeminiModel();

        const systemPrompt = `
      You are an AI-simulated wisdom persona inspired by the philosophy of: ${mentor.name} (${mentor.archetype}).
      
      Your personality and approach:
      ${mentor.personality_prompt || mentor.description}
      
      Your goal is to provide:
      - MODE = 'learn': Educational explanations of financial concepts, ratios, or accounting terms.
      - MODE = 'reflect': Principle-based perspectives and mindset reflections on the user's financial situation.
      
      USER CONTEXT:
      - Net Worth: $${userContext.netWorth}
      - Total Assets: $${userContext.totalAssets}
      - Total Liabilities: $${userContext.totalLiabilities}
      
      CONSTRAINTS:
      - NEVER give specific financial advice or buy/sell recommendations.
      - NEVER impersonate a real person directly.
      - Maintain a calm, professional, and motivational tone.
      - Reference the user's numbers to make it personal but stay within educational/reflective boundaries.
      - Use clear, plain language.
      - Always include this exact disclaimer at the end: "Educational perspective only. Not financial advice."
      
      PHILOSOPHY:
      ${mentor.description}
    `;

        const prompt = `User Message: "${message}"\n\nMode: ${mode}\n\nRespond as the mentor.`;

        const result = await model.generateContent([systemPrompt, prompt]);
        const responseText = result.response.text();

        return NextResponse.json({ response: responseText });
    } catch (error: any) {
        console.error('Gemini API Error Details:', JSON.stringify(error, null, 2));

        // Extract useful error info
        let errorMessage = 'Failed to generate mentor response';
        let status = 500;

        if (error.message?.includes('429') || error.status === 429) {
            errorMessage = 'Gemini Usage Limit Exceeded (429). Please try again later or switch models.';
            status = 429;
        } else if (error.message) {
            errorMessage = `AI Error: ${error.message}`;
        }

        return NextResponse.json({ error: errorMessage }, { status });
    }
}
