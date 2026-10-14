/**
 * @vitest-environment happy-dom
 */
/**
 * Tests for ChatInterface message actions: bubbles render by message id, the
 * hover-revealed copy / regenerate / delete buttons fire the right callbacks with
 * the right ids, Regenerate appears only on the last assistant-side bubble, and
 * action_confirm bubbles render the confirm card without an action row.
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChatInterface from './ChatInterface';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const baseProps = {
    isLoading: false,
    input: '',
    mode: 'reflect' as const,
    activeMentors: [] as any[],
    baseCurrency: 'USD' as any,
    onSetMode: () => {},
    onSetInput: () => {},
    onSend: () => {},
    onActionConfirm: () => {},
    onActionCancel: () => {}
};

const chat = [
    { id: 'u1', role: 'user', content: 'How is my posture?', createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 'm1', role: 'mentor', mentorId: 'buffett', mentorName: 'Warren Buffett', content: 'Moats matter.', createdAt: '2026-10-01T00:00:05.000Z' },
    { id: 'c1', role: 'consensus', content: '### Consensus Board Summary', createdAt: '2026-10-01T00:00:06.000Z' }
];

describe('ChatInterface message actions', () => {
    let container: HTMLElement;
    let root: ReactDOM.Root;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
    });

    const render = (overrides: any = {}) => {
        act(() => {
            root.render(
                <ChatInterface
                    chat={chat}
                    lastAssistantId="c1"
                    onCopyMessage={vi.fn()}
                    onDeleteMessage={vi.fn()}
                    onRegenerate={vi.fn()}
                    {...baseProps}
                    {...overrides}
                />
            );
        });
    };

    it('renders every bubble with its content', () => {
        render();
        expect(container.textContent).toContain('How is my posture?');
        expect(container.textContent).toContain('Moats matter.');
        expect(container.textContent).toContain('Consensus Board Summary');
    });

    it('offers Regenerate only on the last assistant-side bubble', () => {
        render();
        expect(container.querySelectorAll('button[aria-label="Regenerate response"]').length).toBe(1);
    });

    it('copy and delete callbacks receive the clicked message id', () => {
        const onCopyMessage = vi.fn();
        const onDeleteMessage = vi.fn();
        render({ onCopyMessage, onDeleteMessage });

        const copyBtns = container.querySelectorAll('button[aria-label="Copy message"]');
        expect(copyBtns.length).toBe(3); // user, mentor, and consensus bubbles all have text
        act(() => { (copyBtns[1] as HTMLElement).click(); });
        expect(onCopyMessage).toHaveBeenCalledWith('m1');

        const delBtns = container.querySelectorAll('button[aria-label="Delete message"]');
        expect(delBtns.length).toBe(3);
        act(() => { (delBtns[0] as HTMLElement).click(); });
        expect(onDeleteMessage).toHaveBeenCalledWith('u1');
    });

    it('action_confirm bubbles render the confirm card without a message action row', () => {
        act(() => {
            root.render(
                <ChatInterface
                    chat={[{
                        id: 'a1',
                        role: 'action_confirm',
                        actionIntent: { action: 'add_asset', type: 'Cash', name: 'Savings', amount: 5000, currency: 'USD', confidence: 0.9 },
                        createdAt: '2026-10-01T00:00:00.000Z'
                    }]}
                    onCopyMessage={vi.fn()}
                    onDeleteMessage={vi.fn()}
                    onRegenerate={vi.fn()}
                    {...baseProps}
                />
            );
        });
        expect(container.textContent).toContain('Add New Asset');
        expect(container.querySelectorAll('button[aria-label="Delete message"]').length).toBe(0);
        expect(container.querySelectorAll('button[aria-label="Copy message"]').length).toBe(0);
    });

    it('header export buttons appear only with a non-empty chat and fire with the format', () => {
        const onExportChat = vi.fn();
        render({ onExportChat });
        expect(container.querySelectorAll('button[aria-label="Export chat as Markdown"]').length).toBe(1);
        expect(container.querySelectorAll('button[aria-label="Export chat as JSON"]').length).toBe(1);
        act(() => { (container.querySelector('button[aria-label="Export chat as JSON"]') as HTMLElement).click(); });
        expect(onExportChat).toHaveBeenCalledWith('json');

        // Empty chat → nothing to export
        act(() => {
            root.render(
                <ChatInterface chat={[]} onExportChat={onExportChat} {...baseProps} />
            );
        });
        expect(container.querySelectorAll('button[aria-label="Export chat as Markdown"]').length).toBe(0);
    });

    it('resolved action_confirm bubbles render a static chip — no live Confirm/Cancel buttons', () => {
        // A restored session must never offer to re-execute an already-applied add.
        act(() => {
            root.render(
                <ChatInterface
                    chat={[{
                        id: 'a1',
                        role: 'action_confirm',
                        actionIntent: { action: 'add_asset', type: 'Cash', name: 'Savings', amount: 5000, currency: 'USD', confidence: 0.9 },
                        actionIntentResolved: 'confirmed',
                        createdAt: '2026-10-01T00:00:00.000Z'
                    }, {
                        id: 'a2',
                        role: 'action_confirm',
                        actionIntent: { action: 'add_goal', name: 'Emergency Fund', amount: 20000, currency: 'USD', confidence: 0.8 },
                        actionIntentResolved: 'cancelled',
                        createdAt: '2026-10-01T00:00:01.000Z'
                    }]}
                    onCopyMessage={vi.fn()}
                    onDeleteMessage={vi.fn()}
                    onRegenerate={vi.fn()}
                    {...baseProps}
                />
            );
        });
        expect(container.textContent).toContain('Add New Asset — confirmed');
        expect(container.textContent).toContain('Add New Goal — cancelled');
        // No interactive card buttons anywhere
        const buttons = Array.from(container.querySelectorAll('button')).map(b => b.textContent?.trim());
        expect(buttons).not.toContain('Confirm');
        expect(buttons).not.toContain('Cancel');
    });
});
