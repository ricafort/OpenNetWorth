# Changelog

All notable changes to ClearWorth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.2.0] - 2026-10-14 (Batches A–D: Corrections, Mentor Workspace & Sovereign Reports)

### Added
- **Strata Local LLM Provider**: Third on-device engine preset (Strata on `:8080`, OpenAI-compatible `/v1`) alongside LM Studio and Ollama, with URL auto-detection, health probing, and a Strata button in the Local AI Engine modal. `LOCAL_LLM_PROVIDER` accepts `strata`.
- **Opt-In Vision Support**: New "Image understanding (vision)" toggle (OFF by default — images display in chat but are never analyzed). `localLlm.ts` sends OpenAI-style `image_url` parts (LM Studio/Strata) or Ollama-native `images[]` arrays; failed vision calls retry text-only.
- **Persistent Mentor Chat**: New `m1_mentor_sessions` / `m1_mentor_messages` tables with a full-replace save service and `/api/mentor/sessions` (list, upsert, delete). Mentors page hydrates the latest session, autosaves (debounced 800 ms), and gains a Chat History sidebar (new chat, select, delete, export) plus per-message copy/delete/regenerate.
- **Mentor Attachments**: Up to 4 files per message (10 MB each; text, PDF, PNG/JPEG/WebP/GIF) via `/api/mentor/attachments`, stored in `m1_documents` with SHA-256 content-hash dedup. New `pdfTextExtractor.ts` extracts whole-document PDF text (with `password`/`scanned`/`error` disclosures); `m1_documents` gains an `extracted_text` column.
- **Deterministic Mentor Facts**: `goalParser.ts` parses goal amounts ("$1.5m", "first million", bare `$10,000`, AUD-before-USD) and computes feasibility projections (gap, months, projected date; FIRE = 25× annual expenses); `cashflowFacts.ts` builds recurring monthly income/expense snapshots (weekly/fortnightly normalized, per-currency, explicit dated FX only). Prompts carry strict constraints to use these computed numbers; offline fallback renders them too.
- **Offline HTML Financial Report**: `buildFinancialReportHtml` produces a single self-contained `.html` report (net worth headline and trend, allocation donut, cash flow statement, income/expense category bars) with zero external references, full HTML escaping, and print pagination. Download button in Data Management and the Reports view; allocation buckets shared with the on-screen chart via `classifyCategory.ts`.
- **Reimbursement Correction Workflows (Batch D2–D4)**: Daily Events gains three flows — convert a posted personal transaction into a personally-paid business expense reimbursement workflow (D2), undo a mistaken business classification (D3), and undo a mistaken reimbursement match (D4) — with preview/submit steps and new `GET`/`POST` views and actions on `/api/accounting`. `correctTransaction` now refuses ordinary edit/void on transactions linked to an active reimbursement workflow; users must use the workflow correction mechanisms. `m1_reimbursement_workflows` gains a `cancelled` status and `last_undo_request` column.
- **Unknown-Balance Anchoring**: An account's balance counts toward totals only when anchored by an explicit opening balance, opening-balance/equity postings, or the latest accepted valuation observation plus subsequent postings; otherwise it reports "Unknown (Needs balance)" and is excluded from totals (never summed as zero). Unrecorded accounts now carry `entity_id`/`entity_name` and a reason.
- **Balance Recovery UX**: Balance Check offers "Add Statement / Record current balance / Set starting balance" for accounts with no statement or balance recorded; Account Management routes to the pre-targeted Update Balances modal; CSV import restricted to eligible account types.
- **Non-Amortising Loan Detection (Batch A2)**: Loans whose payments fail to cover monthly interest report `isInsufficientPayment` with an explicit breakdown; fabricated 50-year payoff dates and empty freedom dates are suppressed, with alert states in FreedomDateCard and DebtPayoffCalculator.
- **Safe Loopback Binding & Calendar Dates (Batch A1)**: Dev and start scripts bind explicitly to `127.0.0.1`; new timezone-safe `calendarDate` service rejects impossible dates (e.g. 2026-02-31), preserves date ranges, and resolves relative periods without UTC boundary shifts.
- **Batch B Remediation (Slices B1–B4)**: Debt Payoff plans require explicit save (no silent SQLite mutations while exploring scenarios); goal currency integrity (native currency and target amounts preserved, no silent conversion overwrites); native currency tagging on `PriceData` eliminating double-conversion of ASX stocks and suppressing synthetic mock prices in production; accessible W3C focus trap (`useFocusTrap`) with keyboard containment, Escape dismissal, and focus restoration across core modals.
- **Dashboard 360 Remediation**: Overview accuracy, consistency, and presentation fixes; unverified historical comparisons suppressed; legacy multi-currency tabs enabled; 390px mobile layout resolved.
- **Widget Collapse**: Dashboard widgets collapse to a one-row title bar with expand/collapse controls, persisted per vault; default layout curated to version 6 (invalidates stale saved grids).
- **Snapshot Staleness Guard**: Net Worth chart shows an amber callout when the latest snapshot diverges from the live ledger total by more than 10% and 100 base-currency units, with one-click "Record snapshot now"; new "Building Your Net Worth History" empty state distinguishes tracked-but-unsnapshotted vaults from empty ones.
- **Achievement Rules Domain**: `evaluateAchievements` fixes badges locking for accounting-DB users (rules previously read legacy assets and USD-only net worth); Millionaire requires a non-null base-currency net worth ≥ 1,000,000; Debt Slayer unlocks only when completely debt-free; check-in streak dedups same-UTC-day check-ins. Collapsible badge grid.
- **Vault**: Backups include mentor sessions/messages when non-empty (older backups stay byte-identical and restorable); restores defensively re-sequence mentor messages and carry `last_undo_request`.
- **Developer Scripts**: Seed and data utilities for demo vaults, actual tax packages, recurring budgets, statement balances, receivables reclassification, and a Philippines condo asset.

### Changed
- Account Freshness Card now states truthful provenance: statement-backed evidence vs manual valuations vs ledger-only calculation, with freshness based on observation date; provenance chips collapse behind a summary chip.
- Mentor chat renders a safe Markdown subset (`RichText.tsx`, no `dangerouslySetInnerHTML`); resolved action-confirm cards render as static chips so financial adds can't be re-executed after refresh; chat exports to Markdown/JSON.
- Reports & traceability relabeled in plain language ("Transactions Behind Totals"); accounting-rule details and cryptographic identifiers moved under expandable disclosures.
- Local LLM request timeout raised 60s→180s with one automatic retry on HTTP 500/502/503 ("Local LLM busy").
- `/api/documents/raw` now enforces the local security boundary (loopback/origin, DNS-rebinding protection) and `no-store` headers — bank statements and receipts were previously served without it.
- Duplicate "Update Balances" header button removed (primary lives in the Account Freshness Card); onboarding offers debt-free users a "Record a net worth snapshot" step; Time Machine texture inlined as SVG (no external URL).
- Shared financial summary requests use a monotonic request-id guard, discarding out-of-order stale responses when switching entity or date.

### Fixed
- Gamification badges no longer lock for users on the modern accounting ledger; streak counting ignores duplicate same-day check-ins.
- Wealth Momentum gauge tracks are theme-aware (dark mode); clipped text in StatCards and Growth Engine fixed; redundant "Annualized" line removed from the gauge.
- Net worth chart snapshots in unrecorded currencies are formatted in base currency with an explicit "(currency was not recorded)" disclosure.

## [1.1.0] - 2026-09-20 (Delivery 1: Sovereign Balance Updates & Observation Ledger)

### Added
- **Observation-Based Balance Ledger**: Implemented `m1_balance_observations`, `m1_source_batches`, and `m1_account_source_mappings` with non-destructive supersession (`superseded_by_id`, `balance_revision`).
- **Deterministic Structured Table Parser**: Offline parsing for pasted CSV, TSV, pipe, and multi-space tables (`structuredBalanceParser.ts`) with automatic delimiter detection, Australian DD-MM-YYYY / ISO date normalization, and currency scaling.
- **Fast Balance Updates Modal**: Complete user workflow in `UpdateBalancesModal.tsx` for table pasting, manual fast entry, live delta computation, currency shifting, account remapping, inline account creation, and atomic persistence.
- **Shared Financial Summary Service**: Unified read service (`sharedFinancialSummaryService.ts`) providing identical multi-currency aggregations, asset/liability subtotals, coverage freshness, and date-matched reconciliation across widgets and reports.
- **Multi-Currency Sovereign Traceability**: Native tracking across AUD, USD, JPY, EUR, GBP. Distinguishes holdings subtotals from converted totals, explicitly disallowing unverified 1:1 conversions.
- **Comprehensive Delivery 1 Test Suite**: Added 25 independent assessor test probes verifying source retry idempotency, review blocking, multi-currency detachment, unobserved account states, and report traceability.

### Fixed
- Fixed delta calculation on currency change to clear prior balance reference and display em dash (`—`) when currencies mismatch or accounts are detached (F1).
- Fixed unrecorded accounts in Manual Fast Entry to render *`Needs balance`* with an em dash delta rather than coercing `null` into `$0.00` (F2).
- Fixed source retry regression by ensuring source lookup matches both active and superseded records, preventing historical resurrection.

## [Unreleased]

### Added
- OpenNetWorth milestone 1 core double-entry accounting engine
- Vault backup and restore functionalities for local data management
- Document inbox service for local AI document extraction
- Legacy UI integrations for handling mixed legacy and modern accounting records

### Changed
- Re-architected Mentor Assistant API to utilize deterministic data extraction directly from `PeriodIncomeExpenseResult` instead of generic LLM formatting.
- Updated `FreedomDateCard` and `DebtPayoffCalculator` UI components to show appropriate warnings and loading states to avoid misleading zero debt screens.
- OpenSpec baseline specifications for 5 capabilities

### Changed
- Consolidated `supabase_schema.sql` (126 → 326 lines)
- Simplified documentation (8 → 5 files)
- Updated `.gitignore` with IDE and OS patterns

---

## [1.0.0] - 2026-01-XX

### Added
- Initial release
- Dashboard with drag-and-drop widgets
- Net worth tracking (Assets - Liabilities)
- AI Mentorship with multiple personas
- Bank integration via Plaid
- Gamification with achievement badges
- Time Machine for historical views
- Multi-currency support
- Privacy features (Stealth Mode, Blur)
