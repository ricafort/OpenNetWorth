# API Routes

This directory contains Next.js API routes for server-side functionality.

## Directory Structure

```
api/
├── action/        # Server actions
├── bank/          # Plaid bank integration
├── cron/          # Scheduled tasks
├── mentor/        # AI mentorship (Gemini)
└── webhooks/      # External service webhooks
```

## Route Details

### `/api/mentor`
AI mentorship endpoints powered by Google Gemini.
- **POST /api/mentor/chat** - Send message to mentor, get AI response
- Requires: `GEMINI_API_KEY` environment variable

### `/api/bank`
Plaid bank integration for syncing accounts.
- **POST /api/bank/link** - Exchange Plaid public token
- **POST /api/bank/sync** - Sync account balances
- **POST /api/bank/accounts** - List connected accounts
- Requires: `PLAID_CLIENT_ID`, `PLAID_SECRET`
- Falls back to sandbox mode if credentials missing

### `/api/cron`
Scheduled background tasks.
- Called by Vercel Cron or external scheduler
- Used for price updates, balance syncs

### `/api/webhooks`
Webhook handlers for external services.
- Plaid transaction webhooks

## Security Notes

- All routes validate authentication via Supabase
- Tokens stored server-side only (never exposed to client)
- Use `SERVICE_ROLE` key for admin operations only
