// Why this file exists:
// UI component for initiating bank account linking.
// Polymorphic button: Plaid iframe for US/EU/UK, Basiq URL redirect for Australia.
// For AU: shows a mobile number modal first — Basiq REQUIRES mobile for SMS OTP verification.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ExternalLink, Smartphone } from 'lucide-react';

interface ConnectBankButtonProps {
    countryCode?: string;
    onSuccess?: () => void;
}

export default function ConnectBankButton({ countryCode = 'AU', onSuccess }: ConnectBankButtonProps) {
    const [token, setToken] = useState<string | null>(null);
    const [mode, setMode] = useState<'plaid_link' | 'redirect'>('redirect');
    const [loading, setLoading] = useState(false);

    // AU-specific: mobile modal state
    // Why: Basiq requires a verified mobile for SMS OTP. We collect it before starting the flow.
    const [showMobileModal, setShowMobileModal] = useState(false);
    const [mobile, setMobile] = useState('');
    const [mobileError, setMobileError] = useState('');

    const isAU = countryCode.toUpperCase() === 'AU';

    // Fetch Link Token (for Plaid only — AU fetches on demand with mobile)
    useEffect(() => {
        if (isAU) return; // AU flow fetches token after mobile is collected
        let isMounted = true;
        setToken(null);
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
    }, [countryCode, isAU]);

    // Handle Plaid Link Success
    const onPlaidSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token) => {
        setLoading(true);
        try {
            const res = await fetch('/api/bank/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ public_token, country: countryCode }),
            });
            if (!res.ok) throw new Error('Failed to exchange token');
            if (onSuccess) onSuccess();
        } catch (err) {
            console.error('Bank Token Exchange failed:', err);
            alert('Failed to connect bank account. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [countryCode, onSuccess]);

    const isRealPlaidToken = mode === 'plaid_link' && !!token && !token.includes('mock');
    const config: PlaidLinkOptions = {
        token: isRealPlaidToken ? token : null,
        onSuccess: onPlaidSuccess,
    };
    const { open, ready } = usePlaidLink(config);

    // Validate and format mobile number to E.164 format (+61XXXXXXXXX)
    const validateMobile = (value: string): string | null => {
        const cleaned = value.replace(/[\s\-()]/g, '');
        if (/^04\d{8}$/.test(cleaned)) return '+61' + cleaned.slice(1);
        if (/^\+614\d{8}$/.test(cleaned)) return cleaned;
        if (/^614\d{8}$/.test(cleaned)) return '+' + cleaned;
        return null;
    };

    // AU flow: show mobile modal first, then fetch token with mobile
    const handleAUConnect = async () => {
        const formatted = validateMobile(mobile);
        if (!formatted) {
            setMobileError('Please enter a valid Australian mobile (e.g. 0412 345 678)');
            return;
        }
        setMobileError('');
        setShowMobileModal(false);
        setLoading(true);
        try {
            // Tricky: pass mobile to server so Basiq user is created with the right number
            const res = await fetch('/api/bank/link', {
                method: 'POST',
                body: JSON.stringify({ country: countryCode, mobile: formatted }),
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.link_token && !data.link_token.includes('mock')) {
                window.location.href = data.link_token;
            } else {
                alert('Failed to generate Basiq link. Please try again.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Failed to start Basiq flow:', err);
            alert('Connection failed. Please try again.');
            setLoading(false);
        }
    };

    const handleConnectClick = () => {
        if (isAU) {
            setShowMobileModal(true);
        } else if (isRealPlaidToken && open) {
            open();
        } else if (mode === 'plaid_link' && (!token || token.includes('mock'))) {
            alert('Plaid is not configured. To test Australian Open Banking, select Australia.');
        }
    };

    return (
        <>
            {/* Mobile Number Modal for AU Basiq flow */}
            {showMobileModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <Smartphone className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Your Mobile Number</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-5">
                            Basiq will send a one-time code to verify your identity before connecting to your Australian bank.
                        </p>
                        <input
                            type="tel"
                            placeholder="0412 345 678"
                            value={mobile}
                            onChange={(e) => { setMobile(e.target.value); setMobileError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleAUConnect()}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
                            autoFocus
                        />
                        {mobileError && <p className="text-xs text-red-500 mb-3">{mobileError}</p>}
                        <div className="flex gap-3 mt-4">
                            <Button variant="outline" className="flex-1" onClick={() => setShowMobileModal(false)}>Cancel</Button>
                            <Button className="flex-1" onClick={handleAUConnect}>Continue</Button>
                        </div>
                    </div>
                </div>
            )}

            <Button
                onClick={handleConnectClick}
                disabled={loading || (!isAU && mode === 'plaid_link' && isRealPlaidToken && !ready)}
            >
                {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isAU ? (
                    <ExternalLink className="mr-2 h-4 w-4" />
                ) : (
                    <Plus className="mr-2 h-4 w-4" />
                )}
                {loading ? 'Connecting...' : isAU ? 'Connect AU Bank (Basiq)' : 'Connect Bank (Plaid)'}
            </Button>
        </>
    );
}
