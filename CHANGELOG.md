# Changelog

All notable changes to ClearWorth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
