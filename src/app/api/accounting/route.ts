/**
 * Milestone 1 Accounting Engine API Route
 * 
 * Why this file exists:
 * Authoritative, local-first API endpoint for managing entities, accounts,
 * opening balances, and retrieving real-time calculated balances and net worth.
 * 
 * Tricky logic:
 * - Scoped actions validate all inputs before acquiring database locks.
 * - Account creation with an opening balance commits atomically in a single transaction.
 * - Stale revision updates return HTTP 409 Conflict rather than silently overwriting (M1-SAFE-06).
 * - All monetary balances are returned as exact minor-unit integers (`balance_cents`)
 *   alongside formatted display strings.
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
    getEntityNetWorth
} from '@/lib/domain/accounting/balanceService';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';

export async function GET(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db); // Idempotent schema check

        const url = new URL(request.url);
        const entityId = url.searchParams.get('entity_id');
        const asOfDate = url.searchParams.get('as_of_date') || undefined;

        const entities = listEntities(db);

        // If specific entity requested, return scoped accounts, calculated balances, and net worth
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

            return NextResponse.json({
                success: true,
                entity,
                accounts: accountsWithBalances,
                net_worth: netWorth
            });
        }

        // Default: return all entities and accounts
        const allAccounts = listAccounts(db);
        return NextResponse.json({
            success: true,
            entities,
            accounts: allAccounts
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
