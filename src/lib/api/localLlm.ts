/**
 * Why this file exists:
 * OpenNetWorth is an open-source, privacy-first financial dashboard.
 * Instead of routing sensitive financial portfolios, balances, and net worth data
 * to third-party cloud APIs (like OpenAI or Google Gemini), this service executes
 * all AI mentorship, financial analysis, and natural language command parsing
 * strictly on the user's local machine via Local LLMs (LM Studio, Ollama, Strata, LocalAI).
 *
 * Tricky logic:
 * - Local LLM runners may be listening on port 1234 (LM Studio / OpenAI-compatible),
 *   port 11434 (Ollama), or port 8080 (Strata, OpenAI-compatible at /v1). We implement
 *   automated provider detection with short timeouts so the application dynamically
 *   binds to whichever engine is active.
 * - When a local LLM is starting up or temporarily offline, we provide a deterministic
 *   rule-based regex parser fallback for natural language financial actions so the user
 *   experience is never blocked.
 *
 * TODO items:
 * - Add optional WebGPU in-browser LLM runner (e.g. WebLLM) for zero-installation browser execution.
 * - Support local embeddings via nomic-embed-text for local semantic search across transactions.
 */

export interface LocalLlmTextPart {
    type: 'text';
    text: string;
}

export interface LocalLlmImagePart {
    type: 'image_url';
    /** Data URI (data:image/png;base64,...) — the OpenAI-compatible wire format. */
    image_url: { url: string };
}

export type LocalLlmContentPart = LocalLlmTextPart | LocalLlmImagePart;

export interface LocalLlmMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | LocalLlmContentPart[];
    /**
     * Ollama-native image payloads (raw base64, no data-URI prefix). Only
     * consumed by the Ollama branch; OpenAI-compatible servers get image
     * parts inside `content` instead. Vision is opt-in via Local AI settings.
     */
    images?: string[];
}

export interface LocalLlmConfig {
    endpoint?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LocalLlmHealth {
    isAvailable: boolean;
    provider: 'lmstudio' | 'ollama' | 'strata' | 'openai-compatible' | 'none';
    endpoint: string;
    activeModel: string;
    availableModels: string[];
    latencyMs?: number;
    error?: string;
}

export interface ParsedFinancialAction {
    action: 'add_asset' | 'add_liability' | 'add_goal' | 'log_expense' | null;
    type: string | null;
    name: string | null;
    amount: number | null;
    currency: string;
    confidence: number;
}

// Default fallback local ports
const LM_STUDIO_DEFAULT_URL = 'http://127.0.0.1:1234/v1';
const OLLAMA_DEFAULT_URL = 'http://127.0.0.1:11434';
const STRATA_DEFAULT_URL = 'http://127.0.0.1:8080/v1';
const STRATA_DEFAULT_MODEL = 'qwen3.8-flash-next-iq3_s';

/**
 * Infer the engine label from an endpoint URL using its port convention.
 * Strata's :8080 is checked first so its OpenAI-compatible /v1 endpoint is labeled correctly.
 */
function inferProviderFromUrl(url: string): 'lmstudio' | 'ollama' | 'strata' | 'openai-compatible' {
    if (url.includes(':8080')) return 'strata';
    if (url.includes('11434')) return 'ollama';
    if (url.includes('1234')) return 'lmstudio';
    return 'openai-compatible';
}

/**
 * Get active configured local LLM base URL from environment or defaults.
 */
export function getLocalLlmEndpoint(): string {
    return process.env.LOCAL_LLM_URL || LM_STUDIO_DEFAULT_URL;
}

/**
 * Get active configured default local model name.
 */
export function getDefaultModel(): string {
    return process.env.LOCAL_LLM_MODEL || 'qwen3.8-27b-gsq-rco';
}

/**
 * Probes local ports to detect active Local LLM runner and available models.
 */
export async function checkLocalLlmHealth(customUrl?: string): Promise<LocalLlmHealth> {
    const startTime = Date.now();
    const probeUrl = customUrl || getLocalLlmEndpoint();

    // 1. Try probing the configured/custom endpoint
    try {
        const isOllamaNative = probeUrl.includes('11434') && !probeUrl.includes('/v1');
        const modelsEndpoint = isOllamaNative ? `${probeUrl}/api/tags` : `${probeUrl.replace(/\/+$/, '')}/models`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const resp = await fetch(modelsEndpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const data = await resp.json();
            let models: string[] = [];

            if (isOllamaNative && Array.isArray(data.models)) {
                models = data.models.map((m: any) => m.name || m.model);
            } else if (Array.isArray(data.data)) {
                models = data.data.map((m: any) => m.id);
            }

            const provider = inferProviderFromUrl(probeUrl);
            const activeModel = models[0] || (isOllamaNative ? 'llama3.2' : provider === 'strata' ? STRATA_DEFAULT_MODEL : getDefaultModel());
            const latencyMs = Date.now() - startTime;

            return {
                isAvailable: true,
                provider,
                endpoint: probeUrl,
                activeModel,
                availableModels: models,
                latencyMs,
            };
        }
    } catch {
        // Handled below
    }

    // If an explicit customUrl was requested (e.g. user selected Ollama preset or typed a URL),
    // do NOT fall back to other engines on other ports! Report that the requested engine is offline.
    if (customUrl) {
        const provider = inferProviderFromUrl(probeUrl);
        const engineName = provider === 'ollama' ? 'Ollama' : provider === 'strata' ? 'Strata' : provider === 'lmstudio' ? 'LM Studio' : 'Local LLM';
        return {
            isAvailable: false,
            provider,
            endpoint: probeUrl,
            activeModel: provider === 'ollama' ? 'llama3.2' : provider === 'strata' ? STRATA_DEFAULT_MODEL : getDefaultModel(),
            availableModels: [],
            error: `Could not connect to ${engineName} at ${probeUrl}. Make sure the service is running.`,
        };
    }

    // 2. Probe LM Studio default on 1234
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const resp = await fetch('http://127.0.0.1:1234/v1/models', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const data = await resp.json();
            const models = Array.isArray(data.data) ? data.data.map((m: any) => m.id) : [];
            return {
                isAvailable: true,
                provider: 'lmstudio',
                endpoint: 'http://127.0.0.1:1234/v1',
                activeModel: models[0] || 'default-model',
                availableModels: models,
                latencyMs: Date.now() - startTime,
            };
        }
    } catch {
        // Not on 1234
    }

    // 3. Probe Ollama default on 11434
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const resp = await fetch('http://127.0.0.1:11434/api/tags', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const data = await resp.json();
            const models = Array.isArray(data.models) ? data.models.map((m: any) => m.name) : [];
            return {
                isAvailable: true,
                provider: 'ollama',
                endpoint: 'http://127.0.0.1:11434',
                activeModel: models[0] || 'llama3.2',
                availableModels: models,
                latencyMs: Date.now() - startTime,
            };
        }
    } catch {
        // Not on 11434
    }

    // 4. Probe Strata default on 8080 (OpenAI-compatible API served at /v1)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);
        const resp = await fetch(`${STRATA_DEFAULT_URL.replace(/\/+$/, '')}/models`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
            const data = await resp.json();
            const models = Array.isArray(data.data) ? data.data.map((m: any) => m.id) : [];
            return {
                isAvailable: true,
                provider: 'strata',
                endpoint: STRATA_DEFAULT_URL,
                activeModel: models[0] || STRATA_DEFAULT_MODEL,
                availableModels: models,
                latencyMs: Date.now() - startTime,
            };
        }
    } catch {
        // Not on 8080
    }

    return {
        isAvailable: false,
        provider: 'none',
        endpoint: probeUrl,
        activeModel: getDefaultModel(),
        availableModels: [],
        error: 'No local LLM service detected on port 1234 (LM Studio), port 11434 (Ollama), or port 8080 (Strata).',
    };
}

/**
 * Adapt vision-capable messages to each provider's wire format:
 * - Ollama-native /api/chat wants plain string content plus a sibling
 *   `images: [rawBase64]` array — data-URI prefixes are stripped.
 * - OpenAI-compatible servers want image_url parts inside the content array;
 *   `images` entries are appended as data-URI parts (assumed image/png when
 *   the caller gave no mime).
 * Text-only messages (the overwhelming majority) pass through untouched.
 */
function toProviderMessages(messages: LocalLlmMessage[], isOllamaNative: boolean): any[] {
    return messages.map(m => {
        if (typeof m.content === 'string') {
            if (isOllamaNative && m.images && m.images.length > 0) {
                return { role: m.role, content: m.content, images: m.images };
            }
            if (!isOllamaNative && m.images && m.images.length > 0) {
                const parts: LocalLlmContentPart[] = [
                    { type: 'text', text: m.content },
                    ...m.images.map(b64 => ({
                        type: 'image_url' as const,
                        image_url: { url: b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}` }
                    }))
                ];
                return { role: m.role, content: parts };
            }
            return { role: m.role, content: m.content };
        }

        if (isOllamaNative) {
            const text = m.content
                .filter((p): p is LocalLlmTextPart => p.type === 'text')
                .map(p => p.text)
                .join('\n');
            const images = [
                ...(m.images || []),
                ...m.content
                    .filter((p): p is LocalLlmImagePart => p.type === 'image_url')
                    .map(p => p.image_url.url.replace(/^data:[^;]+;base64,/, ''))
            ];
            return { role: m.role, content: text, ...(images.length > 0 ? { images } : {}) };
        }

        // OpenAI-compatible: parts pass through as-is.
        return { role: m.role, content: m.content };
    });
}

/**
 * Execute a completion request against the active Local LLM.
 */
export async function queryLocalLlm(
    messages: LocalLlmMessage[],
    config: LocalLlmConfig = {}
): Promise<string> {
    const health = await checkLocalLlmHealth(config.endpoint);
    const endpoint = config.endpoint || health.endpoint || getLocalLlmEndpoint();
    const model = config.model || health.activeModel || getDefaultModel();
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens ?? 2048;

    if (!health.isAvailable && !config.endpoint) {
        throw new Error('LOCAL_LLM_OFFLINE: Could not reach Local LLM on port 1234, 11434, or 8080.');
    }

    // Standard OpenAI-Compatible payload (works on LM Studio, LocalAI, Ollama /v1)
    const isOllamaNative = endpoint.includes('11434') && !endpoint.includes('/v1');
    const targetUrl = isOllamaNative
        ? `${endpoint.replace(/\/+$/, '')}/api/chat`
        : `${endpoint.replace(/\/+$/, '')}/chat/completions`;

    try {
        const wireMessages = toProviderMessages(messages, isOllamaNative);
        let body: any;
        if (isOllamaNative) {
            body = {
                model,
                messages: wireMessages,
                stream: false,
                options: {
                    temperature,
                    num_predict: maxTokens,
                }
            };
        } else {
            body = {
                model,
                messages: wireMessages,
                temperature,
                max_tokens: maxTokens,
                stream: false,
            };
        }

        // 3-minute ceiling: a 20-30B local model can legitimately take well over a
        // minute to generate a 2k-token answer from a facts-heavy mentor prompt.
        // A truly offline engine is still detected fast by the health probe above,
        // so this ceiling only affects engines that are up but slow.
        const postWithTimeout = () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000);
            return fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));
        };

        let res = await postWithTimeout();

        // LM Studio answers HTTP 500 when its queue is still recovering from a
        // previous generation. One grace-period retry keeps a busy-but-alive engine
        // from falling back to the offline template mid-board.
        if (!res.ok && (res.status === 500 || res.status === 502 || res.status === 503)) {
            const busyStatus = res.status;
            console.warn(`Local LLM busy (HTTP ${busyStatus}), retrying once in 3s...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            res = await postWithTimeout();
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Local LLM busy: first attempt HTTP ${busyStatus}, retry HTTP ${res.status}: ${errText}`);
            }
        } else if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Local LLM responded with HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();

        if (isOllamaNative) {
            const ollamaContent = data.message?.content;
            if (!ollamaContent || !ollamaContent.trim()) {
                throw new Error('Ollama returned an empty response');
            }
            return ollamaContent;
        }

        const choice = data.choices?.[0];
        let content = choice?.message?.content;

        // Fallback for reasoning models (e.g. Qwen 2.5/3.8, DeepSeek R1) that store output in reasoning_content
        if ((!content || !content.trim()) && choice?.message?.reasoning_content) {
            content = choice.message.reasoning_content;
        }

        if (typeof content !== 'string' || !content.trim()) {
            throw new Error('Local LLM returned an empty or malformed response');
        }

        return content;
    } catch (err: any) {
        // No timer to clear here: postWithTimeout clears its own in its finally().
        if (err.name === 'AbortError') {
            throw new Error('Local LLM generation timed out. Your model may still be loading or generating.');
        }
        throw err;
    }
}

/**
 * Deterministic rule-based parser for financial actions.
 * Acts as an instantaneous, zero-latency fallback if Local LLM is offline or busy.
 */
export function ruleBasedParseIntent(message: string): ParsedFinancialAction {
    const text = message.trim();
    const lower = text.toLowerCase();

    // Amount extraction regex (e.g. $5,000, $450k, 5000, 1.2m)
    let amount: number | null = null;
    const amountMatch = text.match(/\$?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?\s*(?:k|m)?)\b/i);
    if (amountMatch) {
        let numStr = amountMatch[1].replace(/,/g, '').trim().toLowerCase();
        if (numStr.endsWith('k')) {
            amount = parseFloat(numStr.replace('k', '')) * 1000;
        } else if (numStr.endsWith('m')) {
            amount = parseFloat(numStr.replace('m', '')) * 1000000;
        } else {
            amount = parseFloat(numStr);
        }
    }

    // Currency detection
    let currency = 'USD';
    if (lower.includes('aud') || lower.includes('a$')) currency = 'AUD';
    else if (lower.includes('eur') || lower.includes('€')) currency = 'EUR';
    else if (lower.includes('gbp') || lower.includes('£')) currency = 'GBP';
    else if (lower.includes('cad') || lower.includes('c$')) currency = 'CAD';

    // 1. Liabilities detection (check first so debt/credit card doesn't get tagged as asset)
    const isLiability = /(add|track|owe|borrow|loan|mortgage|debt|credit card|balance)\b/i.test(lower) &&
        (lower.includes('debt') || lower.includes('credit card') || lower.includes('mortgage') || lower.includes('loan') || lower.includes('bill'));

    if (isLiability) {
        let liabType = 'other';
        let name = 'New Liability';

        if (lower.includes('credit card')) { liabType = 'credit_card'; name = 'Credit Card'; }
        else if (lower.includes('mortgage')) { liabType = 'mortgage'; name = 'Home Mortgage'; }
        else if (lower.includes('car loan') || lower.includes('auto loan')) { liabType = 'auto_loan'; name = 'Auto Loan'; }
        else if (lower.includes('student')) { liabType = 'student_loan'; name = 'Student Loan'; }
        else if (lower.includes('loan')) { liabType = 'personal_loan'; name = 'Personal Loan'; }

        return {
            action: 'add_liability',
            type: liabType,
            name,
            amount: amount || 0,
            currency,
            confidence: 0.95,
        };
    }

    // 2. Assets detection
    const isAsset = /(add|track|log|deposit|save|bought|own)\b.*(savings|checking|cash|account|investment|stock|etf|home|house|property|car|vehicle|crypto|bitcoin|btc|eth)/i.test(lower) ||
        lower.startsWith('add a savings') || lower.startsWith('track my home') || lower.startsWith('log a new investment');

    if (isAsset) {
        let assetType = 'other';
        let name = 'New Asset';

        if (lower.includes('saving')) { assetType = 'cash'; name = 'High Yield Savings'; }
        else if (lower.includes('checking')) { assetType = 'cash'; name = 'Checking Account'; }
        else if (lower.includes('home') || lower.includes('house') || lower.includes('property')) { assetType = 'real_estate'; name = 'Property'; }
        else if (lower.includes('tesla') || lower.includes('tsla')) { assetType = 'investment'; name = 'Tesla Stock'; }
        else if (lower.includes('apple') || lower.includes('aapl')) { assetType = 'investment'; name = 'Apple Stock'; }
        else if (lower.includes('stock') || lower.includes('investment')) { assetType = 'investment'; name = 'Investment Portfolio'; }
        else if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('btc')) { assetType = 'crypto'; name = 'Bitcoin'; }
        else if (lower.includes('car') || lower.includes('vehicle')) { assetType = 'other'; name = 'Vehicle'; }

        return {
            action: 'add_asset',
            type: assetType,
            name,
            amount: amount || 0,
            currency,
            confidence: 0.95,
        };
    }

    // 3. Goals detection
    const isGoal = /(goal|target|plan to save|reach)\b/i.test(lower);
    if (isGoal) {
        return {
            action: 'add_goal',
            type: 'Goal',
            name: text.replace(/(set|add|create)?\s*(a)?\s*goal\s*(to|for)?/i, '').trim() || 'Financial Goal',
            amount: amount || 10000,
            currency,
            confidence: 0.9,
        };
    }

    return {
        action: null,
        type: null,
        name: null,
        amount: null,
        currency: 'USD',
        confidence: 0,
    };
}
