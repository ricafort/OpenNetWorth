# OpenNetWorth AI Agent Rulebook & Guidelines

> **FOR ALL AI AGENTS:** This is your primary directive for OpenNetWorth. Read this first.
> **Mission**: Build sovereign, private, local-first personal wealth software with zero mandatory cloud dependencies.

## 1. Quick Start
*   **Active Tech Stack**: See [techStack.md](./techStack.md).
*   **Architecture**: See [architecture.md](./architecture.md).
*   **Product Vision**: See [product.md](./product.md).
*   **Directory Map**: See [project_structure.md](./project_structure.md).

## 2. Core Directives (HIGH PRIORITY)

### 🛡️ 1. Zero Cloud Data Leakage (The Privacy Hard-Lock)
*   **Financial Balances & Holdings**: NEVER route user financial numbers, balances, or transactions to third-party cloud AI APIs (OpenAI, Anthropic, Gemini, etc.).
*   **Local AI Execution**: All AI features (mentorship, natural language action parsing) MUST route through [src/lib/api/localLlm.ts](file:///d:/LocalVersions/OpenNetWorth/src/lib/api/localLlm.ts) to a Local LLM (LM Studio on port 1234 or Ollama on port 11434).
*   **Offline Fallbacks**: Always provide deterministic offline rule-based fallbacks so unstarted LLM servers never block the user.

### 🧠 2. Cognitive Load Optimization
*   **Simplicity**: Code should be readable by a junior developer. Avoid "clever" unreadable one-liners.
*   **Organization**: Follow the **Vertical Slice** pattern (`src/features/[feature_name]/...`).
*   **Visual Documentation**: ALWAYS generate diagrams for complex logic or architecture changes.

### 🧪 3. Verification & Stability Mandate
*   **React 19 & Turbopack**: Run `next dev -p 4000` with Turbopack. Keep the `@tailwindcss/postcss` resolution patch active via `scripts/patch-tailwind.cjs`.
*   **Test Suite**: Verify with `npm test -- --run` before completing tasks.
*   **Self-Correction**: If a tool fails, read the error, reason, and fix root cause. Do not loop blindly.

---

## 3. Tech Stack Hard-Locks

| Category | Technology | Constraint |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) | Server Components by default. Client Components (`'use client'`) only for interaction. |
| **Language** | TypeScript (Strict Mode) | No `any`. Use Zod and strict domain interfaces. |
| **Styling** | Tailwind CSS v4 | Use utility classes. Patched for Turbopack base-directory resolution. |
| **Local AI** | LM Studio / Ollama | Local REST integration (`src/lib/api/localLlm.ts`). Budget 2048 tokens for reasoning models. |
| **Data Layer** | LocalStorageService (Local Vault) | Primary zero-config driver. Optional Supabase client for self-hosters. |
| **State** | TanStack Query & React Hooks | For async/domain caching and component-level reactive state. |
| **Charts** | Recharts | Responsive SVG charts for net worth, allocation, and cash flow. |
| **Icons** | Lucide React | Clean, modern, accessible iconography. |

---

## 4. Coding Standards (Tactical Rules)

### 📂 File Structure (Vertical Slices)
*   **Features First**: Code belongs in `src/features/[feature_name]`.
*   **Colocation**: Keep `components`, `hooks`, and `types` close to where they are used.

### 📝 Naming Conventions
*   **Database & Schemas**: `snake_case` (e.g., `user_id`, `interest_rate`).
*   **API Payloads**: `snake_case` (matching domain schemas to avoid mapping boilerplate).
*   **Files**: `PascalCase.tsx` for React Components, `camelCase.ts` for logic/hooks.
*   **Variables**: `camelCase` (unless matching a DB schema type).

### ⚡ Syntax & Safety Preferences
*   **Functions**: Use `const` arrow functions (`const MyComponent = () => { ... }`).
*   **Exports**: Use Named Exports (except for Next.js App Router Page/Layout files).
*   **Async**: Always use `async/await`. Avoid `.then()` chains.
*   **JSON Serialization**: Never pass React JSX elements (like Lucide icons) into objects passed to `JSON.stringify()`; always destructure them out before API calls.

---

## 5. Architectural Patterns

### 📱 The "Screen Pattern"
*   **Thin Routes**: `src/app` pages must NEVER contain business logic.
*   **Delegate Immediately**: Pages must import and render a full-page component from `src/features`.
    *   ✅ `export default function Page() { return <MentorsPage />; }`

### 🏗️ Local Vault & Repository Pattern
*   Data access is abstracted behind Repository interfaces.
*   **Default**: LocalStorage-backed Local Vault with 1-click JSON export/import.
*   **Optional**: Self-hosted Supabase with Row-Level Security (RLS) policies.

---

## 6. System Knowledge Map
*   **Tech Stack**: [techStack.md](./techStack.md)
*   **Product Vision**: [product.md](./product.md)
*   **Architecture**: [architecture.md](./architecture.md)
*   **Project Structure**: [project_structure.md](./project_structure.md)
*   **Specifications**: [specifications.md](./specifications.md)
*   **Deployment**: [deployment.md](./deployment.md)

