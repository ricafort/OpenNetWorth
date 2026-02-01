# Vercel Deployment Guide

## 1. Overview
This guide details how to deploy ClearWorth to [Vercel](https://vercel.com/) via GitHub integration.

### Deployment Pipeline

```text
  [ 💻 Developer ]
        │
        │ (1) git push
        ▼
  [ 🐙 GitHub ]
        │
        │ (2) Webhook trigger
        ▼
  [ ▲ Vercel Build ] ◀────────────── [ 🔒 Env Vars ]
        │                                  │
        │ (3) Build Next.js                │ (API Keys)
        │ (4) Run Lint/Checks              │
        ▼                                  ▼
  [ 🌍 Production ] ─────────────▶ [ ☁️ Supabase ]
   (clearworth.app)                 (Postgres DB)
```

## 2. Prerequisites
- GitHub Repository with the latest code.
- Vercel Account.
- Supabase Project (Production).
- Google Cloud Project (for Auth).

## 3. Database Setup (Critical)
Before deploying code, ensure your Supabase project has the correct schema.

1.  **Locate the Schema**: Find `supabase_migrations/00_schema_v1.sql`.
2.  **Apply via Dashboard**:
    -   Go to Supabase Dashboard -> SQL Editor.
    -   Paste the content of `00_schema_v1.sql`.
    -   Run the query to create all tables, RLS policies, and triggers.
3.  **Use CLI (Optional but Recommended)**:
    -   `npx supabase db push`

### 3.1 Security & Privacy Migrations (New)
Ensure you have applied the security hardening scripts. If manually applying SQL, don't forget:
-   `supabase_migrations/01_fix_profile_role_security.sql` (Fixes Privilege Escalation)
-   `supabase_migrations/02_privacy_trust_hardening.sql` (Enables Break-Glass Support)

## 4. Deployment Steps

### Step 1: Push to GitHub
Ensure all your changes (including the new Auth features) are committed and pushed to `main`.

### Step 2: Import Project in Vercel
1.  Log in to Vercel.
2.  Click **Add New...** -> **Project**.
3.  Select your GitHub repository (`ClearWorth`).
4.  **Framework Preset**: Next.js (Auto-detected).
5.  **Root Directory**: `./` (Default).

### Step 3: Configure Environment Variables
Expand the **Environment Variables** section and add the following:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Prod Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Prod Supabase Anon Key |
| `GEMINI_API_KEY` | Google AI Studio Key |
| `PLAID_CLIENT_ID` | (Optional) Plaid Client ID |
| `PLAID_SECRET` | (Optional) Plaid Secret |
| `PLAID_ENV` | `sandbox` or `production` |
| `NEXT_PUBLIC_ALPHA_VANTAGE_KEY` | Stock API Key |
| `CRON_SECRET` | (Optional) Verification token for Cron Jobs |

### Step 4: Deploy
Click **Deploy**. Vercel will build the app.
Once complete, you will get a production URL (e.g., `https://clearworth.vercel.app`).

## 5. Post-Deployment Configuration (CRITICAL)

### 4.1 Update Supabase Auth
1.  Go to Supabase Dashboard -> Authentication -> URL Configuration.
2.  Add your Vercel URL to **Site URL** and **Redirect URIs**:
    -   `https://clearworth.vercel.app/auth/callback`
    -   `https://clearworth.vercel.app`

### 4.2 Update Google Cloud Console
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Select your project -> Credentials -> OAuth 2.0 Client.
3.  Add the Vercel URL to **Authorized Javascript Origins**:
    -   `https://clearworth.vercel.app`
4.  Add the Vercel Callback to **Authorized Redirect URIs**:
    -   `https://<YOUR_SUPABASE_ID>.supabase.co/auth/v1/callback` (This usually remains pointing to Supabase, but ensure Supabase is allowed to redirect BACK to Vercel).
    -   **Important**: Supabase acts as the middleman. Ensure Supabase "Site URL" matches Vercel.

## 6. Cron Jobs
Review `vercel.json`. Cron jobs are scheduled for `syd1` region.
Ensure your Vercel project settings allow Cron Jobs (Hobby plan supports limited cron).
