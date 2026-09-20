# Delivery 1 final resubmission — independent assessment

20 September 2026

## Decision

Accept the three targeted remediations for the bounded Delivery 1 scope. Proceed to planning the next delivery; carry the two display corrections below as small follow-up fixes. This is not certification that every legacy dashboard widget, FX scenario, historical comparison, or future extraction workflow is complete.

No application implementation was edited. All test mutations targeted an isolated synthetic vault or in-memory databases.

## Independent verification

| Check | Result |
|---|---|
| Repository suite | 260 tests passed across 25 files |
| Previous assessor probes | 19 + 5 passed |
| Corrected-source retry regression | Passed: latest balance 11000 cents; two observations |
| TypeScript | `npx tsc --noEmit --incremental false`: exit 0 |
| Browser | Actual UI operated on localhost:4007 against the isolated fixture |

Logs: `baseline.log`, `probes.log`, `types.log`, `server.log`. Copied test files have been restored to `.test.ts.disabled` extensions. The seed fixture is a separate test, not counted among the 25 acceptance probes. Production build was not rerun.

The first test attempt could not create a temporary directory under the system TEMP path. Rerunning with TEMP/TMP explicitly inside this assessment folder passed. The initial seed script had an assessor-only table-name typo, corrected before seeding; it was not an application defect.

## 1. Corrected source retry — accepted

The original regression now passes unchanged:

1. Import AUD 100 under a stable source batch/reference.
2. Correct it to AUD 110.
3. Reimport the original source.
4. Authoritative balance remains AUD 110; observation count stays at two.

The source lookup now recognises both accepted and superseded records. The historical-match return occurs before insertion, supersession, and revision advancement. This fixes the demonstrated old-source resurrection defect. This acceptance does not imply arbitrary edited/reordered files always share the same source identity.

## 2. Currency correction and review — accepted

Actual browser sequence:

- Pasted `Foreign Savings, $1000` and `Assessor Super, $130000`.
- Both displayed ambiguous-currency and missing-date findings.
- Changed Foreign Savings from AUD to USD directly in the review row; displayed amount remained 1000.
- Changed Assessor Super from AUD to JPY; displayed amount remained 130000 and the incompatible AUD account was detached.
- Created Foreign Savings as a USD savings account owned by Assessor Household. Currency was correctly locked to the explicitly selected USD.
- Confirmed the Foreign Savings row, then changed amount to 1001. Confirmation reset.
- Attempting Save produced the expected blocking review alert.
- The browser tool stalled on that JavaScript alert. Reopened an isolated tab and resumed using the newly created synthetic account; no production data was involved.
- Parsed `Foreign Savings, $1001`, corrected to USD, selected the USD account, confirmed the date, and saved through the actual UI.
- UI displayed `Saved!`. Freshness totals immediately showed USD 1,001.00 and changed from six known accounts / one missing after the save. Reports subsequently showed the same USD 1,001.00 for Foreign Savings.

This verifies the correction through persistence and report rendering, not merely the presence of the dropdown. The alternative branch of changing currency inside the still-ambiguous inline creation dialog was inspected in code but not separately completed in this browser run.

## 3. Headline totals, coverage and reports — accepted

With the JPY display currency selected, headline net worth and assets both showed JPY 150,000; liabilities showed JPY 0. Headline labels explicitly identified currency subtotals.

Before adding the test account, the freshness card showed `5 with balances; 1 needs balance` and identified Awaiting Balance. Missing FX rates were disclosed. After creating Foreign Savings without a balance it showed two missing balances; after saving its observation, coverage became six with balances and one missing.

The all-owner Reports screen displayed:

- Business: AUD 500 assets and net worth.
- Household: AUD 125,000 assets, AUD 750 liabilities, AUD 124,250 net worth; separate JPY 150,000 and USD 1,001 totals.
- Awaiting Balance: `Unknown (Needs balance)` and an em dash for date.

These match the known synthetic fixture plus the USD observation saved in the browser.

## Two small follow-up fixes

### F1. Clear the previous balance when currency/account changes

Browser reproduction: changing the Assessor Super row from AUD 130,000 to JPY 130,000 detaches its AUD account, but the Delta cell displays `-JPY 12,370,000`. It retains the old AUD 12,500,000 minor-unit balance and subtracts it as though it were yen.

Location: `src/features/sync/components/UpdateBalancesModal.tsx`, currency handler near line 232 and delta calculation near lines 573–574.

Fix: clear `previous_amount_cents` and account-specific revision when detaching; on remapping, derive both from the newly selected account. Display an em dash until the old and new values refer to the same account and currency. Do not add FX conversion to solve this.

Acceptance: an incompatible currency edit shows no delta; remapping computes the delta from the new account in its own minor-unit scale. This is a display problem observed before saving, not a demonstrated wrong persisted amount.

### F2. Carry unknown balances into Manual Fast Entry

Browser reproduction: Awaiting Balance correctly shows unknown in Reports but displays `$0.00` under Last Recorded in Manual Fast Entry.

Location: `src/features/sync/components/UpdateBalancesModal.tsx`, near lines 823 and 843. The checks exclude undefined but accept null; null is coerced to zero by formatting/subtraction.

Fix: type the API balance as nullable, treat both null and undefined as unknown, and show `Needs balance` with no delta until a known prior balance exists. Preserve a genuine recorded zero as zero.

Acceptance: unknown prior balance renders unknown; entering its first balance does not claim a gain from zero. No schema change is necessary.

## Coder handover

Delivery 1's three targeted remediations are independently accepted. Keep the passing source-correction regression in routine coverage. Carry F1 and F2 as a small UI follow-up; do not reopen the architecture or add OCR, model orchestration, or FX scope to fix them. Next delivery planning may proceed. Retain existing tracked limitations around legacy widgets/history rather than claiming whole-product completeness.

## Isolation and cleanup

- Browser server: port 4007, with OPENNETWORTH_DB_PATH explicitly set to this folder's isolated.sqlite.
- Build output: `.next-test/assessor-delivery1-signoff`.
- Server stopped and active assessment browser closed after testing.
- Next.js automatically added two generated type paths to tsconfig.json. Only that tool-generated change was reverted from the pre-test copy; tsconfig.json and next-env.d.ts have no remaining diff.
- Ports 4000 and 4005 were not used for test writes.
- Live database hash attempts were blocked by open-file sharing/locking; no whole-vault before/after hash guarantee is claimed.
- No third-party model was installed or evaluated in this delivery recheck.
