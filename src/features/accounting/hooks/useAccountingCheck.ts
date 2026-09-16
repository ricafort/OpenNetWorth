'use client';

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';

export function useAccountingCheck() {
    const { profile, isLoading: profileLoading } = useProfile();

    const { data, isLoading } = useQuery({
        queryKey: ['accounting', 'check', profile?.id],
        queryFn: async () => {
            const res = await fetch('/api/accounting');
            if (!res.ok) throw new Error('Failed to fetch accounting check');
            const json = await res.json();
            if (!json.success) throw new Error(json.error || 'Unknown error');
            return json.accounts || [];
        },
        enabled: !profileLoading,
        staleTime: 60000,
    });

    const hasModernRecords = data ? data.length > 0 : false;
    const hasModernLiabilities = data ? data.some((a: any) => a.type === 'liability') : false;
    const hasModernAssets = data ? data.some((a: any) => a.type === 'asset') : false;

    return {
        hasModernRecords,
        hasModernLiabilities,
        hasModernAssets,
        isLoading
    };
}
