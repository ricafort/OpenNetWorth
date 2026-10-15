'use client';

import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import CheckInModal from './CheckInModal';
import GeneralSettingsModal from './GeneralSettingsModal';
import MentorSettings from './MentorSettings';
import { useState, useEffect } from 'react';
import { loadSettings, saveSettings, loadSettingsFromVault } from '@/infrastructure/local_driver';
import { useProfile } from '@/contexts/ProfileContext';

export default function DashboardModals() {
    const { isSettingsOpen, closeSettings } = useDashboard();
    const { isDemoMode } = useProfile();

    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [isMentorSettingsOpen, setIsMentorSettingsOpen] = useState(false);


    /**
     * Check-In Logic
     * 
     * Why this exists:
     * Periodically prompts user with a Wealth Check-In modal and Snooze option based on checkInFrequency.
     * 
     * Tricky logic:
     * Temporarily disabled per user request ("disable the tutorial and snooze for now")
     * to avoid modal popups and snooze prompts interrupting dashboard navigation and testing.
     * 
     * TODO: Re-enable automated check-in prompt after milestone signoff.
     */
    /*
    useEffect(() => {
        const settings = loadSettings();
        const lastCheckIn = settings.lastCheckIn ? new Date(settings.lastCheckIn).getTime() : 0;
        const now = Date.now();
        const freqMap = {
            'weekly': 7 * 24 * 60 * 60 * 1000,
            'biweekly': 14 * 24 * 60 * 60 * 1000,
            'monthly': 30 * 24 * 60 * 60 * 1000
        };
        const interval = freqMap[settings.checkInFrequency || 'monthly'];

        if (now - lastCheckIn > interval) {
            const timer = setTimeout(() => setIsCheckInOpen(true), 2000);
            return () => clearTimeout(timer);
        }
    }, []);
    */

    const handleCheckInUpdate = async () => {
        // Read from the same source the settings UI reads (SQLite kv for the real
        // vault; localStorage only for demo personas until Phase 2.7) so stamping
        // lastCheckIn never overwrites the vault with a stale localStorage object.
        const settings = isDemoMode
            ? loadSettings()
            : await loadSettingsFromVault().catch(() => loadSettings());
        try {
            await saveSettings({ ...settings, lastCheckIn: new Date().toISOString() });
        } catch (e) {
            console.error('Failed to update lastCheckIn in SQLite:', e);
        }
        setIsCheckInOpen(false);
    };

    const handleSettingsSave = (_newSettings: any) => {
        /**
         * Why this exists:
         * GeneralSettingsModal already commits settings durably to SQLite before invoking onSave.
         * Reactive UI updates are already dispatched via window events.
         */
    };

    return (
        <>
            <CheckInModal
                isOpen={isCheckInOpen}
                onClose={() => setIsCheckInOpen(false)}
                onUpdate={handleCheckInUpdate}
            />

            <GeneralSettingsModal
                isOpen={isSettingsOpen}
                onClose={closeSettings}
                onSave={handleSettingsSave}
            />

            <MentorSettings
                isOpen={isMentorSettingsOpen}
                onClose={() => setIsMentorSettingsOpen(false)}
            />
        </>
    );
}
