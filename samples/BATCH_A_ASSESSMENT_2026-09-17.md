# Batch A independent assessment — 17 September 2026

Verdict: **partially accepted; focused remediation required before Batch A sign-off.** The original JPY browser-edit and source-reference bugs are fixed in the tested paths. Backup export now includes modern records. Restore still rejects valid saved states and accepts some invalid ones, and partial draft updates can lose facts or bypass currency validation.

## Scope and evidence

Tests used a new copy of the assessor's synthetic vault at `samples/batch-a-assessment-2026-09-17/source.sqlite`, served on port 4007, plus fresh in-memory destination databases. No implementation code was changed. The live vault was not used for tests. Test-generated Next configuration changes were restored, the assessor server stopped, and live database/WAL/SHM hashes checked at completion.

- Existing suite: **232/232 tests, 22 files passed**.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Browser: JPY 500 edit/save stayed 500; both document and transaction source IDs survived.
- Browser: AUD 12.34 edit/save stayed 1,234 minor units under a USD-reporting business.
- Browser: one payment-account selector shown, with eligible bank/card options in the tested scope.
- Browser: authoritative export action completed; attempted import of the API-produced archive showed the JPY rejection in the actual UI. The downloaded browser file itself was not inspected; archive content was inspected through the same export API.
- Export: all 13 modern collections now present, including original document content, evidence, drafts, valuations and corrections. Consistent read transaction confirmed in source.
- Independent restore probes: the unmodified populated export fails; diagnostic copies expose a second valid-state failure. A copy with those two currency issues normalized restored into a fresh destination with identical array collections, including document content and audit records. This diagnostic success is not acceptance of the unmodified real export.
- Existing automated tests covering Version 1 preservation and ordinary-save isolation passed. No evidence of modern-table wiping by these tested paths.
- Rejected JPY/unresolved-currency restores left populated destination snapshots unchanged.

## 1. P1 — Valid exports cannot reliably be restored

### JPY is incorrectly rejected

An unmodified export containing a JPY bank account returns HTTP 400:

> Unsupported currency "JPY" in account "TEST Yen". Supported currencies: USD, AUD, EUR, GBP, CAD, NZD, CHF, JPY, SGD, HKD

Reproduced through the route and browser import. `src/app/api/vault/route.ts:598` checks `!CURRENCY_DECIMALS[curr]`. JPY has zero decimal places, so its valid value is falsy.

**Fix:** test whether the code is a supported registry key, not whether its decimal count is truthy. Cover every supported code in the validation test.

### Unresolved document currency is incorrectly rejected

After changing only JPY currency strings in a diagnostic archive, restore reached a second HTTP 400: an existing unreviewed invoice proposal has `original_currency: ""` and a blocking `MISSING_CURRENCY` finding. This is a legitimate saved review state created by the app, but line 609 requires every proposal to have a recognized currency.

**Fix:** distinguish posted financial records from unresolved review records. Restore the latter faithfully, retaining their unknown facts and blocking findings. Do not invent AUD/USD or discard the document to make restore pass. Unsupported nonempty currency values should still be rejected according to the domain rules.

**Acceptance:** export and restore an unchanged fixture containing JPY accounts/postings/drafts, an unresolved-currency proposal, linked CSV/PDF evidence, a voided transaction, ownership, valuation and FX. Compare IDs, exact amounts, statuses, references and raw original-file content/hashes in a fresh database.

## 2. P1 — Restore validation accepts incomplete or inconsistent accounting

Independent calls returned HTTP 200 and “Version 2 vault fully restored and verified” for:

1. Posted transactions with the entire journal-entry collection removed. The balanced-posting check iterates only transactions present in the postings map, so missing postings escape validation.
2. Journal entries marked USD while their accounts are AUD, while keeping the entries balanced by currency.
3. A transaction's embedded `evidence_refs` pointing at a nonexistent document. Checking draft source references alone does not validate transaction evidence.

An explicit unknown schema version, 99, also returned HTTP 200 through the Version 1 branch. This may silently restore only legacy data instead of recognizing an unsupported archive version.

**Fix:** before replacement, enforce the existing domain's transaction completeness and journal/account currency rules, validate embedded evidence references, and reject unsupported or contradictory archive versions. Use reusable existing validation where practical. No new validation framework is needed.

**Acceptance:** each malformed example returns HTTP 400 and leaves a populated destination unchanged. A legitimate posted/voided record with its complete original postings remains restorable. Unresolved proposals must not be held to posted-transaction completeness requirements.

The current test titled evidence/source referential integrity only tests an account with a missing entity. Expand it to the actual evidence-bearing records. The round-trip fixture currently uses two accounts, one transaction and one draft, with no documents, valuations or FX. It does not support the broader claimed coverage.

## 3. P1 — Partial draft updates lose amount/currency and bypass validation

The normal browser payload includes all relevant fields and passed the tested edit sequence. The service/API also supports updates with omitted fields, as used by its own source-preservation tests.

Reproduction through `POST /api/accounting`:

```json
{"action":"save_draft","draft":{"id":"assessor-aud-roundtrip","description":"Only description changed via API"}}
```

Before: AUD 12.34 with its payment account. After: same account, but `currency: null` and `amount_cents: null`.

A second partial update supplying `currency: "USD", amount_cents: 500` but omitting payment account ID was accepted for an existing JPY-account draft. The service retained the old JPY account while validating only the newly supplied fields, resulting in a mismatched record.

**Cause:** `draftService.ts` initializes amount/currency independently of the existing row, validates `input.payment_account_id` only when supplied, and reads/merges the existing row later.

**Fix:** load the existing row first, apply explicit update semantics consistently (omitted means preserve; explicit null means clear where allowed), and validate the resulting complete draft before writing. Derive currency from a known account where appropriate; do not erase or invent unrelated facts during a description/source-only edit.

**Acceptance:** description-only and source-clear updates preserve amount/currency/account; source omission preserves both references; explicit source null clears only that reference; a currency-only mismatch against a retained account is rejected. Existing JPY 500 and AUD 12.34 browser tests must still pass.

## Delivery guidance

Keep the successful UI changes. Submit one focused Batch A remediation covering the three items above. No Batch B/C expansion is required to resolve them, and no redesign is requested. Proceed to Batch B after this short reassessment, rather than treating 232 passing tests as complete acceptance.

The delivery report says unknown draft currency is strictly rejected. The current service actually preserves null when no account/currency is known and derives it from a known account. That behavior is consistent with retaining incomplete drafts; update the report to describe it accurately.

## Evidence files and limitations

Directory: `samples/batch-a-assessment-2026-09-17/`.

- `vitest.log`, `tsc.log`: existing checks.
- `archive.json`: inspected populated export.
- `checks-results.json`, `checks.log`: independent restore/service probes.
- `browser-draft-after.json`, `browser-drafts-final.json`: successful browser outcomes before deliberate API probes.
- `browser-restore-error.txt`: actual import rejection.
- `api-partial-update.json`, `api-partial-currency.json`: reproduced draft failures.
- `accounting-after-drafts.json`: posted balances after browser edits.
- `live-before.json`, `live-after.json`: live-file hash comparison.

The assessor probe file is retained as `checks.test.ts.disabled` so it does not join the application's normal test suite. Its runner completed successfully, but probes intentionally record failing application behavior; it must not be counted as an additional passing acceptance test. An initial probe harness omitted accounting schema initialization; that harness error was corrected before the final evidence run and is not an application finding.

This assessment is limited to Batch A. It does not re-accept Batch B/C, production build, all account-entry variants, mobile/accessibility coverage, or every legacy archive shape.
