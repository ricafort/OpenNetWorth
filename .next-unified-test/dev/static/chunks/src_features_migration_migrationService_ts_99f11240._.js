(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/features/migration/migrationService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MigrationService",
    ()=>MigrationService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)");
;
;
const MigrationService = {
    /**
     * Migrates all local data to Supabase for the current authenticated user.
     * WARNING: This does NOT check if data already exists. It acts as a "seed".
     */ migrateToCloud: async (userId)=>{
        const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
        console.log("MigrationService: Starting migration for user", userId);
        const assets = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadAssets"]();
        const liabilities = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadLiabilities"]();
        const goals = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadGoals"]();
        const recurring = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadRecurringTransactions"]();
        const history = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadNetWorthHistory"]();
        const cashflow = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadCashFlow"]();
        const settings = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadSettings"]();
        // 1. Assets
        if (assets.length > 0) {
            const payload = assets.map((a)=>({
                    user_id: userId,
                    name: a.name,
                    type: a.type,
                    value: a.value,
                    currency: a.currency,
                    is_liquid: a.is_liquid,
                    interest_rate: a.interest_rate,
                    investment_details: a.investment_details // Ensure this matches renamed field
                }));
            const { error } = await supabase.from('assets').insert(payload);
            if (error) console.error("Migration: Failed assets", error);
        }
        // 2. Liabilities
        if (liabilities.length > 0) {
            const payload = liabilities.map((l)=>({
                    user_id: userId,
                    name: l.name,
                    type: l.type,
                    balance: l.balance,
                    minimum_payment: l.minimum_payment,
                    interest_rate: l.interest_rate,
                    currency: l.currency
                }));
            const { error } = await supabase.from('liabilities').insert(payload);
            if (error) console.error("Migration: Failed liabilities", error);
        }
        // 3. Goals
        if (goals.length > 0) {
            const payload = goals.map((g)=>({
                    user_id: userId,
                    name: g.name,
                    target_amount: g.target_amount,
                    current_amount: g.current_amount,
                    currency: g.currency,
                    deadline: g.deadline || null,
                    category: g.category,
                    is_completed: g.is_completed
                }));
            const { error } = await supabase.from('goals').insert(payload);
            if (error) console.error("Migration: Failed goals", error);
        }
        // 4. Recurring
        if (recurring.length > 0) {
            const payload = recurring.map((r)=>({
                    user_id: userId,
                    name: r.name,
                    amount: r.amount,
                    type: r.type,
                    frequency: r.frequency,
                    category: r.category,
                    start_date: r.start_date,
                    currency: r.currency || settings.baseCurrency,
                    is_active: r.is_active
                }));
            const { error } = await supabase.from('recurring_transactions').insert(payload);
            if (error) console.error("Migration: Failed recurring", error);
        }
        // 5. History (Net Worth Snapshots)
        if (history.length > 0) {
            const payload = history.map((h)=>({
                    user_id: userId,
                    date: h.date,
                    total_assets: h.totalAssets,
                    total_liabilities: h.totalLiabilities,
                    net_worth: h.netWorth
                }));
            // Limit batch size if needed, but <24 items is fine
            const { error } = await supabase.from('net_worth_snapshots').insert(payload);
            if (error) console.error("Migration: Failed history", error);
        }
        // 6. Cashflow (Monthly)
        if (cashflow.length > 0) {
            const payload = cashflow.map((c)=>({
                    user_id: userId,
                    month: c.month,
                    income: c.income,
                    expenses: c.expenses
                }));
            const { error } = await supabase.from('monthly_cashflow').insert(payload);
            if (error) console.error("Migration: Failed cashflow", error);
        }
        // 7. Update Profile Settings
        if (settings.baseCurrency) {
            await supabase.from('profiles').update({
                currency_code: settings.baseCurrency
            }).eq('id', userId);
        }
        console.log("MigrationService: Complete.");
    },
    clearLocalData: ()=>{
        // Clear all migration flags and data
        localStorage.removeItem('clearworth_migration_requested');
        localStorage.removeItem('clearworth_demo_mode');
        localStorage.removeItem('clearworth_initialized');
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAllData"]();
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_features_migration_migrationService_ts_99f11240._.js.map