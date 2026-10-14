/**
 * Why this file exists:
 * Vision attachments must reach each local engine in ITS format: Ollama-native
 * /api/chat takes plain string content plus a sibling images:[rawBase64] array,
 * while OpenAI-compatible servers (LM Studio, Strata, Ollama /v1) take
 * image_url data-URI parts inside content. This proves toProviderMessages
 * adapts correctly and that plain text-only traffic is byte-identical to the
 * pre-vision payload (regression guard for every other chat feature).
 *
 * Tricky logic:
 * - fetch is stubbed per URL: the health probe hits /api/tags or /models first,
 *   then the chat call is captured from the second request.
 * - Data-URI prefixes must be stripped for Ollama and preserved for OpenAI.
 *
 * All operations execute strictly in-memory; zero live storage modifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryLocalLlm, LocalLlmMessage } from './localLlm';

const fetchMock = vi.fn();

function stubFetch(jsonFor: (url: string) => any) {
    fetchMock.mockImplementation(async (url: string) => ({
        ok: true,
        json: async () => jsonFor(url),
        text: async () => ''
    }));
}

function chatBodyFor(urlFragment: string) {
    const call = fetchMock.mock.calls.find(([url]) => String(url).includes(urlFragment));
    return JSON.parse(call![1].body);
}

describe('queryLocalLlm vision payloads', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
        fetchMock.mockReset();
    });

    it('Ollama-native: string content + images[] with raw base64 (no data-URI prefix)', async () => {
        stubFetch((url) =>
            url.includes('/api/tags')
                ? { models: [{ name: 'llama3.2-vision' }] }
                : { message: { content: 'I see a coffee receipt.' } }
        );

        const reply = await queryLocalLlm(
            [
                { role: 'system', content: 'You are a mentor.' },
                { role: 'user', content: 'What is in my image?', images: ['aGVsbG8gcmVjZWlwdA=='] }
            ],
            { endpoint: 'http://127.0.0.1:11434', model: 'llama3.2-vision' }
        );
        expect(reply).toBe('I see a coffee receipt.');

        const body = chatBodyFor('/api/chat');
        const userMsg = body.messages[1];
        expect(userMsg.content).toBe('What is in my image?');
        expect(userMsg.images).toEqual(['aGVsbG8gcmVjZWlwdA==']);
    });

    it('Ollama-native: content parts flatten — text joined, data-URI images stripped into images[]', async () => {
        stubFetch((url) =>
            url.includes('/api/tags')
                ? { models: [{ name: 'llama3.2-vision' }] }
                : { message: { content: 'Receipt read.' } }
        );

        const messages: LocalLlmMessage[] = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'first chunk' },
                    { type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } },
                    { type: 'text', text: 'second chunk' }
                ]
            }
        ];
        await queryLocalLlm(messages, { endpoint: 'http://127.0.0.1:11434', model: 'llama3.2-vision' });

        const body = chatBodyFor('/api/chat');
        expect(body.messages[0].content).toBe('first chunk\nsecond chunk');
        expect(body.messages[0].images).toEqual(['QUJD']);
    });

    it('OpenAI-compatible: image_url data-URI parts pass through inside content', async () => {
        stubFetch((url) =>
            url.includes('/models')
                ? { data: [{ id: 'vision-model' }] }
                : { choices: [{ message: { content: 'Receipt read.' } }] }
        );

        const messages: LocalLlmMessage[] = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'What is in my image?' },
                    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } }
                ]
            }
        ];
        await queryLocalLlm(messages, { endpoint: 'http://127.0.0.1:1234/v1', model: 'vision-model' });

        const body = chatBodyFor('/chat/completions');
        expect(body.messages[0].content).toEqual([
            { type: 'text', text: 'What is in my image?' },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } }
        ]);
    });

    it('OpenAI-compatible: images[] entries are wrapped as data-URI parts', async () => {
        stubFetch((url) =>
            url.includes('/models')
                ? { data: [{ id: 'vision-model' }] }
                : { choices: [{ message: { content: 'ok' } }] }
        );

        await queryLocalLlm(
            [{ role: 'user', content: 'look', images: ['WGk='] }],
            { endpoint: 'http://127.0.0.1:8080/v1', model: 'vision-model' }
        );

        const body = chatBodyFor('/chat/completions');
        const parts = body.messages[0].content;
        expect(parts[0]).toEqual({ type: 'text', text: 'look' });
        expect(parts[1].image_url.url).toBe('data:image/png;base64,WGk=');
    });

    it('text-only messages keep the exact pre-vision payload shape (regression guard)', async () => {
        stubFetch((url) =>
            url.includes('/models')
                ? { data: [{ id: 'm' }] }
                : { choices: [{ message: { content: 'plain' } }] }
        );

        await queryLocalLlm(
            [{ role: 'user', content: 'plain question' }],
            { endpoint: 'http://127.0.0.1:1234/v1', model: 'm' }
        );

        const body = chatBodyFor('/chat/completions');
        expect(body.messages[0]).toEqual({ role: 'user', content: 'plain question' });
        expect(body.messages[0].images).toBeUndefined();
    });
});
