(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/features/dashboard/widgets/WidgetWrapper.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>WidgetWrapper
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/grip-vertical.js [app-client] (ecmascript) <export default as GripVertical>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
;
;
function WidgetWrapper({ id, title, isEditMode, onRemove, children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-md",
        children: [
            (title || isEditMode) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `flex items-center justify-between p-4 border-b border-border transition-colors relative widget-drag-handle ${isEditMode ? 'bg-slate-50 cursor-move' : ''}`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: [
                            isEditMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__GripVertical$3e$__["GripVertical"], {
                                size: 16,
                                className: "text-slate-400"
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/widgets/WidgetWrapper.tsx",
                                lineNumber: 23,
                                columnNumber: 40
                            }, this),
                            title && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
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
                    isEditMode && onRemove && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: (e)=>{
                            e.stopPropagation(); // Prevent drag start
                            onRemove();
                        },
                        className: "p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-slate-400 hover:text-red-500 transition-colors cursor-pointer",
                        title: `Hide ${title || 'widget'}`,
                        "aria-label": `Hide ${title || 'widget'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
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
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 overflow-hidden relative",
                children: [
                    children,
                    isEditMode && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
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
_c = WidgetWrapper;
var _c;
__turbopack_context__.k.register(_c, "WidgetWrapper");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/hooks/useResourceQuery.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useResourceQuery",
    ()=>useResourceQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function useResourceQuery({ queryKey, repository }) {
    _s();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const { isDemoMode, profile, isLoading: profileLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    // Fetch
    const { data = [], isLoading, error } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: [
            ...queryKey,
            isDemoMode,
            templateId
        ],
        queryFn: {
            "useResourceQuery.useQuery": async ()=>{
                return await repository.getAll();
            }
        }["useResourceQuery.useQuery"],
        enabled: !profileLoading
    });
    // Create
    const addMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: {
            "useResourceQuery.useMutation[addMutation]": async (newItem)=>{
                // @ts-ignore - Supabase might return null on error, but repo handles throws
                return await repository.create(newItem);
            }
        }["useResourceQuery.useMutation[addMutation]"],
        onSuccess: {
            "useResourceQuery.useMutation[addMutation]": ()=>{
                queryClient.invalidateQueries({
                    queryKey
                });
            }
        }["useResourceQuery.useMutation[addMutation]"]
    });
    // Update
    const updateMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: {
            "useResourceQuery.useMutation[updateMutation]": async (updatedItem)=>{
                return await repository.update(updatedItem);
            }
        }["useResourceQuery.useMutation[updateMutation]"],
        onSuccess: {
            "useResourceQuery.useMutation[updateMutation]": ()=>{
                queryClient.invalidateQueries({
                    queryKey
                });
            }
        }["useResourceQuery.useMutation[updateMutation]"]
    });
    // Delete
    const deleteMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: {
            "useResourceQuery.useMutation[deleteMutation]": async (id)=>{
                await repository.delete(id);
                return id;
            }
        }["useResourceQuery.useMutation[deleteMutation]"],
        onSuccess: {
            "useResourceQuery.useMutation[deleteMutation]": ()=>{
                queryClient.invalidateQueries({
                    queryKey
                });
            }
        }["useResourceQuery.useMutation[deleteMutation]"]
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
_s(useResourceQuery, "dtXvjny5VLb51oAsfjrMCkEYT5Y=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/assets/data/repository.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LocalAssetRepository",
    ()=>LocalAssetRepository,
    "SupabaseAssetRepository",
    ()=>SupabaseAssetRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)");
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
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
        const allAssets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadAssets"])();
        // If templateId is provided (e.g. 'fam', 'grow'), filter by it.
        // If not provided (Guest), filter by 'local_user' OR null/undefined to capture manual guest entries
        const targetId = this.templateId || 'local_user';
        return allAssets.filter((a)=>a.user_id === targetId || !a.user_id && targetId === 'local_user');
    }
    async getById(id) {
        const assets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadAssets"])();
        return assets.find((a)=>a.id === id) || null;
    }
    async create(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["persistScopedRecord"])('assets', item);
    }
    async update(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["persistScopedRecord"])('assets', item);
    }
    async delete(id) {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteScopedRecord"])('assets', id);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/assets/hooks/useAssetRepository.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAssetRepository",
    ()=>useAssetRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/data/repository.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function useAssetRepository() {
    _s();
    const { isDemoMode, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useAssetRepository.useMemo[repository]": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                if (isDemoMode) {
                    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SupabaseAssetRepository"](templateId);
                } else if (profile?.id && profile.id !== 'local_user') {
                    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SupabaseAssetRepository"](profile.id);
                }
            }
            // Local Vault Mode (100% private SQLite-backed)
            return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LocalAssetRepository"]();
        }
    }["useAssetRepository.useMemo[repository]"], [
        isDemoMode,
        templateId,
        profile?.id
    ]);
    return repository;
}
_s(useAssetRepository, "GiPfG7lrFaIAZ1vNdZUEKtbnBeY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/assets/hooks/useAssetsQuery.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useAssetsQuery",
    ()=>useAssetsQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useResourceQuery.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetRepository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/hooks/useAssetRepository.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
const QUERY_KEY = [
    'assets'
];
function useAssetsQuery() {
    _s();
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetRepository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssetRepository"])();
    const { items: assets, isLoading, error, add: addAsset, update: updateAsset, del: deleteAsset, isAdding, isUpdating, isDeleting } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useResourceQuery"])({
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
_s(useAssetsQuery, "h3mtPnT/oDOFmht55PXA+2AsCg0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetRepository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssetRepository"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useResourceQuery"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/liabilities/data/repository.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "LocalLiabilityRepository",
    ()=>LocalLiabilityRepository,
    "SupabaseLiabilityRepository",
    ()=>SupabaseLiabilityRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)");
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
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
        const allItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadLiabilities"])();
        const targetId = this.templateId || 'local_user';
        return allItems.filter((l)=>l.user_id === targetId || !l.user_id && targetId === 'local_user');
    }
    async getById(id) {
        const items = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadLiabilities"])();
        return items.find((i)=>i.id === id) || null;
    }
    async create(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["persistScopedRecord"])('liabilities', item);
    }
    async update(item) {
        // Enforce durable scoped SQLite persistence (DATA-01, DATA-02, DATA-04)
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["persistScopedRecord"])('liabilities', item);
    }
    async delete(id) {
        // Enforce durable scoped SQLite deletion (DATA-04, DATA-05)
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteScopedRecord"])('liabilities', id);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/liabilities/hooks/useLiabilityRepository.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLiabilityRepository",
    ()=>useLiabilityRepository
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/liabilities/data/repository.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function useLiabilityRepository() {
    _s();
    const { isDemoMode, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useLiabilityRepository.useMemo[repository]": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                if (isDemoMode) {
                    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SupabaseLiabilityRepository"](templateId);
                } else if (profile?.id && profile.id !== 'local_user') {
                    return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SupabaseLiabilityRepository"](profile.id);
                }
            }
            return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$data$2f$repository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LocalLiabilityRepository"](templateId);
        }
    }["useLiabilityRepository.useMemo[repository]"], [
        isDemoMode,
        templateId,
        profile?.id
    ]);
    return repository;
}
_s(useLiabilityRepository, "GiPfG7lrFaIAZ1vNdZUEKtbnBeY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/liabilities/hooks/useLiabilitiesQuery.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useLiabilitiesQuery",
    ()=>useLiabilitiesQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useResourceQuery.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilityRepository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/liabilities/hooks/useLiabilityRepository.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
const QUERY_KEY = [
    'liabilities'
];
function useLiabilitiesQuery() {
    _s();
    const repository = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilityRepository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiabilityRepository"])();
    const { items: liabilities, isLoading, error, add: addLiability, update: updateLiability, del: deleteLiability, isAdding, isUpdating, isDeleting } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useResourceQuery"])({
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
_s(useLiabilitiesQuery, "lYeCva6u8BIOj3nU2MTZxvgBV6c=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilityRepository$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiabilityRepository"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useResourceQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useResourceQuery"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/currencyService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/dashboard/hooks/useNetWorth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useNetWorth",
    ()=>useNetWorth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/hooks/useAssetsQuery.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilitiesQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/liabilities/hooks/useLiabilitiesQuery.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currencyService.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
function useNetWorth() {
    _s();
    const { assets, isLoading: assetsLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssetsQuery"])();
    const { liabilities, isLoading: liabilitiesLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilitiesQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiabilitiesQuery"])();
    const { profile, isDemoMode } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"])();
    const [baseCurrency, setBaseCurrency] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('USD');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useNetWorth.useEffect": ()=>{
            if (profile?.currency_code) {
                setBaseCurrency(profile.currency_code);
            } else {
                // Only access localStorage on the client after mount
                const settings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadSettings"])();
                setBaseCurrency(settings.baseCurrency);
            }
        }
    }["useNetWorth.useEffect"], [
        profile
    ]);
    const metrics = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useNetWorth.useMemo[metrics]": ()=>{
            // Calculate Totals (USD) - Standardized Intermediate
            const totalAssetsUSD = assets.reduce({
                "useNetWorth.useMemo[metrics].totalAssetsUSD": (sum, a)=>{
                    return sum + (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertAmount"])(a.value, a.currency || 'USD', 'USD');
                }
            }["useNetWorth.useMemo[metrics].totalAssetsUSD"], 0);
            const totalLiabilitiesUSD = liabilities.reduce({
                "useNetWorth.useMemo[metrics].totalLiabilitiesUSD": (sum, l)=>{
                    const converted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertAmount"])(l.balance, l.currency || 'USD', 'USD');
                    return sum + converted;
                }
            }["useNetWorth.useMemo[metrics].totalLiabilitiesUSD"], 0);
            const netWorthUSD = totalAssetsUSD - totalLiabilitiesUSD;
            // Calculate Totals (Base Currency) - Display
            const totalAssetsBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertAmount"])(totalAssetsUSD, 'USD', baseCurrency);
            const totalLiabilitiesBase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertAmount"])(totalLiabilitiesUSD, 'USD', baseCurrency);
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
        }
    }["useNetWorth.useMemo[metrics]"], [
        assets,
        liabilities,
        baseCurrency
    ]);
    return {
        ...metrics,
        isLoading: assetsLoading || liabilitiesLoading
    };
}
_s(useNetWorth, "f1W6Vo0HIjAIkoYKHlZdQtvE2r0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssetsQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$liabilities$2f$hooks$2f$useLiabilitiesQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useLiabilitiesQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/assets/components/AssetAllocationChart.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AssetAllocationChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/chart/PieChart.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/polar/Pie.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Cell.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Tooltip.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/Legend.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/recharts/es6/component/ResponsiveContainer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/hooks/useNetWorth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currencyService.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function AssetAllocationChart({ assets }) {
    _s();
    const { baseCurrency } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNetWorth"])();
    // Why: Recharts' ResponsiveContainer uses ResizeObserver which fires during the
    // synchronous render pass — before the flex parent has resolved its layout.
    // At that point the container reports width=-1, height=-1, which triggers the warning.
    // Fix: hold off rendering the chart until after useEffect (post-DOM-paint),
    // when the browser has completed layout and ResizeObserver gets real dimensions.
    const [isMounted, setIsMounted] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AssetAllocationChart.useEffect": ()=>{
            setIsMounted(true);
        }
    }["AssetAllocationChart.useEffect"], []);
    // 1. Group assets by type and sum values (converted to base currency)
    const dataByType = assets.reduce((acc, asset)=>{
        const type = asset.type;
        const val = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["convertAmount"])(asset.value, asset.currency || 'USD', baseCurrency);
        acc[type] = (acc[type] || 0) + val;
        return acc;
    }, {});
    // 2. Format for Recharts
    const data = Object.entries(dataByType).map(([name, value])=>({
            name: name.replace('_', ' ').replace(/\b\w/g, (c)=>c.toUpperCase()),
            value
        })).filter((item)=>item.value > 0) // Hide empty categories
    .sort((a, b)=>b.value - a.value); // Sort biggest to smallest
    // 3. Define colors per asset category
    const COLORS = {
        'Cash': '#3b82f6',
        'Investment': '#10b981',
        'Real Estate': '#f59e0b',
        'Crypto': '#8b5cf6',
        'Vehicle': '#64748b',
        'Other': '#94a3b8' // slate-400
    };
    const DEFAULT_COLOR = '#cbd5e1';
    if (assets.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "h-full flex items-center justify-center text-slate-400 text-sm",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                children: "No assets to display."
            }, void 0, false, {
                fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
                lineNumber: 56,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
            lineNumber: 55,
            columnNumber: 13
        }, this);
    }
    return(// Render a same-height placeholder on the first paint (SSR + sync render pass).
    // The chart only mounts after useEffect, when the DOM is laid out and
    // ResizeObserver can read real pixel dimensions instead of -1.
    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "w-full h-full",
        style: {
            minHeight: 240
        },
        children: isMounted ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$ResponsiveContainer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ResponsiveContainer"], {
            width: "100%",
            height: "100%",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$chart$2f$PieChart$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PieChart"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$polar$2f$Pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Pie"], {
                        data: data,
                        cx: "50%",
                        cy: "50%",
                        innerRadius: "60%",
                        outerRadius: "80%",
                        paddingAngle: 5,
                        dataKey: "value",
                        children: data.map((entry, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Cell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Cell"], {
                                fill: COLORS[entry.name] || DEFAULT_COLOR
                            }, `cell-${index}`, false, {
                                fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
                                lineNumber: 79,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
                        lineNumber: 69,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Tooltip$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
                        formatter: (value)=>[
                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(Number(value || 0), baseCurrency),
                                'Value'
                            ],
                        contentStyle: {
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
                        lineNumber: 82,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$recharts$2f$es6$2f$component$2f$Legend$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Legend"], {
                        layout: "vertical",
                        verticalAlign: "middle",
                        align: "right",
                        wrapperStyle: {
                            fontSize: '12px',
                            fontWeight: 500
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
                        lineNumber: 86,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
                lineNumber: 68,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
            lineNumber: 67,
            columnNumber: 13
        }, this) : null
    }, void 0, false, {
        fileName: "[project]/src/features/assets/components/AssetAllocationChart.tsx",
        lineNumber: 65,
        columnNumber: 9
    }, this));
}
_s(AssetAllocationChart, "GlGhrviQQ1i54Skmjw4WY2CUn/E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNetWorth"]
    ];
});
_c = AssetAllocationChart;
var _c;
__turbopack_context__.k.register(_c, "AssetAllocationChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/dashboard/widgets/AllocationChartWidget.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AllocationChartWidget
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$widgets$2f$WidgetWrapper$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/widgets/WidgetWrapper.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$components$2f$AssetAllocationChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/components/AssetAllocationChart.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/context/DashboardContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/assets/hooks/useAssetsQuery.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
function AllocationChartWidget() {
    _s();
    const { assets } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssetsQuery"])();
    const { isEditMode, hideWidget } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboard"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$widgets$2f$WidgetWrapper$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        id: "chart-allocation",
        title: "Asset Allocation",
        isEditMode: isEditMode,
        onRemove: ()=>hideWidget('chart-allocation'),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$components$2f$AssetAllocationChart$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            assets: assets
        }, void 0, false, {
            fileName: "[project]/src/features/dashboard/widgets/AllocationChartWidget.tsx",
            lineNumber: 18,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/features/dashboard/widgets/AllocationChartWidget.tsx",
        lineNumber: 12,
        columnNumber: 9
    }, this);
}
_s(AllocationChartWidget, "MjhTHHYSJ7BV6i42peW9jffTDdU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$assets$2f$hooks$2f$useAssetsQuery$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAssetsQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboard"]
    ];
});
_c = AllocationChartWidget;
var _c;
__turbopack_context__.k.register(_c, "AllocationChartWidget");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_3e637336._.js.map