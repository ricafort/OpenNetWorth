/**
 * Why this file exists:
 * Powers OpenNetWorth's Financial Board AI Mentorship feature.
 * Connects to a Local LLM (LM Studio or Ollama) running strictly on the user's
 * computer. Zero prompt data or financial figures ever leave the local network.
 *
 * Tricky logic:
 * - If the local LLM is offline or busy, instead of throwing an error, we provide
 *   a grounded philosophical perspective using the mentor's static wisdom principles
 *   combined with an informative banner explaining how to start Ollama or LM Studio.
 * - Allows the client to pass custom local models or endpoints (e.g. from the in-app
 *   Local AI settings modal).
 *
 * TODO items:
 * - Implement Server-Sent Events (SSE) streaming for real-time token-by-token typing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryLocalLlm, LocalLlmMessage } from '@/lib/api/localLlm';
import { parseSpendingIntent } from './intentParser';
import { getDb } from '@/infrastructure/sqlite/db';
import { listEntities, listAccounts } from '@/lib/domain/accounting/accountService';
import { getPeriodIncomeAndExpenses } from '@/lib/domain/accounting/balanceService';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';
import { CurrencyCode, CURRENCY_DECIMALS } from '@/lib/domain/accounting/types';
import { validateLocalSecurity, applySensitiveHeaders } from '@/lib/api/localSecurity';

function secureJson(data: any, init?: ResponseInit): NextResponse {
    return applySensitiveHeaders(NextResponse.json(data, init));
}

export async function POST(req: NextRequest) {
    const securityCheck = validateLocalSecurity(req);
    if (securityCheck) return securityCheck;
    try {
        const { mentor, mode, userContext, message, pendingContext, resolvedEntityId, localConfig } = await req.json();

        if (!message) {
            return secureJson({ error: 'Message is required' }, { status: 400 });
        }

        const db = getDb();
        const availableEntities = listEntities(db);
        const intent = parseSpendingIntent(message, availableEntities, undefined, pendingContext, resolvedEntityId);

        if (intent.isSpendingQuery && intent.needsClarification) {
            return secureJson({ 
                response: intent.needsClarification,
                pending_intent: {
                    type: 'spending_clarification',
                    originalMessage: message,
                    startDate: intent.startDate,
                    endDate: intent.endDate,
                    periodLabel: intent.periodLabel
                }
            });
        }

        let facts: any = null;
        let factsContext = '';

        if (intent.isSpendingQuery) {
            const entity = availableEntities.find(e => e.id === intent.entityId);
            const entityName = entity ? entity.name : (intent.entityId === 'all' ? 'All Accounts' : 'Personal');
            
            const incomeExpenses = getPeriodIncomeAndExpenses(db, intent.entityId || 'local_user', intent.startDate, intent.endDate);
            
            const txQuery = `
                SELECT DISTINCT t.id 
                FROM m1_journal_entries j
                JOIN m1_accounts a ON j.account_id = a.id
                JOIN m1_transactions t ON j.transaction_id = t.id
                ${intent.entityId === 'all' ? 'WHERE a.type = \'expense\'' : 'WHERE a.entity_id = ? AND a.type = \'expense\''} AND t.status = 'posted'
                ${intent.startDate ? 'AND t.date >= ?' : ''}
                ${intent.endDate ? 'AND t.date <= ?' : ''}
            `;
            const params: any[] = [];
            if (intent.entityId !== 'all') params.push(intent.entityId || 'local_user');
            if (intent.startDate) params.push(intent.startDate);
            if (intent.endDate) params.push(intent.endDate);
            
            const txRows = db.prepare(txQuery).all(...params) as { id: string }[];
            const transactionIds = txRows.map(r => r.id);

            facts = {
                type: 'spending',
                periodLabel: intent.periodLabel,
                entityName: entityName,
                entityId: intent.entityId || 'local_user',
                startDate: intent.startDate,
                endDate: intent.endDate,
                totals: incomeExpenses.total_expenses_cents_by_currency, 
                formattedTotals: incomeExpenses.formatted_expenses_by_currency,
                transactionIds: transactionIds,
                categories: incomeExpenses.breakdown_by_category 
            };

            const expenseStrings = Object.entries(incomeExpenses.formatted_expenses_by_currency).map(([curr, formatted]) => `${formatted}`).join(', ') || '0.00';
            
            factsContext = `
DETERMINISTIC FACTS FOR SPENDING QUERY:
- Entity Scope: ${entityName}
- Date Scope: ${intent.periodLabel}
- Total Expenses: ${expenseStrings}
Note: Transfers and cancelled transactions are excluded. Mixed currencies are kept separate.
`;
        }

        const currency = ((userContext?.currency || 'USD') as string).toUpperCase() as CurrencyCode;
        
        // Why this logic exists:
        // Fulfills Item 3: Never retain client-provided wealth totals when server balances are unavailable.
        // Return 'Unknown / needs balance' when no balances are known. Use explicitly labelled known
        // subtotals when coverage is partial. Apply this to both the LLM prompt and offline response.
        // Tricky logic:
        // Client userContext is ONLY used for preferred currency. Under no circumstance are client-supplied
        // netWorth, totalAssets, or totalLiabilities trusted or reflected in prompts or advice.
        // TODO: In Milestone 2, support per-entity assistant context filtering based on active screen.
        const dbAccounts = listAccounts(db).filter(a => a.is_active && (a.type === 'asset' || a.type === 'liability'));
        
        let netWorthDisplay = 'Unknown / needs balance';
        let totalAssetsDisplay = 'Unknown / needs balance';
        let totalLiabilitiesDisplay = 'Unknown / needs balance';
        let unrecordedNotice = '';
        let missingRatesNotice = '';

        if (dbAccounts.length > 0) {
            const summary = getSharedFinancialSummary(db, { reporting_currency: currency });
            const decimals = CURRENCY_DECIMALS[currency] ?? 2;
            const divisor = Math.pow(10, decimals);
            const knownAccountsCount = summary.accounts?.length ?? 0;
            const unrecordedCount = summary.unrecorded_count ?? 0;

            if (knownAccountsCount > 0) {
                const isPartial = unrecordedCount > 0;
                const prefix = isPartial ? 'Known ' : '';
                const partialSuffix = isPartial ? ' (partial snapshot)' : '';

                if (summary.converted_net_worth?.is_complete && summary.converted_total_assets && summary.converted_total_liabilities) {
                    const nw = summary.converted_net_worth.amount_cents / divisor;
                    const assets = summary.converted_total_assets.amount_cents / divisor;
                    const liab = summary.converted_total_liabilities.amount_cents / divisor;
                    const nwStr = `${nw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
                    const assetsStr = `${assets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
                    const liabStr = `${liab.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

                    netWorthDisplay = isPartial ? `${prefix}Net Worth: ${nwStr}${partialSuffix}` : nwStr;
                    totalAssetsDisplay = `${prefix}Assets: ${assetsStr}`;
                    totalLiabilitiesDisplay = `${prefix}Liabilities: ${liabStr}`;
                } else {
                    // Native currency subtotals
                    const nwCurrencies = Object.keys(summary.net_worth_cents_by_currency || {}) as CurrencyCode[];
                    if (nwCurrencies.length > 0) {
                        const nativeNwStr = nwCurrencies.map(c => {
                            const dec = CURRENCY_DECIMALS[c] ?? 2;
                            const amt = (summary.net_worth_cents_by_currency[c] || 0) / Math.pow(10, dec);
                            return `${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
                        }).join(' + ');

                        const assetCurrencies = Object.keys(summary.total_assets_cents_by_currency || {}) as CurrencyCode[];
                        const nativeAssetsStr = assetCurrencies.map(c => {
                            const dec = CURRENCY_DECIMALS[c] ?? 2;
                            const amt = (summary.total_assets_cents_by_currency[c] || 0) / Math.pow(10, dec);
                            return `${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
                        }).join(' + ') || `0.00 ${currency}`;

                        const liabCurrencies = Object.keys(summary.total_liabilities_cents_by_currency || {}) as CurrencyCode[];
                        const nativeLiabStr = liabCurrencies.map(c => {
                            const dec = CURRENCY_DECIMALS[c] ?? 2;
                            const amt = (summary.total_liabilities_cents_by_currency[c] || 0) / Math.pow(10, dec);
                            return `${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${c}`;
                        }).join(' + ') || `0.00 ${currency}`;

                        netWorthDisplay = isPartial ? `${prefix}Net Worth: ${nativeNwStr}${partialSuffix}` : nativeNwStr;
                        totalAssetsDisplay = `${prefix}Assets: ${nativeAssetsStr}`;
                        totalLiabilitiesDisplay = `${prefix}Liabilities: ${nativeLiabStr}`;
                    }

                    if (summary.converted_net_worth?.missing_rates?.length) {
                        missingRatesNotice = `\n- Exchange Rates: Missing rates for (${summary.converted_net_worth.missing_rates.join(', ')}). Totals are held in native currencies.`;
                    }
                }

                if (isPartial) {
                    const names = summary.unrecorded_accounts.map(a => a.name).join(', ');
                    unrecordedNotice = `\n- Unrecorded Accounts: ${unrecordedCount} account(s) need balance updates (${names}). Snapshot represents explicitly known subtotals only.`;
                }
            } else {
                // dbAccounts exist, but zero have recorded balance observations
                const names = summary.unrecorded_accounts.map(a => a.name).join(', ');
                unrecordedNotice = `\n- Unrecorded Accounts: All ${unrecordedCount} account(s) need balance updates (${names}). No balances are currently known.`;
            }
        } else {
            unrecordedNotice = '\n- Account Coverage: No accounts are currently configured in the database.';
        }

        const systemPrompt = `You are an AI-simulated financial wisdom persona inspired by the philosophy of: ${mentor?.name || 'Financial Mentor'} (${mentor?.archetype || 'Wisdom & Strategy'}).
Personality & Philosophy: ${mentor?.personality_prompt || mentor?.description || 'Thoughtful financial guidance.'}

Your Goal:
- MODE = 'learn': Provide educational explanations of financial concepts, metrics, and debt/wealth mechanics.
- MODE = 'reflect': Provide philosophical, mindset, and risk-management reflections on the user's financial posture.

USER FINANCIAL SNAPSHOT:
- Preferred Currency: ${currency}
- Net Worth: ${netWorthDisplay}
- Total Assets: ${totalAssetsDisplay}
- Total Liabilities: ${totalLiabilitiesDisplay}${unrecordedNotice}${missingRatesNotice}
${factsContext}

STRICT CONSTRAINTS:
- Keep your reply concise, punchy, and structured (under 160 words).
- Speak directly in the first person as this mentor persona.
- Reference their numbers where helpful to provide tailored perspective.
- Always include this exact disclaimer at the bottom: "Educational perspective only. Not financial advice."`;

        const messages: LocalLlmMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `[Mode: ${mode || 'reflect'}]\n\n${message}` }
        ];

        try {
            const responseText = await queryLocalLlm(messages, {
                endpoint: localConfig?.endpoint,
                model: localConfig?.model,
                temperature: 0.7,
                maxTokens: 2048,
            });

            if (!responseText || !responseText.trim()) {
                throw new Error('Local LLM returned an empty response');
            }

            return secureJson({ response: responseText.trim(), facts });
        } catch (llmError: any) {
            console.warn('Local LLM unavailable, using offline wisdom fallback:', llmError.message);

            let offlineAdvice = `### ${mentor?.name || 'Mentor'} (${mentor?.archetype || 'Wisdom'}) Perspective\n\n`;
            
            if (facts) {
                offlineAdvice += `Looking at your deterministic facts for ${facts.entityName} during ${facts.periodLabel}, your expenses were: ${factsContext.split('Total Expenses: ')[1]?.split('\n')[0]}.\n\n`;
            } else if (netWorthDisplay === 'Unknown / needs balance') {
                offlineAdvice += `Looking at your financial picture (account balances are currently Unknown / needs balance), the key principle is ${mentor?.description || 'discipline and consistent compounding'}.\n\n`;
                if (unrecordedNotice) {
                    offlineAdvice += `*(Note: No balances are currently known. Add or update account balance observations to calculate your net worth.)*\n\n`;
                }
            } else if (unrecordedNotice) {
                offlineAdvice += `Looking at your current known balance (${netWorthDisplay} across ${totalAssetsDisplay} and ${totalLiabilitiesDisplay}), the key principle is ${mentor?.description || 'discipline and consistent compounding'}.\n\n`;
                offlineAdvice += `*(Note: Some accounts have unrecorded balances, so this partial snapshot represents known balances only.)*\n\n`;
            } else {
                offlineAdvice += `Looking at your current balance (${netWorthDisplay} net worth across ${totalAssetsDisplay} in assets and ${totalLiabilitiesDisplay} in debt), the key principle is ${mentor?.description || 'discipline and consistent compounding'}.\n\n`;
            }
            
            offlineAdvice += `*"Focus on the controllable variables: your savings rate, debt elimination velocity, and keeping your capital protected against unexpected shocks."*\n\n` +
                `> 💡 *Tip: Local LLM is currently offline or loading. Start LM Studio (port 1234) or Ollama (run \`ollama run llama3.2\`) to enable live private AI chat on your machine.*\n\n` +
                `Educational perspective only. Not financial advice.`;

            return secureJson({ response: offlineAdvice, isOfflineFallback: true, facts });
        }
    } catch (error: any) {
        console.error('Mentor Route Error:', error);
        return secureJson({ error: error.message || 'Failed to generate mentor response' }, { status: 500 });
    }
}
