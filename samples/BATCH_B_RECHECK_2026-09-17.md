# Batch B remediation recheck — 17 September 2026

**Decision: improvements verified, but Batch B is not ready for sign-off. Batch A remains accepted.** Complete the remaining bounded corrections before starting another feature slice.

## Verification performed

- Existing suite: **248 tests passed across 24 files**.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Independent date/owner probes: **4 passed, 5 failed** under Australia/Sydney, with the clock fixed to 17 September 2026.
- Independent mentor-route probes: **1 passed, 3 failed**. The local-model call was stubbed for these tests so the real route, parser, database query and formatter could be tested independently.
- Real HTTP and browser spending request succeeded. AUD 25.00 correctly excludes the test transfer, credit-card repayment, loan principal and voided purchase; it includes AUD 20 interest plus AUD 5 fees.
- Mixed-currency route probe correctly returned AUD 25.00 and JPY 1,250 separately.
- Browser followed the assistant's source link and correctly opened Reports. Tab routing is fixed.
- Browser exercised mixed-debt Freedom, Assets, Liabilities, Cash Flow and the assistant using the isolated fixture on port 4007.

## 1. Correct the remaining calendar and owner scope errors — P1

Exact independent results:

| Question | Actual | Expected |
|---|---|---|
| How much did I spend last month? | July 31–August 30, labelled August 2026 | August 1–31 |
| How much did I spend? | August 31–September 29, labelled September 2026 | September 1–30 |
| How much did I spend on 16 September 2026? | Whole September | September 16 only |
| How much did my business spend in July 2025? (one business) | Personal/business clarification | Select the one business |
| Expenses across all my finances in July 2025 | Personal only | Correct all-owner scope or explicit clarification |

Named month/year, ISO single-day and multiple-business clarification now pass. The remaining UTC conversion is in `intentParser.ts:83–84,132–133`; the named-date pattern at line 111 supports month-first only. Scope keyword handling starts at line 32.

**Bounded fix:** construct calendar dates consistently without converting local midnight to UTC. Support day-first dates or explicitly clarify instead of answering for an entire month. Treat “my business” as business scope. For “all my finances,” clarification is acceptable for this batch; do not silently narrow it. Remove/disable the route's latent “all = first entity” behavior before exposing all-owner aggregation.

The coder's last-month test only checks that dates exist. Replace that assertion with exact boundaries, including Sydney timezone and month-end transactions.

## 2. Complete incomplete-data guardrails — P1

Browser reproduction with a legacy loan plus accounting mortgage/card:

- Freedom still displays a **two-month payoff forecast**, without an incomplete-view warning, although Accounts contains **AUD 200,150** in accounting liabilities.
- Assets shows **“No assets added yet” and $0** despite recorded accounting property and bank accounts.
- Liabilities shows only the legacy loan, **$649** in the profile display currency, as “TOTAL LIABILITIES,” without qualifying the omitted accounting debts.
- Cash Flow shows **income $0, expenses $0 and net savings $0** without qualifying the missing accounting activity.

Both debt components still place the accounting warning inside the legacy-empty/no-debt branch (`DebtPayoffCalculator.tsx:100`, `FreedomDateCard.tsx:65`). Mixed records therefore bypass it. Loading placeholders were added, but `useAccountingCheck` still does not return an error state; missing data is interpreted as false flags. Error-state behavior is a source finding, not a separately injected browser network failure in this recheck.

**Bounded fix:** check incomplete coverage regardless of whether legacy debts exist. Suppress or clearly qualify incomplete payoff forecasts and financial totals. Apply the agreed warnings across the legacy asset/liability/cash-flow/dashboard surfaces. Treat profile loading, query loading and errors as unknown coverage. Link directly to `/accounting?view=accounts`; debt warning links currently still use `/accounting`.

No full legacy migration or new accounting engine is required. A concise notice and working destination are sufficient where integration is deferred.

## 3. Remove stale financial context from spending replies — P1

`mentor/route.ts:87–90` still accepts client net worth/assets/liabilities and substitutes zero when missing. The independent probe supplied a fabricated net worth of 987,654,321 and confirmed that it was injected into the model prompt.

This also reproduced in the real browser: the assistant correctly answered **AUD 25.00**, then offered advice based on **net worth -649.35 USD** from the incomplete legacy view. The accounting Reports screen contains substantial assets and liabilities in AUD, JPY and USD. No complete converted net-worth claim is justified by that client snapshot.

**Bounded fix:** omit unrelated client wealth figures from spending responses. Supply only the requested server-calculated facts, owner, date range, currencies and coverage. Keep the deterministic facts card authoritative. This does not require building a new net-worth assistant tool.

## 4. Make spending evidence match the answer — P2

The spending citation query (`mentor/route.ts:55`) includes both income and expense accounts. The AUD 25 test answer lists the AUD 1,000 salary transaction alongside the loan instalment. The returned spending categories also contain salary.

The card displays only the **count** of supporting transactions, not the IDs or individual links claimed in the handoff. Its “View Source Records” link opens Reports with **All my finances and blank period dates**, losing the personal, single-day scope of the question.

**Bounded fix:** derive supporting IDs and category totals from the expense postings that contributed to the answer. A loan instalment can support its interest/fee component; identify the expense contribution rather than implying its full payment is spending. Carry owner/date scope to a filtered transaction view or a simple supporting-record list with openable records. Preserve currency separation and posted-only filtering.

## Coder handoff and acceptance

Finish the four items above without adding new features or frameworks. Retain the fixes already verified. Rerun the existing suite and exact assessor probes, then demonstrate:

1. Correct Sydney current/previous-month boundaries and day-first single dates.
2. Correct business selection and safe clarification for unsupported combined scope.
3. Mixed legacy/accounting debts cannot produce an unqualified partial payoff forecast; errors cannot imply zero debt.
4. AUD and JPY spending answers have matching expense-only supporting records, no stale wealth context, and a link that preserves the answer's scope.

Evidence: `samples/batch-b-recheck-2026-09-17/` contains suite/typecheck logs, exact parser results, mentor probes, HTTP response and browser text captures. Assessor probe files are retained with `.disabled` suffixes so they do not silently change the normal test suite. Restore the `.test.ts` extension only to run them explicitly. Test setup uses synthetic/in-memory databases.

Limits: this is a focused Batch B recheck, not a new certification of all application workflows. A successful model response in one browser run does not guarantee all generated prose is accurate. Source inspection findings are distinguished above from exercised HTTP/browser behavior.

Safety verification: no application implementation was changed. The assessor server and tab were closed, generated TypeScript configuration changes were restored, and live SQLite database/WAL/SHM hashes matched before and after. Only assessment artifacts and isolated test data were added.
