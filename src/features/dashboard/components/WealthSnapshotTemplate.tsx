
'use client';

import React, { forwardRef } from 'react';
import { Asset } from '@/features/assets/types';
import { Liability } from '@/features/liabilities/types';
import { NetWorthSnapshot } from '@/types';
import { ShieldCheck, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface WealthSnapshotTemplateProps {
    assets: Asset[];
    liabilities: Liability[];
    netWorth: number;
    date: string;
    hashId: string;
    userProfile?: { name: string; tier: string };
}

const WealthSnapshotTemplate = forwardRef<HTMLDivElement, WealthSnapshotTemplateProps>(
    ({ assets, liabilities, netWorth, date, hashId, userProfile = { name: 'OpenNetWorth Member', tier: 'Local' } }, ref) => {

        const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);

        return (
            <div ref={ref} className="bg-white text-[#0f172a] p-12 w-[800px] min-h-[1100px] relative font-sans">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-[#0f172a] pb-8 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {/* Gradient replacement: html2canvas struggles with complex gradients sometimes, but let's try standard linear-gradient if it fails again we simplify */}
                            <div className="w-8 h-8 rounded-lg" style={{ background: 'linear-gradient(135deg, #2563eb, #4338ca)' }}></div>
                            <span className="text-2xl font-black uppercase tracking-tighter" style={{ background: 'linear-gradient(to right, #2563eb, #4338ca)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                OpenNetWorth
                            </span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-[#0f172a] mt-4">Wealth Snapshot™</h1>
                        <p className="text-[#64748b] font-medium mt-1">Net Worth Summary Statement</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">Date</p>
                        <p className="text-lg font-bold text-[#0f172a] mb-4">{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

                        <p className="text-sm font-bold text-[#94a3b8] uppercase tracking-wider">Report ID</p>
                        <p className="text-xs font-mono text-[#64748b]">{hashId}</p>
                    </div>
                </div>

                {/* Main Stats */}
                <div className="bg-[#f8fafc] rounded-2xl p-8 border border-[#e2e8f0] mb-12">
                    <div className="grid grid-cols-3 gap-8 text-center divide-x divide-[#e2e8f0]">
                        <div>
                            <p className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-2">Total Assets</p>
                            <p className="text-2xl font-black text-[#059669]">${totalAssets.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-2">Total Liabilities</p>
                            <p className="text-2xl font-black text-[#e11d48]">${totalLiabilities.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#64748b] uppercase tracking-wider mb-2">Net Worth</p>
                            <p className="text-3xl font-black text-[#0f172a]">${netWorth.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                    {/* Assets */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-[#047857] border-b border-[#d1fae5] pb-3 mb-4">
                            <TrendingUp size={20} />
                            Assets
                        </h3>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-[#f1f5f9]">
                                {assets.map(a => (
                                    <tr key={a.id}>
                                        <td className="py-2.5 font-medium text-[#334155]">{a.name}</td>
                                        <td className="py-2.5 text-right font-bold text-[#0f172a]">${a.value.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {assets.length === 0 && (
                                    <tr><td colSpan={2} className="py-4 text-center text-[#94a3b8] italic">No assets listed</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Liabilities */}
                    <div>
                        <h3 className="flex items-center gap-2 text-lg font-bold text-[#be123c] border-b border-[#ffe4e6] pb-3 mb-4">
                            <TrendingDown size={20} />
                            Liabilities
                        </h3>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-[#f1f5f9]">
                                {liabilities.map(l => (
                                    <tr key={l.id}>
                                        <td className="py-2.5 font-medium text-[#334155]">{l.name}</td>
                                        <td className="py-2.5 text-right font-bold text-[#0f172a]">${l.balance.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {liabilities.length === 0 && (
                                    <tr><td colSpan={2} className="py-4 text-center text-[#94a3b8] italic">No liabilities listed</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer / Verify */}
                <div className="absolute bottom-12 left-12 right-12 pt-8 border-t border-[#f1f5f9] flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-2 text-[#94a3b8] mb-2">
                            <ShieldCheck size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Self-Reported Snapshot</span>
                        </div>
                        <p className="text-xs text-[#94a3b8] max-w-sm leading-relaxed">
                            This document serves as a point-in-time snapshot of financial standing as self-reported by the user.
                            Generated by OpenNetWorth.
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-signature text-[#475569]">{userProfile.name}</p>
                        <p className="text-xs text-[#94a3b8] uppercase tracking-wider mt-1">{userProfile.tier} Vault</p>
                    </div>
                </div>
            </div>
        );
    }
);

WealthSnapshotTemplate.displayName = 'WealthSnapshotTemplate';

export default WealthSnapshotTemplate;
