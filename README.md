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

- 🛡️ **100% Local-First Storage**: Zero cloud database required to get started. All assets, liabilities, snapshots, and cash flow records reside in your browser's private Local Vault.
- 🧠 **Local LLM AI Mentorship**: AI mentors (The Strategist, The Stoic, Risk Guardian, etc.) run entirely on your local machine via **LM Studio** (`localhost:1234`) or **Ollama** (`localhost:11434`). Your net worth summary and prompts are never sent to external cloud APIs like OpenAI or Google Gemini.
- ⚡ **Offline Deterministic Fallbacks**: If your local LLM is paused, OpenNetWorth falls back to deterministic rule-based heuristic parsing and classical financial wisdom so you are never locked out of quick actions.
- 💬 **Natural Language Command Bar**: Type or speak naturally: *"Add $5,000 to Emergency Savings"*, *"Bought 10 AAPL shares for $2,200"*, *"Paid off $800 credit card debt"*. The Local LLM parses intent and updates your ledger.
- 🔒 **Zero Telemetry & Zero Trackers**: No analytics tracking, no advertising beacons, and no behavioral profiling.
- 📦 **Sovereign Vault Backups**: Export your complete financial state into a portable JSON backup file with one click, and restore it anywhere offline.
- 🌐 **Optional Self-Hosted Sync**: For homelab enthusiasts who want multi-device synchronization, OpenNetWorth includes optional support for self-hosted Supabase instances.

---

## 🚀 Quickstart

### Prerequisites
- **Node.js 18+**
- *(Recommended)* A local LLM server:
  - **[LM Studio](https://lmstudio.ai/)** (running local server on port `1234`), OR
  - **[Ollama](https://ollama.ai/)** (running on port `11434`)

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

### 4. Run OpenNetWorth
```bash
npm run dev
```
Open [http://localhost:4000](http://localhost:4000) in your browser.

Click the **Local AI** status chip in the top header at any time to test the connection, inspect available models, or toggle between LM Studio and Ollama.

---

## 📊 Dashboard Capabilities

- **Net Worth Control Room**: Real-time aggregation of Total Assets, Total Liabilities, and Net Worth delta.
- **Wealth Momentum**: Velocity tracking based on monthly cash flow and savings rate.
- **Asset Allocation & Growth**: Visual breakdowns across Cash, Equities, Real Estate, Crypto, and Alternative assets.
- **Debt Elimination Engine**: Visual payoff milestones with interest tracking.
- **Time Machine**: Point-in-time state reconstruction and wealth snapshot generation.
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
