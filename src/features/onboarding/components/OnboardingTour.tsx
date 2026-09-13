'use client';

/**
 * Why this component exists:
 * Provides the interactive step-by-step Joyride tour across dashboard and navigation elements.
 * 
 * Tricky logic:
 * Temporarily disabled per user request ("disable the tutorial and snooze for now")
 * so it never intercepts clicks, displays tutorial dialogs, or dims the dashboard.
 * Returning null immediately bypasses Joyride mounting and timer events.
 * 
 * TODO: Re-enable Joyride onboarding tour once workflow evaluation and testing are complete.
 */
export default function OnboardingTour() {
    return null;
}

