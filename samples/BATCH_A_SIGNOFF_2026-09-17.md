# Batch A sign-off — 17 September 2026

**Accepted for the agreed draft-integrity and backup/restore remediation scope. Proceed to Batch B.**

Independent verification against the current working tree:

- 241/241 tests passed across 23 files: 232 existing tests plus the nine explicit assessor acceptance tests.
- `npx tsc --noEmit --incremental false` passed.
- The unchanged populated archive now restores into a fresh isolated database and matches the exported snapshot, including profile timestamps and serialized evidence metadata.
- The diagnostic normalized-evidence case also passes, including JPY and unresolved proposal currency.
- Missing postings, journal/account currency mismatches, nonexistent referenced documents and unsupported archive versions are rejected without changing the tested destination.
- Partial draft edits preserve existing financial facts and source references; deliberate source clearing and currency-mismatch rejection behave as tested.
- Earlier JPY/AUD browser edit acceptance remains applicable. This final recheck ran route/service acceptance tests; it did not repeat the complete browser walkthrough.

No implementation changes were made by the assessor. Live database, WAL and SHM hashes remained unchanged. Verification logs and hashes are in `samples/batch-a-signoff-2026-09-17/`.

This closes the identified Batch A blockers; it is not whole-application sign-off or a claim that all possible input permutations have been tested.

## Next: Batch B — consistent financial information

1. Stop false zero/debt-free claims on disconnected screens, including mixed legacy/accounting data. Show an explicit limitation and link to the working Accounts/Reports tab where integration is incomplete.
2. Reuse existing accounting read services for the first balance/debt summaries and the assistant's bounded spending lookup. Keep owner, period and currency explicit; do not create another independently maintained set of totals.
3. Test one bank account, mortgage, expense, transfer and cancelled transaction across applicable screens and assistant answers. Include mixed legacy/modern records and mixed currencies. Transfers and loan principal must not inflate expense totals; missing rates must not produce invented combined totals.

Keep cross-owner posting automation and the remaining Batch C copy refinements separate from this work. Preserve the nine acceptance tests as regression coverage; moving their fixture to a stable test-fixtures location can be routine housekeeping, not a new release gate.
