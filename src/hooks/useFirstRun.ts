'use client';

import { useEffect, useState } from 'react';

export function useFirstRun() {
    // We default to false to prevent hydration mismatch, 
    // but we can check immediately in effect
    const [isFirstRun, setIsFirstRun] = useState(false);

    useEffect(() => {
        const initialized = localStorage.getItem('clearworth_initialized');
        if (!initialized) {
            setIsFirstRun(true);
        }
    }, []);

    const markInitialized = () => {
        localStorage.setItem('clearworth_initialized', 'true');
        setIsFirstRun(false);
    };

    return { isFirstRun, markInitialized };
}
