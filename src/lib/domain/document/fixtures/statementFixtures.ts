/**
 * Synthetic Statement PDF Fixture Generators
 * 
 * Why this file exists:
 * Fulfills Delivery 2B Acceptance Fixtures:
 * Provides deterministic, repeatable synthetic Australian statement PDFs with selectable text
 * for automated unit, integration, and browser testing.
 * 
 * Tricky logic:
 * - Uses jsPDF to generate valid binary PDF byte buffers in-memory without disk I/O.
 * - Scanned/image simulation: generates a page without text rendering (or with an image vector)
 *   so pdf-parse correctly assesses it as containing zero selectable text.
 * - Multi-page layouts: tests cross-page header context propagation, two-column statement structures,
 *   credit limits, redraw, and portfolio components.
 * 
 * TODO: In Milestone 2, add synthetic New Zealand and UK statement templates.
 */

import { jsPDF } from 'jspdf';

/**
 * 1. Credit Card Statement:
 * Commonwealth Bank Diamond Awards Credit Card
 * Limit ($10,000.00), Available Credit ($8,500.00), Closing Balance ($1,500.00)
 */
export function createCreditCardStatementPdf(): Buffer {
    const doc = new jsPDF();
    doc.text('Commonwealth Bank of Australia', 14, 20);
    doc.text('Diamond Awards Credit Card •••• 4421', 14, 30);
    doc.text('Statement Date: 15 Mar 2026', 14, 40);
    doc.text('Currency: AUD', 14, 50);
    doc.text('Account Summary', 14, 65);
    doc.text('Credit Limit: $10,000.00', 14, 75);
    doc.text('Available Credit: $8,500.00', 14, 85);
    doc.text('Closing Balance: $1,500.00', 14, 95);
    doc.text('Minimum Payment Due: $50.00', 14, 105);
    return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 2. Mortgage Statement:
 * Macquarie Bank Smart Home Loan
 * Outstanding Principal ($450,000.00), Available Redraw ($25,000.00)
 */
export function createMortgageStatementPdf(): Buffer {
    const doc = new jsPDF();
    doc.text('Macquarie Bank', 14, 20);
    doc.text('Smart Home Loan •••• 9812', 14, 30);
    doc.text('Statement Period Ending: 2026-03-31', 14, 40);
    doc.text('All amounts in Australian Dollars (AUD)', 14, 50);
    doc.text('Loan Balance Summary', 14, 65);
    doc.text('Outstanding Loan Principal: $450,000.00', 14, 75);
    doc.text('Available Redraw: $25,000.00', 14, 85);
    return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 3. Superannuation / Investment Statement:
 * Hostplus Superannuation Fund
 * Total Portfolio Value ($120,000.00), Included Cash ($15,000.00)
 */
export function createSuperInvestmentStatementPdf(): Buffer {
    const doc = new jsPDF();
    doc.text('Hostplus Superannuation Fund', 14, 20);
    doc.text('Accumulation Account •••• 7731', 14, 30);
    doc.text('As at: 31/03/2026', 14, 40);
    doc.text('Currency: AUD', 14, 50);
    doc.text('Portfolio Valuation Summary', 14, 65);
    doc.text('Total Portfolio Value: $120,000.00', 14, 75);
    doc.text('Cash Option: $15,000.00', 14, 85);
    doc.text('Australian Shares Option: $105,000.00', 14, 95);
    return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 4. Multi-Owner Statement (Same-named accounts across different owners):
 * Account: Everyday Checking •••• 1111 (Alice Smith)
 * Account: Everyday Checking •••• 2222 (Bob Jones)
 */
export function createJointDifferentOwnersStatementPdf(): Buffer {
    const doc = new jsPDF();
    doc.text('Westpac Banking Corporation', 14, 20);
    doc.text('Statement Date: 2026-03-31', 14, 30);
    doc.text('Currency: AUD', 14, 40);
    doc.text('Customer Name: Alice Smith', 14, 55);
    doc.text('Everyday Checking •••• 1111: $4,250.00', 14, 65);
    doc.text('Customer Name: Bob Jones', 14, 80);
    doc.text('Everyday Checking •••• 2222: $6,780.00', 14, 90);
    return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 5. Text Cover Page Followed by Scanned Financial Page:
 * Page 1 contains selectable summary text.
 * Page 2 contains zero selectable text (simulating a scanned image page).
 * Tests partial coverage evaluation and disclosure.
 */
export function createTextCoverThenScannedPdf(): Buffer {
    const doc = new jsPDF();
    // Page 1: Selectable text cover
    doc.text('Commonwealth Bank Statement Notice', 14, 20);
    doc.text('Statement Period: 01 Mar 2026 to 31 Mar 2026', 14, 30);
    doc.text('Important notice regarding your financial statements.', 14, 40);

    // Page 2: Blank / scanned (zero text rendered)
    doc.addPage();
    // Draw an empty rectangle simulating an image placeholder without text
    doc.rect(10, 10, 190, 270);

    return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 6. Date & Currency on Page 1, Balances on Page 2:
 * Page 1 has Institution, Statement Date (15 Mar 2026), Currency (AUD), Account (Smart Loan 1234).
 * Page 2 has the balance lines without re-stating the date/currency.
 * Tests cross-page context propagation.
 */
export function createDateCurrencyPage1BalancePage2Pdf(): Buffer {
    const doc = new jsPDF();
    // Page 1: Header Context
    doc.text('Macquarie Bank', 14, 20);
    doc.text('Smart Loan 1234', 14, 30);
    doc.text('Statement Date: 15 Mar 2026', 14, 40);
    doc.text('Currency: AUD', 14, 50);
    doc.text('Please see page 2 for your account balances.', 14, 65);

    // Page 2: Balances
    doc.addPage();
    doc.text('Account Balances Summary', 14, 20);
    doc.text('Current Balance: $320,000.00', 14, 35);
    doc.text('Redraw Available: $15,000.00', 14, 45);

    return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 7. Two-Column Statement with Nearby Unrelated Amounts:
 * Two columns: left column contains summary balances (Limit, Available, Closing Balance).
 * Right column contains individual transactions (Woolworths $85.20, Shell $110.00).
 * Tests reading order resilience and filtering of individual transaction rows.
 */
export function createTwoColumnStatementPdf(): Buffer {
    const doc = new jsPDF();
    doc.text('ANZ Platinum Credit Card •••• 5532', 14, 20);
    doc.text('Statement Date: 2026-03-31', 14, 30);
    doc.text('Currency: AUD', 14, 40);

    // Summary Box (Balances)
    doc.text('Account Summary', 14, 55);
    doc.text('Credit Limit: $8,000.00', 14, 65);
    doc.text('Available Credit: $6,200.00', 14, 75);
    doc.text('Closing Balance: $1,800.00', 14, 85);

    // Nearby Individual Transactions (should not be extracted as balances)
    doc.text('Recent Transactions', 110, 55);
    doc.text('12 Mar Woolworths $85.20', 110, 65);
    doc.text('14 Mar Shell Coles Express $110.00', 110, 75);
    doc.text('18 Mar Chemist Warehouse $42.50', 110, 85);

    return Buffer.from(doc.output('arraybuffer'));
}

/**
 * 8. Completely Scanned Image-Only PDF:
 * Zero selectable text across all pages.
 * Tests actionable error reporting ("No selectable text found. Requires OCR.").
 */
export function createScannedImageStatementPdf(): Buffer {
    const doc = new jsPDF();
    doc.rect(10, 10, 190, 270);
    doc.addPage();
    doc.rect(10, 10, 190, 270);
    return Buffer.from(doc.output('arraybuffer'));
}
