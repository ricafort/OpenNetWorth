# Independent assessment — plain-language finance workspace

Assessed 16 September 2026. Verdict: **useful improvement, partial acceptance; not whole-app sign-off**.

The standard transaction and starter-import paths work. The simplified header and tabs are clearer. However, independently reproduced draft corruption and incomplete backups must be fixed before treating the app as a dependable financial record. Several older pages also show misleading empty finances because they are disconnected from the new accounting records.

This is an assessment of the current working tree, including existing integration gaps. It does not establish that every finding was introduced by the wording changes.

## Method and safety

- Browser testing against a separate app on port 4007 with a newly created synthetic database at `samples/plain-language-assessment-2026-09-17/isolated.sqlite`.
- API checks against that same isolated app; focused source inspection to explain reproduced behavior.
- No application implementation changes. The test server was stopped. Next.js-generated configuration additions were restored to their pre-assessment versions.
- The live database, WAL and SHM SHA-256 hashes were identical before and after the assessment. Ports 4000 and 4005 were left alone.
- The evidence directory was inadvertently named 2026-09-17; the actual assessment date is 2026-09-16.
- Initial test-environment temp-directory permissions and an assessor build-directory/Tailwind scanning conflict were resolved locally. Those are not counted as application failures.

## Verification results

| Area | Method | Result |
|---|---|---|
| Existing automated suite | Vitest | 219/219 tests, 21 files passed |
| Type checking | `npx tsc --noEmit --incremental false` | Passed |
| New user and combined personal/business setup | Browser | Setup completed; reporting currency defaulted to USD without a visible onboarding currency choice |
| Quick account creation within an expense | Browser | Owner and currency selectable; account saved and selected; transaction amount, merchant and note preserved |
| Expense, income, transfer, card repayment, loan principal/interest/fee | Browser plus API balance checks | All five posted with the expected exact amounts |
| Account creation with opening balance | Browser | AUD 100.12 appeared immediately |
| Void a test expense | Browser plus API | AUD 22 expense marked void; original postings retained; bank balance rose by AUD 22 |
| Household starter CSV | Browser mapping/review/approval | Three purchases, expenses AUD 116.88, account AUD 1,000.00 → AUD 883.12 |
| PDF receipt linked to existing CSV purchase | Browser | Linked to AUD 22 transaction without another financial posting |
| Evidence drilldown | Browser and raw-file API | Both CSV and PDF citations available; original content delivered correctly |
| Exact CSV/PDF reimport | API | Retained approved/linked records; no additional financial transactions |
| Company starter CSV | API | Company AUD 500.00 → AUD 390.00; household unchanged |
| Invalid date/amount, duplicate/overlap decision, approval bypass | API | Expected rejection/blocking behavior |
| Australian date mapping, formula-like text, JPY CSV scale | API | Tested cases correct |
| Unpaid sample invoice | API | Approval blocked by unresolved findings; this does not prove every unpaid invoice is recognized correctly |
| Property used as manual payment account, cross-owner transfer | API | Rejected |
| Transaction pagination | API | 18 transactions retrieved once each in small pages |
| Valuation and ownership allocation | Browser | AUD 300,000 → 310,000 valuation saved; no operating expense/income increase; 50/50 ownership saved after explicit complete allocation |
| Dated FX input | Browser | Fictional USD→AUD 1.5 rate saved; absent JPY rate kept consolidation incomplete |
| Draft persistence | Browser restart/reload | Drafts persisted and did not affect posted balances |
| Draft financial facts | Browser and API before/after | **Failed: currency mismatch, JPY amount changed, source reference lost** |
| Complete accounting backup | API payload and export implementation | **Failed: new accounting/documents absent** |
| All sidebar destinations | Browser | Routes loaded; several financial pages read different data |
| Goals | Browser | Synthetic emergency-fund goal saved |
| AI assistant access to transactions | Browser | Assistant could not access recorded spending; reported legacy zero snapshot and disclosed its limitation |
| Filtered empty state | Browser | **Failed: an empty historical range showed first-time statement onboarding** |

The additional API checklist contains 20 passing checks and one failed backup-inclusion check. This count is separate from the browser findings and is not a whole-app success rate. The existing `transaction_entry_ux.test.ts` exercises services, not the actual React form interactions; those tests did not catch the draft editing defect.

### Financial control example

Before the final void test, the five manually entered transactions produced:

- Everyday account: AUD 703.00.
- Savings: AUD 600.00, from AUD 500.00 plus a transfer of AUD 100.00.
- Credit card owed: AUD 250.00, from AUD 300.00 less AUD 50.00 repayment.
- Mortgage owed: AUD 199,900.00, from AUD 200,000.00 less AUD 100.00 principal.
- Period income AUD 1,000.00; expenses AUD 47.00 = purchase 22 + interest 20 + fee 5.

Transfer, card repayment and mortgage principal did not inflate expenses. Finally voiding the AUD 22 manual purchase restored the Everyday account to AUD 725.00. The separate starter-import account stayed AUD 883.12.

## Findings and bounded solutions

### P1 — Backup does not protect the main accounting workspace

The full `/api/vault` response contains legacy assets, liabilities, goals, recurring/history/cash-flow data, settings, profile and drafts. It omits the new owners, accounts, transactions, postings, ownership allocations, valuations/FX data and document/evidence records needed to reconstruct the workspace.

The actual UI exporter in `src/infrastructure/local_driver.ts:486` similarly builds a legacy archive. Its drafts come from the old browser-cache key, rather than the current draft service. Clicking Export Backup updated the UI timestamp, but the browser tool did not deliver a downloadable artifact for inspection. The omission is established by the API payload and the export implementation, not by claiming a downloaded archive was inspected.

**Impact:** a user can believe the vault is protected while the archive cannot reconstruct their accounts, transactions and supporting files on a new installation.

**Fix:** extend the existing backup/restore path to one versioned authoritative snapshot including all relevant accounting and document data. Read the current SQLite state, validate references, and restore atomically. Retain support for older archives. No new backup framework is required.

**Acceptance:** export the synthetic populated vault, restore into a fresh isolated database, and compare owners, accounts, posted/void records, postings, drafts and source IDs, ownership, valuations, FX, evidence and original-file hashes. A deliberately invalid archive must fail without partially changing the destination.

### P1 — Personally paid business drafts change financial facts

**Reproduction A:** a business with USD reporting currency, an AUD regular expense account and a JPY personal payment account were selected in the draft flow. Entering 500 saved `currency: USD, amount_cents: 50000` while the selected personal payment account was JPY and the regular form label showed AUD.

**Reproduction B:** seeded a valid JPY 500 draft with a source-transaction reference, opened it in the actual UI, and saved without changing its amount. The form displayed 5.00; the saved draft became JPY 5 and `source_transaction_id` became null. A second, ordinary payment-account field also had to be completed even though the draft's personal payment account was already selected.

Relevant locations:

- `DailyEventsView.tsx:420–439`: save payload uses separate draft currency and omits source references.
- `DailyEventsView.tsx:478`: amount display always divides by 100.
- `DailyEventsView.tsx:1575`: selecting a business sets transaction currency from that business's reporting currency.
- `draftService.ts:79–96`: omitted source references overwrite existing values with null.

The personal payment selector also offers non-payment accounts such as property, loan, income and equity accounts.

**Fix:** use one payment-account selection for this flow and derive its currency visibly from that account. Format/parse with the existing currency-decimal registry. Preserve unknown facts and untouched source references. The backend must validate the chosen account's owner, eligibility and currency. An incomplete draft can remain incomplete; a supplied contradictory combination must not be silently accepted.

**Acceptance:** JPY 500 and AUD 12.34 survive open/save/reload unchanged; choosing a USD-reporting business never relabels a JPY payment; both source IDs survive edits; selecting property/equity/income accounts is impossible; drafts remain excluded from posted balances.

### P1 — Different sections tell contradictory financial stories

With the new accounting records populated:

- Assets said no assets and zero total despite bank accounts and a property.
- Liabilities said no liabilities despite mortgage and credit-card debt.
- Cash Flow showed zero despite the recorded income and spending.
- Freedom displayed **“You are Debt Free!”** despite AUD 200,150 of mortgage/card debt at that point.
- The Privacy wealth preview showed zero assets/liabilities/net worth.
- The AI assistant disclosed that it had only a zero-valued snapshot and no transaction records when asked for spending on 16 September.

This is an existing product integration gap, not merely bad wording. Changing the sidebar subtitles makes these destinations sound unified, but does not connect their records.

**Immediate fix:** stop presenting disconnected data as an authoritative zero. Clearly label an unconnected feature and route users to the supported Accounts/Reports views where appropriate.

**Next bounded task:** reuse existing accounting read services to feed these views and the assistant. Define ownership, reporting period and currency scope once. The assistant should query deterministic totals and cite transactions; it should not calculate balances from prose. Avoid a second manual copy of the same bank account/property/debt. Preserve legitimate legacy data through an explicit migration/reconciliation approach before retiring it.

**Acceptance:** one known mortgage, one bank balance and one expense agree across Accounts, relevant summaries, debt payoff and assistant answers. Missing data is shown as unavailable, not debt-free. Mixed currencies are not blindly summed.

### P2 — Plain-language acceptance is incomplete

The new header, tabs, account labels and collapsed accounting details are improvements. However:

- The promised **This Month** and **All Time** controls were absent in the tested UI/source.
- A January 2001 filter with existing transactions elsewhere showed “Start with a bank statement,” instead of “No transactions in this date range.” The API count is already date-filtered, so it cannot identify a true first-time user.
- Reports still show “Sovereign Currency,” “commingling sovereign entities,” “Accounting Scope,” and “Cash Flow vs Accrual Performance.”
- Import/review screens expose “Slice 1E,” “RFC4180,” “OpenTax-AU,” “atomic ledger entries,” and raw technical identifiers in everyday flows.
- The success message says “double-entry postings committed.” Draft notes mention “Owner's Draw / Due To.”
- The void dialog starts with immutable double-entry explanations instead of explaining the user's consequence.
- Missing FX rates display **`[object Object]`**.
- The ownership helper says the total may be at most 100%, while the tested explicit-allocation save requires exactly 100%.

**Fix:** finish a small copy pass through the actual task paths, including modals, warnings, success messages and errors. Preserve precise accounting labels inside optional details.

| Existing wording | Suggested wording |
|---|---|
| Sovereign Currency | Currency |
| Accounting Scope | Whose finances? |
| Accrual income recognized in period | Income for this period, with a short explanation where timing matters |
| Ledger Drill-Down & Evidence | Transactions and supporting documents |
| Double-entry postings committed | Transaction saved |
| Auditable Transaction Void | Cancel this transaction |
| Reason for Void | Why are you cancelling it? |
| Cross-entity automation / Due To | This business expense is saved as a draft. It has not changed your balances. |
| Import bank statement | Import bank statement (CSV), until other formats are supported |

Use “money received” only for actual cash-flow figures; it must not replace earned income indiscriminately. The current CSV import capability should be clear before a user chooses a PDF statement.

### P2 — Modal focus and defaults need a small usability follow-up

Returning from quick account creation preserved the transaction fields, but focus returned to the page rather than the relevant form control. Source inspection shows a stored reference to a button that is removed during the alternate view. Modal semantics/associated labels also need attention.

Onboarding silently used USD. For an Australian user, make the reporting currency an explicit, easy-to-change preference. Do not restrict foreign-currency accounts or assume every owner uses the same currency.

**Acceptance:** keyboard users can enter, leave and resume account creation without losing focus or values; labels identify inputs; a clearly visible reporting-currency choice is available.

## Recommended order

1. Fix draft fact preservation and complete backup/restore coverage. These are small, concrete trust blockers.
2. Remove false zero/debt-free claims from disconnected screens. This can be done before full integration.
3. Finish the remaining copy, date controls, filtered empty state, FX error and focus behavior.
4. Connect one shared financial read path at a time, starting with balances/debts and the assistant's transaction lookup.
5. Resume cross-owner posting automation only after drafts preserve their inputs reliably.

No new orchestration framework, broad redesign, or accounting-engine rewrite is needed for these fixes.

## Coverage limits

This was broad functional assessment, not proof that every possible feature or input works. The full 119-record quarter was not completed through the browser in this run. Fresh-vault restore, investment buy/sell workflows, every legacy edit/delete path, scanned/OCR PDFs, arbitrary spreadsheets, production build, mobile layouts, all keyboard/screen-reader behavior, high-volume performance and real bank integrations were not independently accepted. The development server used a fallback font when Google Fonts was unavailable.

The assistant's answer was inspected for its data access, not as a comprehensive evaluation of model quality or a certification that inference is local.

## Evidence

Evidence lives in `samples/plain-language-assessment-2026-09-17/`:

- `vitest.log`, `tsc.log`
- `five-flows.json`, `after-void.json`
- `api-results.json`, `api-checks.cjs`
- `draft-currency-mismatch.json`, `draft-before-edit.json`, `draft-after-edit.json`, `jpy-draft-edit.png`
- `receipt-linked.txt`, `evidence-two-sources.txt`
- `vault-export.json`, `privacy-backup-screen.txt`
- `page-assets.txt`, `page-liabilities.txt`, `page-cashflow.txt`, `page-freedom.txt`, `page-mentors.txt`
- `filtered-empty-confirmed.txt`, `reports-everything.txt`
- `live-hashes-before.json`, `live-hashes-after.json`

Some early navigation snapshots (`page-cash.txt`, `page-growth.txt`, `page-privacy.txt`, `filtered-empty.txt`) captured stale intermediate state and are superseded by the explicitly named evidence above. They were not used as proof of the findings.
