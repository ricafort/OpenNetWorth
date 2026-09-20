# Delivery 1 resubmission assessment — 20 September 2026

**Decision: accept the verified fixes below. Full sign-off is pending one remaining data-integrity issue and two bounded UI/completeness corrections. Keep the current architecture.**

## Results verified independently

- Existing suite: **260/260 passed**, 25 files (`baseline.log`).
- Previous acceptance probes: **24/24 passed** (`probes.log` also includes one passing isolated-fixture setup test, so its aggregate is 25).
- TypeScript: `npx tsc --noEmit --incremental false`, exit 0, no diagnostics (`types.log`).
- Browser on separate synthetic vault at port 4007: successful AUD/JPY paste → review → save; accurate JPY display; exact reimport with unchanged stored observations and revisions; blocking of unconfirmed review findings; inline currency guard inspection; report row/headline consistency.
- One additional regression of the existing retry/correction requirement **fails**: reimport after correction (`corrected-retry.log`).
- Production build, every legacy widget, and future AI/connector workflows were not tested in this pass.

## Fixes accepted; do not redo them

1. **Backup validation and restoration:** previous fractional-money, impossible-date, invalid-reference and correction-chain probes all pass.
2. **Known-balance report totals:** browser report now shows Household assets AUD 130,000, liabilities AUD 750, net worth AUD 129,250, and JPY 160,000 separately. Business AUD 500 appears consistently in its headline and account row (`reports-passing.txt`).
3. **JPY scaling:** saving JPY 160,000 displays as JPY 160,000 in the net-worth tile and freshness card. The prior 100× error is fixed.
4. **Exact repeat of the current source:** repeated the identical two-row paste. The observation records and all account balance revisions stayed identical (`before-reimport.json`, `after-reimport.json`).
5. **Review warnings:** missing-date and ambiguous-currency badges appear. Pressing Save before confirming the matched flagged row is blocked.
6. **Owner labels and explicit source currency protection:** owner labels remain visible; creation now preserves/locks the proposal currency rather than silently changing it to a different account currency.

## 1. Fix reimport after a correction — high priority

Reproduction using the actual balance POST route and a fresh in-memory database:

1. Import AUD 100, with stable source batch/reference.
2. Correct that account/date/kind to AUD 110 through a later manual observation.
3. Reimport the original AUD 100 source using the current account revision.

**Actual:** HTTP 200, latest balance becomes AUD 100 again, and observation count increases from 2 to 3. The correction is silently superseded.

**Cause:** `balanceObservationService.ts` filters retry lookup by `review_status = accepted` (around line 99). The first import is now superseded, so its original source identity is no longer recognised as already imported.

**Bounded fix:** Look up previously imported source identity across relevant historical statuses. An exact old source retry must not reactivate it over its correction. Return an already-imported/superseded result, or ask the user to make a deliberate new correction. Preserve normal latest-source retries and genuinely new later-date observations. Do not simply drop all status restrictions without defining rejected/proposed behaviour.

**Acceptance:** The three steps above leave AUD 110 authoritative, with no extra observation or revision. Normal exact retry and same-amount/later-date probes remain passing. Test: `corrected-retry.test.ts.disabled`.

## 2. Allow actual correction of uncertain currency — medium priority

**Browser reproduction:** Paste `Foreign Savings, $1000`. The row shows “Ambiguous Currency ($)” and “Date Missing”. There is no currency editor on the review row. Choosing Create New Account opens a currency selector locked to **AUD**, even though AUD is only the parser's default, not a known source fact (`locked-ambiguous-currency.txt`).

The new Confirm Row control can accept the guess, but it cannot correct it to USD/CAD/etc. The user must edit the original pasted text and parse again. This falls short of the promised editable review workflow for regular users.

**Bounded fix:** Add an explicit currency correction field for unresolved currency; display the proposed code beside the amount. Lock account currency only after the source currency is explicit or confirmed. Retain the mismatch guard. Change generic confirmation copy to identify the selected currency/date/sign being confirmed. Reset relevant confirmation when those facts change.

**Acceptance:** A bare-$ row intended as USD can be corrected to USD and routed/created as USD inside review, without editing CSV text and without any silent conversion. Explicit AUD rows cannot accidentally become USD by account selection. Date and sign corrections remain available.

## 3. Finish honest dashboard totals and coverage — high priority for user-facing totals

Observed in the same browser fixture:

- The net-worth tile and new freshness card show JPY 160,000 correctly, but the separate **Total Assets** tile still shows JPY 0.
- There are six asset/liability accounts, one with no accepted balance. The freshness card says **“5 / 5 up-to-date — All accounts updated recently”**, excluding the unknown account without disclosure.
- The report lists the account with no observation as A$0 as of today, rather than an unknown balance.
- “Total Net Worth (JPY)” shows the JPY bucket while AUD accounts also exist. There is no visible indication that this is a currency subtotal rather than all wealth converted to JPY.

**Bounded fix:** Feed the remaining headline asset/liability tiles from the same summary, or hide/mark them unavailable until connected. Display the existing coverage and missing-FX information. Show “5 accounts with balances; 1 needs a balance”, and unknown values as unknown. Use “JPY holdings subtotal” or equivalent when not presenting a complete verified conversion. Keep calculation date distinct from last source verification.

No need to retrofit every historical chart or legacy widget now. Clear unavailable/incomplete states are sufficient for widgets outside this delivery.

**Acceptance:** No contradictory zero asset tile; no missing account presented as freshly verified zero; no currency bucket labelled as complete converted wealth. Evidence: `dashboard.txt`, `reports-passing.txt`.

## Coder handover

Please complete only the three items above for this acceptance pass. Preserve the passing implementation. Add the correction/reimport regression to normal coverage, demonstrate correcting an ambiguous currency, and provide a screenshot of consistent headline totals plus missing-account/FX disclosure. Rerun the existing suite, the 24 prior probes and TypeScript. AI extraction and bank connectors can remain subsequent deliveries.

The prior requests for fuller source/history display and portfolio valuation-basis handling are not certified by these passing probes; keep them explicitly tracked. They do not justify another framework or a broad rewrite during this pass.

## Isolation and cleanup

Application implementation was not edited. Only assessment files/test artifacts were added. Next.js's temporary tsconfig include additions were restored. Test files are disabled outside targeted runs; the owned port-4007 server and browser tab were stopped.

The **main live SQLite file hash stayed identical**. However, its live **WAL and SHM hashes changed during this run**, so this assessment cannot certify the entire live vault as byte-for-byte unchanged. The source of that concurrent activity was not established. All assessment write requests targeted the explicitly configured isolated database; a subsequent read-only check found **zero synthetic fixture account IDs in the live vault** (`isolation-check.json`). No live-vault restore/reset or write was performed by this assessment.

To rerun the new regression, temporarily rename `corrected-retry.test.ts.disabled` to `corrected-retry.test.ts`, run Vitest against that file using this folder's temporary directory if needed, then restore its disabled extension. It uses `createTestDb` and `setTestDb`, never the live path.
