# OpenNetWorth Technology Stack & Engineering Standards

> **Mission**: Deliver a sovereign, 100% private, local-first personal wealth management dashboard and AI assistant that runs entirely on the user's local machine with zero mandatory cloud dependencies.

---

## 1. Core Technology Stack

| Layer | Technology | Version | Purpose & Constraints |
| :--- | :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) | `16.1.1` | App Router with Turbopack for lightning-fast HMR and compilation. Server Components by default; Client Components (`'use client'`) only when interactive state is required. |
| **Runtime & UI** | [React](https://react.dev/) | `19.2.3` | Modern concurrent React. Note: React 19 deprecates `unmountComponentAtNode`; Turbopack handles modern tree-shaking seamlessly. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | `^5` | Strict type checking enabled. Avoid `any`; use Zod schemas and domain TypeScript interfaces for strict validation. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | `v4` | Modern utility CSS with PostCSS integration. Automatically patched via `scripts/patch-tailwind.cjs` for robust Turbopack base-directory resolution on refresh. |
| **Local AI Engine** | [LM Studio](https://lmstudio.ai/) / [Ollama](https://ollama.ai/) | Native | 100% local, private LLM execution via OpenAI-compatible (`http://localhost:1234/v1`) or Ollama native (`http://localhost:11434`) REST protocols. Supports reasoning models (Qwen 2.5/3.8, DeepSeek R1, Llama 3.2). |
| **Local State** | React Hooks & Context | Built-in | Manages on-device reactive state (`ProfileContext`, `useNetWorth`, `useAssetsQuery`). |
| **Data Layer** | On-Device Local Vault | Native / LocalStorage | Default zero-config storage driver (`LocalStorageService`). Stores assets, liabilities, goals, and history in the browser. Supports 1-click JSON backup & restore. |
| **Optional Sync** | [Supabase](https://supabase.com/) | `^2.89.0` | Optional backend for users wanting self-hosted multi-device synchronization with Row-Level Security (RLS). |
| **Charts** | [Recharts](https://recharts.org/) | `^3.6.0` | Responsive SVG financial trajectory, asset allocation, and momentum visualizations. |
| **Icons** | [Lucide React](https://lucide.dev/) | `^0.562.0` | Crisp, modern, accessible iconography. |
| **Testing** | [Vitest](https://vitest.dev/) | `^4.0.18` | Ultra-fast unit & integration testing for portfolio math, debt calculation, and local LLM intent parsing. |

---

## 2. Engineering Standards & Rules

### 🛡️ 1. Zero Cloud Leakage (Privacy Hard-Lock)
- **Financial Balances & Portfolio Holdings**: Must **never** be sent to external cloud AI APIs (such as OpenAI, Anthropic, or Google Gemini).
- **AI Queries**: Must route strictly through the local LLM interface ([src/lib/api/localLlm.ts](file:///d:/LocalVersions/OpenNetWorth/src/lib/api/localLlm.ts)), targeting `localhost:1234` or `localhost:11434`.
- **Offline Determinism**: If the user's Local LLM is offline or not installed, the application must never freeze or display blank UI. It must seamlessly fall back to deterministic regex heuristic parsers and classical mentor wisdom.

### 📐 2. Vertical Slice Architecture
All business logic is grouped into self-contained domain slices inside `src/features/`:
- `src/features/assets/`: Asset CRUD, market price tracking, portfolio weighting.
- `src/features/liabilities/`: Debt payoff calculator (Avalanche & Snowball strategies).
- `src/features/dashboard/`: Net worth aggregation, customizable drag-and-drop widget layout.
- `src/features/mentors/`: Board of financial mentors, AI chat interface, persona management.
- `src/features/cashflow/`: Income, expense, and recurring transaction tracking.
- `src/features/goals/`: Milestones and savings goal tracking.
- `src/features/privacy/`: Stealth mode theme, blur filters, data export/import.
- `src/features/freedom/`: Financial independence & FIRE timeline calculations.

### 📂 3. Naming Conventions (Database & Domain Consistency)
- **Database & JSON Schemas**: `snake_case` (e.g. `user_id`, `is_liquid`, `interest_rate`, `country_code`).
- **TypeScript Domain Interfaces**: Align closely with schema property names to eliminate redundant mapping layers.
- **Component Files**: `PascalCase.tsx` (e.g. `MentorsPage.tsx`, `ChatInterface.tsx`).
- **Utility / Service Files**: `camelCase.ts` (e.g. `localLlm.ts`, `debtCalculator.ts`).
- **Functions & Hooks**: `camelCase` (e.g. `useNetWorth()`, `queryLocalLlm()`).

### ⚡ 4. Reasoning Model Compatibility
- Modern local models (Qwen 2.5/3.8, DeepSeek R1) generate internal thinking tokens in `reasoning_content` before writing output.
- All AI prompt routes must provide at least **1,000 to 2,048 max tokens** so reasoning models do not exhaust their budget before emitting their final text.
- Never pass React JSX elements (like Lucide icons) into objects destined for `JSON.stringify()`; always destructure them out before API calls.

---

## 3. Build & Development Commands

```bash
# Start local development server (port 4000 with Turbopack)
npm run dev

# Run Vitest test suite
npm test -- --run

# Lint codebase
npm run lint

# Build production bundle
npm run build

# Start production server
npm start
```
