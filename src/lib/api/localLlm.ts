/**
 * Why this file exists:
 * OpenNetWorth is an open-source, privacy-first financial dashboard.
 * Instead of routing sensitive financial portfolios, balances, and net worth data
 * to third-party cloud APIs (like OpenAI or Google Gemini), this service executes
 * all AI mentorship, financial analysis, and natural language command parsing
 * strictly on the user's local machine via Local LLMs (LM Studio, Ollama, LocalAI).
 *
 * Tricky logic:
 * - Local LLM runners may be listening on port 1234 (LM Studio / OpenAI-compatible)
 *   or port 11434 (Ollama). We implement automated provider detection with short
 *   timeouts so the application dynamically binds to whichever engine is active.
 * - When a local LLM is starting up or temporarily offline, we provide a deterministic
 *   rule-based regex parser fallback for natural language financial actions so the user
 *   experience is never blocked.
 *
 * TODO items:
 * - Add optional WebGPU in-browser LLM runner (e.g. WebLLM) for zero-installation browser execution.
 * - Support local embeddings via nomic-embed-text for local semantic search across transactions.
 */

export interface LocalLlmMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LocalLlmConfig {
    endpoint?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface LocalLlmHealth {
    isAvailable: boolean;
    provider: 'lmstudio' | 'ollama' | 'openai-compatible' | 'none';
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

            const activeModel = models[0] || (isOllamaNative ? 'llama3.2' : getDefaultModel());
            const latencyMs = Date.now() - startTime;

            return {
                isAvailable: true,
                provider: probeUrl.includes('1234') ? 'lmstudio' : isOllamaNative ? 'ollama' : 'openai-compatible',
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
        const isOllama = probeUrl.includes('11434');
        return {
            isAvailable: false,
            provider: isOllama ? 'ollama' : probeUrl.includes('1234') ? 'lmstudio' : 'openai-compatible',
            endpoint: probeUrl,
            activeModel: isOllama ? 'llama3.2' : getDefaultModel(),
            availableModels: [],
            error: `Could not connect to ${isOllama ? 'Ollama' : 'Local LLM'} at ${probeUrl}. Make sure the service is running.`,
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

    return {
        isAvailable: false,
        provider: 'none',
        endpoint: probeUrl,
        activeModel: getDefaultModel(),
        availableModels: [],
        error: 'No local LLM service detected on port 1234 (LM Studio) or port 11434 (Ollama).',
    };
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
        throw new Error('LOCAL_LLM_OFFLINE: Could not reach Local LLM on port 1234 or 11434.');
    }

    // Standard OpenAI-Compatible payload (works on LM Studio, LocalAI, Ollama /v1)
    const isOllamaNative = endpoint.includes('11434') && !endpoint.includes('/v1');
    const targetUrl = isOllamaNative
        ? `${endpoint.replace(/\/+$/, '')}/api/chat`
        : `${endpoint.replace(/\/+$/, '')}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for local inference

    try {
        let body: any;
        if (isOllamaNative) {
            body = {
                model,
                messages,
                stream: false,
                options: {
                    temperature,
                    num_predict: maxTokens,
                }
            };
        } else {
            body = {
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream: false,
            };
        }

        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
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
        clearTimeout(timeoutId);
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
