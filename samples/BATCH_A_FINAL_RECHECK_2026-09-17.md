# Batch A remediation recheck — 17 September 2026

Verdict: **most remediation accepted; one backup-compatibility blocker remains.** No broader redesign or expansion into Batch B/C is requested.

## Independently verified

- Existing application suite: 232/232 tests, 22 files passed.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- New assessor tests with explicit assertions: **8 passed, 1 failed**.
- Partial draft description updates preserve amount, currency, payment account and source IDs.
- A currency-only update is validated against the retained payment account and rejected on mismatch without mutation.
- Explicitly clearing the document source preserves other financial facts and the transaction source.
- Restore rejects missing postings, balanced postings with account/currency mismatch, a nonexistent referenced document and unsupported version 99. Populated destinations remained unchanged in the tested rejection cases.
- A diagnostic backup with only serialized evidence references decoded restored into a fresh database, preserving all array collections. It included JPY, an unresolved-currency proposal, 19 transactions, 40 postings, a cancellation record, valuation, FX rate, ownership, 29 documents and 53 proposals. No JPY or missing-currency substitution was required this time.

## Remaining P1: restore misreads existing serialized evidence references

The unchanged populated export returns HTTP 400 when restoring transaction `5594bfe0-c2b8-4d3b-99c5-9bc092bdcd81`.

Existing evidence can be stored as an array whose elements are themselves JSON strings. For example, after parsing the outer field, an element has this shape:

```text
"{\"document_id\":\"doc-de6d693c-189d-412b-bc57-247571ff7ae7\",\"content_hash\":\"...\",\"type\":\"structured\"}"
```

The new check in `src/app/api/vault/route.ts`, around lines 697–709, treats every string element as a document ID. It therefore tries to find a document whose ID is the entire JSON object text, rather than reading its `document_id`. The actual referenced document is present in the same archive.

This is an existing persisted format already supported by report drilldown: `src/lib/domain/accounting/balanceService.ts`, around lines 1480–1495, decodes serialized evidence elements. It is not a fabricated corrupted archive.

**Requested fix:** reuse or align with the existing evidence normalization behavior. Recognize structured evidence objects, serialized structured objects, and any documented legacy ID representation; then validate the extracted document IDs. Preserve all citation metadata and source content. Reject malformed references with a clear validation error rather than silently skipping validation. Do not remove evidence or weaken the nonexistent-document guard to make restore pass.

**Acceptance:** the exact unchanged archive restores to a fresh isolated database, retaining evidence and original documents. The receipt-linked transaction can still expose its CSV and PDF sources. Both object and serialized-object forms are accepted, while a genuinely nonexistent document is rejected without changing the destination.

## Why the reported “16 probes passed” is insufficient

The earlier `checks.test.ts.disabled` script contains a single test that logs probe outputs; it does not assert the expected HTTP status or data-preservation result. Vitest can report success even when a valid restore returns 400. Its recorded results also contain the serialized-evidence rejection.

The new assessor file uses explicit expectations and correctly fails the unmodified-backup test. Retain those expectations in the application's regression suite instead of counting output rows as passing tests.

## Scope and safety

This recheck exercised the actual route functions and draft service against fresh in-memory databases, using the previously populated synthetic archive. No browser rerun was needed to establish the backend restore rejection; the previously accepted JPY/AUD browser forms were not changed by this remediation and were not newly claimed as tested here. No application implementation was edited, no live-vault restore was attempted, and no server/configuration changes were required.

Evidence: `samples/batch-a-final-2026-09-17/` contains `vitest.log`, `tsc.log`, `acceptance.log`, `unmodified-restore.json`, `normalized-roundtrip.json` and live before/after hashes. `acceptance.test.ts.disabled` retains the nine asserting tests without adding them automatically to the normal application suite.

After this single compatibility fix passes, the previously identified Batch A findings can be closed and work can move to Batch B.
