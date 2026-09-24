import Database from 'better-sqlite3';
import crypto from 'crypto';
import { Account, Entity, CurrencyCode, Transaction, ReimbursementWorkflow, TransactionCorrection } from '../../lib/domain/accounting/types';
import { getEntity, createAccount, listAccounts } from '../../lib/domain/accounting/accountService';
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
        let evidenceRefs = input.evidenceDocumentId ? [input.evidenceDocumentId] : undefined;

        if (input.sourceType === 'draft') {
            draft = db.prepare('SELECT * FROM m1_drafts WHERE id = ?').get(input.sourceId) as any;
            if (!draft) throw new Error(`Draft not found: ${input.sourceId}`);

            if (draft.status !== 'draft' && draft.status !== 'posted') {
                throw new Error('Draft is not in a valid state to be posted.');
            }
            if (draft.reimbursement_intent !== 'yes') {
                throw new Error('Draft must have reimbursement intent to process as personally paid expense.');
            }
            if (draft.amount_cents !== input.amountCents || draft.currency !== input.currency || draft.date !== input.date || draft.payer_entity_id !== input.personalEntityId || (draft.entity_id && draft.entity_id !== input.businessEntityId)) {
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

        // 1. Get or create clearing accounts
        const { dueFromAccount, dueToAccount } = getOrCreateClearingAccounts(db, input.personalEntityId, input.businessEntityId, input.currency);

        let personalTxId: string;
        let businessTxId: string;
        let draftId = input.sourceType === 'draft' ? input.sourceId : null;

        if (effectiveSourceType === 'draft') {
            const existingWf = db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE draft_id = ?').get(effectiveSourceId) as ReimbursementWorkflow;
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

            const existingWf = db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE personal_transaction_id = ?').get(effectiveSourceId) as ReimbursementWorkflow;
            if (existingWf) {
                if (existingWf.amount_cents !== input.amountCents || existingWf.currency !== input.currency || existingWf.personal_entity_id !== input.personalEntityId || existingWf.business_entity_id !== input.businessEntityId) {
                    throw new Error('Conflicting reimbursement workflow exists for this transaction. Changed financial details or owners require explicit correction.');
                }
                
                const personalPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingWf.personal_transaction_id) as any[];
                const businessPostings = db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(existingWf.business_transaction_id) as any[];
                
                const persCredit = personalPostings.find(p => p.amount_cents < 0 && p.account_id === input.paymentAccountId);
                const busDebit = businessPostings.find(p => p.amount_cents > 0 && p.account_id === input.businessExpenseAccountId);
                
                const busTx = db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(existingWf.business_transaction_id) as any;

                if (!persCredit || !busDebit || tx.date !== input.date || busTx.date !== input.date) {
                    throw new Error('Conflicting reimbursement workflow exists for this transaction. Changed financial details or owners require explicit correction.');
                }
                
                if (input.sourceType === 'draft') {
                    db.prepare('UPDATE m1_drafts SET status = ?, updated_at = ? WHERE id = ?').run('posted', new Date().toISOString(), input.sourceId);
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
                new_data: {
                    date: tx.date, // Use authoritative purchase date from transaction
                    description: tx.description,
                    payee_or_payer: tx.payee_or_payer,
                    postings: correctedPostings
                }
            });
            
            personalTxId = effectiveSourceId;
            if (tx.evidence_refs) {
                const parsed = JSON.parse(tx.evidence_refs);
                evidenceRefs = parsed.length > 0 ? parsed : undefined;
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

        const businessTx = postTransaction(db, {
            date: finalPurchaseDate,
            description: input.description,
            payee_or_payer: input.merchant,
            origin: 'manual',
            idempotency_key: `reimb-bus-${effectiveSourceId}`,
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

        const workflowId = `rwf-${crypto.randomUUID()}`;
        const now = new Date().toISOString();
        
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
            input.evidenceDocumentId || null, personalTxId, businessTxId, input.amountCents,
            now, now
        );

        return db.prepare('SELECT * FROM m1_reimbursement_workflows WHERE id = ?').get(workflowId) as ReimbursementWorkflow;
    });

    return runAtomic();
}

export interface MatchReimbursementInput {
    workflowId: string;
    date: string;
    description: string;
    personalReceivingBankTxId?: string;
    expectedPersonalRevision?: number;
    personalReceivingAccountId: string;
    businessBankTxId?: string;
    expectedBusinessRevision?: number;
    businessBankAccountId: string;
    performedBy: string;
}

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

        if (wf.status === 'reimbursed') {
            const personalPostings = wf.personal_reimbursement_tx_id ? db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(wf.personal_reimbursement_tx_id) as any[] : [];
            const businessPostings = wf.business_reimbursement_tx_id ? db.prepare('SELECT * FROM m1_journal_entries WHERE transaction_id = ?').all(wf.business_reimbursement_tx_id) as any[] : [];

            const persDebit = personalPostings.find(p => p.amount_cents > 0 && p.account_id === input.personalReceivingAccountId);
            const busCredit = businessPostings.find(p => p.amount_cents < 0 && p.account_id === input.businessBankAccountId);

            const persTx = wf.personal_reimbursement_tx_id ? db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(wf.personal_reimbursement_tx_id) as any : null;
            const busTx = wf.business_reimbursement_tx_id ? db.prepare('SELECT date FROM m1_transactions WHERE id = ?').get(wf.business_reimbursement_tx_id) as any : null;

            const isExactMatch = 
                (!input.personalReceivingBankTxId || input.personalReceivingBankTxId === wf.personal_reimbursement_tx_id) &&
                (!input.businessBankTxId || input.businessBankTxId === wf.business_reimbursement_tx_id) &&
                persDebit && busCredit && 
                persTx?.date === input.date && busTx?.date === input.date;

            if (!isExactMatch) {
                throw new Error('Conflicting matched reimbursement exists. Changed financial details or owners require explicit correction.');
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
                new_data: {
                    date: tx.date,
                    description: tx.description,
                    payee_or_payer: tx.payee_or_payer,
                    postings: correctedPostings
                }
            });
            personalTxId = input.personalReceivingBankTxId;
        } else {
            const personalTx = postTransaction(db, {
                date: input.date,
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
                new_data: {
                    date: tx.date,
                    description: tx.description,
                    payee_or_payer: tx.payee_or_payer,
                    postings: correctedPostings
                }
            });
            businessTxId = input.businessBankTxId;
        } else {
            const businessTx = postTransaction(db, {
                date: input.date,
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
