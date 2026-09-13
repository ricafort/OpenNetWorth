/**
 * Why this file exists:
 * Provides a status and health check API endpoint for the OpenNetWorth frontend.
 * Allows the UI to check if LM Studio or Ollama is online, report latency,
 * and dynamically populate model selection dropdowns.
 *
 * Tricky logic:
 * - Probes local machine ports (1234 and 11434) server-side to avoid CORS
 *   restrictions that browsers enforce against localhost port requests.
 *
 * TODO items:
 * - Support testing inference speed (tokens/second benchmark) via an optional query param.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkLocalLlmHealth } from '@/lib/api/localLlm';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const customUrl = searchParams.get('url') || undefined;

        const health = await checkLocalLlmHealth(customUrl);
        return NextResponse.json(health);
    } catch (error: any) {
        return NextResponse.json({
            isAvailable: false,
            provider: 'none',
            endpoint: '',
            activeModel: '',
            availableModels: [],
            error: error.message || 'Health check failed',
        }, { status: 500 });
    }
}
