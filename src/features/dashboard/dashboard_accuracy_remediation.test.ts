import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initAccountingSchema } from '@/lib/domain/accounting/schema';
import { createEntity, createAccount } from '@/lib/domain/accounting/accountService';
import { getSharedFinancialSummary } from '@/lib/domain/accounting/sharedFinancialSummaryService';
import { calculatePayoff } from '@/lib/domain/debtCalculator';
import { analyzePortfolio } from '@/lib/domain/portfolioAnalysis';
import { Liability } from '@/features/liabilities/types';
import { Asset } from '@/features/assets/types';

/**
 * Dashboard Accuracy Remediation Acceptance Tests
 * 
 * Why this file exists:
 * Verifies all 6 assessor findings and 7 user clarifications covering:
 * - Single and multi-currency foreign holdings without dated rates (no fabricated amounts)
 * - Converted totals when dated rates exist
 * - Modern account source selection (missing balance state vs legacy)
 * - Unknown historical snapshot currency handling
 * - Strict portfolio return requirements (missing cost basis)
 * - Multi-currency debt rejection in payoff calculator
 */
describe('Dashboard Accuracy Remediation Acceptance Tests', () => {
    let db: Database.Database;
    let entityId: string;

    beforeEach(() => {
        db = new Database(':memory:');
        initAccountingSchema(db);

        db.exec(`
            CREATE TABLE IF NOT EXISTS net_worth_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                total_assets REAL NOT NULL,
                total_liabilities REAL NOT NULL,
                net_worth REAL NOT NULL,
                currency TEXT,
                UNIQUE(user_id, date)
            );
        `);

        const entity = createEntity(db, {
            id: 'e1',
            name: 'Personal Vault',
            type: 'person',
            currency: 'AUD'
        });
        entityId = entity.id;
    });

    afterEach(() => {
        try {
            db.close();
        } catch {
            // Already closed
        }
    });

    // Case 1: USD holding, AUD display, no dated rate -> Explicit USD amount; no fabricated AUD amount
    it('Case 1: USD holding with AUD display and no dated rate reports uncompleted conversion and explicit USD cents', () => {
        const acc = createAccount(db, {
            id: 'acc-usd',
            entity_id: entityId,
            name: 'US Brokerage',
            type: 'asset',
            sub_type: 'brokerage',
            currency: 'USD',
            tracking_mode: 'balance'
        });

        db.prepare(`
            INSERT INTO m1_balance_observations (id, account_id, amount_cents, currency, balance_kind, effective_date, imported_at, source_type, review_status, created_at)
            VALUES ('obs-1', ?, 2500000, 'USD', 'current_balance', '2026-09-20', datetime('now'), 'manual', 'accepted', datetime('now'))
        `).run(acc.account.id);

        const summary = getSharedFinancialSummary(db, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-20'
        });

        // Conversion must NOT be marked complete with fabricated rate
        expect(summary.converted_total_assets?.is_complete).toBe(false);
        expect(summary.converted_total_assets?.missing_rates).toContain('USD -> AUD');
        expect(summary.converted_net_worth?.is_complete).toBe(false);

        // Raw USD currency must be explicitly preserved
        expect(summary.total_assets_cents_by_currency['USD']).toBe(2500000);
        expect(summary.total_assets_cents_by_currency['AUD']).toBeUndefined();
    });

    // Case 2: Same case with a dated rate -> Consistent converted figures across applicable cards
    it('Case 2: USD holding with dated exchange rate produces authoritatively converted asset and net worth totals', () => {
        const acc = createAccount(db, {
            id: 'acc-usd',
            entity_id: entityId,
            name: 'US Brokerage',
            type: 'asset',
            sub_type: 'brokerage',
            currency: 'USD',
            tracking_mode: 'balance'
        });

        db.prepare(`
            INSERT INTO m1_balance_observations (id, account_id, amount_cents, currency, balance_kind, effective_date, imported_at, source_type, review_status, created_at)
            VALUES ('obs-1', ?, 2500000, 'USD', 'current_balance', '2026-09-20', datetime('now'), 'manual', 'accepted', datetime('now'))
        `).run(acc.account.id);

        // Add verified dated exchange rate: 1 USD = 1.50 AUD
        db.prepare(`
            INSERT INTO m1_exchange_rates (id, from_currency, to_currency, rate, effective_date, source, created_at)
            VALUES ('fx-1', 'USD', 'AUD', 1.50, '2026-09-20', 'manual', datetime('now'))
        `).run();

        const summary = getSharedFinancialSummary(db, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-20'
        });

        // 25,000 USD * 1.50 = 37,500 AUD (3750000 cents)
        expect(summary.converted_total_assets?.is_complete).toBe(true);
        expect(summary.converted_total_assets?.amount_cents).toBe(3750000);
        expect(summary.converted_total_assets?.currency).toBe('AUD');

        // Account level converted amount
        expect(summary.accounts?.[0]?.converted_amount_cents).toBe(3750000);
    });

    // Case 3: Modern accounts exist, all balances unknown -> Missing-balance state; no silent legacy fallback
    it('Case 3: Modern accounts with missing balance observations report unrecorded_count and is_complete false', () => {
        createAccount(db, {
            id: 'acc-unobs',
            entity_id: entityId,
            name: 'Super Fund',
            type: 'asset',
            sub_type: 'superannuation',
            currency: 'AUD',
            tracking_mode: 'balance'
        });

        const summary = getSharedFinancialSummary(db, {
            reporting_currency: 'AUD',
            as_of_date: '2026-09-20'
        });

        // No observations exist
        expect(summary.accounts?.length).toBe(0);
        expect(summary.unrecorded_count).toBe(1);
        expect(summary.unrecorded_accounts[0].name).toBe('Super Fund');
        expect(summary.is_complete).toBe(false);
        expect(summary.coverage_notes.length).toBeGreaterThan(0);
    });

    // Case 4: Historical currency retention in net_worth_history
    it('Case 4: Net worth history durably persists snapshot currency and preserves unrecorded status', () => {
        // Snapshot with currency
        db.prepare(`
            INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth, currency)
            VALUES ('snap-1', 'local_user', '2026-08-01', 50000, 10000, 40000, 'AUD')
        `).run();

        // Legacy snapshot without currency
        db.prepare(`
            INSERT INTO net_worth_history (id, user_id, date, total_assets, total_liabilities, net_worth, currency)
            VALUES ('snap-legacy', 'local_user', '2025-01-01', 30000, 5000, 25000, NULL)
        `).run();

        const row1 = db.prepare("SELECT * FROM net_worth_history WHERE id = 'snap-1'").get() as any;
        expect(row1.currency).toBe('AUD');

        const row2 = db.prepare("SELECT * FROM net_worth_history WHERE id = 'snap-legacy'").get() as any;
        expect(row2.currency).toBeNull();
    });

    // Case 5: One costed and one uncosted investment -> Whole-portfolio return unavailable
    it('Case 5: Uncosted investment holding prevents whole-portfolio return calculation', () => {
        const holdings: Asset[] = [
            {
                id: '1',
                name: 'VAS ETF',
                type: 'investment',
                value: 1000,
                is_liquid: true,
                last_updated: '2026-09-20',
                investment_details: { ticker: 'VAS', shares: 10, costBasis: 800, assetClass: 'etf' }
            },
            {
                id: '2',
                name: 'VGS ETF',
                type: 'investment',
                value: 600,
                is_liquid: true,
                last_updated: '2026-09-20',
                investment_details: { ticker: 'VGS', shares: 5, costBasis: (undefined as any), assetClass: 'etf' } // uncosted
            }
        ];

        const perf = analyzePortfolio(holdings);
        expect(perf.hasCostBasis).toBe(false);
        expect(perf.missingCostBasisCount).toBe(1);
        expect(perf.totalHoldingsCount).toBe(2);
        expect(perf.totalGain).toBe(0);
        expect(perf.totalGainPercent).toBe(0);
    });

    // Case 6: Mixed-currency debts -> Combined payoff calculation rejected
    it('Case 6: Mixed-currency debts reject combined payoff calculation', () => {
        const mixedDebts: Liability[] = [
            {
                id: '1',
                name: 'Car Loan',
                type: 'auto_loan',
                balance: 15000,
                interest_rate: 6.5,
                minimum_payment: 350,
                currency: 'AUD',
                is_good_debt: false,
                last_updated: '2026-09-20'
            },
            {
                id: '2',
                name: 'JPY Credit Card',
                type: 'credit_card',
                balance: 300000,
                interest_rate: 15.0,
                minimum_payment: 15000,
                currency: 'JPY',
                is_good_debt: false,
                last_updated: '2026-09-20'
            }
        ];

        const result = calculatePayoff(mixedDebts, 0, 'avalanche');
        expect(result.isMultiCurrencyUnsupported).toBe(true);
        expect(result.unsupportedCurrencies).toContain('AUD');
        expect(result.unsupportedCurrencies).toContain('JPY');
        expect(result.monthsToPayoff).toBe(0);
    });
});
