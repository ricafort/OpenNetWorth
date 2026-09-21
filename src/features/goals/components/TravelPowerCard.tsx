'use client';

import { useState, useEffect } from 'react';
import { Plane, Compass, Globe } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currencyService';
import { UserSettings } from '@/types';
import { loadSettings } from '@/infrastructure/local_driver';

interface CityCost {
    city: string;
    country: string;
    currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'THB' | 'IDR' | 'VND' | 'MXN';
    monthlyCost: number; // In local currency
    monthlyCostUSD: number;
}

const CITIES: CityCost[] = [
    { city: 'Bali', country: 'Indonesia', currency: 'IDR', monthlyCost: 25000000, monthlyCostUSD: 1600 },
    { city: 'Tokyo', country: 'Japan', currency: 'JPY', monthlyCost: 350000, monthlyCostUSD: 2300 },
    { city: 'Chiang Mai', country: 'Thailand', currency: 'THB', monthlyCost: 45000, monthlyCostUSD: 1250 },
    { city: 'Lisbon', country: 'Portugal', currency: 'EUR', monthlyCost: 2500, monthlyCostUSD: 2700 }
];

interface Props {
    netWorthUSD: number;
}

/**
 * TravelPowerCard
 * 
 * Why this component exists:
 * Provides an exploratory benchmark of global living costs and travel runway scenarios.
 * 
 * Tricky logic:
 * - Resolves Finding 6 & Clarification 7: Uses a neutral travel-budget prompt for both positive
 *   and negative net worth until an actual dedicated travel fund is selected.
 * - Avoids judgmental lecturing ("Debt Payoff Priority") for users with negative net worth
 *   and avoids falsely dividing illiquid home equity/superannuation for users with positive net worth.
 * 
 * TODO: In Milestone 2, allow user to link a specific liquid travel savings goal or sub-account.
 */
export default function TravelPowerCard({ netWorthUSD }: Props) {
    const [settings, setSettings] = useState<UserSettings | null>(null);

    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    const baseCurrency = settings?.baseCurrency || 'USD';

    return (
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden h-full flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Plane size={120} />
            </div>

            <div>
                <div className="flex items-center justify-between mb-3 z-10 relative">
                    <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-indigo-100">
                        <Compass size={14} className="text-indigo-300" /> Travel Runway Simulator
                    </h3>
                    <span className="text-[10px] font-bold bg-white/10 text-indigo-200 px-2 py-0.5 rounded-full">
                        Scenario Benchmark
                    </span>
                </div>

                {/* Neutral Prompt for both positive and negative net worth */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 mb-4 border border-white/10">
                    <p className="text-xs font-semibold text-white leading-relaxed">
                        Choose a travel budget or dedicated travel fund to project global runway.
                    </p>
                    <p className="text-[11px] text-indigo-200 mt-1 leading-snug">
                        Total net worth includes illiquid assets and debts not intended for travel. Living costs below show monthly reference benchmarks.
                    </p>
                </div>

                {/* Benchmark City Living Costs */}
                <div className="space-y-2.5 relative z-10">
                    {CITIES.slice(0, 3).map((city) => (
                        <div key={city.city} className="flex items-center justify-between bg-black/10 rounded-xl px-3 py-2 border border-white/5">
                            <div>
                                <p className="font-bold text-xs text-white">{city.city}</p>
                                <p className="text-[10px] text-indigo-200">{city.country}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-xs text-white">
                                    ~${city.monthlyCostUSD.toLocaleString()} USD
                                </p>
                                <p className="text-[10px] text-indigo-200">
                                    per month
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <p className="text-[10px] text-center mt-4 text-indigo-200/80">
                Optional scenario simulator. Link a dedicated travel goal to calculate actual projected months.
            </p>
        </div>
    );
}
