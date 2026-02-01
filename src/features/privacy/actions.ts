'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Grants temporary access to Admins to view user data.
 * @param durationHours How long the access should last. Default 24h.
 * @param reason Optional reason for audit logs.
 */
export async function grantSupportAccess(durationHours: number = 24, reason: string = 'User Support Request') {
    const cookieStore = await cookies();

    // Manual Client Creation (since we are in a pure action file)
    // In a real app, use a shared `createClient` utility
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    const { error } = await supabase.from('admin_access_grants').insert({
        user_id: user.id,
        reason,
        expires_at: expiresAt.toISOString(),
    });

    if (error) {
        console.error('Grant Error:', error);
        throw new Error('Failed to grant access');
    }

    revalidatePath('/');
    return { success: true, expiresAt: expiresAt.toISOString() };
}

/**
 * Revokes any active support access immediately.
 */
export async function revokeSupportAccess() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Soft Delete / Expire immediately
    const { error } = await supabase
        .from('admin_access_grants')
        .update({ expires_at: new Date().toISOString() }) // Set to NOW to expire
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString()); // Only active ones

    if (error) {
        console.error('Revoke Error:', error);
        throw new Error('Failed to revoke access');
    }

    revalidatePath('/');
    return { success: true };
}


/**
 * Check if the current user has granted active support access
 */
export async function getSupportStatus() {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { active: false };

    const { data } = await supabase
        .from('admin_access_grants')
        .select('expires_at')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString()) // Only future expiry
        .order('expires_at', { ascending: false })
        .limit(1)
        .single();

    if (data) {
        return { active: true, expiresAt: data.expires_at };
    }

    return { active: false };
}
