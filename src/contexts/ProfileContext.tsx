'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserProfile, CurrencyCode, UserSettings } from '@/types';
import * as LocalStorage from '@/infrastructure/local_driver';
import {
    isDemoPersonaKey,
    setDemoPersonaCookie,
    demoPersonaLabel,
} from '@/features/demo/demoMode';

interface ProfileContextType {
    // Identity
    profile: UserProfile | null;
    isLoading: boolean;
    isDemoMode: boolean; // True while previewing a read-only sample persona (Phase 2.7)
    demoPersona: string | null; // Active persona key ('start', 'stab', ...) or null
    canEdit: boolean;    // False in demo mode — persona vaults are read-only

    // Actions
    refreshData: () => Promise<void>;
    switchProfile: (persona: string | null) => void;
    updateCurrency: (code: CurrencyCode) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams(); // Hook into URL changes
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [persona, setPersona] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isDemoMode = persona !== null;

    // React to URL changes immediately (`?simulatedProfileId=<persona>`).
    // Unknown keys are treated as "no demo" so a bad link can't wedge the app.
    useEffect(() => {
        const simId = searchParams.get('simulatedProfileId');
        setPersona(isDemoPersonaKey(simId) ? simId : null);
    }, [searchParams]);

    // Keep the `demo_persona` cookie in sync with the active persona. Declared
    // BEFORE the refresh effect so every data fetch below (and every hook
    // fetch that follows) already carries the cookie to the API routes.
    useEffect(() => {
        setDemoPersonaCookie(persona);
    }, [persona]);

    // Load data whenever the persona changes
    useEffect(() => {
        refreshData();
    }, [persona]);

    const refreshData = async () => {
        setIsLoading(true);
        try {
            // Direct Instant Local Vault Mode (100% Private, On-Device).
            // Demo personas are served by the API routes via the persona cookie —
            // there is no separate remote template source anymore (Phase 2.7).
            await loadLocalProfile();
        } finally {
            setIsLoading(false);
        }
    };

    const loadLocalProfile = async () => {
        // Private on-device profile for OpenNetWorth.
        // Settings always come from the SQLite settings kv via /api/settings;
        // with the demo cookie set that read transparently targets the persona
        // vault, so persona currency/theme render without any localStorage.
        let storedSettings: { baseCurrency: CurrencyCode };
        try {
            storedSettings = await LocalStorage.loadSettingsFromVault();
        } catch {
            // Explicit defaults — never resurrect stale localStorage.
            storedSettings = { baseCurrency: 'USD' };
        }

        let customName = 'Local Vault Owner';
        if (persona) {
            customName = demoPersonaLabel(persona);
        } else if (typeof window !== 'undefined') {
            const raw = localStorage.getItem('opennetworth_profile');
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed.full_name) customName = parsed.full_name;
                } catch {
                    // ignore parse error
                }
            }
        }

        setProfile({
            id: 'local_user',
            email: 'local@device',
            full_name: customName,
            privacy_mode: true,
            is_template: isDemoMode,
            role: 'user',
            currency_code: storedSettings.baseCurrency,
            created_at: new Date().toISOString()
        });
    };

    // Actions
    const switchProfile = (id: string | null) => {
        setPersona(isDemoPersonaKey(id) ? id : null);
    };

    const updateCurrency = async (code: CurrencyCode) => {
        console.log("Updating currency to:", code);

        // 1. Optimistic Update
        if (profile) {
            setProfile({ ...profile, currency_code: code });
        }

        // 2. Persist — demo personas are read-only, so skip the write entirely
        // (the API would refuse it with 403 anyway).
        if (isDemoMode) return;
        const settings = await LocalStorage.loadSettingsFromVault()
            .catch((): UserSettings => ({ baseCurrency: code, theme: 'system', checkInFrequency: 'monthly' }));
        settings.baseCurrency = code;
        await LocalStorage.saveSettings(settings);
    };

    return (
        <ProfileContext.Provider value={{
            profile, isLoading, isDemoMode, demoPersona: persona, canEdit: !isDemoMode,
            refreshData, switchProfile, updateCurrency
        }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (!context) throw new Error("useProfile must be used within ProfileProvider");
    return context;
}
