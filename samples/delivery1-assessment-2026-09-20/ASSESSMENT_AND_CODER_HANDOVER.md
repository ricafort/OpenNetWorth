# Delivery 1 independent assessment — 20 September 2026

**Verdict: request focused corrections before signing off Delivery 1 or connecting AI extraction to it.** Keep the existing observation-based architecture. The failures are in its implementation and integration; a new framework is unnecessary.

## Scope and evidence

- Reviewed the submitted walkthrough, revised plan, changed services, API routes, UI components, schema, and vault integration.
- Independently ran the existing suite: **260/260 tests passed across 25 files** (`baseline-tests.log`).
- Ran `npx tsc --noEmit --incremental false`: **30 diagnostics**, including production UI/service type errors (`types.log`). A production build was not run; passing Vitest does not establish a successful TypeScript build.
- Added 19 targeted acceptance probes: **5 passed, 14 failed** (`probes.log`). These deliberately exercise missing acceptance cases; this is not an estimate of the percentage of the app that works.
- Tested the actual browser on a separately seeded synthetic database at **port 4007**: paste/review/save, mixed AUD/JPY, manual JPY entry, reload, Accounts and Reports, manual account selection, and inline account creation.
- Ports 4000 and 4005 were not used for test writes. No application implementation was edited. Next.js temporarily added two test-build paths to tsconfig; the original file was restored. The owned test server and browser tab were closed.
- Live `opennetworth.sqlite`, `-wal`, and `-shm` hashes matched before and after. Assessment artifacts are contained in this directory.

## What works

1. Ordinary AUD paste-to-save and inline creation of a household account worked in the browser, preserving the review amount and date.
2. Accepted observations persist, with correct AUD values available through the summary API.
3. Observations do not create or overwrite ledger transactions/postings; an invalid second batch item rolls back the first.
4. Importing an older dated observation leaves the newer value authoritative. The same amount on a later date advances freshness and retains both records.
5. A plain observation plus source mapping survives export/restore. The restore failure below specifically involves correction links.
6. Existing tests confirm several useful domain behaviours, including explicit non-valuation filtering, date-matched ledger comparison, ownership shares, currency-separated totals, and stale-revision rejection.

## Required correction 1 — Connect the screens to the actual summary contract

**Browser reproduction:** Seeded accounts already had balances. Saving Assessor Super as AUD 130,000 succeeded; the API returned 13,000,000 minor units. Nevertheless:

- Dashboard net worth, assets and liabilities remained A$0.
- The new freshness card said **“No accounts tracked yet.”**
- Reopening manual entry showed **Last Recorded $0.00** for the saved super account.
- Accounts and Reports also displayed zero for the balance-tracked accounts after navigation/reload.

**Causes:** `AccountFreshnessCard.tsx:40` and `StatNetWorthWidget.tsx:25` read `summary.accounts`; the service returns `accounts_included`. The net-worth widget calculates `finalNetWorth` but renders the old `netWorth` at line 47. The manual-entry loader, Accounts and Reports still use ledger-only balances from `/api/accounting`.

**Required action:**

- Fix the TypeScript contract and all 30 diagnostics, including the missing `Account.revision` member and unsupported subtype literals.
- Use one shared current-wealth response for Dashboard, Accounts, wealth Reports, and the previous-value fields in this flow. Preserve ledger-only cash-flow and transaction reports where appropriate.
- Pass explicit reporting currency, owner scope and valuation date. Do not label a base-currency subtotal as a complete converted total when foreign accounts are omitted.
- Render loading, error and incomplete-coverage states rather than falling back to legacy zero totals. Where a legacy widget remains outside this delivery, give it an honest incomplete-view state.
- Do not compare the new hybrid total to legacy history unless their account coverage and currency basis are comparable.

**Acceptance:** Save AUD 130,000, reload, and see the same amount and basis everywhere this delivery promises current balances. A missing source balance must say unknown, and a failed request must say unavailable. Evidence: `browser-saved-summary.json`, `browser-dashboard-after-save.txt/png`, `browser-accounts.txt`, `browser-reports.txt`.

## Required correction 2 — Preserve currency, units and signs through the entire UI

**Browser reproductions:**

- Pasted `Tokyo Savings, JPY 150000, 2026-09-20, Current`. Backend parsing was correct, but the review input displayed **1500.00**. Saving without editing preserved 150,000 yen, proving the displayed value and stored value disagreed.
- Entered **150000** manually for the JPY account. The API subsequently returned **15,000,000 JPY minor units**, which means ¥15,000,000: a 100× overstatement.
- Pasted `Foreign Savings, USD 1000, 2026-09-20, Current`, selected `Awaiting Balance (AUD)`, and saved. The app stored **AUD 1,000**, without a currency warning or conversion.

**Causes:** Hardcoded `*100` and `/100` in the modal and freshness card; account selection rewrites the source currency (`UpdateBalancesModal.tsx:483`). Parser and save handlers also apply `Math.abs` to negative liability values, losing the ability to distinguish debt from a credit/overpayment.

**Required action:**

- Reuse the existing currency-aware amount parsing/formatting utilities everywhere. Reject excess precision; JPY must not silently round decimal inputs.
- Keep source currency separate from the target account currency. Block mismatches, offer a matching account, or require an explicit correction of the source fact. Account selection must never perform an implicit conversion or relabelling.
- Preserve source amount/sign. Where the institution convention is unknown, ask whether the figure means money owed or a credit balance. Remove unconditional absolute-value conversions.
- Show currency beside every amount; support explicit currency correction with validation.

**Acceptance:** JPY 150,000 displays, edits, saves and reloads as JPY 150,000; USD-to-AUD selection cannot silently save; debt, overpaid cards and overdrafts retain the intended meaning. Evidence: `browser-review.txt/png`, `browser-manual-jpy-summary.json`, `browser-currency-relabel-summary.json`, probes P06/P12.

## Required correction 3 — Make parsing and owner matching reviewable

**Proven probe failures:**

- `Savings, $100` obtains a date, AUD currency, current-balance kind and 0.95 confidence, with **no unresolved fields**.
- `Savings, AUD 1200000, 2026-09-19, Projected future value` is classified as `current_balance`; passing the parser result through the service adds **AUD 1.2 million** to current wealth.
- Header-based input `Account,Balance,Currency,Date,Account Number` with `Savings,100,AUD,2026-09-19,123456` takes the account number as the monetary amount.
- `19-09-2026` is not normalised to ISO. The save API accepts impossible `2026-02-31` dates with HTTP 200.
- Two owners with an account named Savings cause the parser route to pick one automatically. The browser dropdown shows duplicate account names and currencies without owner labels.

**Required action:**

- Honour explicit headers and supported column mappings. If a layout is ambiguous, require mapping/correction instead of taking the last numeric cell. A bounded set of supported layouts is sufficient.
- Missing date/currency/kind remain unresolved unless the user explicitly supplied and confirmed a default. A dollar symbol alone does not establish AUD. Do not fabricate confidence.
- Recognise projections as non-current wealth; otherwise mark them unresolved. Use a real calendar-date validator and local calendar dates for user defaults.
- Require deliberate owner/account selection for ambiguous matches. Show **owner — account — currency** and omit ineligible/inactive accounts.
- Preserve the original source row/excerpt, label, explicit facts, and confirmed mapping with the saved observation. The parser returns `source_line`, but the modal drops it. Its save request currently sends no source reference/batch identity or remembered mapping.

**Acceptance:** All of P01–P06 and P11–P12 pass; unclear input is visibly editable and cannot silently become accepted financial facts. There is no need to solve arbitrary document extraction in this delivery.

## Required correction 4 — Make batches and retries work for real summaries

**Proven failures:**

- Submitting the same source-reference and source-batch twice creates two observations and supersedes the first (P09). It does not double the current wealth total, but it creates false correction history and extra revisions.
- A batch containing current balance and credit limit for the same account, both reviewed at revision 1, fails with HTTP 409 (P10). The first row increments the revision; the second conflicts with the batch's own first row. Atomic rollback prevents partial writes, but the valid batch cannot be saved.

**Required action:**

- Check reviewed account revisions once per account inside the atomic commit, then save all that account's reviewed rows. Keep genuine stale-preview conflicts.
- Use stable source-row/event identity for retry detection. An exact retry should return the previous success/already-imported result; a true correction should create an explicit supersession. Identical amounts on later dates remain valid new observations.
- Preserve explicit included/skipped row decisions. Currently unmapped rows are filtered out during saving; the confirmation/result should disclose how many rows were saved and which still need attention.
- Make confirmed mappings useful in this workflow; the mapping helper currently is not called by the parse route, and the modal does not send mapping identity.
- Provide a simple per-account balance-history view with source, effective date, saved date and corrections. The records exist in SQLite, but this delivery has no usable balance-history endpoint/UI to review them.

**Acceptance:** A card summary with balance, limit and available credit saves once as a batch; retry has no new effect/history; a concurrent edit still conflicts; correction and later-date reimport remain distinct.

## Required correction 5 — Report honest coverage and comparable balances

**Proven failures:**

- An account with no accepted valuation observation is omitted from the account list while `converted_net_worth.is_complete` is true and the amount is zero (P07).
- Credit limits are treated as comparable ledger balances and generate discrepancies (P08). Only `available_balance` receives the incomparable treatment.

**Additional source-review gaps:**

- The latest-valuation selector treats portfolio total, securities value and brokerage cash as interchangeable candidates. A later cash component can replace a portfolio total. Define the chosen valuation basis for the account and whether that total already includes cash.
- Transaction accounts receive the report date as `effective_date` even without a fresh source check, so the freshness UI would imply they were just updated after the contract error is fixed.
- Historical summaries fetch the newest reconciliation observation without bounding it by the report date. Service and UI also use different stale thresholds (45 and 30 days).
- UI labels available balance as contributing to wealth, while the service's valuation whitelist excludes it.

**Required action:**

- Return missing/unverified accounts explicitly, with known subtotal and coverage status. Distinguish missing FX from missing account values.
- Use account-appropriate valuation and comparison rules. Non-wealth capacity/projection values cannot produce ledger discrepancies. A small explicit rule table and an “includes cash” choice are enough.
- Separate calculation date from last source verification date. Use one freshness rule and bound historical reconciliation by its requested date.
- Label combined business/personal scope clearly; do not imply every company balance is personally available cash.

**Acceptance:** Missing observations never look like complete zero wealth; credit limits/redraw/projections do not trigger false discrepancies; older/historical views do not use future observations; portfolio components cannot arbitrarily replace or duplicate total value.

## Required correction 6 — Restore correction history safely

**Reproduction:** Create observation A, correct it with B on the same account/date/kind, export, restore to a fresh isolated database. Restore returns **HTTP 500, FOREIGN KEY constraint failed** at `src/app/api/vault/route.ts:1189` (P13). A points to B through `superseded_by_id`; the restore inserts A with that reference before B exists.

Also, changing an exported observation's currency from AUD to JPY while its account remains AUD is accepted with HTTP 200 (P14).

**Required action:**

- Validate the new collections before replacing data: account references, currency agreement, safe integer amounts, real dates, supported kinds/statuses/modes, and valid correction targets.
- Restore observations in two passes: insert all observation rows first with correction links temporarily null; then restore validated links, within the existing transaction. Do not disable integrity checks as a workaround.
- Preserve observation IDs, dates, original metadata, mappings, tracking mode and revisions. Return HTTP 400 for invalid archives and leave the target vault unchanged.

**Acceptance:** Unmodified populated export with multiple correction chains restores exactly; bad references/currency/date/amount are rejected atomically; legacy and plain-observation restore cases remain passing.

## Suggested execution order and resubmission

1. Repair type errors, summary wiring and currency/sign handling.
2. Repair parser review, owner matching, batch/retry and balance semantics.
3. Repair restore and run the combined acceptance sequence.

Use the existing components and services. Keep AI extraction and bank connectors for their planned later deliveries. The correction work above addresses behaviours already promised by Delivery 1.

Resubmit with:

- Existing suite passing, TypeScript clean, and appropriate build verification.
- Focused regressions that reproduce the actual failures, not only calls to domain services with already-correct labels.
- Browser evidence for paste → review/correct → save → reload → matching Dashboard/Accounts/Reports → history → exact reimport, including AUD and JPY, both owners, ambiguous data, one new account, and one multi-kind account summary.
- Isolated backup/export/restore demonstration containing a correction chain and source mapping.

## Reproducing assessor probes

The probe file is named `probes.test.ts.disabled` so it does not silently join the normal suite. Temporarily rename it to `probes.test.ts` and run:

```powershell
$env:TEMP = (Resolve-Path 'samples/delivery1-assessment-2026-09-20/temp').Path
$env:TMP = $env:TEMP
npx vitest run samples/delivery1-assessment-2026-09-20/probes.test.ts
```

Restore the disabled extension afterwards. Probes use fresh in-memory databases and `setTestDb`; they never target the live vault. The browser fixture is `isolated.sqlite`. Do not run its seed again against an active test server. Existing server logs and JSON/AX evidence are retained here.

This was a focused assessment of Delivery 1, not a fresh certification of every unrelated app feature, every legacy widget, all owner-consolidation cases, or the future AI/API deliveries.
