import { AccountingPage } from '@/features/accounting/components/AccountingPage';
import { Suspense } from 'react';

export const metadata = {
    title: 'Accounting Engine | OpenNetWorth',
    description: 'Double-entry personal financial ledger with exact cents precision',
};

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AccountingPage />
        </Suspense>
    );
}
