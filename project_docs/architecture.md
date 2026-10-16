# OpenNetWorth System Architecture

## 1. High-Level Architecture

OpenNetWorth is built on a **Sovereign, Local-First Architecture**. All financial data is persisted locally in an **Embedded SQLite Database** (`data/opennetworth.sqlite`) and cached in the client **Local Vault**, and all AI features execute on-device against a **Local LLM** (LM Studio on port 1234, Ollama on port 11434, or Strata on port 8080). Zero sensitive financial metrics leave the local machine.

### Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT DEVICE (100% PRIVATE)                          │
│                                                                                         │
│  ┌─────────────────────────────────┐           ┌─────────────────────────────────────┐  │
│  │     Next.js 16 UI Layer         │           │       Local AI Engine Subsystem     │  │
│  │   (Turbopack + React 19)        │           │  (LM Studio:1234 / Ollama:11434 /   │  │
│  │                                 │           │        Strata:8080)                 │  │
│  │                                 │           │                                     │  │
│  │  • Dashboard & Net Worth Engine │           │  • AI Mentors (Long-Term, Stoic...) │  │
│  │  • Assets & Liabilities Payoff  │           │  • Natural Language Action Parser   │  │
│  │  • Cash Flow & Autopilot        │           │  • Reasoning & Thinking Models      │  │
│  │  • Stealth & Privacy Modes      │           │  • Offline Heuristic Fallback       │  │
│  │  • Instant Local Vault Access   │           │                                     │  │
│  └────────────────┬────────────────┘           └──────────────────▲──────────────────┘  │
│                   │                                               │                     │
│                   ▼                                               │                     │
│  ┌─────────────────────────────────┐           ┌──────────────────┴──────────────────┐  │
│  │      Feature Hooks & Repos      │──────────▶│     src/lib/api/localLlm.ts         │  │
│  │ (useNetWorth, useAssetsQuery...)│           │   (Timeout, Token Budgeting, CORS)  │  │
│  └────────────────┬────────────────┘           └─────────────────────────────────────┘  │
│                   │                                                                     │
│                   ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────┐                           │
│  │            Local Vault Engine & Data Layer               │                           │
│  │  • Bidirectional LocalStorage & SQLite synchronization   │                           │
│  │  • 1-Click JSON & SQLite Backup / Restore                │                           │
│  └────────────────┬─────────────────────────────────────────┘                           │
│                   │                                                                     │
│                   ▼ (On-Disk Storage)                                                   │
│  ┌──────────────────────────────────────────────────────────┐                           │
│  │       Embedded SQLite Database (better-sqlite3)          │                           │
│  │  • File: data/opennetworth.sqlite                        │                           │
│  │  • ACID Transactions, WAL Mode, Schema Migrations        │                           │
│  │  • Tables: assets, liabilities, goals, history, cashflow │                           │
│  └──────────────────────────────────────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Local AI Subsystem Flow

```text
[ 👤 User Prompt ] ────────▶ [ ⚡ API Route: /api/mentor ]
                                       │
                                       ▼
                             [ 🧠 Context Assembly ]
                             • Net Worth, Assets, Liabilities
                             • Mentor Persona & Strict Constraints
                                       │
                                       ▼
                             [ 🔌 queryLocalLlm() ]
                             • Health check (LM Studio :1234 / Ollama :11434)
                             • Auto-provider negotiation
                             • 2,048 token budget (reasoning models)
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        [ 🤖 Local LLM Active ]               [ 🔌 Local LLM Offline ]
        • Qwen 2.5/3.8, DeepSeek, Llama       • Deterministic Heuristic Fallback
        • Strips thinking tokens              • Classical philosophical wisdom
        • Returns tailored advice             • Setup guidance tip
                    │                                     │
                    └──────────────────┬──────────────────┘
                                       │
                                       ▼
                             [ 💬 Mentors Chat UI ]
```

## 2. Core Patterns

### Feature-First (Vertical Slices)
The application is structured by **Business Domain** first. CODE THAT CHANGES TOGETHER STAYS TOGETHER.
See [Project Structure](project_structure.md) for the detailed breakdown.

### Service Repository Pattern
The only data path is the embedded **SQLite Local Vault** (`data/opennetworth.sqlite`, `better-sqlite3`). Demo mode serves read-only per-persona SQLite vaults (`data/demo_vaults/`) selected by a cookie. The former Supabase adapter was removed (git history preserves it). The Repository Pattern lives in `src/infrastructure`.

- **Interface**: `src/features/[feature]/data/repository.ts` defines contracts.
- **Implementation**: `src/infrastructure/*` implements these contracts.
- **Consumption**: Hooks (`useAssetsQuery`) inject the correct repository relative to the current `ProfileContext`.

### Server State Management
- **TanStack Query (React Query)**: Used for all async state.
- **Benefits**: Caching, optimistic updates, loading states, and identical API for both Local and Remote data.

### Screen Pattern (Frontend Architecture)
We use the **Screen Pattern** to decouple the **Framework** (Next.js) from the **Application Logic**.

```text
[ 📁 src/app/page.tsx ]                 [ 📁 src/features/.../Page.tsx ]
   (Next.js Route)                              (Feature Logic)
       │                                              ▲
       ├─── Imports component (No Logic) ─────────────┘
       │
       └─── Configures ──▶ [ ⚙️ Metadata / SEO ]
```

1.  **Metadata Layer (`src/app`)**: Handled by Next.js.
2.  **Logic Layer (`src/features`)**: Contains State, Effects, and UI.
3.  **Benefit**: Easier testing, easier migration, and zero "Framework Lock-in" for business logic.

## 3. Critical Flows

### Data Fetching Cycle

```text
     (1) Request           (2) Instantiate          (3) Fetch
UI ─────────────▶ Hook ──────────────────▶ Repo ──────────────▶ Infrastructure
                                            │                        │
                                            │                        │
                                            │                        ▼
                                            │                 [SQLite Vault]
                                            │                        │
  (5) Update View      (4) Cache Data       │     (3) Return Data    │
UI ◀───────────── Cache ◀───────────────── Hook ◀────────────────────┘
```

1. **Component** calls a Feature Hook (e.g., `useAssetsQuery`).
2. **Hook** instantiates the Repository based on `ProfileContext.isDemoMode`.
3. **Repository** fetches data from the SQLite vault (the persona vault when the demo cookie is set).
4. **Hook** returns data via TanStack Query cache.

### Demo Mode ("God Mode")
- Activated via the `demo_persona` cookie (mirrored from `?simulatedProfileId=`).
- Each persona is a seeded read-only SQLite vault under `data/demo_vaults/` — the live vault is never touched, and demo traffic cannot write anywhere.
- **Time Machine**: Calculates historical states on the fly based on current snapshot and growth logic.

## 4. Delivery 1: Sovereign Balance Updates & Observation Ledger Architecture

Delivery 1 establishes a sovereign, double-entry and observation-based accounting core designed to track wealth without fabricating artificial cash-flow journal entries.

### 1. Dual-Track Accounting Architecture
- **Transaction Ledger**: `transactions` and `journal_entries` enforce strict double-entry balance (`Sum(postings.amount_cents) === 0`) for cash flows, income, expenses, transfers, and debt repayments.
- **Observation Ledger**: `balance_observations` records point-in-time balance snapshots (e.g. quarterly superannuation statements, brokerage values, bank end-of-month statements) directly as historical evidence.
- **Why this separation exists**: Periodic statement balance updates do not represent new income or expenses. Conflating balance revisions with cash-flow transactions distorts savings rates and taxable income.

### 2. Non-Destructive Supersession & Concurrency Control
```text
[ Observation 1 (Accepted) ]  ── superseded by ──▶  [ Observation 2 (Accepted) ]
(audit preserved)                                    (authoritative latest)
```
- When a user corrects or updates a balance observation for the same account and date, the previous observation is marked `review_status = 'superseded'` with `superseded_by_id` pointing to the new record.
- **Optimistic Concurrency**: Every accepted observation increments `accounts.balance_revision`. Mutations specify `expected_balance_revision`; stale updates return HTTP 409 Conflict.
- **Retry & Idempotency**: Re-importing a previously imported source file is idempotent across both active and superseded records, preventing accidental resurrection of stale historical balances.

### 3. Deterministic Structured Parsing Pipeline
```text
[ Raw CSV / TSV / Tabular Paste ]
               │
               ▼
[ structuredBalanceParser.ts ] ──(Delimiter, Currency & Date Detection)
               │
               ▼
[ Candidate Account Disambiguation ] (Strict Currency Match & Similarity)
               │
               ▼
[ UpdateBalancesModal Review ] ──(Live Deltas, Inline Account Mapping)
               │
               ▼ (Atomic Batch POST)
[ SQLite Database (better-sqlite3) ]
```

### 4. Shared Financial Summary & Multi-Currency Sovereignty
- Single read service (`sharedFinancialSummaryService.ts`) powers Dashboard Widgets, Reports, and Assistant.
- **Strict Multi-Currency**: Balances are calculated in native minor units per currency (AUD, USD, JPY, EUR, GBP). Subtotals are explicitly reported per currency. Converted totals are only produced if exact dated FX rates exist—no 1:1 synthetic conversions are ever assumed.
- **Unrecorded Account Transparency**: Accounts without eligible valuation observations render as *`Needs balance`* rather than coercing `null` into `$0.00` or claiming a false delta from zero.

## 5. Coding Standards

1.  **Strict Typing**: All domain entities must have Zod schemas and TypeScript interfaces.
2.  **Feature Isolation**: Features should communicate via defined public interfaces (e.g., Hooks, Contexts), not deep internal imports.
3.  **Repository First**: UI components must NEVER touch the database directly. All data access goes through Repositories and `/api` routes.
4.  **No `src/lib/data` imports**: Old data structures are deprecated. Use `src/features/[name]/types` and `src/infrastructure`.

## 6. Future Roadmap
See the archived [Architecture Roadmap](archive/architecture_roadmap.md) for earlier phase plans (Tier-2 Domain Services has since shipped under `src/lib/domain/`).
