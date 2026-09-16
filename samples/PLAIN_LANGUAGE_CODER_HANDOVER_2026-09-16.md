# Coder handover — focused acceptance fixes

Independent assessment: 219 existing tests pass, and the five core manual transaction paths plus starter CSV → receipt-link workflow work through the real UI. Plain-language UX is partially accepted. Do not treat the workspace as fully signed off yet.

Please implement the following bounded fixes in separate reviewable batches. Keep the current accounting services and arithmetic. No new framework or broad redesign is requested. Use an isolated database and test server; never reset the live vault.

## Batch A — preserve drafts and protect the vault

### A1. Preserve financial facts when creating/editing a personally paid business draft

Reproduced failures:

- Selecting a JPY personal payment account under a USD-reporting business saved the amount as USD, while another field displayed AUD.
- Opening an existing JPY 500 draft showed 5.00; saving changed it to JPY 5.
- Saving that draft removed its existing source-transaction reference.
- The flow presents two different payment-account selectors and offers property/income/equity/loan accounts in the personal-payment selector.

Requirements:

- One authoritative payment-account field for this draft flow.
- Currency displayed and parsed from the selected payment account; business reporting currency must not override payment currency.
- Use the existing currency-decimal registry for both display and parsing.
- Preserve unknown values as unknown, and preserve both source-document and source-transaction IDs when the user edits other fields.
- Validate supplied account ownership, eligibility and currency in the backend too.
- Drafts continue to have zero effect on posted balances. Cross-owner posting automation remains a separate task.

Acceptance: actual browser create/edit/save/reload for JPY 500 and AUD 12.34; cross-currency business/account combination; source IDs before/after; rejected ineligible payment accounts; balances unchanged. Add focused regression tests for these cases.

Locations: `DailyEventsView.tsx` draft save/edit and business selection; `draftService.ts` upsert semantics. See the assessment's before/after evidence.

### A2. Make backup/restore cover the authoritative workspace

The current UI archive and `/api/vault` snapshot omit the new accounting and document records. The UI also reads drafts from an obsolete browser-cache key.

Requirements:

- Extend the existing versioned archive to all data required to reconstruct the workspace: owners, accounts, transactions/postings/statuses, drafts/source links, ownership, valuations, FX, audit history, imported documents, proposals and evidence/original content, plus retained legacy data/settings.
- Export current authoritative persisted data, not a stale browser cache.
- Restore into an isolated destination atomically with schema/reference validation and backward compatibility.
- Do not mark export successful before archive construction succeeds.

Acceptance: browser export followed by restore into a fresh test vault; compare record IDs, balances, void statuses, draft values/source links, evidence and original-file hashes. Invalid archive leaves destination unchanged. Report exactly which archive version was tested.

## Batch B — stop contradictory finances across the app

The new accounting workspace contains bank/property/debt records, while Assets/Liabilities/Cash Flow/Privacy read empty legacy data. Freedom says “You are Debt Free!” and the assistant sees a zero snapshot without the new transactions.

Immediate requirement: suppress authoritative zero/debt-free claims when a screen is not connected to these records. Make the limitation visible and link to working Accounts/Reports views.

Then connect the existing accounting read services incrementally. Do not create duplicate manually maintained balances. Preserve legitimate legacy records through an explicit migration/reconciliation path. Keep owner, date and currency scope visible. The assistant should retrieve deterministic financial results and cite supporting records.

Acceptance: one bank balance, one mortgage and one expense agree across applicable views. Assistant can retrieve the recorded expense with its source, or clearly state a specific unsupported query. Missing data/rates must not become zero or an invented combined total.

## Batch C — finish the plain-language acceptance pass

- Add the promised This Month and All Time controls and accessible Start date/End date labels.
- Distinguish no transactions ever from no matches for a date filter. January 2001 currently shows first-time onboarding despite existing 2025/2026 transactions.
- Remove remaining implementation jargon from default reports, imports, review, success, draft and cancellation dialogs. Keep optional accounting details for users who need them.
- Say “Import bank statement (CSV)” while this action accepts CSV only.
- Render missing FX pairs/dates as readable text instead of `[object Object]`.
- Make the ownership helper match the actual allocation validation.
- Restore useful keyboard focus after quick account creation; associate labels with inputs and apply proper modal semantics.
- Make onboarding reporting currency visible and editable, while continuing to allow foreign-currency accounts.

Suggested copy: “Transaction saved”; “Transactions and supporting documents”; “Cancel this transaction”; “Why are you cancelling it?”; “This business expense is saved as a draft. It has not changed your balances.” Keep cash received/paid distinct from income/expenses when timing differs.

Acceptance: real browser walkthrough of each affected modal, empty/error/success state and keyboard return path. Service tests alone do not prove the UI works. Update the walkthrough to list only features actually present and separately label browser, API and unit-test results.

## Resubmission evidence

Provide the changed files/commit, focused test results, full suite/typecheck result, isolated database path, and a compact before/after table for A1, A2, B and C. Include the fresh-vault backup restore comparison and the JPY draft before/after record. Do not use “all functionalities verified” when coverage is partial.

Assessment and reproduction evidence: `samples/PLAIN_LANGUAGE_ASSESSMENT_2026-09-16.md` and `samples/plain-language-assessment-2026-09-17/`.
