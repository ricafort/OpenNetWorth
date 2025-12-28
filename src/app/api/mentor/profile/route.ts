import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const { name, count = 1 } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        console.log('Generating profile for:', name, 'with', count, 'quotes');
        console.log('API Key present:', !!process.env.GEMINI_API_KEY);

        const model = getGeminiModel();

        const prompt = `
      Generate a financial mentor profile for: "${name}".
      Return ONLY a JSON object with the following fields:
      - archetype: A short title describing their primary philosophy (3-5 words).
      - description: A one-sentence summary of their focus.
      - personality_prompt: A 2-3 sentence system prompt fragment describing their tone, style, and core values.
      - quotes: An array of ${count} short (1-2 sentence) wisdom quotes characteristic of this person.
      
      Ensure the profile is serious, wisdom-focused, and reflects the person's real-world financial or philosophical legacy.
      JSON format ONLY.
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up markdown if AI returns it
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

        const profile = JSON.parse(cleanJson);

        return NextResponse.json(profile);
    } catch (error: any) {
        console.error('Gemini Profile Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate mentor profile' }, { status: 500 });
    }
}
