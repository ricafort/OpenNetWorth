import { NextResponse, type NextRequest } from 'next/server';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';

/**
 * OpenNetWorth Local-First Middleware / Proxy
 * 
 * Why this exists:
 * In OpenNetWorth, all authentication and financial operations are local-first
 * and offline-ready. We do not connect to external auth servers or SaaS clouds,
 * ensuring zero network latency and complete privacy for local requests.
 * Protects local SQLite data against DNS rebinding and cross-origin attacks (Finding F).
 *
 * Tricky logic:
 * - Validates Host, Origin, and Sec-Fetch-Site on all /api/ requests.
 * - Applies private, no-store, max-age=0 headers on API responses.
 *
 * TODO: Support custom proxy configurations if deployed in Docker.
 */
export default async function proxy(request: NextRequest) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
        const securityViolation = validateLocalSecurity(request);
        if (securityViolation) {
            return securityViolation;
        }
        const response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        });
        return applySensitiveHeaders(response);
    }

    return NextResponse.next({
        request: {
            headers: request.headers,
        },
    });
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
