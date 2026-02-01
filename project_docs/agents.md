# AI Agent Rulebook & Project Index (v2.0)

> **FOR ALL AI AGENTS:** This is your primary directive. Read this first.
> **Mission**: Build scalable, maintainable, and "Cognitively Optimized" software.

## 1. Quick Start
*   **Setup**: See `CONTRIBUTING.md`.
*   **Active Tasks**: See `task.md`.
*   **Architecture**: See `project_docs/architecture.md`.

## 2. Core Directives (HIGH PRIORITY)

### 🧠 1. Cognitive Load Optimization (The "Golden Rule")
*   **Simplicity**: Code should be readable by a junior developer. Avoid "clever" one-liners.
*   **Organization**: Ruthlessly organize files. Follow the **Vertical Slice** pattern (`src/features/...`).
*   **Visual Documentation**: ALWAYS generate Mermaid diagrams for complex logic or architecture changes. Use "Universal Text Art" for simple flows.

### 🛡️ 2. Security First
*   **Zero Trust**: Assume all input is malicious. Validate with **Zod**.
*   **Secrets**: NEVER commit .env values or keys.
*   **RLS**: Always verify Row Level Security policies when modifying database schemas.

### 🧪 3. Verification Mandate
*   **Build Check**: You MUST run `npm run build` after significant changes.
*   **Lint Check**: You MUST run `npm run lint` and fix errors before finishing.
*   **Self-Correction**: If a tool fails, read the error, think, and retry. Do not loop blindly.

---

## 3. Tech Stack Hard-Locks (The "Toolbox")
* Deviating from this stack requires explicit user approval.

| Category | Technology | Constraint |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) | Use Server Components by default. Client Components (`'use client'`) only for interaction. |
| **Language** | TypeScript | **Strict Mode**. No `any`. Zod for validation. |
| **Styling** | Tailwind CSS | Use utility classes. Sort with Prettier standard. |
| **State** | TanStack Query | For all Async/Server state. |
| **Local State** | React Hooks | `useState`, `useReducer` for component-level logic. |
| **Global UI** | Context API | Minimal use (Theme, Toast). Avoid complex global stores. |
| **Database** | Supabase (PostgreSQL) | Use `supabase-js` v2. |
| **Icons** | Lucide React | Use `lucide-react` imports. |

---

## 4. Coding Standards (Tactical Rules)

### 📂 File Structure (Vertical Slices)
*   **Features First**: Code belongs in `src/features/[feature_name]`.
*   **Colocation**: Keep `components`, `hooks`, and `types` close to where they are used.

### 📝 Naming Conventions
> **GOLDEN RULE**: When using PostgreSQL (Supabase), **Database Naming takes priority**.
*   **Database**: `snake_case` (Postgres standard).
*   **API**: `snake_case` (Match Database).
*   **Consistency**: **Avoid mapping names as much as possible.** Prefer using strict transformations or matching DB columns directly in types to reduce cognitive overhead.
*   **Files**: `PascalCase.tsx` for Components, `camelCase.ts` for logic/hooks.
*   **Variables**: `camelCase` (Unless matching a DB type, then `snake_case` is allowed/preferred to avoid mapping).

### ⚡ Syntax Preferences
*   **Functions**: Use `const` arrow functions.
    *   ✅ `const MyComponent = () => { ... }`
    *   ❌ `function MyComponent() { ... }`
*   **Exports**: Use **Named Exports**.
    *   ✅ `export const MyComponent = ...`
    *   ❌ `export default ...` (Except for Next.js Pages/Layouts).
*   **Async**: Always use `async/await`. Avoid `.then()` chains.

---

## 5. Architectural Patterns

### 📱 Rule 6: The "Screen Pattern"
*   **Thin Routes**: `src/app` pages must NEVER contain logic.
*   **Delegate Immediately**: Pages must import and render a full-page component from `src/features`.
    *   ✅ `export default function Page() { return <AssetsPage />; }`

### 🏗️ Service Repository Pattern
*   Data access must be abstracted behind a Repository Interface.
*   **Goal**: Enable seamless switching between **Real Mode** (Supabase) and **Demo Mode** (Local Storage).
*   **Pattern**: UI -> Hook -> Repository Interface -> Implementation (Supabase/Local).

---

## 6. System Knowledge Map
*   **Product Vision**: [product.md](./product.md)
*   **Architecture**: [architecture.md](./architecture.md)
*   **Project Structure**: [project_structure.md](./project_structure.md)
*   **Specifications**: [specifications.md](./specifications.md)

