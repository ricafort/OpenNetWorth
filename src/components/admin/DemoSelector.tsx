
'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { createClient } from '@/utils/supabase/client';
import { User, ChevronDown, Check } from 'lucide-react';

type TemplateProfile = {
    id: string;
    full_name: string;
    income_range_display: string | null;
    country_code: string;
    benchmark_bracket: string | null;
    avatar_url: string | null;
};

export function DemoSelector() {
    const { profile, switchProfile } = useProfile();
    const [templates, setTemplates] = useState<TemplateProfile[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function loadTemplates() {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('is_template', true)
                .order('income_range_display', { ascending: true }); // Rough sort

            if (!error && data) {
                // Custom sort to match logical bracket progression if needed, 
                // but for now DB sort is okay or we sort by simple string logic
                setTemplates(data as TemplateProfile[]);
            }
            setLoading(false);
        }
        loadTemplates();
    }, []);

    const handleSelect = async (templateId: string) => {
        await switchProfile(templateId);
        setIsOpen(false);
        // Page refresh is handled by context or we force it if needed
        window.location.reload();
    };

    const currentTemplate = templates.find(t => t.id === profile?.id);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 transition-all w-full md:w-80 group"
            >
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                    {currentTemplate?.avatar_url ? (
                        <img src={currentTemplate.avatar_url} alt="Avatar" className="w-full h-full rounded-full" />
                    ) : (
                        <User size={20} />
                    )}
                </div>

                <div className="text-left flex-1">
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Viewing As</div>
                    <div className="text-sm font-semibold text-white truncate">
                        {currentTemplate ? currentTemplate.full_name : 'Select Data Template'}
                    </div>
                </div>

                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full md:w-96 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-white/10">
                    <div className="p-3">
                        <div className="text-xs font-bold text-slate-500 px-3 pb-2 uppercase tracking-widest">
                            Available Benchmarks
                        </div>

                        {loading && <div className="p-4 text-center text-slate-500">Loading templates...</div>}

                        <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {templates.map((template) => (
                                <button
                                    key={template.id}
                                    onClick={() => handleSelect(template.id)}
                                    className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all group ${profile?.id === template.id
                                            ? 'bg-blue-600/10 border border-blue-500/30'
                                            : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <img
                                        src={template.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${template.id}`}
                                        alt={template.full_name}
                                        className="w-10 h-10 rounded-full bg-slate-800"
                                    />

                                    <div className="text-left flex-1">
                                        <div className={`font-semibold ${profile?.id === template.id ? 'text-blue-400' : 'text-slate-200 group-hover:text-white'}`}>
                                            {template.full_name}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                                                {template.country_code}
                                            </span>
                                            <span>
                                                {template.income_range_display || template.benchmark_bracket}
                                            </span>
                                        </div>
                                    </div>

                                    {profile?.id === template.id && (
                                        <Check size={18} className="text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-3 text-center border-t border-slate-800">
                        <p className="text-[10px] text-slate-500">
                            Selecting a template switches data context.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
