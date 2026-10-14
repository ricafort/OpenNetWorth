# OpenNetWorth

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Local LLM](https://img.shields.io/badge/AI-Local%20LLM%20(100%25%20Private)-green)](https://lmstudio.ai/)

**100% Open-Source, Local-First Personal Financial Manager & Wealth Dashboard powered by Local LLMs.**

Financial data—your bank balances, debts, investments, real estate, and net worth trajectory—is the single most sensitive personal information you generate. Traditional SaaS financial platforms require you to upload your financial life to third-party cloud databases, where it is exposed to corporate servers, cloud breaches, and third-party AI training pipelines.

**OpenNetWorth** is built on an uncompromising privacy principle: **Your financial data must never leave your physical device.** All financial calculations, portfolio tracking, and AI mentorship run locally on your machine.

---

## 🌟 Key Pillars

- 🛡️ **Embedded SQLite Storage (`data/opennetworth.sqlite`)**: Zero SaaS cloud database required. All assets, liabilities, goals, snapshots, and cash flow records are persisted to a fast, reliable, ACID-compliant SQLite file on your physical hard drive.
- 🔓 **Zero Cloud Logins & No Google Auth**: Instant, friction-free local access. No Google OAuth tracking, no third-party session tokens, and no passwords sent over the internet.
- 🧠 **Local LLM AI Mentorship**: AI mentors (The Strategist, The Stoic, Risk Guardian, etc.) run entirely on your local machine via **LM Studio** (`localhost:1234`), **Ollama** (`localhost:11434`), or **Strata** (`localhost:8080`). Your net worth summary and prompts are never sent to external cloud APIs like OpenAI or Google Gemini.
- ⚡ **Offline Deterministic Fallbacks**: If your local LLM is paused, OpenNetWorth falls back to deterministic rule-based heuristic parsing and classical financial wisdom so you are never locked out of quick actions.
- 💬 **Natural Language Command Bar**: Type or speak naturally: *"Add $5,000 to Emergency Savings"*, *"Bought 10 AAPL shares for $2,200"*, *"Paid off $800 credit card debt"*. The Local LLM parses intent and updates your ledger.
- 🗨️ **Persistent Mentor Workspace**: Mentor chats are saved locally with a full history sidebar (new chat, resume, delete, export to Markdown/JSON). Attach bank statements, receipts, and PDFs — text is extracted on-device — and mentors reason over deterministic goal projections and cash-flow facts computed directly from your ledger.
- 📄 **One-Click Offline HTML Reports**: Download your complete financial picture — net worth trend, asset allocation, cash flow statement, and category breakdowns — as a single self-contained HTML file with zero external references, ready to print or archive.
- 🔒 **Zero Telemetry & Zero Trackers**: No analytics tracking, no advertising beacons, and no behavioral profiling.
- 📦 **Sovereign Vault Backups**: Export your complete financial state (including mentor chat history) into a portable SQLite copy or JSON backup file with one click, and restore it anywhere offline.

---

## 🚀 Quickstart

### Prerequisites
- **Node.js 18+**
- *(Recommended)* A local LLM server:
  - **[LM Studio](https://lmstudio.ai/)** (running local server on port `1234`), OR
  - **[Ollama](https://ollama.ai/)** (running on port `11434`), OR
  - **[Strata](http://127.0.0.1:8080)** (local server on port `8080`, OpenAI-compatible API at `/v1`)

> **Note**: OpenNetWorth runs completely out-of-the-box even without a Local LLM server running, using built-in deterministic offline heuristics.

### 1. Clone & Install
```bash
git clone https://github.com/ricafort/OpenNetWorth.git
cd OpenNetWorth
npm install
```

### 2. Configure Environment (Optional!)
OpenNetWorth requires **ZERO** environment variables to run locally. If you wish to customize your local LLM ports or specify a default model:

```bash
cp .env.example .env.local
```

Example `.env.local` settings:
```bash
LOCAL_LLM_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=qwen3.8-27b-gsq-rco
LOCAL_LLM_PROVIDER=lmstudio
```

### 3. Launch Local LLM

#### Option A: LM Studio
1. Open LM Studio and download any preferred model (e.g., `qwen2.5-7b`, `llama-3.2-3b`, `mistral-7b`).
2. Go to the **Developer / Local Server** tab (`<->`).
3. Click **Start Server** on port `1234`.

#### Option B: Ollama
```bash
ollama run llama3.2
```

#### Option C: Strata
1. Launch Strata and load your preferred model.
2. Open `http://127.0.0.1:8080` and go to the **About** tab — it lists the OpenAI base URL (`http://127.0.0.1:8080/v1`) and the exact model name.
3. In OpenNetWorth, open the **Local LLM Engine** modal and pick the **Strata** preset.

### 4. Run OpenNetWorth
```bash
npm run dev
```
Open [http://localhost:4000](http://localhost:4000) in your browser.

Click the **Local AI** status chip in the top header at any time to test the connection, inspect available models, or toggle between LM Studio, Ollama, and Strata.

---

## 📊 Dashboard Capabilities

- **Net Worth Control Room**: Real-time aggregation of Total Assets, Total Liabilities, and Net Worth delta.
- **Fast Balance Updates & Observation Ledger**: Paste raw tables or CSVs directly from banking, superannuation, or brokerage portals. Review live deltas, map accounts inline, and atomically persist dated observations with full supersession history.
- **Strict Multi-Currency Holdings**: Native multi-currency tracking with zero-distortion currency subtotals (AUD, USD, JPY, EUR, GBP). Distinguishes base currency holdings from converted figures, requiring authoritative dated FX rates.
- **Deterministic Offline Parsing**: Instant offline delimiter detection, Australian & ISO date normalization, currency scaling, and account candidate matching without needing an LLM.
- **Wealth Momentum**: Velocity tracking based on monthly cash flow and savings rate.
- **Asset Allocation & Growth**: Visual breakdowns across Cash, Equities, Real Estate, Crypto, and Alternative assets.
- **Debt Elimination Engine**: Visual payoff milestones with interest tracking, including explicit non-amortising loan detection when payments fail to cover interest.
- **Reimbursement Workflows**: Record personally paid business expenses against the business ledger, with full correction flows (convert, unmatch, undo) that preserve the audit trail.
- **Balance Truth & Provenance**: Totals only include balances anchored by an opening balance, ledger postings, or accepted valuations — everything else is explicitly flagged *"Unknown (Needs balance)"* with guided recovery steps.
- **Time Machine**: Point-in-time state reconstruction and wealth snapshot generation, with a staleness guard that warns when your latest snapshot drifts from the live ledger.
- **Stealth / Blur Mode**: Obscures sensitive currency values with a single keystroke for safe viewing in public spaces.

---

## 🧪 Testing

Run the Vitest test suite (includes deterministic rule tests and local LLM intent parser tests):

```bash
npm test -- --run
```

To run type checking and production build verification:

```bash
npm run build
```

---

## 📄 License
MIT License. 100% Free and Open Source. You own your code and your financial data.
