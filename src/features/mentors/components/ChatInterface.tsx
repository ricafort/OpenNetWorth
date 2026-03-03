'use client';

import { MessageSquare, Send } from 'lucide-react';
import ActionConfirmCard from '@/components/ui/ActionConfirmCard';
import { formatCurrency } from '@/lib/utils/currencyService';

import { CurrencyCode } from '@/types';

interface ChatInterfaceProps {
    // TUTORIAL: This is a "Presentational Component".
    // It receives all data (chat, activeMentors) and callbacks (onSend, onSetInput) via props.
    // It has NO dependency on the API layer or complex logic. This makes it easy to test and preview (Storybook).
    chat: any[];
    isLoading: boolean;
    input: string;
    mode: 'reflect' | 'learn';
    activeMentors: any[];
    baseCurrency: CurrencyCode;
    onSetMode: (mode: 'reflect' | 'learn') => void;
    onSetInput: (val: string) => void;
    onSend: () => void;
    onActionConfirm: (intent: any) => void;
    onActionCancel: () => void;
}

export default function ChatInterface({
    chat,
    isLoading,
    input,
    mode,
    activeMentors,
    baseCurrency,
    onSetMode,
    onSetInput,
    onSend,
    onActionConfirm,
    onActionCancel
}: ChatInterfaceProps) {

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onSend();
    };

    return (
        <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[600px] lg:h-auto min-h-[500px]">
            {/* Chat Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 overflow-hidden">
                        {activeMentors.map(m => (
                            <div key={m.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-white p-1 shadow-sm border border-slate-100 flex items-center justify-center">
                                {m.icon}
                            </div>
                        ))}
                    </div>
                    <div className="ml-2">
                        <h3 className="font-bold text-slate-950 leading-tight">Board Consultation</h3>
                        <p className="text-xs text-slate-800 uppercase tracking-widest font-black">
                            {activeMentors.length === 1 ? 'Single Perspective' : `${activeMentors.length} MENTORS ACTIVE`}
                        </p>
                    </div>
                </div>

                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => onSetMode('reflect')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'reflect' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        REFLECT
                    </button>
                    <button
                        onClick={() => onSetMode('learn')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'learn' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        LEARN
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
                {chat.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-8 pt-10">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                <MessageSquare className="text-slate-300" size={32} />
                            </div>
                            <div className="max-w-xs mx-auto">
                                <h4 className="text-slate-900 font-bold mb-1">Your Personal Board</h4>
                                <p className="text-slate-500 text-sm">
                                    Ask for advice or simply tell them to update your financial data.
                                </p>
                            </div>
                        </div>

                        <div className="w-full max-w-sm space-y-3 px-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Try saying...</p>
                            {[
                                `💰 Add a savings account with ${formatCurrency(5000, baseCurrency)}`,
                                "📈 Log a new investment in Tesla",
                                `🏠 Track my home value at ${formatCurrency(450000, baseCurrency)}`,
                                `💳 Add a credit card balance of ${formatCurrency(1200, baseCurrency)}`
                            ].map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => onSetInput(suggestion.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim())}
                                    className="w-full text-left p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-200 text-slate-600 hover:text-blue-700 text-sm font-medium transition-all group flex items-center gap-3"
                                >
                                    <span className="text-lg opacity-80 group-hover:opacity-100 transition-opacity">{suggestion.split(' ')[0]}</span>
                                    <span>{suggestion.substring(2)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {chat.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'action_confirm' ? (
                            <ActionConfirmCard
                                intent={msg.actionIntent}
                                onConfirm={() => onActionConfirm(msg.actionIntent)}
                                onCancel={onActionCancel}
                            />
                        ) : (
                            <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100 shadow-lg'
                                : msg.role === 'consensus'
                                    ? 'bg-slate-900 text-slate-100 border-2 border-blue-500 shadow-lg'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                                }`}>
                                {msg.mentorName && (
                                    <p className="text-[10px] font-black uppercase tracking-tighter text-blue-600 mb-1">{msg.mentorName}</p>
                                )}
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none border border-slate-200 animate-pulse flex gap-2">
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => onSetInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'learn' ? "Explain liquidity ratio..." : "Ask your board a question..."}
                        className="w-full bg-card text-card-foreground border border-border rounded-2xl py-4 pl-6 pr-16 outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all placeholder:text-muted-foreground"
                    />
                    <button
                        onClick={onSend}
                        disabled={isLoading || !input.trim()}
                        className="absolute right-2 top-2 p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
