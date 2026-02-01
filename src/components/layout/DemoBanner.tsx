'use client';

import { isDemoMode, exitDemoMode } from '@/features/demo/demoMode';
import { AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DemoBanner() {
    const [visible, setVisible] = useState(false);
    const [label, setLabel] = useState<string>('');

    useEffect(() => {
        setVisible(isDemoMode());
        setLabel(localStorage.getItem('clearworth_demo_profile_label') || 'Sample Data');
    }, []);

    if (!visible) return null;

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                    <AlertCircle size={16} />
                    <span>Demo Mode: You are exploring <strong>{label}</strong>.</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (confirm('This will exit Demo Mode and allow you to save this data to a real account. Continue?')) {
                                import('@/features/demo/demoMode').then(m => m.convertDemoToReal(true));
                            }
                        }}
                        className="text-xs font-bold bg-white text-amber-900 border border-amber-200 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                    >
                        Keep Data & Exit
                    </button>
                    <button
                        onClick={exitDemoMode}
                        className="text-xs font-bold bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                        <X size={12} />
                        Exit Demo
                    </button>
                </div>
            </div>
        </div>
    );
}
