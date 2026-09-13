# Implementation Plan: Replace Supabase & Google OAuth with Local SQLite

Transition OpenNetWorth from a hybrid SaaS architecture (Supabase Cloud + Google OAuth) to a 100% free, open-source, local-first architecture powered by embedded **SQLite** (`data/opennetworth.sqlite`) and zero-cloud local vault access.

## User Review Required

> [!IMPORTANT]
> - **Zero External Authentication**: Google OAuth and Supabase Auth are completely retired. The user accesses OpenNetWorth directly as the local vault owner (`id: 'local_user'`).
> - **SQLite Storage**: All data (assets, liabilities, goals, recurring transactions, net worth snapshots, cashflow, and settings) is stored locally on disk in `data/opennetworth.sqlite`.
> - **Data Persistence Guarantee**: Existing data in browser localStorage will automatically be imported into the SQLite database on startup so no user data is lost.
> - **No Cloud Dependency**: OpenNetWorth operates 100% offline with zero cloud latency, zero external API keys needed for database operations, and zero SaaS subscriptions.

---

## Proposed Changes

### 1. SQLite Engine & Database Layer

#### [NEW] [src/infrastructure/sqlite/db.ts](file:///d:/LocalVersions/OpenNetWorth/src/infrastructure/sqlite/db.ts)
- Initialize embedded `better-sqlite3` instance pointing to `data/opennetworth.sqlite`.
- Ensure directory `data/` exists.
- Auto-create tables on startup if not present:
  - `profiles`
  - `assets`
  - `liabilities`
  - `goals`
  - `recurring_transactions`
  - `net_worth_history`
  - `cash_flow_history`
  - `settings`
- Provide transactional query methods for CRUD and bulk import/export.

#### [NEW] [src/app/api/vault/route.ts](file:///d:/LocalVersions/OpenNetWorth/src/app/api/vault/route.ts)
- `GET /api/vault`: Returns all entities from SQLite.
- `POST /api/vault`: Accepts entities to sync or seed into SQLite.
- `POST /api/vault/backup`: Exports SQLite data.

#### [NEW] [src/infrastructure/SqliteDataService.ts](file:///d:/LocalVersions/OpenNetWorth/src/infrastructure/SqliteDataService.ts)
- Implements `DataService<T>` using the local SQLite API / engine.

#### [MODIFY] [src/infrastructure/dataFactory.ts](file:///d:/LocalVersions/OpenNetWorth/src/infrastructure/dataFactory.ts)
- Point `getDataService<T>` to `SqliteDataService<T>` or local driver backed by SQLite.

#### [MODIFY] [src/infrastructure/local_driver.ts](file:///d:/LocalVersions/OpenNetWorth/src/infrastructure/local_driver.ts)
- Add bidirectional synchronization between client state and local SQLite database (`/api/vault`).
- On first run, auto-syncs any legacy localStorage data into `data/opennetworth.sqlite`.

---

### 2. Remove Google OAuth & SaaS Cloud Authentication

#### [MODIFY] [src/proxy.ts](file:///d:/LocalVersions/OpenNetWorth/src/proxy.ts)
- Remove Supabase auth cookie calls and session refresh logic (`supabase.auth.getUser()`).
- Make proxy a pure, zero-latency local request handler.

#### [MODIFY] [src/app/login/page.tsx](file:///d:/LocalVersions/OpenNetWorth/src/app/login/page.tsx)
- Remove "Sign in with Google" and Supabase Cloud login forms.
- Transform page into a local vault manager / redirect to dashboard `/`.

#### [MODIFY] [src/contexts/ProfileContext.tsx](file:///d:/LocalVersions/OpenNetWorth/src/contexts/ProfileContext.tsx)
- Eliminate Supabase session check and remote cloud migration triggers.
- Default to `Local Vault Owner` (`id: 'local_user'`).

#### [MODIFY] [src/features/assets/hooks/useAssetRepository.ts](file:///d:/LocalVersions/OpenNetWorth/src/features/assets/hooks/useAssetRepository.ts)
- Make `LocalAssetRepository` the primary repository, backed by SQLite.
- Apply equivalent updates to liability and goal repository hooks.

---

### 3. Documentation Updates & Git Push

#### [MODIFY] [README.md](file:///d:/LocalVersions/OpenNetWorth/README.md)
- Update architecture diagram and description to reflect embedded local SQLite instead of Supabase SaaS.
- Emphasize zero-cloud-login, instant local run, and SQLite backup instructions.

#### [MODIFY] [project_docs/techStack.md](file:///d:/LocalVersions/OpenNetWorth/project_docs/techStack.md)
- Update database section: replace Supabase Cloud with SQLite (`better-sqlite3`).
- Remove Google OAuth / Supabase Auth references.

#### [MODIFY] [project_docs/architecture.md](file:///d:/LocalVersions/OpenNetWorth/project_docs/architecture.md)
- Update data layer architecture diagrams and descriptions to reflect SQLite.

#### [MODIFY] [project_docs/specifications.md](file:///d:/LocalVersions/OpenNetWorth/project_docs/specifications.md)
- Update authentication & database specifications.

#### [MODIFY] [project_docs/deployment.md](file:///d:/LocalVersions/OpenNetWorth/project_docs/deployment.md)
- Update deployment guidelines (local execution, self-hosted, desktop/Docker).

#### [MODIFY] [CONTRIBUTING.md](file:///d:/LocalVersions/OpenNetWorth/CONTRIBUTING.md)
- Commit and align contributor setup instructions for local SQLite.

---

## Verification Plan

### Automated Tests
- Run test suite:
  ```bash
  npm test -- --run
  ```
- Verify all unit and integration tests pass with the SQLite data layer.

### Manual / Browser Verification
1. Launch dev server on port 4000.
2. Verify dashboard loads with zero network calls to Supabase or Google.
3. Add a new Asset, Liability, Goal, and Recurring Transaction.
4. Verify data is saved to `data/opennetworth.sqlite`.
5. Check `data/opennetworth.sqlite` using `better-sqlite3` script to confirm records exist in the SQLite database file.
6. Test page refresh to ensure data persists from SQLite.
7. Run git status, commit, and push to `origin/main` on GitHub.
