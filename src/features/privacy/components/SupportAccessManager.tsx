'use client';

import { useState } from 'react';
import { Shield, ShieldAlert, Check, Clock } from 'lucide-react';
import { grantSupportAccess, revokeSupportAccess } from '@/features/privacy/actions';

interface SupportAccessManagerProps {
    initialActive: boolean;
    initialExpiresAt?: string;
}

export default function SupportAccessManager({ initialActive, initialExpiresAt }: SupportAccessManagerProps) {
    const [active, setActive] = useState(initialActive);
    const [loading, setLoading] = useState(false);
    const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt ?? null);

    const handleGrant = async () => {
        setLoading(true);
        try {
            const res = await grantSupportAccess(24); // Default 24h
            setActive(true);
            setExpiresAt(res.expiresAt);
        } catch (e) {
            alert('Failed to grant access');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        setLoading(true);
        try {
            await revokeSupportAccess();
            setActive(false);
            setExpiresAt(null);
        } catch (e) {
            alert('Failed to revoke access');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`p-6 rounded-2xl border transition-all ${active ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between">
                <div className="flex gap-4">
                    <div className={`p-3 rounded-xl h-fit ${active ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                        {active ? <ShieldAlert size={24} /> : <Shield size={24} />}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900">Support Access</h4>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm">
                            {active
                                ? "You have granted temporary access to OpenNetWorth Support. Admins can view your data until expiry."
                                : "Admins currently have NO access to your financial data."}
                        </p>

                        {active && expiresAt && (
                            <div className="flex items-center gap-2 mt-3 text-sm font-bold text-orange-700">
                                <Clock size={16} />
                                Expires: {new Date(expiresAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    {active ? (
                        <button
                            onClick={handleRevoke}
                            disabled={loading}
                            className="px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-lg text-sm font-bold hover:bg-orange-100 disabled:opacity-50"
                        >
                            {loading ? 'Revoking...' : 'Revoke Access Now'}
                        </button>
                    ) : (
                        <button
                            onClick={handleGrant}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50"
                        >
                            {loading ? 'Granting...' : 'Grant 24h Access'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
