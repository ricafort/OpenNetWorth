'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, Zap, Anchor, Info, Send, Plus, User, X, Sparkles, Loader2, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import MentorSettings from '@/components/MentorSettings';
import ActionConfirmCard from '@/components/ActionConfirmCard';
import { useDashboard } from '@/contexts/DashboardContext';
import { saveAssets, saveLiabilities, loadAssets, loadLiabilities } from '@/lib/storage';
import { Asset, Liability } from '@/types';

const mentors = [
    {
        id: 'lt',
        name: 'Long-Term Thinker',
        archetype: 'Compounding & Patience',
        description: 'Focuses on the power of time and consistent discipline.',
        icon: < Zap size={20} className="text-amber-500" />
    },
    {
        id: 'rg',
        name: 'Risk Guardian',
        archetype: 'Downside & Stability',
        description: 'Prioritizes capital preservation and resilience against shocks.',
        icon: < ShieldCheck size={20} className="text-blue-500" />
    },
    {
        id: 'go',
        name: 'Growth Optimist',
        archetype: 'Opportunity & Action',
        description: 'Looks for underutilized resources and creative expansion.',
        icon: < Zap size={20} className="text-emerald-500" />
    },
    {
        id: 'sm',
        name: 'Stoic Minimalist',
        archetype: 'Sufficiency & Detachment',
        description: 'Finds freedom in simplicity and detachment from comparison.',
        icon: < Anchor size={20} className="text-slate-500" />
    },
];

export default function MentorsPage() {
    const [customMentors, setCustomMentors] = useState<{
        id: string;
        name: string;
        archetype: string;
        description: string;
        personality_prompt: string;
        quotes?: string[];
        icon: any;
    }[]>([]);
    const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([mentors[0].id]);
    const [mode, setMode] = useState<'learn' | 'reflect'>('reflect');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const { refreshAttributes, metrics } = useDashboard();
    const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);

    // Updated Chat State to support actions
    const [chat, setChat] = useState<{
        role: 'user' | 'mentor' | 'consensus' | 'action_confirm';
        content?: string;
        mentorId?: string;
        mentorName?: string;
        actionIntent?: any; // Structured intent
    }[]>([]);

    // Form State
    const [newMentor, setNewMentor] = useState({
        name: '',
        archetype: '',
        description: '',
        personality_prompt: '',
        quotes: [] as string[]
    });

    const allMentors = [...mentors, ...customMentors];

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('custom_mentors');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Re-attach icons
                const withIcons = parsed.map((m: any) => ({
                    ...m,
                    icon: <User size={20} className="text-slate-500" />
                }));
                setCustomMentors(withIcons);
            } catch (e) { console.error('Failed to load mentors'); }
        }
    }, []);

    useEffect(() => {
        const toSave = customMentors.map(({ icon, ...rest }) => rest);
        localStorage.setItem('custom_mentors', JSON.stringify(toSave));
    }, [customMentors]);

    const toggleMentor = (id: string) => {
        setSelectedMentorIds(prev =>
            prev.includes(id)
                ? (prev.length > 1 ? prev.filter(mid => mid !== id) : prev)
                : [...prev, id]
        );
    };

    const handleActionConfirm = (intent: any) => {
        try {
            if (intent.action === 'add_asset') {
                const assets = loadAssets();
                const newAsset: Asset = {
                    id: `asset-${Date.now()}`,
                    name: intent.name || 'New Asset',
                    value: intent.amount || 0,
                    type: intent.type || 'other', // strictly typed
                    currency: intent.currency || 'USD',
                    is_liquid: true,
                    last_updated: new Date().toISOString()
                };
                saveAssets([...assets, newAsset]);
            } else if (intent.action === 'add_liability') {
                const liabilities = loadLiabilities();
                const newLiability: Liability = {
                    id: `liab-${Date.now()}`,
                    user_id: 'user-1', // Default user
                    name: intent.name || 'New Liability',
                    balance: intent.amount || 0,
                    type: intent.type || 'other', // strictly typed
                    currency: intent.currency || 'USD',
                    interest_rate: 0,
                    minimum_payment: 0,
                    is_good_debt: false,
                    last_updated: new Date().toISOString()
                };
                saveLiabilities([...liabilities, newLiability]);
            }

            // Refresh Context
            refreshAttributes();

            // Add Success Message
            setChat(prev => {
                const filtered = prev.filter(msg => msg.role !== 'action_confirm');
                return [...filtered, {
                    role: 'mentor',
                    mentorName: 'System',
                    content: `✅ Successfully added **${intent.name}** to your dashboard.`
                }];
            });

        } catch (e) {
            console.error(e);
            alert('Failed to execute action.');
        }
    };

    const handleActionCancel = () => {
        setChat(prev => prev.filter(msg => msg.role !== 'action_confirm'));
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        const currentSelectedIds = [...selectedMentorIds];
        setInput('');
        setChat(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        // Gamification: Mark as used
        if (typeof window !== 'undefined') {
            localStorage.setItem('has_used_mentors', 'true');
            // Dispatch storage event for current window hook updates
            window.dispatchEvent(new Event('storage'));
        }

        try {
            // 1. Try to parse intent first
            const parseResp = await fetch('/api/action/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });
            const intent = await parseResp.json();

            // 2. If valid action detected with high confidence
            if (intent.action && intent.confidence > 0.7 && ['add_asset', 'add_liability'].includes(intent.action)) {
                setChat(prev => [...prev, { role: 'action_confirm', actionIntent: intent }]);
                setIsLoading(false);
                return;
            }

            // 3. Fallback to Mentor Chat
            const selectedMentors = allMentors.filter(m => currentSelectedIds.includes(m.id));

            // Parallel fetches for selected mentors
            const responses = await Promise.all(
                selectedMentors.map(async (m) => {
                    const resp = await fetch('/api/mentor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mentor: m,
                            mode,
                            userContext: {
                                netWorth: metrics.netWorth,
                                totalAssets: metrics.assets,
                                totalLiabilities: metrics.liabilities
                            },
                            message: userMsg
                        })
                    });
                    const data = await resp.json();
                    return { id: m.id, name: m.name, content: data.response || data.error };
                })
            );

            // Add responses to chat
            responses.forEach(res => {
                setChat(prev => [...prev, { role: 'mentor', mentorId: res.id, mentorName: res.name, content: res.content }]);
            });

            // Generate Consensus if multiple
            if (responses.length > 1) {
                const consensusMsg = `### Consensus Board Summary\n\nBased on the shared wisdom of ${responses.map(r => r.name).join(', ')}, we find common ground.`;
                setChat(prev => [...prev, { role: 'consensus', content: consensusMsg }]);
            }
        } catch (e) {
            setChat(prev => [...prev, { role: 'mentor', content: 'Connection error. Please check your API key.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateProfile = async () => {
        if (!newMentor.name.trim()) return;
        setIsGeneratingProfile(true);
        try {
            const savedSettings = JSON.parse(localStorage.getItem('mentor_controls') || '{}');

            const resp = await fetch('/api/mentor/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newMentor.name,
                    count: savedSettings.quotesToGenerate || 20
                })
            });
            const data = await resp.json();
            if (data.error) throw new Error(data.error);
            setNewMentor(prev => ({
                ...prev,
                archetype: data.archetype,
                description: data.description,
                personality_prompt: data.personality_prompt,
                quotes: data.quotes || []
            }));
        } catch (e) {
            console.error('Generation failed:', e);
        } finally {
            setIsGeneratingProfile(false);
        }
    };

    const addCustomMentor = () => {
        if (!newMentor.name || !newMentor.description) return;

        const mentor = {
            ...newMentor,
            id: `custom-${Date.now()}`,
            icon: <User size={20} className="text-slate-500" />
        };

        setCustomMentors(prev => [...prev, mentor]);
        setSelectedMentorIds(prev => [...prev, mentor.id]);
        setIsModalOpen(false);
        setNewMentor({ name: '', archetype: '', description: '', personality_prompt: '', quotes: [] });
    };

    const deleteCustomMentor = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this mentor?')) {
            setCustomMentors(prev => prev.filter(m => m.id !== id));
            setSelectedMentorIds(prev => prev.filter(mid => mid !== id));
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[calc(100vh-160px)] relative">
            {/* Modal: Add Custom Mentor */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-3xl w-full max-w-lg shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-950">Add Custom Mentor</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Mentor Name</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. Warren Buffett"
                                        value={newMentor.name}
                                        onChange={e => setNewMentor({ ...newMentor, name: e.target.value })}
                                        className="flex-1 bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    />
                                    <button
                                        onClick={handleGenerateProfile}
                                        disabled={isGeneratingProfile || !newMentor.name.trim()}
                                        className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                                        title="Generate Profile with AI"
                                    >
                                        {isGeneratingProfile ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Archetype</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Value Investing & Discipline"
                                    value={newMentor.archetype}
                                    onChange={e => setNewMentor({ ...newMentor, archetype: e.target.value })}
                                    className="w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">Short Description</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Focuses on moat-driven businesses and margin of safety."
                                    value={newMentor.description}
                                    onChange={e => setNewMentor({ ...newMentor, description: e.target.value })}
                                    className="w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase mb-1.5">AI Persona Prompt (Optional)</label>
                                <textarea
                                    placeholder="e.g. Speak with folksy wisdom, emphasize the multi-decade horizon, and avoid short-term noise."
                                    rows={3}
                                    value={newMentor.personality_prompt}
                                    onChange={e => setNewMentor({ ...newMentor, personality_prompt: e.target.value })}
                                    className="w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                />
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 px-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-all">
                                Cancel
                            </button>
                            <button onClick={addCustomMentor} className="flex-1 py-3 px-4 bg-slate-950 text-white rounded-xl font-bold hover:bg-black transition-all">
                                Create Mentor
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Sidebar: Mentor Selection */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-foreground tracking-tight">AI Mentors</h2>
                        <p className="text-slate-700 mt-2 font-medium">Consult your private board (Multi-select active).</p>
                    </div>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                        title="Mentor Controls"
                    >
                        <SettingsIcon size={20} />
                    </button>
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Standard Board</p>
                    {mentors.map((m) => {
                        const isSelected = selectedMentorIds.includes(m.id);
                        return (
                            <button
                                key={m.id}
                                onClick={() => toggleMentor(m.id)}
                                className={`w-full text-left p-4 rounded-2xl border transition-all relative ${isSelected
                                    ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-50 ring-inset'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-4 right-4 text-blue-600">
                                        <ShieldCheck size={18} fill="currentColor" className="text-blue-100" />
                                    </div>
                                )}
                                <div className="flex items-center gap-3 mb-1">
                                    {m.icon}
                                    <span className="font-bold text-slate-950">{m.name}</span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium">{m.description}</p>
                            </button>
                        );
                    })}

                    {customMentors.length > 0 && (
                        <>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 pt-2">Custom Figures</p>
                            {customMentors.map((m) => {
                                const isSelected = selectedMentorIds.includes(m.id);
                                return (
                                    <div
                                        key={m.id}
                                        onClick={() => toggleMentor(m.id)}
                                        className={`w-full text-left p-4 rounded-2xl border transition-all relative group cursor-pointer ${isSelected
                                            ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-50 ring-inset'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="absolute top-4 right-4 flex items-center gap-2">
                                            {isSelected && (
                                                <ShieldCheck size={18} fill="currentColor" className="text-blue-100 text-blue-600" />
                                            )}
                                            <button
                                                onClick={(e) => deleteCustomMentor(e, m.id)}
                                                className="p-1.5 rounded-full hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-10"
                                                title="Delete Mentor"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mb-1">
                                            {m.icon}
                                            <span className="font-bold text-slate-950">{m.name}</span>
                                        </div>
                                        <p className="text-xs text-slate-700 font-medium">{m.description}</p>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full group p-4 rounded-2xl border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center justify-center gap-2"
                    >
                        <div className="p-2 bg-slate-100 group-hover:bg-blue-100 rounded-full transition-colors text-slate-400 group-hover:text-blue-600">
                            <Plus size={20} />
                        </div>
                        <span className="text-xs font-black text-slate-500 group-hover:text-blue-600 uppercase">Add Your Own Mentor</span>
                    </button>
                </div>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                    <Info className="text-blue-600 shrink-0" size={20} />
                    <p className="text-xs text-blue-800 leading-relaxed">
                        <strong>Board Mode:</strong> Select multiple mentors to triangulate wisdom. Responses are provided individually, followed by a combined summary.
                    </p>
                </div>
            </div>

            {/* Main: Chat Interface */}
            <div className="lg:col-span-2 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Chat Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2 overflow-hidden">
                            {allMentors.filter(m => selectedMentorIds.includes(m.id)).map(m => (
                                <div key={m.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-white p-1 shadow-sm border border-slate-100">
                                    {m.icon}
                                </div>
                            ))}
                        </div>
                        <div className="ml-2">
                            <h3 className="font-bold text-slate-950 leading-tight">Board Consultation</h3>
                            <p className="text-xs text-slate-800 uppercase tracking-widest font-black">
                                {selectedMentorIds.length === 1 ? 'Single Perspective' : `${selectedMentorIds.length} MENTORS ACTIVE`}
                            </p>
                        </div>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setMode('reflect')}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${mode === 'reflect' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            REFLECT
                        </button>
                        <button
                            onClick={() => setMode('learn')}
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
                                    "💰 Add a savings account with $5,000",
                                    "📈 Log a new investment in Tesla",
                                    "🏠 Track my home value at $450k",
                                    "💳 Add a credit card balance of $1,200"
                                ].map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setInput(suggestion.replace(/[\u{1F600}-\u{1F6FF}]/gu, '').trim())} // Strip emoji for cleaner input
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
                                    onConfirm={() => handleActionConfirm(msg.actionIntent)}
                                    onCancel={handleActionCancel}
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
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={mode === 'learn' ? "Explain liquidity ratio..." : "Ask your board a question..."}
                            className="w-full bg-card text-card-foreground border border-border rounded-2xl py-4 pl-6 pr-16 outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all placeholder:text-muted-foreground"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="absolute right-2 top-2 p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <MentorSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}
