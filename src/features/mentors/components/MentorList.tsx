'use client';

import { ShieldCheck, Plus, Settings as SettingsIcon, Trash2, Info } from 'lucide-react';

interface MentorListProps {
    staticMentors: any[];
    customMentors: any[];
    selectedMentorIds: string[];
    onToggle: (id: string) => void;
    onDeleteCustom: (id: string) => void;
    onOpenAddModal: () => void;
    onOpenSettings: () => void;
}

export default function MentorList({
    staticMentors,
    customMentors,
    selectedMentorIds,
    onToggle,
    onDeleteCustom,
    onOpenAddModal,
    onOpenSettings
}: MentorListProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">AI Mentors</h2>
                    <p className="text-slate-700 mt-2 font-medium">Consult your private board (Multi-select active).</p>
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

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <Info className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Board Mode:</strong> Select multiple mentors to triangulate wisdom. Responses are provided individually, followed by a combined summary.
                </p>
            </div>
        </div>
    );
}
