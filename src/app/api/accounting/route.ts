/**
 * Milestone 1 Accounting Engine API Route
 * 
 * Why this file exists:
 * Authoritative, local-first API endpoint for managing entities, accounts,
 * opening balances, daily financial transactions (income, expense, transfer, credit card repayment,
 * loan repayment split), and retrieving real-time calculated balances, net worth, and period cash flows.
 * 
 * Tricky logic:
 * - Scoped actions validate all inputs before acquiring database locks.
 * - Account creation with an opening balance commits atomically in a single transaction.
 * - Stale revision updates or corrections return HTTP 409 Conflict rather than silently overwriting (M1-SAFE-06).
 * - All monetary balances are returned as exact minor-unit integers (`balance_cents`)
 *   alongside formatted display strings.
 * - Daily transactions (income, expense, transfer, repayment) are committed atomically
 *   and enforce strict double-entry balance: Sum(postings.amount_cents) === 0.
 * 
 * TODO: Add audit trail query parameters for drillable transaction history in Slice 1D.
 */

import { NextResponse } from 'next/server';
import { getDbForRequest, demoErrorResponse, demoReadOnlyResponse } from '@/infrastructure/sqlite/db';
import {
    createEntity,
    listEntities,
    getEntity,
    createAccount,
    updateAccount,
    listAccounts,
    setAccountOwnership,
    getAccountOwnership,
    listEntityMembers,
    setAccountOpeningBalance,
    ValidationError,
    ConflictError
} from '@/lib/domain/accounting/accountService';
import {
    getAccountBalance,
    getEntityNetWorth,
    getPeriodIncomeAndExpenses,
    getActualCashFlowStatement,
    getAccountLedgerDrilldown,
    getScopeNetWorth,
    getConsolidatedNetWorth,
    setExchangeRate,
    resolveAccountBalanceInfo
} from '@/lib/domain/accounting/balanceService';
import {
    postTransaction,
    recordIncome,
    recordExpense,
    recordTransfer,
    recordCreditCardRepayment,
    recordLoanRepayment,
    recordAssetValuation,
    correctTransaction,
    listTransactions,
    countTransactions
} from '@/lib/domain/accounting/transactionService';
import {
    processPersonallyPaidBusinessExpense,
    matchReimbursement,
    getCandidateReimbursementTransactions,
    ProcessPersonallyPaidExpenseInput,
    MatchReimbursementInput,
    undoPersonallyPaidBusinessExpense,
    UndoPersonallyPaidExpenseInput,
    undoReimbursementMatch,
    UndoReimbursementMatchInput
} from '@/features/reimbursement/reimbursementService';
import { saveDraft, getDrafts, deleteDraft } from '@/lib/domain/accounting/draftService';
import { ScopeType, formatMoney, Account } from '@/lib/domain/accounting/types';
import { getLatestValuationObservation } from '@/lib/domain/accounting/balanceObservationService';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';
import { getLocalTodayCalendarDate, isValidCalendarDate } from '@/lib/domain/calendarDate';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

/**
 * Resolves the effective balance for an account.
 * Why this exists:
 * Uses domain resolveAccountBalanceInfo so API routes and domain services
 * share identical balance tracking and unknown-status logic (Finding B).
 */
function resolveAccountBalance(db: any, acc: Account, asOfDate?: string) {
    return resolveAccountBalanceInfo(db, acc, asOfDate);
}

export async function GET(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    try {
        // Demo cookie present → persona vault's ledger (Phase 2.7).
        const db = getDbForRequest(request);

        const url = new URL(request.url);
        const view = url.searchParams.get('view');
        const entityId = url.searchParams.get('entity_id');
        const asOfDate = url.searchParams.get('as_of_date') || getLocalTodayCalendarDate();
        const startDate = url.searchParams.get('start_date') || undefined;
        const endDate = url.searchParams.get('end_date') || undefined;
        const includeTransactions = url.searchParams.get('include_transactions') === 'true';
        const limitParam = url.searchParams.get('limit');
        const fetchLimit = limitParam ? parseInt(limitParam, 10) : 500;
        const offsetParam = url.searchParams.get('offset');
        const fetchOffset = offsetParam ? parseInt(offsetParam, 10) : 0;
        const intent = url.searchParams.get('intent') || undefined;
        const accountId = url.searchParams.get('account_id') || undefined;

        if (startDate && !isValidCalendarDate(startDate)) {
            return secureJson({ error: `Invalid start date: ${startDate}` }, { status: 400 });
        }
        if (endDate && !isValidCalendarDate(endDate)) {
            return secureJson({ error: `Invalid end date: ${endDate}` }, { status: 400 });
        }
        if (startDate && endDate && startDate > endDate) {
            return secureJson({ error: `Reversed range: ${startDate} to ${endDate}` }, { status: 400 });
        }

        // Drafts query (M1-DRAFT-01, Clarification 3)
        if (view === 'drafts') {
            const drafts = getDrafts(db, entityId && entityId !== 'all' ? { entity_id: entityId } : undefined);
            return NextResponse.json({ success: true, drafts });
        }

        if (view === 'reimbursements') {
            let workflows;
            if (entityId && entityId !== 'all') {
                workflows = db.prepare('SELECT * FROM reimbursement_workflows WHERE personal_entity_id = ? OR business_entity_id = ? ORDER BY created_at DESC').all(entityId, entityId) as any[];
            } else {
                workflows = db.prepare('SELECT * FROM reimbursement_workflows ORDER BY created_at DESC').all() as any[];
            }
            return secureJson({ success: true, workflows });
        }

        if (view === 'reimbursement_candidates') {
            const workflowId = url.searchParams.get('workflow_id');
            const leg = url.searchParams.get('leg') as 'personal' | 'business';
            if (!workflowId || (leg !== 'personal' && leg !== 'business')) {
                return secureJson({ error: 'Missing workflow_id or invalid leg' }, { status: 400 });
            }

            try {
                const candidates = getCandidateReimbursementTransactions(db, workflowId, leg);
                return secureJson({ success: true, candidates });
            } catch (err: any) {
                return secureJson({ error: err.message || 'Failed to fetch candidate transactions' }, { status: 404 });
            }
        }



        if (view === 'reimbursement_undo_preview') {
            const workflowId = url.searchParams.get('workflow_id');
            if (!workflowId) return secureJson({ error: 'Missing workflow_id' }, { status: 400 });
            
            const wf = db.prepare('SELECT * FROM reimbursement_workflows WHERE id = ?').get(workflowId) as any;
            if (!wf) return secureJson({ error: 'Workflow not found' }, { status: 404 });
            
            // "Find the correction associated with this workflow's business reclassification and use its immediately preceding expense category."
            const corrections = db.prepare('SELECT * FROM transaction_corrections WHERE transaction_id = ? ORDER BY timestamp DESC').all(wf.personal_transaction_id) as any[];
            const reclassCorrection = corrections.find(c => c.reason === 'Reclassified as personally paid business expense');
            
            let originalCategoryAccountId = null;
            if (reclassCorrection) {
                const snapshot = JSON.parse(reclassCorrection.previous_state);
                const postings = snapshot.postings || [];
                // It was an expense, so we look for the debit leg that is an expense account
                const debitPosting = postings.find((p: any) => p.amount_cents > 0);
                if (debitPosting) {
                    const acc = db.prepare('SELECT type, entity_id, currency FROM accounts WHERE id = ?').get(debitPosting.account_id) as any;
                    // Validate it's still a valid personal expense account with matching currency
                    if (acc && acc.type === 'expense' && acc.entity_id === wf.personal_entity_id && acc.currency === wf.currency) {
                        originalCategoryAccountId = debitPosting.account_id;
                    }
                }
            }
            
            const persTx = db.prepare('SELECT date, description, revision FROM transactions WHERE id = ?').get(wf.personal_transaction_id) as any;
            const busTx = db.prepare('SELECT revision FROM transactions WHERE id = ?').get(wf.business_transaction_id) as any;
            
            return secureJson({ 
                success: true, 
                original_category_account_id: originalCategoryAccountId,
                purchase_date: persTx?.date,
                purchase_description: persTx?.description,
                expected_personal_revision: persTx?.revision,
                expected_business_revision: busTx?.revision
            });
        }

        if (view === 'reimbursement_undo_match_preview') {
            const workflowId = url.searchParams.get('workflow_id');
            if (!workflowId) return secureJson({ error: 'Missing workflow_id' }, { status: 400 });
            
            const wf = db.prepare('SELECT * FROM reimbursement_workflows WHERE id = ?').get(workflowId) as any;
            if (!wf) return secureJson({ error: 'Workflow not found' }, { status: 404 });
            
            const persTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(wf.personal_reimbursement_tx_id) as any;
            const busTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(wf.business_reimbursement_tx_id) as any;
            
            const isPersonalManual = persTx?.idempotency_key === `reimb-match-pers-${wf.id}`;
            const isBusinessManual = busTx?.idempotency_key === `reimb-match-bus-${wf.id}`;

            const getOriginalTreatment = (tx: any) => {
                if (!tx) return null;
                const correction = db.prepare('SELECT previous_state FROM transaction_corrections WHERE transaction_id = ? AND reason = ? ORDER BY timestamp DESC LIMIT 1').get(tx.id, 'Matched to reimbursement workflow') as any;
                if (correction) {
                    const snapshot = JSON.parse(correction.previous_state);
                    return snapshot.postings || [];
                }
                return null;
            };

            const getBankLegAccount = (tx: any, clearingAccId: string) => {
                if (!tx) return null;
                const postings = db.prepare('SELECT account_id FROM journal_entries WHERE transaction_id = ?').all(tx.id) as any[];
                const bankLeg = postings.find(p => p.account_id !== clearingAccId);
                return bankLeg ? bankLeg.account_id : null;
            };

            return secureJson({ 
                success: true, 
                is_personal_manual: isPersonalManual,
                is_business_manual: isBusinessManual,
                personal_amount: wf.amount_cents,
                business_amount: wf.amount_cents,
                expected_personal_revision: persTx?.revision,
                expected_business_revision: busTx?.revision,
                expected_personal_tx_id: persTx?.id,
                expected_business_tx_id: busTx?.id,
                personal_date: persTx?.date,
                business_date: busTx?.date,
                personal_description: persTx?.description,
                business_description: busTx?.description,
                personal_original_postings: !isPersonalManual ? getOriginalTreatment(persTx) : null,
                business_original_postings: !isBusinessManual ? getOriginalTreatment(busTx) : null,
                personal_bank_account_id: isPersonalManual ? getBankLegAccount(persTx, wf.due_from_account_id) : null,
                business_bank_account_id: isBusinessManual ? getBankLegAccount(busTx, wf.due_to_account_id) : null
            });
        }

        // Slice 1D: View-specific queries
        if (view === 'drilldown') {
            const accountId = url.searchParams.get('account_id');
            if (!accountId) {
                return NextResponse.json({ error: 'Missing required parameter: account_id' }, { status: 400 });
            }
            const limitStr = url.searchParams.get('limit');
            const limit = limitStr ? parseInt(limitStr, 10) : undefined;
            const drilldown = getAccountLedgerDrilldown(db, {
                account_id: accountId,
                start_date: startDate,
                end_date: endDate,
                limit
            });
            return NextResponse.json({ success: true, drilldown });
        }

        if (view === 'ownership') {
            const accountId = url.searchParams.get('account_id');
            if (!accountId) {
                return NextResponse.json({ error: 'Missing required parameter: account_id' }, { status: 400 });
            }
            const ownership = getAccountOwnership(db, accountId);
            return NextResponse.json({ success: true, ownership });
        }

        if (view === 'members') {
            const householdId = url.searchParams.get('household_id');
            if (!householdId) {
                return secureJson({ error: 'Missing required parameter: household_id' }, { status: 400 });
            }
            const members = listEntityMembers(db, householdId);
            return secureJson({ success: true, members });
        }

        if (view === 'reports') {
            const scopeId = url.searchParams.get('scope_id') || entityId;
            const reportType = url.searchParams.get('report_type');

            // Safe handling for 'all' scope in reports (Clarification 1)
            if (scopeId === 'all' || entityId === 'all') {
                const allEnts = listEntities(db);
                const componentEntities = allEnts.map(ent => ({
                    entity: ent,
                    net_worth: getEntityNetWorth(db, ent.id, asOfDate),
                    accounts: listAccounts(db, ent.id).map(acc => {
                        const bal = resolveAccountBalance(db, acc, asOfDate);
                        return {
                            ...acc,
                            balance_cents: bal.balance_cents,
                            formatted_balance: bal.formatted_balance,
                            as_of_date: bal.as_of_date,
                            is_unknown: bal.is_unknown
                        };
                    })
                }));
                return secureJson({
                    success: true,
                    is_everything: true,
                    component_entities: componentEntities,
                    report: null
                });
            }

            if (reportType === 'scope_net_worth') {
                const scopeType = (url.searchParams.get('scope_type') || 'individual') as ScopeType;
                if (!scopeId) {
                    return secureJson({ error: 'Missing required parameter: scope_id' }, { status: 400 });
                }
                const report = getScopeNetWorth(db, scopeId, scopeType, asOfDate);
                return secureJson({ success: true, report });
            }

            if (reportType === 'consolidated_net_worth') {
                const targetEntityId = entityId || url.searchParams.get('scope_id');
                const reportingCurrency = url.searchParams.get('reporting_currency') || 'AUD';
                const scopeType = (url.searchParams.get('scope_type') || 'individual') as ScopeType;
                if (!targetEntityId) {
                    return secureJson({ error: 'Missing required parameter: entity_id' }, { status: 400 });
                }
                const report = getConsolidatedNetWorth(db, targetEntityId, reportingCurrency, asOfDate, scopeType);
                return secureJson({ success: true, report });
            }

            if (reportType === 'cash_flow') {
                if (!entityId) {
                    return secureJson({ error: 'Missing required parameter: entity_id' }, { status: 400 });
                }
                const report = getActualCashFlowStatement(db, entityId, startDate, endDate);
                return secureJson({ success: true, report });
            }

            // If no specific report_type given under view=reports, return aggregated reports
            if (entityId) {
                const scopeNetWorth = getScopeNetWorth(db, entityId, 'individual', asOfDate);
                const cashFlow = getActualCashFlowStatement(db, entityId, startDate, endDate);
                const incomeExpenses = getPeriodIncomeAndExpenses(db, entityId, startDate, endDate);
                return secureJson({
                    success: true,
                    reports: {
                        scope_net_worth: scopeNetWorth,
                        cash_flow: cashFlow,
                        accrual_income_expenses: incomeExpenses
                    }
                });
            }
        }

        const entities = listEntities(db);

        // If specific entity requested, return scoped accounts, calculated balances, net worth, and period cash flow
        if (entityId && entityId !== 'all') {
            const entity = getEntity(db, entityId);
            if (!entity) {
                return secureJson({ error: `Entity not found: ${entityId}` }, { status: 404 });
            }

            const accounts = listAccounts(db, entityId);
            const accountsWithBalances = accounts.map(acc => {
                const bal = resolveAccountBalance(db, acc, asOfDate);
                return {
                    ...acc,
                    balance_cents: bal.balance_cents,
                    formatted_balance: bal.formatted_balance,
                    as_of_date: bal.as_of_date,
                    is_unknown: bal.is_unknown
                };
            });

            const netWorth = getEntityNetWorth(db, entityId, asOfDate);
            const incomeExpenses = getPeriodIncomeAndExpenses(db, entityId, startDate, endDate);
            const totalCount = countTransactions(db, { entityId, accountId, startDate, endDate, intent });
            const transactions = includeTransactions
                ? listTransactions(db, { entityId, accountId, startDate, endDate, intent, limit: fetchLimit, offset: fetchOffset })
                : undefined;

            return secureJson({
                success: true,
                entity,
                accounts: accountsWithBalances,
                net_worth: netWorth,
                period_income_expenses: incomeExpenses,
                transactions,
                total_count: totalCount
            });
        }

        // Default: return all entities, accounts, and optional transactions
        const allAccounts = listAccounts(db);
        const accountsWithBalances = allAccounts.map(acc => {
            const bal = resolveAccountBalance(db, acc, asOfDate);
            return {
                ...acc,
                balance_cents: bal.balance_cents,
                formatted_balance: bal.formatted_balance,
                as_of_date: bal.as_of_date,
                is_unknown: bal.is_unknown
            };
        });

        const totalCount = countTransactions(db, { accountId, startDate, endDate, intent });
        const transactions = includeTransactions
            ? listTransactions(db, { accountId, startDate, endDate, intent, limit: fetchLimit, offset: fetchOffset })
            : undefined;

        // Note: Full cross-entity consolidation rules are complex (e.g. investments vs underlying assets).
        // For the MVP "Everything" view, we return null for net_worth to prompt the UI to show component totals instead of a misleading grand total.
        return secureJson({
            success: true,
            entities,
            accounts: accountsWithBalances,
            net_worth: null, 
            period_income_expenses: null,
            transactions,
            total_count: totalCount
        });
    } catch (error: any) {
        // Unknown persona → 400, unseeded vault → 503 (Phase 2.7).
        const demoRes = demoErrorResponse(error);
        if (demoRes) return demoRes;
        console.error('Accounting API GET Error:', error);
        return secureJson({ error: error.message || 'Failed to fetch accounting data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const securityCheck = validateLocalSecurity(request);
    if (securityCheck) return securityCheck;
    // Demo mode is read-only: any mutation carrying the demo cookie is refused (Phase 2.7).
    const demoDenied = demoReadOnlyResponse(request);
    if (demoDenied) return demoDenied;
    try {
        const db = getDbForRequest(request);

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return secureJson({ error: 'Request body must be a valid JSON object' }, { status: 400 });
        }

        const { action } = body;

        // 1. Create Entity
        if (action === 'create_entity') {
            const { entity } = body;
            if (!entity) {
                return secureJson({ error: 'Missing entity payload' }, { status: 400 });
            }
            const created = createEntity(db, entity);
            return secureJson({ success: true, entity: created }, { status: 201 });
        }

        // 2. Create Account (with optional atomic opening balance)
        if (action === 'create_account') {
            const { account } = body;
            if (!account) {
                return secureJson({ error: 'Missing account payload' }, { status: 400 });
            }
            const result = createAccount(db, account);
            const balance = getAccountBalance(db, result.account.id);
            return secureJson({
                success: true,
                account: {
                    ...result.account,
                    balance_cents: balance.balance_cents,
                    formatted_balance: balance.formatted_balance
                },
                opening_transaction: result.openingTransaction || null
            }, { status: 201 });
        }

        // 3. Update Account (with optimistic concurrency check)
        if (action === 'update_account') {
            const { account_id, expected_revision, updates } = body;
            if (!account_id || expected_revision === undefined || !updates) {
                return secureJson({ error: 'Missing account_id, expected_revision, or updates' }, { status: 400 });
            }
            const updated = updateAccount(db, account_id, expected_revision, updates);
            const balance = getAccountBalance(db, updated.id);
            return secureJson({
                success: true,
                account: {
                    ...updated,
                    balance_cents: balance.balance_cents,
                    formatted_balance: balance.formatted_balance
                }
            });
        }

        if (action === 'set_opening_balance') {
            const { account_id, amount_cents, date } = body;
            if (!account_id || typeof amount_cents !== 'number' || !date) {
                return secureJson({ error: 'Missing or invalid parameters for set_opening_balance' }, { status: 400 });
            }
            setAccountOpeningBalance(db, account_id, amount_cents, date);
            return secureJson({ success: true }, { status: 200 });
        }

        // 4. Record Daily Events (M1-FLOW-02, M1-FLOW-03, M1-FLOW-04, M1-FLOW-05)
        if (action === 'record_income') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing income payload' }, { status: 400 });
            const tx = recordIncome(db, payload);
            return secureJson({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_expense') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing expense payload' }, { status: 400 });
            const tx = recordExpense(db, payload);
            return secureJson({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_transfer') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing transfer payload' }, { status: 400 });
            const tx = recordTransfer(db, payload);
            return secureJson({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_card_repayment') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing credit card repayment payload' }, { status: 400 });
            const tx = recordCreditCardRepayment(db, payload);
            return secureJson({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_loan_repayment') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing loan repayment payload' }, { status: 400 });
            const tx = recordLoanRepayment(db, payload);
            return secureJson({ success: true, transaction: tx }, { status: 201 });
        }

        // 5. Raw Balanced Transaction Commit
        if (action === 'post_transaction') {
            const { transaction } = body;
            if (!transaction) return secureJson({ error: 'Missing transaction payload' }, { status: 400 });
            const tx = postTransaction(db, transaction);
            return secureJson({ success: true, transaction: tx }, { status: 201 });
        }

        // 6. Auditable Transaction Correction & Void (M1-DOM-05, T12, T13)
        if (action === 'correct_transaction') {
            const { correction } = body;
            if (!correction) return secureJson({ error: 'Missing correction payload' }, { status: 400 });
            
            if ('is_internal_reimbursement_operation' in correction) {
                delete correction.is_internal_reimbursement_operation;
            }

            const result = correctTransaction(db, correction);
            return secureJson({ success: true, correction: result });
        }

        // 7. Joint Ownership Allocation (M1-FLOW-07, T7)
        if (action === 'set_ownership') {
            const { account_id, allocations } = body;
            if (!account_id || !allocations) {
                return secureJson({ error: 'Missing account_id or allocations array' }, { status: 400 });
            }
            setAccountOwnership(db, account_id, allocations);
            const updatedOwnership = getAccountOwnership(db, account_id);
            return secureJson({ success: true, ownership: updatedOwnership });
        }

        // 8. Dated Non-Cash Asset Valuation Adjustment (M1-FLOW-06, T6)
        if (action === 'record_valuation') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing asset valuation payload' }, { status: 400 });
            const tx = recordAssetValuation(db, payload);
            return secureJson({ success: true, transaction: tx }, { status: 201 });
        }

        // 9. Exchange Rate Definition (M1-CALC-03, T8)
        if (action === 'set_exchange_rate') {
            const { rate } = body;
            if (!rate) return secureJson({ error: 'Missing exchange rate payload' }, { status: 400 });
            const saved = setExchangeRate(db, rate);
            return secureJson({ success: true, exchange_rate: saved }, { status: 201 });
        }

        // 10. Save Draft (M1-DRAFT-01, Clarification 3)
        // Why this exists:
        // Persists unposted/unresolved financial tasks (e.g. personally paid business expenses)
        // directly into the authoritative SQLite vault so drafts survive cross-browser reopening.
        // Validates server-side while allowing genuinely unknown facts to remain null.
        if (action === 'save_draft') {
            const { draft } = body;
            if (!draft || typeof draft !== 'object') {
                return secureJson({ error: 'Missing draft payload' }, { status: 400 });
            }
            try {
                const saved = saveDraft(db, draft);
                return secureJson({ success: true, draft: saved });
            } catch (err: any) {
                return secureJson({ error: err.message }, { status: 400 });
            }
        }

        // 11. Delete Draft
        // Why this exists:
        // Discards or cleans up finalized drafts once converted to ledger postings or rejected.
        if (action === 'delete_draft') {
            const { id } = body;
            if (!id) return secureJson({ error: 'Missing draft id' }, { status: 400 });
            deleteDraft(db, id);
            return secureJson({ success: true, deleted_id: id });
        }

        if (action === 'process_personally_paid_expense') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing payload' }, { status: 400 });
            try {
                const wf = processPersonallyPaidBusinessExpense(db, payload as ProcessPersonallyPaidExpenseInput);
                return secureJson({ success: true, workflow: wf }, { status: 201 });
            } catch (err: any) {
                return secureJson({ error: err.message }, { status: 400 });
            }
        }

        if (action === 'undo_personally_paid_expense') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing payload' }, { status: 400 });
            try {
                const wf = undoPersonallyPaidBusinessExpense(db, payload as UndoPersonallyPaidExpenseInput);
                return secureJson({ success: true, workflow: wf }, { status: 200 });
            } catch (err: any) {
                return secureJson({ error: err.message }, { status: 400 });
            }
        }

        if (action === 'match_reimbursement') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing payload' }, { status: 400 });
            try {
                const wf = matchReimbursement(db, payload as MatchReimbursementInput);
                return secureJson({ success: true, workflow: wf }, { status: 201 });
            } catch (err: any) {
                return secureJson({ error: err.message }, { status: 400 });
            }
        }

        if (action === 'undo_reimbursement_match') {
            const { payload } = body;
            if (!payload) return secureJson({ error: 'Missing payload' }, { status: 400 });
            try {
                const wf = undoReimbursementMatch(db, payload as UndoReimbursementMatchInput);
                return secureJson({ success: true, workflow: wf }, { status: 200 });
            } catch (err: any) {
                return secureJson({ error: err.message }, { status: 400 });
            }
        }

        return secureJson({ error: `Unsupported action: ${action}` }, { status: 400 });
    } catch (error: any) {
        if (error instanceof ValidationError) {
            return secureJson({ error: error.message }, { status: 400 });
        }
        if (error instanceof ConflictError) {
            return secureJson({ error: error.message }, { status: 409 });
        }
        console.error('Accounting API POST Error:', error);
        return secureJson({ error: error.message || 'Accounting transaction failed' }, { status: 500 });
    }
}
