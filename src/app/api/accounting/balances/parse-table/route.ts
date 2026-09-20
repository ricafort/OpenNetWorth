/**
 * Structured Balance Table Parser API Route
 * 
 * Why this file exists:
 * Implements Delivery 1 deterministic structured parsing for pasted CSVs, TSVs, or tables.
 * Returns parsed balance proposals alongside match suggestions against existing `m1_accounts`.
 * 
 * Tricky logic:
 * - Match suggestions: Matches candidate accounts by name similarity or previous source mappings.
 * - Currency isolation: Never suggests matching an account of a different currency (e.g. AUD proposal will not match a USD account).
 * 
 * TODO: Add automatic delimiter detection metrics in future logging.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/infrastructure/sqlite/db';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { parseStructuredTable } from '@/lib/domain/accounting/structuredBalanceParser';
import { listAccounts } from '@/lib/domain/accounting/accountService';
import { getLatestObservation } from '@/lib/domain/accounting/balanceObservationService';

export async function POST(request: Request) {
    try {
        const db = getDb();
        initAccountingSchema(db);

        const body = await request.json();
        const { text, defaultCurrency = 'AUD', defaultDate } = body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return NextResponse.json({ error: 'Text content is required for table parsing.' }, { status: 400 });
        }

        const parseResult = parseStructuredTable(text, defaultCurrency, defaultDate);
        const existingAccounts = listAccounts(db);

        // Enhance proposals with match suggestions from existing accounts
        const enhancedProposals = parseResult.proposals.map(proposal => {
            const proposalNameNorm = proposal.account_name.toLowerCase().trim();

            // Disambiguate account candidates:
            // Only auto-match if exactly one unique candidate matches.
            // If multiple accounts have the same matching name across different entities/owners,
            // remain unmatched (null) to require user confirmation (P11).
            const matchingAccounts = existingAccounts.filter(acc => {
                if (acc.currency !== proposal.currency) return false;
                const accNameNorm = acc.name.toLowerCase().trim();
                return accNameNorm === proposalNameNorm ||
                    accNameNorm.includes(proposalNameNorm) ||
                    proposalNameNorm.includes(accNameNorm);
            });

            const matchedAccount = matchingAccounts.length === 1 ? matchingAccounts[0] : null;

            let previousObservation = null;
            if (matchedAccount) {
                previousObservation = getLatestObservation(db, matchedAccount.id);
            }

            return {
                ...proposal,
                matched_account_id: matchedAccount ? matchedAccount.id : null,
                matched_account_name: matchedAccount ? matchedAccount.name : null,
                matched_entity_id: matchedAccount ? matchedAccount.entity_id : null,
                previous_amount_cents: previousObservation ? previousObservation.amount_cents : (matchedAccount?.opening_balance_cents || null),
                expected_balance_revision: matchedAccount ? (matchedAccount.balance_revision || 1) : 1
            };
        });

        return NextResponse.json({
            success: true,
            total_lines: parseResult.total_lines,
            parsed_count: parseResult.parsed_count,
            skipped_count: parseResult.skipped_count,
            delimiter: parseResult.detected_delimiter,
            proposals: enhancedProposals
        });
    } catch (error: any) {
        console.error('Parse Table POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
