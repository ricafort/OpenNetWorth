'use client';

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface MentorSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: (settings: any) => void;
}

export default function MentorSettings({ isOpen, onClose, onSave }: MentorSettingsProps) {
    const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });
    const [settings, setSettings] = useState({
        rotationSpeed: 15,
        quotesToGenerate: 20
    });

    useEffect(() => {
        if (isOpen) {
            const saved = localStorage.getItem('mentor_controls');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setSettings(prev => ({
                        ...prev,
                        rotationSpeed: parsed.rotationSpeed || 15,
                        quotesToGenerate: parsed.quotesToGenerate || 20
                    }));
                } catch (e) {
                    // Start fresh if corrupt
                }
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        localStorage.setItem('mentor_controls', JSON.stringify(settings));
        if (onSave) onSave(settings);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mentor-controls-title"
                tabIndex={-1}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 focus:outline-none"
            >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 id="mentor-controls-title" className="text-xl font-black text-slate-800 uppercase tracking-tighter">Mentor Controls</h3>
                    <button
                        onClick={onClose}
                        aria-label="Close mentor controls"
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Rotation Speed</label>
                            <span className="text-blue-600 font-bold">{settings.rotationSpeed}s</span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="60"
                            step="5"
                            value={settings.rotationSpeed}
                            onChange={(e) => setSettings({ ...settings, rotationSpeed: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">How often the wisdom rotates.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-widest mb-4">Quotes Per Mentor</label>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="1"
                                max="20"
                                value={settings.quotesToGenerate}
                                onChange={(e) => setSettings({ ...settings, quotesToGenerate: Math.min(20, Math.max(1, parseInt(e.target.value) || 1)) })}
                                className="w-20 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-950 text-center"
                            />
                            <span className="text-sm text-slate-600 font-medium">quotes fetched on add</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 font-medium">Number of distinct quotes to generate with your local LLM when synthesizing a new mentor.</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] text-slate-500 font-medium">
                            💡 All mentor reasoning runs on your local machine. Open Local LLM settings to configure LM Studio or Ollama.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end px-8">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-8 py-3 bg-slate-950 text-white rounded-xl font-black uppercase text-xs hover:bg-black transition-all shadow-md active:scale-95"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
