// Why this file exists:
// UI component for initiating bank account linking.
// Polymorphic button that handles Plaid iframe link widget for US/EU/UK and Basiq URL redirect flow for Australia.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ExternalLink } from 'lucide-react';

interface ConnectBankButtonProps {
    countryCode?: string;
    onSuccess?: () => void;
}

export default function ConnectBankButton({ countryCode = 'AU', onSuccess }: ConnectBankButtonProps) {
    const [token, setToken] = useState<string | null>(null);
    const [mode, setMode] = useState<'plaid_link' | 'redirect'>('redirect');
    const [loading, setLoading] = useState(false);

    // 1. Fetch Link Token and Mode on Mount or Country Change
    useEffect(() => {
        let isMounted = true;
        setToken(null); // Reset while fetching
        const createToken = async () => {
            try {
                const res = await fetch('/api/bank/link', {
                    method: 'POST',
                    body: JSON.stringify({ country: countryCode }),
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await res.json();
                if (isMounted) {
                    setToken(data.link_token);
                    if (data.mode) setMode(data.mode);
                }
            } catch (err) {
                console.error('Failed to create link token:', err);
            }
        };
        createToken();

        return () => { isMounted = false; };
    }, [countryCode]);

    // 2. Handle Plaid Link Success (User completed login in Plaid iframe)
    const onPlaidSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token) => {
        setLoading(true);
        try {
            const res = await fetch('/api/bank/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_token, country: countryCode }),
            });

            if (!res.ok) throw new Error('Failed to exchange token');

            const data = await res.json();
            console.log('Bank Successfully Linked!', data);

            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Bank Token Exchange failed:', err);
            alert('Failed to connect bank account. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [countryCode, onSuccess]);

    // Tricky logic: Plaid Link throws a console error if initialized with a mock fallback token (e.g. 'link-sandbox-mock-token').
    // Only pass token to react-plaid-link if it's a genuine Plaid token.
    const isRealPlaidToken = mode === 'plaid_link' && !!token && !token.includes('mock');

    const config: PlaidLinkOptions = {
        token: isRealPlaidToken ? token : null,
        onSuccess: onPlaidSuccess,
    };

    const { open, ready } = usePlaidLink(config);

    // Tricky logic: Handle click for Basiq (redirect), Real Plaid (open modal), and Mock Plaid (alert user)
    const handleConnectClick = () => {
        if (mode === 'redirect' && token) {
            setLoading(true);
            window.location.href = token;
        } else if (isRealPlaidToken && open) {
            open();
        } else if (mode === 'plaid_link' && (!token || token.includes('mock'))) {
            alert('Plaid Client ID & Secret are not configured in .env.local.\n\nTo test Australian Open Banking, select "🇦🇺 Australia (Basiq CDR)" from the country dropdown!');
        }
    };

    if (!token) {
        return <Button disabled variant="outline"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</Button>;
    }

    const isAU = countryCode.toUpperCase() === 'AU' || mode === 'redirect';

    return (
        <Button onClick={handleConnectClick} disabled={loading || (mode === 'plaid_link' && isRealPlaidToken && !ready)}>
            {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isAU ? (
                <ExternalLink className="mr-2 h-4 w-4" />
            ) : (
                <Plus className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Connecting...' : isAU ? 'Connect AU Bank (Basiq)' : 'Connect Bank (Plaid)'}
        </Button>
    );
}
