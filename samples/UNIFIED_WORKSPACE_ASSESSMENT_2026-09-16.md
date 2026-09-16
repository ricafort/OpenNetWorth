# Unified Workspace — independent acceptance assessment

Assessed 16 September 2026, Australia/Sydney. No application implementation changes made. Test artifacts and fictional data only.

## Decision

**Partial implementation; not ready for overall sign-off or cross-owner posting automation.** There are real improvements, but the claim that the Unified Workspace is complete and error-free is not supported by browser acceptance testing.

Finish the current bounded workspace work. No architecture rewrite or new framework is needed. The remaining defects are primarily scope handling, account creation choices, shared validation, date consistency, and draft persistence.

## Independent verification

- Real browser testing on `http://localhost:4006/accounting` with a fresh isolated SQLite vault: `samples/unified-workspace-assessment-2026-09-16/unified_vault.sqlite`.
- Inclusive onboarding, property-only onboarding, Quick Add Account, full account creation, all five manual posting flows, combined and individual views, draft creation/reload/restart, invalid draft input, a second browser origin against the same vault, CSV import/approval, property-account rejection/bypass, void, and a 1,003-record business ledger.
- **205 automated tests passed across 19 files.** Log: `vitest.log` in the evidence directory.
- **TypeScript passed:** `tsc --noEmit --incremental false`.
- Independent production build **did not complete**: Next.js failed to fetch Inter from Google Fonts. `build.log` records the failure. This is a network/font dependency failure, not evidence that the previously reported JSX fixes failed. Production build success remains unconfirmed in this environment.
- Live database and WAL SHA-256 hashes were unchanged. See `final-verification.json`.
- Test Next.js dev server was restarted to verify persistence. No writes were made through the live application.

## What genuinely improved

| Requirement | Independent result |
|---|---|
| Personal and business together at onboarding | Both can be checked and created in one session |
| No invented property/mortgage balances | Property checkbox did not create financial accounts automatically |
| Inline account creation returns to draft | The entered memo was preserved; the new account was selected |
| Expense → Income category | Displayed Salary now persisted as an income account with subtype `salary` |
| Manual expense/deposit account eligibility | Home absent from ordinary expense selector; direct expense API submission against property rejected |
| Shared selected owner between tabs | Explicit personal owner retained when moving to Accounts; reload persistence still fails |
| Local entry date | New entry/opening-balance dates correctly showed 16 September; balance queries still used 15 September |
| Visible transaction amount/owner | Present on collapsed rows; date, account, category and direction still incomplete |
| Five manual posting flows | Correct stored monetary results when queried with the explicit transaction date |
| Normal CSV import from Everything | One AUD 7 expense imported, reviewed and approved against the intended personal account |
| Draft exclusion from posted totals | Draft did not create a posted financial transaction |
| Same-origin draft reload/restart | Draft survived page reload and server restart |
| Void accounting effect | Invalid fictional CSV posting could be voided; balances recovered and one correction record was retained |

## Acceptance blockers

### U1 — Everything is not handled across the workspace (P1)

**Reproduction:** Complete personal/business onboarding, leaving the default `Overview - Everything` selected. Open Accounts & Balances. The UI reports **`Entity not found: all`**, shows zero accounts and invites account creation. Open Reports: it presents an empty balance sheet and “Incomplete Valuation (Missing Rates).” Its scope request actually returns HTTP 500 with **`Entity not found: all`**.

The UI scope sentinel `all` is being passed as an actual entity ID. The Reports view does not distinguish this request failure from an incomplete valuation.

**Second reproduction:** Open Business Daily Events and refresh, then select Everything and refresh. Business-only USD income/expense summary cards remain visible, although personal AUD transactions also appear in the combined list. The unscoped API intentionally returns `period_income_expenses: null`, but the component only updates the summary when the value is truthy, leaving stale data in place.

There is no implemented overall financial overview with the promised personal/business cash breakdown. “Overview - Everything” currently selects the same Daily Events screen. Returning null instead of an unreliable grand total is sensible, but the promised component totals and explanation must actually be rendered.

**Required fix:** Treat view scope separately from entity ID in every consumer. Everything must load all applicable accounts and either provide supported component reports or clearly explain which aggregate is unavailable. Clear stale report state on scope changes and errors. Do not show missing-rate messages for an invalid entity request. Shared scope must survive reload; this currently resets to Everything.

Relevant code: `AccountingPage.tsx`, `AccountManagementView.tsx` (`fetchData(selectedEntityId)`), `ReportsTraceabilityView.tsx` (`scope_id: selectedEntityId`), `DailyEventsView.tsx` (truthy-only summary assignment).

Evidence: `04-everything-accounts-error.png`, `default-versus-today.json`, `final-verification.json`.

### U2 — Quick Add silently chooses the business and USD (P1)

**Reproduction:** In Everything, Record Event → Add an Account Now. The form asks only type and name. Enter “TEST Personal Everyday” and Save & Return to Draft. It creates the account under **TEST Morgan Business**, in **USD**, with no owner/currency confirmation. A subsequent expense goes into that business.

This is not just a misleading account name: code explicitly chooses the first business when scope is `all`, and hard-codes `currency: 'USD'`.

**Required fix:** Ask for or clearly confirm actual owner and currency. If scoped to a specific owner, prefill it visibly. Everything is a viewing scope, not a posting owner. Prefer the configured currency but allow correction. Preserve the unfinished draft, as the new flow already does.

The full Add Account form works when an actual owner is selected and lets the user choose AUD. It remains unavailable in the broken Everything account view. Onboarding also creates owners in default USD without asking; its requests omit currency.

Evidence: `after-onboarding-account.json`, `02-quick-add-wrong-owner.png`.

### U3 — Entry dates and balance dates disagree (P1)

**Reproduction at 09:38 Sydney time on 16 September:** Today-dated USD 22 expense and USD 1,000 income were posted. Default account query returned balance **0**, with `as_of_date: 2026-09-15`. The same query explicitly dated `2026-09-16` returned **97,800 cents**. A new personal AUD 1,000 opening balance also displayed as AUD 0.

Correcting frontend dates exposed the remaining backend UTC default. The financial records themselves exist; they are excluded from the default balance's cutoff date.

**Required fix:** Pass one explicit, consistent reporting date through account balances and reports, with local-date defaults at the UI boundary. Preserve stored date-only values. Show the returned balance date, not an account's opening date. Verify Australian mornings and month boundaries. The shifted-date-plus-local-getters start-of-month implementation also deserves a boundary test.

Evidence: `default-versus-today.json`, account UI observations, `after-five-flows-and-draft.json`.

### U4 — Import approval bypasses the manual account guard (P1)

The manual property-payment fix works. The import workflow still lists a house as a target bank account and allows it to post.

**Reproduction:** Paste `Date,Description,Amount` with row `2026-09-16,TEST invalid property CSV,-6.00`. Choose TEST Home as Target Bank Account. Import and approve. Approval succeeds, debiting Living Expense 600 cents and crediting the Home property account 600 cents. The same kind of account is rejected by the manual expense API.

The invalid fictional transaction was then voided through the UI and retained for audit evidence.

**Required fix:** Apply the same semantic account eligibility rules at every expense/import approval boundary, not only in `recordExpense`. Filter selectors as well. Keep the generic journal primitive available for legitimate advanced accounting; validate the operation's meaning before invoking it.

Evidence: `07-property-csv-approved.png`, `final-verification.json`. Import approval calls `postTransaction` directly in `documentInboxService.ts`; it does not inherit the higher-level manual expense guard.

### U5 — Drafts are incomplete browser notes, not vault-backed financial drafts (P1 before automation)

**What passes:** A valid draft is clearly marked unresolved, survives reload and test-server restart, and does not change posted balances.

**What fails:**

- It is stored only under `localStorage['opennetworth_drafts']`, not in the vault. The same SQLite records opened at `127.0.0.1:4006` show the posted transactions but no drafts created at `localhost:4006`.
- The draft has no currency, payment account, payer-owner reference, or link to an already imported purchase. These are necessary to know what actually happened and avoid duplication later.
- A **negative amount of -5** is accepted and displayed as `$-5.00`. Save uses a button handler and lacks domain validation. Other malformed/missing facts were not exhaustively tested.
- The visible draft card offers Discard, but no edit/resume/details action. A user cannot correct or inspect the full intent through that card.
- Drafts are rendered with `drafts.map` without owner/date filtering. They remain visible across selected owners, without enough relationship labels to explain why.

**Required fix:** A small persisted draft model in the existing local vault, with shared validation and backup participation. Capture amount in minor units with currency, business, payer/account or an explicit unresolved value, date, reimbursement intent, and optional source transaction/document. Permit uncertain facts as unresolved; do not silently invent them. Add edit/resume and relevant scope visibility. Cross-owner posting itself can remain deferred.

Do not build a separate orchestration system for this. Browser storage may cache UI state, but should not be the sole authoritative store for financial work awaiting completion.

Evidence: `06-draft-visible.png`, `restart-check.json`, `same-vault-other-origin.txt`; `DailyEventsView.tsx:128`, `:201–215`, draft UI near `:1235`.

### U6 — The record limit was raised, not resolved (P1 for complete retrieval)

The frontend asks for 1,000 records, but `listTransactions` caps results at 500. Test fixture: **1,003 business transactions stored; 500 returned and rendered.** No paging/search control exposes the remainder. The period summary includes more transactions than the list shows.

**Required fix:** Simple stable pagination or Load more with a loaded/total count and consistent owner/date filters. Raising the cap again does not fix retrieval.

Evidence: `volume-result.json`, `volume-ui-summary.json`. Source: `transactionService.ts:1783` clamps the limit to 500.

### U7 — One valid onboarding choice cannot proceed (P2)

**Reproduction:** Uncheck Personal, check only Property and mortgages, enter a name, click Continue. The welcome screen remains without explaining why. The button permits this combination, but the handler creates owners only for Personal or Business. Investments-only follows the same code path; only property-only was browser-reproduced.

**Required fix:** Ask who owns those assets or automatically take the user to the ordinary personal-owner setup with a clear explanation. Do not create fictitious properties/debts. Persist setup preferences if they are meant to guide subsequent setup. Allow additional owners to be added later through an accessible flow.

Evidence: `01-property-only-no-progress.png`.

## Remaining presentation requirements

These are completion work for the current screen, not a new design programme:

- The new collapsed rows show amount and owner, but **omit the transaction date, account, category and inflow/outflow sign**. Dates were visible in the previous list. Account/category remain hidden in expanded accounting entries.
- The test mortgage correctly displayed AUD 125 total for 100 principal + 20 interest + 5 fee. Its current first-posting-based amount calculation is order-dependent; define a stable display amount for supported event types rather than treating arbitrary journal ordering as user meaning.
- “Sovereign Accounting Engine,” “Double-Entry Journal Ledger,” “2 legs,” “Record Event,” and milestone references still dominate the ordinary flow. The agreed Transactions/Save expense language has not been completed.
- `Debt: $NaN` still appears for AUD assets without matching AUD liabilities. Account summaries still hard-code `$` and `/100` rather than shared currency formatting.
- A void transaction retains its Auditable Void button because the UI checks `status === 'voided'`, while the saved status is `void`. The financial reversal worked; this is a UI status mismatch.
- Record modal still has no dialog role and Escape did not close it. Its scroll/max-height layout improved in code, but actual mobile layout was not retested in this run.
- Scope is preserved between views while mounted, but reload resets it. The inbox receives `selectedEntityId` without applying an owner filter; if it remains a global inbox, clearly label that fact rather than imply the active owner is applied.

## Monetary verification

The personal AUD scenario, queried explicitly as of 16 September:

| Action / balance | Verified result |
|---|---:|
| Opening bank | 1,000.00 |
| Expense | -22.00 |
| Income, category Salary | +1,000.00 |
| Transfer to savings | -100.00 |
| Card repayment | -50.00 |
| Loan payment, 100 principal + 20 interest + 5 fee | -125.00 |
| Bank after five flows | **1,703.00** |
| Savings | **600.00** |
| Card debt | **250.00** |
| Mortgage debt | **199,900.00** |
| Income / expenses | **1,000.00 / 47.00** |

After the valid AUD 7 CSV, bank is 1,696 and expenses 54. The invalid AUD 6 property CSV was voided, restoring property value. No unbalanced transactions were found in the volume integrity check. Volume fixtures were created through the API, not entered individually in the browser.

## Recommended next task

**Complete Unified Workspace acceptance before Cross-Owner Posting Automation.** Implement these groups in order:

1. Scope handling and stale-state clearing, explicit owner/currency in account creation, consistent balance dates.
2. Shared eligibility validation for imports and manual flows; durable and sufficiently complete drafts.
3. Actual pagination, missing row fields, onboarding edge case and remaining small display/status fixes.

Retest the exact reproductions above. Keep the 205 passing regressions. Add a small set of UI integration tests for the failures that direct-domain tests did not cover. No broader feature expansion is required for sign-off.

## Limits

This assessment covers the submitted Unified Workspace changes and their affected workflows. It does not certify every feature, tax treatment, full-quarter import format, mobile breakpoint, or complete backup restoration. PDF receipt linking was not repeated in the browser; its existing automated tests passed. Draft absence across origins and source inspection establish browser-only storage; no claim is made that a browser-profile export could never retain it. The production build failed at external font retrieval, so production runtime was not tested.
