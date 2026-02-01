import { Zap, ShieldCheck, Anchor } from 'lucide-react';

export const STATIC_MENTORS = [
    {
        id: 'lt',
        name: 'Long-Term Thinker',
        archetype: 'Compounding & Patience',
        description: 'Focuses on the power of time and consistent discipline.',
        icon: <Zap size={20} className="text-amber-500" />
    },
    {
        id: 'rg',
        name: 'Risk Guardian',
        archetype: 'Downside & Stability',
        description: 'Prioritizes capital preservation and resilience against shocks.',
        icon: <ShieldCheck size={20} className="text-blue-500" />
    },
    {
        id: 'go',
        name: 'Growth Optimist',
        archetype: 'Opportunity & Action',
        description: 'Looks for underutilized resources and creative expansion.',
        icon: <Zap size={20} className="text-emerald-500" />
    },
    {
        id: 'sm',
        name: 'Stoic Minimalist',
        archetype: 'Sufficiency & Detachment',
        description: 'Finds freedom in simplicity and detachment from comparison.',
        icon: <Anchor size={20} className="text-slate-500" />
    },
];
