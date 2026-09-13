# OpenNetWorth System Architecture

## 1. High-Level Architecture

OpenNetWorth is built on a **Sovereign, Local-First Architecture**. By default, all financial data resides in the user's browser-backed **Local Vault** (`LocalStorageService`), and all AI features execute on-device against a **Local LLM** (LM Studio on port 1234 or Ollama on port 11434). Zero sensitive financial metrics leave the local network.

### Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT DEVICE (100% PRIVATE)                          │
│                                                                                         │
│  ┌─────────────────────────────────┐           ┌─────────────────────────────────────┐  │
│  │     Next.js 16 UI Layer         │           │       Local AI Engine Subsystem     │  │
│  │   (Turbopack + React 19)        │           │    (LM Studio:1234 / Ollama:11434)  │  │
│  │                                 │           │                                     │  │
│  │  • Dashboard & Net Worth Engine │           │  • AI Mentors (Long-Term, Stoic...) │  │
│  │  • Assets & Liabilities Payoff  │           │  • Natural Language Action Parser   │  │
│  │  • Cash Flow & Autopilot        │           │  • Reasoning & Thinking Models      │  │
│  │  • Stealth & Privacy Modes      │           │  • Offline Heuristic Fallback       │  │
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
│  │            Local Vault Driver (Default)                  │                           │
│  │  • LocalStorageService (100% On-Device Persistence)      │                           │
│  │  • 1-Click JSON Backup Export / Restore                  │                           │
│  └────────────────┬─────────────────────────────────────────┘                           │
└───────────────────┼─────────────────────────────────────────────────────────────────────┘
                    │ (Optional for Self-Hosters)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│             OPTIONAL: Self-Hosted Cloud Sync                │
│  • Supabase (PostgreSQL with Row-Level Security RLS)        │
│  • OAuth (Google) / PKCE Auth Session Refresh via proxy.ts  │
└─────────────────────────────────────────────────────────────┘
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
To support both **Demo Mode** (local data, no auth) and **Real Mode** (authenticated, cloud data), we use the Repository Pattern via `src/infrastructure`.

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
                                            │                  ┌─────┴─────┐
                                            │                  ▼           ▼
                                            │             [LocalStorage] [Supabase]
                                            │                  │           │
                                            │                  └─────┬─────┘
                                            │                        │
  (5) Update View      (4) Cache Data       │     (3) Return Data    │
UI ◀───────────── Cache ◀───────────────── Hook ◀────────────────────┘
```

1. **Component** calls a Feature Hook (e.g., `useAssetsQuery`).
2. **Hook** instantiates the Repository based on `ProfileContext.isDemoMode`.
3. **Repository** fetches data (from Supabase or LocalStorage).
4. **Hook** returns data via TanStack Query cache.

### Demo Data Migration (Guest to Auth)
When a user clicks "Keep Data & Exit" in Demo Mode:

```text
[ 👤 Guest User ] ───(1. Click Keep)──▶ [ 🚩 Set 'migration_requested' ] ───▶ [ 🚪 Redirect to Login ]
                                                                                   │
                                                                                   ▼
[ 🟢 Auth Success ] ◀──(2. Login)─────────────────────────────────────────┘
        │
        ▼
[ 🔄 ProfileContext ] ──(3. Detect Flag)──▶ [ 🛠️ MigrationService ]
                                                    │
                                                    ├───(a) Read LocalData
                                                    ├───(b) Transform (Inject Auth ID)
                                                    ├───(c) Batch Insert to Supabase
                                                    └───(d) Wipe LocalStorage
        ┌───────────────────────────────────────────────────┘
        │
        ▼
[ ☁️ Supabase ] ◀────(4. Reload)──▶ [ 🖥️ User Dashboard (Real Data) ]
```

### Demo Mode ("God Mode")
- Activated via URL parameter or Admin selection.
- **Requires Guest State**: Users must be logged out to access Demo Mode (data matches LocalStorage).
- Completely isolated from Supabase Backend (except for read-only benchmarks).
- Data persists in browser `localStorage`.
- **Time Machine**: Calculates historical states on the fly based on current snapshot and growth logic.

## 4. Coding Standards

1.  **Strict Typing**: All domain entities must have Zod schemas and TypeScript interfaces.
2.  **Feature Isolation**: Features should communicate via defined public interfaces (e.g., Hooks, Contexts), not deep internal imports.
3.  **Repository First**: UI components must NEVER call `supabase` directly. All data access goes through Repositories.
4.  **No `src/lib/data` imports**: Old data structures are deprecated. Use `src/features/[name]/types` and `src/infrastructure`.

## 5. Future Roadmap
See [Architecture Roadmap](architecture_roadmap.md) for the next phases involving Domain Services and Advanced AI Simulations.
