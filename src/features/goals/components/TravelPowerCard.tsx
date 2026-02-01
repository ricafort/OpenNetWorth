'use client';

import { useState, useEffect } from 'react';
import { Plane } from 'lucide-react';
import { convertAmount, formatCurrency, getExchangeRate } from '@/lib/utils/currencyService';
import { UserSettings } from '@/types';
import { loadSettings } from '@/infrastructure/local_driver';

interface CityCost {
    city: string;
    country: string;
    currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'THB' | 'IDR' | 'VND' | 'MXN';
    monthlyCost: number; // In local currency
}

const CITIES: CityCost[] = [
    { city: 'Bali', country: 'Indonesia', currency: 'IDR', monthlyCost: 25000000 },
    { city: 'Tokyo', country: 'Japan', currency: 'JPY', monthlyCost: 350000 },
    { city: 'New York', country: 'USA', currency: 'USD', monthlyCost: 6000 },
    { city: 'Chiang Mai', country: 'Thailand', currency: 'THB', monthlyCost: 45000 },
    { city: 'Lisbon', country: 'Portugal', currency: 'EUR', monthlyCost: 2500 },
    { city: 'Mexico City', country: 'Mexico', currency: 'MXN', monthlyCost: 35000 },
];

interface Props {
    netWorthUSD: number; // Always pass net worth in USD for calculation baseline
}

export default function TravelPowerCard({ netWorthUSD }: Props) {
    const [settings, setSettings] = useState<UserSettings | null>(null);

    useEffect(() => {
        setSettings(loadSettings());
    }, []);

    // Helper to get rate (IDR, THB etc might not be in our main service yet, adding simple mocks here if needed)
    // For MVP, if currency not in our main service, we need to mock it here or add to service but keep it hidden from main selector
    // Simpler approach: Convert USD -> Local
    const getRate = (target: string): number => {
        const RATES: Record<string, number> = {
            'IDR': 15800,
            'THB': 36.5,
            'MXN': 16.8,
            'USD': 1,
            'EUR': 0.92,
            'GBP': 0.79,
            'JPY': 151.5
        };
        return RATES[target] || 1;
    };

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Plane size={120} />
            </div>

            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 opacity-90">
                <Plane size={16} /> Travel Power
            </h3>

            <div className="space-y-4 relative z-10">
                {CITIES.slice(0, 3).map((city) => {
                    const localNetWorth = netWorthUSD * getRate(city.currency);
                    const months = localNetWorth / city.monthlyCost;
                    const years = months / 12;

                    return (
                        <div key={city.city} className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-sm">{city.city}</p>
                                <p className="text-xs opacity-75">{city.country}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-lg">
                                    {years > 1 ? `${years.toFixed(1)} years` : `${months.toFixed(1)} months`}
                                </p>
                                <p className="text-xs opacity-75">
                                    Freedom
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p className="text-[10px] text-center mt-4 opacity-60">
                Based on avg. cost of living for digital nomads
            </p>
        </div>
    );
}
