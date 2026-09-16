# Daily Events and Ledger — independent assessment

Assessed 16 September 2026. Role: assessor/tester/planner. No application code changed.

## Verdict

The current screen is not ready as the everyday interface for a regular person. The complaint is justified: first-time setup is blocked, some choices do not match what is saved, and the main list hides the information users need. This requires a focused repair and usability pass, not a replacement accounting engine.

The five posting workflows do execute with configured accounts. Exact balances, double-entry balance, repayment treatment, and the tested void work. Passing those backend checks does not establish that an ordinary user can set up and use the product. Prior acceptance of bounded import remediations should not be read as acceptance of this whole experience.

## How this was tested

- Opened the actual `http://localhost:4000/accounting` page; observed empty owner/account context. No transactions were submitted there.
- Read only table counts from the live vault: zero `m1_entities`, `m1_accounts`, and `m1_transactions`; one legacy asset, liability, and profile each. These are separate stores in the current app. This explains why existing assets/liabilities do not populate the newer accounting selectors.
- Started a separate server on port 4005 with a new, named test vault: `samples/daily-events-assessment-2026-09-16/daily_vault.sqlite`. Did not wipe or reuse the existing browser-test vault.
- Exercised the actual browser UI: fresh setup, expense, income, transfer, card repayment, mortgage split, invalid account selection, error correction, void, owner switching, repeated submission, and ledger retrieval with more than 100 records.
- Seeded fictional owners/accounts through the existing API after testing the empty-vault experience. Additional one-cent volume fixtures were seeded through that API, then checked in the UI and SQLite.
- Ran the existing Slice 1C suite: **23/23 passed**. TypeScript: **passed** using `--noEmit --incremental false`. An initial test-runner temp-directory permission failure was resolved by pointing TEMP/TMP at the assessment directory; it was not an app test failure.
- Live SQLite database and WAL SHA-256 hashes were unchanged at the final check. No application code changes were made.

Evidence directory: [daily-events-assessment-2026-09-16](./daily-events-assessment-2026-09-16/). Its fixture manifest, screenshots, API snapshot, verification results, and diagnostic script allow the coder to reproduce the findings.

## Functional findings

### F1 — First-time setup is blocked (P1)

**Reproduction:** Open Accounting with zero accounting entities. Click Record Event: there are no payment accounts and no setup action. Switch to Accounts & Balances → Add Account → enter a name → Create Account. The application returns **`Entity not found with ID:`**. There is no owner-creation control in this flow. The green `Ledger Active` badge remains visible.

This reproduces the state in the user's screenshots. It is not evidence of lost transactions: the newer accounting store is empty. The app exposes a form whose prerequisite users cannot satisfy through that screen.

**Fix:** An explicit first-run card: “Let's set up your finances” → create/select My finances or Household → add an account or import a statement. Default to the configured locale/currency; do not require the user to understand “entity.” Offer Business as an optional context. Make unsupported actions unavailable with a useful next step. Existing users need a reviewed connection/migration path for legacy assets and liabilities; do not silently copy values or create duplicate net worth. Give every item one authoritative balance and a stable link to its corresponding account where applicable.

Source: `AccountManagementView.tsx` initializes an empty selected entity and submits it as `entity_id`; it can select the first entity internally but renders no entity selector or creation flow. `DailyEventsView.tsx` always offers Record Event.

Evidence: `01-empty-record.png`, `02-account-setup-blocked.png`, `live-baseline.json`.

### F2 — Displayed income category differs from the saved category (P1)

**Reproduction:** Record an expense with Groceries. Reopen Record Event and select Income. The category visibly reads **Salary / Wages**. Enter AUD 1,000 and save without changing that category. The transaction posts successfully, but its income account is **Groceries**. Both expanded UI postings and the saved API/database result confirm this.

**Cause:** A single `formCategory` starts as `groceries` and is reused across tabs. Tab clicks change only the transaction type. When that value has no matching income option, the native select displays its first option while the submitted React state remains `groceries`.

**Fix:** Maintain valid category state per type or reset it explicitly on type changes. Displayed, submitted, and persisted values must agree. Validate category role at the domain/API boundary as well, while allowing legitimate user-defined categories of that role. Reset or explicitly preserve a draft when changing owner/type; never silently carry incompatible fields across contexts.

Evidence: `03-income-shows-salary.png`, `04-income-saved-as-groceries.png`, `after-five-flows.json`, `verification-results.json`.

Source: `DailyEventsView.tsx:119`, `:196`, `:208`, `:591`, `:598`, `:750`.

### F3 — A house can pay for groceries (P1)

**Reproduction:** Select the Home property account under “Paid From Account (Bank or Credit Card).” Enter a AUD 10 grocery expense. Save succeeds; property value decreases by AUD 10. This is an ordinary expense form, with no asset-disposal or noncash-adjustment explanation.

**Cause:** The UI calls every asset a bank account (`accounts.filter(a => a.type === 'asset')`). The backend expense guard accepts any asset or liability. The income and repayment source checks are also broad asset checks.

**Fix:** Use explicit eligible payment/deposit account types in the ordinary forms, enforced by the backend too: bank/cash accounts, plus credit cards for purchases. Property, vehicles, investment holdings, income, expense, and equity accounts must not be selectable as everyday payment accounts. An investment cash account can be eligible when explicitly represented as cash. Retain separately defined advanced noncash adjustments; do not remove legitimate accounting capabilities merely to simplify the UI.

**Related:** Transfer dropdowns expose expense, income, and equity accounts. Transferring to Groceries was correctly rejected by the backend, but the UI should never offer this invalid option.

Evidence: `05-property-as-payment.png`. The erroneous fictional property expense was then voided through the UI; property value and expense totals recovered correctly.

Source: `DailyEventsView.tsx:327`, `:823`; `transactionService.ts:630`, `:711`, `:869`, `:954`.

### F4 — Owner context is lost between views (P1)

**Reproduction:** Select B Company in Daily Events and record an expense. Open Accounts & Balances: it shows A Household accounts and totals. It does not display an owner selector identifying this change. Return to Daily Events: A Household is selected again.

**Impact:** A person managing personal and business finances can easily inspect or add an account under the wrong owner. This directly conflicts with the combined personal/business vision.

**Fix:** One visible owner selector shared by Transactions, Accounts, Reports, and Inbox. Preserve it across tabs and reloads; keep draft account selections within that context. If the selected owner becomes unavailable, display a clear choice rather than silently choosing another. A combined view may be read-only for adding entries until an actual owner/account is chosen. Shared ownership and cross-owner transfers still need their existing explicit rules.

Evidence: `06-context-loss-and-balances.png` and Company transaction in the retained test vault.

Source: independent local state in `AccountingPage.tsx`, `DailyEventsView.tsx`, and `AccountManagementView.tsx:37–71`.

### F5 — Older transactions become inaccessible after 100 entries (P1)

**Reproduction:** Company has 102 September transactions. API and UI return 100, with a badge saying “100 entries,” no total count and no Next/Load more control. Two records remain in the database but cannot be reached in that list. Period expense totals include all 102 records.

**Fix:** Stable pagination or Load more, accurate total/loaded count, consistent filters and sort. A simple 50- or 100-row page is sufficient; no infinite-scroll framework is needed. Show a useful empty state for the active filters.

Evidence: `verification-results.json`: database 102, API 100; `volume-ui.txt`: rendered 100. `GET /api/accounting` hard-codes `limit: 100` and supplies no paging controls.

### F6 — Australian “today” defaults to yesterday (P1)

**Reproduction:** At 08:13 on 16 September 2026 in Australia/Sydney, the browser's end date and new-event date defaulted to **15 September**. The live page did the same.

**Cause:** `new Date().toISOString().split('T')[0]` uses UTC rather than the user's calendar date.

**Fix:** Use the local/reporting date consistently for default form dates and presets. Keep financial event dates as date-only strings. Verify Australia/Sydney before 10 a.m., a western timezone, and month boundaries. Do not use browser timezone to reinterpret dates already stored as financial dates.

Source: `DailyEventsView.tsx:105`, `:121`; similar account opening-date defaults need the same review.

### F7 — Balance labels contain misleading facts (P2)

- Accounts shows **Debt: $NaN** for USD where the owner has assets but no USD liabilities.
- It labels the current Everyday balance **A$1,703.00 — As of 2026-08-31**, although that balance includes September postings and the August opening balance was A$1,000.00. It displays `opening_date` underneath a current balance.
- Asset/debt subtotals use hard-coded `$` and `/100`; code inspection shows this is unsuitable for zero-decimal currencies such as JPY. The JPY subtotal issue was not reproduced in this browser run.

**Fix:** Render zero for absent currency totals, use the shared currency formatter, and show the actual balance date. If useful, display “Opened 31 Aug” separately from “Balance as of today.”

Source: `AccountManagementView.tsx:199`, `:200`, `:243`, `:277`. Evidence: `06-context-loss-and-balances.png`.

## What passed

Fictional Household opening balances: Everyday AUD 1,000; Savings AUD 500; Card debt AUD 300; Mortgage debt AUD 200,000; Home AUD 300,000; USD Bank USD 100.

| Browser action | Observed result |
|---|---|
| AUD 22 expense from Everyday | Everyday 978; expenses 22 |
| AUD 1,000 income | Everyday 1,978; income 1,000; **category failed F2** |
| AUD 100 Everyday → Savings | Everyday 1,878; Savings 600; no added income/expense |
| AUD 50 card repayment | Everyday 1,828; card debt 250; no added expense |
| Mortgage: 100 principal + 20 interest + 5 fee | Everyday 1,703; mortgage 199,900; total expenses 47 |
| Invalid property expense, then UI void with reason | Erroneous posting initially accepted; void restored Home 300,000 and expenses 47; void record retained |
| AUD → USD transfer | Rejected; amount and description remained editable |
| Transfer to expense account | Rejected; form remained open |
| Zero and negative expenses | Rejected; corrections possible without losing the form |
| Correct to AUD 5 Company expense and double-click submit | Exactly one transaction; Company balance 495 before volume fixtures |
| Refresh / leave and return | Posted transactions and computed balances persisted |
| Journal integrity on retained fixture | No transaction with nonzero sum of journal entry amounts |

Later volume fixtures added AUD 1.01 of Company expenses: Company balance 493.99; Company expenses 6.01 over 102 September transactions. These fixtures were API-generated, not individually entered through the browser.

## Usability assessment and proposed experience

### Main screen: Transactions

The primary list currently shows date, status, origin, description, “2 legs,” and an icon. **It does not show the transaction amount until the user expands accounting postings.** A person trying to find a purchase cannot scan amounts, accounts, or categories. This is more serious than terminology alone.

Use this basic structure:

```
Transactions                         My finances ▾
Import files                         + Add transaction

This month ▾   All accounts ▾   Search transactions...

Date       Who / What          Category       Account       Amount
16 Sep     Woolworths          Groceries      Everyday      −A$22.00
16 Sep     Employer            Salary         Everyday      +A$1,000.00
16 Sep     Move to savings     Transfer       Everyday → Savings  A$100.00
16 Sep     Mortgage payment    Loan payment   Everyday      −A$125.00
```

Show the real currency and make transfer direction explicit. A transaction should appear once in an owner-wide view; do not sum both sides into spending. An amount in an account-scoped view should reflect that account's movement. Multi-leg payments need a meaningful total and a readable split, not an arbitrary sum of all journal entries (which is zero).

Click a row for merchant, amount, date, account, category, source document, and correction history. Put debit/credit postings under **Accounting details**. Keep full auditability underneath this presentation.

### Entry form

- “What happened?” choices: **Spent money**, **Received money**, **Moved money**, **Paid a credit card**, **Paid a loan**. Buttons may use the shorter conventional labels Expense, Income, Transfer where space is limited.
- Present Amount with currency, Who/What, Date, Account, Category, optional Note. The account and owner must be visible before save.
- Button: **Save expense**, **Save income**, or **Save transfer**. Follow with “Expense saved” and a link to the saved row, including if it falls outside the current date filter.
- A default category is a suggestion; never visually claim one while saving another. Support relevant personal and business categories without exposing a chart of accounts as setup homework.
- For loan payment: **Total paid**, **Loan principal**, **Interest**, optional **Fees**, with a visible computed total and remaining difference. Explain principal as “reduces what you owe.” Accept extracted statement details for review; do not guess an unknown split and silently treat the whole payment as an expense.
- Show “Choose a payment account” plus **Add an account** when none is eligible. An actual load error needs Retry; an empty vault needs Setup; no records in a filtered range needs Clear filters. These are different states.
- Consistent error messages beside the field; preserve a failed submission. Do not expose references such as “supported in Slice 1D” to users.

### Vocabulary changes

| Current | Suggested |
|---|---|
| Sovereign Accounting Engine | Transactions / Your finances |
| Daily Events & Ledger | Transactions |
| Entity | My finances / Household / named business |
| Record Event | Add transaction |
| Post Double-Entry Record | Save expense / Save transaction |
| Card Bill | Credit card payment |
| Loan Split | Loan payment |
| Journal legs | Accounting details (inside details panel) |
| Auditable Void | Remove transaction, with clear balance impact and retained history |
| Reports & Traceability | Reports; source/history inside each detail |

Do not label the existing accrual summary “Money in / Money out” without changing its calculation. For example, loan principal and card repayments affect cash but are not expenses. Either retain accurate Income/Expenses labels with plain explanations or supply an actual account-movement cash summary with clear transfer treatment.

### Accessibility and layout

The tested form has no dialog role; Escape did not close it. The examined inputs/selects had no associated labels. Close buttons lack accessible names. Use a named dialog, connected labels, sensible initial focus, keyboard containment/return, and a safe close/cancel behavior. Verify those interactions rather than relying only on visual text.

Desktop layout is reasonably consistent and the five workflows are discoverable once setup exists. Keep that usable structure. Reduce repeated technical explanations and expose amounts immediately. Do not spend this repair cycle rebuilding the theme or all sidebar pages.

Responsive testing was attempted at 390×844, but the browser viewport override did not apply; it remained 1280×720. **Mobile acceptance is therefore unverified**, not a confirmed mobile failure. The coder should verify narrow layouts, scrolling, and the open loan form before acceptance.

## Fit with the personal ERP / AI finance-manager vision

The accountant-quality ledger is the foundation; the visible product should organise a person's money, accounts, documents and decisions. It should not ask every person to become a bookkeeper.

Make import and review prominent beside manual entry: **Bring files → review suggested transactions → resolve uncertainty → save/link → see balances**. The assistant should use the same drafts, account eligibility, validation and posting services as the forms. It can suggest the owner/account/category, explain where a number came from, and ask about missing facts. Deterministic services calculate and post. No new orchestration framework, model migration, or knowledge database is required to fix the findings above.

Personal and business contexts must remain visibly distinct while supporting an overall overview with existing ownership rules. Do not solve the confusing UI by merging business funds into personal accounts or counting company assets twice.

## Bounded next work

1. **Repair first-run setup and correctness:** F1–F4, F6. Add regression tests at the UI/domain boundary, not just direct function calls. Include existing-vault mapping rules without undertaking a complete legacy rewrite.
2. **Make transactions usable:** visible amounts/accounts/categories, shared owner context, F5 pagination, plain-language forms, F7 balance labels, keyboard basics. Keep existing posting and evidence services.
3. **Reassess the complete journey and proceed:** empty vault → setup → five flows → correct one mistake → change owner → import/review → reload → retrieve older records. Sign off this bounded slice when those checks pass, then continue the assistant work. Do not hold progress for unrelated OCR, investment/tax features, or a full redesign of the rest of the app.

## Limits of this assessment

This is a focused desktop acceptance assessment of Daily Events and its account setup/context dependencies. It is not a tax/compliance audit or a complete re-test of every app feature. The full repository test suite was not rerun; the reported automated result is specifically the 23-test Daily Events suite. Screen-reader output, actual mobile layout, network-failure injection, and exhaustive date-picker interactions remain unverified. Browser date fills did not reliably persist on refresh, so no separate date-picker defect is asserted without reproducing it using native keyboard/picker interaction. The UTC default-date defect is independently confirmed by code and the local clock.
