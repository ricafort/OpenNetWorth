# Delivery 1 remediation recheck — 20 September 2026

**Verdict: substantial progress; retain the fixes, but request completion of five existing acceptance areas before sign-off.** No architecture redesign is needed.

## Independently verified

- Existing repository suite: **260/260 passed** across 25 files (`baseline.log`).
- All previous assessor probes: **19/19 passed**, rerun from a copy of the previous disabled probe file (`previous-probes.log`).
- TypeScript: `npx tsc --noEmit --incremental false` **exit 0**, no diagnostics (`types.log`). Production build was not run in this assessment.
- Five additional checks of previously requested acceptance requirements: **1 passed, 4 failed** (`remaining.log`). These cover report consistency and archive validation, not new product scope.
- Actual browser tests used a new synthetic database on **port 4007**. The normal servers were not used for test writes.
- No application implementation changes. Next.js's temporary tsconfig additions were restored. The owned server and browser tab were stopped. Live SQLite, WAL and SHM hashes matched before/after. All new artifacts are in this folder.

## Fixes confirmed working

1. Ordinary AUD balance updates now change the dashboard net-worth tile.
2. Account rows in Reports and the manual-entry previous-value column now show saved observations.
3. JPY paste review displays the correct units. Manual entry of **160000 JPY** saves exactly **160000**, confirmed through the summary API (`final-summary.json`). The former 100× storage error is fixed.
4. Target-account options now show owner names. The previous ambiguous-owner matching probe passes.
5. The previous impossible-date, projection, header-column, Australian date, multi-kind batch, non-comparable limit, and missing-coverage probes pass.
6. Backup restore with a correction chain succeeds, preserves observations, and rejects account/observation currency mismatch.
7. Previous transaction-preservation, rollback, older-statement and later-date freshness tests remain passing.

These fixes should remain accepted. The old probes establish these specific behaviours; they do not prove every review/save/display path is connected to them.

## 1. Preserve and enforce review findings throughout the save workflow — high priority

**Browser reproduction:** Paste `Assessor Super, $130000` with no date and ambiguous dollar currency. Parse, then press Confirm & Save without correcting anything. The review screen shows assumed AUD, today's date and Current Balance, with no warning. Saving succeeds.

**Cause:** `UpdateBalancesModal.tsx` drops `unresolved_fields` when constructing `ProposalItem`. Its save payload also contains no review-resolution state. The parser flags are therefore informational only to the API caller, not enforced in the actual workflow.

Related gaps from source inspection:

- Negative credit-card/loan values are still converted with `Math.abs` in the parser, then flagged `amount_sign`. Dropping that flag defeats the sign-confirmation fix.
- Excess precision is rounded and flagged by the parser; dropping the flag lets rounded values save. Manual/review editing also rounds excess precision.
- Unknown balance kinds still default to `current_balance`.
- Existing-account selection now guards currency mismatch, but inline creation still assigns `currency: createdAcc.currency` back to the proposal. That path needs the same protection.

**Action:** Carry original facts and findings into review. Provide explicit currency/date/kind/sign corrections, preserve the source amount, and prevent acceptance until blocking findings are resolved. Validate the committed corrected values server-side as well. A small review-state contract is enough; do not add another orchestration layer.

**Acceptance:** Missing date/currency, ambiguous kind, negative liability meaning and excess precision cannot silently save. Corrections remain visible and enable saving only when valid. Both selecting and creating an account preserve source currency unless the user explicitly corrects it.

Evidence: `review-unresolved.txt`, `observations-first-save.json`.

## 2. Finish consistent totals and honest coverage — high priority

**Browser reproduction:** The report lists Assessor Super as **A$130,000.00**, but the Household net-worth/assets headline above that table remains **A$0.00**. Business likewise lists A$500 while its headline says zero. On Dashboard, net worth updates while Total Assets and Total Liabilities remain zero.

**Cause:** `/api/accounting/route.ts` now resolves observations for individual account rows, but headline totals still call ledger-only `getEntityNetWorth`/other existing report services. One summary must not mix two bases.

**Coverage:** An account without an observation still displays zero in Accounts/manual entry. It disappears from the freshness count: six asset/liability accounts became “5 / 5 up-to-date.” The API's corrected incomplete flag is not rendered by the dashboard. Transaction accounts are also labelled fresh using calculation date rather than last source verification.

**Action:** Use the shared wealth calculation for both account rows and current-wealth report totals with identical owner, currency and date scope. Keep cash-flow/transaction reports on their appropriate ledger basis. Render coverage and missing-FX status; label currency subtotals as subtotals rather than a complete converted total. Show missing observations as unknown. Hide or honestly label legacy widgets outside the supported scope instead of presenting false zeros.

**Acceptance:** One account with AUD 100 produces AUD 100 in both its row and the matching report total. Missing accounts remain visible as missing. The report consistency probe R03 must pass. Evidence: `reports.txt`, `remaining.log`, `summary-after-first-save.json`.

## 3. Finish currency-aware dashboard formatting — high priority

**Browser reproduction:** Stored JPY 150,000 appears correctly in review/manual entry/report rows, but the freshness card and the dashboard with JPY selected show **¥1,500**. After entering JPY 160,000, the API reports 160,000 while the dashboard shows ¥1,600.

**Cause:** `StatNetWorthWidget.tsx:26` and `AccountFreshnessCard.tsx:62` still divide by 100.

**Action:** Use the existing currency-aware formatter for these remaining displays. Keep the manual-entry fix. Also ensure the headline is a correctly scoped subtotal or a complete verified conversion, not just the selected-currency bucket labelled as total wealth.

**Acceptance:** JPY 150,000 must appear as JPY 150,000 in every supported screen; AUD retains two-decimal scaling. Evidence: `dashboard-jpy.txt`, `manual-values.txt`, `final-summary.json`.

## 4. Connect retry/source identity to real imports — medium priority, required before sign-off

**Browser reproduction:** Saved the same three pasted rows twice. Observation count increased from **7 to 10**. The first saved rows became superseded and new identical rows were inserted. Current wealth was not doubled, but false correction history and revisions were created.

**Cause:** The service's new retry check requires both `source_batch_id` and `source_reference`. The browser sends neither; both are null in stored records. The previous P09 passes because it supplies those values directly.

**Action:** Generate stable source/event identity in the import path and retain it through review and retries. Preserve the original row/source reference. Return an already-imported result for an exact retry; retain genuine corrections and same-amount/later-date observations. Wire confirmed mapping and simple history access into this flow as requested previously.

**Acceptance:** Perform the same browser paste/save twice: no extra observations, correction links or revisions. A later effective date remains a new observation. Evidence: `observations-first-save.json`, `observations-reimport.json`.

## 5. Complete archive validation — high priority

The correction-chain restore fix passes and should be retained. Remaining tests mutate an otherwise valid exported observation:

| Archive mutation | Actual | Required |
|---|---|---|
| `amount_cents = 100.5` | HTTP 200, accepted | HTTP 400; safe integer required |
| `effective_date = '2026-02-31'` | HTTP 200, accepted | HTTP 400; real date required |
| Missing `superseded_by_id` target | HTTP 500 from SQLite | Prevalidated HTTP 400 |

**Action:** Validate new observation fields and correction references before replacing data. Reuse existing safe-money/calendar validators, keep two-pass insertion and atomic restore. Invalid archives must leave the destination unchanged. The invalid-reference case is principally validation/error handling; this recheck does not claim it causes data loss.

**Acceptance:** All three R02 cases pass, including unchanged destination state on rejection. Existing plain and correction-chain backup tests remain passing.

## Bounded next task for coder

Complete the five areas above using existing components and services. They are carryovers from the previous Delivery 1 assessment. Do not reopen working fixes or add AI/bank connectors to solve them.

Resubmit with:

- Existing tests and TypeScript still passing.
- Browser evidence for missing-fact rejection and correction, JPY display/save, consistent report totals, exact reimport, and both account selection/creation currency protection.
- Invalid archive tests plus successful corrected-observation round trip.
- Explicit completion/deferment of the previously requested simple balance-history/source display and portfolio-basis handling; neither is certified by the 19 old probes.

`previous-probes.test.ts.disabled` and `remaining.test.ts.disabled` are inactive so they do not change the normal suite. Temporarily rename the required copy to `.test.ts`, run Vitest against that file, then restore the disabled extension. All probes use fresh in-memory databases and `setTestDb`. Do not reseed an active browser database.

This assessment does not certify all unrelated features, historical conversion/consolidation cases or future AI workflows. It verifies the remediation claims and the outstanding Delivery 1 acceptance paths above.
