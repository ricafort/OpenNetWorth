
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation'; // Added
import { createClient } from '@/utils/supabase/client';
import { Database } from '@/types/supabase';
import { Asset, Liability, Goal, NetWorthSnapshot, CashFlowEntry, RecurringTransaction, UserProfile } from '@/types';
import * as LocalStorage from '@/lib/storage'; // Fallback

interface ProfileContextType {
    // Identity
    profile: UserProfile | null;
    isLoading: boolean;
    isDemoMode: boolean; // True if we are impersonating a template
    canEdit: boolean;    // True if own profile or admin impersonating

    // Data
    assets: Asset[];
    liabilities: Liability[];
    goals: Goal[];
    history: NetWorthSnapshot[];
    cashFlow: CashFlowEntry[];
    recurring: RecurringTransaction[];

    // Actions
    refreshData: () => Promise<void>;
    switchProfile: (templateId: string | null) => void;

    // Writers (wrappers that decide where to save)
    addAsset: (asset: Asset) => Promise<void>;
    updateAsset: (asset: Asset) => Promise<void>;
    deleteAsset: (id: string) => Promise<void>;
    addRecurring: (item: RecurringTransaction) => Promise<void>;
    updateRecurring: (item: RecurringTransaction) => Promise<void>;
    deleteRecurring: (id: string) => Promise<void>;

    // Missing Liability Writers
    addLiability: (item: Liability) => Promise<void>;
    updateLiability: (item: Liability) => Promise<void>;
    deleteLiability: (id: string) => Promise<void>;

    // Goal Writers
    addGoal: (item: Goal) => Promise<void>;
    updateGoal: (item: Goal) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
    const supabase = createClient();
    const searchParams = useSearchParams(); // Hook into URL changes
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Data State
    const [assets, setAssets] = useState<Asset[]>([]);
    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
    const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>([]);
    const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);

    const isDemoMode = !!templateId;

    // React to URL changes immediately
    useEffect(() => {
        const simId = searchParams.get('simulatedProfileId');
        setTemplateId(simId); // If null, this exits demo mode
    }, [searchParams]);

    // Load data whenever templateId changes
    useEffect(() => {
        refreshData();
    }, [templateId]);

    const refreshData = async () => {
        setIsLoading(true);

        if (templateId) {
            // --- SUPABASE MODE (Template) ---
            await loadFromSupabase(templateId);
        } else {
            // --- LOCAL STORAGE MODE (Default/Legacy) ---
            loadFromLocalStorage();
        }
        setIsLoading(false);
    };

    const loadFromLocalStorage = () => {
        setAssets(LocalStorage.loadAssets());
        setLiabilities(LocalStorage.loadLiabilities());
        setGoals(LocalStorage.loadGoals());
        setHistory(LocalStorage.loadNetWorthHistory());
        setCashFlow(LocalStorage.loadCashFlow());
        setRecurring(LocalStorage.loadRecurringTransactions());

        // Mock profile
        // If we are in "Forked Demo Mode", we might have an origin ID to fetch badges
        const originId = localStorage.getItem('clearworth_demo_origin_id');

        setProfile({
            id: originId || 'local_user', // Use real UUID if available (unlocks badges)
            email: 'local@device',
            privacy_mode: true,
            is_template: !!originId, // Technically it's based on a template
            role: 'user',
            currency_code: LocalStorage.loadSettings().baseCurrency,
            created_at: new Date().toISOString()
        });
    };

    const loadFromSupabase = async (id: string) => {
        // Fetch Profile
        console.log("ProfileContext: Loading profile from Supabase...", id);
        const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', id).single();

        if (error) {
            console.error("ProfileContext: FAILED to load profile:", error);
            // If we fail to load the template, we should probably NOT leave it as local_user?
            // Or maybe we should alert?
        } else if (prof) {
            console.log("ProfileContext: Loaded profile:", prof);
            setProfile(prof as UserProfile);
        }

        // Fetch Data Parallel
        const [a, l, g, h, c, r] = await Promise.all([
            supabase.from('assets').select('*').eq('user_id', id),
            supabase.from('liabilities').select('*').eq('user_id', id),
            supabase.from('goals').select('*').eq('user_id', id),
            supabase.from('net_worth_history').select('*').eq('user_id', id),
            supabase.from('cash_flow_history').select('*').eq('user_id', id),
            supabase.from('recurring_transactions').select('*').eq('user_id', id)
        ]);

        if (a.data) {
            // Re-hydrate the nested investment object from JSONB
            const loadedAssets = (a.data as any[]).map(row => ({
                id: row.id,
                name: row.name,
                type: row.type,
                value: row.value,
                currency: row.currency, // Ensure we load this!
                is_liquid: row.is_liquid,
                interest_rate: row.interest_rate, // Load interest rate
                last_updated: row.last_updated,
                investment: row.investment_details // Load directly from JSONB
            }));
            setAssets(loadedAssets);
        }
        if (l.data) {
            setLiabilities(l.data as Liability[]);
        }
        if (g.data) {
            const loadedGoals = (g.data as any[]).map(row => ({
                id: row.id,
                name: row.name,
                targetAmount: row.target_amount,
                currentAmount: row.current_amount,
                startAmount: row.start_amount,
                currency: row.currency,
                category: row.category,
                createdAt: row.created_at,
                isCompleted: row.is_completed // Might be null/undefined if column missing, which is fine
            }));
            setGoals(loadedGoals);
        }
        if (h.data) setHistory(h.data as NetWorthSnapshot[]);
        if (c.data) setCashFlow(c.data as CashFlowEntry[]);

        if (r.data) {
            const loadedRecurring = (r.data as any[]).map(row => ({
                id: row.id,
                name: row.name,
                amount: row.amount,
                type: row.type,
                frequency: row.frequency,
                category: row.category,
                startDate: row.start_date,
                endDate: row.end_date,
                isActive: row.is_active,
                notes: row.notes,
                currency: row.currency
            }));
            setRecurring(loadedRecurring);
        }
    };

    // Actions
    const switchProfile = (id: string | null) => {
        setTemplateId(id);
    };

    // Writers (Example: Assets)
    // Writers (Example: Assets)
    const addAsset = async (asset: Asset) => {
        if (isDemoMode && templateId) {
            const dbAsset = {
                id: asset.id,
                user_id: templateId,
                name: asset.name,
                type: asset.type,
                value: asset.value,
                currency: asset.currency,
                is_liquid: asset.is_liquid,
                interest_rate: asset.interest_rate, // Save Rate
                investment_details: asset.investment, // Store as JSONB
                last_updated: new Date().toISOString()
            };

            // Write to Supabase
            const { error } = await (supabase.from('assets') as any).insert(dbAsset);
            if (error) {
                console.error("Failed to save asset:", error);
                alert("Failed to save: " + error.message);
                return;
            }
        } else {
            // Write to LocalStorage
            const updated = [...assets, asset];
            LocalStorage.saveAssets(updated);
        }
        await refreshData();
    };

    // TODO: Implement updateAsset, deleteAsset, etc. similarly
    // TODO: Implement updateAsset, deleteAsset, etc. similarly
    const updateAsset = async (asset: Asset) => {
        if (isDemoMode && templateId) {
            const dbAsset = {
                id: asset.id, // Ensure we check against ID
                name: asset.name,
                type: asset.type,
                value: asset.value,
                currency: asset.currency,
                is_liquid: asset.is_liquid,
                interest_rate: asset.interest_rate, // Save Rate
                // Flattened Investment Columns
                ticker: asset.investment?.ticker,
                shares: asset.investment?.shares,
                cost_basis: asset.investment?.costBasis,
                sector: asset.investment?.sector,
                dividend_yield: asset.investment?.dividendYield,
                asset_class: asset.investment?.assetClass,
                last_updated: new Date().toISOString()
            };

            const { error } = await (supabase.from('assets') as any).update(dbAsset).eq('id', asset.id);
            if (error) console.error(error);
        } else {
            const updated = assets.map(a => a.id === asset.id ? asset : a);
            LocalStorage.saveAssets(updated);
        }
        await refreshData();
    }

    const deleteAsset = async (id: string) => {
        if (isDemoMode && templateId) {
            await supabase.from('assets').delete().eq('id', id);
        } else {
            const updated = assets.filter(a => a.id !== id);
            LocalStorage.saveAssets(updated);
        }
        await refreshData();
    }

    // --- Liabilities ---
    const addLiability = async (item: Liability) => {
        if (isDemoMode && templateId) {
            const dbItem: Database['public']['Tables']['liabilities']['Insert'] = {
                id: item.id,
                user_id: templateId,
                name: item.name,
                type: item.type,
                balance: item.balance,
                currency: item.currency,
                interest_rate: item.interest_rate,
                minimum_payment: item.minimum_payment,
                is_good_debt: item.is_good_debt,
                last_updated: new Date().toISOString()
            };
            const { error } = await (supabase.from('liabilities') as any).insert(dbItem);
            if (error) {
                console.error("Failed to save liability:", error);
                alert("Failed to save: " + error.message);
                return;
            }
        } else {
            const updated = [...liabilities, item];
            LocalStorage.saveLiabilities(updated);
        }
        await refreshData();
    };

    const updateLiability = async (item: Liability) => {
        if (isDemoMode && templateId) {
            const dbItem = {
                id: item.id,
                name: item.name,
                type: item.type,
                balance: item.balance,
                currency: item.currency,
                interest_rate: item.interest_rate,
                minimum_payment: item.minimum_payment,
                is_good_debt: item.is_good_debt,
                last_updated: new Date().toISOString()
            };
            const { error } = await (supabase.from('liabilities') as any).update(dbItem).eq('id', item.id);
            if (error) console.error(error);
        } else {
            const updated = liabilities.map(l => l.id === item.id ? item : l);
            LocalStorage.saveLiabilities(updated);
        }
        await refreshData();
    };

    const deleteLiability = async (id: string) => {
        if (isDemoMode && templateId) {
            await supabase.from('liabilities').delete().eq('id', id);
        } else {
            const updated = liabilities.filter(l => l.id !== id);
            LocalStorage.saveLiabilities(updated);
        }
        await refreshData();
    };

    // --- Goals ---
    const addGoal = async (item: Goal) => {
        if (isDemoMode && templateId) {
            const dbItem: Database['public']['Tables']['goals']['Insert'] = {
                id: item.id,
                user_id: templateId,
                name: item.name,
                target_amount: item.targetAmount,
                current_amount: item.currentAmount,
                start_amount: item.startAmount || 0,
                deadline: item.deadline,
                currency: item.currency,
                category: item.category,
                // is_completed: item.isCompleted || false, // Removed until migration is run
                created_at: new Date().toISOString()
            };
            const { error } = await (supabase.from('goals') as any).insert(dbItem);
            if (error) {
                console.error("Failed to save goal:", error);
                alert("Failed to save: " + error.message);
                return;
            }
        } else {
            const updated = [...goals, item];
            LocalStorage.saveGoals(updated);
        }
        await refreshData();
    };

    const updateGoal = async (item: Goal) => {
        if (isDemoMode && templateId) {
            const dbItem: Database['public']['Tables']['goals']['Update'] = {
                id: item.id,
                name: item.name,
                target_amount: item.targetAmount,
                current_amount: item.currentAmount,
                start_amount: item.startAmount,
                deadline: item.deadline,
                currency: item.currency,
                category: item.category,
                // is_completed: item.isCompleted, // Removed until migration is run
                // last_updated: new Date().toISOString() // Removed: Column does not exist in goals schema
            };
            const { error } = await (supabase.from('goals') as any).update(dbItem).eq('id', item.id);
            if (error) console.error("Goal update failed:", error.message);
        } else {
            const updated = goals.map(g => g.id === item.id ? item : g);
            LocalStorage.saveGoals(updated);
        }
        await refreshData();
    };

    const deleteGoal = async (id: string) => {
        if (isDemoMode && templateId) {
            await (supabase.from('goals') as any).delete().eq('id', id);
        } else {
            const updated = goals.filter(g => g.id !== id);
            LocalStorage.saveGoals(updated);
        }
        await refreshData();
    };

    // --- Recurring Transactions ---
    const addRecurring = async (item: RecurringTransaction) => {
        if (isDemoMode && templateId) {
            // Map camelCase to snake_case for DB
            const dbItem = {
                id: item.id,
                user_id: templateId,
                name: item.name,
                amount: item.amount,
                type: item.type,
                frequency: item.frequency,
                category: item.category,
                start_date: item.startDate, // Map this
                is_active: item.isActive,   // Map this
                currency: item.currency
            };

            const { error } = await supabase.from('recurring_transactions').insert(dbItem as any);
            if (error) {
                console.error('Failed to add recurring:', error);
                alert('Error: ' + error.message);
            }
        } else {
            const updated = [...recurring, item];
            LocalStorage.saveRecurringTransactions(updated);
        }
        await refreshData();
    };

    const updateRecurring = async (item: RecurringTransaction) => {
        if (isDemoMode && templateId) {
            const dbItem = {
                id: item.id,
                name: item.name,
                amount: item.amount,
                type: item.type,
                frequency: item.frequency,
                category: item.category,
                start_date: item.startDate, // Map this
                is_active: item.isActive,   // Map this
                currency: item.currency
            };

            const { error } = await (supabase.from('recurring_transactions') as any).update(dbItem as any).eq('id', item.id);
            if (error) console.error(error);
        } else {
            const updated = recurring.map(r => r.id === item.id ? item : r);
            LocalStorage.saveRecurringTransactions(updated);
        }
        await refreshData();
    };

    const deleteRecurring = async (id: string) => {
        if (isDemoMode && templateId) {
            await supabase.from('recurring_transactions').delete().eq('id', id);
        } else {
            const updated = recurring.filter(r => r.id !== id);
            LocalStorage.saveRecurringTransactions(updated);
        }
        await refreshData();
    };

    return (
        <ProfileContext.Provider value={{
            profile, isLoading, isDemoMode, canEdit: true,
            assets, liabilities, goals, history, cashFlow, recurring,
            refreshData, switchProfile,
            addAsset, updateAsset, deleteAsset,
            addRecurring, updateRecurring, deleteRecurring,
            addLiability, updateLiability, deleteLiability,
            addGoal, updateGoal, deleteGoal
        }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfile() {
    const context = useContext(ProfileContext);
    if (!context) throw new Error("useProfile must be used within ProfileProvider");
    return context;
}
