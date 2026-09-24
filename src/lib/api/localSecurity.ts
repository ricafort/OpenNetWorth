/**
 * Local Safety & Network Isolation Engine
 * 
 * Why this exists:
 * Fulfills Independent Assessment Finding F:
 * Protects local SQLite databases from DNS rebinding, cross-origin data exfiltration (CSRF),
 * and cache persistence of sensitive financial records.
 *
 * Tricky logic:
 * - DNS Rebinding Defense: Validates that the HTTP `Host` header strictly matches local loopback
 *   (127.0.0.1, localhost, [::1]). Attackers who rebind attacker.com to 127.0.0.1 will send
 *   Host: attacker.com, which is rejected immediately with HTTP 403 Forbidden.
 * - Cross-Origin Defense: Validates that any incoming `Origin` or `Referer` header has a loopback
 *   or same-host origin. Rejects requests initiated from external websites (e.g. evil.com).
 * - Sec-Fetch-Site: If present and equals 'cross-site', immediately blocked.
 * - No-Store Cache Control: Attaches `private, no-store, max-age=0` and `Pragma: no-cache` to
 *   all sensitive responses so local caches and disk artifacts do not store plain-text financials.
 *
 * TODO items:
 * - Support custom configured bind addresses if user specifies --host in CLI.
 */

import { NextResponse } from 'next/server';

// Loopback hostnames recognized for local-first operations
const ALLOWED_LOOPBACK_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '[::1]',
    '::1'
]);

/**
 * Parses hostname and port from an HTTP Host header.
 * Correctly handles IPv6 brackets, e.g. [::1]:4000.
 */
function extractHostAndPort(hostHeader: string | null): { hostname: string; port: string } {
    if (!hostHeader) return { hostname: '', port: '' };
    // Handle IPv6 [::1]:4000 or [::1]
    if (hostHeader.startsWith('[')) {
        const endBracket = hostHeader.indexOf(']');
        const hostname = endBracket !== -1 ? hostHeader.substring(1, endBracket) : hostHeader;
        const remainder = endBracket !== -1 ? hostHeader.substring(endBracket + 1) : '';
        const port = remainder.startsWith(':') ? remainder.substring(1) : '';
        return { hostname: hostname.toLowerCase().trim(), port };
    }
    const parts = hostHeader.split(':');
    return {
        hostname: parts[0].toLowerCase().trim(),
        port: parts[1] || ''
    };
}

/**
 * Validates incoming HTTP requests against local safety and network isolation rules.
 * 
 * Why this exists:
 * Fulfills Item 4: Finishes the local security boundary by strictly validating trusted
 * origins by scheme (http/https), host (loopback), and port (matching listener port).
 * Rejects untrusted localhost ports (e.g. a rogue process on port 9999) and implements
 * Referer fallback when Origin is not present.
 * 
 * Tricky logic:
 * - A request from http://localhost:9999 to http://localhost:4000 must NOT be trusted just
 *   because the hostname is "localhost". The port must match the active service port.
 * - Browsers often omit Origin on standard same-origin GET/navigation requests, sending
 *   Referer instead. We evaluate Referer with the exact same strict scheme/host/port rules.
 * - Null origins ('null') sent by sandboxed frames or privacy configurations are rejected.
 * 
 * TODO: Support custom configured bind addresses if user specifies --host in CLI.
 */
export function validateLocalSecurity(request: Request): NextResponse | null {
    const hostHeader = request.headers.get('host');
    const hostInfo = extractHostAndPort(hostHeader);

    // 1. DNS Rebinding Protection: Host header must be a local loopback hostname
    if (hostHeader && !ALLOWED_LOOPBACK_HOSTS.has(hostInfo.hostname)) {
        return new NextResponse(
            JSON.stringify({ error: 'Access denied: Untrusted host header (DNS rebinding protection)' }),
            {
                status: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, no-store, max-age=0'
                }
            }
        );
    }

    // 2. Cross-Origin Protection: Validate Origin (or fallback to Referer)
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const candidateUrl = origin || referer;

    if (candidateUrl) {
        if (candidateUrl === 'null') {
            return new NextResponse(
                JSON.stringify({ error: 'Access denied: Null origin forbidden' }),
                {
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, no-store, max-age=0'
                    }
                }
            );
        }

        try {
            const parsed = new URL(candidateUrl);

            // Scheme validation: must be http or https
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return new NextResponse(
                    JSON.stringify({ error: 'Access denied: Untrusted URL scheme' }),
                    {
                        status: 403,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'private, no-store, max-age=0'
                        }
                    }
                );
            }

            // Hostname validation: must be loopback or match host header
            const parsedHostname = parsed.hostname.toLowerCase();
            if (!ALLOWED_LOOPBACK_HOSTS.has(parsedHostname) && parsedHostname !== hostInfo.hostname) {
                return new NextResponse(
                    JSON.stringify({ error: 'Access denied: Cross-origin access forbidden' }),
                    {
                        status: 403,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'private, no-store, max-age=0'
                        }
                    }
                );
            }

            // Port validation: do not trust every localhost port automatically
            const parsedPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
            const expectedPort = hostInfo.port || (parsed.protocol === 'https:' ? '443' : '80');

            if (hostInfo.port && parsedPort !== expectedPort) {
                return new NextResponse(
                    JSON.stringify({ error: `Access denied: Cross-port access forbidden (expected port ${hostInfo.port}, received ${parsedPort})` }),
                    {
                        status: 403,
                        headers: {
                            'Content-Type': 'application/json',
                            'Cache-Control': 'private, no-store, max-age=0'
                        }
                    }
                );
            }
        } catch {
            return new NextResponse(
                JSON.stringify({ error: 'Access denied: Invalid origin or referer header' }),
                {
                    status: 403,
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'private, no-store, max-age=0'
                    }
                }
            );
        }
    }

    // 3. Sec-Fetch-Site Header Check (browser native fetch metadata)
    const secFetchSite = request.headers.get('sec-fetch-site');
    if (secFetchSite === 'cross-site') {
        return new NextResponse(
            JSON.stringify({ error: 'Access denied: Cross-site requests prohibited' }),
            {
                status: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'private, no-store, max-age=0'
                }
            }
        );
    }

    return null; // Valid
}

export function applySensitiveHeaders(response: NextResponse): NextResponse {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    return response;
}
