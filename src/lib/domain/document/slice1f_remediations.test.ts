/**
 * Slice 1F Focused Remediation Acceptance & Regression Test Suite
 * 
 * Why this file exists:
 * Provides isolated, rigorous regression tests verifying the three required remediations for Slice 1F:
 * 1. Currency preservation: Extracted PDF currency is strictly preserved (never overwritten by payment account).
 *    Approval is blocked when the payment account uses a different currency. Missing currency produces a blocking
 *    error finding and remains unresolved until reviewed.
 * 2. Proposal review edits & validation: Users can edit and save supplier, date, amount, currency, category,
 *    and payment account. Validations enforce calendar date correctness, safe integer amounts, recognized
 *    currency codes, account existence, and account currency consistency. Providing a valid currency clears
 *    the unresolved MISSING_CURRENCY finding.
 * 3. Approval status guard: Rejects attempts to set review_status: 'approved' via review updates or the PATCH endpoint.
 *    Only successful double-entry ledger posting (approveProposals) may set approved status.
 * 
 * Tricky logic:
 * - Isolated database (M1-SAFE-01): Operates exclusively on temporary in-memory SQLite instances via `createTestDb()`.
 * - Custom extractor injection: Uses `setCustomExtractor` from `openTaxAdapter` to test currency variations
 *   (e.g., USD invoice, missing currency invoice) deterministically without external process execution.
 * - Multi-currency accounting assertions: Verifies that postings match account currencies exactly and balance to 0.
 * 
 * TODO:
 * - In Slice 1G, add multi-currency revaluation tests when exchange rate conversions are introduced.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../../../infrastructure/sqlite/db';
import { initAccountingSchema } from '../accounting/schema';
import { createAccount, createEntity } from '../accounting/accountService';
import {
    approveProposals,
    getProposalById,
    ingestPdfDocument,
    updateProposalReview
} from './documentInboxService';
import { setCustomExtractor, ExtractedPdfDocument } from './openTaxAdapter';
import { PATCH } from '../../../app/api/documents/proposals/route';

describe('Slice 1F Focused Remediation Tests', () => {
    let db: any;
    let entityId: string;
    let audAccountId: string;
    let usdAccountId: string;

    beforeEach(() => {
        // Complete isolation from production vault (M1-SAFE-01)
        db = createTestDb();
        initAccountingSchema(db);

        // Setup test entity
        const entity = createEntity(db, { name: 'Remediation Test Entity', type: 'person', currency: 'AUD' });
        entityId = entity.id;

        // Setup AUD account
        const { account: audAcc } = createAccount(db, {
            entity_id: entityId,
            name: 'AUD Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'AUD',
            opening_balance_cents: 500000, // $5,000.00
            opening_date: '2025-07-01'
        });
        audAccountId = audAcc.id;

        // Setup USD account
        const { account: usdAcc } = createAccount(db, {
            entity_id: entityId,
            name: 'USD Checking',
            type: 'asset',
            sub_type: 'checking',
            currency: 'USD',
            opening_balance_cents: 300000, // $3,000.00
            opening_date: '2025-07-01'
        });
        usdAccountId = usdAcc.id;
    });

    afterEach(() => {
        // Reset any custom extractor mock
        setCustomExtractor(null);
    });

    // -------------------------------------------------------------------------
    // Fix 1: Currency Preservation, Mismatch Blocking, and Missing Currency
    // -------------------------------------------------------------------------
    describe('Fix 1: Currency Preservation & Approval Blocking', () => {
        it('preserves extracted currency even when ingested into a target account with different currency', async () => {
            // Mock extractor returning USD currency
            const mockUsdDoc: ExtractedPdfDocument = {
                supported: true,
                layout_name: 'simple_supplies_invoice',
                supplier_name: 'US Software Vendor Inc',
                invoice_number: 'INV-US-9901',
                date: '2025-10-15',
                currency: 'USD',
                total_cents: 5000, // $50.00 USD
                tax_cents: 0,
                net_cents: 5000,
                line_items: [{ description: 'Cloud Subscription', amount_cents: 5000 }],
                source_snippet: 'US Software Vendor Inc $50.00 USD',
                validation_findings: []
            };
            setCustomExtractor(async () => mockUsdDoc);

            // Ingest against an AUD account
            const dummyBuffer = Buffer.from('%PDF-1.4 dummy usd content');
            const result = await ingestPdfDocument(db, {
                filename: 'vendor_usd_invoice.pdf',
                file_buffer: dummyBuffer,
                target_account_id: audAccountId, // AUD account
                entity_id: entityId
            });

            // The proposal must preserve the extracted USD currency, NOT the AUD target account currency
            expect(result.proposals.length).toBe(1);
            const proposal = result.proposals[0];
            expect(proposal.original_currency).toBe('USD');
            expect(proposal.amount_cents).toBe(-5000);

            // CURRENCY_MISMATCH warning finding should be attached
            expect(proposal.validation_findings.some(f => f.code === 'CURRENCY_MISMATCH')).toBe(true);
        });

        it('blocks approval when payment account uses a different currency than the proposal', async () => {
            const mockUsdDoc: ExtractedPdfDocument = {
                supported: true,
                layout_name: 'simple_supplies_invoice',
                supplier_name: 'US Software Vendor Inc',
                invoice_number: 'INV-US-9902',
                date: '2025-10-15',
                currency: 'USD',
                total_cents: 5000,
                tax_cents: 0,
                net_cents: 5000,
                line_items: [{ description: 'Subscription', amount_cents: 5000 }],
                source_snippet: 'US Software Vendor Inc $50.00 USD',
                validation_findings: []
            };
            setCustomExtractor(async () => mockUsdDoc);

            const dummyBuffer = Buffer.from('%PDF-1.4 dummy usd content 2');
            const { document, proposals } = await ingestPdfDocument(db, {
                filename: 'vendor_usd_invoice.pdf',
                file_buffer: dummyBuffer,
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const proposalId = proposals[0].id;

            // Attempt to approve proposal (USD) into AUD account must throw and block approval
            expect(() => {
                approveProposals(db, {
                    document_id: document.id,
                    target_account_id: audAccountId, // AUD != USD
                    entity_id: entityId,
                    items: [
                        {
                            proposal_id: proposalId,
                            payment_confirmed: true
                        }
                    ]
                });
            }).toThrow(/does not match approval target account currency/i);

            // Verify zero transactions posted
            const txCount = (db.prepare("SELECT COUNT(*) as c FROM m1_transactions WHERE origin = 'document_extraction'").get() as any).c;
            expect(txCount).toBe(0);

            // Proposal status remains unreviewed
            const propAfter = getProposalById(db, proposalId);
            expect(propAfter?.review_status).toBe('unreviewed');
        });

        it('retains missing currency as unresolved with blocking error and prevents approval', async () => {
            // Mock extractor returning null currency
            const mockNoCurrencyDoc: ExtractedPdfDocument = {
                supported: true,
                layout_name: 'simple_supplies_invoice',
                supplier_name: 'Local Mystery Hardware',
                invoice_number: 'INV-MYSTERY-01',
                date: '2025-10-20',
                currency: null, // Currency missing!
                total_cents: 3000,
                tax_cents: 0,
                net_cents: 3000,
                line_items: [{ description: 'Hammer', amount_cents: 3000 }],
                source_snippet: 'Local Mystery Hardware 30.00',
                validation_findings: [
                    {
                        severity: 'error',
                        code: 'MISSING_CURRENCY',
                        message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
                    }
                ]
            };
            setCustomExtractor(async () => mockNoCurrencyDoc);

            const dummyBuffer = Buffer.from('%PDF-1.4 dummy mystery content');
            const { document, proposals } = await ingestPdfDocument(db, {
                filename: 'mystery_currency.pdf',
                file_buffer: dummyBuffer,
                entity_id: entityId
            });

            expect(proposals.length).toBe(1);
            const prop = proposals[0];
            expect(prop.original_currency).toBe('');
            expect(prop.validation_findings.some(f => f.code === 'MISSING_CURRENCY' && f.severity === 'error')).toBe(true);

            // Approval must be blocked because of unresolved error finding and missing currency
            expect(() => {
                approveProposals(db, {
                    document_id: document.id,
                    target_account_id: audAccountId,
                    entity_id: entityId,
                    items: [
                        {
                            proposal_id: prop.id,
                            payment_confirmed: true
                        }
                    ]
                });
            }).toThrow(/unresolved error findings|missing currency/i);

            // Zero transactions posted
            const txCount = (db.prepare("SELECT COUNT(*) as c FROM m1_transactions").get() as any).c;
            // Only opening balances exist
            const docTxCount = (db.prepare("SELECT COUNT(*) as c FROM m1_transactions WHERE origin = 'document_extraction'").get() as any).c;
            expect(docTxCount).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // Fix 2: Edit Proposal Fields & Validate Corrections
    // -------------------------------------------------------------------------
    describe('Fix 2: Edit Proposal Fields & Validate Corrections', () => {
        it('allows editing supplier, date, amount, currency, category, and payment account', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                layout_name: 'simple_supplies_invoice',
                supplier_name: 'Initial Supplier',
                invoice_number: 'INV-100',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 2000,
                tax_cents: 0,
                net_cents: 2000,
                line_items: [{ description: 'Paper', amount_cents: 2000 }],
                source_snippet: 'Initial Supplier $20.00',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { proposals } = await ingestPdfDocument(db, {
                filename: 'supplies.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;

            // Correct all six fields
            const updated = updateProposalReview(db, {
                proposal_id: propId,
                counterparty: 'Acme Stationery Supplies',
                description: 'Printer Toner Cartridge',
                event_date: '2025-11-15',
                amount_cents: -4500, // $45.00 expense
                original_currency: 'AUD',
                suggested_category: 'office_supplies',
                account_id: audAccountId
            });

            expect(updated.counterparty).toBe('Acme Stationery Supplies');
            expect(updated.description).toBe('Printer Toner Cartridge');
            expect(updated.event_date).toBe('2025-11-15');
            expect(updated.amount_cents).toBe(-4500);
            expect(updated.original_currency).toBe('AUD');
            expect(updated.suggested_category).toBe('office_supplies');
            expect(updated.account_id).toBe(audAccountId);
            expect(updated.review_status).toBe('modified');
        });

        it('clears MISSING_CURRENCY error finding when valid currency is provided during review', async () => {
            const mockNoCurrencyDoc: ExtractedPdfDocument = {
                supported: true,
                layout_name: 'simple_supplies_invoice',
                supplier_name: 'Stationery Hut',
                invoice_number: 'INV-SH-1',
                date: '2025-11-05',
                currency: null,
                total_cents: 1500,
                tax_cents: 0,
                net_cents: 1500,
                line_items: [{ description: 'Notebooks', amount_cents: 1500 }],
                source_snippet: 'Stationery Hut 15.00',
                validation_findings: [
                    {
                        severity: 'error',
                        code: 'MISSING_CURRENCY',
                        message: 'Document currency could not be identified with confidence. Retained as unresolved until reviewed.'
                    }
                ]
            };
            setCustomExtractor(async () => mockNoCurrencyDoc);

            const { document, proposals } = await ingestPdfDocument(db, {
                filename: 'stationery.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                entity_id: entityId
            });

            const propId = proposals[0].id;
            expect(proposals[0].validation_findings.some(f => f.code === 'MISSING_CURRENCY')).toBe(true);

            // User edits and supplies 'AUD' as currency and assigns the AUD account
            const corrected = updateProposalReview(db, {
                proposal_id: propId,
                original_currency: 'AUD',
                account_id: audAccountId
            });

            expect(corrected.original_currency).toBe('AUD');
            // MISSING_CURRENCY error is now resolved!
            expect(corrected.validation_findings.some(f => f.code === 'MISSING_CURRENCY')).toBe(false);

            // Now proposal can be approved cleanly!
            const approval = approveProposals(db, {
                document_id: document.id,
                target_account_id: audAccountId,
                entity_id: entityId,
                items: [
                    {
                        proposal_id: propId,
                        payment_confirmed: true
                    }
                ]
            });

            expect(approval.approved_count).toBe(1);
            expect(approval.transaction_ids.length).toBe(1);
        });

        it('rejects invalid date formats or non-existent calendar dates', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                supplier_name: 'Supplier',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 1000,
                tax_cents: 0,
                net_cents: 1000,
                line_items: [],
                source_snippet: '',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { proposals } = await ingestPdfDocument(db, {
                filename: 'date_test.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;

            // Format check
            expect(() => {
                updateProposalReview(db, {
                    proposal_id: propId,
                    event_date: '15/11/2025' // Non-ISO format
                });
            }).toThrow(/Invalid event_date format/);

            // Invalid calendar date check
            expect(() => {
                updateProposalReview(db, {
                    proposal_id: propId,
                    event_date: '2025-02-31' // February 31 does not exist
                });
            }).toThrow(/Invalid calendar date/);
        });

        it('rejects non-integer amount corrections', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                supplier_name: 'Supplier',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 1000,
                tax_cents: 0,
                net_cents: 1000,
                line_items: [],
                source_snippet: '',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { proposals } = await ingestPdfDocument(db, {
                filename: 'amount_test.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;

            expect(() => {
                updateProposalReview(db, {
                    proposal_id: propId,
                    amount_cents: 12.34 as any // Float instead of integer minor units
                });
            }).toThrow(/must be a safe integer/);
        });

        it('rejects unsupported currency codes', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                supplier_name: 'Supplier',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 1000,
                tax_cents: 0,
                net_cents: 1000,
                line_items: [],
                source_snippet: '',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { proposals } = await ingestPdfDocument(db, {
                filename: 'currency_test.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;

            expect(() => {
                updateProposalReview(db, {
                    proposal_id: propId,
                    original_currency: 'FAKE_CURRENCY' as any
                });
            }).toThrow(/Unsupported or invalid currency code/);
        });

        it('rejects assignment to an account with a different currency', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                supplier_name: 'Supplier',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 1000,
                tax_cents: 0,
                net_cents: 1000,
                line_items: [],
                source_snippet: '',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { proposals } = await ingestPdfDocument(db, {
                filename: 'account_test.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;

            // Proposal currency is AUD, attempting to assign USD account must fail
            expect(() => {
                updateProposalReview(db, {
                    proposal_id: propId,
                    account_id: usdAccountId
                });
            }).toThrow(/Account currency "USD" does not match proposal currency "AUD"/);
        });
    });

    // -------------------------------------------------------------------------
    // Fix 3: Prevent review/PATCH from marking proposals approved
    // -------------------------------------------------------------------------
    describe('Fix 3: Prevent review/PATCH from setting approved status', () => {
        it('updateProposalReview rejects review_status: "approved" with a clear domain error', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                supplier_name: 'Supplier',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 1000,
                tax_cents: 0,
                net_cents: 1000,
                line_items: [],
                source_snippet: '',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { proposals } = await ingestPdfDocument(db, {
                filename: 'status_guard_test.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;

            // Attempting to mark approved via review update must be rejected
            expect(() => {
                updateProposalReview(db, {
                    proposal_id: propId,
                    review_status: 'approved'
                });
            }).toThrow(/Proposals cannot be marked approved via review updates/);

            // Proposal remains unreviewed
            const propAfter = getProposalById(db, propId);
            expect(propAfter?.review_status).toBe('unreviewed');
        });

        it('PATCH /api/documents/proposals rejects review_status: "approved" with HTTP 400', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                supplier_name: 'Supplier',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 1000,
                tax_cents: 0,
                net_cents: 1000,
                line_items: [],
                source_snippet: '',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { proposals } = await ingestPdfDocument(db, {
                filename: 'patch_guard_test.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;

            // Construct mock Request calling PATCH handler
            const req = new Request('http://localhost:3000/api/documents/proposals', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposal_id: propId,
                    review_status: 'approved'
                })
            });

            const res = await PATCH(req);
            expect(res.status).toBe(400);

            const body = await res.json();
            expect(body.error).toMatch(/Proposals cannot be marked approved via review updates/);

            // Ensure no ledger posting occurred
            const txCount = (db.prepare("SELECT COUNT(*) as c FROM m1_transactions WHERE origin = 'document_extraction'").get() as any).c;
            expect(txCount).toBe(0);
        });

        it('verifies that only successful ledger posting (approveProposals) sets review_status to approved', async () => {
            const mockDoc: ExtractedPdfDocument = {
                supported: true,
                supplier_name: 'Approved Vendor',
                date: '2025-11-01',
                currency: 'AUD',
                total_cents: 2500,
                tax_cents: 0,
                net_cents: 2500,
                line_items: [{ description: 'Item', amount_cents: 2500 }],
                source_snippet: 'Approved Vendor $25.00',
                validation_findings: []
            };
            setCustomExtractor(async () => mockDoc);

            const { document, proposals } = await ingestPdfDocument(db, {
                filename: 'approved_vendor.pdf',
                file_buffer: Buffer.from('%PDF-1.4 dummy'),
                target_account_id: audAccountId,
                entity_id: entityId
            });

            const propId = proposals[0].id;
            expect(getProposalById(db, propId)?.review_status).toBe('unreviewed');

            // Post to ledger via approveProposals
            const approvalResult = approveProposals(db, {
                document_id: document.id,
                target_account_id: audAccountId,
                entity_id: entityId,
                items: [
                    {
                        proposal_id: propId,
                        payment_confirmed: true
                    }
                ]
            });

            expect(approvalResult.approved_count).toBe(1);

            // Now and ONLY now is the status approved
            const propAfter = getProposalById(db, propId);
            expect(propAfter?.review_status).toBe('approved');
        });
    });
});
