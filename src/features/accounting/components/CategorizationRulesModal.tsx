import React, { useState, useEffect } from 'react';
import { X, Trash2, Edit2, Check, Shield } from 'lucide-react';

interface Rule {
    id: string;
    account_id: string;
    match_string: string;
    match_type: string;
    target_category: string;
    created_at: string;
    updated_at: string;
}

interface CategorizationRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    accountId: string;
    accountName: string;
}

export const CategorizationRulesModal: React.FC<CategorizationRulesModalProps> = ({
    isOpen,
    onClose,
    accountId,
    accountName
}) => {
    const [rules, setRules] = useState<Rule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [editCategory, setEditCategory] = useState<string>('');

    const loadRules = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/accounting/rules?accountId=${accountId}`);
            if (res.ok) {
                const data = await res.json();
                setRules(data);
            } else {
                setError('Failed to load categorization rules. Please try again.');
            }
        } catch (e) {
            console.error('Failed to load rules', e);
            setError('A network error occurred while loading rules.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && accountId) {
            loadRules();
        }
    }, [isOpen, accountId]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            const res = await fetch(`/api/accounting/rules?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setRules(rules.filter(r => r.id !== id));
            } else {
                alert('Failed to delete rule. Please try again.');
            }
        } catch (e) {
            console.error('Failed to delete rule', e);
            alert('A network error occurred while deleting the rule.');
        }
    };

    const handleSaveEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/accounting/rules`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, target_category: editCategory })
            });
            if (res.ok) {
                setRules(rules.map(r => r.id === id ? { ...r, target_category: editCategory } : r));
                setEditingRuleId(null);
            } else {
                alert('Failed to update rule. Please try again.');
            }
        } catch (e) {
            console.error('Failed to update rule', e);
            alert('A network error occurred while updating the rule.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Categorization Rules</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Manage saved rules for {accountName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                    {isLoading ? (
                        <div className="text-center py-8 text-sm text-slate-500">Loading rules...</div>
                    ) : error ? (
                        <div className="text-center py-12 border border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800/50 rounded-xl">
                            <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">Error loading rules</h3>
                            <p className="text-xs text-rose-500/80 mt-1">{error}</p>
                            <button onClick={loadRules} className="mt-4 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-lg transition">
                                Retry
                            </button>
                        </div>
                    ) : rules.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No rules saved</h3>
                            <p className="text-xs text-slate-500 mt-1">You can save categorization rules during document import review.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {rules.map(rule => (
                                <div key={rule.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">"{rule.match_string}"</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">
                                                {rule.match_type} MATCH
                                            </span>
                                        </div>
                                        {editingRuleId === rule.id ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <select
                                                    value={editCategory}
                                                    onChange={e => setEditCategory(e.target.value)}
                                                    className="text-xs px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded capitalize"
                                                >
                                                    <optgroup label="Income">
                                                        <option value="salary">Salary / Wage</option>
                                                        <option value="business_income">Business Income</option>
                                                        <option value="investment_income">Investment / Dividend</option>
                                                        <option value="other_income">Other Income</option>
                                                    </optgroup>
                                                    <optgroup label="Expense">
                                                        <option value="living_expense">Living Expense</option>
                                                        <option value="office_supplies">Office Supplies</option>
                                                        <option value="groceries">Groceries</option>
                                                        <option value="utilities">Utilities</option>
                                                        <option value="rent_expense">Rent</option>
                                                        <option value="transportation">Transportation</option>
                                                        <option value="entertainment">Entertainment</option>
                                                        <option value="healthcare">Healthcare</option>
                                                        <option value="interest_expense">Interest / Finance</option>
                                                        <option value="insurance">Insurance</option>
                                                    </optgroup>
                                                </select>
                                                <button onClick={() => handleSaveEdit(rule.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingRuleId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                Assigns to: <strong className="capitalize text-slate-700 dark:text-slate-300">{rule.target_category.replace(/_/g, ' ')}</strong>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1 ml-4 shrink-0">
                                        <button
                                            onClick={() => { setEditingRuleId(rule.id); setEditCategory(rule.target_category); }}
                                            disabled={editingRuleId !== null}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition disabled:opacity-50"
                                            title="Edit Rule"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.id)}
                                            disabled={editingRuleId !== null}
                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition disabled:opacity-50"
                                            title="Delete Rule"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg text-sm font-semibold transition"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
