/**
 * Why this file exists:
 * Exporting a saved mentor conversation to Markdown or JSON must be testable
 * without a DOM and identical whether it is triggered from a Chat History row or
 * the chat header — so the serializers are pure functions here, and the only
 * side effect (the actual download) lives in downloadBlob.
 *
 * Invariants the tests guard:
 * - Markdown has a `# title` heading, one section per bubble with a role label,
 *   and resolved action chips rendered as plain text (never live buttons).
 * - JSON round-trips through JSON.parse and never carries React/JSX-only keys.
 */

import { MentorChatMessage } from '../types';

const ACTION_LABELS: Record<string, string> = {
    add_asset: 'Add New Asset',
    add_liability: 'Add New Liability',
    add_goal: 'Add New Goal'
};

function roleLabel(msg: MentorChatMessage): string {
    switch (msg.role) {
        case 'user': return 'You';
        case 'mentor': return msg.mentorName || 'Mentor';
        case 'consensus': return 'Consensus Board';
        case 'action_confirm': return 'Action';
        default: return 'Unknown';
    }
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** One-line human description of an action intent + its resolution, for Markdown. */
function describeAction(msg: MentorChatMessage): string {
    const intent = msg.actionIntent || {};
    const label = ACTION_LABELS[intent.action] || 'Data action';
    const details = [
        intent.name,
        intent.amount != null ? `${intent.amount}${intent.currency ? ` ${intent.currency}` : ''}` : null
    ].filter(Boolean).join(' — ');
    const resolved = msg.actionIntentResolved
        ? ` (${msg.actionIntentResolved})`
        : ' (pending)';
    return `${label}${details ? `: ${details}` : ''}${resolved}`;
}

/**
 * Render the transcript as Markdown. Bubbles with no text (e.g. an action card)
 * still get a section so the export mirrors the visible chat order.
 */
export function sessionToMarkdown(title: string, messages: MentorChatMessage[]): string {
    const lines: string[] = [
        `# ${title || 'Mentor conversation'}`,
        '',
        `_Exported from OpenNetWorth on ${new Date().toISOString()}_`,
        ''
    ];
    for (const msg of messages) {
        lines.push('---', '');
        lines.push(`**${roleLabel(msg)}** · ${msg.createdAt}`);
        lines.push('');
        if (msg.role === 'action_confirm') {
            lines.push(describeAction(msg));
        } else if (msg.content) {
            lines.push(msg.content);
        }
        if (msg.attachments?.length) {
            lines.push('');
            for (const att of msg.attachments) {
                lines.push(`📎 ${att.filename} (${att.mimeType}, ${formatBytes(att.byteSize)})`);
            }
        }
        lines.push('');
    }
    return lines.join('\n').trimEnd() + '\n';
}

/**
 * Render the transcript as JSON. Messages are copied field-by-field so nothing
 * React-internal (keys, refs) can ever leak into the file, and undefined values
 * drop out naturally via JSON.stringify.
 */
export function sessionToJson(title: string, messages: MentorChatMessage[]): string {
    const payload = {
        app: 'OpenNetWorth',
        kind: 'mentor_chat_export',
        version: 1,
        title: title || 'Mentor conversation',
        exportedAt: new Date().toISOString(),
        messages: messages.map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            mentorId: msg.mentorId,
            mentorName: msg.mentorName,
            actionIntent: msg.actionIntent,
            facts: msg.facts,
            actionIntentResolved: msg.actionIntentResolved,
            attachments: msg.attachments,
            createdAt: msg.createdAt
        }))
    };
    return JSON.stringify(payload, null, 2) + '\n';
}
