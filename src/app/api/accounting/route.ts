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
import { getDb } from '@/infrastructure/sqlite/db';
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
    setExchangeRate
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
import { saveDraft, getDrafts, deleteDraft } from '@/lib/domain/accounting/draftService';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { ScopeType } from '@/lib/domain/accounting/types';

export async function GET(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db); // Idempotent schema check

        const url = new URL(request.url);
        const view = url.searchParams.get('view');
        const entityId = url.searchParams.get('entity_id');
        const asOfDate = url.searchParams.get('as_of_date') || undefined;
        const startDate = url.searchParams.get('start_date') || undefined;
        const endDate = url.searchParams.get('end_date') || undefined;
        const includeTransactions = url.searchParams.get('include_transactions') === 'true';
        const limitParam = url.searchParams.get('limit');
        const fetchLimit = limitParam ? parseInt(limitParam, 10) : 500;
        const offsetParam = url.searchParams.get('offset');
        const fetchOffset = offsetParam ? parseInt(offsetParam, 10) : 0;

        // Drafts query (M1-DRAFT-01, Clarification 3)
        if (view === 'drafts') {
            const drafts = getDrafts(db, entityId && entityId !== 'all' ? { entity_id: entityId } : undefined);
            return NextResponse.json({ success: true, drafts });
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
                return NextResponse.json({ error: 'Missing required parameter: household_id' }, { status: 400 });
            }
            const members = listEntityMembers(db, householdId);
            return NextResponse.json({ success: true, members });
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
                        const bal = getAccountBalance(db, acc.id, asOfDate);
                        return {
                            ...acc,
                            balance_cents: bal.balance_cents,
                            formatted_balance: bal.formatted_balance,
                            as_of_date: bal.as_of_date
                        };
                    })
                }));
                return NextResponse.json({
                    success: true,
                    is_everything: true,
                    component_entities: componentEntities,
                    report: null
                });
            }

            if (reportType === 'scope_net_worth') {
                const scopeType = (url.searchParams.get('scope_type') || 'individual') as ScopeType;
                if (!scopeId) {
                    return NextResponse.json({ error: 'Missing required parameter: scope_id' }, { status: 400 });
                }
                const report = getScopeNetWorth(db, scopeId, scopeType, asOfDate);
                return NextResponse.json({ success: true, report });
            }

            if (reportType === 'consolidated_net_worth') {
                const targetEntityId = entityId || url.searchParams.get('scope_id');
                const reportingCurrency = url.searchParams.get('reporting_currency') || 'AUD';
                const scopeType = (url.searchParams.get('scope_type') || 'individual') as ScopeType;
                if (!targetEntityId) {
                    return NextResponse.json({ error: 'Missing required parameter: entity_id' }, { status: 400 });
                }
                const report = getConsolidatedNetWorth(db, targetEntityId, reportingCurrency, asOfDate, scopeType);
                return NextResponse.json({ success: true, report });
            }

            if (reportType === 'cash_flow') {
                if (!entityId) {
                    return NextResponse.json({ error: 'Missing required parameter: entity_id' }, { status: 400 });
                }
                const report = getActualCashFlowStatement(db, entityId, startDate, endDate);
                return NextResponse.json({ success: true, report });
            }

            // If no specific report_type given under view=reports, return aggregated reports
            if (entityId) {
                const scopeNetWorth = getScopeNetWorth(db, entityId, 'individual', asOfDate);
                const cashFlow = getActualCashFlowStatement(db, entityId, startDate, endDate);
                const incomeExpenses = getPeriodIncomeAndExpenses(db, entityId, startDate, endDate);
                return NextResponse.json({
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
                return NextResponse.json({ error: `Entity not found: ${entityId}` }, { status: 404 });
            }

            const accounts = listAccounts(db, entityId);
            const accountsWithBalances = accounts.map(acc => {
                const bal = getAccountBalance(db, acc.id, asOfDate);
                return {
                    ...acc,
                    balance_cents: bal.balance_cents,
                    formatted_balance: bal.formatted_balance,
                    as_of_date: bal.as_of_date
                };
            });

            const netWorth = getEntityNetWorth(db, entityId, asOfDate);
            const incomeExpenses = getPeriodIncomeAndExpenses(db, entityId, startDate, endDate);
            const totalCount = countTransactions(db, { entityId, startDate, endDate });
            const transactions = includeTransactions
                ? listTransactions(db, { entityId, startDate, endDate, limit: fetchLimit, offset: fetchOffset })
                : undefined;

            return NextResponse.json({
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
            const bal = getAccountBalance(db, acc.id, asOfDate);
            return {
                ...acc,
                balance_cents: bal.balance_cents,
                formatted_balance: bal.formatted_balance,
                as_of_date: bal.as_of_date
            };
        });

        const totalCount = countTransactions(db, { startDate, endDate });
        const transactions = includeTransactions
            ? listTransactions(db, { startDate, endDate, limit: fetchLimit, offset: fetchOffset })
            : undefined;

        // Note: Full cross-entity consolidation rules are complex (e.g. investments vs underlying assets).
        // For the MVP "Everything" view, we return null for net_worth to prompt the UI to show component totals instead of a misleading grand total.
        return NextResponse.json({
            success: true,
            entities,
            accounts: accountsWithBalances,
            net_worth: null, 
            period_income_expenses: null,
            transactions,
            total_count: totalCount
        });
    } catch (error: any) {
        console.error('Accounting API GET Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch accounting data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db); // Idempotent schema check

        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Request body must be a valid JSON object' }, { status: 400 });
        }

        const { action } = body;

        // 1. Create Entity
        if (action === 'create_entity') {
            const { entity } = body;
            if (!entity) {
                return NextResponse.json({ error: 'Missing entity payload' }, { status: 400 });
            }
            const created = createEntity(db, entity);
            return NextResponse.json({ success: true, entity: created }, { status: 201 });
        }

        // 2. Create Account (with optional atomic opening balance)
        if (action === 'create_account') {
            const { account } = body;
            if (!account) {
                return NextResponse.json({ error: 'Missing account payload' }, { status: 400 });
            }
            const result = createAccount(db, account);
            const balance = getAccountBalance(db, result.account.id);
            return NextResponse.json({
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
                return NextResponse.json({ error: 'Missing account_id, expected_revision, or updates' }, { status: 400 });
            }
            const updated = updateAccount(db, account_id, expected_revision, updates);
            const balance = getAccountBalance(db, updated.id);
            return NextResponse.json({
                success: true,
                account: {
                    ...updated,
                    balance_cents: balance.balance_cents,
                    formatted_balance: balance.formatted_balance
                }
            });
        }

        // 4. Record Daily Events (M1-FLOW-02, M1-FLOW-03, M1-FLOW-04, M1-FLOW-05)
        if (action === 'record_income') {
            const { payload } = body;
            if (!payload) return NextResponse.json({ error: 'Missing income payload' }, { status: 400 });
            const tx = recordIncome(db, payload);
            return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_expense') {
            const { payload } = body;
            if (!payload) return NextResponse.json({ error: 'Missing expense payload' }, { status: 400 });
            const tx = recordExpense(db, payload);
            return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_transfer') {
            const { payload } = body;
            if (!payload) return NextResponse.json({ error: 'Missing transfer payload' }, { status: 400 });
            const tx = recordTransfer(db, payload);
            return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_card_repayment') {
            const { payload } = body;
            if (!payload) return NextResponse.json({ error: 'Missing credit card repayment payload' }, { status: 400 });
            const tx = recordCreditCardRepayment(db, payload);
            return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
        }

        if (action === 'record_loan_repayment') {
            const { payload } = body;
            if (!payload) return NextResponse.json({ error: 'Missing loan repayment payload' }, { status: 400 });
            const tx = recordLoanRepayment(db, payload);
            return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
        }

        // 5. Raw Balanced Transaction Commit
        if (action === 'post_transaction') {
            const { transaction } = body;
            if (!transaction) return NextResponse.json({ error: 'Missing transaction payload' }, { status: 400 });
            const tx = postTransaction(db, transaction);
            return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
        }

        // 6. Auditable Transaction Correction & Void (M1-DOM-05, T12, T13)
        if (action === 'correct_transaction') {
            const { correction } = body;
            if (!correction) return NextResponse.json({ error: 'Missing correction payload' }, { status: 400 });
            const result = correctTransaction(db, correction);
            return NextResponse.json({ success: true, correction: result });
        }

        // 7. Joint Ownership Allocation (M1-FLOW-07, T7)
        if (action === 'set_ownership') {
            const { account_id, allocations } = body;
            if (!account_id || !allocations) {
                return NextResponse.json({ error: 'Missing account_id or allocations array' }, { status: 400 });
            }
            setAccountOwnership(db, account_id, allocations);
            const updatedOwnership = getAccountOwnership(db, account_id);
            return NextResponse.json({ success: true, ownership: updatedOwnership });
        }

        // 8. Dated Non-Cash Asset Valuation Adjustment (M1-FLOW-06, T6)
        if (action === 'record_valuation') {
            const { payload } = body;
            if (!payload) return NextResponse.json({ error: 'Missing asset valuation payload' }, { status: 400 });
            const tx = recordAssetValuation(db, payload);
            return NextResponse.json({ success: true, transaction: tx }, { status: 201 });
        }

        // 9. Exchange Rate Definition (M1-CALC-03, T8)
        if (action === 'set_exchange_rate') {
            const { rate } = body;
            if (!rate) return NextResponse.json({ error: 'Missing exchange rate payload' }, { status: 400 });
            const saved = setExchangeRate(db, rate);
            return NextResponse.json({ success: true, exchange_rate: saved }, { status: 201 });
        }

        // 10. Save Draft (M1-DRAFT-01, Clarification 3)
        // Why this exists:
        // Persists unposted/unresolved financial tasks (e.g. personally paid business expenses)
        // directly into the authoritative SQLite vault so drafts survive cross-browser reopening.
        // Validates server-side while allowing genuinely unknown facts to remain null.
        if (action === 'save_draft') {
            const { draft } = body;
            if (!draft || typeof draft !== 'object') {
                return NextResponse.json({ error: 'Missing draft payload' }, { status: 400 });
            }
            try {
                const saved = saveDraft(db, draft);
                return NextResponse.json({ success: true, draft: saved });
            } catch (err: any) {
                return NextResponse.json({ error: err.message }, { status: 400 });
            }
        }

        // 11. Delete Draft
        // Why this exists:
        // Discards or cleans up finalized drafts once converted to ledger postings or rejected.
        if (action === 'delete_draft') {
            const { id } = body;
            if (!id) return NextResponse.json({ error: 'Missing draft id' }, { status: 400 });
            deleteDraft(db, id);
            return NextResponse.json({ success: true, deleted_id: id });
        }

        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    } catch (error: any) {
        if (error instanceof ValidationError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error instanceof ConflictError) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        console.error('Accounting API POST Error:', error);
        return NextResponse.json({ error: error.message || 'Accounting transaction failed' }, { status: 500 });
    }
}
