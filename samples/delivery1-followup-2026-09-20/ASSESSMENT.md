# Delivery 1 follow-up acceptance — 20 September 2026

Decision: F1 and F2 are accepted. Close the Delivery 1 remediation cycle and proceed to the next bounded delivery. Earlier limitations outside Delivery 1 remain tracked; this is not whole-product certification.

## Fresh verification

- Repository tests: 260/260 passed across 25 files (`tests.log`).
- TypeScript: `npx tsc --noEmit --incremental false`, exit 0 (`types.log`).
- Inspected currency-detachment, account-remapping and nullable-balance handling in UpdateBalancesModal.tsx.
- Browser checks ran against localhost:4007 with the existing assessor synthetic vault at samples/delivery1-signoff-2026-09-20/isolated.sqlite.
- The 25 prior acceptance probes were not rerun in this follow-up; their passing result belongs to the preceding assessment.

## F1: Currency and account changes — PASS

1. Pasted `Assessor Super, AUD 130000, 2026-09-20, Current`.
2. Correct initial delta: AUD +5,000 against the fixture's AUD 125,000 balance.
3. Changed proposal currency to JPY. The AUD account detached and delta became an em dash.
4. Selected Tokyo Savings (JPY), whose known balance is JPY 150,000.
5. Delta became JPY -20,000 for the proposed JPY 130,000 balance.

Code also resets account revision on detachment and derives revision and prior balance from the newly selected account.

## F2: Unknown versus recorded zero — PASS

1. Manual Fast Entry displayed Awaiting Balance as `Needs balance`.
2. Entered 100: prior balance stayed unknown; delta stayed an em dash.
3. Household Assessor Everyday has a known ledger balance of zero and correctly displayed $0.00.
4. Entered 100 on that known-zero account: delta correctly showed +$100.00.

All entered drafts were cancelled. No new balance observations or transactions were saved during this browser check.

## Coder handover

F1 and F2 have passed independent code inspection and browser acceptance. Delivery 1's agreed remediation work is closed. Keep the accepted regression protections and proceed with the next scoped plan. Do not reopen Delivery 1 to introduce new frameworks or models; any local extraction enhancement should have its own bounded acceptance criteria and continue using the validated review/save path.

## Cleanup and scope

The isolated test server was stopped and the active assessment tab closed. Next.js automatically added two generated type include paths; those additions were reverted from the pre-run tsconfig copy. No remaining tsconfig.json or next-env.d.ts diff. No application implementation changes, live-vault test writes, production build, or new model installation were performed.
