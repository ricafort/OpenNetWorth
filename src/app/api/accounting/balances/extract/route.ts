/**
 * AI Balance Extraction API Route
 * 
 * Why this file exists:
 * Fulfills Delivery 2A: Local AI-Assisted Balance Extraction.
 * Exposes an HTTP POST endpoint for users pasting raw financial statements,
 * running either deterministic table parsing or local LLM extraction.
 * Returns reviewable proposals with source excerpts and account correlations.
 * 
 * Tricky logic:
 * - Security boundary: Validates local security (DNS rebinding & loopback CSRF defense)
 *   and applies sensitive headers (no-store, no-cache) to prevent disk caching of sensitive data.
 * - Strategy selection: Accepts 'auto', 'table', or 'llm', allowing the UI or testing suite to
 *   override extraction heuristics.
 * - Non-destructive: This route NEVER writes to SQLite. It strictly produces proposed candidates
 *   requiring explicit user review and confirmation before being committed via POST /api/accounting/balances.
 * 
 * TODO: In Delivery 2B, support multipart file upload and document attachments.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { extractBalancesFromText } from '@/lib/domain/accounting/balanceExtractionService';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;

    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const { text, defaultCurrency = 'AUD', defaultDate, strategy = 'auto', localConfig, entityId, entity_id } = body;
        const effectiveEntityId = entityId || entity_id;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return secureJson({
                success: false,
                error: 'Statement text is required for balance extraction.',
                proposals: []
            }, { status: 400 });
        }

        const result = await extractBalancesFromText(db, {
            text,
            defaultCurrency,
            defaultDate,
            strategy,
            localConfig,
            entityId: effectiveEntityId
        });

        return secureJson(result, { status: result.success ? 200 : (result.is_offline ? 503 : 422) });
    } catch (error: any) {
        console.error('Balance Extraction API Error:', error);
        return secureJson({
            success: false,
            error: error.message || 'Internal balance extraction error',
            proposals: []
        }, { status: 500 });
    }
}
