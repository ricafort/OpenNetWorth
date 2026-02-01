# ClearWorth Product Specification

> [!IMPORTANT]
> **Primary Objective**: ClearWorth is a personal finance dashboard focused on calculating a user's "Freedom Date" (when passive income > expenses). It aggregates Assets, Liabilities, and Bank Data to provide actionable insights and AI-driven mentorship.

## 1. Vision & Roadmap

**Vision**: To be the "Jarvis for Personal Finance" — not just a tracker, but an active strategist that gamifies the journey to financial independence.

### User Journey Map

```text
    ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
    │  🚀 Onboarding │       │  📊 Dashboard  │       │  🧠 Wisdom AI  │
    │  (First Run)   │       │   (Daily Ops)  │       │   (Strategist) │
    └───────┬────────┘       └───────┬────────┘       └───────┬────────┘
            │                        │                        │
            │ (1) Set Profile        │ (3) Track              │ (5) Consult
            ▼                        ▼                        ▼
      [ User Persona ] ────▶ [ Assets / Liab ] ◀─── [ Context Engine ]
            │                        ▲                        ▲
            │ (2) Generate           │ (4) Update             │ (6) Advise
            ▼                        │                        │
      [ Demo Data ] ───────── [ Net Worth ] ───────── [ Chat Interface ]
```

**Strategic Roadmap**:
1.  **Phase 1 (Current)**: Foundation. accurate tracking, bank sync, and basic "read-only" AI mentorship.
2.  **Phase 2 (Immediate)**: "Action & Reaction". Chat Interface that *remembers* context, Time Machine visual overhaul, and gamification hooks.
3.  **Phase 3 (Future)**: "God Mode". Multi-currency simulation, scenario planning ("What if I move to Bali?"), and automated rebalancing suggestions.

## 2. Product Features & Capabilities

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

## 3. Feature Status (Codebase Audit)

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Bank Integration** | 🟢 Implemented | Plaid Link active (`ConnectBankButton`), Schema ready. |
| **Debt Calculator** | 🟢 Implemented | Logic in `debtCalculator.ts`, UI in `DebtPayoffCalculator.tsx`. |
| **Gamification** | 🟢 Implemented | Persistent badges via `user_badges` table, Triggers on Assets/NetWorth/Goals. |
| **Time Machine** | 🟢 Implemented | Control UI exists, Vintage Overlay active on `/timemachine`. |
| **Mentorship** | 🟢 Implemented | `ChatInterface` active with Context, Action Parsing, and Consensus Board. |
| **Multi-Currency** | 🟢 Implemented | `CurrencySelector` and conversion logic active. |
| **Cash Flow** | 🟢 Implemented | History tracking and Autopilot (Recurring) engine active. |
| **Financial Freedom** | 🟢 Implemented | Projections in `src/features/freedom`. |

## 4. Core Business Rules

### Gamification & Persistence
-   **Badges**: Stored in `user_badges` (user_id, badge_id).
-   **Unlock Logic**: Database Triggers (`on_asset_change`, `on_net_worth_change`, `on_liab_change`, `on_goal_change`).
-   **Security**:
    -   Users view their own badges.
    -   Admins view ALL badges (God Mode).
    -   Public (Anon) views "Template" badges (Demo Mode).

### Financial-Math
-   **Rounding**: All currency displays must use 2 decimal places.
-   **Interest Rates**: Stored as annual percentages (e.g., 5.5 = 5.5%), converted to monthly decimals in logic (`rate / 100 / 12`).
-   **Freedom Date**: Calculated by intersecting `Passive Income vs Expenses` OR `Debt Zero Date`.
    -   See `src/lib/debtCalculator.ts`.

### Multi-Currency
-   Users have a `base_currency` in `profiles`.
-   Assets/Liabilities can differ in currency.
-   **Rule**: UI must show the original currency AND the converted value in Base Currency.
-   **Global Support**: Input fields must adapt to the selected currency.
