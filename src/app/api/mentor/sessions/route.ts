/**
 * Mentor Chat Sessions API
 *
 * Why this file exists:
 * Persists Mentors conversations so chat history survives refreshes and appears
 * in the Chat History sidebar. Endpoints:
 * - GET  /api/mentor/sessions        → { sessions } (most recently updated first)
 * - GET  /api/mentor/sessions?id=X   → { session, messages } (camelCase client shape)
 * - POST /api/mentor/sessions        → full-replace upsert { id?, title?, messages }
 * - DELETE /api/mentor/sessions?id=X → removes the session and its messages
 *
 * Security: every handler runs validateLocalSecurity first (403 on foreign
 * origin / DNS rebinding) and answers via secureJson (no-store headers) — the
 * same local-isolation contract as /api/mentor and /api/vault.
 *
 * Schema note: the mentor chat tables are guaranteed by the migration runner
 * that runs once when the database is opened (getDb()).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { applySensitiveHeaders, validateLocalSecurity } from '@/lib/api/localSecurity';
import {
    MentorSessionValidationError,
    deleteSession,
    getSession,
    listSessions,
    saveSession,
    toClientMessage
} from '@/lib/domain/mentor/mentorSessionService';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

function errorResponse(err: unknown): NextResponse {
    if (err instanceof MentorSessionValidationError) {
        return secureJson({ error: err.message }, { status: err.statusCode });
    }
    console.error('[mentor/sessions] Unhandled error:', err);
    return secureJson({ error: 'Internal server error' }, { status: 500 });
}

export async function GET(req: NextRequest) {
    const denied = validateLocalSecurity(req);
    if (denied) return denied;

    try {
        const db = getDb();

        const sessionId = req.nextUrl.searchParams.get('id');
        if (sessionId) {
            const found = getSession(db, sessionId);
            if (!found) return secureJson({ error: 'Session not found' }, { status: 404 });
            return secureJson({
                session: found.session,
                messages: found.messages.map(toClientMessage)
            });
        }

        const limitParam = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10);
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;
        return secureJson({ sessions: listSessions(db, limit) });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function POST(req: NextRequest) {
    const denied = validateLocalSecurity(req);
    if (denied) return denied;

    try {
        const db = getDb();

        const body = await req.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return secureJson({ error: 'Request body must be a JSON object' }, { status: 400 });
        }
        if (body.id !== undefined && (typeof body.id !== 'string' || !body.id.trim())) {
            return secureJson({ error: 'Session id must be a non-empty string when provided' }, { status: 400 });
        }
        if (body.title !== undefined && typeof body.title !== 'string') {
            return secureJson({ error: 'Session title must be a string when provided' }, { status: 400 });
        }

        const result = saveSession(db, {
            id: typeof body.id === 'string' ? body.id : undefined,
            title: typeof body.title === 'string' ? body.title : undefined,
            messages: Array.isArray(body.messages) ? body.messages : []
        });

        return secureJson({
            success: true,
            session: result.session,
            messages: result.messages.map(toClientMessage)
        });
    } catch (err) {
        return errorResponse(err);
    }
}

export async function DELETE(req: NextRequest) {
    const denied = validateLocalSecurity(req);
    if (denied) return denied;

    try {
        const db = getDb();

        const sessionId = req.nextUrl.searchParams.get('id');
        if (!sessionId) {
            return secureJson({ error: 'Session id is required' }, { status: 400 });
        }
        const deleted = deleteSession(db, sessionId);
        if (!deleted) return secureJson({ error: 'Session not found' }, { status: 404 });
        return secureJson({ success: true, id: sessionId });
    } catch (err) {
        return errorResponse(err);
    }
}
