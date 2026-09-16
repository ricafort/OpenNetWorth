# Coder handover — Australian sample import testing

Please test OpenNetWorth's import functionality using this sample pack before expanding Slice 1H.

Repository: D:\LocalVersions\OpenNetWorth
Sample pack: D:\LocalVersions\OpenNetWorth\samples\Australian_Finance_Test_Pack_v1

Read README_START_HERE.md and VALIDATION_REPORT.md in the pack first. Use the files as supplied and compare results with 06_expected_results. The pack contains 41 files, including 119 bank/card movements, two loan schedules, seven PDFs, a formula-based Excel workbook and nine CSV edge cases. FILE_MANIFEST.csv records fixture hashes.

## Scope and isolation

- Test the real UI workflows, supported by API/service checks where useful. Parser-only tests do not prove import, review, approval, linking, persistence or reporting works.
- Use the isolated test environment on port 4005. Confirm OPENNETWORTH_DB_PATH resolves to data/test_browser_vault.sqlite and the build directory is .next-test. Preserve the live vault and port 4000 server.
- Inspect the existing npm run dev:test runner before launching: it RESETS the test vault on every launch. Stop the existing test server before intentionally resetting it. Never reset during a persistence check or while another test is using it.
- The runner's default accounts have 2026 opening dates and different balances. Create dedicated household/company fixture entities and accounts with the opening dates/balances below. Do not reuse the default seeded accounts and assume the expected totals apply.
- Preserve these original fixtures. If another variant is needed, create a separately named fixture with its own expected result. Do not edit samples simply to make a test pass.
- This handover is for testing and reporting. Record defects with a focused remediation proposal. New document formats, OCR, tax calculations, FX and framework changes are not required to complete this test pass; report unavailable capabilities separately.

## 1. Starter workflow — priority acceptance test

Create two separate entities/accounts, both AUD, with openings on 30 June 2025:
- Household Everyday Checking: AUD 1,000.00.
- Company Business Operating: AUD 500.00.

Import 01_start_here/household_simple_expenses.csv through the UI. Map Date, Description and Amount; date format DD/MM/YYYY; signed amounts; currency AUD. Review and approve three purchases: paper AUD 22 and pens AUD 15 as office supplies, broadband AUD 79.88 as utilities.

Expected: three new purchase transactions, household expenses AUD 116.88, office supplies AUD 37.00, utilities AUD 79.88, closing account balance AUD 883.12. Count purchase transactions separately from any opening-balance transaction.

Upload 03_documents/receipt_office_supplies_22.pdf. Verify Waratah Office Supplies, 3 July 2025, AUD 22.00, then link it to the existing paper purchase. Expected: zero additional financial postings, zero balance change, one purchase with a receipt and two without. Open the evidence from the linked transaction and confirm it is the correct source document.

Import 01_start_here/business_simple_expense.csv into the company account and approve the AUD 110 office-supplies purchase. Link receipt_business_supplies_110.pdf, dated 11 July 2025. Expected company balance AUD 390.00. Company records must not appear in household-filtered totals.

Re-import the same CSVs and receipts. Check duplicate/reimport handling, retries and repeated link confirmation do not add financial effects. Refresh the page and reopen the documents to verify persistence. Do not rerun the resetting launcher during this check. Record ledger transaction/posting counts and account balances before and after linking and reimports.

## 2. Full-quarter import and classification checks

Use a separate scenario from the starter. The datasets overlap. Follow accounts_setup.csv for the five full-quarter opening balances and 30 June 2025 opening date; translate the credit-card signed fixture balance to the app's liability convention.

Import the five *_signed.csv bank exports with explicit mappings. There are 119 source rows in total. Expected signed closing balances after correct accounting treatment:
- HH-EVERYDAY: AUD 26,269.15 (62 rows).
- HH-SAVINGS: AUD 28,294.00 (6 rows).
- HH-CARD: AUD 0.00 (29 rows).
- HH-RENTAL: AUD 4,000.16 (6 rows).
- BIZ-BANK: AUD 34,575.00 (16 rows).

Test hh_everyday_debit_credit_ALTERNATIVE.csv separately using Transaction Date, Narrative, Debit and Credit. It represents the same 62 everyday records; do not add it as new transactions alongside the signed version except in an explicit overlap test.

Review transfer pairs, credit-card repayments, refunds, mortgage principal/interest and net rental deposits against transaction_classification.csv and expected_results.json. Do not blindly approve every negative row as an expense or every positive row as income. If required classification is unavailable, document the limitation and affected rows instead of claiming full accounting acceptance.

## 3. Edge cases and unsupported formats

Exercise the nine files in 05_edge_cases against edge_case_expectations.json. Check blocking amount/date errors, explicit Australian date mapping, exact JPY minor-unit scale, literal formula-like text, same-file duplicates, legitimate identical-value purchases, overlap with the starter, and incoming AUD 22 versus the outgoing AUD 22 receipt.

Expected duplicate outcomes depend on the scenario: two legitimate same-value purchases must be preservable, while reimporting existing purchases must not silently post them again. A similarity warning alone is not a full pass for either outcome.

Attempt the bank, card, property-manager and mortgage PDFs and the XLSX via the appropriate UI, if offered. Verify unsupported formats/layouts receive a clear response without invented values or postings. Do not treat the *_NOT_BANK_IMPORT.csv tables as bank transactions. Missing format support is a documented capability gap; silent incorrect posting is a defect.

## 4. Known unpaid-invoice regression

Test 03_documents/invoice_unpaid_330.pdf unchanged. The previous bridge check returned currency DUE and the synthetic banner as supplier despite AUD and Waratah Office Supplies being printed in the document. Reproduce through extraction and review UI; record the current behaviour rather than assuming it remains broken.

Expected facts: supplier Waratah Office Supplies, invoice WOS-0920, date 20 September 2025, AUD 330.00, unpaid. It must not silently become a cash payment. Check that invalid currency cannot post to an AUD account, and that correcting currency alone does not incorrectly imply the invoice was paid. If payable/payment-state handling is unavailable, leave unresolved and report that limitation. Extraction support is not evidence of payment.

## Deliverable and completion

Provide a concise report with the tested commit plus any uncommitted changes, resolved test database path, commands used and a matrix: scenario, expected result, actual result, PASS/FAIL/UNSUPPORTED/NOT TESTED, evidence.

Include screenshots of import mapping, proposal review, receipt link/evidence and final scoped balances. For failures give the exact fixture, reproduction steps, observed financial effect and focused fix recommendation. Run relevant existing regression checks if a test harness or authorised remediation is changed.

Finish with a clear recommendation: ready for Slice 1H, or blocked by specific current-workflow defects. Unsupported future formats alone should not block progress when safely rejected. Keep the test pass bounded; a concise reproducible report is sufficient, with no new testing platform required.
