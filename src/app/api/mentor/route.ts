/**
 * Why this file exists:
 * Powers OpenNetWorth's Financial Board AI Mentorship feature.
 * Connects to a Local LLM (LM Studio or Ollama) running strictly on the user's
 * computer. Zero prompt data or financial figures ever leave the local network.
 *
 * Tricky logic:
 * - If the local LLM is offline or busy, instead of throwing an error, we provide
 *   a grounded philosophical perspective using the mentor's static wisdom principles
 *   combined with an informative banner explaining how to start Ollama or LM Studio.
 * - Allows the client to pass custom local models or endpoints (e.g. from the in-app
 *   Local AI settings modal).
 *
 * TODO items:
 * - Implement Server-Sent Events (SSE) streaming for real-time token-by-token typing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryLocalLlm, LocalLlmMessage } from '@/lib/api/localLlm';

export async function POST(req: NextRequest) {
    try {
        const { mentor, mode, userContext, message, localConfig } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const currency = userContext?.currency || 'USD';
        const netWorth = userContext?.netWorth ?? 0;
        const totalAssets = userContext?.totalAssets ?? 0;
        const totalLiabilities = userContext?.totalLiabilities ?? 0;

        const systemPrompt = `You are an AI-simulated financial wisdom persona inspired by the philosophy of: ${mentor?.name || 'Financial Mentor'} (${mentor?.archetype || 'Wisdom & Strategy'}).
Personality & Philosophy: ${mentor?.personality_prompt || mentor?.description || 'Thoughtful financial guidance.'}

Your Goal:
- MODE = 'learn': Provide educational explanations of financial concepts, metrics, and debt/wealth mechanics.
- MODE = 'reflect': Provide philosophical, mindset, and risk-management reflections on the user's financial posture.

USER FINANCIAL SNAPSHOT:
- Preferred Currency: ${currency}
- Net Worth: ${netWorth.toLocaleString()} ${currency}
- Total Assets: ${totalAssets.toLocaleString()} ${currency}
- Total Liabilities: ${totalLiabilities.toLocaleString()} ${currency}

STRICT CONSTRAINTS:
- Keep your reply concise, punchy, and structured (under 160 words).
- Speak directly in the first person as this mentor persona.
- Reference their numbers where helpful to provide tailored perspective.
- Always include this exact disclaimer at the bottom: "Educational perspective only. Not financial advice."`;

        const messages: LocalLlmMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `[Mode: ${mode || 'reflect'}]\n\n${message}` }
        ];

        try {
            const responseText = await queryLocalLlm(messages, {
                endpoint: localConfig?.endpoint,
                model: localConfig?.model,
                temperature: 0.7,
                maxTokens: 2048,
            });

            if (!responseText || !responseText.trim()) {
                throw new Error('Local LLM returned an empty response');
            }

            return NextResponse.json({ response: responseText.trim() });
        } catch (llmError: any) {
            console.warn('Local LLM unavailable, using offline wisdom fallback:', llmError.message);

            // Philosophical offline fallback based on the chosen mentor
            const offlineAdvice = `### ${mentor?.name || 'Mentor'} (${mentor?.archetype || 'Wisdom'}) Perspective\n\n` +
                `Looking at your current balance (${currency} ${netWorth.toLocaleString()} net worth across ${currency} ${totalAssets.toLocaleString()} in assets and ${currency} ${totalLiabilities.toLocaleString()} in debt), ` +
                `the key principle is ${mentor?.description || 'discipline and consistent compounding'}.\n\n` +
                `*"Focus on the controllable variables: your savings rate, debt elimination velocity, and keeping your capital protected against unexpected shocks."*\n\n` +
                `> 💡 *Tip: Local LLM is currently offline or loading. Start LM Studio (port 1234) or Ollama (run \`ollama run llama3.2\`) to enable live private AI chat on your machine.*\n\n` +
                `Educational perspective only. Not financial advice.`;

            return NextResponse.json({ response: offlineAdvice, isOfflineFallback: true });
        }
    } catch (error: any) {
        console.error('Mentor Route Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate mentor response' }, { status: 500 });
    }
}
