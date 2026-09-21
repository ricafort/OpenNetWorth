import WidgetWrapper from './WidgetWrapper';
import StatCard from '@/features/dashboard/components/StatCard';
import { Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { useDashboard } from '@/features/dashboard/context/DashboardContext';
import { useNetWorth } from '@/features/dashboard/hooks/useNetWorth';
import { useHistory } from '@/hooks/useHistory';
import { useFinancialSourceSelection } from '@/features/dashboard/hooks/useFinancialSourceSelection';
import { CURRENCY_DECIMALS, CurrencyCode } from '@/lib/domain/accounting/types';

/**
 * StatNetWorthWidget
 * 
 * Displays authoritative current net worth in base currency.
 * Consumes the unified financial source selection rule to maintain parity with Assets, Liabilities, and Allocation.
 * Historical comparison is only calculated and displayed if comparable history snapshots exist with matching currency.
 */
export default function StatNetWorthWidget() {
    const { baseCurrency, netWorthByCurrency, netWorthCurrencies } = useNetWorth();
    const { isEditMode } = useDashboard();
    const { history } = useHistory();
    const sourceState = useFinancialSourceSelection(baseCurrency);

    // Why this exists:
    // Resolves Issues 1, 2 & 3:
    // 1. Groups legacy net worth by native currency without fabricating $0 AUD when holdings are in USD.
    // 2. Suppresses historical comparison if displayed currency does not match snapshot currency or coverage is incomplete.
    // 3. Discloses when legacy holdings are excluded from modern accounting figures.
    let title = `Total Net Worth (${baseCurrency})`;
    let displayValue = '...';
    let numericValue = 0;
    let displayedCurrency: CurrencyCode | null = baseCurrency;
    let isMissingBalances = false;

    if (sourceState.mode === 'loading') {
        displayValue = '...';
    } else if (sourceState.mode === 'error') {
        title = `Net Worth (${baseCurrency})`;
        displayValue = 'Error loading';
    } else if (sourceState.mode === 'modern_missing_balances') {
        isMissingBalances = true;
        displayedCurrency = null;
        const unrecordedText = sourceState.unrecordedCount === 1 ? '1 account needs balance' : `${sourceState.unrecordedCount} accounts need balance`;
        title = sourceState.hasExcludedLegacy
            ? `Known Net Worth (Accounting Accounts Only — ${unrecordedText})`
            : `Known Net Worth (${unrecordedText})`;
        displayValue = 'Needs Balance';
    } else if (sourceState.mode === 'modern_usable') {
        const { summary, unrecordedCount, hasExcludedLegacy } = sourceState;
        const decimals = (baseCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[baseCurrency as CurrencyCode] : 2;
        const divisor = Math.pow(10, decimals);
        const hasUnrecorded = unrecordedCount > 0;
        const unrecordedText = unrecordedCount === 1 ? '1 account needs balance' : `${unrecordedCount} accounts need balance`;

        if (summary.converted_net_worth?.is_complete) {
            numericValue = summary.converted_net_worth.amount_cents / divisor;
            displayedCurrency = baseCurrency;
            displayValue = formatCurrency(numericValue, baseCurrency);
            if (hasExcludedLegacy) {
                title = hasUnrecorded
                    ? `Known Net Worth (Accounting Accounts Only — ${unrecordedText})`
                    : `Total Net Worth (${baseCurrency} — Accounting Only)`;
            } else {
                title = hasUnrecorded ? `Known Net Worth (${unrecordedText})` : `Total Net Worth (${baseCurrency})`;
            }
        } else {
            // Unconverted multi-currency holdings
            const baseCents = summary.net_worth_cents_by_currency?.[baseCurrency];
            const otherCurrencies = Object.keys(summary.net_worth_cents_by_currency || {}).filter(c => c !== baseCurrency) as CurrencyCode[];

            if (baseCents !== undefined) {
                numericValue = baseCents / divisor;
                displayedCurrency = baseCurrency;
                displayValue = formatCurrency(numericValue, baseCurrency);
                if (hasExcludedLegacy) {
                    title = `Net Worth (${baseCurrency} Subtotal — Accounting Only)`;
                } else {
                    title = hasUnrecorded
                        ? `Known Net Worth (${baseCurrency} Subtotal — ${unrecordedText})`
                        : (otherCurrencies.length > 0 ? `Net Worth (${baseCurrency} Holdings Subtotal)` : `Total Net Worth (${baseCurrency})`);
                }
            } else if (otherCurrencies.length === 1) {
                // Acceptance Case: USD holding, AUD display, no dated rate -> Explicit USD amount; no fabricated AUD amount
                const foreignCurr = otherCurrencies[0];
                const foreignDecimals = (foreignCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[foreignCurr] : 2;
                const foreignVal = (summary.net_worth_cents_by_currency[foreignCurr] || 0) / Math.pow(10, foreignDecimals);
                numericValue = foreignVal;
                displayedCurrency = foreignCurr;
                displayValue = formatCurrency(foreignVal, foreignCurr);
                title = hasExcludedLegacy
                    ? `Net Worth (${foreignCurr} Holding — Accounting Only)`
                    : `Net Worth (${foreignCurr} Holding — Unconverted)`;
            } else {
                displayedCurrency = null;
                title = hasExcludedLegacy ? `Net Worth (Multi-Currency — Accounting Only)` : `Net Worth (Multi-Currency Holdings)`;
                displayValue = otherCurrencies.map(c => `${c} ${(summary.net_worth_cents_by_currency[c] / Math.pow(10, CURRENCY_DECIMALS[c] ?? 2)).toLocaleString()}`).join(' + ');
            }
        }
    } else {
        // Legacy mode: group by native currency (Resolves Issue 1)
        const nwBase = netWorthByCurrency?.[baseCurrency];
        const otherNwCurrs = (netWorthCurrencies || []).filter(c => c !== baseCurrency);

        if (nwBase !== undefined && (nwBase > 0 || otherNwCurrs.length === 0)) {
            numericValue = nwBase;
            displayedCurrency = baseCurrency;
            displayValue = formatCurrency(nwBase, baseCurrency);
            title = otherNwCurrs.length > 0
                ? `Net Worth (${baseCurrency} Holdings Subtotal)`
                : `Total Net Worth (${baseCurrency})`;
        } else if (otherNwCurrs.length === 1) {
            const foreignCurr = otherNwCurrs[0];
            const foreignVal = netWorthByCurrency?.[foreignCurr] || 0;
            numericValue = foreignVal;
            displayedCurrency = foreignCurr;
            displayValue = formatCurrency(foreignVal, foreignCurr);
            title = `Net Worth (${foreignCurr} Holding — Unconverted)`;
        } else if (otherNwCurrs.length > 1) {
            displayedCurrency = null;
            title = `Net Worth (Multi-Currency Holdings — Unconverted)`;
            displayValue = otherNwCurrs.map(c => `${c} ${(netWorthByCurrency?.[c] || 0).toLocaleString()}`).join(' + ');
        } else {
            numericValue = 0;
            displayedCurrency = baseCurrency;
            displayValue = formatCurrency(0, baseCurrency);
            title = `Total Net Worth (${baseCurrency})`;
        }
    }

    // Historical comparison: Suppress if currency or coverage is non-comparable (Resolves Issue 2)
    let change: string | undefined = undefined;
    let trend: 'up' | 'down' | 'neutral' = numericValue >= 0 ? 'up' : 'down';

    const hasCompleteCoverage = !isMissingBalances &&
        sourceState.mode !== 'error' &&
        sourceState.mode !== 'loading' &&
        (sourceState.mode === 'legacy' || (sourceState.unrecordedCount === 0 && !sourceState.hasExcludedLegacy));

    if (hasCompleteCoverage && displayedCurrency && history && history.length >= 2) {
        const sortedHistory = history.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const previous = sortedHistory[sortedHistory.length - 2];
        if (previous && previous.currency === displayedCurrency && previous.netWorth !== 0) {
            const diff = numericValue - previous.netWorth;
            const pct = ((diff / Math.abs(previous.netWorth)) * 100).toFixed(1);
            change = `${diff >= 0 ? '+' : ''}${pct}%`;
            trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
        }
    }

    return (
        <WidgetWrapper id="stat-networth" isEditMode={isEditMode}>
            <StatCard
                title={title}
                value={displayValue}
                change={change}
                trend={trend}
                icon={<Wallet className="text-blue-600" size={24} />}
                privacySensitive={true}
            />
        </WidgetWrapper>
    );
}
