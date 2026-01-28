import { NextResponse } from 'next/server';
import { getBankConnector } from '@/lib/api/bank/factory';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ideally, get user's country from profile
        // For now, accept it from body or default to US
        const { country = 'US' } = await req.json().catch(() => ({}));

        const connector = getBankConnector(country);
        const linkToken = await connector.createLinkToken(user.id);

        return NextResponse.json({ link_token: linkToken });
    } catch (error: any) {
        console.error('Error creating link token:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create link token' },
            { status: 500 }
        );
    }
}
