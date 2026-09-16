# Australian Finance Test Pack v1

**Entirely fictional Australian household and company data.** Generated 15 September 2026 for OpenNetWorth testing. Period: 1 July to 30 September 2025. All base amounts are AUD. These documents are not real bank exports, lender offers, tax invoices or tax advice.

The pack tests a person's everyday spending, savings, credit card, rental property, two mortgages and a separate small company. Alex and Morgan Nguyen, Wattle Design Studio Pty Ltd and every institution/supplier in these files are fictional. No real bank credentials, BSBs, ABNs or TFNs are included.

## Start with the small scenario

Use a **fresh isolated test vault**, with the existing `npm run dev:test` setup on port 4005 only after confirming its database is the isolated test database. Do not import sample finances into the live vault on port 4000. The pack does not include a script that resets or modifies a vault.

1. Create a household entity and an AUD payment account called Everyday Checking. Set an opening balance of **AUD 1,000.00 on 30 June 2025**, using the application's existing opening-balance workflow.
2. Create a separate company entity and an AUD Business Operating account with an opening balance of **AUD 500.00 on 30 June 2025**. The external IDs in this pack are fixture labels; map them to the app's generated entity/account IDs.
3. Import `01_start_here/household_simple_expenses.csv` into the household account. Map Date to `Date`, date format **DD/MM/YYYY**, description to `Description`, signed amount to `Amount` and currency to **AUD**.
4. Review the three proposals. Assign the AUD 22 paper and AUD 15 pens purchases to office supplies, and AUD 79.88 broadband to utilities. Approve once.
5. Check three new financial transactions, household expenses **AUD 116.88**, and account balance **AUD 883.12**. Compare changes against the baseline if the opening-balance workflow creates its own transaction.
6. Upload `03_documents/receipt_office_supplies_22.pdf`. Check Waratah Office Supplies, 3 July 2025, AUD 22.00. Link it to the existing AUD 22 paper purchase. Do not approve a separate purchase for the receipt.
7. Confirm the link adds **zero financial postings**, changes the balance by **AUD 0.00**, and leaves three household transactions: one with a receipt, two without. Re-upload the exact same receipt and confirm there is still only one purchase.
8. Import `01_start_here/business_simple_expense.csv` into the company account, categorise as office supplies and approve. Link `03_documents/receipt_business_supplies_110.pdf` to its AUD 110 purchase dated 11 July. Expected company balance: **AUD 390.00**. Household results must remain unchanged.
9. Re-import the exact starter CSVs. The app should identify prior imports/duplicates and preserve transaction counts and balances. Record the observed workflow, including any review required.

Starter fixtures also provide clear questions for Slice 1H: household spending is AUD 116.88; office supplies AUD 37.00; utilities AUD 79.88; one of three household expenses has a receipt. The company transaction must not appear in a household-only answer.

**Do not use the full-quarter opening balances for this starter scenario.** Exact expected values are in `06_expected_results/starter_expected.json`.

## Full-quarter scenario: separate vault

The full scenario contains **119 unique bank/card movements across five accounts**, plus two loan schedules, three property-manager remittances and eight invoice-register entries. The starter transactions are a subset of this scenario: use a different isolated vault, or deliberately test overlap handling. Never blindly combine the two scenarios.

Set up the entities/accounts from `06_expected_results/accounts_setup.csv`. This file is a setup reference, not a supported account-import format. Opening balances are as at 30 June 2025. Negative credit-card balances in the fixture mean money owed; translate that to the app's liability-opening-balance convention rather than entering the sign blindly.

| Fixture account | Opening signed AUD | Closing signed AUD | Bank/card rows |
|---|---:|---:|---:|
| HH-EVERYDAY | 15,000.00 | 26,269.15 | 62 |
| HH-SAVINGS | 25,000.00 | 28,294.00 | 6 |
| HH-CARD | -600.00 | 0.00 | 29 |
| HH-RENTAL | 5,000.00 | 4,000.16 | 6 |
| BIZ-BANK | 20,000.00 | 34,575.00 | 16 |

Use the five `*_signed.csv` files in `02_bank_exports`. Map Date/Description/Amount as above. `Balance` and `Reference` are source evidence and reconciliation controls; do not create transactions from them or assume the current importer persists them.

The `hh_everyday_debit_credit_ALTERNATIVE.csv` file contains the **same 62 everyday transactions** in another common layout. Map `Transaction Date`, `Narrative`, `Debit` and `Credit`, with DD/MM/YYYY and debit/credit mode. Choose this file OR `hh-everyday_signed.csv` for a normal import, not both. Importing both belongs in a deliberate duplicate-detection test.

### Correct accounting targets

These are intended outcomes after appropriate classification; they are **not a claim that the current importer implements every outcome**.

- Savings transfers have an outflow and equal inflow. They move money between accounts and do not create income or expenses.
- Credit-card purchases are expenses. Card repayments reduce the bank account and card liability; do not count the repayment as another expense or as income on the card account.
- The two identical AUD 8.50 cafe rows on 9 August are two genuine fictional purchases. Similarity is a review signal, not enough evidence to delete one.
- The AUD 5 office-supplies refund reduces the related expense in this fixture. It is not new salary/business income.
- A mortgage payment contains principal and interest. Home-loan quarterly payments AUD 9,453.51 = principal AUD 1,531.27 + interest AUD 7,922.24. Rental-loan payments AUD 8,228.34 = principal AUD 1,677.25 + interest AUD 6,551.09. Principal reduces the loan; it is not an expense.
- Rent gross AUD 7,950.00 less management AUD 556.50 and repairs AUD 165.00 equals net bank deposits AUD 7,228.50. Reconcile the property statement and bank entry as the same flow; do not add both gross rent and the net deposit as independent income.
- The AUD 330 unpaid supplier invoice is not a cash payment. Retain it for review/future payable support. If accrual accounting is later implemented, it may create a payable under that workflow, not an invented bank withdrawal.
- Company finances remain a separate entity. The pack does not model company-share valuation, ownership allocation, consolidation, BAS, income-tax returns or statutory financial statements.

Use `transaction_classification.csv` to see the intended treatment of each source transaction. `expected_results.json` contains exact integer-cent account controls, income/expense categories, loan splits and evidence matches. Its gross business cash figures are deliberately not presented as a statutory P&L or a GST-credit calculation.

## File types and current compatibility

| Files | Purpose | Current verification / intended handling |
|---|---|---|
| Starter bank CSVs | Small import, approval and receipt-linking test | Parsed successfully using current app parser; perform UI/ledger checks above in isolation |
| Five signed bank CSVs | Full quarter of bank/card source records | All 119 amounts, dates and descriptions verified against current parser; complex classification requires review |
| Alternative debit/credit CSV | Same records with different column mapping | All 62 records verified with explicit mapping |
| Two paid receipt PDFs | Current receipt extraction/linking test | Current bridge correctly extracted supplier, date, AUD and total |
| Unpaid invoice PDF | Regression and future payable test | **Known extractor failure**, detailed below; not an approval-ready purchase |
| Bank and credit-card statement PDFs | Statement extraction/reconciliation fixtures | Current invoice bridge returned unsupported, as expected for these layouts |
| Property-manager and mortgage PDFs | Net-remittance and loan-split fixtures | Current invoice bridge returned unsupported; retain for future extraction support |
| Excel workbook | Human reference and future spreadsheet extraction | Six sheets with working formulas; XLSX import is not claimed to be supported by the current app |
| `*_NOT_BANK_IMPORT.csv` | Loan schedules, property statement and invoice register | Structured future extraction fixtures, not lists of bank transactions |
| Edge-case CSVs | Focused validation/duplicate/direction tests | Some are intentionally invalid or ambiguous; see expectations and observations |

All PDFs are native text PDFs. Scanned/image receipts, OCR, multiple real-bank layouts, investments, superannuation, foreign entities and FX can be added in later fixture packs. They are not prerequisites for using this pack or progressing the next bounded slice.

## Known failure discovered with this pack

For `03_documents/invoice_unpaid_330.pdf`, the current Python bridge reports `supported: true`, date 2025-09-20 and amount 330.00, but returns:

- currency `DUE`, although the document explicitly states AUD;
- supplier `SYNTHETIC SAMPLE - NOT A REAL TRANSACTION`, instead of Waratah Office Supplies.

This was observed by running the existing bridge on the generated file. It was not a browser/ledger approval test. The fixture must remain in the pack unchanged so a future fix can be checked against it. Desired extraction: supplier Waratah Office Supplies, currency AUD, invoice WOS-0920, date 2025-09-20, amount 330.00, unpaid. Where payment-state extraction is unavailable, keep the cash effect unresolved instead of assuming paid.

Coder task: use this fixture to reproduce the extraction problem, validate currency against supported codes, improve supplier selection, and verify an unpaid invoice cannot silently become a cash payment. Use the existing review workflow and a focused regression test. Do not add a new orchestration framework to fix this fixture.

## Edge-case tests

Run each in an isolated scenario with a documented starting state. `edge_case_expectations.json` is the intended behaviour; `csv_parser_observed.json` records only parser-level observations.

- Invalid amounts: all three rows rejected by current parser.
- Invalid/missing dates: both rows have blocking parser errors; recognised amounts do not make them approval-ready.
- Ambiguous dates: select DD/MM/YYYY explicitly. 07/08 means 7 August here.
- Duplicate-identical rows: two identical source rows represent an accidental duplicate in this separate fixture. Review before posting twice.
- Legitimate identical-value purchases: two separate purchases must be preservable. Identical date/description/value alone cannot distinguish this case from an accidental duplicate.
- JPY scale: use a separate JPY account. An outflow of JPY 500 is **-500 minor units**, not -50,000. This is a precision test, not an FX conversion scenario.
- Formula-like description: `=1+1` is literal untrusted transaction text. It must stay text; do not open this raw adversarial CSV in Excel and treat automatic formula evaluation as normal app behaviour.
- Incoming AUD 22: must not match the outgoing AUD 22 receipt merely because the absolute value matches.
- Partial overlap with starter: two already-imported purchases. Check cross-file review/deduplication; never infer that parser validity proves deduplication works.

## Mortgage assumptions and workbook

Home loan: AUD 520,000, fixed illustrative annual rate 6.10%, 360 months, scheduled monthly payment AUD 3,151.17.

Rental loan: AUD 410,000, illustrative rate 6.40%, 300 months, scheduled monthly payment AUD 2,742.78.

Interest is opening principal multiplied by annual rate / 12, rounded to cents monthly. The final payment is adjusted to clear the remaining principal. The first three payments are fictional quarter actuals; all later rows are projections. This simplified model does not represent a specific Australian lender's daily-interest, offset, redraw, fee or rate-change methodology. The rates are invented assumptions, not researched offers.

`04_workbook/Australian_Finance_Sample.xlsx` contains Account Summary, Home Mortgage, Rental Mortgage, Rental Statement, Bank Movements and Invoice Register. Formula-driven account controls reconcile to the canonical data. All **660 formula amortisation rows** match an independently calculated Decimal/integer-cent schedule, including adjusted final payments and zero closing principal. The workbook's dates are real date cells and monetary values have AUD two-decimal formatting.

## Verification performed

- Generated source IDs, account roll-forwards, transfer pairs, rental remittances and loan splits checked for internal consistency.
- Current pure TypeScript CSV parser checked against all primary bank rows, the alternative layout and both starter files. No database was opened for these checks.
- Current OpenTax bridge run against all seven generated PDFs; observed JSON is included.
- All eleven PDF pages rendered and visually inspected; summary and rental workbook sheets rendered and visually inspected.
- Workbook formulas recalculated and compared with the independent source model. See VALIDATION_REPORT.md for scope and saved-file checks.

No application source files were changed. No records were imported into the live or test application database while preparing this pack. These parser checks do not constitute end-to-end approval, reporting or browser acceptance of the new files. The starter steps are the next isolated UI test.

## Source conventions and licence

The transaction values, identities, employers, loan rates and documents are authored synthetic data. Do not infer that any named provider is a real institution or that the files reproduce a particular bank's proprietary export format.

Australian GST examples use the ATO's general 10% convention: [ATO GST fast facts](https://smallbusiness.taxsuperandyou.gov.au/goods-and-services-tax/fast-facts). Residential rent is treated as input taxed in this fixture: [ATO property and construction guidance](https://www.ato.gov.au/law/view/view.htm?docid=GIR/property-construction-ch5). These references support the chosen fixture conventions; entitlement to credits or tax deductions is outside the fixture's scope.

The authored synthetic data and sample documents in this pack are offered under CC0 1.0 for reuse in the open-source project and its tests. No third-party source documents or bank logos are redistributed. The referenced application code and software tools retain their existing licences.
