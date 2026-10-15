/**
 * Demo mode (Phase 2.7) — read-only sample personas.
 *
 * Why this file exists:
 * Demo personas used to be written into the user's own localStorage by this
 * module (and could leak into the real vault shape). Now each persona is a
 * seeded, READ-ONLY SQLite vault under `data/demo_vaults/<id>.sqlite`
 * (built by `scripts/seed-demo-vaults.ts`). The only client-side demo state
 * is a `demo_persona` cookie: API routes open the persona vault read-only
 * when it is present, and refuse mutations. The live vault can never be
 * polluted by demo data.
 *
 * Tricky logic:
 * - The persona key is mirrored in the URL (`?simulatedProfileId=`) so
 *   ProfileContext and shareable links agree with the cookie.
 * - Persona keys must match `DEMO_PERSONAS` in `src/infrastructure/sqlite/db.ts`
 *   (the server-side allowlist / path-traversal guard). The list is duplicated
 *   here on purpose: db.ts imports better-sqlite3 and must never reach the
 *   browser bundle.
 */

import { clearAllData } from '@/infrastructure/local_driver';
import {
    GETTING_STARTED_CONFIG,
    STABILIZING_CONFIG,
    BUILDING_FOUNDATIONS_CONFIG,
    FAMILY_CONFIG,
    GROWING_WEALTH_CONFIG,
} from './demoConfigs';

export const DEMO_PERSONA_COOKIE = 'demo_persona';

/** Persona keys — must stay in sync with DEMO_PERSONAS in infrastructure/sqlite/db.ts. */
export type DemoPersonaKey = 'start' | 'stab' | 'build' | 'fam' | 'grow';

/** Client-side persona catalog (labels/descriptions for pickers and banners). */
export const DEMO_PERSONA_CATALOG: { id: DemoPersonaKey; label: string; description: string }[] = [
    GETTING_STARTED_CONFIG,
    STABILIZING_CONFIG,
    BUILDING_FOUNDATIONS_CONFIG,
    FAMILY_CONFIG,
    GROWING_WEALTH_CONFIG,
].map(c => ({ id: c.id as DemoPersonaKey, label: c.label, description: c.description }));

export function isDemoPersonaKey(value: string | null | undefined): value is DemoPersonaKey {
    return !!value && DEMO_PERSONA_CATALOG.some(p => p.id === value);
}

/** Reads the active persona from the `demo_persona` cookie (null when absent). */
export function readDemoPersona(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|;\s*)demo_persona=([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
}

/** Sets (or with `null`, clears) the `demo_persona` cookie for the whole app. */
export function setDemoPersonaCookie(persona: string | null): void {
    if (typeof document === 'undefined') return;
    if (persona === null) {
        document.cookie = `${DEMO_PERSONA_COOKIE}=; path=/; max-age=0; samesite=lax`;
    } else {
        document.cookie = `${DEMO_PERSONA_COOKIE}=${persona}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }
}

/** True while the browser is previewing a read-only sample persona. */
export function isDemoMode(): boolean {
    return readDemoPersona() !== null;
}

/** Human label for a persona key (falls back to the raw key). */
export function demoPersonaLabel(persona: string | null): string {
    const found = DEMO_PERSONA_CATALOG.find(p => p.id === persona);
    return found ? found.label : 'Sample Data';
}

/**
 * Enters demo mode: sets the cookie and navigates to the persona view.
 * No data is written anywhere — the persona vault already exists on disk
 * (run `npm run seed:demo` to build it).
 */
export function enableDemoMode(persona: DemoPersonaKey = 'start'): void {
    if (typeof window === 'undefined') return;
    setDemoPersonaCookie(persona);
    window.location.href = `/?simulatedProfileId=${persona}`;
}

/** Leaves demo mode: clears the cookie and returns to the real vault. */
export function exitDemoMode(): void {
    if (typeof window === 'undefined') return;
    setDemoPersonaCookie(null);
    window.location.href = '/';
}

/**
 * "Reset App / Re-onboard" (GeneralSettingsModal danger zone): clears the demo
 * cookie plus legacy localStorage state and reloads to the Welcome Screen.
 * The SQLite vault itself is untouched — vault wipes go through the vault API.
 */
export function resetApp(): void {
    if (typeof window === 'undefined') return;
    setDemoPersonaCookie(null);
    localStorage.removeItem('clearworth_initialized');
    clearAllData();
    window.location.reload();
}
