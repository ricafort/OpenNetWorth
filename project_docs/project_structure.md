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
- `inventory-vault.ts`: Read-only row counts per table for the live vault.
- `seed-demo-vaults.ts`: Builds the read-only persona vaults under `data/demo_vaults/`.
- `launch-browser-test.ts`: Boots the dev server against an isolated test vault.

> **Schema Source of Truth** is the embedded SQLite engine: migrations run in
> `src/infrastructure/sqlite/migrations/` (via `runMigrations` in `db.ts`)
> against `data/opennetworth.sqlite`.

---

## 2. Source Directory (`src/`)
The actual application code. Organized by **Feature (Vertical Slice)**.

```text
📂 src
 ┣━━ 🚀 features                 (DOMAIN LOGIC: Vertical Slices)
 ┃    ┃  "Code that changes together stays together"
 ┃    ┣━━ ⚖️ accounting          - Double-entry reports, evidence traceability
 ┃    ┣━━ 🔄 sync                - Fast balance updates, table paste, manual fast entry
 ┃    ┣━━ 💰 assets              - Market prices, Portfolio
 ┃    ┣━━ 💳 liabilities         - Debt payoff engine
 ┃    ┣━━ 📊 dashboard           - Layouts, Widget Registry
 ┃    ┣━━ 💸 cashflow            - Budgeting & Transactions
 ┃    ┣━━ 🎯 goals               - Financial Goals
 ┃    ┣━━ 🔄 bank                - Bank sync (Basiq AU / Plaid US connectors)
 ┃    ┣━━ ⏳ timemachine         - Historical state
 ┃    ┣━━ 🤖 mentors             - AI Persona logic
 ┃    ┣━━ 🎮 gamification        - Badges & Achievements
 ┃    ┣━━ 🪁 onboarding          - User setup flow
 ┃    ┣━━ 🧾 reimbursement       - Reimbursement corrections
 ┃    ┣━━ 📄 reports             - One-click offline HTML financial report
 ┃    ┣━━ 🔐 privacy             - Support Access ("Break-Glass") & trust logic
 ┃    ┣━━ 📦 migration           - Data import/migration service
 ┃    ┣━━ 🧪 demo                - Demo data generation
 ┃    ┗━━ 🗽 freedom             - Financial Freedom calculations
 ┃
 ┣━━ 📱 app                      (ROUTING: Thin Layer)
 ┃    ┃  "Framework Entry Points Only"
 ┃    ┣━━ 📂 (routes)            - assets/, liabilities/, accounting/, timemachine/
 ┃    ┗━━ 📂 api                 - Route Handlers (REST endpoints: /api/accounting, /api/vault)
 ┃
 ┣━━ 🧩 components               (SHARED UI: No Business Logic)
 ┃    ┣━━ 🎨 ui                  - Atoms: Buttons, Inputs, Cards
 ┃    ┣━━ 📐 layout              - Sidebar, Shell, Headers
 ┃    ┣━━ 📈 charts              - Recharts wrappers
 ┃    ┗━━ 🧱 common              - Shared PageHeader, ContentCard
 ┃
 ┣━━ ⚙️ infrastructure           (ADAPTERS: External Services)
 ┃    ┣━━ 💾 sqlite/             - Embedded SQLite engine (better-sqlite3): schema + migration runner
 ┃    ┗━━ 💾 local_driver.ts     - Settings-kv / boot-migration helpers
 ┃
 ┗━━ 📚 lib                      (UTILITIES: Shared Helpers)
      ┣━━ 📂 utils               - formatting, dates, currency
      ┗━━ 📂 domain              - Pure logic (accounting, interest calculators)
           ┗━━ 📂 accounting     - Double-entry ledger, balance observations, shared summary, table parser
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
- **Only store**: embedded SQLite Local Vault (`sqlite/` + migration runner). The Supabase adapter and browser-LocalStorage services were removed (git history preserves them).

---

| File | Purpose |
| :--- | :--- |
| `src/proxy.ts` | Next.js Edge Middleware for route protection and token refresh resilience. |
| `src/lib/api/localLlm.ts` | Unified Local LLM client (health probes, LM Studio & Ollama negotiation, token budget management). |
| `src/components/ui/LocalAiSettingsModal.tsx` | UI modal to test Local LLM connection, switch engines, and select active model. |
| `scripts/patch-tailwind.cjs` | Postinstall patch for `@tailwindcss/postcss` resolving Turbopack base-directory paths on page reload. |
| `src/types/index.ts` | Global Types shared across the app (User, Currency definitions). |
| `package.json` | Project Manifest. Defines scripts (`dev`, `build`, `test`, `lint`) and dependencies. |
| `tsconfig.json` | TypeScript configuration. Defines paths (e.g. `@/*` alias mappings). |
| `.env.local` | Optional local overrides (e.g. `LOCAL_LLM_URL`, `LOCAL_LLM_MODEL`). Zero secrets required by default. |

## 4. Where do I put...?

- **A new visual component?**
    - If specific to one feature -> `src/features/[feature]/components`
    - If generic (e.g. "Fancy Button") -> `src/components/ui`

- **A new page?**
    1. Create route in `src/app/[route]/page.tsx` (Thin Shell).
    2. Create logic in `src/features/[route]/components/[Route]Page.tsx`.

- **A database change?**
    1. Add a migration module in `src/infrastructure/sqlite/migrations/` (embedded SQLite is the source of truth).

- **A local AI feature or prompt?**
    - Call `queryLocalLlm` from `src/lib/api/localLlm.ts` within an API route (`src/app/api/...`).
    - Provide fallback wisdom if local engine is offline.

- **A global utility function?**
    - `src/lib/utils` (if generic helper).
    - `src/lib/domain` (if business logic like financial math or mentor advice).

