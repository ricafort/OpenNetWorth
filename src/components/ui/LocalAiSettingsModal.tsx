/**
 * Why this file exists:
 * In OpenNetWorth, AI intelligence runs entirely locally. This modal provides
 * the user with complete control over their Local LLM runner (LM Studio, Ollama,
 * or custom OpenAI-compatible server), model selection, and connection diagnostics.
 *
 * Tricky logic:
 * - Probes the local server via the `/api/ai/status` backend route to avoid browser
 *   CORS barriers when hitting local host ports (e.g. 1234, 11434).
 * - Saves preferences to localStorage (`opennetworth_local_ai_config`) and broadcasts
 *   a custom window event so other components (e.g. Mentor Chat, Header pill) update immediately.
 *
 * TODO items:
 * - Add inference latency / tokens-per-second benchmark runner within the modal.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { X, Cpu, CheckCircle2, AlertTriangle, RefreshCw, Server, Zap, ExternalLink, ShieldCheck } from 'lucide-react';

interface LocalAiSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface LocalAiConfig {
    endpoint: string;
    model: string;
    provider: 'auto' | 'lmstudio' | 'ollama' | 'custom';
}

const STORAGE_KEY = 'opennetworth_local_ai_config';

export function getSavedLocalAiConfig(): LocalAiConfig {
    if (typeof window === 'undefined') {
        return {
            endpoint: 'http://127.0.0.1:1234/v1',
            model: 'qwen3.8-27b-gsq-rco',
            provider: 'auto'
        };
    }

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch {
        // Fallback to default
    }

    return {
        endpoint: 'http://127.0.0.1:1234/v1',
        model: 'qwen3.8-27b-gsq-rco',
        provider: 'auto'
    };
}

export default function LocalAiSettingsModal({ isOpen, onClose }: LocalAiSettingsModalProps) {
    const [config, setConfig] = useState<LocalAiConfig>(getSavedLocalAiConfig());
    const [status, setStatus] = useState<{
        isAvailable: boolean;
        provider: string;
        activeModel: string;
        availableModels: string[];
        latencyMs?: number;
        error?: string;
    } | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Test connection on mount or open
    useEffect(() => {
        if (isOpen) {
            const saved = getSavedLocalAiConfig();
            setConfig(saved);
            handleTestConnection(saved.endpoint);
        }
    }, [isOpen]);

    const handleTestConnection = async (targetUrl?: string) => {
        setIsTesting(true);
        try {
            const urlToTest = targetUrl || config.endpoint;
            const res = await fetch(`/api/ai/status?url=${encodeURIComponent(urlToTest)}`);
            const data = await res.json();
            setStatus(data);

            // If we detected available models and current model isn't in list, select first
            if (data.isAvailable && data.availableModels && data.availableModels.length > 0) {
                if (!data.availableModels.includes(config.model)) {
                    setConfig(prev => ({ ...prev, model: data.availableModels[0] }));
                }
            }
        } catch (err: any) {
            const isOllama = (targetUrl || config.endpoint).includes('11434');
            setStatus({
                isAvailable: false,
                provider: isOllama ? 'ollama' : 'lmstudio',
                activeModel: '',
                availableModels: [],
                error: err.message || 'Failed to ping local LLM endpoint'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handlePresetSelect = (preset: 'lmstudio' | 'ollama') => {
        let newEndpoint = 'http://127.0.0.1:1234/v1';
        let defaultModel = 'qwen3.8-27b-gsq-rco';

        if (preset === 'ollama') {
            newEndpoint = 'http://127.0.0.1:11434';
            defaultModel = 'llama3.2';
        }

        const newConfig: LocalAiConfig = {
            endpoint: newEndpoint,
            model: defaultModel,
            provider: preset
        };

        setConfig(newConfig);

        // Immediately clear previous engine's models so user never sees stale LM Studio models under Ollama
        setStatus({
            isAvailable: false,
            provider: preset,
            activeModel: defaultModel,
            availableModels: [],
            error: undefined,
        });

        handleTestConnection(newEndpoint);
    };

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        window.dispatchEvent(new Event('opennetworth_ai_config_updated'));
        setSaveSuccess(true);
        setTimeout(() => {
            setSaveSuccess(false);
            onClose();
        }, 600);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card text-card-foreground rounded-3xl w-full max-w-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-2xl">
                            <Cpu size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                                Local LLM Engine
                                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <ShieldCheck size={11} /> 100% Private
                                </span>
                            </h3>
                            <p className="text-xs text-muted-foreground">All AI mentorship runs strictly on your machine. Zero cloud APIs.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Status Card */}
                    <div className={`p-4 rounded-2xl border transition-all ${status?.isAvailable
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                {status?.isAvailable ? (
                                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                ) : (
                                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                )}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider">
                                        {status?.isAvailable
                                            ? `${(status.provider || 'Local LLM').toUpperCase()} Connected`
                                            : `${(status?.provider || (config.endpoint.includes('11434') ? 'Ollama' : 'LM Studio')).toUpperCase()} Offline`}
                                    </p>
                                    <p className="text-xs opacity-90">
                                        {status?.isAvailable
                                            ? `Engine: ${status.provider.toUpperCase()} (${status.latencyMs ?? 0}ms latency)`
                                            : (status?.error || (config.endpoint.includes('11434')
                                                ? 'Ollama not detected on port 11434. Run `ollama run llama3.2` in terminal.'
                                                : 'LM Studio not detected on port 1234. Start Local Server in LM Studio.'))}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleTestConnection()}
                                disabled={isTesting}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-background text-foreground rounded-xl border border-border shadow-sm hover:bg-muted transition-all disabled:opacity-50"
                            >
                                <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
                                {isTesting ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                    </div>

                    {/* Quick Presets */}
                    <div>
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">
                            Quick Engine Presets
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handlePresetSelect('lmstudio')}
                                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 ${config.endpoint.includes('1234')
                                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 shadow-sm'
                                    : 'border-border bg-card hover:bg-muted/40 text-foreground'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-sm flex items-center gap-1.5">
                                        <Zap size={14} className="text-blue-600" /> LM Studio
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">:1234</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground">Local OpenAI Server</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handlePresetSelect('ollama')}
                                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 ${config.endpoint.includes('11434')
                                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 shadow-sm'
                                    : 'border-border bg-card hover:bg-muted/40 text-foreground'
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className="font-bold text-sm flex items-center gap-1.5">
                                        <Server size={14} className="text-indigo-600" /> Ollama
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono">:11434</span>
                                </div>
                                <span className="text-[11px] text-muted-foreground">Native or CLI engine</span>
                            </button>
                        </div>
                    </div>

                    {/* Endpoint URL Input */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block">
                            Endpoint URL
                        </label>
                        <input
                            type="text"
                            value={config.endpoint}
                            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                            placeholder="http://127.0.0.1:1234/v1"
                            className="w-full px-4 py-2.5 bg-muted/30 text-foreground border border-border rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        <p className="text-[11px] text-muted-foreground">Default LM Studio port is 1234. Ollama default is 11434.</p>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground block">
                            Active Model
                        </label>
                        {status?.isAvailable && status?.availableModels && status.availableModels.length > 0 ? (
                            <select
                                value={config.model}
                                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                className="w-full px-4 py-2.5 bg-card text-foreground border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                            >
                                {status.availableModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={config.model}
                                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                    placeholder={config.endpoint.includes('11434') ? "llama3.2 or mistral" : "qwen3.8-27b-gsq-rco"}
                                    className="w-full px-4 py-2.5 bg-muted/30 text-foreground border border-border rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                                {config.endpoint.includes('11434') && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Quick select:</span>
                                        {['llama3.2', 'mistral', 'qwen2.5:7b', 'deepseek-r1:8b', 'phi4'].map(presetModel => (
                                            <button
                                                key={presetModel}
                                                type="button"
                                                onClick={() => setConfig({ ...config, model: presetModel })}
                                                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono border transition-all ${config.model === presetModel
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-muted/60 text-muted-foreground border-border hover:text-foreground'
                                                    }`}
                                            >
                                                {presetModel}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                            {status?.isAvailable && status?.availableModels?.length
                                ? `${status.availableModels.length} local model(s) detected.`
                                : config.endpoint.includes('11434')
                                    ? 'Enter the Ollama model identifier or select a recommended model above.'
                                    : 'Enter the model identifier loaded in your local runner.'}
                        </p>
                    </div>

                    {/* Helpful instructions accordion */}
                    <div className="p-4 bg-muted/40 rounded-2xl border border-border/80 space-y-2 text-xs text-muted-foreground">
                        <p className="font-bold text-foreground flex items-center gap-1.5">
                            💡 Setup Guide for Local LLMs
                        </p>
                        <ul className="list-disc pl-4 space-y-1 leading-relaxed">
                            <li><strong>LM Studio:</strong> Open LM Studio &rarr; Start the Local Server on port 1234 &rarr; Load your preferred model.</li>
                            <li><strong>Ollama:</strong> Open terminal &rarr; run <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">ollama run llama3.2</code> (or mistral, qwen2.5, phi4).</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-border bg-muted/20 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Config saved to local browser storage.</p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-6 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            {saveSuccess ? <CheckCircle2 size={14} /> : null}
                            {saveSuccess ? 'Saved!' : 'Save & Connect'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
