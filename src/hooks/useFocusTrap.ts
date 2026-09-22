'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Why this file exists:
 * W3C Web Content Accessibility Guidelines (WCAG 2.1 AA) require modal dialogs to trap keyboard
 * focus within the dialog while active, allow closing via the Escape key, and restore focus to the
 * triggering element upon dismissal. Previously, modals lacked focus containment, allowing users to
 * tab into hidden background elements and causing keyboard navigation disorientation (Handover Section 16 & Batch B4).
 *
 * Tricky logic:
 * - Querying focusable elements must ignore disabled or hidden elements (tabindex="-1", aria-hidden="true").
 * - If Shift+Tab is pressed while on the first focusable element, focus wraps around to the last element.
 * - If Tab is pressed while on the last focusable element, focus wraps around to the first element.
 * - Restoring focus to previousActiveElement must check that the element is still attached to the DOM
 *   to avoid errors when trigger buttons were conditionally unmounted.
 *
 * TODO: Support nested modal stacks (e.g. Settings Modal opening a confirmation sub-dialog) with a focus trap registry.
 */

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'area[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    'iframe',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable]'
].join(', ');

/**
 * Returns all currently visible, focusable elements within a given container element.
 */
export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
    if (!container) return [];
    const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    return elements.filter(el => {
        // Exclude elements with aria-hidden="true" or hidden display
        if (el.getAttribute('aria-hidden') === 'true') return false;
        if (el.tabIndex === -1) return false;
        return true;
    });
}

/**
 * Pure keyboard event handler for modal focus trapping and Escape handling.
 */
export function handleTrapKeyDown(
    e: KeyboardEvent,
    container: HTMLElement | null,
    onClose: () => void
): void {
    if (!container) return;

    if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
    }

    if (e.key === 'Tab') {
        const focusable = getFocusableElements(container);
        if (focusable.length === 0) {
            e.preventDefault();
            return;
        }

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];
        const currentActive = document.activeElement;

        if (e.shiftKey) {
            // Shift + Tab: Move focus backwards
            if (currentActive === firstElement || !container.contains(currentActive)) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            // Tab: Move focus forwards
            if (currentActive === lastElement || !container.contains(currentActive)) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
}

export interface UseFocusTrapOptions {
    isOpen: boolean;
    onClose: () => void;
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    restoreFocus?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
    isOpen,
    onClose,
    initialFocusRef,
    restoreFocus = true
}: UseFocusTrapOptions) {
    const containerRef = useRef<T>(null);
    const previousActiveElementRef = useRef<HTMLElement | null>(null);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        handleTrapKeyDown(e, containerRef.current, onClose);
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        // Save previously focused element to return focus when modal closes
        if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            previousActiveElementRef.current = document.activeElement;
        }

        // Set initial focus
        const timer = setTimeout(() => {
            if (initialFocusRef?.current) {
                initialFocusRef.current.focus();
            } else if (containerRef.current) {
                const focusable = getFocusableElements(containerRef.current);
                if (focusable.length > 0) {
                    focusable[0].focus();
                } else {
                    containerRef.current.focus();
                }
            }
        }, 30);

        window.addEventListener('keydown', onKeyDown, true);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', onKeyDown, true);

            if (restoreFocus && previousActiveElementRef.current && typeof document !== 'undefined') {
                if (document.body.contains(previousActiveElementRef.current)) {
                    previousActiveElementRef.current.focus();
                }
            }
        };
    }, [isOpen, onKeyDown, initialFocusRef, restoreFocus]);

    return containerRef;
}
