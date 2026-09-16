# Coder handover — finish Unified Workspace acceptance

The assessor independently ran the real UI and all automated tests. 205 tests and TypeScript pass. The production build was blocked by fetching Inter from Google Fonts. The current UI is improved but not complete; please finish this existing scope before Cross-Owner Posting Automation.

Read `samples/UNIFIED_WORKSPACE_ASSESSMENT_2026-09-16.md`. Evidence and a retained fictional test vault are in `samples/unified-workspace-assessment-2026-09-16/`. Keep the live vault untouched during tests.

## Required fixes

1. Handle Everything as a view scope, not an entity ID. Accounts currently fails with `Entity not found: all`; Reports misrepresents that failure as missing exchange rates. Clear old summaries when the API returns null, when scope changes, or when requests fail. Show supported owner/currency component totals while complete consolidation is unavailable. Preserve selected scope across reloads.

2. Quick Add Account must visibly confirm owner and currency. In Everything it currently chooses the first business and hard-codes USD. Keep its successful return-to-draft behavior. Do not invent account ownership or opening balances.

3. Use a consistent explicit reporting date for current balances. At 09:38 on 16 September Sydney time, today-dated transactions were posted but default account balances were calculated as of 15 September. Correcting only form dates is insufficient. Render the returned balance date rather than the opening date.

4. Apply eligible payment-account rules in CSV/PDF approval as well as manual entry. Manual property payments now reject correctly, but a CSV approved against a house still posts an expense and reduces property value. Use shared semantic validation before the generic journal posting call.

5. Persist financial drafts in the local vault. Keep them excluded from posted totals. Include currency, amount in minor units, business, paying owner/account (or explicit unresolved fields), date, reimbursement intent and optional existing transaction/document links. Add validation, edit/resume and scope-aware display. Browser localStorage alone is not sufficient: the same vault opened through another browser origin has no drafts. Negative draft amounts currently save successfully. Posting automation may remain deferred.

6. Implement pagination/Load more. The UI asks for 1,000, but the service caps at 500. A 1,003-record owner shows 500 with no access to the rest. Include an accurate loaded/total count and stable filtering/order; do not simply raise the cap again.

7. Complete the ordinary transaction row: date, merchant/description, category, account, amount, currency, direction and owner. Preserve the correct tested mortgage total. Use Transactions / Add transaction / Save expense wording and optional Accounting details. Fix `void` versus `voided` so removed transactions do not retain an active Void action.

8. Resolve property-only/investments-only onboarding: the current Continue button accepts it but creates no owner and makes no progress. Ask for the owning person/business. Do not create fictitious properties or mortgages. Fix NaN and hard-coded currency formatting, and finish the basic dialog keyboard behavior.

## Acceptance tests

- Fresh vault: select personal+business; create a personal AUD account from Everything with explicit ownership/currency; return to the unfinished entry without losing it.
- Property-only onboarding has a clear next step; no fake accounts or balances are created.
- Everything → Accounts/Reports/Inbox works without passing `all` as an entity; scope remains after reload. Switching from Business to Everything never leaves misleading business-only summary cards.
- Sydney morning: AUD 1,000 opening balance entered today shows AUD 1,000 today, not zero. Repeat near a month boundary.
- Five-flow fixture: bank 1,703, savings 600, card debt 250, mortgage 199,900; income 1,000 and expenses 47. Verify both stored amounts and visible balances.
- House excluded/rejected as an ordinary payment account in manual and import workflows. Valid bank CSV approval still works.
- Draft survives reopening the same vault through another supported browser session, retains currency/account/source facts, allows correction, rejects invalid amounts, and never changes posted totals.
- All 1,003 records are reachable. Date/account/category/currency/direction are visible without expanding journal details.
- Void preserves history and updates UI status/actions. Keyboard users can open, operate and close the form; verify a real narrow viewport.

Keep the existing passing tests and add focused UI integration regressions. Report failures and untested areas explicitly. No new framework, full navigation rewrite, tax engine or complete cross-owner posting implementation is needed for these fixes.
