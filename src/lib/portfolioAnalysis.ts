
// src/lib/portfolioAnalysis.ts

import { Asset, InvestmentDetails } from "@/types";

export interface PortfolioAnalysis {
    totalValue: number;
    totalCostBasis: number;
    totalGain: number;
    totalGainPercent: number;

    holdings: {
        ticker: string;
        name: string;
        value: number;
        weight: number;           // % of portfolio
        gain: number;
        gainPercent: number;
        isConcentrated: boolean;  // >25%
        shares: number;
        price: number;
        dayChange: number;        // $ change today
        dayChangePercent: number; // % change today
    }[];

    concentrationWarnings: string[];
    estimatedAnnualDividends: number;

    sectorBreakdown: { sector: string; weight: number }[];
    assetClassBreakdown: { assetClass: string; weight: number }[];
}

export const analyzePortfolio = (investments: Asset[]): PortfolioAnalysis => {
    // calculate total value first for weighting
    const totalValue = investments.reduce((sum, inv) => {
        // Use manual value as primary source of truth if available
        if (inv.value && inv.value > 0) {
            return sum + inv.value;
        }

        if (inv.investment) {
            const price = inv.investment.currentPrice || 0;
            return sum + (inv.investment.shares * price);
        }
        return sum + inv.value; // Fallback
    }, 0);

    const totalCostBasis = investments.reduce((sum, inv) =>
        sum + (inv.investment?.costBasis || 0), 0);

    const holdings = investments.map(inv => {
        let value = inv.value;
        let price = 0;
        let shares = 0;
        let costBasis = 0;
        let dayChange = 0;
        let dayChangePercent = 0;
        let ticker = 'Manual';

        if (inv.investment) {
            ticker = inv.investment.ticker;
            shares = inv.investment.shares;

            // FIX: Respect the Asset's manual value as the source of truth if it exists
            // This ensures parity with the Assets page.
            if (inv.value && inv.value > 0) {
                value = inv.value;
                price = shares > 0 ? value / shares : 0;
            } else {
                price = inv.investment.currentPrice || 0;
                value = shares * price;
            }

            costBasis = inv.investment.costBasis;

            // Calculate Day Change
            // If we have previousClose, use it. Otherwise 0.
            if (inv.investment.previousClose) {
                const changePerShare = price - inv.investment.previousClose;
                dayChange = changePerShare * shares;
                dayChangePercent = (changePerShare / inv.investment.previousClose) * 100;
            }
        } else {
            // For manual asssets, assume costBasis = value for now to avoid showing 100% gain
            // or huge dollar gains. We treat them as "stable" in this view.
            costBasis = value;
        }

        const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
        const gain = value - costBasis;
        const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

        return {
            ticker,
            name: inv.name,
            value,
            weight,
            gain,
            gainPercent,
            isConcentrated: weight > 25,
            shares,
            price,
            dayChange,
            dayChangePercent
        };
    });

    // Sort by value desc
    holdings.sort((a, b) => b.value - a.value);

    const concentrationWarnings = holdings
        .filter(h => h.isConcentrated)
        .map(h => `${h.ticker} makes up ${h.weight.toFixed(1)}% of your portfolio.`);

    const estimatedAnnualDividends = investments.reduce((sum, inv) => {
        if (inv.investment?.dividendYield && inv.investment.currentPrice) {
            const value = inv.investment.shares * inv.investment.currentPrice;
            return sum + (value * (inv.investment.dividendYield / 100));
        }
        return sum;
    }, 0);

    // Aggregate by asset class
    const assetClassMap = new Map<string, number>();
    investments.forEach(inv => {
        const type = inv.investment?.assetClass || 'other';
        let value = inv.value;
        if (!value && inv.investment) {
            value = inv.investment.shares * (inv.investment.currentPrice || 0);
        }
        assetClassMap.set(type, (assetClassMap.get(type) || 0) + value);
    });

    const assetClassBreakdown = Array.from(assetClassMap.entries())
        .map(([assetClass, val]) => ({
            assetClass,
            weight: totalValue > 0 ? (val / totalValue) * 100 : 0
        }))
        .sort((a, b) => b.weight - a.weight);


    // Aggregate by sector (if available)
    const sectorMap = new Map<string, number>();
    investments.forEach(inv => {
        const sector = inv.investment?.sector || 'Unknown';
        let value = inv.value;
        if (!value && inv.investment) {
            value = inv.investment.shares * (inv.investment.currentPrice || 0);
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
        totalGain: totalValue - totalCostBasis,
        totalGainPercent: totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0,
        holdings,
        concentrationWarnings,
        estimatedAnnualDividends,
        sectorBreakdown,
        assetClassBreakdown
    };
};
