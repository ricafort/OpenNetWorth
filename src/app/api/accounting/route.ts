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
    ValidationError,
    ConflictError
} from '@/lib/domain/accounting/accountService';
import {
    getAccountBalance,
    getEntityNetWorth,
    getPeriodIncomeAndExpenses
} from '@/lib/domain/accounting/balanceService';
import {
    postTransaction,
    recordIncome,
    recordExpense,
    recordTransfer,
    recordCreditCardRepayment,
    recordLoanRepayment,
    correctTransaction,
    listTransactions
} from '@/lib/domain/accounting/transactionService';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';

export async function GET(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db); // Idempotent schema check

        const url = new URL(request.url);
        const entityId = url.searchParams.get('entity_id');
        const asOfDate = url.searchParams.get('as_of_date') || undefined;
        const startDate = url.searchParams.get('start_date') || undefined;
        const endDate = url.searchParams.get('end_date') || undefined;
        const includeTransactions = url.searchParams.get('include_transactions') === 'true';

        const entities = listEntities(db);

        // If specific entity requested, return scoped accounts, calculated balances, net worth, and period cash flow
        if (entityId) {
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
            const transactions = includeTransactions
                ? listTransactions(db, { entityId, startDate, endDate, limit: 100 })
                : undefined;

            return NextResponse.json({
                success: true,
                entity,
                accounts: accountsWithBalances,
                net_worth: netWorth,
                period_income_expenses: incomeExpenses,
                transactions
            });
        }

        // Default: return all entities, accounts, and optional transactions
        const allAccounts = listAccounts(db);
        const transactions = includeTransactions
            ? listTransactions(db, { limit: 100 })
            : undefined;

        return NextResponse.json({
            success: true,
            entities,
            accounts: allAccounts,
            transactions
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
