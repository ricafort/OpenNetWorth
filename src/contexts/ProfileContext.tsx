'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { UserProfile, CurrencyCode } from '@/types';
import * as LocalStorage from '@/infrastructure/local_driver';

interface ProfileContextType {
    // Identity
    profile: UserProfile | null;
    isLoading: boolean;
    isDemoMode: boolean; // True if we are impersonating a template
    canEdit: boolean;    // True if own profile or admin impersonating

    // Actions
    refreshData: () => Promise<void>;
    switchProfile: (templateId: string | null) => void;
    updateCurrency: (code: CurrencyCode) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
    const supabase = createClient();
    const searchParams = useSearchParams(); // Hook into URL changes
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isDemoMode = !!templateId;

    // React to URL changes immediately
    useEffect(() => {
        const simId = searchParams.get('simulatedProfileId');
        setTemplateId(simId); // If null, this exits demo mode
    }, [searchParams]);

    // Load data whenever templateId changes
    useEffect(() => {
        refreshData();
    }, [templateId]);

    const refreshData = async () => {
        setIsLoading(true);

        try {
            if (templateId) {
                // --- SUPABASE MODE (Template/Demo View) ---
                await loadFromSupabase(templateId);
            } else {
                // --- Check for Real User Session if Supabase configured ---
                const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
                const user = data?.user;

                if (user) {
                    // --- AUTHENTICATED USER MODE ---
                    await loadFromSupabase(user.id);
                } else {
                    // --- LOCAL STORAGE MODE (Default Private On-Device) ---
                    loadFromLocalStorage();
                }
            }
        } catch {
            // Safe fallback to local storage mode
            loadFromLocalStorage();
        } finally {
            setIsLoading(false);
        }
    };

    const handleMigration = async (userId: string) => {
        if (typeof window === 'undefined') return;

        const migrationRequested = localStorage.getItem('clearworth_migration_requested') === 'true';

        if (migrationRequested) {
            try {
                // Dynamically import to avoid server-side issues
                const { MigrationService } = await import('@/features/migration/migrationService');

                // Double check if profile is empty? 
                // For now, we assume if the flag is set, we want to overwrite/seed.
                // Or we can check if the user has < 1 asset to avoid destroying real data?
                // Let's trust the flag for this version.

                await MigrationService.migrateToCloud(userId);
                MigrationService.clearLocalData();

                // Refresh to ensure we see the new data
                window.location.reload();
            } catch (e) {
                console.error("ProfileContext: Migration failed", e);
                // Clear flag to avoid infinite loops
                localStorage.removeItem('clearworth_migration_requested');
            }
        }
    };

    const loadFromSupabase = async (id: string) => {
        // Migration Check BEFORE loading (or concurrent?)
        // If we migrate, we need to reload anyway.
        // Let's check first.
        await handleMigration(id);

        // Fetch Profile
        console.log("ProfileContext: Loading profile from Supabase...", id);
        const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', id).single();

        if (error) {
            console.error("ProfileContext: FAILED to load profile:", error);
        } else if (prof) {
            console.log("ProfileContext: Loaded profile:", prof);
            setProfile(prof as UserProfile);
        }
    };

    const loadFromLocalStorage = () => {
        // Private on-device profile for OpenNetWorth
        const storedSettings = LocalStorage.loadSettings();

        setProfile({
            id: 'local_user',
            email: 'local@device',
            full_name: 'Local Vault Owner',
            privacy_mode: true,
            is_template: false,
            role: 'user',
            currency_code: storedSettings.baseCurrency,
            created_at: new Date().toISOString()
        });
    };

    // Actions
    const switchProfile = (id: string | null) => {
        setTemplateId(id);
    };

    const updateCurrency = async (code: CurrencyCode) => {
        console.log("Updating currency to:", code);

        // 1. Optimistic Update
        if (profile) {
            setProfile({ ...profile, currency_code: code });
        }

        // 2. Persist
        if (profile?.id && profile.id !== 'local_user' && !isDemoMode) {
            // Auth User -> Supabase
            // Use "as never" to bypass strict "never" expectation in generated types for now.
            const { error } = await supabase.from('profiles').update({ currency_code: code } as unknown as never).eq('id', profile.id);
            if (error) {
                console.error("Failed to update currency in Supabase:", error);
                // Revert if needed, but for now just log
                refreshData(); // Re-fetch true state
            }
        } else {
            // Guest or Demo -> LocalStorage
            const settings = LocalStorage.loadSettings();
            settings.baseCurrency = code;
            LocalStorage.saveSettings(settings);

            // If strictly Guest, we are done (optimistic update holds).
            // If Demo, we probably shouldn't be here (Demo is read-only usually, or local override)
        }
    };

    return (
        <ProfileContext.Provider value={{
            profile, isLoading, isDemoMode, canEdit: true,
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
