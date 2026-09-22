/**
 * Modal Accessibility & Focus Trapping Test Suite
 *
 * Why this exists:
 * W3C WCAG 2.1 AA requires that when a modal dialog is opened:
 * 1. Focus must be trapped inside the modal (Tab wraps from last to first; Shift+Tab wraps from first to last).
 * 2. Pressing the Escape key immediately triggers onClose().
 * 3. Non-interactive or aria-hidden elements are excluded from focusable targets (Handover Section 16 & Batch B4).
 *
 * Tricky logic:
 * We test getFocusableElements and handleTrapKeyDown using synthetic DOM elements to verify
 * wrap-around boundaries, preventDefault behavior, and Escape propagation termination.
 *
 * TODO: Add automated axe-core accessibility auditing on rendered dialog component trees.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFocusableElements, handleTrapKeyDown } from './useFocusTrap';

describe('Modal Accessibility & Focus Trapping', () => {
    // Mock minimal DOM for testing pure functions
    function createMockElement(tag: string, attrs: Record<string, string> = {}): any {
        const listeners: Record<string, Function[]> = {};
        const el: any = {
            tagName: tag.toUpperCase(),
            tabIndex: attrs.tabindex ? parseInt(attrs.tabindex, 10) : 0,
            disabled: attrs.disabled !== undefined,
            focused: false,
            focus: vi.fn(() => { el.focused = true; }),
            getAttribute: vi.fn((attr: string) => attrs[attr] || null),
            contains: vi.fn((other: any) => false),
            querySelectorAll: vi.fn(),
            children: []
        };
        return el;
    }

    it('identifies focusable elements and filters out disabled or aria-hidden targets', () => {
        const btn1 = createMockElement('button', {});
        const input1 = createMockElement('input', {});
        const hiddenEl = createMockElement('button', { 'aria-hidden': 'true' });
        const negativeTabEl = createMockElement('div', { tabindex: '-1' });

        const container: any = {
            querySelectorAll: vi.fn(() => [btn1, input1, hiddenEl, negativeTabEl])
        };

        const focusable = getFocusableElements(container);
        expect(focusable).toHaveLength(2);
        expect(focusable).toContain(btn1);
        expect(focusable).toContain(input1);
        expect(focusable).not.toContain(hiddenEl);
        expect(focusable).not.toContain(negativeTabEl);
    });

    it('triggers onClose and prevents default on Escape key', () => {
        const onClose = vi.fn();
        const preventDefault = vi.fn();
        const stopPropagation = vi.fn();

        const event = {
            key: 'Escape',
            preventDefault,
            stopPropagation
        } as unknown as KeyboardEvent;

        const container = createMockElement('div');

        handleTrapKeyDown(event, container, onClose);

        expect(preventDefault).toHaveBeenCalled();
        expect(stopPropagation).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
    });

    it('wraps focus to first element when tabbing forward from last element', () => {
        const onClose = vi.fn();
        const preventDefault = vi.fn();

        const btnFirst = createMockElement('button');
        const btnLast = createMockElement('button');

        const container = createMockElement('div');
        container.querySelectorAll = vi.fn(() => [btnFirst, btnLast]);
        container.contains = vi.fn(() => true);

        // Mock document.activeElement
        const originalActive = (globalThis as any).document?.activeElement;
        (globalThis as any).document = {
            activeElement: btnLast
        };

        const event = {
            key: 'Tab',
            shiftKey: false,
            preventDefault
        } as unknown as KeyboardEvent;

        handleTrapKeyDown(event, container, onClose);

        expect(preventDefault).toHaveBeenCalled();
        expect(btnFirst.focus).toHaveBeenCalled();

        (globalThis as any).document = { activeElement: originalActive };
    });

    it('wraps focus to last element when shift-tabbing backward from first element', () => {
        const onClose = vi.fn();
        const preventDefault = vi.fn();

        const btnFirst = createMockElement('button');
        const btnLast = createMockElement('button');

        const container = createMockElement('div');
        container.querySelectorAll = vi.fn(() => [btnFirst, btnLast]);
        container.contains = vi.fn(() => true);

        // Mock document.activeElement
        (globalThis as any).document = {
            activeElement: btnFirst
        };

        const event = {
            key: 'Tab',
            shiftKey: true,
            preventDefault
        } as unknown as KeyboardEvent;

        handleTrapKeyDown(event, container, onClose);

        expect(preventDefault).toHaveBeenCalled();
        expect(btnLast.focus).toHaveBeenCalled();
    });
});
