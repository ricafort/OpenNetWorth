import { SupabaseClient } from '@supabase/supabase-js';

export interface Badge {
    badge_id: string;
    earned_at: string;
}

export interface IGamificationRepository {
    getEarnedBadges(userId: string): Promise<Set<string>>;
    awardBadge(userId: string, badgeId: string): Promise<boolean>;
}

export class GamificationRepository implements IGamificationRepository {
    constructor(private supabase: SupabaseClient) { }

    async getEarnedBadges(userId: string): Promise<Set<string>> {
        const { data, error } = await this.supabase
            .from('user_badges')
            .select('badge_id')
            .eq('user_id', userId);

        if (error) {
            console.error('GamificationRepo: Failed to fetch badges', error);
            return new Set();
        }

        return new Set((data as { badge_id: string }[]).map(b => b.badge_id));
    }

    async awardBadge(userId: string, badgeId: string): Promise<boolean> {
        const { error } = await this.supabase.rpc('award_badge', {
            target_user_id: userId,
            badge_slug: badgeId
        });

        if (error) {
            console.error(`GamificationRepo: Failed to award badge ${badgeId}`, error);
            return false;
        }

        return true;
    }
}
