'use client';

import { ShieldAlert, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { revokeSupportAccess } from '@/features/privacy/actions';
import { useState } from 'react';

interface GlobalPrivacyBannerProps {
    active: boolean;
}

export default function GlobalPrivacyBanner({ active }: GlobalPrivacyBannerProps) {
    const router = useRouter();
    const [visible, setVisible] = useState(active);

    if (!visible) return null;

    const handleRevokeQuick = async () => {
        if (!confirm('Revoke Support Access immediately?')) return;
        await revokeSupportAccess();
        setVisible(false);
        router.refresh();
    };

    return (
        <div className="bg-orange-600 text-white px-4 py-3 shadow-md relative z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="text-white animate-pulse" size={20} />
                    <span className="text-sm font-bold">
                        ⚠️ Support Access Active. ClearWorth Admins can view your data.
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRevokeQuick}
                        className="text-xs bg-white text-orange-700 px-3 py-1 rounded-full font-bold hover:bg-orange-50"
                    >
                        Revoke
                    </button>
                    <button onClick={() => setVisible(false)} className="text-white/80 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
