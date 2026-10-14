/**
 * @vitest-environment happy-dom
 */
/**
 * Component tests for the Strata engine preset in LocalAiSettingsModal.
 * Verifies that selecting the Strata preset binds the :8080 OpenAI-compatible /v1
 * endpoint, pre-selects the Strata model, shows the connected banner, and persists
 * the strata provider to localStorage on Save & Connect.
 */

import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LocalAiSettingsModal from './LocalAiSettingsModal';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

describe('LocalAiSettingsModal Strata Engine Preset', () => {
    let container: HTMLElement;
    let root: ReactDOM.Root;

    beforeEach(() => {
        localStorage.clear();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = ReactDOM.createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.restoreAllMocks();
    });

    const mockStrataStatus = () => {
        vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
            new Response(JSON.stringify({
                isAvailable: true,
                provider: 'strata',
                endpoint: 'http://127.0.0.1:8080/v1',
                activeModel: 'qwen3.8-flash-next-iq3_s',
                availableModels: ['qwen3.8-flash-next-iq3_s'],
                latencyMs: 26,
            }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
    };

    const findButtonByText = (text: string) =>
        Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes(text));

    it('selecting the Strata preset binds the :8080 /v1 endpoint and Strata model', async () => {
        mockStrataStatus();

        await act(async () => {
            root.render(<LocalAiSettingsModal isOpen={true} onClose={() => { }} />);
        });

        const strataBtn = findButtonByText('Strata');
        expect(strataBtn).toBeTruthy();

        await act(async () => {
            strataBtn!.click();
        });

        const endpointInput = container.querySelector('input[placeholder="http://127.0.0.1:1234/v1"]') as HTMLInputElement;
        expect(endpointInput.value).toBe('http://127.0.0.1:8080/v1');

        expect(container.textContent).toContain('STRATA Connected');

        const modelSelect = container.querySelector('select') as HTMLSelectElement;
        expect(modelSelect.value).toBe('qwen3.8-flash-next-iq3_s');
    });

    it('saves the strata provider to localStorage on Save & Connect', async () => {
        mockStrataStatus();

        await act(async () => {
            root.render(<LocalAiSettingsModal isOpen={true} onClose={() => { }} />);
        });

        await act(async () => {
            findButtonByText('Strata')!.click();
        });

        await act(async () => {
            findButtonByText('Save & Connect')!.click();
        });

        const saved = JSON.parse(localStorage.getItem('opennetworth_local_ai_config') || '{}');
        expect(saved.provider).toBe('strata');
        expect(saved.endpoint).toBe('http://127.0.0.1:8080/v1');
        expect(saved.model).toBe('qwen3.8-flash-next-iq3_s');
    });
});
