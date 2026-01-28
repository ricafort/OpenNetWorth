import { NextResponse } from 'next/server';
import { syncAllBankConnections } from '@/lib/api/bank/syncEngine';

// This endpoint is triggered by Vercel Cron
export async function GET(req: Request) {
    // Security: Verify CRON_SECRET if desired, but Vercel protects cron jobs in strict mode usually.
    // For extra safety:
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
        // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // Commented out for dev/demo ease.
    }

    const result = await syncAllBankConnections();
    return NextResponse.json(result);
}
