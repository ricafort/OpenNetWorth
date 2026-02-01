'use client';

import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import CheckInModal from './CheckInModal';
import GeneralSettingsModal from './GeneralSettingsModal';
import MentorSettings from './MentorSettings';
import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '@/infrastructure/local_driver';

export default function DashboardModals() {
    const { isSettingsOpen, closeSettings } = useDashboard();

    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [isMentorSettingsOpen, setIsMentorSettingsOpen] = useState(false);


    // Check-In Logic
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

    const handleCheckInUpdate = () => {
        const settings = loadSettings();
        saveSettings({ ...settings, lastCheckIn: new Date().toISOString() });
        setIsCheckInOpen(false);
    };

    const handleSettingsSave = (newSettings: any) => {
        saveSettings(newSettings);
        // refreshAttributes(); // Context data is now reactive query-based
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
