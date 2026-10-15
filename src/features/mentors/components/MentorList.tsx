'use client';

import { ShieldCheck, Plus, Settings as SettingsIcon, Trash2, Info, MessageSquare, FileDown, FileJson } from 'lucide-react';
import { MentorSessionSummary } from '@/features/mentors/types';

interface MentorListProps {
    staticMentors: any[];
    customMentors: any[];
    selectedMentorIds: string[];
    onToggle: (id: string) => void;
    onDeleteCustom: (id: string) => void;
    onOpenAddModal: () => void;
    onOpenSettings: () => void;
    // Chat History (optional so the sidebar keeps rendering before sessions load)
    sessions?: MentorSessionSummary[];
    currentSessionId?: string | null;
    onNewChat?: () => void;
    onSelectSession?: (id: string) => void;
    onDeleteSession?: (id: string) => void;
    onExportSession?: (id: string, format: 'markdown' | 'json') => void;
}

/** Compact relative timestamp for Chat History rows ("just now", "5m", "3h", "12d", else date). */
function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    return new Date(then).toLocaleDateString();
}

export default function MentorList({
    staticMentors,
    customMentors,
    selectedMentorIds,
    onToggle,
    onDeleteCustom,
    onOpenAddModal,
    onOpenSettings,
    sessions,
    currentSessionId,
    onNewChat,
    onSelectSession,
    onDeleteSession,
    onExportSession
}: MentorListProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">AI Mentors</h2>
                    <p className="text-muted-foreground mt-2 font-medium">Consult your private board (Multi-select active).</p>
                </div>
                <button
                    onClick={onOpenSettings}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                    title="Mentor Controls"
                >
                    <SettingsIcon size={20} />
                </button>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Standard Board</p>
                {staticMentors.map((m) => {
                    const isSelected = selectedMentorIds.includes(m.id);
                    return (
                        <button
                            key={m.id}
                            onClick={() => onToggle(m.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all relative ${isSelected
                                ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-50 ring-inset'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {isSelected && (
                                <div className="absolute top-4 right-4 text-blue-600">
                                    <ShieldCheck size={18} fill="currentColor" className="text-blue-100" />
                                </div>
                            )}
                            <div className="flex items-center gap-3 mb-1">
                                {m.icon}
                                <span className="font-bold text-slate-950">{m.name}</span>
                            </div>
                            <p className="text-xs text-slate-700 font-medium">{m.description}</p>
                        </button>
                    );
                })}

                {customMentors.length > 0 && (
                    <>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 pt-2">Custom Figures</p>
                        {customMentors.map((m) => {
                            const isSelected = selectedMentorIds.includes(m.id);
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => onToggle(m.id)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all relative group cursor-pointer ${isSelected
                                        ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-50 ring-inset'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        {isSelected && (
                                            <ShieldCheck size={18} fill="currentColor" className="text-blue-100 text-blue-600" />
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteCustom(m.id);
                                            }}
                                            className="p-1.5 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                                            title="Delete Mentor"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3 mb-1">
                                        {m.icon}
                                        <span className="font-bold text-slate-950">{m.name}</span>
                                    </div>
                                    <p className="text-xs text-slate-700 font-medium">{m.description}</p>
                                </div>
                            );
                        })}
                    </>
                )}

                <button
                    onClick={onOpenAddModal}
                    className="w-full group p-4 rounded-2xl border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-2"
                >
                    <div className="p-2 bg-slate-100 group-hover:bg-blue-100 rounded-full transition-colors text-slate-400 group-hover:text-blue-600">
                        <Plus size={20} />
                    </div>
                    <span className="text-xs font-black text-slate-500 group-hover:text-blue-600 uppercase">Add Your Own Mentor</span>
                </button>
            </div>

            {/* Chat History — persisted conversations (mentor_sessions) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between pr-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Chat History</p>
                    {onNewChat && (
                        <button
                            onClick={onNewChat}
                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors"
                        >
                            + New Chat
                        </button>
                    )}
                </div>

                {(sessions?.length ?? 0) === 0 ? (
                    <p className="text-xs text-slate-400 font-medium pl-1">No saved conversations yet.</p>
                ) : (
                    sessions!.map((s) => {
                        const isCurrent = s.id === currentSessionId;
                        return (
                            <div
                                key={s.id}
                                onClick={() => onSelectSession?.(s.id)}
                                className={`w-full text-left p-3.5 rounded-2xl border transition-all relative group cursor-pointer ${isCurrent
                                    ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-50 ring-inset'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <div className="absolute top-3 right-2.5 flex items-center gap-0.5">
                                    {onExportSession && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onExportSession(s.id, 'markdown');
                                                }}
                                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-700 transition-all opacity-0 group-hover:opacity-100 z-10"
                                                title="Export as Markdown"
                                                aria-label="Export conversation as Markdown"
                                            >
                                                <FileDown size={15} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onExportSession(s.id, 'json');
                                                }}
                                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-300 hover:text-slate-700 transition-all opacity-0 group-hover:opacity-100 z-10"
                                                title="Export as JSON"
                                                aria-label="Export conversation as JSON"
                                            >
                                                <FileJson size={15} />
                                            </button>
                                        </>
                                    )}
                                    {onDeleteSession && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteSession(s.id);
                                            }}
                                            className="p-1.5 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                                            title="Delete Conversation"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mb-0.5 pr-24">
                                    <MessageSquare size={14} className={isCurrent ? 'text-blue-600 shrink-0' : 'text-slate-400 shrink-0'} />
                                    <span className="font-bold text-slate-950 text-sm truncate">{s.title}</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium pl-[22px]">
                                    {s.message_count} {s.message_count === 1 ? 'message' : 'messages'} · {timeAgo(s.updated_at)}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <Info className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Board Mode:</strong> Select multiple mentors to triangulate wisdom. Responses are provided individually, followed by a combined summary.
                </p>
            </div>
        </div>
    );
}
