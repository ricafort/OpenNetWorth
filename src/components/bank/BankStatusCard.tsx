// Why this file exists:
// Dashboard card component displaying linked bank accounts and status.
// Includes country/region selection (Australia Basiq CDR vs US/Global Plaid) allowing users to switch between local bank providers.

'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '../ui/badge';
import ConnectBankButton from './ConnectBankButton';
import { CheckCircle, AlertTriangle, ShieldCheck, Globe } from 'lucide-react';
import { useProfile } from '@/contexts/ProfileContext';

interface BankConnection {
    id: string;
    provider: string;
    status: string;
    last_synced_at: string;
}

export default function BankStatusCard() {
    const { profile } = useProfile();
    const [connections, setConnections] = useState<BankConnection[]>([]);
    const [loading, setLoading] = useState(true);

    // Auto-detect default country from user profile currency/country code.
    // Why: AU users should default to Basiq CDR; everyone else to Plaid (US/Global).
    const initialCountry = (profile?.currency_code === 'AUD' || profile?.country_code === 'AU') ? 'AU' : 'US';
    const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/bank/status');
            if (res.ok) {
                const data = await res.json();
                setConnections(data.items || []);
            }
        } catch (e) {
            console.error('Failed to fetch bank status', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleSuccess = () => {
        fetchStatus(); // Refresh connection status list after linking
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    Bank Connections
                </CardTitle>

                {/* Country Region Selector & Connect Button */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-md px-2.5 py-1.5 bg-card shadow-sm">
                        <Globe className="h-3.5 w-3.5" />
                        <select
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="bg-transparent font-medium text-foreground outline-none cursor-pointer"
                        >
                            <option value="AU">🇦🇺 Australia (Basiq CDR)</option>
                            <option value="US">🇺🇸 US & Global (Plaid)</option>
                        </select>
                    </div>

                    <ConnectBankButton onSuccess={handleSuccess} countryCode={selectedCountry} />
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-10 w-full animate-pulse bg-muted rounded"></div>
                    </div>
                ) : connections.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p className="font-medium text-foreground text-sm">No banks connected yet.</p>
                        <p className="text-xs mt-1">
                            Link your {selectedCountry === 'AU' ? 'Australian bank via Basiq (CBA, NAB, Westpac, ANZ)' : 'US/Global bank via Plaid'} to automate Net Worth tracking.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {connections.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold">
                                        {item.provider.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium capitalize">{item.provider} Connection</p>
                                        <p className="text-xs text-muted-foreground">
                                            Last synced: {item.last_synced_at ? new Date(item.last_synced_at).toLocaleDateString() : 'Never'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    {item.status === 'active' ? (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50">
                                            <CheckCircle className="w-3 h-3 mr-1" /> Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive">
                                            <AlertTriangle className="w-3 h-3 mr-1" /> Error
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
