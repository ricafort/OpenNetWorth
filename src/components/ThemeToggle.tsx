'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Laptop, Eye, EyeOff } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, setTheme, isPrivacyBlur, togglePrivacyBlur } = useTheme();

    return (
        <div className="flex flex-col gap-4">
            <div className="flex bg-muted p-1 rounded-xl">
                {/* Theme Buttons */}
                <button
                    onClick={() => setTheme('light')}
                    title="Light Mode"
                    className={`flex-1 py-2 rounded-lg flex justify-center transition-all ${theme === 'light' ? 'bg-card shadow text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Sun size={20} />
                </button>
                <button
                    onClick={() => setTheme('stealth')}
                    title="Stealth Mode"
                    className={`flex-1 py-2 rounded-lg flex justify-center transition-all ${theme === 'stealth' ? 'bg-primary shadow text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Moon size={20} />
                </button>
                <button
                    onClick={() => setTheme('system')}
                    title="System Theme"
                    className={`flex-1 py-2 rounded-lg flex justify-center transition-all ${theme === 'system' ? 'bg-card shadow text-blue-500' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Laptop size={20} />
                </button>
            </div>

            <button
                onClick={togglePrivacyBlur}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isPrivacyBlur
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                    }`}
            >
                {isPrivacyBlur ? <EyeOff size={18} /> : <Eye size={18} />}
                {isPrivacyBlur ? 'Privacy Active' : 'Blur Values'}
            </button>
        </div>
    );
}
