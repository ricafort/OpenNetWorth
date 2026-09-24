/**
 * Live Local Model Extraction Test Script
 * 
 * Why this script exists:
 * Verifies that the active LM Studio local LLM (qwen3.8-27b-gsq-rco on port 1234)
 * extracts structured balance proposals from pasted freeform statement text in real time.
 * 
 * Tricky logic:
 * Uses an isolated in-memory SQLite database so that production data (data/opennetworth.sqlite)
 * is never touched.
 * 
 * TODO: Support automated benchmarking across multiple local quantizations.
 */

import Database from 'better-sqlite3';
import { initAccountingSchema } from '../src/lib/domain/accounting/schema';
import { createEntity, createAccount } from '../src/lib/domain/accounting/accountService';
import { extractBalancesFromText } from '../src/lib/domain/accounting/balanceExtractionService';

async function main() {
    console.log('--- Testing Live Local Model Extraction (LM Studio: http://127.0.0.1:1234/v1) ---');

    const db = new Database(':memory:');
    initAccountingSchema(db);

    const entity = createEntity(db, {
        name: 'Jane Sovereign',
        type: 'person',
        currency: 'AUD'
    });

    createAccount(db, {
        entity_id: entity.id,
        name: 'ANZ Platinum Card',
        type: 'liability',
        sub_type: 'credit_card',
        currency: 'AUD',
        opening_date: '2026-01-01'
    });

    createAccount(db, {
        entity_id: entity.id,
        name: 'AustralianSuper Member Direct',
        type: 'asset',
        sub_type: 'superannuation',
        currency: 'AUD',
        opening_date: '2026-01-01'
    });

    const freeformStatement = `ANZ Platinum Card Statement
Statement Period: 18 Aug 2026 to 18 Sep 2026
Account: ANZ Platinum Card
Credit Limit: $10,000.00
Available Credit: $7,850.00
Closing Balance Owed: $2,150.00
Payment Due Date: 2026-10-05

AustralianSuper Member Direct
Member Number: 98127391
Portfolio Total Value: $148,200.50 as at 2026-09-18
Cash Account Included: $12,000.00
Australian Shares: $86,200.50
International Shares: $50,000.00`;

    console.log('Sending statement to extractBalancesFromText with strategy="llm"...');
    const startTime = Date.now();
    const result = await extractBalancesFromText(db, {
        text: freeformStatement,
        defaultCurrency: 'AUD',
        strategy: 'llm',
        localConfig: {
            endpoint: 'http://127.0.0.1:1234/v1',
            model: 'qwen3.8-27b-gsq-rco'
        }
    });
    const elapsed = Date.now() - startTime;

    console.log(`Extraction finished in ${elapsed}ms. Success: ${result.success}`);
    console.log(`Method used: ${result.extraction_method}`);
    console.log(`Model used: ${result.model_used}`);
    console.log(`Extracted ${result.proposals.length} proposals:`);

    for (const prop of result.proposals) {
        const amtStr = prop.amount_cents !== null ? `${(prop.amount_cents / 100).toFixed(2)} (${prop.amount_cents} cents)` : 'UNRESOLVED';
        console.log(`    Kind: ${prop.balance_kind} | Amount: ${prop.currency} ${amtStr}`);
        console.log(`    Date: ${prop.effective_date} | Component of Total: ${prop.is_component_of_total}`);
        console.log(`    Excerpt: "${prop.source_excerpt}"`);
        console.log(`    Unresolved fields: [${prop.unresolved_fields.join(', ')}]`);
        console.log('');
    }

    db.close();
}

main().catch(err => {
    console.error('Extraction script error:', err);
    process.exit(1);
});
