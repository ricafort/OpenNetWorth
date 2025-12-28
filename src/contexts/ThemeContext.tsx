'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Theme, loadTheme, saveTheme, getEffectiveTheme } from '@/lib/theme';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    effectiveTheme: 'light' | 'stealth';
    isPrivacyBlur: boolean;
    togglePrivacyBlur: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('system');
    const [isPrivacyBlur, setIsPrivacyBlur] = useState(false);

    useEffect(() => {
        // Initial load
        setThemeState(loadTheme());
        setIsPrivacyBlur(localStorage.getItem('clearworth_privacy') === 'true');
    }, []);

    const setTheme = (t: Theme) => {
        setThemeState(t);
        saveTheme(t);
    };

    const togglePrivacyBlur = () => {
        const newVal = !isPrivacyBlur;
        setIsPrivacyBlur(newVal);
        localStorage.setItem('clearworth_privacy', String(newVal));
    };

    const effectiveTheme = getEffectiveTheme(theme);

    // Apply Theme
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'stealth', 'dark');

        if (effectiveTheme === 'stealth') {
            root.classList.add('stealth');
            root.classList.add('dark'); // Map stealth to dark
        } else {
            root.classList.add('light');
        }
    }, [effectiveTheme]);

    // Apply Privacy Blur
    useEffect(() => {
        if (isPrivacyBlur) {
            document.body.classList.add('privacy-blur');
        } else {
            document.body.classList.remove('privacy-blur');
        }
    }, [isPrivacyBlur]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme, isPrivacyBlur, togglePrivacyBlur }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
