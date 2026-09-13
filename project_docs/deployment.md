# OpenNetWorth Running & Deployment Guide

## 1. Overview
OpenNetWorth is designed primarily as a **sovereign, local-first application**. It can be run 100% locally on your personal machine with zero cloud configuration, or deployed to a private self-hosted server / Vercel instance with an optional Supabase database.

---

## 2. Option A: 100% Local Run (Recommended & Default)

No cloud accounts, third-party database keys, or API subscriptions are required.

### Prerequisites
- Node.js 18+
- *(Optional for AI)* [LM Studio](https://lmstudio.ai/) on port 1234 or [Ollama](https://ollama.ai/) on port 11434.

### Steps
```bash
# 1. Clone & Install
git clone https://github.com/ricafort/OpenNetWorth.git
cd OpenNetWorth
npm install

# 2. Run with Turbopack (Port 4000)
npm run dev
```

Open [http://localhost:4000](http://localhost:4000). Your data is preserved entirely in your browser's private Local Vault, with 1-click JSON backup export/restore.

---

## 3. Option B: Self-Hosted Cloud Deployment (Vercel + Supabase)

For users who want multi-device synchronization across home and mobile via their own private Supabase instance.

### Pipeline

```text
  [ 💻 Developer ] ──▶ (git push) ──▶ [ 🐙 GitHub (ricafort/OpenNetWorth) ]
                                                   │
                                                   ▼
  [ ▲ Vercel Build (Next.js 16) ] ◀────────── [ 🔒 Env Vars ]
              │
              ▼
  [ 🌍 Production Instance ] ───────────────▶ [ ☁️ Private Supabase (PostgreSQL) ]
```

### Environment Variables

| Variable | Required | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Your self-hosted Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | Supabase public anonymous key |
| `LOCAL_LLM_URL` | Optional | Default Local LLM endpoint (default: `http://localhost:1234/v1`) |
| `LOCAL_LLM_MODEL` | Optional | Default model name (default: `qwen3.8-27b-gsq-rco`) |
| `LOCAL_LLM_PROVIDER` | Optional | Preferred provider (`lmstudio`, `ollama`, or `auto`) |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Optional | Banking integration credentials (sandbox by default) |

### Supabase Database Setup
1. Execute `supabase_migrations/00_schema_v1.sql` in your Supabase SQL Editor.
2. If using OAuth, configure your authorized redirect URIs in Supabase Auth settings:
   - `https://your-domain.com/auth/callback`
   - `http://localhost:4000/auth/callback`

