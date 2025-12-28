'use client';

import { isDemoMode, exitDemoMode } from '@/lib/demoMode';
import { AlertCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DemoBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(isDemoMode());
    }, []);

    if (!visible) return null;

    return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                    <AlertCircle size={16} />
                    <span>Demo Mode: You are exploring with sample data.</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            if (confirm('This will keep the current data as your actual starting point. The "Demo" banner will be removed. Continue?')) {
                                import('@/lib/demoMode').then(m => m.convertDemoToReal());
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
