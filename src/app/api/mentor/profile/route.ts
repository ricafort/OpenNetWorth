/**
 * Why this file exists:
 * Dynamically synthesizes custom mentor profiles and quotes based on user input
 * using the user's Local LLM.
 *
 * Tricky logic:
 * - We extract JSON safely from potential conversational text returned by local models.
 * - If Local LLM is offline, a structured fallback profile is generated dynamically
 *   so custom mentor creation is never blocked.
 *
 * TODO items:
 * - Allow users to upload or reference custom PDF/notes for local RAG mentor synthesis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryLocalLlm, LocalLlmMessage } from '@/lib/api/localLlm';

export async function POST(req: NextRequest) {
    try {
        const { name, count = 3, localConfig } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        try {
            const systemPrompt = `You are a mentor synthesizer for OpenNetWorth.
Generate a financial mentor profile for: "${name}".
Return ONLY a valid JSON object. No other text or explanation.

JSON Schema:
{
  "archetype": "Short philosophy title (3-5 words)",
  "description": "One sentence summary of their focus",
  "personality_prompt": "2-3 sentences describing tone, style, and core values",
  "quotes": ["${count} short quotes characteristic of this person's philosophy"]
}`;

            const messages: LocalLlmMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Generate profile for ${name}` }
            ];

            const responseText = await queryLocalLlm(messages, {
                endpoint: localConfig?.endpoint,
                model: localConfig?.model,
                temperature: 0.7,
                maxTokens: 1500,
            });

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const profile = JSON.parse(jsonMatch[0]);
                return NextResponse.json(profile);
            }
        } catch (llmErr: any) {
            console.warn('Local LLM profile generation failed, using structured fallback:', llmErr.message);
        }

        // Offline Fallback Profile
        const fallbackProfile = {
            archetype: `${name} Philosophy`,
            description: `Grounded perspectives and disciplined principles inspired by ${name}.`,
            personality_prompt: `You communicate with the measured discipline, realism, and clarity characteristic of ${name}. Emphasize prudence, patient compounding, and emotional sovereignty.`,
            quotes: [
                `"Discipline in small financial habits compounds into sovereign freedom." — ${name}`,
                `"Protect your downside first; the upside will take care of itself." — ${name}`,
                `"Wealth is not what you spend, but the independence you retain." — ${name}`
            ].slice(0, count)
        };

        return NextResponse.json(fallbackProfile);
    } catch (error: any) {
        console.error('Mentor Profile Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate mentor profile' }, { status: 500 });
    }
}
