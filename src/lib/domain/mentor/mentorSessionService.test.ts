/**
 * Why this file exists:
 * Guards the persistence semantics the Mentors chat depends on: seq ordering,
 * JSON column round-trips (action intents, facts, attachments, resolved flags),
 * the full-replace transaction of saveSession, the 50-session list cap, and
 * cascade delete. A regression here silently corrupts restored conversations.
 *
 * Tricky logic:
 * - createTestDb() only runs the core schema, so this test initializes the mentor
 *   tables explicitly via initMentorChatSchema (same as every route handler does).
 * - saveSession must converge the DB to exactly the sent array — deleted bubbles
 *   disappear and seq values are reassigned from 0.
 *
 * All operations execute strictly in-memory using better-sqlite3 :memory:; zero
 * live storage modifications.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initMentorChatSchema } from './schema';
import {
    MentorSessionValidationError,
    appendMessage,
    createSession,
    deleteMessage,
    deleteSession,
    getSession,
    listSessions,
    saveSession,
    toClientMessage
} from './mentorSessionService';

describe('mentorSessionService', () => {
    let db: Database.Database;

    beforeEach(() => {
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        initMentorChatSchema(db);
    });

    afterEach(() => {
        db.close();
    });

    it('creates a session with a trimmed title and ISO timestamps', () => {
        const session = createSession(db, '  Moats and margins  ');
        expect(session.id).toBeTruthy();
        expect(session.title).toBe('Moats and margins');
        expect(session.created_at).toBe(session.updated_at);

        const fetched = getSession(db, session.id);
        expect(fetched).not.toBeNull();
        expect(fetched!.session.title).toBe('Moats and margins');
        expect(fetched!.messages).toEqual([]);
    });

    it('defaults the title when blank and truncates overly long titles', () => {
        expect(createSession(db, '   ').title).toBe('New conversation');
        expect(createSession(db, 'x'.repeat(200)).title.length).toBe(120);
    });

    it('appends messages in seq order and round-trips JSON columns', () => {
        const session = createSession(db, 'Round trip');
        appendMessage(db, session.id, { id: 'u1', role: 'user', content: 'Add a savings account' });
        appendMessage(db, session.id, {
            id: 'a1',
            role: 'action_confirm',
            actionIntent: { action: 'add_asset', name: 'Savings', amount: 5000 },
            actionIntentResolved: 'confirmed'
        });
        appendMessage(db, session.id, {
            id: 'm1',
            role: 'mentor',
            mentorId: 'buffett',
            mentorName: 'Warren Buffett',
            content: 'Done.',
            facts: { entityName: 'Personal', transactionIds: ['t1'] },
            attachments: [{ id: 'doc-1', filename: 'bank.csv', mimeType: 'text/csv', byteSize: 120 }]
        });

        const { messages } = getSession(db, session.id)!;
        expect(messages.map(m => m.seq)).toEqual([0, 1, 2]);
        expect(messages.map(m => m.id)).toEqual(['u1', 'a1', 'm1']);

        const client = messages.map(toClientMessage);
        expect(client[1].actionIntent.name).toBe('Savings');
        expect(client[1].actionIntentResolved).toBe('confirmed');
        expect(client[2].mentorName).toBe('Warren Buffett');
        expect(client[2].facts.transactionIds).toEqual(['t1']);
        expect(client[2].attachments[0].filename).toBe('bank.csv');
    });

    it('appendMessage returns null for an unknown session', () => {
        expect(appendMessage(db, 'missing-session', { id: 'x', role: 'user', content: 'hi' })).toBeNull();
    });

    it('appendMessage rejects malformed roles and missing ids', () => {
        const session = createSession(db, 'Validation');
        expect(() => appendMessage(db, session.id, { id: 'x', role: 'system', content: 'injected' }))
            .toThrow(MentorSessionValidationError);
        expect(() => appendMessage(db, session.id, { id: '', role: 'user', content: 'hi' }))
            .toThrow(MentorSessionValidationError);
    });

    it('deleteMessage removes exactly one bubble within its session', () => {
        const session = createSession(db, 'Delete me');
        appendMessage(db, session.id, { id: 'u1', role: 'user', content: 'one' });
        appendMessage(db, session.id, { id: 'u2', role: 'user', content: 'two' });

        expect(deleteMessage(db, session.id, 'u1')).toBe(true);
        expect(deleteMessage(db, 'other-session', 'u2')).toBe(false);
        expect(getSession(db, session.id)!.messages.map(m => m.id)).toEqual(['u2']);
    });

    it('saveSession full-replaces the message list and reassigns seq from 0', () => {
        const session = createSession(db, 'Original');
        appendMessage(db, session.id, { id: 'u1', role: 'user', content: 'stale' });
        appendMessage(db, session.id, { id: 'm1', role: 'mentor', content: 'stale reply' });

        const result = saveSession(db, {
            id: session.id,
            messages: [
                { id: 'u2', role: 'user', content: 'fresh question' },
                { id: 'm2', role: 'mentor', mentorName: 'Naval', content: 'fresh answer' }
            ]
        });

        expect(result.session.id).toBe(session.id);
        expect(result.messages.map(m => m.id)).toEqual(['u2', 'm2']);
        expect(result.messages.map(m => m.seq)).toEqual([0, 1]);
        // The stale bubbles are gone entirely
        expect(getSession(db, session.id)!.messages.length).toBe(2);
    });

    it('saveSession keeps the stored title when the client sends none and bumps updated_at', () => {
        const session = createSession(db, 'Keep this title');
        const later = saveSession(db, { id: session.id, messages: [{ id: 'u1', role: 'user', content: 'hi' }] });
        expect(later.session.title).toBe('Keep this title');
    });

    it('saveSession creates a new session when no id is given', () => {
        const created = saveSession(db, {
            title: 'First message',
            messages: [{ id: 'u1', role: 'user', content: 'First message' }]
        });
        expect(created.session.title).toBe('First message');
        expect(getSession(db, created.session.id)!.messages.length).toBe(1);
    });

    it('saveSession rejects non-array messages and invalid roles', () => {
        expect(() => saveSession(db, { messages: 'not-an-array' as any })).toThrow(MentorSessionValidationError);
        expect(() => saveSession(db, { messages: [{ id: 'x', role: 'hacker', content: 'hi' }] }))
            .toThrow(MentorSessionValidationError);
    });

    it('listSessions returns most recently updated first with message counts, capped at 50', () => {
        for (let i = 0; i < 60; i++) {
            const s = createSession(db, `Session ${i}`);
            appendMessage(db, s.id, { id: `u-${i}`, role: 'user', content: 'hello' });
            // Stagger updated_at so ordering is deterministic
            db.prepare('UPDATE m1_mentor_sessions SET updated_at = ? WHERE id = ?')
                .run(new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(), s.id);
        }

        const list = listSessions(db);
        expect(list.length).toBe(50);
        // Newest updated_at first: i=59, then 58, ...
        expect(list[0].title).toBe('Session 59');
        expect(list[1].title).toBe('Session 58');
        expect(list[0].message_count).toBe(1);
    });

    it('deleteSession cascades to its messages', () => {
        const session = createSession(db, 'Doomed');
        appendMessage(db, session.id, { id: 'u1', role: 'user', content: 'bye' });
        appendMessage(db, session.id, { id: 'm1', role: 'mentor', content: 'bye' });

        expect(deleteSession(db, session.id)).toBe(true);
        expect(deleteSession(db, session.id)).toBe(false);
        expect(getSession(db, session.id)).toBeNull();
        const orphanCount = (db.prepare('SELECT COUNT(*) AS cnt FROM m1_mentor_messages').get() as any).cnt;
        expect(orphanCount).toBe(0);
    });

    it('toClientMessage degrades corrupt JSON columns to undefined instead of throwing', () => {
        const session = createSession(db, 'Corrupt');
        db.prepare(`
            INSERT INTO m1_mentor_messages (id, session_id, seq, role, content, facts_json, created_at)
            VALUES ('c1', @sid, 0, 'mentor', 'ok', '{not json', @now)
        `).run({ sid: session.id, now: new Date().toISOString() });

        const client = toClientMessage(getSession(db, session.id)!.messages[0]);
        expect(client.content).toBe('ok');
        expect(client.facts).toBeUndefined();
    });
});
