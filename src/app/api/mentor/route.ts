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
import { listEntities } from '@/lib/domain/accounting/accountService';
import { getPeriodIncomeAndExpenses } from '@/lib/domain/accounting/balanceService';

export async function POST(req: NextRequest) {
    try {
        const { mentor, mode, userContext, message, localConfig } = await req.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const db = getDb();
        const availableEntities = listEntities(db);
        const intent = parseSpendingIntent(message, availableEntities);

        if (intent.isSpendingQuery && intent.needsClarification) {
            return NextResponse.json({ response: intent.needsClarification });
        }

        let facts: any = null;
        let factsContext = '';

        if (intent.isSpendingQuery) {
            const entity = availableEntities.find(e => e.id === intent.entityId);
            const entityName = entity ? entity.name : (intent.entityId === 'all' ? 'All Accounts' : 'Personal');
            
            const incomeExpenses = getPeriodIncomeAndExpenses(db, intent.entityId === 'all' ? availableEntities[0]?.id : (intent.entityId || 'local_user'), intent.startDate, intent.endDate);
            
            const txQuery = `
                SELECT DISTINCT t.id 
                FROM m1_journal_entries j
                JOIN m1_accounts a ON j.account_id = a.id
                JOIN m1_transactions t ON j.transaction_id = t.id
                WHERE a.entity_id = ? AND a.type IN ('income', 'expense') AND t.status = 'posted'
                ${intent.startDate ? 'AND t.date >= ?' : ''}
                ${intent.endDate ? 'AND t.date <= ?' : ''}
            `;
            const params = [intent.entityId === 'all' ? availableEntities[0]?.id : (intent.entityId || 'local_user')];
            if (intent.startDate) params.push(intent.startDate);
            if (intent.endDate) params.push(intent.endDate);
            
            const txRows = db.prepare(txQuery).all(...params) as { id: string }[];
            const transactionIds = txRows.map(r => r.id);

            facts = {
                type: 'spending',
                periodLabel: intent.periodLabel,
                entityName: entityName,
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

        const currency = userContext?.currency || 'USD';
        const netWorth = userContext?.netWorth ?? 0;
        const totalAssets = userContext?.totalAssets ?? 0;
        const totalLiabilities = userContext?.totalLiabilities ?? 0;

        const systemPrompt = `You are an AI-simulated financial wisdom persona inspired by the philosophy of: ${mentor?.name || 'Financial Mentor'} (${mentor?.archetype || 'Wisdom & Strategy'}).
Personality & Philosophy: ${mentor?.personality_prompt || mentor?.description || 'Thoughtful financial guidance.'}

Your Goal:
- MODE = 'learn': Provide educational explanations of financial concepts, metrics, and debt/wealth mechanics.
- MODE = 'reflect': Provide philosophical, mindset, and risk-management reflections on the user's financial posture.

USER FINANCIAL SNAPSHOT:
- Preferred Currency: ${currency}
- Net Worth: ${netWorth.toLocaleString()} ${currency}
- Total Assets: ${totalAssets.toLocaleString()} ${currency}
- Total Liabilities: ${totalLiabilities.toLocaleString()} ${currency}
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

            return NextResponse.json({ response: responseText.trim(), facts });
        } catch (llmError: any) {
            console.warn('Local LLM unavailable, using offline wisdom fallback:', llmError.message);

            let offlineAdvice = `### ${mentor?.name || 'Mentor'} (${mentor?.archetype || 'Wisdom'}) Perspective\n\n`;
            
            if (facts) {
                offlineAdvice += `Looking at your deterministic facts for ${facts.entityName} during ${facts.periodLabel}, your expenses were: ${factsContext.split('Total Expenses: ')[1]?.split('\n')[0]}.\n\n`;
            } else {
                offlineAdvice += `Looking at your current balance (${currency} ${netWorth.toLocaleString()} net worth across ${currency} ${totalAssets.toLocaleString()} in assets and ${currency} ${totalLiabilities.toLocaleString()} in debt), the key principle is ${mentor?.description || 'discipline and consistent compounding'}.\n\n`;
            }
            
            offlineAdvice += `*"Focus on the controllable variables: your savings rate, debt elimination velocity, and keeping your capital protected against unexpected shocks."*\n\n` +
                `> 💡 *Tip: Local LLM is currently offline or loading. Start LM Studio (port 1234) or Ollama (run \`ollama run llama3.2\`) to enable live private AI chat on your machine.*\n\n` +
                `Educational perspective only. Not financial advice.`;

            return NextResponse.json({ response: offlineAdvice, isOfflineFallback: true, facts });
        }
    } catch (error: any) {
        console.error('Mentor Route Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate mentor response' }, { status: 500 });
    }
}
