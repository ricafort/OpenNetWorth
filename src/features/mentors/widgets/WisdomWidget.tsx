import WidgetWrapper from '@/features/dashboard/widgets/WidgetWrapper';
import WisdomBanner from '@/features/mentors/components/WisdomBanner';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { ShieldCheck, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function WisdomWidget() {
    const { isEditMode, hideWidget, openSettings } = useDashboard();
    const [customMentors, setCustomMentors] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem('custom_mentors');
        if (saved) {
            try {
                setCustomMentors(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    return (
        <WidgetWrapper
            id="wisdom"
            isEditMode={isEditMode}
            onRemove={() => hideWidget('wisdom')}
        >
            <div className="flex flex-col h-full gap-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="text-blue-600" size={20} />
                    <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Wisdom Board</h3>
                </div>

                <div className="flex-1 overflow-auto">
                    <WisdomBanner
                        customMentors={customMentors}
                        onOpenSettings={openSettings}
                    />
                </div>

                <Link
                    href="/mentors"
                    className="w-full py-3 bg-slate-950 hover:bg-black text-white rounded-xl font-black uppercase text-xs transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                    <MessageSquare size={16} />
                    Consult the Board
                </Link>
            </div>
        </WidgetWrapper>
    );
}
