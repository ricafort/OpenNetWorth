# Bounded import workflow acceptance — 15 September 2026

**Decision: the three implementation fixes pass functional assessment. Final completion is conditional on correcting one failing test and obtaining a green full suite. No new feature-remediation slice is required.**

## Independent results

| Acceptance check | Result |
|---|---|
| TypeScript (`npx tsc --noEmit --incremental false`) | PASS, zero errors |
| Full Vitest suite | **203 passed, 1 failed**, 204 tests across 19 files |
| CSV Edit modal | PASS: opens without crash, entity-qualified accounts displayed, supplier correction saves, description preserved |
| Modified/Pending display | PASS for tested correction: two actionable rows and Pending (2) remain visible |
| PDF account handoff | PASS: reupload pending unpaid invoice, choose Household, open review; selected account and stored account/entity all match Household |
| PDF Edit modal | PASS: opens without crash after handoff; account/entity choices available |
| Already-linked PDF exact reimport | PASS: Company receipt remains linked to Company despite choosing Household in the upload modal; no financial reposting |
| Internal duplicate browser approval | PASS: selecting the repeated CSV rows and approving without confirmation is rejected atomically |
| Duplicate service regressions | PASS: internal/external duplicates blocked without explicit true; string false rejected; legitimate identical purchases permitted with explicit true |
| CSV and PDF View Original links | PASS: both clicked from the same household purchase, both returned HTTP 200 with correct MIME type; CSV downloaded |
| Original bytes | PASS: real HTTP CSV/PDF responses match retained SHA-256 hashes |
| Raw endpoint error/cache behaviour | PASS: missing ID 400, unknown ID 404, `private, no-store, max-age=0` |
| Receipt-enriched CSV retry | PASS in fresh service database: same transactions reused, balance/counts unchanged |
| Idempotency financial/material guards | PASS: amount/date/account/payee/description changes rejected; mismatched currency rejected; original evidence preserved |

The coder's statement that all 204 tests pass was **not reproduced** on the assessed working tree. The failure is in the new test assertion, rather than evidence that the production retry logic loses data.

## The one remaining correction

Failing test:

`src/lib/domain/accounting/slice1d.test.ts:1336`

`Finding 7: Structured Evidence Identity & Field-Level Conflict Detection`

Error: `SqliteError: no such table: transaction_evidence`.

The new assertions query `transaction_evidence` three times, but the application stores transaction evidence in **`m1_transactions.evidence_refs`**. Do not create a new table or migration to satisfy this test. Correct the test to inspect the storage the implementation actually uses.

There is also an incorrect expected hash in the same added assertions: the fixture's original hash is `sha256-abcdef1234567890`, while the new assertion expects `sha256-original-hash`. Refer to `structuredRefA.content_hash` instead of duplicating an inconsistent literal.

Suggested assertion pattern, adapted to the existing test:

```ts
// Capture immediately after the original transaction is posted.
const originalEvidenceJson = (
  db.prepare('SELECT evidence_refs FROM m1_transactions WHERE id = ?')
    .get(tx.id) as { evidence_refs: string }
).evidence_refs;

// After each evidence-only retry:
const storedEvidenceJson = (
  db.prepare('SELECT evidence_refs FROM m1_transactions WHERE id = ?')
    .get(tx.id) as { evidence_refs: string }
).evidence_refs;

expect(storedEvidenceJson).toBe(originalEvidenceJson);
const refs = JSON.parse(storedEvidenceJson).map((ref: unknown) =>
  typeof ref === 'string' ? JSON.parse(ref) : ref
);
expect(refs).toHaveLength(1);
expect(refs[0]).toMatchObject({
  document_id: structuredRefA.document_id,
  content_hash: structuredRefA.content_hash,
});
```

Keep the unchanged transaction/posting count assertions. Do not remove the evidence checks or relax financial conflict validation. The assessor's independent in-memory tests already confirm that the existing implementation preserves original evidence and rejects conflicting financial changes.

## Browser and environment details

The usual in-app browser connection was unavailable. Port 4005 was initially not running. The assessor started the existing Next.js app explicitly against `data/test_browser_vault.sqlite` and `.next-test`, without running the seed/wipe script. The live port 4000 was not used.

Browser acceptance used the alternate container browser with HTTP requests forwarded to the real isolated host server. This retained a localhost browser origin while reaching the host from the container; application responses and ledger behaviour were not mocked. Direct host.docker.internal navigation initially failed because that HTTP origin did not expose crypto.randomUUID. The localhost transport resolved that environment issue. HMR WebSocket connection errors remained specific to the transport; this was not a hot-reload acceptance test.

The assessor-launched server initially lacked permission to write the default temporary directory. It was restarted with TEMP/TMP set to the writable assessment evidence directory; PDF extraction then succeeded. This was an assessment sandbox issue, not a new extraction defect. The server started for testing was stopped after completion.

PDF UI uploads used the exact retained sample PDF bytes downloaded from the now-working original-document endpoint. No substitute invoice or mocked extractor result was used. This directly exercised exact reimport and pending-document handoff; a new first-ever PDF import and a deliberately failed PATCH save were not separately retested in the browser during this pass. Fresh service PDF ingestion was covered by the diagnostic probes.

## Evidence and preservation

See [assessment-evidence-2026-09-15-acceptance](assessment-evidence-2026-09-15-acceptance): `vitest.txt`, `tsc.txt`, `raw_endpoint_results.json`, `uihandoff.json`, `uiduplicate.json`, `uireimport.json`, `uievidence.json`, `probe_results.json`, `focused_results.json`, `idempotency_results.json`, and `final_verification.json`.

No application source code changed. The original test database was not wiped. One pending CSV supplier was corrected and the pending unpaid PDF was assigned to Household through the UI. The test vault remains at Household **AUD 883.12**, Company **AUD 390.00**, seven imported transactions and two receipt links. The live database and WAL hashes match the beginning of the assessment.

The raw probe outputs include deliberately rejected cases; OBSERVED is not a blanket pass status. Full-quarter bookkeeping, new PDF layouts, OCR, XLSX and FX capabilities are outside this bounded sign-off.

## Next action and Slice 1H

Correct the single test using the real evidence column and correct fixture values, rerun its test file, then obtain 204/204 passing and zero TypeScript errors. Once those checks pass, proceed to the bounded Slice 1H work. Another architecture review or feature-remediation cycle is not needed for these three fixes.

Slice 1H should remain grounded in approved ledger records and linked evidence. Pending/unresolved documents must be identified separately and must not inflate reported financial totals. Existing minor presentation issues, including a literal `null - ...` supplier description and the absolute "$0 Double Counting" label, can be tidied during nearby work; they are not new acceptance blockers here.
