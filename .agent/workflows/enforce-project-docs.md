---
description: Enforce presence and integrity of project_docs and standard AI documentation
---

## Steps

1. **Verify `project_docs` directory**:
   - Check if `project_docs/` exists at root.
   - If not, create it.

2. **Verify Standard Files**:
   - `project_docs/agents.md`: Must exist and contain the 5 Global Rules.
   - `project_docs/product.md`: Must exist (Vision, Roadmap).
   - `project_docs/techStack.md`: Must exist (Stack, Conventions).
   - `project_docs/architecture.md`: Must exist.

3. **Verify Naming Consistency (Rule 5)**:
   - **Action**: Run a grep search for mixed conventions.
   - **Command**: `grep -r "camelCaseProperty" src/types` (Conceptual check)
   - **Rule**: API/JSON keys must match SQL columns (snake_case).
   - **Output**: Warn if widespread violations found.

4. **Update Documentation**:
   - If new tables were added to `supabase_schema.sql`, prompt to update `techStack.md` or `architecture.md`.
   - If new patterns introduced, update `agents.md` examples.

// turbo
5. **Final Status**:
   - Report "Green" if all docs link and exist.
   - Report "Red" if critical docs are missing.
