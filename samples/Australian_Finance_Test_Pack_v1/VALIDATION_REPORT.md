# Validation report — Australian Finance Test Pack v1

Prepared 15 September 2026. Repository HEAD during parser checks: `f39fecec53fc46832dadeafeeb7b3e21a5acb351`. Checks used the current working tree, which includes coder changes beyond HEAD; this is not a claim that HEAD alone reproduces every observed result.

| Check | Result |
|---|---|
| Canonical bank/card dataset | 119 movements, five accounts; all signed balance roll-forwards reconcile |
| Transfers and credit-card repayments | Paired equal/opposite amounts; no additional income/expense intended |
| Loan schedules | 660 rows; principal/interest/payment identities reconcile and both loans close at zero |
| Workbook calculation | All 660 formula rows checked against independent Decimal model; five account differences and three monthly rent differences zero |
| Saved XLSX | Six worksheet XML parts; 4001 formula cells with cached results; zero error-typed cells |
| CSV smoke test | Both starters, five primary files and alternative layout have zero parser errors; primary and alternative dates/amounts/descriptions match source |
| Invalid CSV values | Three malformed amounts and two invalid/missing dates flagged |
| JPY amount scale | -500 minor units confirmed |
| Paid receipt PDFs | Both extracted expected supplier, dates, totals and AUD currency |
| Unpaid invoice PDF | Known failure: currency DUE and supplier is synthetic banner; retained as regression fixture |
| Other statement PDFs | Four PDFs returned unsupported from existing invoice bridge |
| Visual review | Eleven PDF pages and workbook summary/rental sheets rendered and inspected |

Workbook arithmetic was checked using the artifact-tool calculation engine and exported XLSX values. Native Microsoft Excel recalculation was not exercised. Amortisation formula rows were checked numerically; no claim is made that every row of the two long sheets was visually inspected.

Duplicate, overlap, receipt-linking, approval, currency blocking, entity isolation and report totals require the isolated application workflow in README_START_HERE.md. A valid parser row is not proof of safe automatic posting. No application database was opened or written during these sample checks.

The unpaid-invoice observation is an extraction result, not proof that the application's approval guards can be bypassed. Keep the original fixture and fix/retest through the normal coder/assessor process.

Raw observations: `06_expected_results/csv_parser_observed.json` and `06_expected_results/pdf_extraction_observed.json`. Expected behaviour is separately recorded in `expected_results.json`, `starter_expected.json` and `edge_case_expectations.json`.
