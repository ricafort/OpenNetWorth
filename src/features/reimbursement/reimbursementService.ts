import Database from 'better-sqlite3';
import crypto from 'crypto';
import { Account, Entity, CurrencyCode, Transaction, ReimbursementWorkflow, TransactionCorrection } from '../../lib/domain/accounting/types';
import { getEntity, createAccount, listAccounts, ConflictError } from '../../lib/domain/accounting/accountService';
import { postTransaction, correctTransaction, assertEligiblePaymentAccount } from '../../lib/domain/accounting/transactionService';

export interface ProcessPersonallyPaidExpenseInput {
    personalEntityId: string;
    businessEntityId: string;
    currency: CurrencyCode;
    amountCents: number;
    date: string;
    merchant?: string | null;
    description: string;
    sourceType: 'draft' | 'posted_transaction';
    sourceId: string; // draft id or transaction id
    paymentAccountId: string; // the personal bank account used
    businessExpenseAccountId: string; // the business expense category account
    evidenceDocumentId?: string | null;
    expectedRevision?: number;
    performedBy: string;
}

function extractDocumentId(ref: any): string | null {
    if (!ref) return null;
    if (typeof ref === 'string') {
        try {
            const parsed = JSON.parse(ref);
            if (parsed && typeof parsed === 'object') {
                return parsed.document_id || parsed.id || null;
            }
        } catch {
            return ref;
        }
    }
    if (typeof ref === 'object') {
        return ref.document_id || ref.id || null;
    }
    return null;
}

export function getOrCreateClearingAccounts(db: Database.Database, personalEntityId: string, businessEntityId: string, currency: CurrencyCode): { dueFromAccount: Account, dueToAccount: Account } {
    const personalEntity = getEntity(db, personalEntityId);
    if (!personalEntity) throw new Error(`Personal entity not found: ${personalEntityId}`);

    const businessEntity = getEntity(db, businessEntityId);
    if (!businessEntity) throw new Error(`Business entity not found: ${businessEntityId}`);

    // Check existing workflows first
    const existingWf = db.prepare(`
        SELECT due_from_account_id, due_to_account_id 
        FROM m1_reimbursement_workflows
        WHERE personal_entity_id = ? AND business_entity_id = ? AND currency = ?
        LIMIT 1
    `).get(personalEntityId, businessEntityId, currency) as any;

    if (existingWf) {
        const dueFromAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(existingWf.due_from_account_id) as Account;
        const dueToAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(existingWf.due_to_account_id) as Account;
        if (dueFromAccount && dueToAccount) {
            return { dueFromAccount, dueToAccount };
        }
    }

    const expectedDueFromName = `Due from ${businessEntity.name}`;
    const expectedDueToName = `Due to ${personalEntity.name}`;

    const personalAccounts = listAccounts(db, personalEntityId);
    let dueFromAccount = personalAccounts.find(a => a.type === 'asset' && a.sub_type === 'other' && a.currency === currency && a.account_number_mask === businessEntityId);
    if (!dueFromAccount) {
        dueFromAccount = createAccount(db, {
            entity_id: personalEntityId,
            name: expectedDueFromName,
            type: 'asset',
            sub_type: 'other',
            currency,
            tracking_mode: 'transactions',
            account_number_mask: businessEntityId
        }).account;
    }

    const businessAccounts = listAccounts(db, businessEntityId);
    let dueToAccount = businessAccounts.find(a => a.type === 'liability' && a.sub_type === 'other' && a.currency === currency && a.account_number_mask === personalEntityId);
    if (!dueToAccount) {
        dueToAccount = createAccount(db, {
            entity_id: businessEntityId,
            name: expectedDueToName,
            type: 'liability',
            sub_type: 'other',
            currency,
            tracking_mode: 'transactions',
            account_number_mask: personalEntityId
        }).account;
    }

    return { dueFromAccount, dueToAccount };
}

export function processPersonallyPaidBusinessExpense(db: Database.Database, input: ProcessPersonallyPaidExpenseInput): ReimbursementWorkflow {
    const runAtomic = db.transaction(() => {
        if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
            throw new Error('Expense amount must be a positive safe integer.');
        }

        const paymentAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.paymentAccountId) as Account;
        if (!paymentAccount || paymentAccount.entity_id !== input.personalEntityId) {
            throw new Error('Payment account must belong to the selected personal entity.');
        }
        if (paymentAccount.currency !== input.currency) {
            throw new Error('Payment account currency must match the expense currency.');
        }
        assertEligiblePaymentAccount(paymentAccount);

        const businessExpenseAccount = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.businessExpenseAccountId) as Account;
        if (!businessExpenseAccount || businessExpenseAccount.entity_id !== input.businessEntityId || businessExpenseAccount.type !== 'expense') {
            throw new Error('Business expense account must belong to the business entity and be of type expense.');
        }
        if (businessExpenseAccount.currency !== input.currency) {
            throw new Error('Business expense account currency must match the expense currency.');
        }

        let effectiveSourceType = input.sourceType;
        let effectiveSourceId = input.sourceId;
        
        let draft: any = null;
        let evidenceRefs: any[] | undefined = input.evidenceDocumentId ? [input.evidenceDocumentId] : undefined;

        if (input.sourceType === 'draft') {
            draft = db.prepare('SELECT * FROM m1_drafts WHERE id = ?').get(input.sourceId) as any;
            if (!draft) throw new Error(`Draft not found: ${input.sourceId}`);

            if (draft.status !== 'draft' && draft.status !== 'posted') {
                throw new Error('Draft is not in a valid state to be posted.');
            }
            if (draft.reimbursement_intent !== 'yes') {
                throw new Error('Draft must have reimbursement intent to process as personally paid expense.');
            }
            if (draft.amount_cents !== input.amountCents || draft.currency !== input.currency || draft.date !== input.date || draft.payer_entity_id !== input.personalEntityId || draft.payment_account_id !== input.paymentAccountId || (draft.entity_id && draft.entity_id !== input.businessEntityId)) {
                throw new Error('Draft facts do not match provided input. Please explicitly correct the draft first.');
            }
            
            if (!input.evidenceDocumentId && draft.source_document_id) {
                evidenceRefs = [draft.source_document_id];
            } else if (input.evidenceDocumentId && draft.source_document_id && input.evidenceDocumentId !== draft.source_document_id) {
                throw new Error('Draft evidence does not match provided input.');
            }

            if (draft.source_transaction_id) {
                effectiveSourceType = 'posted_transaction';
                effectiveSourceId = draft.source_transaction_id;
            }
        }

        let plainEvidenceDocumentId = extractDocumentId(input.evidenceDocumentId) || extractDocumentId(draft?.source_document_id) || null;
        if (plainEvidenceDocumentId) {
            const docExists = db.prepare('SELECT id FROM m1_documents WHERE id = ?').get(plainEvidenceDocumentId);
            if (!docExists) {
                throw new Error(`Referenced evidence document not found: ${plainEvidenceDocumentId}`);
            }
        }



        // 1. Get or create clearing accounts
        const { dueFromAccount, dueToAccount } = getOrCreateClearingAccounts(db, input.personalEntityId, input.businessEntityId, input.currency);

        let personalTxId: string;
        let businessTxId: string;
        let draftId = input.sourceType === 'draft' ? input.sourceId : null;

        if (effectiveSourceType === 'draft') {
            const existingWf = db.prepare(`SELECT * FROM m1_reimbursement_workflows WHERE status != 'cancelled' AND draft_id = ?`).get(effectiveSourceId) as ReimbursementWorkflow;
            if (existingWf) {
                if (existingWf.amount_cents !== input.amountCents || existingWf.currency !== input.currency || existingWf.personal_entity_id !== input.personalEntityId || existingWf.business_entity_id !== input.businessEntityId) {
                    throw new Error('Conflicting reimbursement workflow exists for this draft. Changed financial details or owners require explicit correction.');
                }

                const personalPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingWf.personal_transaction_id) as any[];
                const businessPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingWf.business_transaction_id) as any[];
                
                const persCredit = personalPostings.find(p => p.amount_cents < 0 && p.account_id === input.paymentAccountId);
                const busDebit = businessPostings.find(p => p.amount_cents > 0 && p.account_id === input.businessExpenseAccountId);
                
                const persTx = db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(existingWf.personal_transaction_id) as any;
                const busTx = db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(existingWf.business_transaction_id) as any;

                if (!persCredit || !busDebit || persTx.date !== input.date || busTx.date !== input.date) {
                    throw new Error('Conflicting reimbursement workflow exists for this draft. Changed financial details or owners require explicit correction.');
                }

                return existingWf;
            }

            const personalTx = postTransaction(db, {
                date: input.date,
                description: input.description,
                payee_or_payer: input.merchant,
                origin: 'manual',
                idempotency_key: `reimb-pers-${effectiveSourceId}`,
                evidence_refs: evidenceRefs,
                postings: [
                    {
                        account_id: dueFromAccount.id,
                        amount_cents: input.amountCents,
                        currency: input.currency
                    },
                    {
                        account_id: input.paymentAccountId,
                        amount_cents: -input.amountCents,
                        currency: input.currency
                    }
                ]
            });
            personalTxId = personalTx.id;

            db.prepare('UPDATE m1_drafts SET status = ?, updated_at = ? WHERE id = ?').run('posted', new Date().toISOString(), effectiveSourceId);

        } else if (effectiveSourceType === 'posted_transaction') {
            const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(effectiveSourceId) as any;
            if (!tx) throw new Error(`Transaction not found: ${effectiveSourceId}`);

            // Why this query exists:
            // Checks for an existing workflow by either personal_transaction_id or originating draft_id
            // to guarantee idempotent retries without creating duplicate workflows or transactions.
            // Tricky logic:
            // If a previous execution created the workflow with a null draft_id, retrying with the draft
            // updates the existing workflow atomically to associate draft_id, ensuring draft resolution.
            // TODO: In Milestone 2, provide an audit log entry when reconciling unlinked workflows to drafts.
            const existingWf = db.prepare(`SELECT * FROM m1_reimbursement_workflows WHERE status != 'cancelled' AND (personal_transaction_id = ? OR (draft_id IS NOT NULL AND draft_id = ?))`).get(effectiveSourceId, draftId || '') as ReimbursementWorkflow;
            if (existingWf) {
                if (existingWf.amount_cents !== input.amountCents || existingWf.currency !== input.currency || existingWf.personal_entity_id !== input.personalEntityId || existingWf.business_entity_id !== input.businessEntityId) {
                    throw new Error('Conflicting reimbursement workflow exists for this transaction. Changed financial details or owners require explicit correction.');
                }
                
                const personalPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingWf.personal_transaction_id) as any[];
                const businessPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingWf.business_transaction_id) as any[];
                
                const persCredit = personalPostings.find(p => p.amount_cents < 0 && p.account_id === input.paymentAccountId);
                const busDebit = businessPostings.find(p => p.amount_cents > 0 && p.account_id === input.businessExpenseAccountId);
                
                const busTx = db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(existingWf.business_transaction_id) as any;

                if (!persCredit || !busDebit || busTx.date !== input.date) {
                    throw new Error('Conflicting reimbursement workflow exists for this transaction. Changed financial details or owners require explicit correction.');
                }
                
                if (input.sourceType === 'draft') {
                    db.prepare('UPDATE m1_drafts SET status = ?, updated_at = ? WHERE id = ?').run('posted', new Date().toISOString(), input.sourceId);
                    if (!existingWf.draft_id) {
                        db.prepare('UPDATE m1_reimbursement_workflows SET draft_id = ? WHERE id = ?').run(input.sourceId, existingWf.id);
                        existingWf.draft_id = input.sourceId;
                    }
                }

                return existingWf;
            }

            if (input.expectedRevision !== undefined && tx.revision !== input.expectedRevision) {
                throw new Error(`Transaction revision mismatch. Expected ${input.expectedRevision}, got ${tx.revision}.`);
            }

            const postings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(effectiveSourceId) as any[];
            if (postings.length !== 2) {
                throw new Error('Can only reclassify simple 2-leg transactions.');
            }

            const paymentPosting = postings.find(p => p.amount_cents < 0 && p.account_id === input.paymentAccountId);
            if (!paymentPosting) {
                throw new Error('Transaction does not contain the specified payment account credit.');
            }

            const expensePosting = postings.find(p => p.amount_cents > 0);
            if (!expensePosting) {
                throw new Error('Transaction does not contain a debit leg to replace.');
            }

            const originalExpenseAcc = db.prepare('SELECT type FROM m1_accounts WHERE id = ?').get(expensePosting.account_id) as Account;
            if (!originalExpenseAcc || originalExpenseAcc.type !== 'expense') {
                throw new Error('Original transaction debit is not an expense account. Cannot reclassify transfers or non-expenses.');
            }

            const correctedPostings = [
                {
                    account_id: dueFromAccount.id,
                    amount_cents: input.amountCents,
                    currency: input.currency
                },
                {
                    account_id: input.paymentAccountId,
                    amount_cents: paymentPosting.amount_cents,
                    currency: paymentPosting.currency
                }
            ];

            correctTransaction(db, {
                transaction_id: effectiveSourceId,
                expected_revision: tx.revision,
                operation: 'edit',
                reason: 'Reclassified as personally paid business expense',
                performed_by: input.performedBy,
                is_internal_reimbursement_operation: true,
                new_data: {
                    date: tx.date, // Use authoritative purchase date from transaction
                    description: tx.description,
                    payee_or_payer: tx.payee_or_payer,
                    postings: correctedPostings
                }
            });
            
            personalTxId = effectiveSourceId;
            // Why evidence merging exists:
            // Preserves evidence refs attached to the original bank transaction while also preserving
            // receipt or invoice documents attached to the originating draft or input payload.
            // Tricky logic:
            // Do not discard evidenceRefs when tx.evidence_refs is empty ('[]' or null).
            // Combine both sets so evidence survives on all linked records.
            // TODO: In Milestone 2, support multi-document categorization tags on journal entries.
            if (tx.evidence_refs) {
                try {
                    const parsed = JSON.parse(tx.evidence_refs);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const existingIds = new Set((evidenceRefs || []).map(r => typeof r === 'string' ? r : (r.document_id || r.id)));
                        const newRefs = [];
                        for (const p of parsed) {
                            const pid = typeof p === 'string' ? p : (p.document_id || p.id);
                            if (pid && !existingIds.has(pid)) {
                                existingIds.add(pid);
                                newRefs.push(p);
                            } else if (!pid) {
                                newRefs.push(p);
                            }
                        }
                        evidenceRefs = [...(evidenceRefs || []), ...newRefs];
                    }
                } catch {
                    // Ignore parse error on malformed evidence_refs
                }
            }

            if (input.sourceType === 'draft') {
                db.prepare('UPDATE m1_drafts SET status = ?, updated_at = ? WHERE id = ?').run('posted', new Date().toISOString(), input.sourceId);
            }
        } else {
            throw new Error(`Unsupported source type: ${effectiveSourceType}`);
        }

        // Use authoritative purchase date (tx.date) if applicable, else input.date
        const finalPurchaseDate = (effectiveSourceType === 'posted_transaction') ? (db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(effectiveSourceId) as any).date : input.date;

        if (effectiveSourceType === 'posted_transaction' && input.date !== finalPurchaseDate) {
             throw new Error('Conflicting input date: must use authoritative purchase date.');
        }

        const workflowId = `rwf-${crypto.randomUUID()}`;
        
        const businessTx = postTransaction(db, {
            date: finalPurchaseDate,
            description: input.description,
            payee_or_payer: input.merchant,
            origin: 'manual',
            idempotency_key: `reimb-bus-${workflowId}`,
            evidence_refs: evidenceRefs,
            postings: [
                {
                    account_id: input.businessExpenseAccountId,
                    amount_cents: input.amountCents,
                    currency: input.currency
                },
                {
                    account_id: dueToAccount.id,
                    amount_cents: -input.amountCents,
                    currency: input.currency
                }
            ]
        });
        businessTxId = businessTx.id;

        const now = new Date().toISOString();
        const effectiveEvidenceDocId = plainEvidenceDocumentId || (evidenceRefs && evidenceRefs.length > 0 ? extractDocumentId(evidenceRefs[0]) : null);
        
        db.prepare(`
            INSERT INTO m1_reimbursement_workflows (
                id, personal_entity_id, business_entity_id, currency,
                due_from_account_id, due_to_account_id, draft_id, evidence_document_id,
                personal_transaction_id, business_transaction_id, amount_cents, status,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_reimbursement', ?, ?)
        `).run(
            workflowId, input.personalEntityId, input.businessEntityId, input.currency,
            dueFromAccount.id, dueToAccount.id, draftId,
            effectiveEvidenceDocId, personalTxId, businessTxId, input.amountCents,
            now, now
        );

        if (effectiveEvidenceDocId && effectiveSourceType === 'posted_transaction') {
            const curTx = db.prepare('SELECT evidence_refs FROM m1_transactions WHERE id = ?').get(personalTxId) as any;
            const curRefs = curTx?.evidence_refs ? JSON.parse(curTx.evidence_refs) : [];
            if (!curRefs.includes(effectiveEvidenceDocId)) {
                curRefs.push(effectiveEvidenceDocId);
                db.prepare('UPDATE m1_transactions SET evidence_refs = ? WHERE id = ?').run(JSON.stringify(curRefs), personalTxId);
            }
        }

        return db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(workflowId) as ReimbursementWorkflow;
    });

    return runAtomic();
}

export interface ReimbursementCandidate {
    id: string;
    date: string;
    description: string;
    payee_or_payer?: string | null;
    status: string;
    revision: number;
    currency: CurrencyCode;
    leg_account_id: string;
    leg_amount_cents: number;
    account_name: string;
    postings: any[];
}

/**
 * Retrieves eligible unassigned bank transactions for reimbursement matching.
 * 
 * Why this exists:
 * Enables explicit matching of bank movements across personal and business entities
 * without being constrained to the first 15 transactions on the ledger page.
 * 
 * Tricky logic:
 * - Excludes clearing accounts (due from/to) so internal receivables/payables cannot match.
 * - Excludes opening balance entries and already matched workflows.
 * - Direction-aware: Personal receiving leg requires an inflow (debit > 0),
 *   while business sending leg requires an outflow (credit < 0).
 */
export function getCandidateReimbursementTransactions(
    db: Database.Database,
    workflowId: string,
    leg: 'personal' | 'business'
): ReimbursementCandidate[] {
    const wf = db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(workflowId) as ReimbursementWorkflow;
    if (!wf) throw new Error(`Workflow not found: ${workflowId}`);

    const entityIdToMatch = leg === 'personal' ? wf.personal_entity_id : wf.business_entity_id;
    const amountCentsToMatch = wf.amount_cents;
    const currencyToMatch = wf.currency;
    
    // Personal leg: money IN to personal checking (inflow -> debit to asset/checking/savings, amount_cents > 0)
    // Business leg: money OUT of business checking (outflow -> credit to asset/checking/savings, amount_cents < 0)
    const isCredit = leg === 'personal';

    const candidates = db.prepare(`
        SELECT 
            t.id, t.date, t.description, t.payee_or_payer, t.status, t.revision,
            j.currency, j.amount_cents as leg_amount_cents, j.amount_cents as leg_amount, j.account_id as leg_account_id,
            a.name as account_name
        FROM m1_transactions t
        JOIN m1_journal_entries j ON t.id = j.transaction_id
        JOIN m1_accounts a ON j.account_id = a.id
        WHERE a.entity_id = ?
          AND a.id != ?
          AND a.id != ?
          AND (
            (a.type = 'asset' AND a.sub_type IN ('checking', 'savings', 'cash', 'other'))
            OR (a.type = 'liability' AND a.sub_type = 'credit_card')
          )
          AND j.currency = ?
          AND j.amount_cents ${isCredit ? '>' : '<'} 0
          AND ABS(j.amount_cents) = ?
          AND t.id NOT IN (
              SELECT personal_transaction_id FROM m1_reimbursement_workflows WHERE personal_transaction_id IS NOT NULL
              UNION
              SELECT business_transaction_id FROM m1_reimbursement_workflows WHERE business_transaction_id IS NOT NULL
              UNION
              SELECT personal_reimbursement_tx_id FROM m1_reimbursement_workflows WHERE personal_reimbursement_tx_id IS NOT NULL
              UNION
              SELECT business_reimbursement_tx_id FROM m1_reimbursement_workflows WHERE business_reimbursement_tx_id IS NOT NULL
          )
          AND t.origin != 'opening_balance'
          AND t.status NOT IN ('void', 'voided')
        ORDER BY t.date DESC
        LIMIT 100
    `).all(entityIdToMatch, wf.due_from_account_id, wf.due_to_account_id, currencyToMatch, amountCentsToMatch) as any[];

    for (const c of candidates) {
        c.postings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(c.id);
    }

    return candidates;
}

export interface MatchReimbursementInput {
    workflowId: string;
    date?: string;
    personalDate?: string;
    businessDate?: string;
    description: string;
    personalReceivingBankTxId?: string;
    expectedPersonalRevision?: number;
    personalReceivingAccountId: string;
    businessBankTxId?: string;
    expectedBusinessRevision?: number;
    businessBankAccountId: string;
    createMissingPersonalReceipt?: boolean;
    createMissingBusinessPayment?: boolean;
    performedBy: string;
}

/**
 * Matches a reimbursement workflow by linking existing bank movements or recording missing ones.
 * 
 * Why this exists:
 * Resolves outstanding inter-entity balances (Due to Owner / Due from Business)
 * without creating duplicate bank movements or altering bank account balances when movements already exist.
 * 
 * Tricky logic:
 * - When matching two existing movements, both transactions are corrected via `correctTransaction`
 *   to point their offsetting legs to the clearing accounts. The bank account postings themselves
 *   remain intact and unchanged, so bank balances are completely unaltered.
 * - Authoritative posting dates of existing imported transactions are preserved.
 * - Identical retries succeed idempotently without writes even if personal and business dates differ.
 * - If a movement is genuinely missing, it must be explicitly declared via createMissing* flags.
 */
export function matchReimbursement(db: Database.Database, input: MatchReimbursementInput): ReimbursementWorkflow {
    const runAtomic = db.transaction(() => {
        const wf = db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(input.workflowId) as ReimbursementWorkflow;
        if (!wf) throw new Error(`Reimbursement workflow not found: ${input.workflowId}`);

        const personalReceivingAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.personalReceivingAccountId) as Account;
        if (!personalReceivingAcc || personalReceivingAcc.entity_id !== wf.personal_entity_id) {
            throw new Error('Personal receiving account must belong to the personal entity.');
        }
        assertEligiblePaymentAccount(personalReceivingAcc);

        const businessBankAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.businessBankAccountId) as Account;
        if (!businessBankAcc || businessBankAcc.entity_id !== wf.business_entity_id) {
            throw new Error('Business bank account must belong to the business entity.');
        }
        assertEligiblePaymentAccount(businessBankAcc);

        if (wf.status === 'cancelled') {
            throw new Error('Cannot settle a cancelled workflow.');
        }

        if (wf.status === 'reimbursed') {
            const personalPostings = wf.personal_reimbursement_tx_id ? db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(wf.personal_reimbursement_tx_id) as any[] : [];
            const businessPostings = wf.business_reimbursement_tx_id ? db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(wf.business_reimbursement_tx_id) as any[] : [];

            const persDebit = personalPostings.find(p => p.amount_cents > 0 && p.account_id === input.personalReceivingAccountId);
            const busCredit = businessPostings.find(p => p.amount_cents < 0 && p.account_id === input.businessBankAccountId);

            const persTx = wf.personal_reimbursement_tx_id ? db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(wf.personal_reimbursement_tx_id) as any : null;
            const busTx = wf.business_reimbursement_tx_id ? db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(wf.business_reimbursement_tx_id) as any : null;

            const persTxDate = persTx?.date;
            const busTxDate = busTx?.date;

            // 1. Transaction IDs must match if provided
            if (input.personalReceivingBankTxId && input.personalReceivingBankTxId !== wf.personal_reimbursement_tx_id) {
                throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
            }
            if (input.businessBankTxId && input.businessBankTxId !== wf.business_reimbursement_tx_id) {
                throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
            }

            // 2. Accounts must match
            if (!persDebit || !busCredit) {
                throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
            }

            // 3. Date verification:
            // If explicit personalDate is passed, it must match persTxDate
            if (input.personalDate && persTxDate && input.personalDate !== persTxDate) {
                throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
            }
            // If explicit businessDate is passed, it must match busTxDate
            if (input.businessDate && busTxDate && input.businessDate !== busTxDate) {
                throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
            }

            // If neither explicit personalDate nor businessDate is passed, but generic input.date is passed:
            if (!input.personalDate && !input.businessDate && input.date) {
                if (persTxDate === busTxDate) {
                    // Both transactions have identical date, so input.date must match that date
                    if (input.date !== persTxDate) {
                        throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
                    }
                } else {
                    // Transactions have different authoritative dates (e.g. imported on different dates)
                    // input.date must match at least one of them, otherwise it is a genuinely changed date fact
                    if (input.date !== persTxDate && input.date !== busTxDate) {
                        throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
                    }
                }
            }

            return wf;
        }

        let personalTxId: string;
        let businessTxId: string;

        if (input.personalReceivingBankTxId) {
            const existingMatch = db.prepare('SELECT id FROM m1_reimbursement_workflows WHERE personal_reimbursement_tx_id = ? AND id != ?').get(input.personalReceivingBankTxId, input.workflowId);
            if (existingMatch) throw new Error('Personal transaction is already matched to another workflow.');
            
            const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(input.personalReceivingBankTxId) as any;
            if (!tx) throw new Error(`Personal transaction not found: ${input.personalReceivingBankTxId}`);

            if (input.expectedPersonalRevision !== undefined && tx.revision !== input.expectedPersonalRevision) {
                throw new Error(`Personal transaction revision mismatch. Expected ${input.expectedPersonalRevision}, got ${tx.revision}.`);
            }

            const postings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(input.personalReceivingBankTxId) as any[];
            if (postings.length !== 2) throw new Error('Can only match simple 2-leg personal transactions.');

            const receivingPosting = postings.find(p => p.amount_cents > 0 && p.account_id === input.personalReceivingAccountId);
            if (!receivingPosting) throw new Error('Personal transaction does not contain the specified receiving account debit.');
            
            if (receivingPosting.amount_cents !== wf.amount_cents || receivingPosting.currency !== wf.currency) {
                throw new Error('Reimbursement amount/currency mismatch on personal transaction.');
            }

            const correctedPostings = [
                {
                    account_id: input.personalReceivingAccountId,
                    amount_cents: receivingPosting.amount_cents,
                    currency: receivingPosting.currency
                },
                {
                    account_id: wf.due_from_account_id,
                    amount_cents: -wf.amount_cents,
                    currency: wf.currency
                }
            ];

            correctTransaction(db, {
                transaction_id: input.personalReceivingBankTxId,
                expected_revision: tx.revision,
                operation: 'edit',
                reason: 'Matched to reimbursement workflow',
                performed_by: input.performedBy,
                is_internal_reimbursement_operation: true,
                new_data: {
                    date: tx.date,
                    description: tx.description,
                    payee_or_payer: tx.payee_or_payer,
                    postings: correctedPostings
                }
            });
            personalTxId = input.personalReceivingBankTxId;
        } else {
            if (!input.createMissingPersonalReceipt) {
                throw new Error("Must provide personal receiving transaction or explicitly choose to record missing receipt.");
            }
            const persPostDate = input.personalDate || input.date;
            if (!persPostDate) throw new Error("Must provide a date for missing personal receipt.");
            const personalTx = postTransaction(db, {
                date: persPostDate,
                description: input.description,
                origin: 'manual',
                idempotency_key: `reimb-match-pers-${wf.id}`,
                postings: [
                    {
                        account_id: input.personalReceivingAccountId,
                        amount_cents: wf.amount_cents,
                        currency: wf.currency
                    },
                    {
                        account_id: wf.due_from_account_id,
                        amount_cents: -wf.amount_cents,
                        currency: wf.currency
                    }
                ]
            });
            personalTxId = personalTx.id;
        }

        if (input.businessBankTxId) {
            const existingMatch = db.prepare('SELECT id FROM m1_reimbursement_workflows WHERE business_reimbursement_tx_id = ? AND id != ?').get(input.businessBankTxId, input.workflowId);
            if (existingMatch) throw new Error('Business transaction is already matched to another workflow.');

            const tx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(input.businessBankTxId) as any;
            if (!tx) throw new Error(`Business transaction not found: ${input.businessBankTxId}`);

            if (input.expectedBusinessRevision !== undefined && tx.revision !== input.expectedBusinessRevision) {
                throw new Error(`Business transaction revision mismatch. Expected ${input.expectedBusinessRevision}, got ${tx.revision}.`);
            }

            const postings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(input.businessBankTxId) as any[];
            if (postings.length !== 2) throw new Error('Can only match simple 2-leg business transactions.');

            const sendingPosting = postings.find(p => p.amount_cents < 0 && p.account_id === input.businessBankAccountId);
            if (!sendingPosting) throw new Error('Business transaction does not contain the specified sending account credit.');
            
            if (Math.abs(sendingPosting.amount_cents) !== wf.amount_cents || sendingPosting.currency !== wf.currency) {
                throw new Error('Reimbursement amount/currency mismatch on business transaction.');
            }

            const correctedPostings = [
                {
                    account_id: wf.due_to_account_id,
                    amount_cents: wf.amount_cents,
                    currency: wf.currency
                },
                {
                    account_id: input.businessBankAccountId,
                    amount_cents: sendingPosting.amount_cents,
                    currency: sendingPosting.currency
                }
            ];

            correctTransaction(db, {
                transaction_id: input.businessBankTxId,
                expected_revision: tx.revision,
                operation: 'edit',
                reason: 'Matched to reimbursement workflow',
                performed_by: input.performedBy,
                is_internal_reimbursement_operation: true,
                new_data: {
                    date: tx.date,
                    description: tx.description,
                    payee_or_payer: tx.payee_or_payer,
                    postings: correctedPostings
                }
            });
            businessTxId = input.businessBankTxId;
        } else {
            if (!input.createMissingBusinessPayment) {
                throw new Error("Must provide business sending transaction or explicitly choose to record missing payment.");
            }
            const busPostDate = input.businessDate || input.date;
            if (!busPostDate) throw new Error("Must provide a date for missing business payment.");
            const businessTx = postTransaction(db, {
                date: busPostDate,
                description: input.description,
                origin: 'manual',
                idempotency_key: `reimb-match-bus-${wf.id}`,
                postings: [
                    {
                        account_id: wf.due_to_account_id,
                        amount_cents: wf.amount_cents,
                        currency: wf.currency
                    },
                    {
                        account_id: input.businessBankAccountId,
                        amount_cents: -wf.amount_cents,
                        currency: wf.currency
                    }
                ]
            });
            businessTxId = businessTx.id;
        }

        db.prepare(`
            UPDATE m1_reimbursement_workflows
            SET status = 'reimbursed',
                personal_reimbursement_tx_id = ?,
                business_reimbursement_tx_id = ?,
                updated_at = ?
            WHERE id = ?
        `).run(personalTxId, businessTxId, new Date().toISOString(), wf.id);

        return db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(wf.id) as ReimbursementWorkflow;
    });

    return runAtomic();
}

export interface UndoPersonallyPaidExpenseInput {
    workflowId: string;
    personalExpenseAccountId: string;
    expectedPersonalRevision: number;
    expectedBusinessRevision: number;
    performedBy: string;
}

export function undoPersonallyPaidBusinessExpense(db: Database.Database, input: UndoPersonallyPaidExpenseInput): ReimbursementWorkflow {
    const runAtomic = db.transaction(() => {
        const wf = db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(input.workflowId) as ReimbursementWorkflow;
        if (!wf) throw new Error(`Reimbursement workflow not found: ${input.workflowId}`);

        if (wf.status === 'cancelled') {
            const persPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(wf.personal_transaction_id) as any[];
            const expenseDebit = persPostings.find(p => p.amount_cents > 0);
            if (expenseDebit && expenseDebit.account_id !== input.personalExpenseAccountId) {
                throw new ConflictError('Workflow is already cancelled but the transaction is in a different category. Cannot retry with a different category.');
            }
            return wf; // Identical retry is harmless
        }

        if (wf.status !== 'awaiting_reimbursement') {
            throw new Error('Only unsettled reimbursements (awaiting reimbursement) can be undone.');
        }

        const targetAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(input.personalExpenseAccountId) as any;
        if (!targetAcc) throw new Error('Target expense account not found.');
        if (targetAcc.entity_id !== wf.personal_entity_id) throw new Error('Target expense account does not belong to the personal entity.');
        if (targetAcc.type !== 'expense') throw new Error('Target account must be an expense account.');
        if (targetAcc.currency !== wf.currency) throw new Error('Target expense account currency must match the workflow currency.');

        const persTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(wf.personal_transaction_id) as any;
        const busTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(wf.business_transaction_id) as any;
        
        if (!persTx || !busTx) {
            throw new Error('Underlying transactions not found for this workflow.');
        }

        if (persTx.revision !== input.expectedPersonalRevision || busTx.revision !== input.expectedBusinessRevision) {
            throw new ConflictError('Underlying transactions have changed since preview. Please refresh and try again.');
        }

        const persPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(persTx.id) as any[];
        
        // Find the clearing debit on the personal transaction
        const clearingDebit = persPostings.find(p => p.account_id === wf.due_from_account_id && p.amount_cents > 0);
        if (!clearingDebit) {
            throw new Error('Personal transaction clearing posting not found.');
        }

        const newPersPostings = persPostings.map(p => {
            if (p.id === clearingDebit.id) {
                return {
                    account_id: input.personalExpenseAccountId,
                    amount_cents: p.amount_cents,
                    currency: p.currency,
                    memo: p.memo
                };
            }
            return {
                account_id: p.account_id,
                amount_cents: p.amount_cents,
                currency: p.currency,
                memo: p.memo
            };
        });

        // 1. Edit the personal transaction to use the personal expense account
        correctTransaction(db, {
            transaction_id: persTx.id,
            expected_revision: persTx.revision,
            operation: 'edit',
            reason: 'Undo mistaken business classification',
            performed_by: input.performedBy,
            is_internal_reimbursement_operation: true,
            new_data: {
                postings: newPersPostings
            }
        });

        // 2. Void the business transaction
        correctTransaction(db, {
            transaction_id: busTx.id,
            expected_revision: busTx.revision,
            operation: 'void',
            reason: 'Undo mistaken business classification',
            performed_by: input.performedBy,
            is_internal_reimbursement_operation: true
        });

        // 3. Mark the workflow cancelled
        db.prepare(`
            UPDATE m1_reimbursement_workflows
            SET status = 'cancelled', updated_at = ?
            WHERE id = ?
        `).run(new Date().toISOString(), wf.id);

        return db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(wf.id) as ReimbursementWorkflow;
    });

    return runAtomic();
}

export interface UndoReimbursementMatchInput {
    workflowId: string;
    expectedPersonalTxId?: string;
    expectedBusinessTxId?: string;
    expectedPersonalRevision?: number;
    expectedBusinessRevision?: number;
    performedBy: string;
    newPersonalAccountId?: string;
    newBusinessAccountId?: string;
}

export function undoReimbursementMatch(db: Database.Database, input: UndoReimbursementMatchInput): ReimbursementWorkflow {
    const runAtomic = db.transaction(() => {
        const wf = db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(input.workflowId) as ReimbursementWorkflow & { last_undo_request?: string };
        if (!wf) throw new Error(`Reimbursement workflow not found: ${input.workflowId}`);

        if (wf.status !== 'reimbursed') {
            if (wf.status === 'awaiting_reimbursement' && wf.last_undo_request) {
                const lastReq = JSON.parse(wf.last_undo_request);
                if (
                    lastReq.expectedPersonalTxId === input.expectedPersonalTxId &&
                    lastReq.expectedBusinessTxId === input.expectedBusinessTxId &&
                    lastReq.expectedPersonalRevision === input.expectedPersonalRevision &&
                    lastReq.expectedBusinessRevision === input.expectedBusinessRevision &&
                    lastReq.newPersonalAccountId === input.newPersonalAccountId &&
                    lastReq.newBusinessAccountId === input.newBusinessAccountId
                ) {
                    return wf; // Identical retry, return without writes
                }
            }
            throw new Error('Only completely settled reimbursements can have their match undone.');
        }

        const persTxId = wf.personal_reimbursement_tx_id;
        const busTxId = wf.business_reimbursement_tx_id;

        if (!persTxId || !busTxId) {
            throw new Error('Missing reimbursement transactions on workflow.');
        }

        const persTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(persTxId) as any;
        const busTx = db.prepare('SELECT * FROM m1_transactions WHERE id = ?').get(busTxId) as any;

        if (
            persTx.id !== input.expectedPersonalTxId ||
            busTx.id !== input.expectedBusinessTxId ||
            persTx.revision !== input.expectedPersonalRevision || 
            busTx.revision !== input.expectedBusinessRevision
        ) {
            throw new Error('Underlying transactions have changed since preview. Please refresh and try again.');
        }

        const processLeg = (tx: any, wfLegAccId: string, isPersonal: boolean, newAccId?: string) => {
            const isManual = tx.idempotency_key === `reimb-match-pers-${wf.id}` || tx.idempotency_key === `reimb-match-bus-${wf.id}`;
            
            if (isManual) {
                if (!newAccId) throw new Error(`Missing new account assignment for manually created ${isPersonal ? 'personal' : 'business'} transaction.`);
                if (newAccId === wf.due_from_account_id || newAccId === wf.due_to_account_id) {
                    throw new Error(`Cannot reassign manual transaction to the reimbursement clearing accounts.`);
                }
                const newAcc = db.prepare('SELECT * FROM m1_accounts WHERE id = ?').get(newAccId) as Account;
                if (!newAcc) throw new Error(`Invalid account selected: ${newAccId}`);
                if (newAcc.entity_id !== (isPersonal ? wf.personal_entity_id : wf.business_entity_id)) {
                    throw new Error(`Replacement account must belong to the ${isPersonal ? 'personal' : 'business'} entity.`);
                }
                if (newAcc.currency !== wf.currency) {
                    throw new Error(`Replacement account currency must match workflow currency.`);
                }
                
                const postings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(tx.id) as any[];
                
                // Identify the bank leg (the one that is NOT the clearing account)
                const bankLeg = postings.find(p => p.account_id !== wfLegAccId);
                if (bankLeg && bankLeg.account_id === newAccId) {
                    throw new Error(`Cannot reassign to the same account as the existing bank movement, which would cancel it out.`);
                }
                
                // Replace the clearing account leg with the new category account leg
                const newPostings = postings.map(p => {
                    if (p.account_id === wfLegAccId) {
                        return {
                            account_id: newAccId,
                            amount_cents: p.amount_cents,
                            currency: p.currency,
                            memo: p.memo
                        };
                    }
                    return {
                        account_id: p.account_id,
                        amount_cents: p.amount_cents,
                        currency: p.currency,
                        memo: p.memo
                    };
                });

                correctTransaction(db, {
                    transaction_id: tx.id,
                    expected_revision: tx.revision,
                    operation: 'edit',
                    reason: 'Undo mistaken reimbursement match',
                    performed_by: input.performedBy,
                    is_internal_reimbursement_operation: true,
                    new_data: {
                        postings: newPostings
                    }
                });

                // Clear idempotency key so it doesn't conflict if we match the workflow again
                db.prepare('UPDATE m1_transactions SET idempotency_key = NULL WHERE id = ?').run(tx.id);
            } else {
                // Was an imported/linked transaction. Look up the correction history to restore previous state.
                const corrections = db.prepare('SELECT * FROM m1_transaction_corrections WHERE transaction_id = ? ORDER BY timestamp DESC').all(tx.id) as any[];
                const matchCorrection = corrections.find(c => c.reason === 'Matched to reimbursement workflow');
                if (!matchCorrection) throw new Error(`Could not find match correction history for ${isPersonal ? 'personal' : 'business'} transaction.`);

                const prevState = JSON.parse(matchCorrection.previous_state);
                
                correctTransaction(db, {
                    transaction_id: tx.id,
                    expected_revision: tx.revision,
                    operation: 'edit',
                    reason: 'Undo mistaken reimbursement match',
                    performed_by: input.performedBy,
                    is_internal_reimbursement_operation: true,
                    new_data: prevState
                });
            }
        };

        processLeg(persTx, wf.due_from_account_id, true, input.newPersonalAccountId);
        processLeg(busTx, wf.due_to_account_id, false, input.newBusinessAccountId);

        // Disconnect the transactions from the workflow and change status back to awaiting_reimbursement
        db.prepare(`
            UPDATE m1_reimbursement_workflows 
            SET status = 'awaiting_reimbursement', 
                personal_reimbursement_tx_id = NULL, 
                business_reimbursement_tx_id = NULL,
                last_undo_request = ?,
                updated_at = ?
            WHERE id = ?
        `).run(JSON.stringify(input), new Date().toISOString(), wf.id);

        return db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(wf.id) as ReimbursementWorkflow;
    });

    return runAtomic();
}
