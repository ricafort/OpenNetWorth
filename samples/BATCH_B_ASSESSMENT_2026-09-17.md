# Batch B independent assessment — 17 September 2026

**Verdict: not accepted yet. Batch A remains accepted.** The new warnings partially improve the interface, but the spending endpoint currently fails, date/owner interpretation is incorrect in common cases, and several required financial views remain misleading.

## Verification

- Existing suite: **241/241 tests passed**, 23 files. This includes the nine Batch A acceptance tests.
- TypeScript: **failed with four errors in the mentor route**.
- Independent parser acceptance tests under `Australia/Sydney`, with time fixed to 17 September 2026: **7/7 failed**.
- Real HTTP spending request: **500**, `Cannot convert undefined or null to object`.
- Actual browser chat: the same error appears as the mentor's reply, with no facts card.
- Browser checks: Freedom shows an incomplete-view warning after modern-account data loads; Privacy suppresses the incomplete wealth PDF.
- Browser checks: Assets, Liabilities and Cash Flow still show empty/zero financial information without the required qualification.
- Browser checks: both Accounts and Reports warning links land on Transactions.
- Browser check after adding a synthetic legacy liability alongside the existing accounting mortgage/card: Freedom displays a two-month payoff projection without the incomplete-view warning.

Tests ran on a new isolated vault at `samples/batch-b-assessment-2026-09-17/isolated.sqlite`, served on port 4007. No application implementation changes were made. The assessor server was stopped and generated configuration changes restored after testing. Live database/WAL/SHM hashes were checked before and after.

## 1. P1 — Spending requests fail before facts are displayed

`src/app/api/mentor/route.ts:54–58` reads `incomeExpenses.expenses` and `incomeExpenses.categories`. `getPeriodIncomeAndExpenses` actually returns `total_expenses_cents_by_currency` and `breakdown_by_category`, among other fields. `Object.entries(undefined)` causes HTTP 500.

Reproduction: “How much did I spend in July 2025?” through HTTP and the actual chat UI.

**Fix:** use the existing typed return contract, with a typed facts response. Do not cast away the errors or substitute zero when calculation fails. Add an endpoint test that checks successful facts for a seeded period independently of local-model availability.

Two related problems must be handled in that same small change:

- Both server copy and `ChatInterface.tsx:149` divide all amounts by 100. That will display JPY 500 as JPY 5 once the endpoint is fixed. Use the existing currency-aware money formatter.
- The route still injects client-provided net worth/assets/liabilities and defaults absent values to zero (`route.ts:69–72`). This contradicts the claimed bypass of stale client context. For this bounded spending response, omit unrelated unverified balances and clearly state record coverage. A prompt containing deterministic facts does not itself prevent conflicting generated numbers.

The established calculation service's posted expense-account filtering is useful and should be retained. The broken integration means end-to-end transfer/cancellation exclusion has not yet been accepted for the assistant.

## 2. P1 — Date and ownership interpretation can answer the wrong question

Independent parser results:

| Question | Actual interpretation | Required behavior |
|---|---|---|
| How much did I spend in July 2025? | 2025-06-30 through 2025-07-30 | July 1 through July 31 |
| How much did I spend on 16 September 2026? | 2026-08-31 through 2026-09-29 | September 16 only |
| How much did I spend on 2026-09-16? | Asks for a month or exact date, despite receiving one | September 16 only |
| How much did my business spend in July 2025? (one business) | Treats “my” as conflicting personal intent | Resolve that business |
| Business expenses in July 2025 (two businesses) | Silently chooses the first business | Ask which business, or use an explicitly requested combined scope |
| Expenses across all my finances in July 2025 | Personal entity only | Correct all-owner scope or clear clarification |
| Expenses in February 1999 | February 2026 | Preserve requested year or explicitly explain unsupported scope |

**Causes:** local midnight converted through `toISOString()` shifts the calendar date in Sydney; the parser only implements months, not single dates; the year pattern only recognizes 20xx; personal/business keywords and first-match selection override intent.

The route additionally implements `entityId === 'all'` by calculating only `availableEntities[0]` while labelling the result “All Accounts.” That must not ship as an aggregate answer.

**Fix:** keep this parser bounded. Explicitly support a calendar date and month/year, construct calendar strings without a UTC-day shift, prioritize explicit owner names/business phrases, and clarify unresolved scope. Default to the current month only when no time period was provided. Either implement the defined multi-owner expense scope correctly or ask the user to select a supported scope; never silently select the first owner.

**Acceptance:** the seven tests above pass, plus month boundaries and the local date. No new orchestration framework is needed.

## 3. P1 — Screen guardrails remain incomplete

Successful changes: after the accounting query resolves, Freedom warns when legacy debts are empty but accounting liabilities exist. Privacy suppresses the incomplete PDF.

Remaining problems:

- Assets still says “Manage everything you own in one place,” “No assets added yet” and total $0 despite populated accounting accounts/property.
- Liabilities still says “No liabilities found. Good job!” and total $0 despite accounting mortgage/card debt.
- Cash Flow still shows zero income, expenses and savings despite recorded activity.
- `useAccountingCheck` is used only in the two debt components and wealth snapshot, not the broader dashboard/asset/liability/cash-flow surfaces requested.
- Both debt components apply their warning only inside the legacy-empty/no-debt branch. Once legacy debt exists, the warning disappears and their forecast excludes modern liabilities. The browser reproduced a short payoff forecast with the accounting mortgage still outstanding.
- The first Freedom render briefly said “You are Debt Free!” before changing to “Incomplete View.” Hook consumers ignore loading, and the hook does not expose errors. A failed check can therefore be treated as absent records by the rendering logic.

**Fix:** apply coverage checks independently of whether the legacy collection is empty. Qualify or suppress incomplete totals and payoff forecasts; do not add potentially duplicate legacy and accounting balances together. Handle loading/error as unknown coverage, not proof of zero debt. Complete the agreed screens using short limitation messages and direct links where full integration is deferred.

## 4. P2 — Sources and navigation do not reach the promised records

The warning's Accounts link opens `/accounting`, whose default is Transactions. The Privacy Reports link opens `/accounting?view=reports`, but `AccountingPage` does not read that parameter, so it also opens Transactions. Both were reproduced in the browser.

The assistant card's “View Source Records” link is the same generic Reports URL. Even once navigation is fixed, a report landing page is not a citation to the actual records used. `incomeExpenses.categories` does not exist; replacing it with category totals would still not provide transaction IDs.

**Fix:** implement working tab deep links and return actual supporting transaction IDs under the same owner/date/status filters as the total. Carry that scope into the destination and allow users to open the supporting records. Keep amounts/date ranges/currency authoritative in the facts card, independent of generated prose.

## Focused remediation order

1. Fix the route contract and currency formatting; obtain a passing typecheck and one working spending request.
2. Fix bounded date/owner parsing using explicit assertions for the reproduced questions.
3. Complete the coverage warnings, including mixed records and loading/error states, and make navigation links open the intended tab.
4. Add supporting transaction links and demonstrate the complete assistant path with known expense, transfer, principal, interest/fee and cancellation records in multiple currencies.

This is completion of the agreed Batch B scope, not a request for new product features. Retain Batch A regression tests. Do not describe the facts as independently verified until the endpoint, arithmetic presentation, scope and sources all agree.

## Evidence and limits

Evidence directory: `samples/batch-b-assessment-2026-09-17/`.

- `vitest.log`, `tsc.log`
- `mentor-http.json`, `assistant-error.txt`
- `parser-results.json`, `parser.log`, `parser.test.ts.disabled`
- `freedom-warning.txt`, `mixed-debt-forecast.txt`
- `assets.txt`, `liabilities.txt`, `cashflow.txt`, `privacy-warning.txt`
- `reports-link-destination.txt`, `legacy-seed.json`
- live before/after hashes

The independent parser file is disabled after testing so it does not automatically alter the ordinary application test suite. This assessment did not evaluate generated spending prose or successful facts-card rendering because the endpoint fails before either can be accepted. The /freedom debt calculator and Privacy were browser-tested; the other debt-card branch was inspected in code rather than separately exercised on the dashboard. Broader investment, mobile and unrelated legacy workflows were outside this recheck.
