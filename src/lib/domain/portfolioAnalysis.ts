// src/lib/portfolioAnalysis.ts

import { Asset, InvestmentDetails } from "@/features/assets/types";

export interface PortfolioHolding {
    ticker: string;
    name: string;
    value: number;
    weight: number;           // % of portfolio
    gain: number | null;
    gainPercent: number | null;
    hasCostBasis: boolean;
    costBasis: number | null;
    isConcentrated: boolean;  // >25%
    shares: number;
    price: number;
    dayChange: number;        // $ change today
    dayChangePercent: number; // % change today
    currency?: string;        // Native currency code
    isExcluded?: boolean;     // True if excluded from base currency aggregates
}

export interface PortfolioAnalysis {
    totalValue: number;
    totalCostBasis: number;
    totalGain: number;
    totalGainPercent: number | null;
    hasCostBasis: boolean;
    isZeroCostBasis: boolean;
    missingCostBasisCount: number;
    totalHoldingsCount: number;

    holdings: PortfolioHolding[];

    concentrationWarnings: string[];
    estimatedAnnualDividends: number;

    sectorBreakdown: { sector: string; weight: number }[];
    assetClassBreakdown: { assetClass: string; weight: number }[];
    totalsByCurrency: Record<string, number>;
    hasDividendData: boolean;
}

/**
 * Evaluates whether an individual asset has an authoritative recorded cost basis.
 * 
 * Why this exists:
 * Distinguishes an explicitly recorded $0 cost basis (e.g. gifted stock, mined crypto)
 * from missing or unrecorded cost basis (undefined/null).
 * 
 * Tricky logic:
 * - Non-investment manual assets (cash, checking, vehicle) are treated as stable (costBasis = value, 0 gain).
 * - Investment or crypto assets require explicit costBasis. If missing, we must NEVER default to $0,
 *   which would fabricate massive false gains (e.g. $1,000 value with $0 cost basis = 1,000% gain).
 * 
 * TODO: In Milestone 2, pull historical cost basis from lot-matched buy transactions in the ledger.
 */
const evaluateHoldingCostBasis = (inv: Asset): { hasCostBasis: boolean; costBasis: number | null } => {
    if (inv.investment_details) {
        const cb = inv.investment_details.costBasis;
        if (cb !== undefined && cb !== null && typeof cb === 'number' && !isNaN(cb)) {
            return { hasCostBasis: true, costBasis: cb };
        }
        return { hasCostBasis: false, costBasis: null };
    }
    // For non-investment manual assets (cash, car, property without details), cost basis equals current value
    if (inv.type !== 'investment' && inv.type !== 'crypto') {
        return { hasCostBasis: true, costBasis: inv.value || 0 };
    }
    // Investment or crypto without investment_details has unrecorded cost basis
    return { hasCostBasis: false, costBasis: null };
};

export const analyzePortfolio = (investments: Asset[], baseCurrency?: string): PortfolioAnalysis => {
    const totalsByCurrency: Record<string, number> = {};

    // calculate total value first for weighting. Exclude cross-currency if baseCurrency is provided.
    const totalValue = investments.reduce((sum, inv) => {
        const cur = inv.currency || 'USD';
        let val = inv.value;
        if (!val && inv.investment_details) {
            val = inv.investment_details.shares * (inv.investment_details.currentPrice || 0);
        }
        val = val || 0;

        totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + val;

        if (baseCurrency && cur !== baseCurrency) return sum;
        return sum + val;
    }, 0);

    let missingCostBasisCount = 0;
    let totalCostBasisSum = 0;

    let includedHoldingsCount = 0;

    investments.forEach(inv => {
        if (baseCurrency && (inv.currency || 'USD') !== baseCurrency) return;
        includedHoldingsCount++;
        const { hasCostBasis, costBasis } = evaluateHoldingCostBasis(inv);
        if (!hasCostBasis || costBasis === null) {
            missingCostBasisCount++;
        } else {
            totalCostBasisSum += costBasis;
        }
    });

    const totalHoldingsCount = investments.length;
    // Whole-portfolio return requires all included holdings to have valid cost basis
    const hasFullCostBasis = includedHoldingsCount > 0 && missingCostBasisCount === 0;

    const totalCostBasis = hasFullCostBasis ? totalCostBasisSum : 0;
    const totalGain = hasFullCostBasis ? totalValue - totalCostBasis : 0;
    // Percentage return with zero denominator is mathematically undefined (null)
    const totalGainPercent = (hasFullCostBasis && totalCostBasis > 0)
        ? ((totalValue - totalCostBasis) / totalCostBasis) * 100
        : null;
    const isZeroCostBasis = hasFullCostBasis && totalCostBasis === 0;

    const holdings: PortfolioHolding[] = investments.map(inv => {
        let value = inv.value;
        let price = 0;
        let shares = 0;
        let dayChange = 0;
        let dayChangePercent = 0;
        let ticker = 'Manual';

        if (inv.investment_details) {
            ticker = inv.investment_details.ticker;
            shares = inv.investment_details.shares;

            if (inv.value && inv.value > 0) {
                value = inv.value;
                price = shares > 0 ? value / shares : 0;
            } else {
                price = inv.investment_details.currentPrice || 0;
                value = shares * price;
            }

            if (inv.investment_details.previousClose) {
                const changePerShare = price - inv.investment_details.previousClose;
                dayChange = changePerShare * shares;
                dayChangePercent = (changePerShare / inv.investment_details.previousClose) * 100;
            }
        }

        const { hasCostBasis, costBasis } = evaluateHoldingCostBasis(inv);
        let gain: number | null = null;
        let gainPercent: number | null = null;

        if (hasCostBasis && costBasis !== null) {
            gain = value - costBasis;
            // Cost basis of 0 cannot calculate a percentage return (zero denominator)
            gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : null;
        }

        const isExcluded = baseCurrency ? (inv.currency || 'USD') !== baseCurrency : false;
        const weight = (totalValue > 0 && !isExcluded) ? (value / totalValue) * 100 : 0;

        return {
            ticker,
            name: inv.name,
            value,
            weight,
            gain,
            gainPercent,
            hasCostBasis,
            costBasis,
            isConcentrated: weight > 25,
            shares,
            price,
            dayChange,
            dayChangePercent,
            currency: inv.currency || 'USD',
            isExcluded
        };
    });

    // Sort by value desc
    holdings.sort((a, b) => b.value - a.value);

    const concentrationWarnings = holdings
        .filter(h => h.isConcentrated)
        .map(h => `${h.ticker} makes up ${h.weight.toFixed(1)}% of tracked holdings.`);

    let hasDividendData = false;
    // Dividend calculation (annual projected)
    const estimatedAnnualDividends = investments.reduce((sum, inv) => {
        if (baseCurrency && (inv.currency || 'USD') !== baseCurrency) return sum;
        if (inv.investment_details?.dividendYield) {
            hasDividendData = true;
            let val = inv.value;
            if (!val && inv.investment_details.shares && inv.investment_details.currentPrice) {
                val = inv.investment_details.shares * inv.investment_details.currentPrice;
            }
            return sum + ((val || 0) * (inv.investment_details.dividendYield / 100));
        }
        return sum;
    }, 0);

    // Asset Class Breakdown
    const assetClassMap = new Map<string, number>();
    investments.forEach(inv => {
        if (baseCurrency && (inv.currency || 'USD') !== baseCurrency) return;
        const cls = inv.investment_details?.assetClass || inv.type || 'Other';
        let value = inv.value;
        if (!value && inv.investment_details) {
            value = inv.investment_details.shares * (inv.investment_details.currentPrice || 0);
        }
        assetClassMap.set(cls, (assetClassMap.get(cls) || 0) + value);
    });

    const assetClassBreakdown = Array.from(assetClassMap.entries())
        .map(([cls, val]) => ({
            assetClass: cls,
            weight: totalValue > 0 ? (val / totalValue) * 100 : 0
        }))
        .sort((a, b) => b.weight - a.weight);

    // Sector Breakdown
    const sectorMap = new Map<string, number>();
    investments.forEach(inv => {
        if (baseCurrency && (inv.currency || 'USD') !== baseCurrency) return;
        const sector = inv.investment_details?.sector || 'Unknown';
        let value = inv.value;
        if (!value && inv.investment_details) {
            value = inv.investment_details.shares * (inv.investment_details.currentPrice || 0);
        }
        sectorMap.set(sector, (sectorMap.get(sector) || 0) + value);
    });

    const sectorBreakdown = Array.from(sectorMap.entries())
        .map(([sector, val]) => ({
            sector,
            weight: totalValue > 0 ? (val / totalValue) * 100 : 0
        }))
        .sort((a, b) => b.weight - a.weight);

    return {
        totalValue,
        totalCostBasis,
        totalGain,
        totalGainPercent,
        hasCostBasis: hasFullCostBasis,
        isZeroCostBasis,
        missingCostBasisCount,
        totalHoldingsCount,
        holdings,
        concentrationWarnings,
        estimatedAnnualDividends,
        hasDividendData,
        sectorBreakdown,
        assetClassBreakdown,
        totalsByCurrency
    };
};
