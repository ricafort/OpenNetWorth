'use client';

import { CurrencyCode } from '@/types';
import { SUPPORTED_CURRENCIES } from '@/lib/utils/currencyService';

interface CurrencySelectorProps {
    id?: string;
    value: CurrencyCode;
    onChange: (currency: CurrencyCode) => void;
    className?: string;
}

export default function CurrencySelector({ id, value, onChange, className = '' }: CurrencySelectorProps) {
    return (
        <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value as CurrencyCode)}
            className={`px-3 py-2 bg-card text-card-foreground border border-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none ${className}`}
        >
            {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                </option>
            ))}
        </select>
    );
}
