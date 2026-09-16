# Changelog

All notable changes to ClearWorth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
