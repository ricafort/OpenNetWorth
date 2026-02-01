import { describe, it, expect } from 'vitest';
import { analyzePortfolio } from './portfolioAnalysis';
import { Asset } from '@/features/assets/types';

describe('analyzePortfolio', () => {
    const manualAsset: Asset = {
        id: '1',
        user_id: 'u1',
        name: 'Cash Stash',
        type: 'cash',
        value: 10000, // Manual value
        is_liquid: true,
        currency: 'USD',
        last_updated: new Date().toISOString()
    };

    const investmentAsset: Asset = {
        id: '2',
        user_id: 'u1',
        name: 'Tech Stock',
        type: 'investment',
        value: 0, // Ignored if investment details present? Logic checks inv.value first
        is_liquid: true,
        currency: 'USD',
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: 'TECH',
            shares: 10,
            costBasis: 1000, // $100/share basis
            currentPrice: 150, // $1500 total value. Gain $500.
            assetClass: 'stock',
            sector: 'Technology',
            dividendYield: 2.0, // 2% of $1500 = $30/yr
            previousClose: 140
        }
    };

    it('should calculate total value correctly for mixed assets', () => {
        const result = analyzePortfolio([manualAsset, investmentAsset]);
        // 10000 (manual) + 1500 (10 * 150) = 11500
        expect(result.totalValue).toBe(11500);
    });

    it('should calculate cost basis correctly', () => {
        const result = analyzePortfolio([manualAsset, investmentAsset]);
        // Manual asset cost basis (assumed = value) = 10000
        // Investment cost basis = 1000
        // Total = 11000
        expect(result.totalCostBasis).toBe(11000);
        expect(result.totalGain).toBe(500);
    });

    it('should detect concentration warnings (>25%)', () => {
        // Cash 10000, Tech 1500. Cash is dominant.
        const result = analyzePortfolio([manualAsset, investmentAsset]);

        // Manual asset "ticker" defaults to 'Manual'
        const cashHolding = result.holdings.find(h => h.ticker === 'Manual');
        expect(cashHolding?.isConcentrated).toBe(true); // 10000 / 11500 = ~87%

        const techHolding = result.holdings.find(h => h.ticker === 'TECH');
        expect(techHolding?.isConcentrated).toBe(false); // 1500 / 11500 = ~13%

        expect(result.concentrationWarnings.length).toBeGreaterThan(0);
        expect(result.concentrationWarnings[0]).toContain('Manual makes up');
    });

    it('should aggregate sector breakdown', () => {
        const tech2 = { ...investmentAsset, id: '3', investment_details: { ...investmentAsset.investment_details!, ticker: 'TECH2', shares: 10, currentPrice: 150 } };
        // Tech1: 1500, Tech2: 1500. Total Tech = 3000.
        // Cash: 10000. (Sector 'Unknown'?)

        const result = analyzePortfolio([manualAsset, investmentAsset, tech2]);

        const techSector = result.sectorBreakdown.find(s => s.sector === 'Technology');
        expect(techSector).toBeDefined();
        // Total Value: 10000 + 1500 + 1500 = 13000.
        // Tech Value: 3000.
        // Weight: 3000/13000 = 23.07%
        expect(techSector?.weight).toBeCloseTo(23.07, 1);
    });

    it('should override calculated value if manual value is provided on investment', () => {
        const overrideAsset: Asset = {
            ...investmentAsset,
            value: 2000, // Manual override (vs 1500 calc)
        };

        const result = analyzePortfolio([overrideAsset]);
        expect(result.totalValue).toBe(2000);

        // Price should be back-calculated: 2000 / 10 shares = 200/share
        const holding = result.holdings[0];
        expect(holding.price).toBe(200);
    });

    it('should estimate dividends', () => {
        const result = analyzePortfolio([investmentAsset]);
        // 2% of $1500 = $30
        expect(result.estimatedAnnualDividends).toBe(30);
    });

    it('should calculate day change', () => {
        const result = analyzePortfolio([investmentAsset]);
        // Prev Close 140. Current 150. Delta +10/share.
        // 10 shares * $10 = $100 gain.
        expect(result.holdings[0].dayChange).toBe(100);
        expect(result.holdings[0].dayChangePercent).toBeCloseTo(7.14, 2); // 10/140 = 7.14%
    });
});
