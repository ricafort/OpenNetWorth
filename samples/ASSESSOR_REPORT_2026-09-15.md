# Australian sample imports — independent assessment, 15 September 2026

**Verdict: request focused remediation before accepting the import/review/evidence workflow.** The ledger arithmetic and several safety guards work. The browser-tool outage reported by the coder is not an application blocker: the assessor completed real browser imports, approvals, receipt links, reimports, corrections and report navigation on port 4005. No new framework or broad feature expansion is needed to fix the current defects.

Repository HEAD: `f39fecec53fc46832dadeafeeb7b3e21a5acb351`, plus the current uncommitted coder changes. This assessment applies to that working tree, not HEAD alone. No application source code was changed by the assessor.

## Environment and evidence

- Browser: actual running application at http://localhost:4005/accounting.
- Database: existing `D:\LocalVersions\OpenNetWorth\data\test_browser_vault.sqlite`. API entity/account IDs matched a read-only inspection of that database before writes.
- The existing test database was not reset. The coder's earlier three purchases in Fictional Family Trust remain separate from the correctly tested Household and Company entities.
- Additional service probes used fresh in-memory databases and the real PDF extraction adapter, not mocked receipt contents.
- Final SHA-256 comparisons confirmed the live `data/opennetworth.sqlite` and its WAL file were unchanged. Read-only final checks confirmed Household 88,312 cents and Company 39,000 cents in the test database. See `assessment-evidence-2026-09-15/final_verification.json`.
- Existing regression suite: **200/200 tests passed across 18 files**. TypeScript: `npx tsc --noEmit --incremental false` passed.
- Initial Vitest startup failed because the default temporary folder was inaccessible in the sandbox. Setting TEMP/TMP to the assessor's writable evidence directory resolved the environment issue; all tests then ran. This was not an application test failure.
- Raw observations and screenshots are in `samples/assessment-evidence-2026-09-15`. Probe results marked OBSERVED require the interpretations below; they are not all passing acceptance tests.

## Corrections to the coder's initial report

1. The original starter scenario was **not a pass**: it posted to the wrong entity/account and did not reach the required AUD 883.12 household balance. The AUD 116.88 arithmetic check was valid, but narrower than the acceptance criterion.
2. The handover did not require UI-only testing. It explicitly allowed API/service checks alongside UI coverage. Backend work could have continued during the browser-subagent outage, with browser scenarios labelled blocked.
3. The correct expected unpaid-invoice result is supplier Waratah Office Supplies, AUD 330.00, dated 20 September 2025, unpaid. “Currency DUE and synthetic supplier” describes a known defect, not desired behaviour.
4. A passing bank closing balance does not prove correct income/expense classification or usable source evidence.

## Independent test matrix

| Scenario | Coverage | Result and limits |
|---|---|---|
| Correct household starter CSV | UI approval + database + report UI | **PASS**: three purchases, office supplies 3,700 cents, utilities 7,988 cents, expenses 11,688 cents, bank 88,312 cents |
| Household paid receipt extraction | Real PDF through UI | **PASS** for supplier, date, AUD and 2,200 cents |
| Household receipt account selection | UI + stored proposal inspection | **FAIL**: selection made after extraction was lost; initially no household match. Correcting through Edit recovered the link, but proposal entity remained Company |
| Household receipt link | UI after correction + fresh service probe | **PASS for financial effect**: existing purchase linked, no new purchase/postings; household balance remains AUD 883.12 |
| Company CSV and paid receipt link | UI + database | **PASS**: one AUD 110 purchase, receipt linked, company balance AUD 390.00; household balance unchanged |
| Household/company financial separation | Scoped report UI + database + adversarial service test | **PASS for posted amounts**: correct scoped totals; mismatched entity/account posting rejected atomically. Proposal metadata and UI context have defects described below |
| Page reload persistence | UI + database | **PASS**: purchases, links and correct balances survived reload. Process-restart/backup-restore persistence was not retested in this pass |
| Exact-file reimport | Company CSV/PDF through UI; household through service | **PASS for no duplicate financial effects**: posted/linked records retained; reimported company rows cannot be approved again in the UI |
| Approval retry after receipt enrichment | Service | **FAIL for harmless retry**: re-approving the original CSV after adding receipt evidence throws an idempotency conflict. Existing money and evidence are preserved |
| Linked receipt standalone approval | Service | **PASS**: rejected; no financial mutation |
| Evidence from bank transaction | UI + HTTP drilldown response | **FAIL**: modal displays document ID N/A and hash N/A although two references are stored; it only selects the first reference |
| Full-quarter primary bank files | Service ingestion and deliberately naive approval in fresh memory database | **PASS for all 119 dates/amounts and five closing balances; FAIL as complete bookkeeping**: transfers, repayments and net remittances remain generic income/expense. Not a full-quarter UI acceptance pass |
| Alternative debit/credit layout | Service | **PASS**: 62 rows parsed; all 62 detected as matching existing everyday-account entries |
| Invalid/missing dates | UI and service | **PASS for blocking initial approval; FAIL for correction recovery and presentation**: proposal dates become 1970-01-01; valid correction retains stale INVALID_DATE error |
| Malformed amounts | Service | **PASS for blocking all three malformed values; FAIL for correction recovery**: valid amount correction retains INVALID_AMOUNT error |
| Ambiguous Australian dates | Service | **PASS with explicit DD/MM/YYYY mapping**. No claim that date convention can safely be guessed |
| JPY precision | Service through posting | **PASS**: JPY 500 outflow posts exactly -500 minor units |
| Formula-like description | Service through posting | **PASS as literal transaction text**. Spreadsheet-export formula escaping was not tested |
| Same-file duplicate rows | Service | **PARTIAL**: duplicate warning detected; both rows can still be posted by ordinary approval |
| Legitimate same-day/same-value purchases | Service | **PASS for preserving both** with a warning. These must not be automatically deleted solely because they look alike |
| Partial overlap with starter | UI + separate service test | **FAIL for safe default**: both Ledger Match rows selected automatically. Service approval adds two purchases and AUD 37 again. Browser duplicate rows were left unapproved |
| Incoming AUD 22 versus expense receipt | Actual fixture through service | **PASS**: zero candidates; forced wrong-direction link rejected without financial changes |
| Mixed valid/invalid approval batch | Service | **PASS**: whole batch rolls back, including earlier valid row |
| Unpaid AUD 330 invoice extraction | UI and real adapter | **FAIL extraction**: supplier is banner text and currency is DUE |
| Unpaid-invoice posting guard | UI + service | **PASS for explicit confirmation requirement**: unconfirmed UI approval rejected; invalid currency rejected by backend; after correcting AUD, absent payment confirmation still rejected. Explicitly asserting payment allows posting; that is not proof the document was paid |
| Bank/card/property/mortgage statement PDFs | All four through real adapter/service; bank statement also UI | **UNSUPPORTED, safely blocked from posting**. UI misleadingly displays today's date and 0.00 as extracted facts for unresolved documents |
| XLSX, amortisation/property/invoice-register tables | Current UI/code capability inspection | **UNSUPPORTED as dedicated imports**. No native XLSX import exists; these reference tables were not forced through a bank parser. They remain future fixtures |

## Focused fixes, solutions and acceptance checks

### A. Preserve the selected account and its entity — high priority

Reproduction: import the AUD 22 receipt. Extraction immediately uses the default Company account. Change Paid from Account to the household account and open the review table. The table still shows Business Operating and matching initially finds zero household transactions.

Cause: `PdfImportModal.tsx:97` submits account/entity during file selection, but `:122` proceeds using only document ID; `:258` changes local state without saving the proposal. `updateProposalReview` updates account_id but not entity_id. After the UI recovery, the linked household receipt still carries the Company entity ID in SQLite.

Solution: keep one authoritative reviewed account selection. Either select the account before extraction, or persist the changed selection through the existing review service before proceeding. Derive entity from that account atomically. Display entity name + account name + currency in selectors; avoid indistinguishable Everyday Checking entries. Preserve entity context between accounting tabs or visibly require reselection.

Acceptance: Company may sort first, yet selecting Household produces household proposal entity/account IDs, immediately finds the correct purchase, and stays correct after reload/reimport. Attempted entity/account mismatches remain rejected. No new orchestration framework is needed.

### B. Make evidence actually usable — high priority

Reproduction: Reports & Traceability → Household → Ledger Drill-Down → Everyday Checking → paper purchase → Evidence. Modal shows document ID N/A and hash N/A.

Cause: `balanceService.ts:1482` parses the outer evidence array but its elements remain serialized JSON strings. `ReportsTraceabilityView.tsx:1115` selects only the first item, then `:1170` accesses it as an object. The HTTP response contains both the original CSV and linked PDF references.

Solution: normalize supported legacy strings and structured references once at the service/API boundary; render every reference, not only element zero. Preserve source row/page context when mapping extraction evidence to ledger evidence. Provide a working way to inspect/open the retained source by document ID; a small read-only original-file endpoint/view is sufficient if none exists. A PDF canvas framework is unnecessary.

Acceptance: the same purchase exposes both CSV Row 2 and its receipt, with real document IDs/hashes and access to the correct retained source. Opening evidence adds no postings. Malformed legacy evidence should show an explicit unavailable message rather than an empty success modal.

### C. Make review corrections complete — high priority

Reproduction: import invalid_dates.csv; edit Impossible date to 2025-07-03; save. The success message appears and the date changes, but the old error keeps the row disabled. The same happens to corrected malformed amounts in the service test.

Cause: `documentInboxService.ts:926` clears currency errors only. `:351` substitutes 1970-01-01 for missing dates. The UI also rewrites descriptions to `${supplier} purchase` (`ProposalReviewTable.tsx:162`) and excludes modified proposals from Pending (`:280`).

Solution: revalidate the corrected fields and recompute their active findings. Keep original source values/evidence separately; do not clear unrelated errors blindly. Display Unknown/Needs review for unresolved dates and amounts rather than 1970/today/zero as facts. Include modified-but-unposted rows in the actionable review queue. Preserve description unless the user changes it.

Acceptance: correcting one valid date/amount removes only its resolved error and enables ordinary approval when all remaining fields are valid. The row remains discoverable in Pending until posted/linked/rejected. A category/account-only correction leaves the description intact.

### D. Require an explicit duplicate decision — high priority

Reproduction: after the starter, import overlap_with_starter.csv to the same account. The UI marks both rows Ledger Match but preselects both. The isolated service test approves both and moves the starter bank from AUD 883.12 to AUD 846.12.

Solution: do not preselect possible duplicates in ordinary bulk approval. Offer a simple decision: existing transaction/skip, or confirmed separate transaction. Preserve legitimate same-value purchases. Carry the decision to backend approval so a missing decision cannot be bypassed by bulk/API submission. Reuse existing statuses/link mechanisms where appropriate; no fuzzy-matching platform is required. Replace the absolute “$0 Double Counting” guarantee with wording that reflects actual protection.

Acceptance: partial overlap and alternative exports do not add money by default; a deliberate separate-purchase decision can preserve both legitimate AUD 8.50 purchases. Retrying an already-approved CSV after a receipt was attached returns the existing financial result without conflicting or deleting the added evidence. Changed financial details must still conflict.

### E. Validate currency and supplier extraction — focused follow-up

`openTaxAdapter.ts:187` casts arbitrary extractor text to CurrencyCode without checking membership. The unpaid sample consistently returns DUE and banner text.

Solution: validate returned codes against supported currencies, preserve uncertainty as unresolved, and prefer explicit supported currency declarations from the source where appropriate. Improve supplier selection to avoid the synthetic banner. Keep the original failing fixture. Retain the existing separate payment-confirmation guard; extraction alone does not establish payment.

Acceptance: sample extracts Waratah Office Supplies and AUD 330.00, or explicitly reports unresolved facts; never treats DUE as a valid currency. Merely correcting currency must not mark the invoice paid or create a bank posting.

## Full-quarter capability findings and sensible sequencing

The deliberate naive full-quarter approval test is an illustration of the missing accounting workflow, not an endorsed import strategy:

| Household measure | Fixture's properly classified target | Generic income/expense approval |
|---|---:|---:|
| Income | AUD 40,994.00 | AUD 44,856.70 |
| Expenses | AUD 23,622.17 | AUD 30,693.39 |

All five bank closing balances nevertheless match. These are synthetic gross-cash fixture controls, not statutory tax/P&L advice. The test assigned generic categories deliberately; changing category names alone cannot split mortgage principal or pair transfers.

The existing ledger already has transfer, card-repayment and loan-repayment helpers. A later import-classification slice should connect reviewed proposals to those existing deterministic services. Start with same-currency transfers and card repayments, then loan splits and net rental remittances. The CSV/review UI currently filters accounts to assets only, so credit-card CSV selection is missing even though service-level posting can operate on the liability account.

XLSX extraction, statement layouts, OCR, foreign-country tax knowledge and additional AI frameworks are not prerequisites for fixing A–E. Keep them on the roadmap rather than using them to prolong this remediation pass.

Small UX fixes can accompany nearby changes: debt shows NaN when there are no liability totals (`AccountManagementView.tsx:196`); current balances are labelled with opening_date at `:243`; returning from PDF review reopens the upload modal; duplicate mapping presets accumulate. These should not become separate architectural projects.

## Next coder action and exit criteria

Implement A–D as focused corrections to existing services/components, and address E with a narrow extractor/adapter regression. Do not rewrite the app or sample pack. Add meaningful regressions for the reproduced failures, then rerun the 200-test baseline and TypeScript checks.

Repeat the small household/company UI flow with explicit account/entity assertions, open both evidence sources, correct a bad row successfully, and test exact reimport plus partial overlap. Report expected versus actual counts and balances, with screenshots. Do not call a wrong-entity posting a pass.

After those pass, proceed with the bounded read-only Slice 1H assistant using approved ledger records and usable evidence. It should clearly distinguish unposted/unresolved documents and never derive financial totals from raw pending proposals. Full statement/OCR/FX support need not hold up that step. Full-quarter automatic bookkeeping is a separate acceptance target and is not signed off here.
