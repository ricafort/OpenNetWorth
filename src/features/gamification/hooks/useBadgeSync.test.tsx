/**
 * @vitest-environment happy-dom
 *
 * Why this file exists:
 * Phase 2.6 removed the Supabase user_badges sync branch from useBadgeSync.
 * These tests pin the new contract: badges are evaluated purely in-memory
 * from the m1-backed facts the caller supplies, with ZERO network calls, and
 * nothing is evaluated until the profile has loaded.
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = vi.hoisted(() => ({ profile: { id: 'local_user' } as any }));

vi.mock('@/contexts/ProfileContext', () => ({
    useProfile: () => ({
        profile: mockState.profile,
        isLoading: false,
        isDemoMode: false,
        canEdit: true,
        refreshData: vi.fn(),
        switchProfile: vi.fn(),
        updateCurrency: vi.fn()
    })
}));

import { useBadgeSync } from './useBadgeSync';

// Any network call fails the test — badge evaluation must be fully local.
const fetchSpy = vi.fn(() => {
    throw new Error('useBadgeSync must not make network calls');
});

function Harness(props: Parameters<typeof useBadgeSync>[0]) {
    const { unlockedBadges } = useBadgeSync(props);
    return <span>{Array.from(unlockedBadges).sort().join(',')}</span>;
}

const fullFacts = {
    assets: [] as any[],
    goals: [{ id: 'g1' }] as any[],
    netWorthBase: 1_255_770.38,
    assetAccountCount: 2,
    hasAnyDebt: false,
    checkInStreakDays: 3
};

describe('useBadgeSync (in-memory, no cloud sync)', () => {
    let container: HTMLElement;
    let root: ReactDOM.Root;

    beforeEach(() => {
        mockState.profile = { id: 'local_user' };
        globalThis.fetch = fetchSpy as any;
        if (typeof window !== 'undefined') window.fetch = fetchSpy as any;

        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container as any);
    });

    async function renderWith(props: Parameters<typeof useBadgeSync>[0]) {
        await act(async () => {
            root.render(<Harness {...props} />);
        });
    }

    it('evaluates all six badges in-memory from the supplied facts', async () => {
        await renderWith(fullFacts);
        expect(container.textContent).toBe(
            'consistency,debt-slayer,first-steps,goal-setter,millionaire,wealth-tracker'
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('keeps net-worth badges locked while the converted figure is unknown', async () => {
        await renderWith({ ...fullFacts, netWorthBase: null });
        expect(container.textContent).toBe('consistency,debt-slayer,first-steps,goal-setter');
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('evaluates nothing until the profile has loaded', async () => {
        mockState.profile = null;
        await renderWith(fullFacts);
        expect(container.textContent).toBe('');

        // Profile arriving later triggers evaluation (no reload needed).
        mockState.profile = { id: 'local_user' };
        await renderWith(fullFacts);
        expect(container.textContent).toContain('millionaire');
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});
