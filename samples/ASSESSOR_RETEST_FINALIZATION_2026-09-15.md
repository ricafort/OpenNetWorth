# Import workflow finalization — independent retest

15 September 2026. **Verdict: request three focused corrections.** The duplicate enforcement and financial retry fixes work, but the current UI has a new Edit crash, PDF account handoff still fails, and original-file delivery is broken. This does not require a redesign or restarting the milestone.

Assessed the current uncommitted working tree on repository HEAD `f39fecec53fc46832dadeafeeb7b3e21a5acb351`. No application source code was changed by the assessor.

## Verification

| Check | Independent result |
|---|---|
| Existing Vitest suite | **200/200 passed**, 18 files |
| TypeScript, no incremental cache | **FAIL: three errors**, including nonexistent database import and undefined entities |
| Internal duplicate UI | Initially selects only the first purchase; selecting both and approving without confirmation is rejected atomically |
| Internal/external duplicate service guards | Missing flag, boolean false and string "false" reject; boolean true permits a deliberate separate purchase |
| Legitimate same-day AUD 8.50 purchases | Both preserved with explicit confirmation |
| CSV approval retry after real receipt linking | **PASS:** existing transactions reused; AUD 883.12 and posting counts unchanged |
| Financial/material changes under same idempotency key | Amount, date, account, description and payee changes rejected; invalid currency rejected; no added postings |
| Unpaid PDF supplier/currency | Synthetic banner removed; supplier null, currency unresolved; UI says Not identified during extraction. Missing currency blocks approval, and payment confirmation remains separately required |
| Unsupported PDFs | Fresh service ingestion now produces missing-date and missing-amount findings and remains blocked. Full corrected UI flow cannot be accepted while Edit crashes |
| Review Edit button | **FAIL:** browser runtime ReferenceError, entities is not defined |
| PDF account selection | **FAIL:** chosen Household account lost; console TypeError, extractedDoc.proposals is not iterable |
| Raw PDF endpoint | **FAIL:** actual HTTP 500 caused by unresolved module import |
| Raw CSV delivery implementation | **FAIL by storage/decoder check:** UTF-8 CSV is incorrectly base64-decoded; decoded bytes do not match retained hash |

Browser work used the existing isolated application on port **4005**, with the existing test vault. No reset or server restart. Service probes used fresh in-memory databases and the actual PDF extraction adapter. The live vault and WAL SHA-256 hashes remained unchanged. Final test balances remain Household **AUD 883.12**, Company **AUD 390.00**, with seven imported transactions and two receipt links. No new ledger postings were made in the browser vault; the unpaid document was reprocessed through the normal upload workflow.

Raw outputs, scripts and screenshots: [assessment-evidence-2026-09-15-retest2](assessment-evidence-2026-09-15-retest2). See `vitest.txt`, `tsc.txt`, `probe_results.json`, `focused_results.json`, `idempotency_results.json`, `browser_errors.json`, `raw_endpoint.json`, `csv_encoding_check.json`, and `final_verification.json`. Diagnostic records labelled OBSERVED are observations, not blanket acceptance passes.

## 1. Restore the Edit modal — high priority

Reproduction: Document Inbox → duplicate_identical_rows.csv → Review Proposals → Edit. The entire page crashes with `ReferenceError: entities is not defined` at `ProposalReviewTable.tsx:960`.

The new account-label rendering references an `entities` variable that is not available to the component. TypeScript independently reports TS2304 and TS7006 at the same line. This blocks corrections of supplier, account, currency, date and amount, including documents that correctly require manual review.

**Fix:** supply typed entity data through the existing component props/data-loading path, or derive the display label from data already supplied. Ensure loading/missing entity data has a safe display fallback.

**Acceptance:** opening Edit for both CSV and PDF does not crash; entity/account labels are correct; save one valid correction; verify the row remains in Pending with the correct count and can be selected. Run `npx tsc --noEmit --incremental false` with zero errors. Keep the improved modified-status handling.

## 2. Correct the PDF account handoff — high priority

Reproduction: upload the supplied invoice_unpaid_330.pdf; select Household - Everyday Checking (AUD); Open in Review Table. Review still targets Company Business Operating.

The browser logs `Failed to persist account selection: TypeError: extractedDoc.proposals is not iterable`. `PdfImportModal.tsx:126` loops over `extractedDoc.proposals`, but the upload response supplies `document` and `proposals` as siblings, and the component already keeps a separate `proposals` state variable. The catch logs the error and the finally block navigates anyway. It also does not inspect each PATCH response's HTTP status.

**Fix:** iterate the actual proposal array. For editable proposals, persist account/category through the existing validated review API and inspect `res.ok`/the returned error. Open review only after successful saves. Keep the modal open and display the reason on failure. Preserve posted/linked proposals on exact reimport. Derive entity from the selected account; avoid stale selectedEntityId state.

**Acceptance:** choose Household while Company sorts first, then assert review account, stored account and entity agree. Exercise a fresh document and pending reimport. A rejected save must remain visibly unresolved and must not navigate as success. Already posted/linked reimports retain their original account and evidence.

## 3. Finish original-file delivery — high priority

`src/app/api/documents/raw/route.ts:2` imports `@/lib/infrastructure/database`, which does not exist. The working database module used by the other document routes is `@/infrastructure/sqlite/db`. TypeScript reports TS2307. An actual GET for the retained receipt returned HTTP 500 with this missing-module error, so View Original is not usable yet.

There is a second defect at line 22: all `raw_content` is decoded as base64. The ingestion service stores PDFs as base64 but CSVs as raw UTF-8 text. A read-only check of the retained household CSV proved its raw-text hash matches the document hash, while the proposed base64-decoded bytes do not. Fixing only the import would leave CSV delivery corrupt.

**Fix:** use the existing authoritative database module. Encode/decode according to the supported stored representation: PDF base64, CSV UTF-8. Return the appropriate MIME type. Prefer private/no-store caching for these personal financial originals rather than the current public one-year immutable cache. Keep document-ID lookup and avoid accepting arbitrary filesystem paths.

**Acceptance:** open both CSV and PDF from an existing purchase; returned bytes match retained hashes. Missing id returns 400; unknown id returns 404; neither path alters transactions. Add a route-level test that imports the real handler so a missing module cannot escape the suite. Verify the test route uses the isolated database.

## Idempotency decision: retain the fix, clarify what it does

The earlier receipt-enriched retry now succeeds. Independent tests confirm unchanged financial totals and rejection of changed monetary/material fields. This is the required improvement.

However, the implementation does **not merge new evidence**. Removing `isEvidenceMatch` from the existing-key equality condition returns the old transaction and leaves its stored evidence unchanged. An evidence-only retry with a new document ID returned the same ID but did not attach the new reference. Old evidence was preserved.

This behaviour is acceptable for a harmless replay when explicit receipt linking handles evidence attachment. Describe it as "reuse the existing transaction; attach evidence through the link workflow." Do not claim it merges proposals or evidence, or deduplicates separate proposals by economic event: this code still depends on the same idempotency key. If automatic evidence merging is desired later, specify and test it separately.

The altered slice1c/slice1d tests now assert reuse instead of conflict. Strengthen them with stored-evidence assertions and the actual CSV → receipt link → CSV retry sequence. Changing expected exceptions alone does not prove an evidence merge. No further relaxation of amount/date/account/payee/description guards is needed.

## Scope and next action

The nine CSV edge fixtures and seven PDFs were exercised again through real services. Initial invalid values, unsupported layouts, wrong receipt direction, and mixed invalid batches remain blocked. Date/amount correction service paths still pass. Legitimate identical purchases now require explicit confirmation, as intended. Full-quarter parsing probes were rerun, but this is not a full-quarter UI/bookkeeping sign-off; automatic approval of flagged legitimate duplicates now correctly stops for a decision.

Do not expand the remediation into OCR, FX, new statement formats or a framework migration. Retain the passing duplicate, supplier, unknown-fact and financial-retry work. Complete the three corrections above, then run: TypeScript → full suite → one CSV/PDF Edit smoke test → PDF account handoff → opening both originals → duplicate rejection and explicit separate confirmation → receipt-linked retry with unchanged balances.

After that focused acceptance sequence passes, proceed to the bounded Slice 1H work. The current 200 passing tests are real, but they do not justify the claim that the UI and document integration are finalized.
