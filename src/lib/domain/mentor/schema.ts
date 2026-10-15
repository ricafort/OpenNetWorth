/**
 * Mentor Chat Session Persistence Schema
 *
 * Why this file exists:
 * The Mentors chat used to live only in React state — a refresh wiped every
 * conversation. This schema durably stores conversations in the local SQLite
 * vault so history survives reloads and travels with vault backups.
 *
 * Design:
 * - `mentor_sessions` is the conversation header (title + timestamps).
 * - `mentor_messages` stores every bubble in `seq` order, including the
 *   structured payloads (action intents, verified facts, pending intents,
 *   attachment references) as JSON columns so a restored chat renders exactly
 *   as it was sent.
 * - `action_intent_resolved` records whether an action_confirm card was
 *   confirmed or cancelled, so a restored bubble renders a static chip and
 *   never re-executes a financial add after a refresh.
 * - `ON DELETE CASCADE` removes messages with their session.
 *
 * Idempotent like every other domain schema: safe to call on every request.
 */

import Database from 'better-sqlite3';

export const MENTOR_CHAT_SCHEMA_DDL = `
    -- Mentor Chat Conversations
    CREATE TABLE IF NOT EXISTS mentor_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- Chat Bubbles (ordered by seq within a session)
    CREATE TABLE IF NOT EXISTS mentor_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'mentor', 'consensus', 'action_confirm')),
        content TEXT,
        mentor_id TEXT,
        mentor_name TEXT,
        action_intent_json TEXT,
        facts_json TEXT,
        pending_intent_json TEXT,
        action_intent_resolved TEXT CHECK (action_intent_resolved IN ('confirmed', 'cancelled')),
        attachments_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES mentor_sessions(id) ON DELETE CASCADE
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_mentor_messages_session ON mentor_messages(session_id, seq);
    CREATE INDEX IF NOT EXISTS idx_mentor_sessions_updated ON mentor_sessions(updated_at);
`;

