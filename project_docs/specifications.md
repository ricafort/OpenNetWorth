# OpenNetWorth System Specifications

This document consolidates the functional and technical specifications for OpenNetWorth.

> [!NOTE]
> This is a living document. Updates to features and capabilities should be reflected here.

---

## 🏗️ 1. Architecture & Local Database

### Embedded SQLite Engine (`data/opennetworth.sqlite`)
**Goal**: Provide a 100% free, private, relational on-disk database with zero SaaS subscriptions or cloud databases.
- **Engine**: Embedded `better-sqlite3` operating directly on the user's filesystem in `data/opennetworth.sqlite`.
- **Durability**: ACID transactions with WAL (Write-Ahead Logging) for concurrent reads and resilient writes.
- **Tables**: `profiles`, `assets`, `liabilities`, `goals`, `recurring_transactions`, `net_worth_history`, `cash_flow_history`, `settings`.
- **Bidirectional Sync**: Seamlessly syncs between client-side state and on-disk SQLite via `/api/vault`.
- **Portability**: 1-click sovereign JSON export/import and direct SQLite file copying.

---

## 🔐 2. Authentication & Privacy Posture

### Zero-Cloud Sovereign Access
- **Default Mode**: Operates as "Local Vault Owner" (`id: 'local_user'`) with 100% offline access.
- **No Google OAuth / Third-Party Auth**: All external OAuth redirects and third-party session tokens are completely removed.
- **Instant Access**: Launching the app opens the local vault immediately with zero login prompts.
- **Local Profile Management**: Users can customize their local vault owner name and currency on-device.
- **Zero Telemetry**: No telemetry, tracking pixels, or external analytical scripts.

---

## 🏦 3. Bank Integration

### Plaid & Basiq Connectors
**Goal**: Link financial accounts to automatically sync Asset and Liability balances.
- **Privacy Posture**: Credentials and access tokens are handled securely on the server side or local backend.
- **Sandbox Mode**: When third-party API credentials are not configured, the system operates seamlessly in sandbox mode with realistic mock account data.

---

## 📊 4. Dashboard & Core Logic

### Net Worth Engine
- **Logic**: `Total Assets - Total Liabilities`.
- **Display**: All values dynamically normalized to user's selected `base_currency`.

### Widgets & Customization
- **Grid Layout**: Drag-and-drop customization via `react-grid-layout`.
- **Growth Engine**: Evaluates asset allocation, risk weighting, and projected passive income (`portfolioAnalysis.ts`).
- **Wealth Momentum**: Real-time velocity score based on monthly cash flow and savings rate.

### Multi-Currency Support
- **Input**: Assets and liabilities can be registered in any global currency (USD, EUR, GBP, AUD, CAD, JPY, etc.).
- **Conversion**: Real-time normalization against base currency.

---

## 🧠 5. AI Mentorship & Natural Language Actions ("Wisdom")

### Core Features
1. **Local LLM Engine**: Connects to LM Studio (`http://127.0.0.1:1234/v1`) or Ollama (`http://127.0.0.1:11434`) running on the user's machine. Zero financial metrics ever leave the local network.
2. **Multi-Persona Wisdom**: Personas with distinct philosophical archetypes (Long-Term Thinker, Risk Guardian, Growth Optimist, Stoic Minimalist).
3. **On-Device Context Injection**: Prompts receive local financial posture (Net Worth, Asset Total, Debt Total, Preferred Currency) directly on-device.
4. **Reasoning Model Support**: Allocates 2,048 tokens and includes fallback extraction for reasoning models (Qwen 2.5/3.8, DeepSeek R1) that emit thinking tokens before content.
5. **Natural Language Action Parsing**: Parses commands (e.g., *"Add $5,000 to High Yield Savings"*) into structured ledger entries with confirmation dialogs.
6. **Deterministic Offline Fallback**: If local LLM software is paused, falls back to deterministic regex parsing and classical financial wisdom so user workflows are never blocked.

---

## 🎮 6. Gamification & Onboarding

### Milestone Badges
1. **Trigger**: Asset, liability, goal, or net worth changes trigger badge condition checks.
2. **Badges**: Stored persistently in local storage (or `user_badges` in cloud mode).
3. **Feedback**: UI toasts and badge unlock animations celebrate debt elimination and net worth milestones.

---

## 🛡️ 7. Privacy & Security

### Zero Cloud Data Leakage
- Net worth, balances, and portfolios remain on the user's physical machine.
- Zero analytics tracking or behavioral profiling scripts.

### Stealth Mode & Privacy Blur
- **Stealth Theme**: Themes the UI to blend values into background colors for public viewing.
- **Privacy Blur**: Single-click toggle applying CSS blur filter (`filter: blur(4px)`) across all numerical balances.

### Sovereign Vault Backups
- Complete 1-click JSON backup export and import, allowing users to move their financial data between machines offline.
