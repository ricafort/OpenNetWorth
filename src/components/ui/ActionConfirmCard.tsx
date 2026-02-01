import React from 'react';
import { Check, X, Wallet, TrendingUp, Home, Landmark, CreditCard } from 'lucide-react';

interface ActionIntent {
    action: string;
    type: string;
    name: string;
    amount: number;
    currency: string;
    confidence: number;
}

interface ActionConfirmCardProps {
    intent: ActionIntent;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

export default function ActionConfirmCard({ intent, onConfirm, onCancel, isProcessing }: ActionConfirmCardProps) {

    const getIcon = () => {
        switch (intent.type) {
            case 'Cash': return <Wallet className="text-emerald-500" size={24} />;
            case 'Investment': return <TrendingUp className="text-blue-500" size={24} />;
            case 'Property': return <Home className="text-amber-500" size={24} />;
            case 'Liability':
            case 'Mortgage': return <Landmark className="text-red-500" size={24} />;
            case 'Credit Card': return <CreditCard className="text-purple-500" size={24} />;
            default: return <Check className="text-slate-500" size={24} />;
        }
    };

    const getActionLabel = () => {
        switch (intent.action) {
            case 'add_asset': return 'Add New Asset';
            case 'add_liability': return 'Add New Liability';
            case 'update_goal': return 'Update Goal';
            default: return 'Confirm Action';
        }
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="w-full max-w-sm ml-auto mr-4 my-2">
            <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-xl transition-all">
                {/* Header Strip */}
                <div className={`h-1.5 w-full ${intent.action === 'add_liability' ? 'bg-red-500' : 'bg-emerald-500'}`} />

                <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                {getIcon()}
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{getActionLabel()}</h4>
                                <p className="text-xs text-slate-500 font-medium">{intent.type || 'General'}</p>
                            </div>
                        </div>
                        <div className="bg-slate-100 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500">
                            AI DETECTED
                        </div>
                    </div>

                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 mb-5 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-500">Name</span>
                            <span className="text-sm font-bold text-slate-900">{intent.name || 'Unknown Item'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-500">Value</span>
                            <span className="text-lg font-black text-slate-900 tracking-tight">
                                {intent.amount ? formatCurrency(intent.amount, intent.currency) : '--'}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isProcessing}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${intent.action === 'add_liability'
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                }`}
                        >
                            {isProcessing ? 'Saving...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
