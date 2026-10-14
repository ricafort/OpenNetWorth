'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, Copy, FileDown, FileJson, FileText, MessageSquare, Paperclip, RefreshCw, Send, Trash2, XCircle, X } from 'lucide-react';
import ActionConfirmCard from '@/components/ui/ActionConfirmCard';
import RichText from '@/features/mentors/components/RichText';
import { formatCurrency } from '@/lib/utils/currencyService';
import { MentorChatAttachment } from '@/features/mentors/types';

import { CurrencyCode } from '@/types';

/** Compact size label for attachment chips ("120 B", "3.4 KB", "2.1 MB"). */
function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Human labels for resolved action_confirm chips (mirrors ActionConfirmCard headings). */
const ACTION_LABELS: Record<string, string> = {
    add_asset: 'Add New Asset',
    add_liability: 'Add New Liability',
    add_goal: 'Add New Goal'
};

interface ChatInterfaceProps {
    // TUTORIAL: This is a "Presentational Component".
    // It receives all data (chat, activeMentors) and callbacks (onSend, onSetInput) via props.
    // It has NO dependency on the API layer or complex logic. This makes it easy to test and preview (Storybook).
    chat: any[];
    isLoading: boolean;
    input: string;
    mode: 'reflect' | 'learn';
    activeMentors: any[];
    baseCurrency: CurrencyCode;
    onSetMode: (mode: 'reflect' | 'learn') => void;
    onSetInput: (val: string) => void;
    onSend: () => void;
    onActionConfirm: (intent: any) => void;
    onActionCancel: () => void;
    entities?: any[];
    onResolveIntent?: (intent: any, entityId: string) => void;
    // Message actions (hover-revealed). Regenerate is offered only on the bubble
    // whose id matches lastAssistantId — the page computes that.
    onCopyMessage?: (id: string) => void;
    onDeleteMessage?: (id: string) => void;
    onRegenerate?: () => void;
    lastAssistantId?: string;
    /** Export the whole visible transcript (Markdown or JSON) — header buttons. */
    onExportChat?: (format: 'markdown' | 'json') => void;
    // Attachments (Phase 4): files chosen but not yet sent live in `pendingAttachments`;
    // the page uploads them via /api/mentor/attachments and attaches the result to the
    // next user message.
    pendingAttachments?: MentorChatAttachment[];
    isUploading?: boolean;
    onAttachFiles?: (files: FileList) => void;
    onRemovePendingAttachment?: (id: string) => void;
}

export default function ChatInterface({
    chat,
    isLoading,
    input,
    mode,
    activeMentors,
    baseCurrency,
    onSetMode,
    onSetInput,
    onSend,
    onActionConfirm,
    onActionCancel,
    entities = [],
    onResolveIntent,
    onCopyMessage,
    onDeleteMessage,
    onRegenerate,
    lastAssistantId,
    onExportChat,
    pendingAttachments = [],
    isUploading = false,
    onAttachFiles,
    onRemovePendingAttachment
}: ChatInterfaceProps) {

    // The message list has its own vertical scroll (the panel is pinned to the
    // viewport height on desktop), so keep it glued to the bottom as messages
    // arrive and while the typing indicator is up.
    const bottomRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [chat.length, isLoading]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onSend();
    };

    return (
        <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[600px] lg:h-auto min-h-[500px]">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 overflow-hidden">
                        {activeMentors.map(m => (
                            <div key={m.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-white p-1 shadow-sm border border-slate-100 flex items-center justify-center">
                                {m.icon}
                            </div>
                        ))}
                    </div>
                    <div className="ml-2">
                        <h3 className="font-bold text-slate-950 leading-tight">Board Consultation</h3>
                        <p className="text-xs text-slate-800 uppercase tracking-widest font-black">
                            {activeMentors.length === 1 ? 'Single Perspective' : `${activeMentors.length} MENTORS ACTIVE`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                {onExportChat && chat.length > 0 && (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onExportChat('markdown')}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Export chat as Markdown"
                            aria-label="Export chat as Markdown"
                        >
                            <FileDown size={16} />
                        </button>
                        <button
                            onClick={() => onExportChat('json')}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Export chat as JSON"
                            aria-label="Export chat as JSON"
                        >
                            <FileJson size={16} />
                        </button>
                    </div>
                )}
                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => onSetMode('reflect')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'reflect' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        REFLECT
                    </button>
                    <button
                        onClick={() => onSetMode('learn')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'learn' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        LEARN
                    </button>
                </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                {chat.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-10">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                <MessageSquare className="text-slate-300" size={32} />
                            </div>
                            <div className="max-w-xs mx-auto">
                                <h4 className="text-slate-900 font-bold mb-1">Your Personal Board</h4>
                                <p className="text-slate-500 text-sm">
                                    Ask for advice or simply tell them to update your financial data.
                                </p>
                            </div>
                        </div>

                        <div className="w-full max-w-sm space-y-3 px-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Try saying...</p>
                            {[
                                `💰 Add a savings account with ${formatCurrency(5000, baseCurrency)}`,
                                "📈 Log a new investment in Tesla",
                                `🏠 Track my home value at ${formatCurrency(450000, baseCurrency)}`,
                                `💳 Add a credit card balance of ${formatCurrency(1200, baseCurrency)}`
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSetInput(suggestion.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim())}
                                    className="w-full text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-700 text-sm font-medium transition-all group flex items-center gap-3"
                                >
                                    <span className="text-lg opacity-80 group-hover:opacity-100 transition-opacity">{suggestion.split(' ')[0]}</span>
                                    <span>{suggestion.substring(2)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {chat.map((msg, idx) => (
                    <div key={msg.id ?? idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'action_confirm' ? (
                            msg.actionIntentResolved ? (
                                // Resolved card (e.g. restored from a saved session): render a
                                // static chip — live Confirm/Cancel buttons must never reappear,
                                // or a refresh could re-execute an already-applied financial add.
                                <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-bold ${msg.actionIntentResolved === 'confirmed'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-500'
                                    }`}>
                                    {msg.actionIntentResolved === 'confirmed'
                                        ? <CheckCircle2 size={16} className="text-emerald-600" />
                                        : <XCircle size={16} className="text-slate-400" />}
                                    <span>
                                        {ACTION_LABELS[msg.actionIntent?.action] || 'Data action'}
                                        {msg.actionIntentResolved === 'confirmed' ? ' — confirmed' : ' — cancelled'}
                                    </span>
                                </div>
                            ) : (
                                <ActionConfirmCard
                                    intent={msg.actionIntent}
                                    onConfirm={() => onActionConfirm(msg.actionIntent)}
                                    onCancel={onActionCancel}
                                />
                            )
                        ) : (
                            <div className="max-w-[85%] group">
                            <div className={`p-4 rounded-2xl ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100 shadow-lg'
                                : msg.role === 'consensus'
                                    ? 'bg-slate-900 text-slate-100 border-2 border-blue-500 shadow-lg'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                                }`}>
                                {msg.mentorName && (
                                    <p className="text-[10px] font-black uppercase tracking-tighter text-blue-600 mb-1">{msg.mentorName}</p>
                                )}
                                {msg.role === 'user' ? (
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <RichText content={msg.content} className="text-sm leading-relaxed" />
                                )}

                                {/* Attached files: images render inline from /api/documents/raw,
                                    everything else as a chip. Rows are shared m1_documents —
                                    deleting this message never deletes the underlying file. */}
                                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {msg.attachments.map((att: MentorChatAttachment) => (
                                            att.mimeType?.startsWith('image/') ? (
                                                <img
                                                    key={att.id}
                                                    src={`/api/documents/raw?id=${encodeURIComponent(att.id)}`}
                                                    alt={att.filename}
                                                    className="max-h-40 max-w-[220px] rounded-lg border border-slate-200 object-cover"
                                                />
                                            ) : (
                                                <span
                                                    key={att.id}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${msg.role === 'user' ? 'bg-white/20 border-white/30 text-white' : 'bg-white/70 border-slate-200 text-slate-700'}`}
                                                >
                                                    <FileText size={13} className={msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'} />
                                                    <span className="max-w-[160px] truncate">{att.filename}</span>
                                                    <span className={msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'}>{formatBytes(att.byteSize)}</span>
                                                </span>
                                            )
                                        ))}
                                    </div>
                                )}

                                {msg.facts && (
                                    <div className="mt-4 p-3 bg-white/50 border border-slate-200 rounded-lg text-sm">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200">
                                            <span className="font-bold text-slate-800">Verified Facts</span>
                                            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {msg.facts.entityName} | {msg.facts.periodLabel}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            {Object.entries(msg.facts.formattedTotals || {}).map(([curr, formatted]) => (
                                                <div key={curr} className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-600 font-medium">Total Expenses ({curr})</span>
                                                    <span className="font-bold text-slate-900">
                                                        {formatted as string}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                                            <p className="text-xs text-slate-500">Based on {msg.facts.transactionIds?.length || 0} supporting transactions.</p>
                                            <div className="flex gap-2">
                                                <a 
                                                    href={`/accounting?view=events${msg.facts.entityId ? `&entity_id=${msg.facts.entityId}` : ''}${msg.facts.startDate ? `&start_date=${msg.facts.startDate}` : ''}${msg.facts.endDate ? `&end_date=${msg.facts.endDate}` : ''}&intent=spending`}
                                                    className="text-xs font-bold text-blue-600 hover:underline"
                                                >
                                                    View Source Records →
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {msg.pendingIntent && msg.pendingIntent.type === 'spending_clarification' && entities.length > 0 && onResolveIntent && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                                        <p className="font-bold text-blue-900 mb-2">Select the entity to calculate spending for:</p>
                                        <div className="flex flex-col gap-2">
                                            <button
                                                onClick={() => onResolveIntent(msg.pendingIntent, 'all')}
                                                className="text-left px-3 py-2 bg-white border border-blue-200 rounded-lg text-blue-800 hover:bg-blue-100 transition-colors text-xs font-medium"
                                            >
                                                All Accounts
                                            </button>
                                            {entities.map(e => (
                                                <button
                                                    key={e.id}
                                                    onClick={() => onResolveIntent(msg.pendingIntent, e.id)}
                                                    className="text-left px-3 py-2 bg-white border border-blue-200 rounded-lg text-blue-800 hover:bg-blue-100 transition-colors text-xs font-medium"
                                                >
                                                    {e.name} {e.type ? `(${e.type})` : ''}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Hover-revealed message actions (same reveal pattern as the
                                mentor-list delete button). Regenerate only on the last
                                assistant-side bubble; copy only where there is text. */}
                            {((msg.content && onCopyMessage) || (onRegenerate && msg.id === lastAssistantId) || onDeleteMessage) && (
                                <div className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.content && onCopyMessage && (
                                        <button
                                            onClick={() => onCopyMessage(msg.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                            title="Copy message"
                                            aria-label="Copy message"
                                        >
                                            <Copy size={13} />
                                        </button>
                                    )}
                                    {onRegenerate && msg.id === lastAssistantId && (
                                        <button
                                            onClick={() => onRegenerate()}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                            title="Regenerate response"
                                            aria-label="Regenerate response"
                                        >
                                            <RefreshCw size={13} />
                                        </button>
                                    )}
                                    {onDeleteMessage && (
                                        <button
                                            onClick={() => onDeleteMessage(msg.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Delete message"
                                            aria-label="Delete message"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            )}
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 animate-pulse flex gap-2">
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
                {/* Auto-scroll sentinel — the effect above scrolls this into view. */}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                {onAttachFiles && (
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <label
                            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
                            title="Attach files (text/CSV, images, PDF — max 4, 10 MB each)"
                        >
                            <input
                                type="file"
                                multiple
                                accept=".csv,.txt,.md,.log,text/*,image/png,image/jpeg,image/webp,image/gif,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) onAttachFiles(e.target.files);
                                    e.target.value = '';
                                }}
                            />
                            <Paperclip size={16} />
                        </label>
                        {isUploading && <span className="text-xs text-slate-400 font-medium">Attaching…</span>}
                        {pendingAttachments.map((att) => (
                            <span key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700">
                                <FileText size={13} className="text-slate-400" />
                                <span className="max-w-[140px] truncate">{att.filename}</span>
                                {onRemovePendingAttachment && (
                                    <button
                                        onClick={() => onRemovePendingAttachment(att.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        aria-label={`Remove ${att.filename}`}
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                )}
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => onSetInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'learn' ? "Explain liquidity ratio..." : "Ask your board a question..."}
                        className="w-full bg-card text-card-foreground border border-border rounded-2xl py-4 pl-6 pr-16 outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all placeholder:text-muted-foreground"
                    />
                    <button
                        id="chat-send-btn"
                        onClick={() => onSend()}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-2 p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
