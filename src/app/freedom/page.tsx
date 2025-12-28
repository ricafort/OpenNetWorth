
'use client';

import Sidebar from '@/components/Sidebar';
import DebtPayoffCalculator from '@/components/DebtPayoffCalculator';

export default function FreedomPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-foreground tracking-tight">Financial Freedom</h1>
                <p className="text-muted-foreground mt-2 font-medium">Design your exit strategy from debt.</p>
            </div>

            <DebtPayoffCalculator />
        </div>
    );
}
