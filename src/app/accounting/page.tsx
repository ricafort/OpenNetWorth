import { AccountingPage } from '@/features/accounting/components/AccountingPage';

export const metadata = {
    title: 'Accounting Engine | OpenNetWorth',
    description: 'Double-entry personal financial ledger with exact cents precision',
};

export default function Page() {
    return <AccountingPage />;
}
