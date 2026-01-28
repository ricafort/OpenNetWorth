'use client';

import { useState, useEffect } from 'react';
import { X, Clock, CheckCircle2 } from 'lucide-react';
import { loadSettings, saveSettings } from '@/lib/data/storage';
import { UserSettings } from '@/types';

interface CheckInModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export default function CheckInModal({ isOpen, onClose, onUpdate }: CheckInModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Header with Mentor Persona */}
                <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock size={120} />
                    </div>

                    <div className="relative z-10 flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center shrink-0 overflow-hidden">
                            {/* Placeholder for Mentor Avatar - using text for now */}
                            <span className="text-2xl">👴🏼</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Wealth Check-In</h3>
                            <p className="text-slate-400 text-sm mt-1">Message from Charlie Munger</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-slate-700 italic">
                        "Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it. It's time to see where you stand."
                    </div>

                    <p className="text-slate-600 text-sm">
                        It's been a while since you updated your assets and liabilities. keeping your net worth accurate is key to tracking your momentum.
                    </p>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                        >
                            Snooze
                        </button>
                        <button
                            onClick={onUpdate}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                            <CheckCircle2 size={18} />
                            Review Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
