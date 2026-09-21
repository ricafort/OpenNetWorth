'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to manage First-Run / Onboarding modal state.
 * 
 * Why this exists:
 * Presents the WelcomeScreen setup guide for genuinely new users with an empty vault.
 * 
 * Tricky logic:
 * - Prevents false-positive onboarding overlays: A user opening an incognito tab or new browser session
 *   previously saw the WelcomeScreen offering to create a fresh vault despite their SQLite database
 *   already containing accounts.
 * - If `localStorage` is empty, we check `/api/accounting` for existing accounts. If records exist,
 *   we treat the vault as initialized and automatically mark `clearworth_initialized` as true.
 * 
 * TODO: Support per-profile onboarding state in multi-profile desktop environments.
 */
export function useFirstRun() {
    const [isFirstRun, setIsFirstRun] = useState(false);

    useEffect(() => {
        const initialized = localStorage.getItem('clearworth_initialized');
        if (initialized) {
            setIsFirstRun(false);
            return;
        }

        // Check if database already has accounts before showing first-run welcome screen
        fetch('/api/accounting')
            .then(res => res.json())
            .then(data => {
                const hasExistingAccounts = data.success && Array.isArray(data.accounts) && data.accounts.length > 0;
                if (hasExistingAccounts) {
                    localStorage.setItem('clearworth_initialized', 'true');
                    setIsFirstRun(false);
                } else {
                    setIsFirstRun(true);
                }
            })
            .catch(() => {
                // Network/fetch error: fallback to checking if any local items exist
                setIsFirstRun(true);
            });
    }, []);

    const markInitialized = () => {
        localStorage.setItem('clearworth_initialized', 'true');
        setIsFirstRun(false);
    };

    return { isFirstRun, markInitialized };
}
