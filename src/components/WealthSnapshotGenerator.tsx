
'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Asset, Liability } from '@/types';
import { loadAssets, loadLiabilities } from '@/lib/storage';
import WealthSnapshotTemplate from './WealthSnapshotTemplate';
import { Download, FileText, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { generateVerificationHash } from '@/lib/crypto';

export default function WealthSnapshotGenerator() {
    const templateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [data, setData] = useState<{ assets: Asset[]; liabilities: Liability[]; netWorth: number }>({ assets: [], liabilities: [], netWorth: 0 });
    const [currentHash, setCurrentHash] = useState<string>('PREVIEW');

    useEffect(() => {
        const assets = loadAssets();
        const liabilities = loadLiabilities();
        const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
        setData({
            assets,
            liabilities,
            netWorth: totalAssets - totalLiabilities
        });
    }, []);

    const generatePDF = async () => {
        if (!templateRef.current) return;
        setIsGenerating(true);

        try {
            // Generate Secure Hash
            const frozenData = {
                date: new Date().toISOString().split('T')[0],
                assets: data.assets.map(a => ({ id: a.id, val: a.value })), // Minimize data for hash
                netWorth: data.netWorth
            };
            const hashId = await generateVerificationHash(frozenData);
            setCurrentHash(hashId);

            // Wait for React to render the new Hash ID into the hidden template
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(templateRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            } as any);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`WealthSnapshot_${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error) {
            console.error('PDF Generation failed', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGenerating(false);
            setCurrentHash('PREVIEW'); // Reset or keep? Resetting to avoid stale hash confusion.
        }
    };

    return (
        <div>
            <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="flex items-center gap-3 w-full p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors text-left group shadow-sm"
            >
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
                    {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
                </div>
                <div>
                    <h3 className="font-bold text-foreground">Generate Wealth Snapshot™</h3>
                    <p className="text-sm text-muted-foreground font-medium">Download an official PDF report of your current standing.</p>
                </div>
                <div className="ml-auto">
                    <Download size={20} className="text-muted-foreground group-hover:text-emerald-600" />
                </div>
            </button>

            {/* Hidden Template for Capture */}
            <div style={{ position: 'absolute', top: -9999, left: -9999, visibility: 'visible' }}>
                <WealthSnapshotTemplate
                    ref={templateRef}
                    assets={data.assets}
                    liabilities={data.liabilities}
                    netWorth={data.netWorth}
                    date={new Date().toISOString()}
                    hashId={currentHash}
                />
            </div>
        </div>
    );
}
