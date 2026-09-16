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
"[project]/src/features/dashboard/components/StatCard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StatCard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-down.js [app-client] (ecmascript) <export default as TrendingDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Minus$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/minus.js [app-client] (ecmascript) <export default as Minus>");
;
;
function StatCard({ title, value, change, trend, icon, privacySensitive }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col h-full justify-between",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between items-start mb-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "text-sm font-medium text-muted-foreground",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                        lineNumber: 17,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-2 bg-muted rounded-xl",
                        children: icon
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                        lineNumber: 18,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                lineNumber: 16,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: `text-2xl font-black text-foreground tracking-tight mb-1 ${privacySensitive ? 'privacy-value' : ''}`,
                        children: value
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                        lineNumber: 24,
                        columnNumber: 17
                    }, this),
                    change ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `flex items-center text-xs font-bold gap-1 
                        ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-slate-500'}`,
                        children: [
                            trend === 'up' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                                lineNumber: 31,
                                columnNumber: 44
                            }, this),
                            trend === 'down' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingDown$3e$__["TrendingDown"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                                lineNumber: 32,
                                columnNumber: 46
                            }, this),
                            trend === 'neutral' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Minus$3e$__["Minus"], {
                                size: 14
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                                lineNumber: 33,
                                columnNumber: 49
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: change
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                                lineNumber: 34,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-muted-foreground ml-1 font-medium",
                                children: "vs prior period"
                            }, void 0, false, {
                                fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                                lineNumber: 35,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                        lineNumber: 27,
                        columnNumber: 21
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-xs text-muted-foreground font-medium flex items-center gap-1",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Not enough history"
                        }, void 0, false, {
                            fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                            lineNumber: 39,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                        lineNumber: 38,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
                lineNumber: 23,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/features/dashboard/components/StatCard.tsx",
        lineNumber: 15,
        columnNumber: 9
    }, this);
}
_c = StatCard;
var _c;
__turbopack_context__.k.register(_c, "StatCard");
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
"[project]/src/infrastructure/LocalStorageService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        let item = localStorage.getItem(this.storageKey);
        if (!item) {
            item = localStorage.getItem(this.legacyKey);
        }
        if (!item) return [];
        try {
            return JSON.parse(item);
        } catch  {
            return [];
        }
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
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        const str = JSON.stringify(items);
        localStorage.setItem(this.storageKey, str);
        localStorage.setItem(this.legacyKey, str);
        window.dispatchEvent(new Event('opennetworth_data_updated'));
        window.dispatchEvent(new Event('clearworth_data_updated'));
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/infrastructure/DataService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/infrastructure/SupabaseService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/DataService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-client] (ecmascript)");
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
        this.supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
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
        return (data || []).map((row)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toCamelCase"])(row, this.extraMappings));
    }
    async create(item) {
        // TUTORIAL: Reverse transformation! We convert frontend camelCase back to snake_case
        // before sending to the database.
        const dbItem = {
            ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toSnakeCase"])(item, this.extraMappings),
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
        const snakeCased = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$DataService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toSnakeCase"])(item, this.extraMappings);
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/infrastructure/SqliteDataService.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        try {
            const res = await fetch(`/api/vault?entity=${this.entityName}`);
            if (!res.ok) {
                const err = await res.json().catch(()=>({
                        error: 'Database read failed'
                    }));
                throw new Error(err.error || `Failed to fetch ${this.entityName}`);
            }
            const data = await res.json();
            return data.data || [];
        } catch (e) {
            console.error(`SqliteDataService getAll error for ${this.entityName}:`, e);
            return [];
        }
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
        if ("TURBOPACK compile-time truthy", 1) {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }
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
        if ("TURBOPACK compile-time truthy", 1) {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }
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
        if ("TURBOPACK compile-time truthy", 1) {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/infrastructure/dataFactory.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

/**
 * Data Service Factory
 * 
 * Returns the appropriate DataService implementation based on mode.
 */ __turbopack_context__.s([
    "getDataService",
    ()=>getDataService
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$LocalStorageService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/LocalStorageService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$SupabaseService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/SupabaseService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$SqliteDataService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/SqliteDataService.ts [app-client] (ecmascript)");
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
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$SupabaseService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SupabaseService"](tableName, userId);
    } else {
        // Default local-first SQLite / Local Vault mode
        return new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$LocalStorageService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LocalStorageService"](entityType);
    }
}
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/hooks/useHistory.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useHistory",
    ()=>useHistory
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$dataFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/src/infrastructure/dataFactory.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
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
    _s();
    const { isDemoMode, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"])();
    const templateId = isDemoMode ? profile?.id : null;
    const [history, setHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const service = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useHistory.useMemo[service]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$dataFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getDataService"])('history', isDemoMode, templateId)
    }["useHistory.useMemo[service]"], [
        isDemoMode,
        templateId
    ]);
    const loadHistory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useHistory.useCallback[loadHistory]": async ()=>{
            setIsLoading(true);
            try {
                const data = await service.getAll();
                setHistory(data);
            } catch (error) {
                console.error('Failed to load history:', error);
            } finally{
                setIsLoading(false);
            }
        }
    }["useHistory.useCallback[loadHistory]"], [
        service
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useHistory.useEffect": ()=>{
            loadHistory();
        }
    }["useHistory.useEffect"], [
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
_s(useHistory, "ux45mAGYzhPBcMMX3Xwzyu9faqU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/dashboard/widgets/StatNetWorthWidget.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>StatNetWorthWidget
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$widgets$2f$WidgetWrapper$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/widgets/WidgetWrapper.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/components/StatCard.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wallet.js [app-client] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currencyService.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/context/DashboardContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/dashboard/hooks/useNetWorth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useHistory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/hooks/useHistory.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
;
;
function StatNetWorthWidget() {
    _s();
    const { baseCurrency, netWorth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNetWorth"])();
    const { isEditMode } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboard"])();
    const { history } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useHistory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHistory"])();
    // Calculate historical comparison only when supporting history exists
    let change = undefined;
    let trend = netWorth >= 0 ? 'up' : 'down';
    if (history && history.length >= 2) {
        const previous = history[history.length - 2];
        if (previous && previous.netWorth !== 0) {
            const diff = netWorth - previous.netWorth;
            const pct = (diff / Math.abs(previous.netWorth) * 100).toFixed(1);
            change = `${diff >= 0 ? '+' : ''}${pct}%`;
            trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$widgets$2f$WidgetWrapper$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
        id: "stat-networth",
        isEditMode: isEditMode,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$components$2f$StatCard$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            title: `Total Net Worth (${baseCurrency})`,
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyService$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatCurrency"])(netWorth, baseCurrency),
            change: change,
            trend: trend,
            icon: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"], {
                className: "text-blue-600",
                size: 24
            }, void 0, false, {
                fileName: "[project]/src/features/dashboard/widgets/StatNetWorthWidget.tsx",
                lineNumber: 42,
                columnNumber: 23
            }, void 0),
            privacySensitive: true
        }, void 0, false, {
            fileName: "[project]/src/features/dashboard/widgets/StatNetWorthWidget.tsx",
            lineNumber: 37,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/features/dashboard/widgets/StatNetWorthWidget.tsx",
        lineNumber: 36,
        columnNumber: 9
    }, this);
}
_s(StatNetWorthWidget, "w+iegvlA8uDw/jtkkXLRxaQx1T8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$hooks$2f$useNetWorth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useNetWorth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$dashboard$2f$context$2f$DashboardContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboard"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$hooks$2f$useHistory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useHistory"]
    ];
});
_c = StatNetWorthWidget;
var _c;
__turbopack_context__.k.register(_c, "StatNetWorthWidget");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/lucide-react/dist/esm/icons/grip-vertical.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>GripVertical
]);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "circle",
        {
            cx: "9",
            cy: "12",
            r: "1",
            key: "1vctgf"
        }
    ],
    [
        "circle",
        {
            cx: "9",
            cy: "5",
            r: "1",
            key: "hp0tcf"
        }
    ],
    [
        "circle",
        {
            cx: "9",
            cy: "19",
            r: "1",
            key: "fkjjf6"
        }
    ],
    [
        "circle",
        {
            cx: "15",
            cy: "12",
            r: "1",
            key: "1tmaij"
        }
    ],
    [
        "circle",
        {
            cx: "15",
            cy: "5",
            r: "1",
            key: "19l28e"
        }
    ],
    [
        "circle",
        {
            cx: "15",
            cy: "19",
            r: "1",
            key: "f4zoj3"
        }
    ]
];
const GripVertical = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("grip-vertical", __iconNode);
;
 //# sourceMappingURL=grip-vertical.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/grip-vertical.js [app-client] (ecmascript) <export default as GripVertical>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GripVertical",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$grip$2d$vertical$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/grip-vertical.js [app-client] (ecmascript)");
}),
"[project]/node_modules/lucide-react/dist/esm/icons/trending-down.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>TrendingDown
]);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M16 17h6v-6",
            key: "t6n2it"
        }
    ],
    [
        "path",
        {
            d: "m22 17-8.5-8.5-5 5L2 7",
            key: "x473p"
        }
    ]
];
const TrendingDown = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("trending-down", __iconNode);
;
 //# sourceMappingURL=trending-down.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/trending-down.js [app-client] (ecmascript) <export default as TrendingDown>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TrendingDown",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-down.js [app-client] (ecmascript)");
}),
"[project]/node_modules/lucide-react/dist/esm/icons/minus.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__iconNode",
    ()=>__iconNode,
    "default",
    ()=>Minus
]);
/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/createLucideIcon.js [app-client] (ecmascript)");
;
const __iconNode = [
    [
        "path",
        {
            d: "M5 12h14",
            key: "1ays0h"
        }
    ]
];
const Minus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$createLucideIcon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])("minus", __iconNode);
;
 //# sourceMappingURL=minus.js.map
}),
"[project]/node_modules/lucide-react/dist/esm/icons/minus.js [app-client] (ecmascript) <export default as Minus>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Minus",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/minus.js [app-client] (ecmascript)");
}),
"[project]/node_modules/@tanstack/query-core/build/modern/queryObserver.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryObserver",
    ()=>QueryObserver
]);
// src/queryObserver.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$focusManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/focusManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$query$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/query.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/subscribable.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$thenable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/thenable.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/timeoutManager.js [app-client] (ecmascript)");
;
;
;
;
;
;
;
var QueryObserver = class extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    constructor(client, options){
        super();
        this.options = options;
        this.#client = client;
        this.#selectError = null;
        this.#currentThenable = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$thenable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pendingThenable"])();
        this.bindMethods();
        this.setOptions(options);
    }
    #client;
    #currentQuery = void 0;
    #currentQueryInitialState = void 0;
    #currentResult = void 0;
    #currentResultState;
    #currentResultOptions;
    #currentThenable;
    #selectError;
    #selectFn;
    #selectResult;
    // This property keeps track of the last query with defined data.
    // It will be used to pass the previous data and query to the placeholder function between renders.
    #lastQueryWithDefinedData;
    #staleTimeoutId;
    #refetchIntervalId;
    #currentRefetchInterval;
    #trackedProps = /* @__PURE__ */ new Set();
    bindMethods() {
        this.refetch = this.refetch.bind(this);
    }
    onSubscribe() {
        if (this.listeners.size === 1) {
            this.#currentQuery.addObserver(this);
            if (shouldFetchOnMount(this.#currentQuery, this.options)) {
                this.#executeFetch();
            } else {
                this.updateResult();
            }
            this.#updateTimers();
        }
    }
    onUnsubscribe() {
        if (!this.hasListeners()) {
            this.destroy();
        }
    }
    shouldFetchOnReconnect() {
        return shouldFetchOn(this.#currentQuery, this.options, this.options.refetchOnReconnect);
    }
    shouldFetchOnWindowFocus() {
        return shouldFetchOn(this.#currentQuery, this.options, this.options.refetchOnWindowFocus);
    }
    destroy() {
        this.listeners = /* @__PURE__ */ new Set();
        this.#clearStaleTimeout();
        this.#clearRefetchInterval();
        this.#currentQuery.removeObserver(this);
    }
    setOptions(options) {
        const prevOptions = this.options;
        const prevQuery = this.#currentQuery;
        this.options = this.#client.defaultQueryOptions(options);
        if (this.options.enabled !== void 0 && typeof this.options.enabled !== "boolean" && typeof this.options.enabled !== "function" && typeof (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(this.options.enabled, this.#currentQuery) !== "boolean") {
            throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");
        }
        this.#updateQuery();
        this.#currentQuery.setOptions(this.options);
        if (prevOptions._defaulted && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shallowEqualObjects"])(this.options, prevOptions)) {
            this.#client.getQueryCache().notify({
                type: "observerOptionsUpdated",
                query: this.#currentQuery,
                observer: this
            });
        }
        const mounted = this.hasListeners();
        if (mounted && shouldFetchOptionally(this.#currentQuery, prevQuery, this.options, prevOptions)) {
            this.#executeFetch();
        }
        this.updateResult();
        if (mounted && (this.#currentQuery !== prevQuery || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(this.options.enabled, this.#currentQuery) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(prevOptions.enabled, this.#currentQuery) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(this.options.staleTime, this.#currentQuery) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(prevOptions.staleTime, this.#currentQuery))) {
            this.#updateStaleTimeout();
        }
        const nextRefetchInterval = this.#computeRefetchInterval();
        if (mounted && (this.#currentQuery !== prevQuery || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(this.options.enabled, this.#currentQuery) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(prevOptions.enabled, this.#currentQuery) || nextRefetchInterval !== this.#currentRefetchInterval)) {
            this.#updateRefetchInterval(nextRefetchInterval);
        }
    }
    getOptimisticResult(options) {
        const query = this.#client.getQueryCache().build(this.#client, options);
        const result = this.createResult(query, options);
        if (shouldAssignObserverCurrentProperties(this, result)) {
            this.#currentResult = result;
            this.#currentResultOptions = this.options;
            this.#currentResultState = this.#currentQuery.state;
        }
        return result;
    }
    getCurrentResult() {
        return this.#currentResult;
    }
    trackResult(result, onPropTracked) {
        return new Proxy(result, {
            get: (target, key)=>{
                this.trackProp(key);
                onPropTracked?.(key);
                if (key === "promise") {
                    this.trackProp("data");
                    if (!this.options.experimental_prefetchInRender && this.#currentThenable.status === "pending") {
                        this.#currentThenable.reject(new Error("experimental_prefetchInRender feature flag is not enabled"));
                    }
                }
                return Reflect.get(target, key);
            }
        });
    }
    trackProp(key) {
        this.#trackedProps.add(key);
    }
    getCurrentQuery() {
        return this.#currentQuery;
    }
    refetch({ ...options } = {}) {
        return this.fetch({
            ...options
        });
    }
    fetchOptimistic(options) {
        const defaultedOptions = this.#client.defaultQueryOptions(options);
        const query = this.#client.getQueryCache().build(this.#client, defaultedOptions);
        return query.fetch().then(()=>this.createResult(query, defaultedOptions));
    }
    fetch(fetchOptions) {
        return this.#executeFetch({
            ...fetchOptions,
            cancelRefetch: fetchOptions.cancelRefetch ?? true
        }).then(()=>{
            this.updateResult();
            return this.#currentResult;
        });
    }
    #executeFetch(fetchOptions) {
        this.#updateQuery();
        let promise = this.#currentQuery.fetch(this.options, fetchOptions);
        if (!fetchOptions?.throwOnError) {
            promise = promise.catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
        }
        return promise;
    }
    #updateStaleTimeout() {
        this.#clearStaleTimeout();
        const staleTime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(this.options.staleTime, this.#currentQuery);
        if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isServer"] || this.#currentResult.isStale || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidTimeout"])(staleTime)) {
            return;
        }
        const time = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeUntilStale"])(this.#currentResult.dataUpdatedAt, staleTime);
        const timeout = time + 1;
        this.#staleTimeoutId = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeoutManager"].setTimeout(()=>{
            if (!this.#currentResult.isStale) {
                this.updateResult();
            }
        }, timeout);
    }
    #computeRefetchInterval() {
        return (typeof this.options.refetchInterval === "function" ? this.options.refetchInterval(this.#currentQuery) : this.options.refetchInterval) ?? false;
    }
    #updateRefetchInterval(nextInterval) {
        this.#clearRefetchInterval();
        this.#currentRefetchInterval = nextInterval;
        if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isServer"] || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(this.options.enabled, this.#currentQuery) === false || !(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isValidTimeout"])(this.#currentRefetchInterval) || this.#currentRefetchInterval === 0) {
            return;
        }
        this.#refetchIntervalId = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeoutManager"].setInterval(()=>{
            if (this.options.refetchIntervalInBackground || __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$focusManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["focusManager"].isFocused()) {
                this.#executeFetch();
            }
        }, this.#currentRefetchInterval);
    }
    #updateTimers() {
        this.#updateStaleTimeout();
        this.#updateRefetchInterval(this.#computeRefetchInterval());
    }
    #clearStaleTimeout() {
        if (this.#staleTimeoutId) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeoutManager"].clearTimeout(this.#staleTimeoutId);
            this.#staleTimeoutId = void 0;
        }
    }
    #clearRefetchInterval() {
        if (this.#refetchIntervalId) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$timeoutManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["timeoutManager"].clearInterval(this.#refetchIntervalId);
            this.#refetchIntervalId = void 0;
        }
    }
    createResult(query, options) {
        const prevQuery = this.#currentQuery;
        const prevOptions = this.options;
        const prevResult = this.#currentResult;
        const prevResultState = this.#currentResultState;
        const prevResultOptions = this.#currentResultOptions;
        const queryChange = query !== prevQuery;
        const queryInitialState = queryChange ? query.state : this.#currentQueryInitialState;
        const { state } = query;
        let newState = {
            ...state
        };
        let isPlaceholderData = false;
        let data;
        if (options._optimisticResults) {
            const mounted = this.hasListeners();
            const fetchOnMount = !mounted && shouldFetchOnMount(query, options);
            const fetchOptionally = mounted && shouldFetchOptionally(query, prevQuery, options, prevOptions);
            if (fetchOnMount || fetchOptionally) {
                newState = {
                    ...newState,
                    ...(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$query$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchState"])(state.data, query.options)
                };
            }
            if (options._optimisticResults === "isRestoring") {
                newState.fetchStatus = "idle";
            }
        }
        let { error, errorUpdatedAt, status } = newState;
        data = newState.data;
        let skipSelect = false;
        if (options.placeholderData !== void 0 && data === void 0 && status === "pending") {
            let placeholderData;
            if (prevResult?.isPlaceholderData && options.placeholderData === prevResultOptions?.placeholderData) {
                placeholderData = prevResult.data;
                skipSelect = true;
            } else {
                placeholderData = typeof options.placeholderData === "function" ? options.placeholderData(this.#lastQueryWithDefinedData?.state.data, this.#lastQueryWithDefinedData) : options.placeholderData;
            }
            if (placeholderData !== void 0) {
                status = "success";
                data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["replaceData"])(prevResult?.data, placeholderData, options);
                isPlaceholderData = true;
            }
        }
        if (options.select && data !== void 0 && !skipSelect) {
            if (prevResult && data === prevResultState?.data && options.select === this.#selectFn) {
                data = this.#selectResult;
            } else {
                try {
                    this.#selectFn = options.select;
                    data = options.select(data);
                    data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["replaceData"])(prevResult?.data, data, options);
                    this.#selectResult = data;
                    this.#selectError = null;
                } catch (selectError) {
                    this.#selectError = selectError;
                }
            }
        }
        if (this.#selectError) {
            error = this.#selectError;
            data = this.#selectResult;
            errorUpdatedAt = Date.now();
            status = "error";
        }
        const isFetching = newState.fetchStatus === "fetching";
        const isPending = status === "pending";
        const isError = status === "error";
        const isLoading = isPending && isFetching;
        const hasData = data !== void 0;
        const result = {
            status,
            fetchStatus: newState.fetchStatus,
            isPending,
            isSuccess: status === "success",
            isError,
            isInitialLoading: isLoading,
            isLoading,
            data,
            dataUpdatedAt: newState.dataUpdatedAt,
            error,
            errorUpdatedAt,
            failureCount: newState.fetchFailureCount,
            failureReason: newState.fetchFailureReason,
            errorUpdateCount: newState.errorUpdateCount,
            isFetched: newState.dataUpdateCount > 0 || newState.errorUpdateCount > 0,
            isFetchedAfterMount: newState.dataUpdateCount > queryInitialState.dataUpdateCount || newState.errorUpdateCount > queryInitialState.errorUpdateCount,
            isFetching,
            isRefetching: isFetching && !isPending,
            isLoadingError: isError && !hasData,
            isPaused: newState.fetchStatus === "paused",
            isPlaceholderData,
            isRefetchError: isError && hasData,
            isStale: isStale(query, options),
            refetch: this.refetch,
            promise: this.#currentThenable,
            isEnabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(options.enabled, query) !== false
        };
        const nextResult = result;
        if (this.options.experimental_prefetchInRender) {
            const hasResultData = nextResult.data !== void 0;
            const isErrorWithoutData = nextResult.status === "error" && !hasResultData;
            const finalizeThenableIfPossible = (thenable)=>{
                if (isErrorWithoutData) {
                    thenable.reject(nextResult.error);
                } else if (hasResultData) {
                    thenable.resolve(nextResult.data);
                }
            };
            const recreateThenable = ()=>{
                const pending = this.#currentThenable = nextResult.promise = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$thenable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pendingThenable"])();
                finalizeThenableIfPossible(pending);
            };
            const prevThenable = this.#currentThenable;
            switch(prevThenable.status){
                case "pending":
                    if (query.queryHash === prevQuery.queryHash) {
                        finalizeThenableIfPossible(prevThenable);
                    }
                    break;
                case "fulfilled":
                    if (isErrorWithoutData || nextResult.data !== prevThenable.value) {
                        recreateThenable();
                    }
                    break;
                case "rejected":
                    if (!isErrorWithoutData || nextResult.error !== prevThenable.reason) {
                        recreateThenable();
                    }
                    break;
            }
        }
        return nextResult;
    }
    updateResult() {
        const prevResult = this.#currentResult;
        const nextResult = this.createResult(this.#currentQuery, this.options);
        this.#currentResultState = this.#currentQuery.state;
        this.#currentResultOptions = this.options;
        if (this.#currentResultState.data !== void 0) {
            this.#lastQueryWithDefinedData = this.#currentQuery;
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shallowEqualObjects"])(nextResult, prevResult)) {
            return;
        }
        this.#currentResult = nextResult;
        const shouldNotifyListeners = ()=>{
            if (!prevResult) {
                return true;
            }
            const { notifyOnChangeProps } = this.options;
            const notifyOnChangePropsValue = typeof notifyOnChangeProps === "function" ? notifyOnChangeProps() : notifyOnChangeProps;
            if (notifyOnChangePropsValue === "all" || !notifyOnChangePropsValue && !this.#trackedProps.size) {
                return true;
            }
            const includedProps = new Set(notifyOnChangePropsValue ?? this.#trackedProps);
            if (this.options.throwOnError) {
                includedProps.add("error");
            }
            return Object.keys(this.#currentResult).some((key)=>{
                const typedKey = key;
                const changed = this.#currentResult[typedKey] !== prevResult[typedKey];
                return changed && includedProps.has(typedKey);
            });
        };
        this.#notify({
            listeners: shouldNotifyListeners()
        });
    }
    #updateQuery() {
        const query = this.#client.getQueryCache().build(this.#client, this.options);
        if (query === this.#currentQuery) {
            return;
        }
        const prevQuery = this.#currentQuery;
        this.#currentQuery = query;
        this.#currentQueryInitialState = query.state;
        if (this.hasListeners()) {
            prevQuery?.removeObserver(this);
            query.addObserver(this);
        }
    }
    onQueryUpdate() {
        this.updateResult();
        if (this.hasListeners()) {
            this.#updateTimers();
        }
    }
    #notify(notifyOptions) {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            if (notifyOptions.listeners) {
                this.listeners.forEach((listener)=>{
                    listener(this.#currentResult);
                });
            }
            this.#client.getQueryCache().notify({
                query: this.#currentQuery,
                type: "observerResultsUpdated"
            });
        });
    }
};
function shouldLoadOnMount(query, options) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(options.enabled, query) !== false && query.state.data === void 0 && !(query.state.status === "error" && options.retryOnMount === false);
}
function shouldFetchOnMount(query, options) {
    return shouldLoadOnMount(query, options) || query.state.data !== void 0 && shouldFetchOn(query, options, options.refetchOnMount);
}
function shouldFetchOn(query, options, field) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(options.enabled, query) !== false && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(options.staleTime, query) !== "static") {
        const value = typeof field === "function" ? field(query) : field;
        return value === "always" || value !== false && isStale(query, options);
    }
    return false;
}
function shouldFetchOptionally(query, prevQuery, options, prevOptions) {
    return (query !== prevQuery || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(prevOptions.enabled, query) === false) && (!options.suspense || query.state.status !== "error") && isStale(query, options);
}
function isStale(query, options) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveEnabled"])(options.enabled, query) !== false && query.isStaleByTime((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveStaleTime"])(options.staleTime, query));
}
function shouldAssignObserverCurrentProperties(observer, optimisticResult) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shallowEqualObjects"])(observer.getCurrentResult(), optimisticResult)) {
        return true;
    }
    return false;
}
;
 //# sourceMappingURL=queryObserver.js.map
}),
"[project]/node_modules/@tanstack/react-query/build/modern/QueryErrorResetBoundary.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "QueryErrorResetBoundary",
    ()=>QueryErrorResetBoundary,
    "useQueryErrorResetBoundary",
    ()=>useQueryErrorResetBoundary
]);
// src/QueryErrorResetBoundary.tsx
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
"use client";
;
;
function createValue() {
    let isReset = false;
    return {
        clearReset: ()=>{
            isReset = false;
        },
        reset: ()=>{
            isReset = true;
        },
        isReset: ()=>{
            return isReset;
        }
    };
}
var QueryErrorResetBoundaryContext = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](createValue());
var useQueryErrorResetBoundary = ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](QueryErrorResetBoundaryContext);
var QueryErrorResetBoundary = ({ children })=>{
    const [value] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        "QueryErrorResetBoundary.useState": ()=>createValue()
    }["QueryErrorResetBoundary.useState"]);
    return /* @__PURE__ */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(QueryErrorResetBoundaryContext.Provider, {
        value,
        children: typeof children === "function" ? children(value) : children
    });
};
;
 //# sourceMappingURL=QueryErrorResetBoundary.js.map
}),
"[project]/node_modules/@tanstack/react-query/build/modern/errorBoundaryUtils.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ensurePreventErrorBoundaryRetry",
    ()=>ensurePreventErrorBoundaryRetry,
    "getHasError",
    ()=>getHasError,
    "useClearResetErrorBoundary",
    ()=>useClearResetErrorBoundary
]);
// src/errorBoundaryUtils.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
"use client";
;
;
var ensurePreventErrorBoundaryRetry = (options, errorResetBoundary, query)=>{
    const throwOnError = query?.state.error && typeof options.throwOnError === "function" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shouldThrowError"])(options.throwOnError, [
        query.state.error,
        query
    ]) : options.throwOnError;
    if (options.suspense || options.experimental_prefetchInRender || throwOnError) {
        if (!errorResetBoundary.isReset()) {
            options.retryOnMount = false;
        }
    }
};
var useClearResetErrorBoundary = (errorResetBoundary)=>{
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useClearResetErrorBoundary.useEffect": ()=>{
            errorResetBoundary.clearReset();
        }
    }["useClearResetErrorBoundary.useEffect"], [
        errorResetBoundary
    ]);
};
var getHasError = ({ result, errorResetBoundary, throwOnError, query, suspense })=>{
    return result.isError && !errorResetBoundary.isReset() && !result.isFetching && query && (suspense && result.data === void 0 || (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shouldThrowError"])(throwOnError, [
        result.error,
        query
    ]));
};
;
 //# sourceMappingURL=errorBoundaryUtils.js.map
}),
"[project]/node_modules/@tanstack/react-query/build/modern/IsRestoringProvider.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "IsRestoringProvider",
    ()=>IsRestoringProvider,
    "useIsRestoring",
    ()=>useIsRestoring
]);
// src/IsRestoringProvider.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
"use client";
;
var IsRestoringContext = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](false);
var useIsRestoring = ()=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](IsRestoringContext);
var IsRestoringProvider = IsRestoringContext.Provider;
;
 //# sourceMappingURL=IsRestoringProvider.js.map
}),
"[project]/node_modules/@tanstack/react-query/build/modern/suspense.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "defaultThrowOnError",
    ()=>defaultThrowOnError,
    "ensureSuspenseTimers",
    ()=>ensureSuspenseTimers,
    "fetchOptimistic",
    ()=>fetchOptimistic,
    "shouldSuspend",
    ()=>shouldSuspend,
    "willFetch",
    ()=>willFetch
]);
// src/suspense.ts
var defaultThrowOnError = (_error, query)=>query.state.data === void 0;
var ensureSuspenseTimers = (defaultedOptions)=>{
    if (defaultedOptions.suspense) {
        const MIN_SUSPENSE_TIME_MS = 1e3;
        const clamp = (value)=>value === "static" ? value : Math.max(value ?? MIN_SUSPENSE_TIME_MS, MIN_SUSPENSE_TIME_MS);
        const originalStaleTime = defaultedOptions.staleTime;
        defaultedOptions.staleTime = typeof originalStaleTime === "function" ? (...args)=>clamp(originalStaleTime(...args)) : clamp(originalStaleTime);
        if (typeof defaultedOptions.gcTime === "number") {
            defaultedOptions.gcTime = Math.max(defaultedOptions.gcTime, MIN_SUSPENSE_TIME_MS);
        }
    }
};
var willFetch = (result, isRestoring)=>result.isLoading && result.isFetching && !isRestoring;
var shouldSuspend = (defaultedOptions, result)=>defaultedOptions?.suspense && result.isPending;
var fetchOptimistic = (defaultedOptions, observer, errorResetBoundary)=>observer.fetchOptimistic(defaultedOptions).catch(()=>{
        errorResetBoundary.clearReset();
    });
;
 //# sourceMappingURL=suspense.js.map
}),
"[project]/node_modules/@tanstack/react-query/build/modern/useBaseQuery.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useBaseQuery",
    ()=>useBaseQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
// src/useBaseQuery.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryErrorResetBoundary$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryErrorResetBoundary.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$errorBoundaryUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/errorBoundaryUtils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$IsRestoringProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/IsRestoringProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$suspense$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/suspense.js [app-client] (ecmascript)");
"use client";
;
;
;
;
;
;
;
function useBaseQuery(options, Observer, queryClient) {
    if ("TURBOPACK compile-time truthy", 1) {
        if (typeof options !== "object" || Array.isArray(options)) {
            throw new Error('Bad argument type. Starting with v5, only the "Object" form is allowed when calling query related functions. Please use the error stack to find the culprit call. More info here: https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5#supports-a-single-signature-one-object');
        }
    }
    const isRestoring = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$IsRestoringProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useIsRestoring"])();
    const errorResetBoundary = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryErrorResetBoundary$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryErrorResetBoundary"])();
    const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])(queryClient);
    const defaultedOptions = client.defaultQueryOptions(options);
    client.getDefaultOptions().queries?._experimental_beforeQuery?.(defaultedOptions);
    const query = client.getQueryCache().get(defaultedOptions.queryHash);
    if ("TURBOPACK compile-time truthy", 1) {
        if (!defaultedOptions.queryFn) {
            console.error(`[${defaultedOptions.queryHash}]: No queryFn was passed as an option, and no default queryFn was found. The queryFn parameter is only optional when using a default queryFn. More info here: https://tanstack.com/query/latest/docs/framework/react/guides/default-query-function`);
        }
    }
    defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$suspense$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ensureSuspenseTimers"])(defaultedOptions);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$errorBoundaryUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ensurePreventErrorBoundaryRetry"])(defaultedOptions, errorResetBoundary, query);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$errorBoundaryUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useClearResetErrorBoundary"])(errorResetBoundary);
    const isNewCacheEntry = !client.getQueryCache().get(defaultedOptions.queryHash);
    const [observer] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        "useBaseQuery.useState": ()=>new Observer(client, defaultedOptions)
    }["useBaseQuery.useState"]);
    const result = observer.getOptimisticResult(defaultedOptions);
    const shouldSubscribe = !isRestoring && options.subscribed !== false;
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"](__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useBaseQuery.useSyncExternalStore.useCallback": (onStoreChange)=>{
            const unsubscribe = shouldSubscribe ? observer.subscribe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batchCalls(onStoreChange)) : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"];
            observer.updateResult();
            return unsubscribe;
        }
    }["useBaseQuery.useSyncExternalStore.useCallback"], [
        observer,
        shouldSubscribe
    ]), {
        "useBaseQuery.useSyncExternalStore": ()=>observer.getCurrentResult()
    }["useBaseQuery.useSyncExternalStore"], {
        "useBaseQuery.useSyncExternalStore": ()=>observer.getCurrentResult()
    }["useBaseQuery.useSyncExternalStore"]);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useBaseQuery.useEffect": ()=>{
            observer.setOptions(defaultedOptions);
        }
    }["useBaseQuery.useEffect"], [
        defaultedOptions,
        observer
    ]);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$suspense$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shouldSuspend"])(defaultedOptions, result)) {
        throw (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$suspense$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchOptimistic"])(defaultedOptions, observer, errorResetBoundary);
    }
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$errorBoundaryUtils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getHasError"])({
        result,
        errorResetBoundary,
        throwOnError: defaultedOptions.throwOnError,
        query,
        suspense: defaultedOptions.suspense
    })) {
        throw result.error;
    }
    ;
    client.getDefaultOptions().queries?._experimental_afterQuery?.(defaultedOptions, result);
    if (defaultedOptions.experimental_prefetchInRender && !__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isServer"] && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$suspense$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["willFetch"])(result, isRestoring)) {
        const promise = isNewCacheEntry ? // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$suspense$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["fetchOptimistic"])(defaultedOptions, observer, errorResetBoundary) : // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
        query?.promise;
        promise?.catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]).finally(()=>{
            observer.updateResult();
        });
    }
    return !defaultedOptions.notifyOnChangeProps ? observer.trackResult(result) : result;
}
;
 //# sourceMappingURL=useBaseQuery.js.map
}),
"[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useQuery",
    ()=>useQuery
]);
// src/useQuery.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryObserver$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryObserver.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useBaseQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useBaseQuery.js [app-client] (ecmascript)");
"use client";
;
;
function useQuery(options, queryClient) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useBaseQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useBaseQuery"])(options, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryObserver$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryObserver"], queryClient);
}
;
 //# sourceMappingURL=useQuery.js.map
}),
"[project]/node_modules/@tanstack/query-core/build/modern/mutationObserver.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MutationObserver",
    ()=>MutationObserver
]);
// src/mutationObserver.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/mutation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/subscribable.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
;
;
;
;
var MutationObserver = class extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$subscribable$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Subscribable"] {
    #client;
    #currentResult = void 0;
    #currentMutation;
    #mutateOptions;
    constructor(client, options){
        super();
        this.#client = client;
        this.setOptions(options);
        this.bindMethods();
        this.#updateResult();
    }
    bindMethods() {
        this.mutate = this.mutate.bind(this);
        this.reset = this.reset.bind(this);
    }
    setOptions(options) {
        const prevOptions = this.options;
        this.options = this.#client.defaultMutationOptions(options);
        if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shallowEqualObjects"])(this.options, prevOptions)) {
            this.#client.getMutationCache().notify({
                type: "observerOptionsUpdated",
                mutation: this.#currentMutation,
                observer: this
            });
        }
        if (prevOptions?.mutationKey && this.options.mutationKey && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashKey"])(prevOptions.mutationKey) !== (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hashKey"])(this.options.mutationKey)) {
            this.reset();
        } else if (this.#currentMutation?.state.status === "pending") {
            this.#currentMutation.setOptions(this.options);
        }
    }
    onUnsubscribe() {
        if (!this.hasListeners()) {
            this.#currentMutation?.removeObserver(this);
        }
    }
    onMutationUpdate(action) {
        this.#updateResult();
        this.#notify(action);
    }
    getCurrentResult() {
        return this.#currentResult;
    }
    reset() {
        this.#currentMutation?.removeObserver(this);
        this.#currentMutation = void 0;
        this.#updateResult();
        this.#notify();
    }
    mutate(variables, options) {
        this.#mutateOptions = options;
        this.#currentMutation?.removeObserver(this);
        this.#currentMutation = this.#client.getMutationCache().build(this.#client, this.options);
        this.#currentMutation.addObserver(this);
        return this.#currentMutation.execute(variables);
    }
    #updateResult() {
        const state = this.#currentMutation?.state ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDefaultState"])();
        this.#currentResult = {
            ...state,
            isPending: state.status === "pending",
            isSuccess: state.status === "success",
            isError: state.status === "error",
            isIdle: state.status === "idle",
            mutate: this.mutate,
            reset: this.reset
        };
    }
    #notify(action) {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batch(()=>{
            if (this.#mutateOptions && this.hasListeners()) {
                const variables = this.#currentResult.variables;
                const onMutateResult = this.#currentResult.context;
                const context = {
                    client: this.#client,
                    meta: this.options.meta,
                    mutationKey: this.options.mutationKey
                };
                if (action?.type === "success") {
                    try {
                        this.#mutateOptions.onSuccess?.(action.data, variables, onMutateResult, context);
                    } catch (e) {
                        void Promise.reject(e);
                    }
                    try {
                        this.#mutateOptions.onSettled?.(action.data, null, variables, onMutateResult, context);
                    } catch (e) {
                        void Promise.reject(e);
                    }
                } else if (action?.type === "error") {
                    try {
                        this.#mutateOptions.onError?.(action.error, variables, onMutateResult, context);
                    } catch (e) {
                        void Promise.reject(e);
                    }
                    try {
                        this.#mutateOptions.onSettled?.(void 0, action.error, variables, onMutateResult, context);
                    } catch (e) {
                        void Promise.reject(e);
                    }
                }
            }
            this.listeners.forEach((listener)=>{
                listener(this.#currentResult);
            });
        });
    }
};
;
 //# sourceMappingURL=mutationObserver.js.map
}),
"[project]/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useMutation",
    ()=>useMutation
]);
// src/useMutation.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutationObserver$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/mutationObserver.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/utils.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/notifyManager.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
"use client";
;
;
;
function useMutation(options, queryClient) {
    const client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])(queryClient);
    const [observer] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"]({
        "useMutation.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$mutationObserver$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MutationObserver"](client, options)
    }["useMutation.useState"]);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useMutation.useEffect": ()=>{
            observer.setOptions(options);
        }
    }["useMutation.useEffect"], [
        observer,
        options
    ]);
    const result = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSyncExternalStore"](__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useMutation.useSyncExternalStore[result]": (onStoreChange)=>observer.subscribe(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$notifyManager$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notifyManager"].batchCalls(onStoreChange))
    }["useMutation.useSyncExternalStore[result]"], [
        observer
    ]), {
        "useMutation.useSyncExternalStore[result]": ()=>observer.getCurrentResult()
    }["useMutation.useSyncExternalStore[result]"], {
        "useMutation.useSyncExternalStore[result]": ()=>observer.getCurrentResult()
    }["useMutation.useSyncExternalStore[result]"]);
    const mutate = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "useMutation.useCallback[mutate]": (variables, mutateOptions)=>{
            observer.mutate(variables, mutateOptions).catch(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["noop"]);
        }
    }["useMutation.useCallback[mutate]"], [
        observer
    ]);
    if (result.error && (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$utils$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["shouldThrowError"])(observer.options.throwOnError, [
        result.error
    ])) {
        throw result.error;
    }
    return {
        ...result,
        mutate,
        mutateAsync: result.mutate
    };
}
;
 //# sourceMappingURL=useMutation.js.map
}),
]);

//# sourceMappingURL=_80adca34._.js.map