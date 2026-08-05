// Why this file exists:
// Webhook endpoint for Basiq system notifications.
// Receives async notifications from Basiq when bank connections complete (job.completed), fail, or background data sync finishes.

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { event, connectionId, userId } = body;

        console.log(`Received Basiq Webhook: Event=${event}, connectionId=${connectionId}, userId=${userId}`);

        // Handle specific Basiq events
        if (event === 'job.completed' || event === 'connection.created') {
            console.log(`Basiq Connection Ready for user ${userId}`);
            // TODO: Trigger async bank account sync for this user
        }

        if (event === 'connection.failed') {
            console.warn(`Basiq Connection Failed for connection ${connectionId}`);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('Error parsing Basiq webhook:', error);
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }
}
