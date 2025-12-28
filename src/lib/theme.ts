export type Theme = 'light' | 'stealth' | 'system';

const THEME_KEY = 'clearworth_theme';

export const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const loadTheme = (): Theme => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
};

export const saveTheme = (theme: Theme) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_KEY, theme);
};

export const getEffectiveTheme = (theme: Theme): 'light' | 'dark' | 'stealth' => {
    if (theme === 'system') return getSystemTheme();
    return theme;
};
