'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { UserProfile } from '@/types';
import * as LocalStorage from '@/lib/data/storage';

interface ProfileContextType {
    // Identity
    profile: UserProfile | null;
    isLoading: boolean;
    isDemoMode: boolean; // True if we are impersonating a template
    canEdit: boolean;    // True if own profile or admin impersonating

    // Actions
    refreshData: () => Promise<void>;
    switchProfile: (templateId: string | null) => void;
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

        if (templateId) {
            // --- SUPABASE MODE (Template/Demo View) ---
            await loadFromSupabase(templateId);
        } else {
            // --- Check for Real User Session ---
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // --- AUTHENTICATED USER MODE ---
                await loadFromSupabase(user.id);
            } else {
                // --- LOCAL STORAGE MODE (Guest/Anonymous) ---
                loadFromLocalStorage();
            }
        }
        setIsLoading(false);
    };

    const loadFromLocalStorage = () => {
        // Mock profile for guests
        // If we are in "Forked Demo Mode", we might have an origin ID to fetch badges (not implemented yet)
        const originId = typeof window !== 'undefined' ? localStorage.getItem('clearworth_demo_origin_id') : null;
        const storedSettings = LocalStorage.loadSettings();

        setProfile({
            id: 'local_user',
            email: 'guest@device',
            full_name: 'Guest User',
            privacy_mode: true,
            is_template: false,
            role: 'user', // Treat guests as standard users for type compatibility
            currency_code: storedSettings.baseCurrency,
            created_at: new Date().toISOString()
        });
    };

    const loadFromSupabase = async (id: string) => {
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

    // Actions
    const switchProfile = (id: string | null) => {
        setTemplateId(id);
    };

    return (
        <ProfileContext.Provider value={{
            profile, isLoading, isDemoMode, canEdit: true,
            refreshData, switchProfile
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
