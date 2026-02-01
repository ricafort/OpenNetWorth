# Project Structure & Organization ("The Compass")

> **Purpose**: This document maps every folder and significant file in the repository. Use it to navigate the codebase and understand **where** things live and **why**.

## 1. Top-Level Directory
What you see when you first open the project.

```text
📂 root
 ┣━━ 📂 .agent                   - AntiGravity Agent configurations & workflows.
 ┣━━ 📂 .github                  - GitHub automation (Actions, Issue Templates).
 ┣━━ 📂 project_docs             - Documentation strategies, architecture, specs.
 ┣━━ 📂 public                   - Static assets served directly (images, fonts).
 ┣━━ 📂 scripts                  - TypeScript maintenance scripts (migrations, seeding).
 ┣━━ 📂 src                      - Source code (Application Logic).
 ┣━━ 📂 supabase_migrations      - SQL Schema migrations (Database Version Control).
 ┃
 ┣━━ 📄 .env.local               - Local environment variables (Secrets - DO NOT COMMIT).
 ┣━━ 📄 next.config.ts           - Next.js framework configuration.
 ┣━━ 📄 package.json             - Dependencies & NPM Scripts.
 ┣━━ 📄 tsconfig.json            - TypeScript compiler options.
 ┣━━ 📄 vercel.json              - Deployment configuration for Vercel.
 ┗━━ 📄 vitest.config.ts         - Testing framework configuration.
```

### Detailed Breakdown (Root)

#### 📂 `.agent`
Contains configuration for AI Agents (like me).
- `workflows/`: Standard Operating Procedures (SOPs) for the agent.

#### 📂 `.github`
GitHub-specific configuration.
- `ISSUE_TEMPLATE/`: Pre-defined templates for creating Bug Reports or Feature Requests.

#### 📂 `public`
Static files accessible via URL (e.g., `https://domain.com/file.svg`).
- `window.svg`, `globe.svg`: Default icons or assets.
- *Best Practice*: Put images here if they don't need compilation/bundling.

#### 📂 `scripts`
One-off executable scripts for maintenance. Run with `npx tsx scripts/script-name.ts`.
- `apply-migration.ts`: Helpers to apply SQL schema changes.
- `seed-benchmarks.ts`: Populates the DB with dummy benchmark data.
- `hydrate-templates.ts`: Seeds initial templates.

#### 📂 `supabase_migrations`
Source of Truth for the Database Schema.
- `00_schema_v1.sql`: The consolidated schema file defining all tables and RLS policies.
- `_archive/`: Old, squashed migrations kept for reference.

---

## 2. Source Directory (`src/`)
The actual application code. Organized by **Feature (Vertical Slice)**.

```text
📂 src
 ┣━━ 🚀 features                 (DOMAIN LOGIC: Vertical Slices)
 ┃    ┃  "Code that changes together stays together"
 ┃    ┣━━ 💰 assets              - Market prices, Portfolio
 ┃    ┣━━ 💳 liabilities         - Debt payoff engine
 ┃    ┣━━ 📊 dashboard           - Layouts, Widget Registry
 ┃    ┣━━ 💸 cashflow            - Budgeting & Transactions
 ┃    ┣━━ 🎯 goals               - Financial Goals
 ┃    ┣━━ 🔄 bank                - Plaid Integration & Sync
 ┃    ┣━━ ⏳ timemachine         - Historical state
 ┃    ┣━━ 🤖 mentors             - AI Persona logic
 ┃    ┣━━ 🎮 gamification        - Badges & Achievements
 ┃    ┣━━ 🪁 onboarding          - User setup flow
 ┃    ┣━━ 🧪 demo                - Demo data generation
 ┃    ┗━━ 🗽 freedom             - Financial Freedom calculations
 ┃
 ┣━━ 📱 app                      (ROUTING: Thin Layer)
 ┃    ┃  "Framework Entry Points Only"
 ┃    ┣━━ 📂 (routes)            - assets/, liabilities/, etc.
 ┃    ┗━━ 📂 api                 - Route Handlers (REST endpoints)
 ┃
 ┣━━ 🧩 components               (SHARED UI: No Business Logic)
 ┃    ┣━━ 🎨 ui                  - Atoms: Buttons, Inputs, Cards
 ┃    ┣━━ 📐 layout              - Sidebar, Shell, Headers
 ┃    ┣━━ 📈 charts              - Recharts wrappers
 ┃    ┗━━ 🧱 common              - Shared PageHeader, ContentCard
 ┃
 ┣━━ ⚙️ infrastructure           (ADAPTERS: External Services)
 ┃    ┣━━ 🏭 dataFactory.ts      - Abstract Factory
 ┃    ┣━━ ☁️ SupabaseService.ts  - Real DB Adapter
 ┃    ┗━━ 💾 LocalStorageService.ts - Local/Demo Adapter
 ┃
 ┗━━ 📚 lib                      (UTILITIES: Shared Helpers)
      ┣━━ 📂 utils               - formatting, dates
      ┗━━ 📂 domain              - Pure logic (interest calculators)
```

### Detailed Breakdown (`src`)

#### 🚀 `src/features` (The Core)
This is where 90% of the work happens. Each folder represents a **Business Domain**.
Structure within a feature:
- `components/`: UI specific to this feature (e.g., `AssetAllocationChart`).
- `hooks/`: State & Logic (e.g., `useAssetsQuery`).
- `data/`: Interfaces & Repository Definitions.
- `types.ts`: Domain models.

#### 📱 `src/app` (The Router)
Next.js App Router.
- **Rules**: "Thin Routes". Pages (`page.tsx`) must NOT contain logic. They only import a Feature Screen.
- `layout.tsx`: Root layout (HTML shell, Font loading).
- `globals.css`: Tailwind directives & global styles.

#### 🧩 `src/components` (The Lego Blocks)
Dumb UI components used across multiple features.
- `ui/`: Primitive elements (Button, Input). Based on Shadcn UI patterns.
- `layout/`: Global navigation structures (Sidebar).

#### ⚙️ `src/infrastructure` (The Plumber)
Handles "How do we get data?".
- Implements the Repository Interfaces defined in Features.
- Allows switching between "Real Mode" (Supabase) and "Demo Mode" (Local Storage).

---

## 3. Key Files Reference

| File | Purpose |
| :--- | :--- |
| `src/middleware.ts` | Edge Middleware running before requests. Handles Auth protection using Supabase Auth helpers. |
| `src/types/index.ts` | Global Types shared across the app (User, Currency definitions). |
| `package.json` | Project Manifest. Defines scripts (`dev`, `build`, `lint`) and dependencies. |
| `tsconfig.json` | TypeScript configuration. Defines paths (e.g. `@/*` alias mappings). |
| `.env.local` | **SECRETS**. API Keys, Database URLs. Never commit this file. |

## 4. Where do I put...?

- **A new visual component?**
    - If specific to one feature -> `src/features/[feature]/components`
    - If generic (e.g. "Fancy Button") -> `src/components/ui`

- **A new page?**
    1. Create route in `src/app/[route]/page.tsx` (Thin Shell).
    2. Create logic in `src/features/[route]/components/[Route]Page.tsx`.

- **A database change?**
    1. Edit `supabase_schema.sql` (or create new migration).
    2. Run `npx supabase db reset` (or specific migration command).

- **A global utility function?**
    - `src/lib/utils` (if generic helper).
    - `src/lib/domain` (if business logic like financial math).


This document explains the directory structure of ClearWorth, detailing **what** goes where and **why**.
We follow a **Feature-First Architecture** (Vertical Slice), grouped by business domain rather than technical type.

## Root Directory

```text
📂 src
 ┃
 ┣━━ 🚀 features                 (DOMAIN LOGIC: Vertical Slices)
 ┃    ┃  "Code that changes together stays together"
 ┃    ┃
 ┃    ┣━━ 💰 assets              - Market prices, Portfolio holdings
 ┃    ┃    ┣━━ 📂 components     - Feature-specific UI (HoldingCard, Charts)
 ┃    ┃    ┣━━ 📂 hooks          - React Query hooks (useAssetsQuery)
 ┃    ┃    ┣━━ 📂 data           - Schemas & Repository interfaces
 ┃    ┃    ┗━━ 📂 actions        - Server Actions (getPrices)
 ┃    ┃
 ┃    ┣━━ 💳 liabilities         - Debt payoff engine
 ┃    ┃    ┣━━ 📂 components     - PayoffCalculator, AmortizationTable
 ┃    ┃    ┗━━ 📂 hooks          - useLiabilitiesQuery
 ┃    ┃
 ┃    ┣━━ 📊 dashboard           - Layouts, Widget Registry
 ┃    ┃    ┣━━ 📂 components     - DashboardGrid, Header
 ┃    ┃    ┗━━ 📂 widgets        - Widget implementations (NetWorthWidget)
 ┃    ┃
 ┃    ┣━━ ⏳ timemachine         - Historical state reconstruction
 ┃    ┣━━ 💸 cashflow            - Budgeting & Transactions
 ┃    ┣━━ 🎯 goals               - Financial Goals tracking
 ┃    ┗━━ 🛡️ privacy             - Support Access ("Break-Glass") & Trust Logic
 ┃
 ┣━━ 🧩 components               (SHARED UI: No Business Logic)
 ┃    ┃  "Generic, reusable visual elements"
 ┃    ┃
 ┃    ┣━━ 🎨 ui                  - Atoms: Buttons, Cards, Inputs, Dialogs
 ┃    ┣━━ 📐 layout              - Shell: Sidebar, Headers, AppWrappers
 ┃    ┣━━ 📈 charts              - Recharts wrappers (BarChart, PieChart)
 ┃    ┗━━ 🏦 bank                - Plaid specific UI (LinkButton)
 ┃
 ┗━━ ⚙️ infrastructure           (ADAPTERS: External Services)
      ┃  "Data access layer only - No UI"
      ┃
      ┣━━ ☁️ SupabaseService     - Real Database connection & Auth
      ┣━━ 💾 local_driver        - Demo mode local storage adapter
      ┗━━ 🔌 DataService         - Factory for creating repositories
```

- `project_docs/`: Documentation for architecture, product specs, and roadmaps.
- `src/`: Source code.
- `public/`: Static assets (images, fonts).

## Source Directory (`src/`)

### 1. Features (`src/features/*`)
**Why?** To keep related code together. If you delete a feature folder, you delete the feature. High cohesion, low coupling.

Each feature folder (e.g., `assets`, `liabilities`, `dashboard`) follows this standard structure:
- `components/`: React components specific only to this feature.
- `hooks/`: Custom hooks (logic, data fetching) for this feature.
- `types.ts`: TypeScript definitions for this feature's domain.
- `actions/`: Server Actions specific to this feature (e.g., fetching prices, saving goals).
- `modals/`: (Optional) Modals specific to this feature.
- `widgets/`: (Optional) Dashboard widgets exposed by this feature.

**Current Features:**
- `assets/`: Integration with Plaid, stock prices, manual asset tracking.
- `liabilities/`: Debt tracking, payoff calculators.
- `dashboard/`: The main User Dashboard, including layout logic and widget management.
- `cashflow/`: Budgeting, income/expense tracking.
- `goals/`: Financial goal setting and tracking.
- `timemachine/`: Historical snapshot viewing logic.
- `mentors/`: AI interactions and persona definitions.
- `gamification/`: Achievements and badges system.
- `onboarding/`: First-run experience and tutorials.
- `bank/`: Plaid Link integration and syncing logic.
- `freedom/`: Financial freedom date calculations and projections.
- `demo/`: Logic for generating realistic demo data for different personas.

### 2. Components (`src/components/*`)
**Why?** To house **Generic** UI elements that are agnostic of business logic.

- `ui/`: "Atoms" - basic building blocks (Buttons, Inputs, Cards, CurrencySelectors).
- `layout/`: "Organisms" - structural components (Sidebar, LayoutShell, Banners).
- `charts/`: Reusable chart wrappers (Recharts abstractions).
- `providers/`: Context providers (QueryClient, Theme).
- `bank/`: Shared banking UI (Plaid Link buttons).

*Note: If a component contains business logic (e.g., "Calculate Debt Payoff"), it belongs in `features/liabilities`, NOT here.*

### 3. Application (`src/app/*`)
**Why?** Next.js App Router entry points (Routing & Metadata ONLY).

- **Rule: Thin Routes**. Pages (`page.tsx`) must be completely empty of business logic.
- They typically contain only 3 things:
  1. Metadata export.
  2. One import from `src/features/[feature]/components/[Screen].tsx`.
  3. A default export rendering that component.
- `api/`: Route Handlers (REST endpoints, Webhooks).

### 4. Library (`src/lib/*`)
**Why?** Shared utilities and core domain logic that cuts across features.

- `domain/`: Pure business logic functions (e.g., `interestCalculator`, `currencyService`).
- `utils/`: Helper functions (formatting, dates).
- `data/`: (Legacy/Transitional) Sample data or generic data fetching helpers.
- `registry/`: Application registries (e.g., `widgetRegistry.ts` for dashboard configuration).

### 5. Infrastructure (`src/infrastructure/*`)
**Why?** Adapters for external services.

- `local_driver.ts`: LocalStorage adapter for Demo/Guest mode.
- `SupabaseService.ts`: Database adapter for Real mode.

## Key Files
- `src/middleware.ts`: Authenticated route protection.
- `src/types/index.ts`: Shared global types (User, Currency).
- `supabase_schema.sql`: Database schema definition.
