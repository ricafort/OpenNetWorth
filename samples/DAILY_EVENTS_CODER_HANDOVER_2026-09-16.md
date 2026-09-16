# Coder handover — Everyday Transactions repair

Please implement a bounded repair/usability slice before calling Daily Events ready for regular users. Keep the existing ledger, exact currency calculations, evidence links, idempotency and correction history. No engine rewrite is requested.

Read `samples/DAILY_EVENTS_ASSESSMENT_2026-09-16.md`. Reproduction evidence and a retained isolated vault are in `samples/daily-events-assessment-2026-09-16/`. The live vault must remain untouched during automated and browser acceptance tests.

## 1. Unblock setup

- With no accounting owner, show “Set up your finances” and a short owner/account flow. Offer My finances/Household and optional Business; do not make “entity” an accounting prerequisite users must understand.
- With an owner but no eligible payment account, show Add account / Import statement instead of an unusable Record Event form.
- Distinguish empty, loading, failure, and filtered-no-results states; support Retry on failure.
- Provide an explicit reviewed mapping path for existing legacy assets/liabilities. Preserve originals and avoid duplicate balances; do not silently create a second independent representation of the same money/property/debt.
- Use the user's configured currency; Australian setup must not silently default to USD.

## 2. Correct form state and allowed account choices

- Fix Expense → Income showing Salary while saving Groceries. Maintain valid category state per type or explicitly reset on type changes. The displayed selection, payload and saved category must agree.
- Enforce category role and payment/deposit account eligibility in the API/domain as well as UI. Ordinary expenses may use suitable bank/cash accounts or credit cards. Property and other noncash asset holdings are not bank accounts.
- Transfer dropdowns must not offer income, expense or equity accounts that the service will reject. Keep explicit cross-owner/currency restrictions until an appropriate supported workflow exists.
- Revalidate account, destination, category and currency when type or owner changes. Do not silently carry incompatible drafts between Household and Company. Preserve data after genuine submission failures.
- Fix UTC-derived “today”: on 16 September at 8 a.m. Sydney time the form currently defaults to 15 September.

## 3. Keep the owner visible and consistent

- Share one selected owner across Transactions, Accounts, Reports and Inbox. Accounts currently silently opens the first owner and has no owner selector.
- Retain owner/filter context when switching views and refreshing. Discard stale fetch responses when context changes.
- A saved transaction/account belongs to the visible intended owner. A combined overview must still require a concrete owner/account for posting.

## 4. Present a normal transaction list

- Rename Daily Events & Ledger to Transactions and Record Event to Add transaction.
- Show Date, Who/What, Category, Account, Amount with currency, and useful review/document status. Show transfers once with direction and loan payments with total and readable split.
- Put debit/credit entries and journal terminology inside optional Accounting details. Keep underlying auditability.
- Add simple search, account filter, date presets and Clear filters.
- Add stable pagination or Load more, with accurate loaded/total count. A test with 102 records currently shows only 100 and hides the rest permanently.
- Use clear form actions: Save expense, Save income, Save transfer, Credit card payment, Loan payment. Remove milestone names and implementation claims from user-facing copy.
- Keep Import files prominent beside Add transaction so manual typing is not the primary long-term workflow.

## 5. Finish basic balance and interaction clarity

- No `$NaN` for a currency with no liabilities; render a correctly formatted zero.
- Format all currency subtotals with the existing currency utility, including JPY scale. Do not hard-code dollars or division by 100.
- Show the true balance date, not the opening date under a balance containing later transactions.
- For loan payments show principal, interest, fee and computed total; explain principal as reducing the debt. Do not invent unknown splits.
- Keep summary labels faithful to calculations. Accrual income minus expenses is not bank cash movement.
- Show a clear saved-result link even when the entry is outside the current filter. Offer understandable correction/removal backed by existing history.
- Add dialog semantics, associated labels, named icon buttons, Escape/cancel, focus handling and narrow-screen scrolling. Retain input on errors.

## Acceptance — demonstrate through the real UI

Use a fresh isolated database on a non-live port. Do not rely only on seeded accounts or backend passing tests.

1. Empty vault → create owner → add AUD checking account with opening balance → save first expense. No developer script needed for setup.
2. Expense Groceries → Income with displayed Salary → save → verify Salary in the persisted transaction and reports. Repeat reverse transition and explicit category changes.
3. Home/property is absent from ordinary payment/deposit selectors and rejected by direct API submission. Ineligible transfer categories cannot be selected; backend guards still reject them.
4. Household ↔ Company → Accounts ↔ Transactions ↔ Reports/Inbox → reload: context stays explicit and consistent, with no cross-owner draft posting.
5. Sydney local morning and month boundary default to the correct local date. Validate date ranges and explain records outside the active filter.
6. Repeat the five-flow calculation: AUD 1,000 bank + 1,000 income − 22 expense − 100 transfer − 50 card repayment − (100 principal + 20 interest + 5 fee) = AUD 1,703 bank. Savings 600, card debt 250, mortgage debt 199,900, income 1,000, expenses 47. No double-counted repayments.
7. Zero/negative amounts and mismatched currencies reject safely. Fix the input and retry; double-click creates one transaction. Correct/remove a test mistake and verify balances/history.
8. With at least 102 matching transactions, reach every transaction via paging/search; counts and period totals agree with the same filters.
9. Show amounts on collapsed rows, meaningful account/currency labels, correct balance dates, and zero rather than NaN for missing currency buckets. Verify JPY formatting.
10. Complete the main form by keyboard; test desktop and a verified narrow viewport. Inspect the final stored data and reload the page.

Add focused automated regressions for the reproduced defects and retain relevant existing tests. Report actual pass/fail/untested results with screenshots and balance assertions. A passing direct-domain suite alone is insufficient: the assessor reproduced UI failures while all 23 Daily Events tests and TypeScript passed.

## Scope boundary / next step

Implement this as two reviewable batches if helpful: (A) setup, state, eligibility and context correctness; (B) transaction presentation, retrieval and interaction clarity. These are parts of the same bounded repair, not new architecture milestones.

Do not rebuild unrelated sidebar pages or expand this repair into OCR, tax engines, new orchestration frameworks or a full legacy rewrite. Those remain part of the broader roadmap as appropriate. After the acceptance journey passes, proceed with the bounded assistant work using these same transaction/draft/validation services.
