/**
 * Mentor Chat Session Service
 *
 * Why this file exists:
 * Single authoritative CRUD layer over `m1_mentor_sessions` / `m1_mentor_messages`,
 * mirroring the draftService pattern (crypto.randomUUID ids, db.transaction
 * atomicity, snake_case rows ↔ camelCase client payloads). The /api/mentor/sessions
 * route and its tests both go through these functions so persistence semantics
 * live in exactly one place.
 *
 * Tricky logic:
 * - `saveSession` is a FULL REPLACE inside one transaction: the client debounces
 *   the entire chat array, so the DB must converge to exactly that array (old
 *   rows removed, `seq` reassigned) without ever leaving a half-written session.
 * - `action_intent_resolved` is persisted so a restored action_confirm bubble
 *   renders a static chip instead of an interactive card — a refresh must never
 *   offer to re-add an asset that was already added.
 * - JSON columns are parsed defensively: a corrupt column degrades to `undefined`
 *   rather than throwing during chat restore.
 */

import Database from 'better-sqlite3';
import { initMentorChatSchema } from './schema';

export const MENTOR_MESSAGE_ROLES = ['user', 'mentor', 'consensus', 'action_confirm'] as const;
export type MentorMessageRole = (typeof MENTOR_MESSAGE_ROLES)[number];

export interface MentorSessionRow {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

export interface MentorMessageRow {
    id: string;
    session_id: string;
    seq: number;
    role: MentorMessageRole;
    content: string | null;
    mentor_id: string | null;
    mentor_name: string | null;
    action_intent_json: string | null;
    facts_json: string | null;
    pending_intent_json: string | null;
    action_intent_resolved: 'confirmed' | 'cancelled' | null;
    attachments_json: string | null;
    created_at: string;
}

/** CamelCase message shape exchanged with the client (matches MentorChatMessage). */
export interface SessionMessageInput {
    id: string;
    role: string;
    content?: string | null;
    mentorId?: string | null;
    mentorName?: string | null;
    actionIntent?: any;
    facts?: any;
    pendingIntent?: any;
    actionIntentResolved?: 'confirmed' | 'cancelled' | null;
    attachments?: any[];
    createdAt?: string;
}

export class MentorSessionValidationError extends Error {
    statusCode = 400;
}

function safeParse<T = any>(text: string | null): T | undefined {
    if (text === null || text === undefined) return undefined;
    try {
        return JSON.parse(text) as T;
    } catch {
        return undefined;
    }
}

function toJsonColumn(value: any): string | null {
    if (value === undefined || value === null) return null;
    return JSON.stringify(value);
}

/** Converts a validated camelCase client message into snake_case row parameters. */
function toRowParams(sessionId: string, seq: number, msg: SessionMessageInput): any {
    if (!msg || typeof msg !== 'object') {
        throw new MentorSessionValidationError('Message must be an object');
    }
    if (!msg.id || typeof msg.id !== 'string') {
        throw new MentorSessionValidationError('Message id is required');
    }
    if (!MENTOR_MESSAGE_ROLES.includes(msg.role as MentorMessageRole)) {
        throw new MentorSessionValidationError(`Invalid message role: "${msg.role}"`);
    }
    if (msg.content !== undefined && msg.content !== null && typeof msg.content !== 'string') {
        throw new MentorSessionValidationError('Message content must be a string when present');
    }
    if (msg.actionIntentResolved !== undefined && msg.actionIntentResolved !== null
        && msg.actionIntentResolved !== 'confirmed' && msg.actionIntentResolved !== 'cancelled') {
        throw new MentorSessionValidationError(`Invalid actionIntentResolved: "${msg.actionIntentResolved}"`);
    }
    return {
        id: msg.id,
        session_id: sessionId,
        seq,
        role: msg.role,
        content: msg.content ?? null,
        mentor_id: typeof msg.mentorId === 'string' ? msg.mentorId : null,
        mentor_name: typeof msg.mentorName === 'string' ? msg.mentorName : null,
        action_intent_json: toJsonColumn(msg.actionIntent),
        facts_json: toJsonColumn(msg.facts),
        pending_intent_json: toJsonColumn(msg.pendingIntent),
        action_intent_resolved: msg.actionIntentResolved ?? null,
        attachments_json: toJsonColumn(msg.attachments),
        created_at: typeof msg.createdAt === 'string' ? msg.createdAt : new Date().toISOString()
    };
}

/** Maps a DB row back to the camelCase MentorChatMessage shape used by the UI. */
export function toClientMessage(row: MentorMessageRow): any {
    return {
        id: row.id,
        role: row.role,
        content: row.content ?? undefined,
        mentorId: row.mentor_id ?? undefined,
        mentorName: row.mentor_name ?? undefined,
        actionIntent: safeParse(row.action_intent_json),
        facts: safeParse(row.facts_json),
        pendingIntent: safeParse(row.pending_intent_json),
        actionIntentResolved: row.action_intent_resolved ?? undefined,
        attachments: safeParse<any[]>(row.attachments_json),
        createdAt: row.created_at
    };
}

export function createSession(db: Database.Database, title?: string): MentorSessionRow {
    initMentorChatSchema(db);
    const now = new Date().toISOString();
    const session = {
        id: crypto.randomUUID(),
        title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 120) : 'New conversation',
        created_at: now,
        updated_at: now
    };
    db.prepare('INSERT INTO m1_mentor_sessions (id, title, created_at, updated_at) VALUES (@id, @title, @created_at, @updated_at)')
        .run(session);
    return session;
}

export function listSessions(db: Database.Database, limit = 50): Array<MentorSessionRow & { message_count: number }> {
    initMentorChatSchema(db);
    return db.prepare(`
        SELECT s.*, (SELECT COUNT(*) FROM m1_mentor_messages m WHERE m.session_id = s.id) AS message_count
        FROM m1_mentor_sessions s
        ORDER BY s.updated_at DESC
        LIMIT ?
    `).all(limit) as Array<MentorSessionRow & { message_count: number }>;
}

export function getSession(db: Database.Database, sessionId: string): { session: MentorSessionRow; messages: MentorMessageRow[] } | null {
    initMentorChatSchema(db);
    const session = db.prepare('SELECT * FROM m1_mentor_sessions WHERE id = ?').get(sessionId) as MentorSessionRow | undefined;
    if (!session) return null;
    const messages = db.prepare('SELECT * FROM m1_mentor_messages WHERE session_id = ? ORDER BY seq ASC').all(sessionId) as MentorMessageRow[];
    return { session, messages };
}

/**
 * Full-replace upsert of a session and its complete message list, atomically.
 * The client sends the entire chat on every debounced save, so the transaction
 * deletes and re-inserts all messages with fresh `seq` values — the DB always
 * converges to exactly the sent array.
 */
export function saveSession(
    db: Database.Database,
    input: { id?: string; title?: string; messages: SessionMessageInput[] }
): { session: MentorSessionRow; messages: MentorMessageRow[] } {
    initMentorChatSchema(db);

    if (!Array.isArray(input.messages)) {
        throw new MentorSessionValidationError('messages must be an array');
    }
    if (input.messages.length > 500) {
        throw new MentorSessionValidationError('A session may contain at most 500 messages');
    }

    const now = new Date().toISOString();

    const run = db.transaction(() => {
        let session: MentorSessionRow;
        if (input.id) {
            const existing = db.prepare('SELECT * FROM m1_mentor_sessions WHERE id = ?').get(input.id) as MentorSessionRow | undefined;
            if (existing) {
                const title = typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 120) : existing.title;
                db.prepare('UPDATE m1_mentor_sessions SET title = ?, updated_at = ? WHERE id = ?').run(title, now, existing.id);
                session = { ...existing, title, updated_at: now };
            } else {
                session = {
                    id: input.id,
                    title: typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 120) : 'New conversation',
                    created_at: now,
                    updated_at: now
                };
                db.prepare('INSERT INTO m1_mentor_sessions (id, title, created_at, updated_at) VALUES (@id, @title, @created_at, @updated_at)').run(session);
            }
        } else {
            session = {
                id: crypto.randomUUID(),
                title: typeof input.title === 'string' && input.title.trim() ? input.title.trim().slice(0, 120) : 'New conversation',
                created_at: now,
                updated_at: now
            };
            db.prepare('INSERT INTO m1_mentor_sessions (id, title, created_at, updated_at) VALUES (@id, @title, @created_at, @updated_at)').run(session);
        }

        // Full replace: converge the message list to exactly what the client sent.
        db.prepare('DELETE FROM m1_mentor_messages WHERE session_id = ?').run(session.id);
        const insert = db.prepare(`
            INSERT INTO m1_mentor_messages (
                id, session_id, seq, role, content, mentor_id, mentor_name,
                action_intent_json, facts_json, pending_intent_json, action_intent_resolved, attachments_json, created_at
            ) VALUES (
                @id, @session_id, @seq, @role, @content, @mentor_id, @mentor_name,
                @action_intent_json, @facts_json, @pending_intent_json, @action_intent_resolved, @attachments_json, @created_at
            )
        `);
        input.messages.forEach((msg, idx) => {
            insert.run(toRowParams(session.id, idx, msg));
        });

        return session;
    });

    const session = run();
    const stored = getSession(db, session.id)!;
    return { session: stored.session, messages: stored.messages };
}

export function appendMessage(db: Database.Database, sessionId: string, msg: SessionMessageInput): MentorMessageRow | null {
    initMentorChatSchema(db);
    const run = db.transaction(() => {
        const session = db.prepare('SELECT id FROM m1_mentor_sessions WHERE id = ?').get(sessionId) as any;
        if (!session) return null;
        const maxSeq = db.prepare('SELECT COALESCE(MAX(seq), -1) AS max_seq FROM m1_mentor_messages WHERE session_id = ?').get(sessionId) as any;
        const row = toRowParams(sessionId, (maxSeq?.max_seq ?? -1) + 1, msg);
        db.prepare(`
            INSERT INTO m1_mentor_messages (
                id, session_id, seq, role, content, mentor_id, mentor_name,
                action_intent_json, facts_json, pending_intent_json, action_intent_resolved, attachments_json, created_at
            ) VALUES (
                @id, @session_id, @seq, @role, @content, @mentor_id, @mentor_name,
                @action_intent_json, @facts_json, @pending_intent_json, @action_intent_resolved, @attachments_json, @created_at
            )
        `).run(row);
        db.prepare('UPDATE m1_mentor_sessions SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), sessionId);
        return row;
    });
    const inserted = run();
    if (!inserted) return null;
    return db.prepare('SELECT * FROM m1_mentor_messages WHERE id = ?').get(inserted.id) as MentorMessageRow;
}

export function deleteMessage(db: Database.Database, sessionId: string, messageId: string): boolean {
    initMentorChatSchema(db);
    const result = db.prepare('DELETE FROM m1_mentor_messages WHERE id = ? AND session_id = ?').run(messageId, sessionId);
    if (result.changes > 0) {
        db.prepare('UPDATE m1_mentor_sessions SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), sessionId);
    }
    return result.changes > 0;
}

export function deleteSession(db: Database.Database, sessionId: string): boolean {
    initMentorChatSchema(db);
    // FK cascade removes the messages; kept explicit for clarity and older FK settings.
    const run = db.transaction(() => {
        db.prepare('DELETE FROM m1_mentor_messages WHERE session_id = ?').run(sessionId);
        const result = db.prepare('DELETE FROM m1_mentor_sessions WHERE id = ?').run(sessionId);
        return result.changes > 0;
    });
    return run();
}
