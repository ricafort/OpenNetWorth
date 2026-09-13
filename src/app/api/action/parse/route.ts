/**
 * Why this file exists:
 * Parses freeform natural language user messages into structured actions
 * for the OpenNetWorth financial dashboard (e.g. "Add a savings account with $5,000"
 * or "Track my home value at $450,000").
 *
 * Tricky logic:
 * - Local LLMs may vary in JSON formatting consistency across different models
 *   (e.g., Qwen vs Llama vs Gemma). We strip markdown fences and extract raw JSON.
 * - If the Local LLM is offline or busy, we fall back to a high-accuracy deterministic
 *   regex rule parser (`ruleBasedParseIntent`), ensuring that action logging never breaks.
 *
 * TODO items:
 * - Support batch multi-item logging (e.g. "Bought $500 of VTI and paid $200 on student loan").
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryLocalLlm, ruleBasedParseIntent, LocalLlmMessage } from '@/lib/api/localLlm';

export async function POST(req: NextRequest) {
    try {
        const { message, localConfig } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // 1. Try Local LLM parsing first
        try {
            const systemPrompt = `You are a financial data parser for OpenNetWorth. Extract structured intent from user messages.
RETURN ONLY RAW JSON. No explanations, no markdown formatting.

JSON Schema:
{
  "action": "add_asset" | "add_liability" | "add_goal" | "log_expense" | null,
  "type": "cash" | "investment" | "real_estate" | "crypto" | "vehicle" | "mortgage" | "credit_card" | "student_loan" | "auto_loan" | "other" | null,
  "name": string | null,
  "amount": number | null,
  "currency": "USD" | "EUR" | "GBP" | "AUD" | "CAD",
  "confidence": number (0 to 1)
}

Rules:
- "add_asset": adding cash, savings, stock, investment, crypto, home, car.
- "add_liability": adding debt, mortgage, loan, credit card balance.
- "add_goal": setting a savings target or net worth milestone.
- If just conversational or advice question, set action to null and confidence to 0.`;

            const messages: LocalLlmMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ];

            const responseText = await queryLocalLlm(messages, {
                endpoint: localConfig?.endpoint,
                model: localConfig?.model,
                temperature: 0.1,
                maxTokens: 150,
            });

            // Clean markdown code blocks if the local model wrapped in ```json
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed && typeof parsed === 'object') {
                    return NextResponse.json(parsed);
                }
            }
        } catch (llmErr: any) {
            console.warn('Local LLM parse failed, falling back to deterministic parser:', llmErr.message);
        }

        // 2. Deterministic Rule-Based Fallback Parser
        const ruleParsed = ruleBasedParseIntent(message);
        return NextResponse.json(ruleParsed);
    } catch (error: any) {
        console.error('Action parse error:', error);
        return NextResponse.json(ruleBasedParseIntent(''), { status: 200 });
    }
}
