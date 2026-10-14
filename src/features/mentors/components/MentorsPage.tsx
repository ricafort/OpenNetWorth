'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from 'lucide-react';
import { MentorChatAttachment, MentorChatMessage, MentorHistoryTurn, MentorSessionSummary } from '@/features/mentors/types';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { downloadBlob, safeFilename } from '@/lib/utils/download';
import { sessionToJson, sessionToMarkdown } from '@/features/mentors/utils/chatExport';
import MentorSettings from '@/features/dashboard/modals/MentorSettings';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useGoalsQuery } from '@/features/goals/hooks/useGoalsQuery';
import { useProfile } from '@/contexts/ProfileContext';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';
import { Goal } from '@/features/goals/types';
import { STATIC_MENTORS } from '@/features/mentors/data/mentors';

import ChatInterface from '@/features/mentors/components/ChatInterface';
import MentorList from '@/features/mentors/components/MentorList';
import AddMentorModal from '@/features/mentors/components/AddMentorModal';

export const MentorsPage = () => {
    const [customMentors, setCustomMentors] = useState<any[]>([]);
    const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([STATIC_MENTORS[0].id]);
    const [mode, setMode] = useState<'learn' | 'reflect'>('reflect');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Domain Hooks
    const { netWorth, assets: totalAssets, liabilities: totalLiabilities, baseCurrency } = useNetWorth();
    const { addAsset } = useAssetsQuery();
    const { addLiability } = useLiabilitiesQuery();
    const { addGoal } = useGoalsQuery();
    const { profile } = useProfile();

    const metrics = {
        netWorth,
        assets: totalAssets,
        liabilities: totalLiabilities
    };

    // Chat State — every message carries a stable id + createdAt so bubbles can be
    // copied, deleted, regenerated, and persisted/restored without index keys.
    const [chat, setChat] = useState<MentorChatMessage[]>([]);

    // Session persistence — conversations live in SQLite (m1_mentor_sessions /
    // m1_mentor_messages) via /api/mentor/sessions. `hydrated` gates the persist
    // effect until the initial restore finishes so we never overwrite the latest
    // stored session with the empty startup state.
    const [sessions, setSessions] = useState<MentorSessionSummary[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);

    // Attachments chosen but not yet sent — uploaded to m1_documents immediately via
    // /api/mentor/attachments, then attached to the next user message.
    const [pendingAttachments, setPendingAttachments] = useState<MentorChatAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const newMessage = (partial: Omit<MentorChatMessage, 'id' | 'createdAt'>): MentorChatMessage => ({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...partial
    });

    const refreshSessions = async () => {
        try {
            const resp = await fetch('/api/mentor/sessions');
            if (!resp.ok) return;
            const data = await resp.json();
            if (Array.isArray(data.sessions)) setSessions(data.sessions);
        } catch (e) {
            console.error('Failed to refresh mentor chat history:', e);
        }
    };

    // On mount: list sessions and restore the most recently updated one.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const resp = await fetch('/api/mentor/sessions');
                if (!resp.ok) return;
                const data = await resp.json();
                const list: MentorSessionSummary[] = Array.isArray(data.sessions) ? data.sessions : [];
                if (!cancelled) setSessions(list);
                if (list.length > 0) {
                    const detailResp = await fetch(`/api/mentor/sessions?id=${encodeURIComponent(list[0].id)}`);
                    if (!detailResp.ok) return;
                    const detail = await detailResp.json();
                    if (!cancelled && Array.isArray(detail.messages)) {
                        setChat(detail.messages);
                        setCurrentSessionId(list[0].id);
                    }
                }
            } catch (e) {
                console.error('Failed to restore mentor chat:', e);
            } finally {
                if (!cancelled) setHydrated(true);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    // Debounced full-replace persist of the current chat. Skipped before hydration
    // and for empty chats so New Chat never leaves an empty session behind.
    useEffect(() => {
        if (!hydrated || chat.length === 0) return;
        const timer = setTimeout(async () => {
            try {
                const firstUser = chat.find(m => m.role === 'user' && m.content);
                const resp = await fetch('/api/mentor/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...(currentSessionId ? { id: currentSessionId } : {}),
                        title: (firstUser?.content || 'New conversation').slice(0, 60),
                        messages: chat
                    })
                });
                if (!resp.ok) return;
                const data = await resp.json();
                if (data.session?.id) {
                    setCurrentSessionId(prev => prev ?? data.session.id);
                }
                void refreshSessions();
            } catch (e) {
                console.error('Failed to persist mentor chat:', e);
            }
        }, 800);
        return () => clearTimeout(timer);
    }, [chat, currentSessionId, hydrated]);

    const handleNewChat = () => {
        if (isLoading) return;
        setChat([]);
        setCurrentSessionId(null);
        setInput('');
        setPendingAttachments([]);
    };

    const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

    const handleAttachFiles = async (files: FileList) => {
        const room = 4 - pendingAttachments.length;
        if (room <= 0) {
            alert('At most 4 files per message.');
            return;
        }
        const chosen = Array.from(files).slice(0, room);
        const oversized = chosen.filter(f => f.size > MAX_ATTACHMENT_BYTES);
        if (oversized.length > 0) {
            alert(`File exceeds 10 MB limit: ${oversized.map(f => f.name).join(', ')}`);
        }
        const accepted = chosen.filter(f => f.size > 0 && f.size <= MAX_ATTACHMENT_BYTES);
        if (accepted.length === 0) return;

        setIsUploading(true);
        try {
            const payload = await Promise.all(accepted.map(f => new Promise<{ filename: string; mimeType: string; dataBase64: string }>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({
                    filename: f.name,
                    mimeType: f.type || 'application/octet-stream',
                    dataBase64: String(reader.result).split(',')[1] || ''
                });
                reader.onerror = () => reject(new Error(`Could not read ${f.name}`));
                reader.readAsDataURL(f);
            })));

            const resp = await fetch('/api/mentor/attachments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: payload })
            });
            const data = await resp.json();
            if (!resp.ok) {
                alert(data.error || 'Failed to attach files.');
                return;
            }
            setPendingAttachments(prev => [...prev, ...(data.attachments || [])].slice(0, 4));
            if (Array.isArray(data.disclosures) && data.disclosures.length > 0) {
                console.info('Attachment disclosures:', data.disclosures);
            }
        } catch (e) {
            console.error('Failed to upload attachments:', e);
            alert('Failed to attach files.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemovePendingAttachment = (id: string) => {
        setPendingAttachments(prev => prev.filter(a => a.id !== id));
    };

    const handleSelectSession = async (id: string) => {
        if (isLoading || id === currentSessionId) return;
        try {
            const resp = await fetch(`/api/mentor/sessions?id=${encodeURIComponent(id)}`);
            if (!resp.ok) return;
            const data = await resp.json();
            if (Array.isArray(data.messages)) {
                setChat(data.messages);
                setCurrentSessionId(id);
            }
        } catch (e) {
            console.error('Failed to load mentor session:', e);
        }
    };

    // ---- Export (Markdown / JSON) — pure serializers + downloadBlob, no server round-trip
    const exportTranscript = (title: string, messages: MentorChatMessage[], format: 'markdown' | 'json') => {
        const date = new Date().toISOString().split('T')[0];
        const base = `${safeFilename(title, 'mentor-chat')}-${date}`;
        if (format === 'markdown') {
            downloadBlob(sessionToMarkdown(title, messages), `${base}.md`, 'text/markdown');
        } else {
            downloadBlob(sessionToJson(title, messages), `${base}.json`, 'application/json');
        }
    };

    const handleExportChat = (format: 'markdown' | 'json') => {
        if (chat.length === 0) return;
        const firstUser = chat.find(m => m.role === 'user' && m.content);
        exportTranscript((firstUser?.content || 'Mentor conversation').slice(0, 60), chat, format);
    };

    const handleExportSession = async (id: string, format: 'markdown' | 'json') => {
        try {
            const resp = await fetch(`/api/mentor/sessions?id=${encodeURIComponent(id)}`);
            if (!resp.ok) return;
            const data = await resp.json();
            if (!Array.isArray(data.messages)) return;
            exportTranscript(data.session?.title || 'Mentor conversation', data.messages, format);
        } catch (e) {
            console.error('Failed to export mentor session:', e);
        }
    };

    const handleDeleteSession = async (id: string) => {
        if (!confirm('Delete this conversation? This cannot be undone.')) return;
        try {
            await fetch(`/api/mentor/sessions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (id === currentSessionId) {
                setChat([]);
                setCurrentSessionId(null);
            }
            await refreshSessions();
        } catch (e) {
            console.error('Failed to delete mentor session:', e);
        }
    };

    const allMentors = [...STATIC_MENTORS, ...customMentors];
    const activeMentors = allMentors.filter(m => selectedMentorIds.includes(m.id));

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('custom_mentors');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Re-attach icons
                const withIcons = parsed.map((m: any) => ({
                    ...m,
                    icon: <User size={20} className="text-slate-500" />
                }));
                setCustomMentors(withIcons);
            } catch (e) { console.error('Failed to load mentors'); }
        }
    }, []);

    useEffect(() => {
        const toSave = customMentors.map(({ icon, ...rest }) => rest);
        localStorage.setItem('custom_mentors', JSON.stringify(toSave));
    }, [customMentors]);

    const [entities, setEntities] = useState<any[]>([]);
    useEffect(() => {
        fetch('/api/accounting').then(res => res.json()).then(data => {
            if (data.entities) setEntities(data.entities);
        }).catch(console.error);
    }, []);

    const toggleMentor = (id: string) => {
        setSelectedMentorIds(prev =>
            prev.includes(id)
                ? (prev.length > 1 ? prev.filter(mid => mid !== id) : prev)
                : [...prev, id]
        );
    };

    const handleAddCustomMentor = (mentor: any) => {
        setCustomMentors(prev => [...prev, mentor]);
        setSelectedMentorIds(prev => [...prev, mentor.id]);
        setIsModalOpen(false);
    };

    const handleDeleteCustomMentor = (id: string) => {
        if (confirm('Are you sure you want to delete this mentor?')) {
            setCustomMentors(prev => prev.filter(m => m.id !== id));
            setSelectedMentorIds(prev => prev.filter(mid => mid !== id));
        }
    };

    const handleActionConfirm = async (intent: any) => {
        try {
            const parseAmount = (val: any) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;
                return 0;
            };

            const amount = parseAmount(intent.amount);

            if (intent.action === 'add_asset') {
                const newAsset: Asset = {
                    id: crypto.randomUUID(),
                    name: intent.name || 'New Asset',
                    value: amount,
                    type: intent.type || 'other',
                    currency: intent.currency || baseCurrency || 'USD',
                    is_liquid: true,
                    last_updated: new Date().toISOString()
                };
                await addAsset(newAsset);
            } else if (intent.action === 'add_liability') {
                const newLiability: Liability = {
                    id: crypto.randomUUID(),
                    user_id: profile?.id || 'user-1',
                    name: intent.name || 'New Liability',
                    balance: amount,
                    type: intent.type || 'other',
                    currency: intent.currency || baseCurrency || 'USD',
                    interest_rate: 0,
                    minimum_payment: 0,
                    is_good_debt: false,
                    last_updated: new Date().toISOString()
                };
                await addLiability(newLiability);
            } else if (intent.action === 'add_goal') {
                const newGoal: Goal = {
                    id: crypto.randomUUID(),
                    name: intent.name || 'New Goal',
                    target_amount: amount || 10000,
                    current_amount: 0,
                    start_amount: 0,
                    currency: intent.currency || baseCurrency || 'USD',
                    category: 'custom',
                    created_at: new Date().toISOString()
                };
                await addGoal(newGoal);
            }

            let savedName = intent.name;
            if (!savedName) {
                if (intent.action === 'add_asset') savedName = 'New Asset';
                else if (intent.action === 'add_liability') savedName = 'New Liability';
                else if (intent.action === 'add_goal') savedName = 'New Goal';
            }

            // Mark the card resolved (kept in the transcript) instead of removing it —
            // the persisted session then restores it as a static "confirmed" chip, so a
            // refresh can never offer to re-add the same asset.
            markActionConfirmResolved('confirmed');
            setChat(prev => [...prev, newMessage({
                role: 'mentor',
                mentorName: 'System',
                content: `✅ Successfully added **${savedName}** to your dashboard.`
            })]);

        } catch (e) {
            console.error(e);
            alert('Failed to execute action.');
        }
    };

    const handleActionCancel = () => {
        markActionConfirmResolved('cancelled');
    };

    /** Resolves the most recent unanswered action_confirm bubble (there is at most one live at a time). */
    const markActionConfirmResolved = (resolution: 'confirmed' | 'cancelled') => {
        setChat(prev => {
            let idx = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
                if (prev[i].role === 'action_confirm' && !prev[i].actionIntentResolved) { idx = i; break; }
            }
            if (idx === -1) return prev;
            return prev.map((m, i) => (i === idx ? { ...m, actionIntentResolved: resolution } : m));
        });
    };

    /** The last ≤8 conversational turns before `uptoIndex`, mapped to LLM roles. */
    const buildHistory = (uptoIndex: number): MentorHistoryTurn[] =>
        chat
            .slice(0, uptoIndex)
            .filter(m => (m.role === 'user' || m.role === 'mentor' || m.role === 'consensus') && m.content)
            .slice(-8)
            .map(m => ({
                role: m.role === 'user' ? 'user' as const : 'assistant' as const,
                content: m.content!
            }));

    const fetchMentorReply = async (
        mentor: any,
        userMsg: string,
        history: MentorHistoryTurn[],
        pendingContextToUse: any,
        resolvedEntityId: string | undefined,
        localConfig: any,
        attachments?: MentorChatAttachment[]
    ) => {
        // Strip non-serializable React JSX icon property to avoid circular structure JSON serialization error
        const { icon, ...serializableMentor } = mentor;

        const resp = await fetch('/api/mentor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mentor: serializableMentor,
                mode,
                userContext: {
                    netWorth: metrics.netWorth,
                    totalAssets: metrics.assets,
                    totalLiabilities: metrics.liabilities,
                    currency: baseCurrency
                },
                message: userMsg,
                pendingContext: pendingContextToUse,
                resolvedEntityId,
                localConfig,
                // Additive optional field: prior turns so the persona can hold a conversation.
                ...(history.length ? { history } : {}),
                // Additive optional field: m1_documents ids whose extracted text grounds this turn.
                ...(attachments && attachments.length ? { attachments } : {})
            })
        });
        const data = await resp.json();
        const reply = data.response?.trim() || data.error || 'No advice could be generated at this time. Please ensure your Local LLM is active.';
        return { content: reply, facts: data.facts, pendingIntent: data.pending_intent };
    };

    // Runs the full board for one user message: action-parse check first, then the
    // selected mentors in parallel, then the synthetic consensus summary. Shared by
    // handleSend and handleRegenerate so a regenerated answer goes through the same path.
    const runBoard = async (
        userMsg: string,
        history: MentorHistoryTurn[],
        pendingContextToUse: any,
        resolvedEntityId: string | undefined,
        currentSelectedIds: string[],
        turnAttachments?: MentorChatAttachment[]
    ) => {
        setIsLoading(true);
        try {
            const { getSavedLocalAiConfig } = await import('@/components/ui/LocalAiSettingsModal');
            const localConfig = getSavedLocalAiConfig();

            const parseResp = await fetch('/api/action/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, localConfig })
            });
            const intent = await parseResp.json();

            if (intent.action && intent.confidence > 0.7 && ['add_asset', 'add_liability', 'add_goal'].includes(intent.action)) {
                setChat(prev => [...prev, newMessage({ role: 'action_confirm', actionIntent: intent })]);
                return;
            }

            const selectedMentors = allMentors.filter(m => currentSelectedIds.includes(m.id));

            // One mentor at a time: local engines (LM Studio, Ollama) serialize GPU work
            // anyway, and 4 concurrent completions make LM Studio return instant 500s or
            // jam past the 60s client timeout — which surfaced as offline-fallback answers
            // (with the "Local LLM is offline" tip) even while the LLM was running.
            // Each answer lands in the chat as it arrives, so the board fills progressively.
            const responses: { id: string; name: string; content: string; facts?: any; pendingIntent?: any }[] = [];
            for (const m of selectedMentors) {
                const reply = await fetchMentorReply(m, userMsg, history, pendingContextToUse, resolvedEntityId, localConfig, turnAttachments);
                const res = { id: m.id, name: m.name, ...reply };
                responses.push(res);
                setChat(prev => [...prev, newMessage({ role: 'mentor', mentorId: res.id, mentorName: res.name, content: res.content, facts: res.facts, pendingIntent: res.pendingIntent })]);
            }

            if (responses.length > 1) {
                const consensusMsg = `### Consensus Board Summary\n\nBased on the shared wisdom of ${responses.map(r => r.name).join(', ')}, we find common ground.`;
                setChat(prev => [...prev, newMessage({ role: 'consensus', content: consensusMsg })]);
            }
        } catch (e: any) {
            console.error('Mentors chat error:', e);
            setChat(prev => [...prev, newMessage({ role: 'mentor', content: 'Connection error. Ensure your Local LLM (LM Studio on port 1234, Ollama on port 11434, or Strata on port 8080) is running.' })]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (overrideMessage?: string, resolvedPendingContext?: any, resolvedEntityId?: string) => {
        const userMsg = overrideMessage || input;
        if (!userMsg.trim()) return;

        const currentSelectedIds = [...selectedMentorIds];
        if (!overrideMessage) setInput('');

        let pendingContextToUse = resolvedPendingContext;
        if (!pendingContextToUse) {
            const lastMsg = chat[chat.length - 1];
            if (lastMsg?.role === 'mentor' && lastMsg.pendingIntent) {
                pendingContextToUse = lastMsg.pendingIntent;
            }
        }

        // History is everything before this new user message (the message itself is
        // sent as the final `message` field, so it must not appear in history).
        const history = buildHistory(chat.length);
        const turnAttachments = pendingAttachments;
        if (turnAttachments.length > 0) setPendingAttachments([]);
        setChat(prev => [...prev, newMessage({
            role: 'user',
            content: userMsg,
            ...(turnAttachments.length > 0 ? { attachments: turnAttachments } : {})
        })]);

        if (typeof window !== 'undefined') {
            localStorage.setItem('has_used_mentors', 'true');
            window.dispatchEvent(new Event('storage'));
        }

        await runBoard(userMsg, history, pendingContextToUse, resolvedEntityId, currentSelectedIds, turnAttachments);
    };

    // Regenerate targets the last assistant-side bubble. A single mentor reply is
    // re-asked to just that mentor (with history); a consensus summary re-runs the
    // whole board — the summary is a synthetic template, so re-running the board is
    // the only meaningful regeneration for it.
    const handleRegenerate = async () => {
        if (isLoading) return;

        let idx = -1;
        for (let i = chat.length - 1; i >= 0; i--) {
            if (chat[i].role === 'mentor' || chat[i].role === 'consensus') { idx = i; break; }
        }
        if (idx === -1) return;

        let userIdx = -1;
        for (let i = idx - 1; i >= 0; i--) {
            if (chat[i].role === 'user') { userIdx = i; break; }
        }
        if (userIdx === -1) return;

        const target = chat[idx];
        const userMsg = chat[userIdx].content || '';
        const history = buildHistory(userIdx);

        if (target.role === 'mentor' && target.mentorId) {
            const mentor = allMentors.find(m => m.id === target.mentorId);
            if (!mentor) return;
            setIsLoading(true);
            try {
                const { getSavedLocalAiConfig } = await import('@/components/ui/LocalAiSettingsModal');
                const reply = await fetchMentorReply(mentor, userMsg, history, undefined, undefined, getSavedLocalAiConfig(), chat[userIdx].attachments);
                setChat(prev => prev.map(m => m.id === target.id
                    ? { ...m, content: reply.content, facts: reply.facts, pendingIntent: reply.pendingIntent, createdAt: new Date().toISOString() }
                    : m));
            } catch (e) {
                console.error('Mentor regenerate error:', e);
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Consensus (or a mentor reply whose mentor is no longer available): replace
        // the whole assistant-side block that followed the triggering user message.
        setChat(prev => prev.slice(0, userIdx + 1));
        await runBoard(userMsg, history, undefined, undefined, [...selectedMentorIds], chat[userIdx].attachments);
    };

    const handleCopyMessage = async (id: string) => {
        const msg = chat.find(m => m.id === id);
        if (!msg?.content) return;
        await copyToClipboard(msg.content);
    };

    const handleDeleteMessage = (id: string) => {
        setChat(prev => prev.filter(m => m.id !== id));
    };

    // Only the last assistant-side bubble offers Regenerate — older replies stay
    // copyable/deletable but re-running them would duplicate board answers.
    const lastAssistantId = useMemo(() => {
        for (let i = chat.length - 1; i >= 0; i--) {
            if (chat[i].role === 'mentor' || chat[i].role === 'consensus') return chat[i].id;
        }
        return undefined;
    }, [chat]);

    return (
        // At lg the grid is pinned to the viewport (LayoutShell's main uses lg:p-10,
        // so 2 × 2.5rem padding): each column scrolls internally instead of the whole
        // page scrolling. Below lg the columns stack and flow naturally.
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:h-[calc(100vh-5rem)] relative">
            {/* Sidebar — scrolls independently of the chat panel on desktop */}
            <div className="lg:h-full lg:overflow-y-auto lg:pr-2">
                <MentorList
                staticMentors={STATIC_MENTORS}
                customMentors={customMentors}
                selectedMentorIds={selectedMentorIds}
                onToggle={toggleMentor}
                onDeleteCustom={handleDeleteCustomMentor}
                onOpenAddModal={() => setIsModalOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                onExportSession={handleExportSession}
            />
            </div>

            {/* Main Chat */}
            <ChatInterface
                chat={chat}
                isLoading={isLoading}
                input={input}
                mode={mode}
                activeMentors={activeMentors}
                baseCurrency={baseCurrency}
                entities={entities}
                onSetMode={setMode}
                onSetInput={setInput}
                onSend={handleSend}
                onActionConfirm={handleActionConfirm}
                onActionCancel={handleActionCancel}
                onCopyMessage={handleCopyMessage}
                onDeleteMessage={handleDeleteMessage}
                onRegenerate={handleRegenerate}
                lastAssistantId={lastAssistantId}
                onExportChat={handleExportChat}
                pendingAttachments={pendingAttachments}
                isUploading={isUploading}
                onAttachFiles={handleAttachFiles}
                onRemovePendingAttachment={handleRemovePendingAttachment}
                onResolveIntent={(intent, entityId) => {
                    const entityName = entities.find(e => e.id === entityId)?.name || (entityId === 'all' ? 'All Accounts' : entityId);
                    const pseudoMessage = `Use entity: ${entityName}`;
                    handleSend(pseudoMessage, intent, entityId);
                }}
            />

            {/* Modals */}
            <AddMentorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddCustomMentor}
            />

            <MentorSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};
