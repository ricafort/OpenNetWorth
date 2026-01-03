'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { Button } from '@/components/ui/button'; // Assuming you have a UI kit or use raw button
import { Loader2, Plus } from 'lucide-react';

interface ConnectBankButtonProps {
    countryCode?: string;
    onSuccess?: () => void;
}

export default function ConnectBankButton({ countryCode = 'US', onSuccess }: ConnectBankButtonProps) {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // 1. Fetch Link Token on Mount (or when user clicks - easier on mount for latency)
    useEffect(() => {
        const createToken = async () => {
            try {
                const res = await fetch('/api/bank/link', {
                    method: 'POST',
                    body: JSON.stringify({ country: countryCode }),
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await res.json();
                setToken(data.link_token);
            } catch (err) {
                console.error('Failed to create link token', err);
            }
        };
        createToken();
    }, [countryCode]);

    // 2. Handle Success (User finished logging in)
    const onPlaidSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token, metadata) => {
        setLoading(true);
        try {
            const res = await fetch('/api/bank/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_token, country: countryCode }),
            });

            if (!res.ok) throw new Error('Failed to exchange token');

            const data = await res.json();
            console.log('Bank Linked!', data);

            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Exchange failed', err);
            alert('Failed to connect bank. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [countryCode, onSuccess]);

    const config: PlaidLinkOptions = {
        token,
        onSuccess: onPlaidSuccess,
    };

    const { open, ready } = usePlaidLink(config);

    if (!token) {
        return <Button disabled variant="outline"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</Button>;
    }

    return (
        <Button onClick={() => open()} disabled={!ready || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            {loading ? 'Finalizing...' : 'Connect Bank'}
        </Button>
    );
}
