/**
 * Budgets API — monthly per-category spending limits (Cashflow feature).
 *
 * Why this exists:
 * The Cashflow page needs CRUD over the `budgets` table (migration 0010) so
 * users can set a monthly limit per expense category; the Actual tab then shows
 * budget vs actual via the `budget_vs_actual` report on /api/accounting.
 * Follows the settings-route skeleton (Phase 2.5): local security check,
 * demo-cookie-aware vault, read-only demo mode, credential-safe responses.
 *
 * Tricky logic:
 * - `limit_cents` is INTEGER minor units (ledger convention); the UI converts
 *   its major-unit input once, like the Autopilot generator does.
 * - Upsert is keyed by (entity_id, category, currency) — the table's UNIQUE
 *   constraint — so re-saving a category updates instead of duplicating.
 * - Validation errors from the service map to 400, not 500.
 */

import { NextResponse } from 'next/server';
import { getDbForRequest, demoErrorResponse, demoReadOnlyResponse } from '@/infrastructure/sqlite/db';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';
import { listBudgets, upsertBudget, deleteBudget } from '@/lib/domain/accounting/budgetService';
import { ValidationError } from '@/lib/domain/accounting/accountService';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

function errorStatus(e: any): number {
    return e instanceof ValidationError || /safe, finite integer/.test(e?.message || '') ? 400 : 500;
}

export async function GET(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        const { searchParams } = new URL(request.url);
        const entityId = searchParams.get('entity_id');
        if (!entityId) {
            return secureJson({ error: 'Missing required parameter: entity_id' }, { status: 400 });
        }
        const db = getDbForRequest(request);
        return secureJson({ success: true, budgets: listBudgets(db, entityId) });
    } catch (e: any) {
        const demoRes = demoErrorResponse(e);
        if (demoRes) return demoRes;
        return secureJson({ error: e.message || 'Failed to read budgets' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    // Demo mode is read-only.
    const demoDenied = demoReadOnlyResponse(request);
    if (demoDenied) return demoDenied;
    try {
        const body = await request.json().catch(() => null);
        if (!body || body.action !== 'upsert' || !body.payload) {
            return secureJson({ error: "Expected {action: 'upsert', payload: {entity_id, category, currency, limit_cents}}" }, { status: 400 });
        }
        const db = getDbForRequest(request);
        const budget = upsertBudget(db, body.payload);
        return secureJson({ success: true, budget });
    } catch (e: any) {
        const demoRes = demoErrorResponse(e);
        if (demoRes) return demoRes;
        return secureJson({ error: e.message || 'Failed to save budget' }, { status: errorStatus(e) });
    }
}

export async function DELETE(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    // Demo mode is read-only.
    const demoDenied = demoReadOnlyResponse(request);
    if (demoDenied) return demoDenied;
    try {
        const { searchParams } = new URL(request.url);
        let id = searchParams.get('id');
        if (!id) {
            const body = await request.json().catch(() => null);
            if (body && typeof body.id === 'string') id = body.id;
        }
        if (!id) {
            return secureJson({ error: 'Missing id for budget delete' }, { status: 400 });
        }
        const db = getDbForRequest(request);
        if (!deleteBudget(db, id)) {
            return secureJson({ error: `Budget not found: ${id}` }, { status: 404 });
        }
        return secureJson({ success: true, id });
    } catch (e: any) {
        const demoRes = demoErrorResponse(e);
        if (demoRes) return demoRes;
        return secureJson({ error: e.message || 'Failed to delete budget' }, { status: 500 });
    }
}
