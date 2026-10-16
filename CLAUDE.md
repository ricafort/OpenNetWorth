# OpenNetWorth — Claude Code entry point

**Read [`project_docs/agents.md`](project_docs/agents.md) first** — it is the full agent rulebook. This file only pins the facts that must never be violated.

- **Privacy hard-lock**: user financial numbers NEVER go to cloud AI APIs. All AI routes through `src/lib/api/localLlm.ts` to a local engine (LM Studio `:1234`, Ollama `:11434`, Strata `:8080`) with deterministic offline fallbacks.
- **Data layer**: embedded SQLite is the only store (`src/infrastructure/sqlite/db.ts` → `data/opennetworth.sqlite`). The Supabase adapter was removed; git history preserves it. Schema source of truth = SQLite migrations in `src/infrastructure/sqlite/migrations/`.
- **Naming**: DB columns and API payloads are `snake_case` (match each other; no mapping boilerplate).
- **Verify**: `npm test -- --run` before finishing; dev server is `npm run dev` on port 4000.
- **Test fixtures**: `samples/Australian_Finance_Test_Pack_v1/` is used by `batchC1_acceptance.test.ts` — do not delete.
- **Public repo**: never commit real financial data, account numbers, or real names (seed scripts with real records are gitignored).
