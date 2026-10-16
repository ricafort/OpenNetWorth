# OpenNetWorth Running & Deployment Guide

## 1. Overview
OpenNetWorth is a **sovereign, local-first application**. It runs 100% locally on your personal machine with zero cloud configuration. The former optional Supabase cloud adapter was removed (git history preserves it).

---

## 2. Option A: 100% Local Run (Recommended & Default)

No cloud accounts, third-party database keys, or API subscriptions are required.

### Prerequisites
- Node.js 18+
- *(Optional for AI)* [LM Studio](https://lmstudio.ai/) on port 1234, [Ollama](https://ollama.ai/) on port 11434, or [Strata](http://127.0.0.1:8080) on port 8080.

### Steps
```bash
# 1. Clone & Install
git clone https://github.com/ricafort/OpenNetWorth.git
cd OpenNetWorth
npm install

# 2. Run with Turbopack (Port 4000)
npm run dev
```

Open [http://localhost:4000](http://localhost:4000). Your data is preserved entirely on your disk in `data/opennetworth.sqlite`, with 1-click JSON backup export/restore and direct SQLite file portability.

---

## 3. Optional Environment Variables

All optional — the app runs with none of them:

| Variable | Description |
| :--- | :--- |
| `LOCAL_LLM_URL` | Default Local LLM endpoint (default: `http://localhost:1234/v1`) |
| `LOCAL_LLM_MODEL` | Default model name |
| `LOCAL_LLM_PROVIDER` | Preferred provider (`lmstudio`, `ollama`, `strata`, or `auto`) |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Banking integration credentials (sandbox by default) |
| `BASIQ_API_KEY` | Australian Open Banking (Basiq) credentials (sandbox by default) |
| `FINNHUB_API_KEY` | Stock price lookups (mock data provided if missing) |

