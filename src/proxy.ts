import { NextResponse, type NextRequest } from 'next/server'

/**
 * OpenNetWorth Local-First Middleware / Proxy
 * 
 * Why this exists:
 * In OpenNetWorth, all authentication and financial operations are local-first
 * and offline-ready. We do not connect to external auth servers or SaaS clouds,
 * ensuring zero network latency and complete privacy for local requests.
 */
export default async function proxy(request: NextRequest) {
    return NextResponse.next({
        request: {
            headers: request.headers,
        },
    })
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for static assets:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
