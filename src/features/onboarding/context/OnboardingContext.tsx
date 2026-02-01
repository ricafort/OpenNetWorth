'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingContextType {
    run: boolean;
    startTour: () => void;
    stopTour: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
    const [run, setRun] = useState(false);

    const startTour = () => setRun(true);
    const stopTour = () => setRun(false);

    return (
        <OnboardingContext.Provider value={{ run, startTour, stopTour }}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
}
