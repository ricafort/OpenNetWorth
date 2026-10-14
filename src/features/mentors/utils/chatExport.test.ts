/**
 * Why this file exists:
 * The Markdown/JSON exporters are the only way a user takes a mentor conversation
 * out of the app, so their output contract is guarded here: Markdown must carry a
 * title heading, one section per bubble with the right role label, and resolved
 * action chips as plain text; JSON must round-trip through JSON.parse and never
 * leak React-internal keys (icons are JSX objects and would explode serialization).
 *
 * Pure node environment — the exporters have no DOM dependency by design; only
 * downloadBlob (not exercised here) touches the browser.
 */

import { describe, it, expect } from 'vitest';
import { sessionToJson, sessionToMarkdown } from './chatExport';
import { safeFilename } from '@/lib/utils/download';
import { MentorChatMessage } from '../types';

const messages: MentorChatMessage[] = [
    { id: 'u1', role: 'user', content: 'How is my posture?', createdAt: '2026-10-01T00:00:00.000Z' },
    {
        id: 'm1',
        role: 'mentor',
        mentorId: 'buffett',
        mentorName: 'Warren Buffett',
        content: 'Moats matter.',
        facts: { entityName: 'Personal' },
        attachments: [{ id: 'doc-1', filename: 'bank.csv', mimeType: 'text/csv', byteSize: 120 }],
        createdAt: '2026-10-01T00:00:05.000Z'
    },
    {
        id: 'a1',
        role: 'action_confirm',
        actionIntent: { action: 'add_asset', name: 'Savings', amount: 5000, currency: 'USD' },
        actionIntentResolved: 'confirmed',
        createdAt: '2026-10-01T00:00:06.000Z'
    },
    { id: 'c1', role: 'consensus', content: 'Consensus: stay boring.', createdAt: '2026-10-01T00:00:07.000Z' }
];

describe('sessionToMarkdown', () => {
    it('renders a title heading and one labeled section per bubble', () => {
        const md = sessionToMarkdown('Moats and margins', messages);
        expect(md.startsWith('# Moats and margins\n')).toBe(true);
        expect(md).toContain('**You** · 2026-10-01T00:00:00.000Z');
        expect(md).toContain('**Warren Buffett** · 2026-10-01T00:00:05.000Z');
        expect(md).toContain('**Consensus Board**');
        expect(md).toContain('Moats matter.');
        expect(md).toContain('Consensus: stay boring.');
    });

    it('renders resolved action chips as plain text and lists attachments', () => {
        const md = sessionToMarkdown('Title', messages);
        expect(md).toContain('Add New Asset: Savings — 5000 USD (confirmed)');
        expect(md).toContain('📎 bank.csv (text/csv, 120 B)');
    });

    it('marks unresolved actions as pending and falls back for unknown actions', () => {
        const md = sessionToMarkdown('Title', [
            { id: 'a1', role: 'action_confirm', actionIntent: { action: 'delete_everything' }, createdAt: '2026-10-01T00:00:00.000Z' }
        ]);
        expect(md).toContain('Data action (pending)');
    });

    it('uses a fallback title when blank', () => {
        expect(sessionToMarkdown('', messages).startsWith('# Mentor conversation')).toBe(true);
    });
});

describe('sessionToJson', () => {
    it('round-trips through JSON.parse with every message field intact', () => {
        const json = sessionToJson('Moats and margins', messages);
        const parsed = JSON.parse(json);
        expect(parsed.app).toBe('OpenNetWorth');
        expect(parsed.kind).toBe('mentor_chat_export');
        expect(parsed.version).toBe(1);
        expect(parsed.title).toBe('Moats and margins');
        expect(parsed.messages.map((m: any) => m.id)).toEqual(['u1', 'm1', 'a1', 'c1']);
        expect(parsed.messages[1].mentorName).toBe('Warren Buffett');
        expect(parsed.messages[1].attachments[0].filename).toBe('bank.csv');
        expect(parsed.messages[2].actionIntent.name).toBe('Savings');
        expect(parsed.messages[2].actionIntentResolved).toBe('confirmed');
    });

    it('never carries React-internal or JSX keys (icons would break serialization)', () => {
        // A mentor object with a JSX icon must not leak into the export.
        const withIcon = messages.map(m => ({ ...m, icon: { $$typeof: Symbol.for('react.element') } } as any));
        const parsed = JSON.parse(sessionToJson('Title', withIcon));
        for (const msg of parsed.messages) {
            expect(msg.icon).toBeUndefined();
            expect(Object.keys(msg)).not.toContain('$$typeof');
        }
    });
});

describe('safeFilename', () => {
    it('slugifies titles and falls back on empty input', () => {
        expect(safeFilename('Moats and margins!')).toBe('moats-and-margins');
        expect(safeFilename('   ')).toBe('export');
        expect(safeFilename('***', 'mentor-chat')).toBe('mentor-chat');
        expect(safeFilename('x'.repeat(100)).length).toBeLessThanOrEqual(60);
    });
});
