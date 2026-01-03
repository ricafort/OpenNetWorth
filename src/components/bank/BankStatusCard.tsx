'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '../ui/badge';
import ConnectBankButton from './ConnectBankButton';
import { CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BankConnection {
    id: string;
    provider: string;
    status: string;
    last_synced_at: string;
}

export default function BankStatusCard() {
    // In a real app, you'd fetch this from a Server Action or /api/bank/status
    // For now, let's mock the "Check" state or leave it waiting for real API.
    // We'll create a simple API endpoint for "GET /api/bank/status" next.
    const [connections, setConnections] = useState<BankConnection[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/bank/status');
            if (res.ok) {
                const data = await res.json();
                setConnections(data.items);
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
        fetchStatus(); // Refresh list after linking
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    Bank Connections
                </CardTitle>
                <ConnectBankButton onSuccess={handleSuccess} countryCode="US" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <div className="h-10 w-full animate-pulse bg-muted rounded"></div>
                    </div>
                ) : connections.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p>No banks connected yet.</p>
                        <p className="text-xs mt-1">Link your account to automate Net Worth tracking.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {connections.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
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
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
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
