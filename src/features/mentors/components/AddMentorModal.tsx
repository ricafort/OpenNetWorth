'use client';

import { useState } from 'react';
import { X, Loader2, Sparkles, User } from 'lucide-react';

interface AddMentorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (mentor: any) => void;
}

export default function AddMentorModal({ isOpen, onClose, onAdd }: AddMentorModalProps) {
    const [newMentor, setNewMentor] = useState({
        name: '',
        archetype: '',
        description: '',
        personality_prompt: '',
        quotes: [] as string[]
    });
    const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);

    if (!isOpen) return null;

    const handleGenerateProfile = async () => {
        if (!newMentor.name.trim()) return;
        setIsGeneratingProfile(true);
        try {
            const savedSettings = JSON.parse(localStorage.getItem('mentor_controls') || '{}');

            const resp = await fetch('/api/mentor/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newMentor.name,
                    count: savedSettings.quotesToGenerate || 20
                })
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            setNewMentor(prev => ({
                ...prev,
                archetype: data.archetype,
                description: data.description,
                personality_prompt: data.personality_prompt,
                quotes: data.quotes || []
            }));
        } catch (e) {
            console.error('Generation failed:', e);
        } finally {
            setIsGeneratingProfile(false);
        }
    };

    const handleSubmit = () => {
        if (!newMentor.name || !newMentor.description) return;

        const mentor = {
            ...newMentor,
            id: `custom-${Date.now()}`,
            icon: <User size={20} className="text-slate-500" />
        };
        onAdd(mentor);
        // Reset
        setNewMentor({ name: '', archetype: '', description: '', personality_prompt: '', quotes: [] });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-950">Add Custom Mentor</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Mentor Name</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="e.g. Warren Buffett"
                                value={newMentor.name}
                                onChange={e => setNewMentor({ ...newMentor, name: e.target.value })}
                                className="flex-1 bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                            />
                            <button
                                onClick={handleGenerateProfile}
                                disabled={isGeneratingProfile || !newMentor.name.trim()}
                                className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                                title="Generate Profile with AI"
                            >
                                {isGeneratingProfile ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Archetype</label>
                        <input
                            type="text"
                            placeholder="e.g. Value Investing & Discipline"
                            value={newMentor.archetype}
                            onChange={e => setNewMentor({ ...newMentor, archetype: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Short Description</label>
                        <input
                            type="text"
                            placeholder="e.g. Focuses on moat-driven businesses and margin of safety."
                            value={newMentor.description}
                            onChange={e => setNewMentor({ ...newMentor, description: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">AI Persona Prompt (Optional)</label>
                        <textarea
                            placeholder="e.g. Speak with folksy wisdom, emphasize the multi-decade horizon, and avoid short-term noise."
                            rows={3}
                            value={newMentor.personality_prompt}
                            onChange={e => setNewMentor({ ...newMentor, personality_prompt: e.target.value })}
                            className="w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        />
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="flex-1 py-3 px-4 bg-slate-950 text-white rounded-xl font-bold hover:bg-black transition-all">
                        Create Mentor
                    </button>
                </div>
            </div>
        </div>
    );
}
