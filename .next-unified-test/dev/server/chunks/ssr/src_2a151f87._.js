module.exports = [
"[project]/src/features/dashboard/widgets/WidgetWrapper.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WidgetWrapper
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/grip-vertical.js [app-ssr] (ecmascript) <export default as GripVertical>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
;
;
function WidgetWrapper({ id, title, isEditMode, onRemove, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-md",
        children: [
            (title || isEditMode) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `flex items-center justify-between p-4 border-b border-border transition-colors relative widget-drag-handle ${isEditMode ? 'bg-slate-50 cursor-move' : ''}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            isEditMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__["GripVertical"], {
                                size: 16,
                                className: "text-slate-400"
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                                lineNumber: 23,
                                columnNumber: 40
                            }, this),
                            title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "font-bold text-foreground text-sm tracking-tight",
                                children: title
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                                lineNumber: 24,
                                columnNumber: 35
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                        lineNumber: 22,
                        columnNumber: 21
                    }, this),
                    isEditMode && onRemove && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: (e)=>{
                            e.stopPropagation(); // Prevent drag start
                            onRemove();
                        },
                        className: "p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer",
                        title: `Hide ${title || 'widget'}`,
                        "aria-label": `Hide ${title || 'widget'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                            size: 16
                        }, void 0, false, {
                            fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                            lineNumber: 36,
                            columnNumber: 29
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                        lineNumber: 27,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                lineNumber: 19,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-hidden relative",
                children: [
                    children,
                    isEditMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "absolute inset-0 z-10 bg-transparent"
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                        lineNumber: 48,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                lineNumber: 43,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
        lineNumber: 16,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/hooks/useResourceQuery.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useResourceQuery",
    ()=>useResourceQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-ssr] (ecmascript)");
'use client';
;
;
function useResourceQuery({ queryKey, repository }) {
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const { isDemoMode, profile, isLoading: profileLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    // Fetch
    const { data = [], isLoading, error } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            ...queryKey,
            isDemoMode,
            templateId
        ],
        queryFn: async ()=>{
            return await repository.getAll();
        },
        enabled: !profileLoading
    });
    // Create
    const addMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: async (newItem)=>{
            // @ts-ignore - Supabase might return null on error, but repo handles throws
            return await repository.create(newItem);
        },
        onSuccess: ()=>{
            queryClient.invalidateQueries({
                queryKey
            });
        }
    });
    // Update
    const updateMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: async (updatedItem)=>{
            return await repository.update(updatedItem);
        },
        onSuccess: ()=>{
            queryClient.invalidateQueries({
                queryKey
            });
        }
    });
    // Delete
    const deleteMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: async (id)=>{
            await repository.delete(id);
            return id;
        },
        onSuccess: ()=>{
            queryClient.invalidateQueries({
                queryKey
            });
        }
    });
    return {
        items: data,
        isLoading,
        error,
        add: addMutation.mutateAsync,
        update: updateMutation.mutateAsync,
        del: deleteMutation.mutateAsync,
        isAdding: addMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending
    };
}
}),
"[project]/src/features/assets/data/repository.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LocalAssetRepository",
    ()=>LocalAssetRepository,
    "SupabaseAssetRepository",
    ()=>SupabaseAssetRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-ssr] (ecmascript)");
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClient"])();
class SupabaseAssetRepository {
    templateId;
    constructor(templateId){
        this.templateId = templateId;
    }
    async getAll() {
        let query = supabase.from('assets').select('*');
        if (this.templateId) {
            query = query.eq('user_id', this.templateId);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                query = query.eq('user_id', user.id);
            } else {
                return [];
            }
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
    async getById(id) {
        const { data, error } = await supabase.from('assets').select('*').eq('id', id).single();
        if (error) return null;
        return data;
    }
    async create(item) {
        // Ensure user_id is set
        let userId = item.user_id;
        if (!userId) {
            if (this.templateId) {
                userId = this.templateId;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userId = user.id;
            }
        }
        if (!userId) throw new Error("Cannot create asset: User unsupported or not logged in");
        const payload = {
            ...item,
            user_id: userId
        };
        const { data, error } = await supabase.from('assets').insert([
            payload
        ]).select().single();
        if (error) {
            console.error("Supabase Create Error:", error);
            throw error;
        }
        return data;
    }
    async update(item) {
        const { data, error } = await supabase.from('assets').update(item).eq('id', item.id).select().single();
        if (error) throw error;
        return data;
    }
    async delete(id) {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) throw error;
    }
}
class LocalAssetRepository {
    templateId;
    constructor(templateId){
        this.templateId = templateId;
    }
    async getAll() {
        const allAssets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadAssets"])();
        // If templateId is provided (e.g. 'fam', 'grow'), filter by it.
        // If not provided (Guest), filter by 'local_user' OR null/undefined to capture manual guest entries
        const targetId = this.templateId || 'local_user';
        return allAssets.filter((a)=>a.user_id === targetId || !a.user_id && targetId === 'local_user');
    }
    async getById(id) {
        const assets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadAssets"])();
        return assets.find((a)=>a.id === id) || null;
    }
    async create(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persistScopedRecord"])('assets', item);
    }
    async update(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persistScopedRecord"])('assets', item);
    }
    async delete(id) {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteScopedRecord"])('assets', id);
    }
}
}),
"[project]/src/features/assets/hooks/useAssetRepository.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAssetRepository",
    ()=>useAssetRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/data/repository.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
;
function useAssetRepository() {
    const { isDemoMode, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) {
            if (isDemoMode) {
                return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SupabaseAssetRepository"](templateId);
            } else if (profile?.id && profile.id !== 'local_user') {
                return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SupabaseAssetRepository"](profile.id);
            }
        }
        // Local Vault Mode (100% private SQLite-backed)
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LocalAssetRepository"]();
    }, [
        isDemoMode,
        templateId,
        profile?.id
    ]);
    return repository;
}
}),
"[project]/src/features/assets/hooks/useAssetsQuery.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAssetsQuery",
    ()=>useAssetsQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useResourceQuery.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetRepository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/hooks/useAssetRepository.ts [app-ssr] (ecmascript)");
;
;
const QUERY_KEY = [
    'assets'
];
function useAssetsQuery() {
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetRepository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAssetRepository"])();
    const { items: assets, isLoading, error, add: addAsset, update: updateAsset, del: deleteAsset, isAdding, isUpdating, isDeleting } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useResourceQuery"])({
        queryKey: QUERY_KEY,
        repository
    });
    return {
        assets,
        isLoading,
        error,
        addAsset,
        updateAsset,
        deleteAsset,
        isAdding,
        isUpdating,
        isDeleting
    };
}
}),
"[project]/src/features/liabilities/data/repository.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LocalLiabilityRepository",
    ()=>LocalLiabilityRepository,
    "SupabaseLiabilityRepository",
    ()=>SupabaseLiabilityRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-ssr] (ecmascript)");
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClient"])();
class SupabaseLiabilityRepository {
    templateId;
    constructor(templateId){
        this.templateId = templateId;
    }
    async getAll() {
        let query = supabase.from('liabilities').select('*');
        if (this.templateId) {
            query = query.eq('user_id', this.templateId);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                query = query.eq('user_id', user.id);
            } else {
                return [];
            }
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }
    async getById(id) {
        const { data, error } = await supabase.from('liabilities').select('*').eq('id', id).single();
        if (error) return null;
        return data;
    }
    async create(item) {
        // Ensure user_id is set
        let userId = item.user_id;
        if (!userId || userId === 'local' || userId === 'local_user') {
            if (this.templateId) {
                userId = this.templateId;
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) userId = user.id;
            }
        }
        if (!userId) throw new Error("Cannot create liability: User unsupported or not logged in");
        const payload = {
            ...item,
            user_id: userId
        };
        const { data, error } = await supabase.from('liabilities').insert([
            payload
        ]).select().single();
        if (error) throw error;
        return data;
    }
    async update(item) {
        const { data, error } = await supabase.from('liabilities').update(item).eq('id', item.id).select().single();
        if (error) throw error;
        return data;
    }
    async delete(id) {
        const { error } = await supabase.from('liabilities').delete().eq('id', id);
        if (error) throw error;
    }
}
class LocalLiabilityRepository {
    templateId;
    constructor(templateId){
        this.templateId = templateId;
    }
    async getAll() {
        const allItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadLiabilities"])();
        const targetId = this.templateId || 'local_user';
        return allItems.filter((l)=>l.user_id === targetId || !l.user_id && targetId === 'local_user');
    }
    async getById(id) {
        const items = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadLiabilities"])();
        return items.find((i)=>i.id === id) || null;
    }
    async create(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persistScopedRecord"])('liabilities', item);
    }
    async update(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persistScopedRecord"])('liabilities', item);
    }
    async delete(id) {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteScopedRecord"])('liabilities', id);
    }
}
}),
"[project]/src/features/liabilities/hooks/useLiabilityRepository.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLiabilityRepository",
    ()=>useLiabilityRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/liabilities/data/repository.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
'use client';
;
;
;
function useLiabilityRepository() {
    const { isDemoMode, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) {
            if (isDemoMode) {
                return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SupabaseLiabilityRepository"](templateId);
            } else if (profile?.id && profile.id !== 'local_user') {
                return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SupabaseLiabilityRepository"](profile.id);
            }
        }
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LocalLiabilityRepository"](templateId);
    }, [
        isDemoMode,
        templateId,
        profile?.id
    ]);
    return repository;
}
}),
"[project]/src/features/liabilities/hooks/useLiabilitiesQuery.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLiabilitiesQuery",
    ()=>useLiabilitiesQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useResourceQuery.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilityRepository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/liabilities/hooks/useLiabilityRepository.ts [app-ssr] (ecmascript)");
;
;
const QUERY_KEY = [
    'liabilities'
];
function useLiabilitiesQuery() {
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilityRepository$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLiabilityRepository"])();
    const { items: liabilities, isLoading, error, add: addLiability, update: updateLiability, del: deleteLiability, isAdding, isUpdating, isDeleting } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useResourceQuery"])({
        queryKey: QUERY_KEY,
        repository
    });
    return {
        liabilities,
        isLoading,
        error,
        addLiability,
        updateLiability,
        deleteLiability,
        isAdding,
        isUpdating,
        isDeleting
    };
}
}),
"[project]/src/lib/utils/currencyService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SUPPORTED_CURRENCIES",
    ()=>SUPPORTED_CURRENCIES,
    "convertAmount",
    ()=>convertAmount,
    "formatCurrency",
    ()=>formatCurrency,
    "getCurrencySymbol",
    ()=>getCurrencySymbol,
    "getExchangeRate",
    ()=>getExchangeRate
]);
const SUPPORTED_CURRENCIES = [
    {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar'
    },
    {
        code: 'EUR',
        symbol: '€',
        name: 'Euro'
    },
    {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound'
    },
    {
        code: 'JPY',
        symbol: '¥',
        name: 'Japanese Yen'
    },
    {
        code: 'CAD',
        symbol: 'C$',
        name: 'Canadian Dollar'
    },
    {
        code: 'AUD',
        symbol: 'A$',
        name: 'Australian Dollar'
    },
    {
        code: 'CHF',
        symbol: 'Fr',
        name: 'Swiss Franc'
    },
    {
        code: 'CNY',
        symbol: '¥',
        name: 'Chinese Yuan'
    },
    {
        code: 'INR',
        symbol: '₹',
        name: 'Indian Rupee'
    },
    {
        code: 'SGD',
        symbol: 'S$',
        name: 'Singapore Dollar'
    },
    {
        code: 'PHP',
        symbol: '₱',
        name: 'Philippine Peso'
    },
    {
        code: 'KRW',
        symbol: '₩',
        name: 'South Korean Won'
    }
];
// Mock Exchange Rates (Base: USD)
// In a real app, fetch these from an API
const EXCHANGE_RATES = {
    'USD': 1.00,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 151.5,
    'CAD': 1.36,
    'AUD': 1.54,
    'CHF': 0.91,
    'CNY': 7.24,
    'INR': 83.5,
    'SGD': 1.35,
    'PHP': 56.5,
    'KRW': 1380.0 // 1 USD = ~1380 KRW
};
const getExchangeRate = (from, to)=>{
    const fromRate = EXCHANGE_RATES[from] || 1;
    const toRate = EXCHANGE_RATES[to] || 1;
    // Convert to USD first (From / Rate), then to Target (USD * Rate)
    // Formula: (1 / fromRate) * toRate
    return toRate / fromRate;
};
const convertAmount = (amount, from, to)=>{
    if (from === to) return amount;
    const rate = getExchangeRate(from, to);
    return amount * rate;
};
const formatCurrency = (amount, currency, locale = 'en-US')=>{
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0
    }).format(amount);
};
const getCurrencySymbol = (currency)=>{
    return SUPPORTED_CURRENCIES.find((c)=>c.code === currency)?.symbol || '$';
};
}),
"[project]/src/features/dashboard/hooks/useNetWorth.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useNetWorth",
    ()=>useNetWorth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/hooks/useAssetsQuery.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilitiesQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/liabilities/hooks/useLiabilitiesQuery.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currencyService.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
function useNetWorth() {
    const { assets, isLoading: assetsLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAssetsQuery"])();
    const { liabilities, isLoading: liabilitiesLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilitiesQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLiabilitiesQuery"])();
    const { profile, isDemoMode } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProfile"])();
    const [baseCurrency, setBaseCurrency] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('USD');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (profile?.currency_code) {
            setBaseCurrency(profile.currency_code);
        } else {
            // Only access localStorage on the client after mount
            const settings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadSettings"])();
            setBaseCurrency(settings.baseCurrency);
        }
    }, [
        profile
    ]);
    const metrics = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        // Calculate Totals (USD) - Standardized Intermediate
        const totalAssetsUSD = assets.reduce((sum, a)=>{
            return sum + (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(a.value, a.currency || 'USD', 'USD');
        }, 0);
        const totalLiabilitiesUSD = liabilities.reduce((sum, l)=>{
            const converted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(l.balance, l.currency || 'USD', 'USD');
            return sum + converted;
        }, 0);
        const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;
        // Calculate Totals (Base Currency) - Display
        const totalAssetsBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(totalAssetsUSD, 'USD', baseCurrency);
        const totalLiabilitiesBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(totalLiabilitiesUSD, 'USD', baseCurrency);
        const netWorthBase = totalAssetsBase - totalLiabilitiesBase;
        return {
            assets: totalAssetsBase,
            liabilities: totalLiabilitiesBase,
            netWorth: netWorthBase,
            assetsUSD: totalAssetsUSD,
            liabilitiesUSD: totalLiabilitiesUSD,
            netWorthUSD: netWorthUSD,
            baseCurrency
        };
    }, [
        assets,
        liabilities,
        baseCurrency
    ]);
    return {
        ...metrics,
        isLoading: assetsLoading || liabilitiesLoading
    };
}
}),
"[project]/src/components/charts/NetWorthChart.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NetWorthChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/AreaChart.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/Area.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/XAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/YAxis.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/cartesian/CartesianGrid.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/hooks/useNetWorth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currencyService.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
function NetWorthChart({ data, timeRange }) {
    const { baseCurrency } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useNetWorth"])();
    const filteredData = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        let relevantData = data;
        if (timeRange !== 'all') {
            const now = new Date();
            const monthsBack = timeRange === '6m' ? 6 : 12;
            const cutoff = new Date(now.setMonth(now.getMonth() - monthsBack));
            relevantData = data.filter((d)=>new Date(d.date) >= cutoff);
        }
        // Convert data to base currency
        // Assuming history snapshots are stored in USD (or we treat them as such for normalization)
        return relevantData.map((d)=>({
                ...d,
                netWorth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(d.netWorth, 'USD', baseCurrency),
                totalAssets: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(d.totalAssets, 'USD', baseCurrency),
                totalLiabilities: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(d.totalLiabilities, 'USD', baseCurrency)
            }));
    }, [
        data,
        timeRange,
        baseCurrency
    ]);
    const formatCurrencyAxis = (value)=>{
        // Use custom compact format but respecting currency symbol
        // formatCurrency returns full string, we stick to compact for axis
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(value, baseCurrency, {
            notation: 'compact',
            maximumFractionDigits: 1
        });
    };
    const formatDate = (dateStr)=>{
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit'
        });
    };
    if (data.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "h-full flex flex-col items-center justify-center text-slate-400",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "font-semibold",
                    children: "No history yet"
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 56,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm",
                    children: "Your net worth snapshots will appear here over time."
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 57,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/charts/NetWorthChart.tsx",
            lineNumber: 55,
            columnNumber: 13
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full h-full",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$AreaChart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AreaChart"], {
            width: 800,
            height: 350,
            data: filteredData,
            margin: {
                top: 10,
                right: 10,
                left: 0,
                bottom: 0
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                            id: "colorNetWorth",
                            x1: "0",
                            y1: "0",
                            x2: "0",
                            y2: "1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "5%",
                                    stopColor: "#2563eb",
                                    stopOpacity: 0.3
                                }, void 0, false, {
                                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                                    lineNumber: 72,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "95%",
                                    stopColor: "#2563eb",
                                    stopOpacity: 0
                                }, void 0, false, {
                                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                                    lineNumber: 73,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                            lineNumber: 71,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                            id: "colorLiabilities",
                            x1: "0",
                            y1: "0",
                            x2: "0",
                            y2: "1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "5%",
                                    stopColor: "#e11d48",
                                    stopOpacity: 0.3
                                }, void 0, false, {
                                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                                    lineNumber: 76,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "95%",
                                    stopColor: "#e11d48",
                                    stopOpacity: 0
                                }, void 0, false, {
                                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                                    lineNumber: 77,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                            lineNumber: 75,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 70,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$CartesianGrid$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CartesianGrid"], {
                    strokeDasharray: "3 3",
                    vertical: false,
                    className: "stroke-border"
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 80,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$XAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["XAxis"], {
                    dataKey: "date",
                    tickFormatter: formatDate,
                    className: "text-muted-foreground",
                    tick: {
                        fill: 'var(--muted-foreground)',
                        fontSize: 12
                    },
                    axisLine: false,
                    tickLine: false
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 81,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$YAxis$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YAxis"], {
                    tickFormatter: formatCurrencyAxis,
                    className: "text-muted-foreground",
                    tick: {
                        fill: 'var(--muted-foreground)',
                        fontSize: 12
                    },
                    axisLine: false,
                    tickLine: false
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 89,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Tooltip"], {
                    contentStyle: {
                        backgroundColor: 'var(--card)',
                        color: 'var(--card-foreground)',
                        borderRadius: '12px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    },
                    formatter: (value, name)=>{
                        const num = Number(value);
                        const label = name === 'netWorth' ? 'Net Worth' : 'Total Debt';
                        return [
                            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(num, baseCurrency),
                            label
                        ];
                    },
                    labelFormatter: formatDate,
                    labelStyle: {
                        color: 'var(--muted-foreground)',
                        marginBottom: '4px',
                        fontSize: '12px'
                    }
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 96,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Area"], {
                    type: "monotone",
                    dataKey: "totalLiabilities",
                    stroke: "#e11d48",
                    fill: "url(#colorLiabilities)",
                    fillOpacity: 1,
                    strokeWidth: 2,
                    stackId: "1"
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 112,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$cartesian$2f$Area$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Area"], {
                    type: "monotone",
                    dataKey: "netWorth",
                    stroke: "#2563eb",
                    fill: "url(#colorNetWorth)",
                    fillOpacity: 1,
                    strokeWidth: 2,
                    stackId: "2"
                }, void 0, false, {
                    fileName: "[project]/src/components/charts/NetWorthChart.tsx",
                    lineNumber: 121,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/charts/NetWorthChart.tsx",
            lineNumber: 64,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/charts/NetWorthChart.tsx",
        lineNumber: 63,
        columnNumber: 9
    }, this);
}
}),
"[project]/src/features/dashboard/modals/HistoryEditor.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>HistoryEditor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-dom.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-ssr] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/plus.js [app-ssr] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-ssr] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wand$2d$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wand2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wand-sparkles.js [app-ssr] (ecmascript) <export default as Wand2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/hooks/useNetWorth.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currencyService.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
function HistoryEditor({ isOpen, onClose, onSave }) {
    const { baseCurrency } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useNetWorth"])();
    const [history, setHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    // New Entry State
    const [newDate, setNewDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [newAssets, setNewAssets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [newLiabilities, setNewLiabilities] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    // Error and saving state for user-facing feedback and input retention (Milestone 0)
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isSaving, setIsSaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (isOpen) {
            setError(null);
            // Load and sort desc by date
            const loaded = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadNetWorthHistory"])();
            setHistory(loaded.sort((a, b)=>new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
    }, [
        isOpen
    ]);
    /**
     * Handles adding a new historical snapshot.
     * 
     * Why this exists:
     * Allows backfilling or manually recording net worth snapshots.
     * 
     * Tricky logic:
     * In accordance with honest persistence rules (Milestone 0):
     * 1. Attempt persistence to SQLite first.
     * 2. Only on HTTP 200 / success: update displayed history list, clear form fields, and notify parent via onSave().
     * 3. On failure: retain form inputs (newDate, newAssets, newLiabilities) and the existing history list,
     *    display an actionable error message, and do NOT invoke onSave().
     * 
     * TODO: Support importing CSV historical series directly from bank exports.
     */ const handleAdd = async ()=>{
        if (!newDate || !newAssets || isSaving) return;
        setError(null);
        setIsSaving(true);
        const assetsBase = parseFloat(newAssets);
        const liabilitiesBase = parseFloat(newLiabilities || '0');
        // Snapshots in DB are assumed USD base for normalization (or convert to USD)
        const assetsUSD = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(assetsBase, baseCurrency, 'USD');
        const liabilitiesUSD = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(liabilitiesBase, baseCurrency, 'USD');
        const newEntry = {
            id: crypto.randomUUID(),
            date: newDate,
            totalAssets: Math.round(assetsUSD),
            totalLiabilities: Math.round(liabilitiesUSD),
            netWorth: Math.round(assetsUSD - liabilitiesUSD)
        };
        try {
            /**
             * Why this exists:
             * Persists the history entry to SQLite via scoped save.
             * 
             * Tricky logic:
             * Capture and use the authoritative `persisted` record returned by persistScopedRecord!
             * When updating an existing history date, SQLite preserves the pre-existing row's primary key `id`.
             * If we used `newEntry.id` (a newly generated ephemeral UUID), the displayed list would hold an
             * ID that does not exist in SQLite, causing a subsequent delete on that updated item to fail with
             * "Record not found".
             * 
             * TODO: Support batch editing of multiple historical snapshots simultaneously.
             */ const persisted = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["persistScopedRecord"])('history', newEntry);
            // Update confirmed displayed list only after successful persistence with authoritative persisted ID
            const updated = [
                ...history.filter((h)=>h.date !== persisted.date),
                persisted
            ].sort((a, b)=>new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistory(updated);
            // Reset form fields only on successful commit
            setNewAssets('');
            setNewLiabilities('');
            setNewDate('');
            onSave();
        } catch (err) {
            console.error('Failed to persist history snapshot to SQLite:', err);
            setError(err.message || 'Failed to save snapshot to local database. Your input has been preserved.');
        } finally{
            setIsSaving(false);
        }
    };
    /**
     * Handles deleting a historical snapshot.
     * 
     * Why this exists:
     * Allows removing erroneous or duplicate snapshots.
     * 
     * Tricky logic:
     * Delete from SQLite first. If deletion fails, keep the displayed list intact,
     * show an actionable error message, and do not call onSave().
     * 
     * TODO: Add undo toast support for deleted snapshots.
     */ const handleDelete = async (dateToDelete)=>{
        if (isSaving) return;
        setError(null);
        setIsSaving(true);
        const itemToDelete = history.find((h)=>h.date === dateToDelete);
        try {
            if (itemToDelete?.id) {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteScopedRecord"])('history', itemToDelete.id);
            } else {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deleteScopedRecord"])('history', dateToDelete);
            }
            // Update displayed list only after confirmed deletion
            const updated = history.filter((h)=>h.date !== dateToDelete);
            setHistory(updated);
            onSave();
        } catch (err) {
            console.error('Failed to delete history snapshot from SQLite:', err);
            setError(err.message || 'Failed to delete snapshot from local database. Record has not been removed.');
        } finally{
            setIsSaving(false);
        }
    };
    const handleGenerateMock = ()=>{
        if (confirm("This will overwrite your current history with 24 months of mock data. Continue?")) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["generateMockHistory"])();
            setHistory((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["loadNetWorthHistory"])().sort((a, b)=>new Date(b.date).getTime() - new Date(a.date).getTime()));
            onSave();
        }
    };
    if (!isOpen) return null;
    // Use a portal to render the modal at the body level to avoid z-index/stacking issues
    const modalContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-card border border-border w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-6 border-b border-border flex justify-between items-center bg-card",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "text-xl font-black text-foreground tracking-tight",
                                    children: "Manage History"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 165,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-muted-foreground",
                                    children: "Backfill or correct your net worth snapshots."
                                }, void 0, false, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 166,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                            lineNumber: 164,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: onClose,
                            className: "p-2 hover:bg-muted rounded-xl transition-all",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                size: 20,
                                className: "text-muted-foreground"
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                lineNumber: 169,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                            lineNumber: 168,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                    lineNumber: 163,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex-1 overflow-y-auto p-6 space-y-8",
                    children: [
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            role: "alert",
                            className: "p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center justify-between",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: error
                                }, void 0, false, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 178,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setError(null),
                                    className: "text-rose-500 hover:text-rose-700 ml-2 font-bold text-sm",
                                    "aria-label": "Dismiss error",
                                    children: "×"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 179,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                            lineNumber: 177,
                            columnNumber: 25
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "bg-muted/30 p-5 rounded-2xl border border-border",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                    className: "text-sm font-black text-foreground mb-4 flex items-center gap-2 uppercase tracking-widest opacity-70",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                            size: 16
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                            lineNumber: 192,
                                            columnNumber: 29
                                        }, this),
                                        " Add Snapshot"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 191,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-1 md:grid-cols-4 gap-4 items-end",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider",
                                                    children: "Date"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 196,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "date",
                                                    value: newDate,
                                                    onChange: (e)=>setNewDate(e.target.value),
                                                    className: "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 197,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                            lineNumber: 195,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider",
                                                    children: [
                                                        "Total Assets (",
                                                        baseCurrency,
                                                        ")"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 205,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    placeholder: "0",
                                                    value: newAssets,
                                                    onChange: (e)=>setNewAssets(e.target.value),
                                                    className: "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 206,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                            lineNumber: 204,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block text-xs font-black text-muted-foreground mb-1.5 uppercase tracking-wider",
                                                    children: [
                                                        "Total Debt (",
                                                        baseCurrency,
                                                        ")"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 215,
                                                    columnNumber: 33
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    placeholder: "0",
                                                    value: newLiabilities,
                                                    onChange: (e)=>setNewLiabilities(e.target.value),
                                                    className: "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 216,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                            lineNumber: 214,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleAdd,
                                            disabled: !newDate || !newAssets || isSaving,
                                            className: "bg-primary text-primary-foreground font-black py-2.5 px-6 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all text-sm uppercase tracking-wider active:scale-95 shadow-lg shadow-black/5",
                                            children: isSaving ? 'Saving...' : 'Add'
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                            lineNumber: 224,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 194,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                            lineNumber: 190,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-center mb-4",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-black text-foreground uppercase tracking-widest opacity-70",
                                            children: "History Log"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                            lineNumber: 237,
                                            columnNumber: 29
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: handleGenerateMock,
                                            className: "text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 bg-indigo-50/50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-all border border-indigo-100 uppercase tracking-wider",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wand$2d$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Wand2$3e$__["Wand2"], {
                                                    size: 12
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 242,
                                                    columnNumber: 33
                                                }, this),
                                                " Generate Mock Data"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                            lineNumber: 238,
                                            columnNumber: 29
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 236,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "border border-border rounded-2xl overflow-hidden shadow-sm",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                        className: "w-full text-sm text-left",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                                className: "bg-muted text-[10px] uppercase text-muted-foreground font-black border-b border-border tracking-wider",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-5 py-4",
                                                            children: "Date"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                            lineNumber: 250,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-5 py-4 text-right",
                                                            children: "Assets"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                            lineNumber: 251,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-5 py-4 text-right",
                                                            children: "Liabilities"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                            lineNumber: 252,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-5 py-4 text-right",
                                                            children: "Net Worth"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                            lineNumber: 253,
                                                            columnNumber: 41
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                            className: "px-5 py-4 w-10"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                            lineNumber: 254,
                                                            columnNumber: 41
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                    lineNumber: 249,
                                                    columnNumber: 37
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                lineNumber: 248,
                                                columnNumber: 33
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                                className: "divide-y divide-border bg-card",
                                                children: [
                                                    history.map((entry)=>{
                                                        // Convert stored USD values to baseCurrency for display
                                                        const assetsBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(entry.totalAssets, 'USD', baseCurrency);
                                                        const liabilitiesBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(entry.totalLiabilities, 'USD', baseCurrency);
                                                        const netWorthBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["convertAmount"])(entry.netWorth, 'USD', baseCurrency);
                                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                            className: "hover:bg-muted/50 transition-colors group",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "px-5 py-4 font-mono text-muted-foreground tracking-tight",
                                                                    children: entry.date
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                                    lineNumber: 266,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "px-5 py-4 text-right font-black text-emerald-600",
                                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(assetsBase, baseCurrency)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                                    lineNumber: 269,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "px-5 py-4 text-right font-black text-rose-500",
                                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(liabilitiesBase, baseCurrency)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                                    lineNumber: 272,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "px-5 py-4 text-right font-black text-foreground",
                                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["formatCurrency"])(netWorthBase, baseCurrency)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                                    lineNumber: 275,
                                                                    columnNumber: 49
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                    className: "px-5 py-4 text-right",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                        onClick: ()=>handleDelete(entry.date),
                                                                        disabled: isSaving,
                                                                        "aria-label": `Delete snapshot for ${entry.date}`,
                                                                        className: "text-muted-foreground/30 hover:text-rose-500 transition-all p-1 hover:scale-110 disabled:opacity-30 disabled:pointer-events-none",
                                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                            size: 14
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                                            lineNumber: 285,
                                                                            columnNumber: 57
                                                                        }, this)
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                                        lineNumber: 279,
                                                                        columnNumber: 53
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                                    lineNumber: 278,
                                                                    columnNumber: 49
                                                                }, this)
                                                            ]
                                                        }, entry.date, true, {
                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                            lineNumber: 265,
                                                            columnNumber: 45
                                                        }, this);
                                                    }),
                                                    history.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                            colSpan: 5,
                                                            className: "px-4 py-8 text-center text-slate-400 italic",
                                                            children: "No history found. Add a snapshot above or generate mock data."
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                            lineNumber: 293,
                                                            columnNumber: 45
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                        lineNumber: 292,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                                lineNumber: 257,
                                                columnNumber: 33
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                        lineNumber: 247,
                                        columnNumber: 29
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                                    lineNumber: 246,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                            lineNumber: 235,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                    lineNumber: 174,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-5 border-t border-border flex justify-end bg-card",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onClose,
                        className: "px-8 py-2.5 bg-muted text-foreground font-black rounded-xl hover:bg-border transition-all text-sm uppercase tracking-wider active:scale-95",
                        children: "Done"
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                        lineNumber: 307,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
                    lineNumber: 306,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
            lineNumber: 160,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/features/dashboard/modals/HistoryEditor.tsx",
        lineNumber: 159,
        columnNumber: 9
    }, this);
    if (typeof document === 'undefined') return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$dom$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createPortal"])(modalContent, document.body);
}
}),
"[project]/src/infrastructure/LocalStorageService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * LocalStorageService
 * 
 * DataService implementation for localStorage.
 * Used in Demo Mode (local device storage).
 */ __turbopack_context__.s([
    "LocalStorageService",
    ()=>LocalStorageService
]);
const STORAGE_KEYS = {
    assets: 'opennetworth_assets',
    liabilities: 'opennetworth_liabilities',
    goals: 'opennetworth_goals',
    recurring: 'opennetworth_recurring',
    history: 'opennetworth_nw_history',
    cashFlow: 'opennetworth_cash_flow'
};
class LocalStorageService {
    storageKey;
    legacyKey;
    constructor(entityType){
        this.storageKey = STORAGE_KEYS[entityType];
        this.legacyKey = this.storageKey.replace('opennetworth_', 'clearworth_');
    }
    async getAll() {
        if ("TURBOPACK compile-time truthy", 1) return [];
        //TURBOPACK unreachable
        ;
        let item;
    }
    async create(item) {
        const items = await this.getAll();
        items.push(item);
        this.save(items);
        return item;
    }
    async update(item) {
        const items = await this.getAll();
        const index = items.findIndex((i)=>i.id === item.id);
        if (index !== -1) {
            items[index] = item;
            this.save(items);
        }
        return item;
    }
    async delete(id) {
        const items = await this.getAll();
        const filtered = items.filter((i)=>i.id !== id);
        this.save(filtered);
    }
    save(items) {
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
        const str = undefined;
    }
}
}),
"[project]/src/infrastructure/DataService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * DataService Interface
 * 
 * Abstract interface for data access operations.
 * Implementations handle localStorage or Supabase storage.
 */ /**
 * Generic CRUD operations for a data entity.
 * @template T - The entity type
 */ __turbopack_context__.s([
    "COMMON_FIELD_MAPPINGS",
    ()=>COMMON_FIELD_MAPPINGS,
    "toCamelCase",
    ()=>toCamelCase,
    "toSnakeCase",
    ()=>toSnakeCase
]);
const COMMON_FIELD_MAPPINGS = [
    {
        camelCase: 'lastUpdated',
        snakeCase: 'last_updated'
    },
    {
        camelCase: 'createdAt',
        snakeCase: 'created_at'
    },
    {
        camelCase: 'userId',
        snakeCase: 'user_id'
    },
    {
        camelCase: 'isLiquid',
        snakeCase: 'is_liquid'
    },
    {
        camelCase: 'interestRate',
        snakeCase: 'interest_rate'
    },
    {
        camelCase: 'minimumPayment',
        snakeCase: 'minimum_payment'
    },
    {
        camelCase: 'isGoodDebt',
        snakeCase: 'is_good_debt'
    },
    {
        camelCase: 'investmentDetails',
        snakeCase: 'investment_details'
    }
];
function toSnakeCase(obj, extraMappings = []) {
    const mappings = [
        ...COMMON_FIELD_MAPPINGS,
        ...extraMappings
    ];
    const result = {};
    for (const [key, value] of Object.entries(obj)){
        const mapping = mappings.find((m)=>m.camelCase === key);
        const dbKey = mapping ? mapping.snakeCase : key;
        result[dbKey] = value;
    }
    return result;
}
function toCamelCase(obj, extraMappings = []) {
    const mappings = [
        ...COMMON_FIELD_MAPPINGS,
        ...extraMappings
    ];
    const result = {};
    for (const [key, value] of Object.entries(obj)){
        const mapping = mappings.find((m)=>m.snakeCase === key);
        const camelKey = mapping ? mapping.camelCase : key;
        result[camelKey] = value;
    }
    return result;
}
}),
"[project]/src/infrastructure/SupabaseService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SupabaseService",
    ()=>SupabaseService
]);
/**
 * SupabaseService
 * 
 * DataService implementation for Supabase.
 * Used when viewing template profiles or authenticated user data.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/DataService.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-ssr] (ecmascript)");
;
;
/**
 * Entity-specific field mappings (beyond common ones).
 */ const ENTITY_MAPPINGS = {
    assets: [
        {
            camelCase: 'investment',
            snakeCase: 'investment_details'
        }
    ],
    goals: [],
    recurring_transactions: [],
    liabilities: []
};
class SupabaseService {
    // TUTORIAL: We use a generic class <T> here so this single service can handle ANY entity type
    // (Assets, Liabilities, Goals) as long as it has an 'id'.
    // This implements the DataService interface, ensuring consistent API across the app.
    supabase;
    tableName;
    userId;
    extraMappings;
    constructor(tableName, userId){
        // TUTORIAL: The Supabase client is initialized once per service instance.
        // We use the 'createClient' utility which handles the environment variables and singleton pattern.
        this.supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createClient"])();
        this.tableName = tableName;
        this.userId = userId;
        // TUTORIAL: We look up entity-specific field mappings (like 'investment_details' -> 'investment')
        // to handle database-to-frontend variable naming differences automatically.
        this.extraMappings = ENTITY_MAPPINGS[tableName] || [];
    }
    async getAll() {
        // TUTORIAL: RLS (Row Level Security) on the database side ensures this query
        // only returns rows belonging to 'this.userId', providing a second layer of security
        // even if we forgot the .eq('user_id', ...) clause (though we include it for clarity).
        const { data, error } = await this.supabase.from(this.tableName).select('*').eq('user_id', this.userId);
        if (error) {
            console.error(`SupabaseService.getAll(${this.tableName}):`, error);
            return [];
        }
        // TUTORIAL: We transform snake_case database columns (e.g., 'created_at') to
        // camelCase frontend properties (e.g., 'createdAt') before returning data to the UI.
        return (data || []).map((row)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toCamelCase"])(row, this.extraMappings));
    }
    async create(item) {
        // TUTORIAL: Reverse transformation! We convert frontend camelCase back to snake_case
        // before sending to the database.
        const dbItem = {
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toSnakeCase"])(item, this.extraMappings),
            user_id: this.userId,
            last_updated: new Date().toISOString()
        };
        const { error } = await this.supabase.from(this.tableName).insert(dbItem);
        if (error) {
            console.error(`SupabaseService.create(${this.tableName}):`, error);
            throw new Error(error.message);
        }
        return item;
    }
    async update(item) {
        const snakeCased = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["toSnakeCase"])(item, this.extraMappings);
        const dbItem = {
            ...snakeCased,
            last_updated: new Date().toISOString()
        };
        // TUTORIAL: Security best practice - never trust the client to send the correct user_id
        // for an update. We strip it out to prevent accidental (or malicious) ownership changes.
        // RLS will block updates if the record doesn't belong to the user anyway.
        delete dbItem.user_id;
        const { error } = await this.supabase.from(this.tableName).update(dbItem).eq('id', item.id);
        if (error) {
            console.error(`SupabaseService.update(${this.tableName}):`, error);
            throw new Error(error.message);
        }
        return item;
    }
    async delete(id) {
        const { error } = await this.supabase.from(this.tableName).delete().eq('id', id);
        if (error) {
            console.error(`SupabaseService.delete(${this.tableName}):`, error);
            throw new Error(error.message);
        }
    }
}
}),
"[project]/src/infrastructure/SqliteDataService.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * SqliteDataService
 * 
 * Why this exists:
 * Authoritative DataService connecting OpenNetWorth components directly to the local SQLite database.
 * Uses scoped single-record operations (DATA-05) and enforces durable persistence acknowledgment (DATA-02, DATA-03).
 */ __turbopack_context__.s([
    "SqliteDataService",
    ()=>SqliteDataService
]);
class SqliteDataService {
    entityName;
    constructor(entityName){
        this.entityName = entityName;
    }
    async getAll() {
        if ("TURBOPACK compile-time truthy", 1) return [];
        //TURBOPACK unreachable
        ;
    }
    async getById(id) {
        const items = await this.getAll();
        return items.find((i)=>i.id === id) || null;
    }
    async create(item) {
        // Scoped atomic persistence to SQLite (DATA-02, DATA-04, DATA-05)
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: this.entityName,
                item
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(()=>({
                    error: 'Durable save failed'
                }));
            throw new Error(err.error || `Failed to save ${this.entityName} to database`);
        }
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        return item;
    }
    async update(item) {
        // Scoped atomic update to SQLite (DATA-02, DATA-05)
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'scoped_save',
                entity: this.entityName,
                item
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(()=>({
                    error: 'Durable update failed'
                }));
            throw new Error(err.error || `Failed to update ${this.entityName} in database`);
        }
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        return item;
    }
    async delete(id) {
        // Scoped atomic delete from SQLite (DATA-05)
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'scoped_delete',
                entity: this.entityName,
                id
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(()=>({
                    error: 'Durable delete failed'
                }));
            throw new Error(err.error || `Failed to delete ${this.entityName} from database`);
        }
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
    }
}
}),
"[project]/src/infrastructure/dataFactory.ts [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * Data Service Factory
 * 
 * Returns the appropriate DataService implementation based on mode.
 */ __turbopack_context__.s([
    "getDataService",
    ()=>getDataService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$LocalStorageService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/LocalStorageService.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$SupabaseService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/SupabaseService.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$SqliteDataService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/SqliteDataService.ts [app-ssr] (ecmascript)");
;
;
/**
 * Table name mapping for each entity type.
 */ const TABLE_NAMES = {
    assets: 'assets',
    liabilities: 'liabilities',
    goals: 'goals',
    recurring: 'recurring_transactions',
    history: 'net_worth_history',
    cashFlow: 'cash_flow_history'
};
function getDataService(entityType, isDemoMode, userId) {
    const tableName = TABLE_NAMES[entityType];
    // If explicit Supabase credentials and remote template are specified, support fallback
    if (isDemoMode && userId && ("TURBOPACK compile-time value", "https://yewqrleefomsdurnulvq.supabase.co")) {
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$SupabaseService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SupabaseService"](tableName, userId);
    } else {
        // Default local-first SQLite / Local Vault mode
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$LocalStorageService$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LocalStorageService"](entityType);
    }
}
;
;
;
}),
"[project]/src/hooks/useHistory.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useHistory",
    ()=>useHistory
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$dataFactory$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/infrastructure/dataFactory.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-ssr] (ecmascript)");
/**
 * useHistory Hook
 * 
 * Domain hook for net worth history.
 * Uses DataService abstraction for storage.
 */ 'use client';
;
;
;
function useHistory() {
    const { isDemoMode, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    const [history, setHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    const service = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$dataFactory$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getDataService"])('history', isDemoMode, templateId), [
        isDemoMode,
        templateId
    ]);
    const loadHistory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async ()=>{
        setIsLoading(true);
        try {
            const data = await service.getAll();
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally{
            setIsLoading(false);
        }
    }, [
        service
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        loadHistory();
    }, [
        loadHistory
    ]);
    const addSnapshot = async (item)=>{
        try {
            await service.create(item);
            setHistory((prev)=>[
                    ...prev,
                    item
                ]);
        } catch (error) {
            console.error('Failed to add snapshot:', error);
            throw error;
        }
    };
    return {
        history,
        isLoading,
        addSnapshot,
        refreshHistory: loadHistory
    };
}
}),
"[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NetWorthChartWidget
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$widgets$2f$WidgetWrapper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/widgets/WidgetWrapper.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$NetWorthChart$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/charts/NetWorthChart.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/history.js [app-ssr] (ecmascript) <export default as History>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-ssr] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$modals$2f$HistoryEditor$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/modals/HistoryEditor.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/context/DashboardContext.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useHistory$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useHistory.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/hooks/useAssetsQuery.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
;
;
function NetWorthChartWidget() {
    // TUTORIAL: Separation of Concerns (SoC).
    // The widget doesn't know *how* to fetch data. It just asks the 'useHistory' hook.
    // This allows us to swap the data source (Supabase vs LocalStorage) without changing the UI.
    const { history: netWorthHistory, refreshHistory } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useHistory$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useHistory"])();
    const { assets } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAssetsQuery"])();
    const { isEditMode, hideWidget } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useDashboard"])();
    const [timeRange, setTimeRange] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('6m');
    const [isHistoryOpen, setIsHistoryOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // Custom Header Controls
    const HeaderControls = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                href: "/timemachine",
                className: "hidden md:flex text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors px-3 py-1.5 rounded-lg border border-amber-200 items-center gap-2",
                onClick: (e)=>e.stopPropagation(),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$history$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__History$3e$__["History"], {
                        size: 14
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                        lineNumber: 32,
                        columnNumber: 17
                    }, this),
                    "Time Machine"
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                lineNumber: 27,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: (e)=>{
                    e.stopPropagation();
                    setIsHistoryOpen(true);
                },
                className: "text-xs font-bold text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-muted",
                children: "Manage"
            }, void 0, false, {
                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                lineNumber: 35,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                value: timeRange,
                onChange: (e)=>setTimeRange(e.target.value),
                onClick: (e)=>e.stopPropagation(),
                className: "bg-muted border border-border text-xs font-bold text-foreground rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "6m",
                        children: "Last 6 Months"
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                        lineNumber: 47,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "1y",
                        children: "Last Year"
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                        lineNumber: 48,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                        value: "all",
                        children: "All Time"
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                        lineNumber: 49,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                lineNumber: 41,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
        lineNumber: 26,
        columnNumber: 9
    }, this);
    return(// TUTORIAL: Composition Pattern.
    // We wrap the chart in a generic 'WidgetWrapper' that handles common widget behaviors
    // like drag-and-drop handles, edit mode styling, and error boundaries.
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$widgets$2f$WidgetWrapper$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
        id: "chart-networth",
        title: "Net Worth History",
        isEditMode: isEditMode,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute top-4 right-4 z-10",
                children: !isEditMode && HeaderControls
            }, void 0, false, {
                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                lineNumber: 66,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "h-full pt-8",
                children: [
                    " ",
                    netWorthHistory.length === 0 && assets.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center justify-center h-full text-center p-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-blue-50 p-4 rounded-full mb-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                    size: 32,
                                    className: "text-blue-500"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                                    lineNumber: 76,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                                lineNumber: 75,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-lg font-bold text-foreground mb-1",
                                children: "Start your journey"
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                                lineNumber: 78,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-muted-foreground text-sm max-w-xs mb-4",
                                children: "Add your first asset to track your net worth."
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                                lineNumber: 79,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                    href: "/assets",
                                    className: "px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800",
                                    children: "Add Asset"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                                    lineNumber: 81,
                                    columnNumber: 29
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                                lineNumber: 80,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                        lineNumber: 74,
                        columnNumber: 21
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$charts$2f$NetWorthChart$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                        data: netWorthHistory,
                        timeRange: timeRange
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                        lineNumber: 85,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                lineNumber: 70,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$modals$2f$HistoryEditor$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                isOpen: isHistoryOpen,
                onClose: ()=>setIsHistoryOpen(false),
                onSave: refreshHistory
            }, void 0, false, {
                fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
                lineNumber: 92,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx",
        lineNumber: 58,
        columnNumber: 9
    }, this));
}
}),
];

//# sourceMappingURL=src_2a151f87._.js.map