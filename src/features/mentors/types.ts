/**
 * Why this file exists:
 * Mentor chat messages used to be an anonymous inline type in MentorsPage with no
 * stable identity — bubbles were keyed by array index, which breaks once messages
 * can be deleted, regenerated, or restored from a saved session. This is the single
 * shared shape for a chat message, used by MentorsPage (state), ChatInterface
 * (rendering), the session service (persistence), and the exporters.
 */

export type MentorChatRole = 'user' | 'mentor' | 'consensus' | 'action_confirm';

export interface MentorChatAttachment {
    /** m1_documents row id — raw bytes are served by GET /api/documents/raw?id= */
    id: string;
    filename: string;
    mimeType: string;
    byteSize: number;
}

export interface MentorChatMessage {
    /** crypto.randomUUID() — stable React key and delete/regenerate target */
    id: string;
    role: MentorChatRole;
    content?: string;
    mentorId?: string;
    mentorName?: string;
    actionIntent?: any;
    facts?: any;
    pendingIntent?: any;
    createdAt: string;
    /**
     * Set once an action_confirm card has been answered. Restored sessions render a
     * static chip instead of live Confirm/Cancel buttons so a refresh can never
     * re-execute an asset/liability/goal add.
     */
    actionIntentResolved?: 'confirmed' | 'cancelled';
    attachments?: MentorChatAttachment[];
}

/** A prior turn forwarded to /api/mentor so the local LLM sees conversation context. */
export interface MentorHistoryTurn {
    role: 'user' | 'assistant';
    content: string;
}

/** One row of the Chat History sidebar (GET /api/mentor/sessions). */
export interface MentorSessionSummary {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
    message_count: number;
}
