# ClearWorth Project Specification

> [!IMPORTANT]
> **Primary Objective**: ClearWorth is a personal finance dashboard focused on calculating a user's "Freedom Date" (when passive income > expenses). It aggregates Assets, Liabilities, and Bank Data to provide actionable insights and AI-driven mentorship.

## 1. Vision & Roadmap

**Vision**: To be the "Jarvis for Personal Finance" — not just a tracker, but an active strategist that gamifies the journey to financial independence. We value privacy (local-first feel) and aesthetic excellence ("Premium/Glassmorphism").

**Strategic Roadmap**:
1.  **Phase 1 (Current)**: Foundation. accurate tracking, bank sync, and basic "read-only" AI mentorship.
2.  **Phase 2 (Immediate)**: "Action & Reaction". Chat Interface that *remembers* context, Time Machine visual overhaul, and gamification hooks.
3.  **Phase 3 (Future)**: "God Mode". Multi-currency simulation, scenario planning ("What if I move to Bali?"), and automated rebalancing suggestions.

## 2. Tech Stack & Environment

-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript 5 (Strict Mode)
-   **Database**: Supabase (PostgreSQL)
-   **Auth**: Supabase Auth (SSR)
-   **Styling**: Tailwind CSS v4, Lucide React Icons
-   **UI Library**: Shadcn/ui (Radix Primitives)
-   **Financial Integrations**: Plaid (via `react-plaid-link`)
-   **AI**: Google Generative AI (Gemini), potentially OpenAI
-   **Key Libraries**:
    -   `recharts`: Charting/Visualizations (Assets, Liabilities, Net Worth)
    -   `zod`: Schema Validation
    -   `react-joyride`: Onboarding Tours
    -   `jspdf`: Reports Export

## 3. Architecture & Patterns

### Directory Structure
-   `/src/app`: App Router pages.
    -   `/src/app/api`: Backend API routes (Avoid logic here, delegate to `/lib`).
    -   `/src/app/(auth)`: Auth-related pages (Login/Register).
    -   `/src/components`: UI components.
    -   `/src/components/ui`: Generic design system atoms (Button, Card, Badge).
    -   `/src/components/bank`: Banking-specific feature components.
-   `/src/lib`: Core Business Logic (The "Brain").
    -   **MUST** remain pure TypeScript functions where possible.
    -   `debtCalculator.ts`: Payoff strategy logic (Avalanche/Snowball).
    -   `currencyService.ts`: Multi-currency normalization.
    -   `portfolioAnalysis.ts`: Core growth engine logic.
-   `/supabase_migrations`: Source of Truth for Database Schema.

### Data Flow
1.  **Server Actions**: Preferred for mutations (POST/PUT/DELETE).
2.  **API Routes**: Used for webhooks (Plaid) or external access.
3.  **Supabase Client**: `createClient()` used in Server Components for data fetching.
4.  **Types**: All shared types defined in `src/types/index.ts`.

## 4. Product Features & Capabilities

### Core Dashboard
-   **Growth Engine**: Analyze portfolio performance, allocation, and projected dividend income (`portfolioAnalysis.ts`).
-   **Wealth Momentum**: Gauge financial velocity and progress.
-   **Interactive Widgets**: Drag-and-drop grid layout (via `react-grid-layout`) allows users to customize their view.
-   **Smart Demo System**: Uses a centralized factory pattern to generate realistic mock data (e.g., real prices for MSFT, AAPL) and 5 distinct personas (Student, Family, etc.).

### AI Mentorship ("Wisdom")
-   **Multi-Persona AI**: Users interact with specific archetypes (e.g., "Risk Guardian", "Long-Term Thinker").
-   **Context-Aware Advice**: Mentors **MUST** analyze the user's current financial data (Assets, Liabilities) before providing insights.
-   **Chat Interface**: Specialized UI (`WisdomBanner`, `ChatInterface`) for querying financial wisdom.

### Time Machine (Beta)
-   **Historical Snapshots**: Allows users to view their financial state at any previous date.
-   **Control**: `TimeMachineControl.tsx` manages the date selection state.
-   **Vintage UI**: 🟢 Implemented. Applies a visual overlay/sepia filter to distinguish historical views from the present.

### Gamification & Onboarding
-   **Achievement Badges**: Awards for financial milestones (`AchievementBadges.tsx`).
-   **Onboarding Tour**: Interactive guide using `react-joyride` (`OnboardingTour.tsx`).

### Privacy Suite
-   **Stealth Mode**: A dedicated **Theme** setting. Forces dark mode + hides all sensitive values (matching background color) for public usage.
-   **Privacy Blur**: A **Toggle** state. Temporarily blurs values (`filter: blur(4px)`) without changing the entire theme.
-   **Row-Level Security**: Data isolation via Supabase RLS is critical.

### Cash Flow & Autopilot
-   **History**: Track monthly Income vs Expenses manually.
-   **Autopilot**: Define recurring transactions (Salary, Netflix) to automate projections.
-   **Wealth Momentum**: Calculated from Cash Flow data to gauge financial velocity.

## 5. Feature Status (Codebase Audit)

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Bank Integration** | 🟢 Implemented | Plaid Link active (`ConnectBankButton`), Schema ready. |
| **Debt Calculator** | 🟢 Implemented | Logic in `debtCalculator.ts`, UI in `DebtPayoffCalculator.tsx`. |
| **Gamification** | 🟢 Implemented | Persistent badges via `user_badges` table, Triggers on Assets/NetWorth/Goals. |
| **Time Machine** | 🟢 Implemented | Control UI exists, Vintage Overlay active on `/timemachine`. |
| **Mentorship** | 🟢 Implemented | `ChatInterface` active with Context, Action Parsing, and Consensus Board. |
| **Multi-Currency** | 🟢 Implemented | `CurrencySelector` and conversion logic active. |
| **Cash Flow** | 🟢 Implemented | History tracking and Autopilot (Recurring) engine active. |

## 6. Core Business Rules

### Gamification & Persistence
-   **Badges**: Stored in `user_badges` (user_id, badge_id).
-   **Unlock Logic**: Database Triggers (`on_asset_change`, `on_net_worth_change`, `on_liab_change`, `on_goal_change`).
-   **Security**:
    -   Users view their own badges.
    -   Admins view ALL badges (God Mode).
    -   Public (Anon) views "Template" badges (Demo Mode).

### financial-math
-   **Rounding**: All currency displays must use 2 decimal places.
-   **Interest Rates**: Stored as annual percentages (e.g., 5.5 = 5.5%), converted to monthly decimals in logic (`rate / 100 / 12`).
-   **Freedom Date**: Calculated by intersecting `Passive Income vs Expenses` OR `Debt Zero Date`.
    -   See `src/lib/debtCalculator.ts`.

### multi-currency
-   Users have a `base_currency` in `profiles`.
-   Assets/Liabilities can differ in currency.
-   **Rule**: UI must show the original currency AND the converted value in Base Currency.
-   **Global Support**: Input fields must adapt to the selected currency.

## 7. Development Conventions

-   **Files**: PascalCase for React Components (`BankStatusCard.tsx`), camelCase for utilities (`utils.ts`).
-   **Imports**: Use `@/` alias for src root.
-   **Components**:
    -   'use client' only when interaction (hooks, buttons) is needed.
    -   Prefer Async Server Components for data fetching.
-   **Verification**:
    -   Always verify `npm run dev` starts without error after refactors.
    -   Check `Supabase` RLS policies when adding new tables.

## 9. Verification & Critical Files

### Verification Commands
```bash
npm run build      # REQUIRED before any PR - must pass
npm run dev        # Start dev server on port 4000
npm run lint       # Check code style
```

### Critical Files (Approval Required)
| File | Reason |
|------|--------|
| `src/contexts/ProfileContext.tsx` | All data operations flow through here |
| `src/lib/registry/widgetRegistry.ts` | Dashboard widget system |
| `supabase_schema.sql` | Database schema reference |
| `src/types/index.ts` | Core TypeScript definitions |
| `.env.example` | Environment variable contract |

### Component Hierarchy
```
Data Layer (Domain Hooks)
├── useAssets, useLiabilities, useGoals, useRecurrring, useHistory
│   └── DataService (Supabase / LocalStorage)
│
ProfileContext (Identity only)
│
DashboardContext (Aggregation + Metrics)
├── Dashboard Widgets
└── Widget Grid
```
