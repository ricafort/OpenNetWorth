# Australian Finance Test Pack — A–E remediation retest

15 September 2026. Verdict: partial remediation verified; request three focused corrections before import-workflow sign-off. Do not restart the milestone or add new infrastructure.

Assessed working tree at HEAD `f39fecec53fc46832dadeafeeb7b3e21a5acb351` plus current uncommitted changes. The reported completion of all A–E acceptance criteria is not supported by this retest.

## Coverage and isolation

- Actual browser at `http://localhost:4005/accounting`; no Gemini browser subagent required.
- Existing isolated `data/test_browser_vault.sqlite`; API entity IDs matched its read-only contents before test mutations. No database reset or server restart.
- Actual PDF upload, account selection, evidence navigation, proposal correction, duplicate CSV upload, and attempted overlapping-export approval through the UI.
- Fresh in-memory databases for repeatable posting tests, using the real PDF extraction adapter. These include all nine CSV edge fixtures, all seven PDFs, and all 119 primary full-quarter rows.
- Existing Vitest suite independently rerun: **200/200 tests across 18 files passed**. `npx tsc --noEmit --incremental false` passed.
- No application source code changed by the assessor. New files are assessment reports/evidence only.
- Final live database and WAL SHA-256 hashes match the beginning of this retest. Port 4000 was not used.
- Test-vault Household balance remains **AUD 883.12**, Company **AUD 390.00**, with seven imported transactions (including the coder's previous three wrong-entity purchases) and two receipt links. This retest added one pending duplicate CSV document and updated one pending date-correction proposal. No new financial postings were made in the browser test vault.

Evidence directory: [assessment-evidence-2026-09-15-retest](assessment-evidence-2026-09-15-retest). `probes.cjs` and `focused.cjs` are assessor-only diagnostic scripts, not application changes. Run from the repository root with Node. Their JSON results distinguish observations from acceptance assertions; `OBSERVED` does not mean every behaviour passed.

## A–E results

| Task | Verified improvement | Remaining issue | Verdict |
|---|---|---|---|
| A — account/entity | PDF selector shows entity names. Editing an account through the service now synchronizes proposal entity correctly. | Changing the account in the PDF upload modal still does not save it before opening review. | Partial |
| B — evidence | Freshly fetched ledger data displays both CSV and PDF IDs/hashes. | View Original opens HTTP 404; the raw-document route does not exist. | Partial |
| C — corrections | Date and amount corrections clear their errors; service approval then succeeds. UI corrected row is enabled, remains in Pending, and description is preserved. Missing CSV date displays Needs Review. | Pending count and bulk selection still omit modified rows; unsupported PDF fallback facts remain misleading. | Core correction accepted; small follow-ups |
| D — duplicates | Overlapping-export proposals are initially unselected; approval without confirmation is rejected in both UI and service. Explicit legitimate separate purchases remain possible. | Within-file duplicates check the wrong finding code; harmless post-link approval retry still conflicts. Confirmation uses truthiness. | Partial |
| E — extraction | DUE becomes unresolved currency and cannot be approved; payment confirmation remains independently required after correction. | Actual unpaid fixture still uses SYNTHETIC SAMPLE - NOT A REAL TRANSACTION as supplier. | Currency guard accepted; supplier incomplete |

## Three corrections required before sign-off

### 1. Persist the PDF modal's selected account (A)

Actual UI reproduction: upload `invoice_unpaid_330.pdf`; select **Household - Everyday Checking (AUD)** in Paid from Account; click Open in Review Table. Review still shows **Business Operating (AUD)**. The source explains why: upload sends account/entity at file selection (`PdfImportModal.tsx:98`); the selector only changes local state (`:258`); `handleProceedToReview` only forwards the document ID (`:122`). Adding entity names did not fix persistence.

Implement either account selection before ingestion, or a validated save of the current account/category before opening review. Derive entity from the selected account; do not rely on the stale `selectedEntityId` state. Apply the change only to editable proposals; exact reimport must not rewrite already posted or linked ownership. The existing account-review synchronization is a useful part of the solution.

Acceptance: with Company sorting first, select Household and verify review account, proposal account, proposal entity, candidate matching and subsequent reload all agree. Include a fresh-file case and a pending reimport case. Qualify account labels consistently in CSV and review selectors as a nearby usability fix.

### 2. Implement the original-document endpoint (B)

After refreshing the actual ledger account selection, both citations display real IDs and hashes. Clicking the receipt's View Original opens `/api/documents/raw?id=doc-b1b7ed6b-21eb-4769-9a2b-b7a0a3e071f8` and a **404: This page could not be found** page. `ReportsTraceabilityView.tsx:1171` introduces the link, but there is no `src/app/api/documents/raw/route.ts` in the assessed tree.

Add the small read-only endpoint (or point to an existing working equivalent). Resolve a retained document by its database ID, return the correct stored bytes and MIME type, and respond clearly to a missing/unknown ID. Do not introduce arbitrary client-supplied filesystem paths. No PDF viewer framework is required.

Acceptance: open both original CSV and linked PDF from the same purchase. Compare returned content to the retained source/hash; exercise a missing ID. Opening either source must add no postings. Show row/page context where available: current CSV citation renders a bare Page label without its row reference.

A secondary refresh issue was observed: Refresh All Reports did not refresh the active drilldown; switching account away and back did. The drilldown effect at `ReportsTraceabilityView.tsx:124` depends only on account ID. Include active drilldown in refresh and period-change handling while touching this component; this is a small follow-up, not a new subsystem.

### 3. Apply duplicate confirmation to the actual emitted codes (D)

Actual UI reproduction: upload `05_edge_cases/duplicate_identical_rows.csv` into Company (which has no matching AUD 22 purchase). Both AUD 22 rows are automatically selected, Approve Selected (2) is enabled, and the File Duplicate row's Confirm Separate checkbox is **unchecked**. The screenshot and accessibility state are saved. These rows were left unposted in the browser vault.

Fresh service reproduction proves financial impact: both rows are approved without any duplicate flag and reduce an AUD 1,000 account to **AUD 956**, instead of requiring a decision about the repeated AUD 22 purchase.

Cause: ingestion emits `SUSPECTED_DUPLICATE_INTERNAL` (`documentInboxService.ts:306`), while the new approval guard (`:575`) and UI initial selection (`ProposalReviewTable.tsx:238`) check `POSSIBLE_DUPLICATE_FILE`. The rendering code correctly recognizes the internal flag, so the visible warning/checkbox does not enforce the advertised behaviour.

Use one shared predicate/constant for internal and existing-ledger duplicate findings. Apply it to initial selection, Select All Valid and backend approval. Require `duplicate_confirmed === true`: the current truthiness check at `documentInboxService.ts:576` accepts the string `"false"`, reproduced in a service probe. Validate the request boundary too if appropriate.

Acceptance: both internal and external duplicates require an explicit decision; omitted, false and string-false flags reject atomically. A real boolean true permits deliberately separate transactions. Keep both legitimate AUD 8.50 purchases when explicitly confirmed. Provide a simple skip/existing decision, reusing current status mechanisms if available. Remove the absolute "$0 Double Counting" guarantee until the UI accurately describes these protections.

## Remaining focused follow-ups

1. **Approval retry after receipt enrichment:** starter CSV approval → link real receipt → reimport CSV → retry original approval still throws an idempotency conflict. Balance stays AUD 883.12 and evidence is preserved, so this is a retry/recovery failure, not duplicate posting. Return the existing financial result for an equivalent already-approved proposal without comparing additive evidence as a financial change; changed monetary details must still conflict. Reproduction: `starter_real_pdf_link_reimport` in `probe_results.json`.
2. **Supplier regression:** real unpaid fixture still extracts the synthetic banner. The new heuristic at `openTaxAdapter.ts:234` excludes TAX INVOICE/RECEIPT/STATEMENT but not the actual offending fixture banner. Return the actual supplier or explicitly unresolved supplier with a finding. Keep currency unresolved when uncertain and preserve the unpaid gate. A narrow fixture regression is sufficient.
3. **Pending consistency:** after correcting a date, Pending (1) displays two pending rows because modified is included in filtering but not metrics (`ProposalReviewTable.tsx:268`) or Select All Valid (`:306`). Use the same actionable-status predicate in all three places. The saved description stayed unchanged during a supplier edit, as intended.
4. **Unknown PDF facts:** unsupported PDF proposals still carry today's date and zero amount. The new 1970 badge addresses CSV placeholders only. Present unresolved PDF date/amount as unknown rather than extracted facts; do not start an unrelated schema redesign for this display correction.

## Full-quarter and edge-case conclusions

The nine edge CSVs were retested through services. Initial malformed dates/amounts block posting; valid corrections recover. Australian dates with explicit DD/MM/YYYY mapping, JPY minor-unit precision, literal formula-like descriptions, wrong-direction receipt rejection, and mixed-batch rollback remain sound. Unsupported PDF layouts remain blocked. Real paid receipt linking and exact reimport preserve balances.

All 119 primary full-quarter row dates/amounts still match the canonical fixture, as do all five bank/card closing balances under deliberately naive approval. The alternative 62-row export flags 62 existing matches. These are ingestion/amount checks, **not a full-quarter UI or bookkeeping pass**. Naive Household expenses remain AUD 30,693.39 against the fixture's AUD 23,622.17; transfers, repayments and net remittances still need appropriate classification/splits. XLSX and additional PDF layouts remain roadmap work from the prior assessment. None is required to finish the three corrections above.

## Coder handover and exit criteria

Finish the existing fixes rather than starting another remediation architecture. Prioritize PDF account persistence, a working source endpoint, and consistent duplicate enforcement. Address the small supplier/retry/Pending issues in the same limited pass where practical.

Add regression tests for the observed failures, not only a rerun of the existing 200 tests: actual internal-duplicate code, strict confirmation value, CSV/PDF endpoint content, receipt-enriched retry, and the supplied unpaid invoice. Add a small UI check for account handoff and corrected Pending rows. Passing the previous suite did not exercise these missing paths sufficiently.

Repeat only the affected browser paths and the small starter acceptance flow; a broad full-quarter UI run is premature while these paths fail. Use the isolated port 4005 environment. The Gemini capacity error is a tool limitation, not a reason to use the live vault or mark untested UI paths passed. Service/API checks can continue independently.

After those focused checks pass, continue with bounded Slice 1H. Full-quarter accounting classification remains a separate planned capability; it should not indefinitely delay completion of this remediation.
