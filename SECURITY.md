# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it privately via email rather than opening a public issue.

**Contact**: [Create a private security advisory on GitHub](https://github.com/ricafort/ClearWorth/security/advisories/new)

## Security Measures

### Row-Level Security (RLS)
All Supabase tables use RLS policies to ensure data isolation:
- Users can only access their own data
- Admins can access template profiles for demo management
- Public read access only for economic benchmarks

### Token Handling
- **Plaid access tokens**: Stored server-side only, never exposed to client
- **Supabase anon key**: Public key, safe for client-side use
- **Gemini API key**: Server-side only via API routes

### Environment Variables
| Variable | Exposure | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_*` | Client-safe | Prefixed variables are bundled into client code |
| `GEMINI_API_KEY` | Server-only | Never prefix with NEXT_PUBLIC_ |
| `PLAID_SECRET` | Server-only | Never prefix with NEXT_PUBLIC_ |

### Best Practices
1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Validate all inputs** - Use Zod for schema validation
3. **Use Server Actions** - Mutations should run server-side
4. **Check RLS policies** - When adding new tables, define policies

## Dependencies

We regularly update dependencies to patch known vulnerabilities:
```bash
npm audit        # Check for vulnerabilities
npm audit fix    # Apply safe fixes
```
