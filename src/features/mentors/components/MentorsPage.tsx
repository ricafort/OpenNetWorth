'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import MentorSettings from '@/features/dashboard/modals/MentorSettings';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useAssetsQuery } from '@/features/assets/hooks/useAssetsQuery';
import { useLiabilitiesQuery } from '@/features/liabilities/hooks/useLiabilitiesQuery';
import { useGoalsQuery } from '@/features/goals/hooks/useGoalsQuery';
import { useProfile } from '@/contexts/ProfileContext';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';
import { Goal } from '@/features/goals/types';
import { STATIC_MENTORS } from '@/features/mentors/data/mentors';

import ChatInterface from '@/features/mentors/components/ChatInterface';
import MentorList from '@/features/mentors/components/MentorList';
import AddMentorModal from '@/features/mentors/components/AddMentorModal';

export const MentorsPage = () => {
    const [customMentors, setCustomMentors] = useState<any[]>([]);
    const [selectedMentorIds, setSelectedMentorIds] = useState<string[]>([STATIC_MENTORS[0].id]);
    const [mode, setMode] = useState<'learn' | 'reflect'>('reflect');
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Domain Hooks
    const { netWorth, assets: totalAssets, liabilities: totalLiabilities, baseCurrency } = useNetWorth();
    const { addAsset } = useAssetsQuery();
    const { addLiability } = useLiabilitiesQuery();
    const { addGoal } = useGoalsQuery();
    const { profile } = useProfile();

    const metrics = {
        netWorth,
        assets: totalAssets,
        liabilities: totalLiabilities
    };

    // Chat State
    const [chat, setChat] = useState<{
        role: 'user' | 'mentor' | 'consensus' | 'action_confirm';
        content?: string;
        mentorId?: string;
        mentorName?: string;
        actionIntent?: any;
        facts?: any;
    }[]>([]);

    const allMentors = [...STATIC_MENTORS, ...customMentors];
    const activeMentors = allMentors.filter(m => selectedMentorIds.includes(m.id));

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

    const handleAddCustomMentor = (mentor: any) => {
        setCustomMentors(prev => [...prev, mentor]);
        setSelectedMentorIds(prev => [...prev, mentor.id]);
        setIsModalOpen(false);
    };

    const handleDeleteCustomMentor = (id: string) => {
        if (confirm('Are you sure you want to delete this mentor?')) {
            setCustomMentors(prev => prev.filter(m => m.id !== id));
            setSelectedMentorIds(prev => prev.filter(mid => mid !== id));
        }
    };

    const handleActionConfirm = async (intent: any) => {
        try {
            const parseAmount = (val: any) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;
                return 0;
            };

            const amount = parseAmount(intent.amount);

            if (intent.action === 'add_asset') {
                const newAsset: Asset = {
                    id: crypto.randomUUID(),
                    name: intent.name || 'New Asset',
                    value: amount,
                    type: intent.type || 'other',
                    currency: intent.currency || baseCurrency || 'USD',
                    is_liquid: true,
                    last_updated: new Date().toISOString()
                };
                await addAsset(newAsset);
            } else if (intent.action === 'add_liability') {
                const newLiability: Liability = {
                    id: crypto.randomUUID(),
                    user_id: profile?.id || 'user-1',
                    name: intent.name || 'New Liability',
                    balance: amount,
                    type: intent.type || 'other',
                    currency: intent.currency || baseCurrency || 'USD',
                    interest_rate: 0,
                    minimum_payment: 0,
                    is_good_debt: false,
                    last_updated: new Date().toISOString()
                };
                await addLiability(newLiability);
            } else if (intent.action === 'add_goal') {
                const newGoal: Goal = {
                    id: crypto.randomUUID(),
                    name: intent.name || 'New Goal',
                    target_amount: amount || 10000,
                    current_amount: 0,
                    start_amount: 0,
                    currency: intent.currency || baseCurrency || 'USD',
                    category: 'custom',
                    created_at: new Date().toISOString()
                };
                await addGoal(newGoal);
            }

            let savedName = intent.name;
            if (!savedName) {
                if (intent.action === 'add_asset') savedName = 'New Asset';
                else if (intent.action === 'add_liability') savedName = 'New Liability';
                else if (intent.action === 'add_goal') savedName = 'New Goal';
            }

            setChat(prev => {
                const filtered = prev.filter(msg => msg.role !== 'action_confirm');
                return [...filtered, {
                    role: 'mentor',
                    mentorName: 'System',
                    content: `✅ Successfully added **${savedName}** to your dashboard.`
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

        if (typeof window !== 'undefined') {
            localStorage.setItem('has_used_mentors', 'true');
            window.dispatchEvent(new Event('storage'));
        }

        try {
            const { getSavedLocalAiConfig } = await import('@/components/ui/LocalAiSettingsModal');
            const localConfig = getSavedLocalAiConfig();

            const parseResp = await fetch('/api/action/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, localConfig })
            });
            const intent = await parseResp.json();

            if (intent.action && intent.confidence > 0.7 && ['add_asset', 'add_liability', 'add_goal'].includes(intent.action)) {
                setChat(prev => [...prev, { role: 'action_confirm', actionIntent: intent }]);
                setIsLoading(false);
                return;
            }

            const selectedMentors = allMentors.filter(m => currentSelectedIds.includes(m.id));

            const responses = await Promise.all(
                selectedMentors.map(async (m) => {
                    // Strip non-serializable React JSX icon property to avoid circular structure JSON serialization error
                    const { icon, ...serializableMentor } = m;

                    const resp = await fetch('/api/mentor', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            mentor: serializableMentor,
                            mode,
                            userContext: {
                                netWorth: metrics.netWorth,
                                totalAssets: metrics.assets,
                                totalLiabilities: metrics.liabilities,
                                currency: baseCurrency
                            },
                            message: userMsg,
                            localConfig
                        })
                    });
                    const data = await resp.json();
                    const reply = data.response?.trim() || data.error || 'No advice could be generated at this time. Please ensure your Local LLM is active.';
                    return { id: m.id, name: m.name, content: reply, facts: data.facts };
                })
            );

            responses.forEach(res => {
                setChat(prev => [...prev, { role: 'mentor', mentorId: res.id, mentorName: res.name, content: res.content, facts: res.facts }]);
            });

            if (responses.length > 1) {
                const consensusMsg = `### Consensus Board Summary\n\nBased on the shared wisdom of ${responses.map(r => r.name).join(', ')}, we find common ground.`;
                setChat(prev => [...prev, { role: 'consensus', content: consensusMsg }]);
            }
        } catch (e: any) {
            console.error('Mentors chat error:', e);
            setChat(prev => [...prev, { role: 'mentor', content: 'Connection error. Ensure your Local LLM (LM Studio on port 1234 or Ollama on port 11434) is running.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[calc(10vh-160px)] relative">
            {/* Sidebar */}
            <MentorList
                staticMentors={STATIC_MENTORS}
                customMentors={customMentors}
                selectedMentorIds={selectedMentorIds}
                onToggle={toggleMentor}
                onDeleteCustom={handleDeleteCustomMentor}
                onOpenAddModal={() => setIsModalOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />

            {/* Main Chat */}
            <ChatInterface
                chat={chat}
                isLoading={isLoading}
                input={input}
                mode={mode}
                activeMentors={activeMentors}
                baseCurrency={baseCurrency}
                onSetMode={setMode}
                onSetInput={setInput}
                onSend={handleSend}
                onActionConfirm={handleActionConfirm}
                onActionCancel={handleActionCancel}
            />

            {/* Modals */}
            <AddMentorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddCustomMentor}
            />

            <MentorSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};
