
import { createClient } from '@/utils/supabase/client';
import { UserProfile, Asset, Liability, RecurringTransaction, Goal } from '@/types';

export interface FullTemplateData {
    profile: UserProfile;
    assets: Asset[];
    liabilities: Liability[];
    recurring: RecurringTransaction[];
    goals: Goal[];
}

const supabase = createClient();


/**
 * Fetches all available public templates from the profiles table.
 */
export async function getPublishedTemplates(): Promise<UserProfile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_template', true)
        .order('currency_code', { ascending: true }) // Group by currency
        .order('full_name', { ascending: true });

    if (error) {
        console.error('Error fetching templates:', error);
        return [];
    }

    return data as UserProfile[];
}

/**
 * Fetches all financial data associated with a specific template user ID.
 */
export async function getTemplateFullData(templateId: string): Promise<FullTemplateData | null> {


    // Fetch Profile
    const profileReq = supabase.from('profiles').select('*').eq('id', templateId).single();

    // Fetch Assets
    const assetsReq = supabase.from('assets').select('*').eq('user_id', templateId);

    // Fetch Liabilities
    const liabsReq = supabase.from('liabilities').select('*').eq('user_id', templateId);

    // Fetch Recurring
    const recurringReq = supabase.from('recurring_transactions').select('*').eq('user_id', templateId);

    // Fetch Goals (if any)
    const goalsReq = supabase.from('goals').select('*').eq('user_id', templateId);

    const [profileRes, assetsRes, liabsRes, recurringRes, goalsRes] = await Promise.all([
        profileReq, assetsReq, liabsReq, recurringReq, goalsReq
    ]);

    if (profileRes.error) {
        console.error('Error fetching template profile:', profileRes.error);
        return null;
    }

    return {
        profile: profileRes.data as UserProfile,
        assets: (assetsRes.data || []).map((a: any) => ({
            ...a,
            investment: a.investment_details // Map JSONB to interface key
        })) as Asset[],
        liabilities: (liabsRes.data || []) as Liability[],
        recurring: (recurringRes.data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            amount: r.amount,
            type: r.type,
            frequency: r.frequency,
            category: r.category,
            startDate: r.start_date, // Map snake to camel
            endDate: r.end_date,
            isActive: r.is_active,   // Map snake to camel
            notes: r.notes,
            currency: r.currency
        })) as RecurringTransaction[],
        goals: (goalsRes.data || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            targetAmount: g.target_amount, // Map snake to camel
            currentAmount: g.current_amount,
            startAmount: g.start_amount,
            currency: g.currency,
            category: g.category,
            deadline: g.deadline,
            createdAt: g.created_at,
            isCompleted: g.is_completed
        })) as Goal[],
    };
}
