(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/theme.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getEffectiveTheme",
    ()=>getEffectiveTheme,
    "getSystemTheme",
    ()=>getSystemTheme,
    "loadTheme",
    ()=>loadTheme,
    "saveTheme",
    ()=>saveTheme
]);
const THEME_KEY = 'clearworth_theme';
const getSystemTheme = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
const loadTheme = ()=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem(THEME_KEY) || 'system';
};
const saveTheme = (theme)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.setItem(THEME_KEY, theme);
};
const getEffectiveTheme = (theme)=>{
    if (theme === 'system') return getSystemTheme();
    return theme;
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/contexts/ThemeContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ThemeProvider",
    ()=>ThemeProvider,
    "useTheme",
    ()=>useTheme
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/theme.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
const ThemeContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function ThemeProvider({ children }) {
    _s();
    const [theme, setThemeState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('system');
    const [isPrivacyBlur, setIsPrivacyBlur] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ThemeProvider.useEffect": ()=>{
            // Initial load
            setThemeState((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadTheme"])());
            setIsPrivacyBlur(localStorage.getItem('clearworth_privacy') === 'true');
        }
    }["ThemeProvider.useEffect"], []);
    const setTheme = (t)=>{
        setThemeState(t);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveTheme"])(t);
    };
    const togglePrivacyBlur = ()=>{
        const newVal = !isPrivacyBlur;
        setIsPrivacyBlur(newVal);
        localStorage.setItem('clearworth_privacy', String(newVal));
    };
    const effectiveTheme = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getEffectiveTheme"])(theme);
    // Apply Theme
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ThemeProvider.useEffect": ()=>{
            const root = document.documentElement;
            root.classList.remove('light', 'stealth', 'dark');
            if (effectiveTheme === 'stealth') {
                root.classList.add('stealth');
                root.classList.add('dark'); // Stealth Mode enforces Dark Mode + Hidden Values
            } else if (effectiveTheme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.add('light');
            }
        }
    }["ThemeProvider.useEffect"], [
        effectiveTheme
    ]);
    // Apply Privacy Blur
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ThemeProvider.useEffect": ()=>{
            if (isPrivacyBlur) {
                document.body.classList.add('privacy-blur');
            } else {
                document.body.classList.remove('privacy-blur');
            }
        }
    }["ThemeProvider.useEffect"], [
        isPrivacyBlur
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ThemeContext.Provider, {
        value: {
            theme,
            setTheme,
            effectiveTheme,
            isPrivacyBlur,
            togglePrivacyBlur
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/ThemeContext.tsx",
        lineNumber: 64,
        columnNumber: 9
    }, this);
}
_s(ThemeProvider, "8mDjhPjzuEgNbmzGP95t4xh2C8s=");
_c = ThemeProvider;
const useTheme = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};
_s1(useTheme, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "ThemeProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/ThemeToggle.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>ThemeToggle
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ThemeContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ThemeContext.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sun.js [app-client] (ecmascript) <export default as Sun>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/moon.js [app-client] (ecmascript) <export default as Moon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$laptop$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Laptop$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/laptop.js [app-client] (ecmascript) <export default as Laptop>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye-off.js [app-client] (ecmascript) <export default as EyeOff>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function ThemeToggle() {
    _s();
    const { theme, setTheme, isPrivacyBlur, togglePrivacyBlur } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ThemeContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex bg-muted p-1 rounded-xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setTheme('light'),
                        title: "Light Mode",
                        className: `flex-1 py-2 rounded-lg flex justify-center transition-all ${theme === 'light' ? 'bg-card shadow text-amber-500' : 'text-muted-foreground hover:text-foreground'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__["Sun"], {
                            size: 20
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                            lineNumber: 18,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                        lineNumber: 13,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setTheme('stealth'),
                        title: "Stealth Mode",
                        className: `flex-1 py-2 rounded-lg flex justify-center transition-all ${theme === 'stealth' ? 'bg-primary shadow text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__["Moon"], {
                            size: 20
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                            lineNumber: 25,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                        lineNumber: 20,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setTheme('system'),
                        title: "System Theme",
                        className: `flex-1 py-2 rounded-lg flex justify-center transition-all ${theme === 'system' ? 'bg-card shadow text-blue-500' : 'text-muted-foreground hover:text-foreground'}`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$laptop$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Laptop$3e$__["Laptop"], {
                            size: 20
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                            lineNumber: 32,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                        lineNumber: 27,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                lineNumber: 11,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: togglePrivacyBlur,
                className: `w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isPrivacyBlur ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`,
                children: [
                    isPrivacyBlur ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                        size: 18
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                        lineNumber: 43,
                        columnNumber: 34
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                        size: 18
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                        lineNumber: 43,
                        columnNumber: 57
                    }, this),
                    isPrivacyBlur ? 'Privacy Active' : 'Blur Values'
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/ThemeToggle.tsx",
                lineNumber: 36,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/ThemeToggle.tsx",
        lineNumber: 10,
        columnNumber: 9
    }, this);
}
_s(ThemeToggle, "ghvfZF9KQL72/XWruUrFUHTdk6w=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ThemeContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTheme"]
    ];
});
_c = ThemeToggle;
var _c;
__turbopack_context__.k.register(_c, "ThemeToggle");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/utils/supabase/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createBrowserClient.js [app-client] (ecmascript)");
;
function createClient() {
    const url = ("TURBOPACK compile-time value", "https://yewqrleefomsdurnulvq.supabase.co") || 'https://offline-placeholder.supabase.co';
    const key = ("TURBOPACK compile-time value", "sb_publishable_NcnNMQpYWPz1dXZtXoHVEA_Vz60EQGk") || 'offline-anon-key';
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createBrowserClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createBrowserClient"])(url, key);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/infrastructure/sampleData.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SAMPLE_ASSETS",
    ()=>SAMPLE_ASSETS,
    "SAMPLE_CASHFLOW",
    ()=>SAMPLE_CASHFLOW,
    "SAMPLE_FREEDOM_SETTINGS",
    ()=>SAMPLE_FREEDOM_SETTINGS,
    "SAMPLE_GOALS",
    ()=>SAMPLE_GOALS,
    "SAMPLE_LIABILITIES",
    ()=>SAMPLE_LIABILITIES,
    "SAMPLE_MENTORS",
    ()=>SAMPLE_MENTORS,
    "SAMPLE_NET_WORTH_HISTORY",
    ()=>SAMPLE_NET_WORTH_HISTORY,
    "SAMPLE_PRICE_CACHE",
    ()=>SAMPLE_PRICE_CACHE,
    "SAMPLE_QUOTES",
    ()=>SAMPLE_QUOTES,
    "SAMPLE_RECURRING",
    ()=>SAMPLE_RECURRING
]);
const SAMPLE_ASSETS = [
    {
        id: 'demo-asset-1',
        name: 'Chase Checking',
        type: 'cash',
        value: 8500,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-asset-2',
        name: 'High Yield Savings',
        type: 'cash',
        value: 32000,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-asset-3',
        name: 'Vanguard 401k',
        type: 'retirement',
        value: 142105,
        currency: 'USD',
        is_liquid: false,
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: 'VTI',
            shares: 485,
            costBasis: 100000,
            assetClass: 'etf',
            sector: 'Diversified',
            currentPrice: 293
        }
    },
    {
        id: 'demo-asset-4',
        name: 'Tesla Stock',
        type: 'investment',
        value: 15036,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: 'TSLA',
            shares: 42,
            costBasis: 12000,
            assetClass: 'stock',
            sector: 'Technology',
            currentPrice: 358
        }
    },
    {
        id: 'demo-asset-5',
        name: 'Primary Residence',
        type: 'real_estate',
        value: 485000,
        currency: 'USD',
        is_liquid: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-asset-6',
        name: 'Apple Stock',
        type: 'investment',
        value: 17955,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: 'AAPL',
            shares: 95,
            costBasis: 14000,
            assetClass: 'stock',
            sector: 'Technology',
            currentPrice: 189
        }
    },
    {
        id: '4',
        user_id: 'sample-user',
        name: "Vanguard Total World",
        type: 'investment',
        value: 25100,
        currency: 'USD',
        is_liquid: true,
        interest_rate: 0.1,
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: "VTI",
            shares: 50,
            costBasis: 10000,
            currentPrice: 240,
            assetClass: 'etf'
        }
    },
    {
        id: '2',
        user_id: 'sample-user',
        name: "Bitcoin Wallet",
        type: 'crypto',
        value: 45000,
        currency: 'USD',
        is_liquid: true,
        interest_rate: 0,
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: "BTC",
            shares: 1.5,
            costBasis: 30000,
            currentPrice: 30000,
            assetClass: 'crypto'
        }
    },
    {
        id: '5',
        user_id: 'sample-user',
        name: "Crypto Stash",
        type: 'crypto',
        value: 8500,
        currency: 'USD',
        is_liquid: true,
        interest_rate: 0,
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: 'BTC',
            shares: 0.2,
            costBasis: 5000,
            currentPrice: 42500,
            assetClass: 'crypto'
        }
    },
    {
        id: '6',
        user_id: 'sample-user',
        name: "Rental Property",
        type: 'real_estate',
        value: 450000,
        currency: 'USD',
        is_liquid: false,
        interest_rate: 0,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-asset-9',
        name: 'Ethereum',
        type: 'crypto',
        value: 3525,
        currency: 'USD',
        is_liquid: true,
        last_updated: new Date().toISOString(),
        investment_details: {
            ticker: 'ETH',
            shares: 1.5,
            costBasis: 2000,
            assetClass: 'crypto',
            sector: 'Crypto',
            currentPrice: 2350
        }
    },
    {
        id: 'demo-asset-10',
        name: '2019 Tesla Model 3',
        type: 'other',
        value: 22000,
        currency: 'USD',
        is_liquid: false,
        last_updated: new Date().toISOString()
    }
];
const SAMPLE_LIABILITIES = [
    {
        id: 'demo-liability-1',
        user_id: 'demo_user',
        name: 'Mortgage',
        type: 'mortgage',
        balance: 315000,
        currency: 'USD',
        interest_rate: 3.25,
        minimum_payment: 1650,
        is_good_debt: true,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-2',
        user_id: 'demo_user',
        name: 'Amex Platinum',
        type: 'credit_card',
        balance: 1800,
        currency: 'USD',
        interest_rate: 24.99,
        minimum_payment: 75,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-3',
        user_id: 'demo_user',
        name: 'Student Loan',
        type: 'student_loan',
        balance: 12500,
        currency: 'USD',
        interest_rate: 5.8,
        minimum_payment: 200,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-4',
        user_id: 'demo_user',
        name: 'Tesla Finance',
        type: 'auto_loan',
        balance: 18000,
        currency: 'USD',
        interest_rate: 4.5,
        minimum_payment: 450,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    },
    {
        id: 'demo-liability-5',
        user_id: 'demo_user',
        name: 'Medical Bill',
        type: 'other',
        balance: 2200,
        currency: 'USD',
        interest_rate: 0,
        minimum_payment: 100,
        is_good_debt: false,
        last_updated: new Date().toISOString()
    }
];
const SAMPLE_GOALS = [
    {
        id: 'demo-goal-1',
        name: 'First Million Net Worth',
        target_amount: 1000000,
        current_amount: 0,
        category: 'net_worth',
        deadline: '2030-01-01',
        created_at: new Date().toISOString()
    },
    {
        id: 'demo-goal-2',
        name: 'Emergency Fund',
        target_amount: 50000,
        current_amount: 32000,
        category: 'savings',
        deadline: '2025-12-31',
        created_at: new Date().toISOString()
    },
    {
        id: 'demo-goal-3',
        name: 'Pay Off Credit Card',
        target_amount: 0,
        current_amount: 1800,
        start_amount: 2500,
        category: 'debt_payoff',
        deadline: '2024-03-01',
        created_at: new Date().toISOString()
    },
    {
        id: 'demo-goal-4',
        name: 'Vacation Fund',
        target_amount: 8000,
        current_amount: 2500,
        category: 'custom',
        deadline: '2024-08-01',
        created_at: new Date().toISOString()
    },
    {
        id: 'demo-goal-5',
        name: 'Debt Free',
        target_amount: 0,
        current_amount: 349500,
        start_amount: 360000,
        category: 'debt_payoff',
        deadline: '2032-06-01',
        created_at: new Date().toISOString()
    }
];
const SAMPLE_RECURRING = [
    {
        id: 'rec-1',
        name: 'Software Engineer Salary',
        type: 'income',
        amount: 9000,
        frequency: 'monthly',
        category: 'Salary',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-2',
        name: 'Freelance Consulting',
        type: 'income',
        amount: 1500,
        frequency: 'monthly',
        category: 'Business',
        start_date: '2023-06-01',
        is_active: true
    },
    {
        id: 'rec-3',
        name: 'Dividend Income',
        type: 'income',
        amount: 150,
        frequency: 'monthly',
        category: 'Investments',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-4',
        name: 'Mortgage Payment',
        type: 'expense',
        amount: 1650,
        frequency: 'monthly',
        category: 'Housing',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-5',
        name: 'Tesla Payment',
        type: 'expense',
        amount: 450,
        frequency: 'monthly',
        category: 'Transportation',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-6',
        name: 'Student Loan',
        type: 'expense',
        amount: 200,
        frequency: 'monthly',
        category: 'Debt',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-7',
        name: 'Utilities',
        type: 'expense',
        amount: 280,
        frequency: 'monthly',
        category: 'Utilities',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-8',
        name: 'Groceries',
        type: 'expense',
        amount: 650,
        frequency: 'monthly',
        category: 'Food',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-9',
        name: 'Digital Subscriptions',
        type: 'expense',
        amount: 120,
        frequency: 'monthly',
        category: 'Entertainment',
        start_date: '2023-01-01',
        is_active: true
    },
    {
        id: 'rec-10',
        name: 'Car Insurance',
        type: 'expense',
        amount: 180,
        frequency: 'monthly',
        category: 'Insurance',
        start_date: '2023-01-01',
        is_active: true
    }
];
const SAMPLE_CASHFLOW = (()=>{
    const entries = [];
    const today = new Date();
    // Generate 12 months back
    for(let i = 0; i < 12; i++){
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
        // Base numbers
        let income = 10650; // 9000 + 1500 + 150
        let expenses = 3530 + 1500; // Base fixed + variable spending
        // Add some noise
        income += Math.floor(Math.random() * 500) - 250;
        expenses += Math.floor(Math.random() * 800) - 200;
        // Spike in December (bonus / holdiay spending)
        if (d.getMonth() === 11) {
            income += 2500;
            expenses += 1200;
        }
        entries.push({
            id: `cf-hist-${i}`,
            month: monthStr,
            income,
            expenses
        });
    }
    return entries;
})();
const SAMPLE_NET_WORTH_HISTORY = (()=>{
    const history = [];
    const today = new Date();
    // Starting point 2 years ago
    let baseAssets = 550000;
    let baseLiabilities = 420000;
    // We will generate 24 months
    for(let i = 23; i >= 0; i--){
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];
        // Monthly changes
        // Assets grow ~0.8% + noise
        const growthRate = 0.008 + (Math.random() * 0.005 - 0.002);
        baseAssets = baseAssets * (1 + growthRate);
        // Liabilities pay down ~$1000/mo
        baseLiabilities = Math.max(0, baseLiabilities - (1000 + Math.random() * 200));
        // Market dips/corrections
        // 8 months ago (dip)
        if (i === 8) baseAssets *= 0.96;
        // 15 months ago (dip)
        if (i === 15) baseAssets *= 0.94;
        const snapshot = {
            id: crypto.randomUUID(),
            date: dateStr,
            totalAssets: Math.round(baseAssets),
            totalLiabilities: Math.round(baseLiabilities),
            netWorth: Math.round(baseAssets - baseLiabilities)
        };
        // Embed detailed assets/liabilities for Time Machine (every 3rd month or recent)
        // This is key for the "Time Machine" feature to work fully
        if (i < 3 || i % 6 === 0) {
            // Reconstruct a plausible breakdown based on totals
            const multiplierA = baseAssets / 758500; // ratio to current
            const multiplierL = baseLiabilities / 349500;
            snapshot.assets = SAMPLE_ASSETS.map((a)=>({
                    ...a,
                    value: Math.round(a.value * multiplierA)
                }));
            snapshot.liabilities = SAMPLE_LIABILITIES.map((l)=>({
                    ...l,
                    balance: Math.round(l.balance * multiplierL)
                }));
        }
        history.push(snapshot);
    }
    return history;
})();
const SAMPLE_MENTORS = [
    {
        id: 'cust_buffett',
        name: 'Warren Buffett',
        archetype: 'The Oracle',
        description: 'Value investing, moats, and long-term patience.',
        icon: null // Will be handled by UI
    },
    {
        id: 'cust_naval',
        name: 'Naval Ravikant',
        archetype: 'The Philosopher',
        description: 'Wealth creation, leverage, and specific knowledge.',
        icon: null
    },
    {
        id: 'cust_housel',
        name: 'Morgan Housel',
        archetype: 'The Behavioralist',
        description: 'The psychology of money, humility, and saving.',
        icon: null
    }
];
const SAMPLE_QUOTES = [
    "Be fearful when others are greedy and greedy when others are fearful. - Warren Buffett",
    "Wealth is assets that earn while you sleep. - Naval Ravikant",
    "Saving is the gap between your ego and your income. - Morgan Housel",
    "The best time to plant a tree was 20 years ago. The second best time is now. - Proverbs",
    "Compound interest is the eighth wonder of the world. - Albert Einstein"
];
const SAMPLE_FREEDOM_SETTINGS = {
    strategy: 'avalanche',
    extraMonthlyPayment: 750
};
const SAMPLE_PRICE_CACHE = {
    'VTI': {
        price: 293,
        change: 1.2,
        percent: 0.45,
        timestamp: Date.now()
    },
    'TSLA': {
        price: 358,
        change: -2.5,
        percent: -0.65,
        timestamp: Date.now()
    },
    'AAPL': {
        price: 189,
        change: 0.8,
        percent: 0.42,
        timestamp: Date.now()
    },
    'VOO': {
        price: 502,
        change: 1.5,
        percent: 0.30,
        timestamp: Date.now()
    },
    'BTC': {
        price: 42500,
        change: 1200,
        percent: 2.8,
        timestamp: Date.now()
    },
    'ETH': {
        price: 2350,
        change: 45,
        percent: 1.9,
        timestamp: Date.now()
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "STORAGE_KEYS_DASHBOARD",
    ()=>STORAGE_KEYS_DASHBOARD,
    "applyRecurringToMonth",
    ()=>applyRecurringToMonth,
    "calculateWealthMomentum",
    ()=>calculateWealthMomentum,
    "clearAllData",
    ()=>clearAllData,
    "deleteScopedRecord",
    ()=>deleteScopedRecord,
    "exportAllData",
    ()=>exportAllData,
    "generateMockData",
    ()=>generateMockData,
    "generateMockHistory",
    ()=>generateMockHistory,
    "importData",
    ()=>importData,
    "initVaultSync",
    ()=>initVaultSync,
    "loadAssets",
    ()=>loadAssets,
    "loadCashFlow",
    ()=>loadCashFlow,
    "loadDashboardLayout",
    ()=>loadDashboardLayout,
    "loadFreedomSettings",
    ()=>loadFreedomSettings,
    "loadGoals",
    ()=>loadGoals,
    "loadLiabilities",
    ()=>loadLiabilities,
    "loadNetWorthHistory",
    ()=>loadNetWorthHistory,
    "loadRecurringTransactions",
    ()=>loadRecurringTransactions,
    "loadSettings",
    ()=>loadSettings,
    "persistScopedRecord",
    ()=>persistScopedRecord,
    "resetDashboardLayout",
    ()=>resetDashboardLayout,
    "saveAssets",
    ()=>saveAssets,
    "saveCashFlow",
    ()=>saveCashFlow,
    "saveDashboardLayout",
    ()=>saveDashboardLayout,
    "saveFreedomSettings",
    ()=>saveFreedomSettings,
    "saveFullSnapshot",
    ()=>saveFullSnapshot,
    "saveGoals",
    ()=>saveGoals,
    "saveLiabilities",
    ()=>saveLiabilities,
    "saveNetWorthHistory",
    ()=>saveNetWorthHistory,
    "saveRecurringTransactions",
    ()=>saveRecurringTransactions,
    "saveSettings",
    ()=>saveSettings,
    "toMonthlyAmount",
    ()=>toMonthlyAmount,
    "updateDebtRecurringTransaction",
    ()=>updateDebtRecurringTransaction,
    "validateBackup",
    ()=>validateBackup
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/sampleData.ts [app-client] (ecmascript)");
;
// Key constants - Primary OpenNetWorth keys with backward compatibility
const STORAGE_KEYS = {
    ASSETS: 'opennetworth_assets',
    LIABILITIES: 'opennetworth_liabilities',
    NET_WORTH_HISTORY: 'opennetworth_nw_history',
    GOALS: 'opennetworth_goals',
    CASH_FLOW: 'opennetworth_cash_flow',
    RECURRING: 'opennetworth_recurring',
    SETTINGS: 'opennetworth_settings',
    FREEDOM_SETTINGS: 'opennetworth_freedom_settings'
};
async function persistScopedRecord(entity, item) {
    let persistedItem = item;
    if ("TURBOPACK compile-time truthy", 1) {
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'scoped_save',
                entity,
                item
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(()=>({
                    error: 'Durable database write failed'
                }));
            throw new Error(err.error || `Failed to persist ${entity} record to local SQLite database`);
        }
        const json = await res.json().catch(()=>null);
        if (json?.item) {
            persistedItem = json.item;
        }
    }
    // Update local cache for fast synchronous access using the authoritative persisted record
    if (entity === 'assets') {
        const items = loadAssets();
        const idx = items.findIndex((i)=>i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem;
        else items.push(persistedItem);
        set(STORAGE_KEYS.ASSETS, items);
    } else if (entity === 'liabilities') {
        const items = loadLiabilities();
        const idx = items.findIndex((i)=>i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem;
        else items.push(persistedItem);
        set(STORAGE_KEYS.LIABILITIES, items);
    } else if (entity === 'goals') {
        const items = loadGoals();
        const idx = items.findIndex((i)=>i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem;
        else items.push(persistedItem);
        set(STORAGE_KEYS.GOALS, items);
    } else if (entity === 'recurring') {
        const items = loadRecurringTransactions();
        const idx = items.findIndex((i)=>i.id === persistedItem.id);
        if (idx !== -1) items[idx] = persistedItem;
        else items.push(persistedItem);
        set(STORAGE_KEYS.RECURRING, items);
    } else if (entity === 'cashFlow') {
        const items = loadCashFlow();
        const persisted = persistedItem;
        const idx = items.findIndex((i)=>i.id === persisted.id || i.month === persisted.month);
        if (idx !== -1) items[idx] = persisted;
        else items.push(persisted);
        set(STORAGE_KEYS.CASH_FLOW, items);
    } else if (entity === 'history') {
        const history = loadNetWorthHistory();
        const persisted = persistedItem;
        const idx = history.findIndex((h)=>h.id === persisted.id || h.date === persisted.date);
        if (idx !== -1) history[idx] = persisted;
        else history.push(persisted);
        history.sort((a, b)=>new Date(a.date).getTime() - new Date(b.date).getTime());
        set(STORAGE_KEYS.NET_WORTH_HISTORY, history);
    } else if (entity === 'settings') {
        if (item.key && item.value !== undefined) {
            if (item.key === 'freedomSettings') {
                set(STORAGE_KEYS.FREEDOM_SETTINGS, item.value);
            } else if (item.key === 'dashboardLayout') {
                set(STORAGE_KEYS_DASHBOARD, item.value);
            } else {
                const current = get(STORAGE_KEYS.SETTINGS) || {};
                current[item.key] = item.value;
                set(STORAGE_KEYS.SETTINGS, current);
            }
        } else {
            set(STORAGE_KEYS.SETTINGS, item);
        }
    }
    return persistedItem;
}
async function deleteScopedRecord(entity, id) {
    if ("TURBOPACK compile-time truthy", 1) {
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'scoped_delete',
                entity,
                id
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(()=>({
                    error: 'Durable database delete failed'
                }));
            throw new Error(err.error || `Failed to delete ${entity} record from local SQLite database`);
        }
    }
    // Update local cache
    if (entity === 'assets') {
        set(STORAGE_KEYS.ASSETS, loadAssets().filter((i)=>i.id !== id));
    } else if (entity === 'liabilities') {
        set(STORAGE_KEYS.LIABILITIES, loadLiabilities().filter((i)=>i.id !== id));
    } else if (entity === 'goals') {
        set(STORAGE_KEYS.GOALS, loadGoals().filter((i)=>i.id !== id));
    } else if (entity === 'recurring') {
        set(STORAGE_KEYS.RECURRING, loadRecurringTransactions().filter((i)=>i.id !== id));
    } else if (entity === 'cashFlow') {
        set(STORAGE_KEYS.CASH_FLOW, loadCashFlow().filter((i)=>i.id !== id && i.month !== id));
    } else if (entity === 'history') {
        set(STORAGE_KEYS.NET_WORTH_HISTORY, loadNetWorthHistory().filter((i)=>i.id !== id && i.date !== id));
    }
}
// Generic helper with backward-compatible key lookup
function get(key, parse = true) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    let item = localStorage.getItem(key);
    if (!item && key.startsWith('opennetworth_')) {
        // Fallback to legacy clearworth key
        const legacyKey = key.replace('opennetworth_', 'clearworth_');
        item = localStorage.getItem(legacyKey);
        // Cashflow legacy key special check (clearworth_cashflow without underscore)
        if (!item && key === STORAGE_KEYS.CASH_FLOW) {
            item = localStorage.getItem('clearworth_cashflow');
        }
    }
    if (!item) return null;
    try {
        return parse ? JSON.parse(item) : item;
    } catch (e) {
        console.error(`Error parsing storage key ${key}:`, e);
        return null;
    }
}
/**
 * Updates local cache and dispatches UI update notifications.
 * 
 * Why this exists:
 * Provides fast synchronous local storage access and reactive UI updates.
 * Separated from persistence: does NOT invoke any bulk SQLite sync (DATA-04, DATA-05).
 * Durable writes must explicitly use scoped operations (persistScopedRecord / deleteScopedRecord)
 * or atomic bulk restore (importData).
 */ function set(key, value) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const str = JSON.stringify(value);
    localStorage.setItem(key, str);
    // Keep legacy key in sync during transition
    if (key.startsWith('opennetworth_')) {
        const legacyKey = key.replace('opennetworth_', 'clearworth_');
        localStorage.setItem(legacyKey, str);
        if (key === STORAGE_KEYS.CASH_FLOW) {
            localStorage.setItem('clearworth_cashflow', str);
        }
    }
    // Dispatch custom event for reactive UI updates
    window.dispatchEvent(new Event('opennetworth_data_updated'));
    window.dispatchEvent(new Event('clearworth_data_updated'));
}
function loadSettings() {
    const defaults = {
        baseCurrency: 'USD',
        theme: 'system',
        checkInFrequency: 'monthly'
    };
    return {
        ...defaults,
        ...get(STORAGE_KEYS.SETTINGS)
    };
}
async function saveSettings(settings) {
    await persistScopedRecord('settings', settings);
}
function loadAssets() {
    return get(STORAGE_KEYS.ASSETS) || [];
}
function saveAssets(assets) {
    set(STORAGE_KEYS.ASSETS, assets);
}
function loadLiabilities() {
    return get(STORAGE_KEYS.LIABILITIES) || [];
}
function saveLiabilities(liabilities) {
    set(STORAGE_KEYS.LIABILITIES, liabilities);
}
function loadNetWorthHistory() {
    return get(STORAGE_KEYS.NET_WORTH_HISTORY) || [];
}
async function saveNetWorthHistory(history) {
    if ("TURBOPACK compile-time truthy", 1) {
        const res = await fetch('/api/vault', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                history
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(()=>({
                    error: 'Durable net worth history write failed'
                }));
            throw new Error(err.error || 'Failed to persist net worth history to local SQLite database');
        }
    }
    // Commit succeeded: update local cache
    set(STORAGE_KEYS.NET_WORTH_HISTORY, history);
}
async function saveFullSnapshot(snapshot) {
    await persistScopedRecord('history', snapshot);
}
function loadGoals() {
    return get(STORAGE_KEYS.GOALS) || [];
}
function saveGoals(goals) {
    set(STORAGE_KEYS.GOALS, goals);
}
function loadCashFlow() {
    return get(STORAGE_KEYS.CASH_FLOW) || [];
}
function saveCashFlow(entries) {
    set(STORAGE_KEYS.CASH_FLOW, entries);
}
function validateBackup(data) {
    if (!data || typeof data !== 'object') {
        return {
            valid: false,
            error: 'Backup data is not a valid JSON object'
        };
    }
    if (!data.manifest || typeof data.manifest !== 'object') {
        return {
            valid: false,
            error: 'Missing backup manifest in archive'
        };
    }
    if (data.manifest.app !== 'OpenNetWorth') {
        return {
            valid: false,
            error: `Invalid application identifier: "${data.manifest.app}". Expected "OpenNetWorth".`
        };
    }
    if (data.manifest.schemaVersion !== 1) {
        return {
            valid: false,
            error: `Unsupported schema version: ${data.manifest.schemaVersion}. Supported version is 1.`
        };
    }
    if (!data.vault || typeof data.vault !== 'object') {
        return {
            valid: false,
            error: 'Missing vault collections object in backup'
        };
    }
    const { assets, liabilities, goals, recurring, history, cashFlow, settings } = data.vault;
    if (!Array.isArray(assets)) return {
        valid: false,
        error: 'Missing or invalid assets collection in vault'
    };
    if (!Array.isArray(liabilities)) return {
        valid: false,
        error: 'Missing or invalid liabilities collection in vault'
    };
    if (!Array.isArray(goals)) return {
        valid: false,
        error: 'Missing or invalid goals collection in vault'
    };
    if (!Array.isArray(recurring)) return {
        valid: false,
        error: 'Missing or invalid recurring transactions collection in vault'
    };
    if (!Array.isArray(history)) return {
        valid: false,
        error: 'Missing or invalid history collection in vault'
    };
    if (!Array.isArray(cashFlow)) return {
        valid: false,
        error: 'Missing or invalid cash flow collection in vault'
    };
    if (!settings || typeof settings !== 'object') return {
        valid: false,
        error: 'Missing or invalid settings collection in vault'
    };
    // Record count validation
    const counts = data.manifest.recordCounts;
    if (counts) {
        if (counts.assets !== undefined && counts.assets !== assets.length) {
            return {
                valid: false,
                error: `Asset count mismatch: manifest declares ${counts.assets}, found ${assets.length}`
            };
        }
        if (counts.liabilities !== undefined && counts.liabilities !== liabilities.length) {
            return {
                valid: false,
                error: `Liabilities count mismatch: manifest declares ${counts.liabilities}, found ${liabilities.length}`
            };
        }
        if (counts.goals !== undefined && counts.goals !== goals.length) {
            return {
                valid: false,
                error: `Goals count mismatch: manifest declares ${counts.goals}, found ${goals.length}`
            };
        }
        if (counts.recurring !== undefined && counts.recurring !== recurring.length) {
            return {
                valid: false,
                error: `Recurring count mismatch: manifest declares ${counts.recurring}, found ${recurring.length}`
            };
        }
        if (counts.cashFlow !== undefined && counts.cashFlow !== cashFlow.length) {
            return {
                valid: false,
                error: `Cash flow count mismatch: manifest declares ${counts.cashFlow}, found ${cashFlow.length}`
            };
        }
        if (counts.history !== undefined && counts.history !== history.length) {
            return {
                valid: false,
                error: `History count mismatch: manifest declares ${counts.history}, found ${history.length}`
            };
        }
    }
    // Individual data integrity validation
    for (const [idx, item] of assets.entries()){
        if (!item || !item.id || typeof item.id !== 'string') {
            return {
                valid: false,
                error: `Asset at index ${idx} is missing a valid id`
            };
        }
        if (typeof item.name !== 'string') {
            return {
                valid: false,
                error: `Asset "${item.id}" has an invalid name`
            };
        }
        if (typeof item.value !== 'number' || isNaN(item.value) || !isFinite(item.value)) {
            return {
                valid: false,
                error: `Asset "${item.name || item.id}" has a non-numeric value`
            };
        }
        if (item.value < 0) {
            return {
                valid: false,
                error: `Asset "${item.name || item.id}" cannot have a negative value`
            };
        }
    }
    for (const [idx, item] of liabilities.entries()){
        if (!item || !item.id || typeof item.id !== 'string') {
            return {
                valid: false,
                error: `Liability at index ${idx} is missing a valid id`
            };
        }
        if (typeof item.name !== 'string') {
            return {
                valid: false,
                error: `Liability "${item.id}" has an invalid name`
            };
        }
        if (typeof item.balance !== 'number' || isNaN(item.balance) || !isFinite(item.balance)) {
            return {
                valid: false,
                error: `Liability "${item.name || item.id}" has a non-numeric balance`
            };
        }
        if (item.balance < 0) {
            return {
                valid: false,
                error: `Liability "${item.name || item.id}" cannot have a negative balance`
            };
        }
    }
    for (const [idx, item] of goals.entries()){
        if (!item || !item.id || typeof item.id !== 'string') {
            return {
                valid: false,
                error: `Goal at index ${idx} is missing a valid id`
            };
        }
        if (typeof item.name !== 'string') {
            return {
                valid: false,
                error: `Goal "${item.id}" has an invalid name`
            };
        }
        if (typeof item.target_amount !== 'number' || isNaN(item.target_amount) || !isFinite(item.target_amount) || item.target_amount < 0) {
            return {
                valid: false,
                error: `Goal "${item.name || item.id}" has a non-numeric target_amount`
            };
        }
    }
    for (const [idx, item] of recurring.entries()){
        if (!item || !item.id || typeof item.id !== 'string') {
            return {
                valid: false,
                error: `Recurring transaction at index ${idx} is missing a valid id`
            };
        }
        if (typeof item.name !== 'string') {
            return {
                valid: false,
                error: `Recurring item "${item.id}" has an invalid name`
            };
        }
        if (typeof item.amount !== 'number' || isNaN(item.amount) || !isFinite(item.amount) || item.amount < 0) {
            return {
                valid: false,
                error: `Recurring item "${item.name || item.id}" has a non-numeric amount`
            };
        }
    }
    for (const [idx, item] of history.entries()){
        const netWorth = item.netWorth ?? item.net_worth;
        if (typeof netWorth !== 'number' || isNaN(netWorth) || !isFinite(netWorth)) {
            return {
                valid: false,
                error: `History record at index ${idx} has a non-numeric net worth`
            };
        }
    }
    for (const [idx, item] of cashFlow.entries()){
        if (!item || typeof item !== 'object') {
            return {
                valid: false,
                error: `Cash flow entry at index ${idx} is not an object`
            };
        }
        if (!item.month || typeof item.month !== 'string' || !/^\d{4}-(?:0[1-9]|1[0-2])$/.test(item.month)) {
            return {
                valid: false,
                error: `Cash flow entry at index ${idx} has invalid month "${item?.month}". Expected YYYY-MM.`
            };
        }
        if (typeof item.income !== 'number' || isNaN(item.income) || !isFinite(item.income) || item.income < 0) {
            return {
                valid: false,
                error: `Cash flow entry for ${item.month} has invalid or negative income`
            };
        }
        if (typeof item.expenses !== 'number' || isNaN(item.expenses) || !isFinite(item.expenses) || item.expenses < 0) {
            return {
                valid: false,
                error: `Cash flow entry for ${item.month} has invalid or negative expenses`
            };
        }
    }
    return {
        valid: true
    };
}
function exportAllData() {
    const assets = loadAssets();
    const liabilities = loadLiabilities();
    const goals = loadGoals();
    const recurring = loadRecurringTransactions();
    const history = loadNetWorthHistory();
    const cashFlow = loadCashFlow();
    // Aggregate all user settings into the backup (payoff preferences, dashboard layout, base preferences)
    const baseSettings = get(STORAGE_KEYS.SETTINGS) || {};
    const freedomSettings = get(STORAGE_KEYS.FREEDOM_SETTINGS) || {};
    const dashboardLayout = get('opennetworth_dashboard_layout') || {};
    const settings = {
        ...baseSettings,
        freedomSettings,
        dashboardLayout
    };
    const archive = {
        manifest: {
            app: 'OpenNetWorth',
            appVersion: '0.1.0',
            schemaVersion: 1,
            exportTimestamp: new Date().toISOString(),
            recordCounts: {
                assets: assets.length,
                liabilities: liabilities.length,
                goals: goals.length,
                recurring: recurring.length,
                history: history.length,
                cashFlow: cashFlow.length,
                settings: Object.keys(settings).length
            }
        },
        vault: {
            assets,
            liabilities,
            goals,
            recurring,
            history,
            cashFlow,
            settings
        }
    };
    // Pre-download validation against schema (TRUST-10)
    const validation = validateBackup(archive);
    if (!validation.valid) {
        throw new Error(`Export archive validation failed: ${validation.error}`);
    }
    return JSON.stringify(archive, null, 2);
}
async function importData(jsonString) {
    try {
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch  {
            return {
                success: false,
                error: 'File contains invalid JSON syntax'
            };
        }
        // 1. Pre-restore validation (TRUST-11)
        const validation = validateBackup(parsed);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }
        const vault = parsed.vault;
        // 2. Commit durably to SQLite FIRST via atomic bulk_restore (DATA-01, TRUST-11)
        if ("TURBOPACK compile-time truthy", 1) {
            const res = await fetch('/api/vault', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'bulk_restore',
                    assets: vault.assets,
                    liabilities: vault.liabilities,
                    goals: vault.goals,
                    recurring: vault.recurring,
                    history: vault.history,
                    cashFlow: vault.cashFlow,
                    settings: vault.settings
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(()=>({
                        error: 'Database restore failed'
                    }));
                return {
                    success: false,
                    error: err.error || `Database restore returned HTTP ${res.status}`
                };
            }
        }
        // 3. ONLY after database confirms success (HTTP 200), refresh local browser cache
        saveAssets(vault.assets);
        saveLiabilities(vault.liabilities);
        saveGoals(vault.goals);
        saveRecurringTransactions(vault.recurring);
        set(STORAGE_KEYS.NET_WORTH_HISTORY, vault.history);
        saveCashFlow(vault.cashFlow);
        if (vault.settings) {
            const { freedomSettings, dashboardLayout, ...baseSettings } = vault.settings;
            set(STORAGE_KEYS.SETTINGS, baseSettings);
            if (freedomSettings) {
                set(STORAGE_KEYS.FREEDOM_SETTINGS, freedomSettings);
            }
            if (dashboardLayout) {
                set('opennetworth_dashboard_layout', dashboardLayout);
            }
        }
        if ("TURBOPACK compile-time truthy", 1) {
            window.dispatchEvent(new Event('opennetworth_data_updated'));
            window.dispatchEvent(new Event('clearworth_data_updated'));
        }
        return {
            success: true
        };
    } catch (e) {
        return {
            success: false,
            error: e.message || 'Import failed due to an unexpected error'
        };
    }
}
function loadFreedomSettings() {
    const defaults = {
        strategy: 'avalanche',
        extraMonthlyPayment: 500
    };
    const saved = get(STORAGE_KEYS.FREEDOM_SETTINGS);
    return {
        ...defaults,
        ...saved
    };
}
async function saveFreedomSettings(settings) {
    await persistScopedRecord('settings', {
        key: 'freedomSettings',
        value: settings
    });
}
function loadRecurringTransactions() {
    return get(STORAGE_KEYS.RECURRING) || [];
}
function saveRecurringTransactions(transactions) {
    set(STORAGE_KEYS.RECURRING, transactions);
}
function toMonthlyAmount(amount, frequency) {
    switch(frequency){
        case 'weekly':
            return amount * 4.33;
        case 'biweekly':
            return amount * 2.17;
        case 'monthly':
            return amount;
        case 'quarterly':
            return amount / 3;
        case 'yearly':
            return amount / 12;
        default:
            return amount;
    }
}
function calculateWealthMomentum() {
    const transactions = loadRecurringTransactions().filter((t)=>t.is_active);
    const monthlyIncome = transactions.filter((t)=>t.type === 'income').reduce((sum, t)=>sum + toMonthlyAmount(t.amount, t.frequency), 0);
    const monthlyExpenses = transactions.filter((t)=>t.type === 'expense').reduce((sum, t)=>sum + toMonthlyAmount(t.amount, t.frequency), 0);
    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome * 100 : 0;
    // Calculate base score
    let score = savingsRate;
    // Apply bonuses
    if (savingsRate > 50) score += 10;
    else if (savingsRate > 30) score += 5;
    else if (savingsRate > 20) score += 5;
    if (savingsRate < 0) score -= 10;
    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));
    return {
        score: Math.round(score),
        monthlyRecurringIncome: monthlyIncome,
        monthlyRecurringExpenses: monthlyExpenses,
        monthlySavings,
        savingsRate,
        annualProjectedSavings: monthlySavings * 12
    };
}
function applyRecurringToMonth(month) {
    const recurring = loadRecurringTransactions().filter((t)=>t.is_active);
    if (recurring.length === 0) return false;
    const cashFlowEntries = loadCashFlow();
    const existingEntry = cashFlowEntries.find((e)=>e.month === month);
    if (existingEntry) return false; // Don't overwrite existing
    const income = recurring.filter((t)=>t.type === 'income').reduce((sum, t)=>sum + toMonthlyAmount(t.amount, t.frequency), 0);
    const expenses = recurring.filter((t)=>t.type === 'expense').reduce((sum, t)=>sum + toMonthlyAmount(t.amount, t.frequency), 0);
    const newEntry = {
        id: `cf-auto-${Date.now()}`,
        month,
        income: Math.round(income),
        expenses: Math.round(expenses)
    };
    cashFlowEntries.push(newEntry);
    saveCashFlow(cashFlowEntries);
    return true;
}
async function updateDebtRecurringTransaction(amount) {
    const DEBT_TRX_ID = 'debt-freedom-accelerator';
    const transactions = loadRecurringTransactions();
    const existing = transactions.find((t)=>t.id === DEBT_TRX_ID);
    if (amount <= 0) {
        if (existing) {
            const deactivated = {
                ...existing,
                amount: 0,
                is_active: false
            };
            await persistScopedRecord('recurring', deactivated);
        }
        return;
    }
    const targetTrx = existing ? {
        ...existing,
        amount,
        is_active: true
    } : {
        id: DEBT_TRX_ID,
        name: 'Debt Freedom Accelerator',
        amount: amount,
        type: 'expense',
        frequency: 'monthly',
        category: 'Debt Repayment',
        start_date: new Date().toISOString().split('T')[0],
        is_active: true,
        currency: 'USD'
    };
    await persistScopedRecord('recurring', targetTrx);
}
async function clearAllData() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const res = await fetch('/api/vault', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'clear_vault'
        })
    });
    if (!res.ok) {
        const err = await res.json().catch(()=>({
                error: 'Failed to clear SQLite vault'
            }));
        throw new Error(err.error || 'Failed to clear local SQLite database');
    }
    localStorage.clear();
    window.dispatchEvent(new Event('opennetworth_data_updated'));
    window.dispatchEvent(new Event('clearworth_data_updated'));
}
function generateMockData() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const today = new Date();
    // Mock History (Past 12 months with realistic growth)
    const history = [];
    let baseNetWorth = 320000; // Starting point roughly
    for(let i = 11; i >= 0; i--){
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];
        // Add some random fluctuation/growth
        const growth = baseNetWorth * (0.008 + Math.random() * 0.005); // ~0.8-1.3% growth per month
        baseNetWorth += growth;
        const snapshotAssets = baseNetWorth + 393250; // Roughly back-calculating from liabilities constant for simplicity
        const snapshotLiabilities = 393250 - i * 400; // Paying down debt slowly
        history.push({
            id: crypto.randomUUID(),
            date: dateStr,
            totalAssets: Math.round(snapshotAssets),
            totalLiabilities: Math.round(snapshotLiabilities),
            netWorth: Math.round(snapshotAssets - snapshotLiabilities)
        });
    }
    saveAssets(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_ASSETS"].map((a)=>({
            ...a,
            user_id: 'local_user'
        })));
    saveLiabilities(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_LIABILITIES"].map((l)=>({
            ...l,
            user_id: 'local_user'
        })));
    saveGoals(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_GOALS"]);
    saveNetWorthHistory(history);
    // Custom Mentors Sample
    localStorage.setItem('custom_mentors', JSON.stringify([
        {
            id: 'm_demo_1',
            name: 'Naval Ravikant',
            archetype: 'The Modern Philosopher',
            description: 'Wealth, happiness, and sovereignty.',
            avatar: '/avatars/naval.jpg'
        }
    ]));
}
function generateMockHistory() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    const today = new Date();
    const history = [];
    let baseNetWorth = 150000; // Starting point
    // Generate 24 months of history
    for(let i = 23; i >= 0; i--){
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];
        // Add some random fluctuation/growth
        // Trend up generally, but with some noise
        const growth = baseNetWorth * (0.01 + (Math.random() * 0.02 - 0.005));
        baseNetWorth += growth;
        // Assets/Liabilities split (rough approximation)
        const snapshotAssets = baseNetWorth * 1.5;
        const snapshotLiabilities = baseNetWorth * 0.5;
        history.push({
            id: crypto.randomUUID(),
            date: dateStr,
            totalAssets: Math.round(snapshotAssets),
            totalLiabilities: Math.round(snapshotLiabilities),
            netWorth: Math.round(snapshotAssets - snapshotLiabilities)
        });
    }
    saveNetWorthHistory(history);
}
const STORAGE_KEYS_DASHBOARD = 'clearworth_dashboard_layout';
function loadDashboardLayout() {
    return get(STORAGE_KEYS_DASHBOARD);
}
async function saveDashboardLayout(config) {
    await persistScopedRecord('settings', {
        key: 'dashboardLayout',
        value: config
    });
}
async function initVaultSync() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    try {
        const res = await fetch('/api/vault');
        if (!res.ok) return;
        const json = await res.json();
        const vault = json.vault;
        if (!vault) return;
        const MIGRATION_FLAG = 'opennetworth_vault_migrated_v1';
        const isMigrated = localStorage.getItem(MIGRATION_FLAG) === 'true';
        const localAssets = loadAssets();
        const localLiabs = loadLiabilities();
        const localGoals = loadGoals();
        const localRecurring = loadRecurringTransactions();
        const localHistory = loadNetWorthHistory();
        const localCashFlow = loadCashFlow();
        const localSettings = get(STORAGE_KEYS.SETTINGS) || {};
        if (!isMigrated) {
            // 1. Preserve recovery backup of client storage
            const recoveryBackup = {
                timestamp: new Date().toISOString(),
                assets: localAssets,
                liabilities: localLiabs,
                goals: localGoals,
                recurring: localRecurring,
                history: localHistory,
                cashFlow: localCashFlow,
                settings: localSettings,
                freedomSettings: loadFreedomSettings(),
                dashboardLayout: loadDashboardLayout()
            };
            localStorage.setItem('opennetworth_migration_recovery_v1', JSON.stringify(recoveryBackup));
            // 2. Inventory and difference resolution (Finding 3):
            // Start with SQLite collections and add any browser records missing in SQLite
            const mergedAssets = [
                ...vault.assets || []
            ];
            for (const la of localAssets){
                if (!mergedAssets.some((a)=>a.id === la.id)) {
                    mergedAssets.push(la);
                }
            }
            const mergedLiabs = [
                ...vault.liabilities || []
            ];
            for (const ll of localLiabs){
                if (!mergedLiabs.some((l)=>l.id === ll.id)) {
                    mergedLiabs.push(ll);
                }
            }
            const mergedGoals = [
                ...vault.goals || []
            ];
            for (const lg of localGoals){
                if (!mergedGoals.some((g)=>g.id === lg.id)) {
                    mergedGoals.push(lg);
                }
            }
            const mergedRecurring = [
                ...vault.recurring || []
            ];
            for (const lr of localRecurring){
                if (!mergedRecurring.some((r)=>r.id === lr.id)) {
                    mergedRecurring.push(lr);
                }
            }
            const mergedHistory = [
                ...vault.history || []
            ];
            for (const lh of localHistory){
                if (!mergedHistory.some((h)=>h.date === lh.date)) {
                    mergedHistory.push(lh);
                }
            }
            const mergedCashFlow = [
                ...vault.cashFlow || []
            ];
            for (const lcf of localCashFlow){
                if (!mergedCashFlow.some((cf)=>cf.month === lcf.month || cf.id === lcf.id)) {
                    mergedCashFlow.push(lcf);
                }
            }
            const mergedSettings = {
                ...localSettings || {},
                ...vault.settings || {}
            };
            const freedom = loadFreedomSettings();
            if (freedom && !mergedSettings.freedomSettings) {
                mergedSettings.freedomSettings = freedom;
            }
            const layout = loadDashboardLayout();
            if (layout && !mergedSettings.dashboardLayout) {
                mergedSettings.dashboardLayout = layout;
            }
            // 3. Commit the resolved inventory to SQLite
            const postRes = await fetch('/api/vault', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    assets: mergedAssets,
                    liabilities: mergedLiabs,
                    goals: mergedGoals,
                    recurring: mergedRecurring,
                    history: mergedHistory,
                    cashFlow: mergedCashFlow,
                    settings: mergedSettings
                })
            });
            // 4. Verify commit response before setting completion flag (Finding 2)
            if (!postRes.ok) {
                console.error('Migration POST commit failed with status:', postRes.status);
                localStorage.setItem('opennetworth_migration_error', `Migration failed to commit to SQLite: HTTP ${postRes.status}`);
                // DO NOT mark migration complete; keep source data preserved in browser storage
                return;
            }
            // Mark migration complete only after verified commit
            localStorage.setItem(MIGRATION_FLAG, 'true');
            localStorage.removeItem('opennetworth_migration_error');
            // Hydrate local cache with the authoritative merged data
            localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(mergedAssets));
            localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(mergedLiabs));
            localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(mergedGoals));
            localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(mergedRecurring));
            localStorage.setItem(STORAGE_KEYS.NET_WORTH_HISTORY, JSON.stringify(mergedHistory));
            localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(mergedCashFlow));
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(mergedSettings));
            if (mergedSettings.freedomSettings) {
                localStorage.setItem(STORAGE_KEYS.FREEDOM_SETTINGS, JSON.stringify(mergedSettings.freedomSettings));
            }
            if (mergedSettings.dashboardLayout) {
                localStorage.setItem(STORAGE_KEYS_DASHBOARD, JSON.stringify(mergedSettings.dashboardLayout));
            }
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        } else {
            // Post-migration: SQLite is authoritative.
            // Hydrate local cache directly from SQLite so deleted items never revive (Finding 4).
            if (vault.assets) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(vault.assets));
            if (vault.liabilities) localStorage.setItem(STORAGE_KEYS.LIABILITIES, JSON.stringify(vault.liabilities));
            if (vault.goals) localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(vault.goals));
            if (vault.recurring) localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(vault.recurring));
            if (vault.history) localStorage.setItem(STORAGE_KEYS.NET_WORTH_HISTORY, JSON.stringify(vault.history));
            if (vault.cashFlow) localStorage.setItem(STORAGE_KEYS.CASH_FLOW, JSON.stringify(vault.cashFlow));
            if (vault.settings) {
                const s = vault.settings.userSettings || vault.settings;
                localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
                if (vault.settings.freedomSettings) {
                    localStorage.setItem(STORAGE_KEYS.FREEDOM_SETTINGS, JSON.stringify(vault.settings.freedomSettings));
                }
                if (vault.settings.dashboardLayout) {
                    localStorage.setItem(STORAGE_KEYS_DASHBOARD, JSON.stringify(vault.settings.dashboardLayout));
                }
            }
            window.dispatchEvent(new Event('opennetworth_data_updated'));
        }
    } catch (e) {
        console.debug('Vault boot sync notice:', e);
    }
}
// Auto-trigger sync on browser boot
if ("TURBOPACK compile-time truthy", 1) {
    setTimeout(()=>{
        initVaultSync();
    }, 100);
}
function resetDashboardLayout() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.removeItem(STORAGE_KEYS_DASHBOARD);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/contexts/ProfileContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProfileProvider",
    ()=>ProfileProvider,
    "useProfile",
    ()=>useProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
const ProfileContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function ProfileProvider({ children }) {
    _s();
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])(); // Hook into URL changes
    const [profile, setProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [templateId, setTemplateId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const isDemoMode = !!templateId;
    // React to URL changes immediately
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProfileProvider.useEffect": ()=>{
            const simId = searchParams.get('simulatedProfileId');
            setTemplateId(simId); // If null, this exits demo mode
        }
    }["ProfileProvider.useEffect"], [
        searchParams
    ]);
    // Load data whenever templateId changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProfileProvider.useEffect": ()=>{
            refreshData();
        }
    }["ProfileProvider.useEffect"], [
        templateId
    ]);
    const refreshData = async ()=>{
        setIsLoading(true);
        try {
            if (templateId && ("TURBOPACK compile-time value", "https://yewqrleefomsdurnulvq.supabase.co")) {
                // Remote template view if explicitly configured
                await loadFromSupabase(templateId);
            } else {
                // Direct Instant Local Vault Mode (100% Private, On-Device)
                loadFromLocalStorage();
            }
        } catch  {
            // Safe fallback to local storage mode
            loadFromLocalStorage();
        } finally{
            setIsLoading(false);
        }
    };
    const handleMigration = async (userId)=>{
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        const migrationRequested = localStorage.getItem('clearworth_migration_requested') === 'true';
        if (migrationRequested) {
            try {
                // Dynamically import to avoid server-side issues
                const { MigrationService } = await __turbopack_context__.A("[project]/src/features/migration/migrationService.ts [app-client] (ecmascript, async loader)");
                // Double check if profile is empty? 
                // For now, we assume if the flag is set, we want to overwrite/seed.
                // Or we can check if the user has < 1 asset to avoid destroying real data?
                // Let's trust the flag for this version.
                await MigrationService.migrateToCloud(userId);
                MigrationService.clearLocalData();
                // Refresh to ensure we see the new data
                window.location.reload();
            } catch (e) {
                console.error("ProfileContext: Migration failed", e);
                // Clear flag to avoid infinite loops
                localStorage.removeItem('clearworth_migration_requested');
            }
        }
    };
    const loadFromSupabase = async (id)=>{
        // Migration Check BEFORE loading (or concurrent?)
        // If we migrate, we need to reload anyway.
        // Let's check first.
        await handleMigration(id);
        // Fetch Profile
        console.log("ProfileContext: Loading profile from Supabase...", id);
        const { data: prof, error } = await supabase.from('profiles').select('*').eq('id', id).single();
        if (error) {
            console.error("ProfileContext: FAILED to load profile:", error);
        } else if (prof) {
            console.log("ProfileContext: Loaded profile:", prof);
            setProfile(prof);
        }
    };
    const loadFromLocalStorage = ()=>{
        // Private on-device profile for OpenNetWorth
        const storedSettings = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadSettings"]();
        let customName = 'Local Vault Owner';
        if ("TURBOPACK compile-time truthy", 1) {
            const raw = localStorage.getItem('opennetworth_profile');
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed.full_name) customName = parsed.full_name;
                } catch  {
                // ignore parse error
                }
            }
        }
        setProfile({
            id: 'local_user',
            email: 'local@device',
            full_name: customName,
            privacy_mode: true,
            is_template: false,
            role: 'user',
            currency_code: storedSettings.baseCurrency,
            created_at: new Date().toISOString()
        });
    };
    // Actions
    const switchProfile = (id)=>{
        setTemplateId(id);
    };
    const updateCurrency = async (code)=>{
        console.log("Updating currency to:", code);
        // 1. Optimistic Update
        if (profile) {
            setProfile({
                ...profile,
                currency_code: code
            });
        }
        // 2. Persist
        if (profile?.id && profile.id !== 'local_user' && !isDemoMode) {
            // Auth User -> Supabase
            // Use "as never" to bypass strict "never" expectation in generated types for now.
            const { error } = await supabase.from('profiles').update({
                currency_code: code
            }).eq('id', profile.id);
            if (error) {
                console.error("Failed to update currency in Supabase:", error);
                // Revert if needed, but for now just log
                refreshData(); // Re-fetch true state
            }
        } else {
            // Guest or Demo -> LocalStorage + SQLite
            const settings = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadSettings"]();
            settings.baseCurrency = code;
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveSettings"](settings);
        // If strictly Guest, we are done (optimistic update holds).
        // If Demo, we probably shouldn't be here (Demo is read-only usually, or local override)
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ProfileContext.Provider, {
        value: {
            profile,
            isLoading,
            isDemoMode,
            canEdit: true,
            refreshData,
            switchProfile,
            updateCurrency
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/ProfileContext.tsx",
        lineNumber: 172,
        columnNumber: 9
    }, this);
}
_s(ProfileProvider, "rV6C8dJc2tMCJSWOEvEwP8HpOYk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
_c = ProfileProvider;
function useProfile() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(ProfileContext);
    if (!context) throw new Error("useProfile must be used within ProfileProvider");
    return context;
}
_s1(useProfile, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "ProfileProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/layout/Sidebar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Sidebar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/layout-dashboard.js [app-client] (ecmascript) <export default as LayoutDashboard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wallet.js [app-client] (ecmascript) <export default as Wallet>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/credit-card.js [app-client] (ecmascript) <export default as CreditCard>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$target$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Target$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/target.js [app-client] (ecmascript) <export default as Target>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-client] (ecmascript) <export default as DollarSign>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/calendar.js [app-client] (ecmascript) <export default as Calendar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/book-open.js [app-client] (ecmascript) <export default as BookOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ThemeToggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/ThemeToggle.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/contexts/ProfileContext.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
const navigation = [
    {
        name: 'Dashboard',
        href: '/',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$layout$2d$dashboard$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LayoutDashboard$3e$__["LayoutDashboard"]
    },
    {
        name: 'Accounting',
        href: '/accounting',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$book$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BookOpen$3e$__["BookOpen"]
    },
    {
        name: 'Assets',
        href: '/assets',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wallet$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wallet$3e$__["Wallet"]
    },
    {
        name: 'Liabilities',
        href: '/liabilities',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$credit$2d$card$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CreditCard$3e$__["CreditCard"]
    },
    {
        name: 'Goals',
        href: '/goals',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$target$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Target$3e$__["Target"]
    },
    {
        name: 'Cash Flow',
        href: '/cashflow',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__["DollarSign"]
    },
    {
        name: 'Growth Engine',
        href: '/portfolio',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"]
    },
    {
        name: 'Freedom',
        href: '/freedom',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$calendar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Calendar$3e$__["Calendar"]
    },
    {
        name: 'Mentors',
        href: '/mentors',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"]
    },
    {
        name: 'Privacy',
        href: '/privacy',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"]
    }
];
;
function Sidebar() {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const [isMobileOpen, setIsMobileOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const { isDemoMode, profile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"])();
    // Close mobile drawer on Escape key press (Finding 8, UX-02)
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Sidebar.useEffect": ()=>{
            if (!isMobileOpen) return;
            const handleKeyDown = {
                "Sidebar.useEffect.handleKeyDown": (e)=>{
                    if (e.key === 'Escape') {
                        setIsMobileOpen(false);
                    }
                }
            }["Sidebar.useEffect.handleKeyDown"];
            window.addEventListener('keydown', handleKeyDown);
            return ({
                "Sidebar.useEffect": ()=>window.removeEventListener('keydown', handleKeyDown)
            })["Sidebar.useEffect"];
        }
    }["Sidebar.useEffect"], [
        isMobileOpen
    ]);
    // Fallback for "God Mode" badge if URL param is present even if context hasn't loaded yet
    const simulatedProfileId = searchParams.get('simulatedProfileId');
    const showGodMode = isDemoMode || !!simulatedProfileId;
    const templateName = profile?.template_name || profile?.full_name || 'Template';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                onClick: ()=>setIsMobileOpen(!isMobileOpen),
                "aria-label": isMobileOpen ? "Close navigation menu" : "Open navigation menu",
                "aria-expanded": isMobileOpen,
                className: "md:hidden fixed top-4 right-4 z-50 p-2 bg-card rounded-lg shadow-sm border border-border text-foreground hover:bg-muted transition-colors cursor-pointer",
                children: isMobileOpen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                    size: 20
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                    lineNumber: 62,
                    columnNumber: 33
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                    size: 20
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                    lineNumber: 62,
                    columnNumber: 51
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 56,
                columnNumber: 13
            }, this),
            isMobileOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity",
                onClick: ()=>setIsMobileOpen(false),
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 67,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: cn("fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:translate-x-0 flex flex-col", isMobileOpen ? "translate-x-0" : "-translate-x-full"),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "h-16 flex items-center px-6 border-b border-border shrink-0 justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent",
                                    children: "OpenNetWorth"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 82,
                                    columnNumber: 25
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 81,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800",
                                children: "Local"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 86,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 80,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex-1 overflow-y-auto",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                            className: "p-4 space-y-1",
                            children: navigation.map((item)=>{
                                const isActive = pathname === item.href;
                                // Append query param if in God Mode
                                let finalHref = item.href;
                                if (simulatedProfileId) {
                                    finalHref += `?simulatedProfileId=${simulatedProfileId}`;
                                }
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: finalHref,
                                    onClick: ()=>setIsMobileOpen(false),
                                    className: cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200", isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"),
                                    "data-tour": `sidebar-${item.name.toLowerCase().replace(' ', '')}`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(item.icon, {
                                            size: 20,
                                            className: cn(isActive ? "text-blue-600" : "text-slate-400 group-hover:text-muted-foreground")
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                                            lineNumber: 116,
                                            columnNumber: 37
                                        }, this),
                                        item.name
                                    ]
                                }, item.href, true, {
                                    fileName: "[project]/src/components/layout/Sidebar.tsx",
                                    lineNumber: 104,
                                    columnNumber: 33
                                }, this);
                            })
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/Sidebar.tsx",
                            lineNumber: 93,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 92,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 border-t border-border shrink-0 flex flex-col gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3 mb-1 px-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-100 shrink-0",
                                        children: "ON"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 127,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex flex-col flex-1 min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm font-bold text-slate-700 dark:text-slate-200 truncate",
                                                children: profile?.full_name || 'Local Vault'
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                                lineNumber: 131,
                                                columnNumber: 29
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate",
                                                children: "🔒 100% On-Device"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                                lineNumber: 132,
                                                columnNumber: 29
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 130,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 126,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/privacy",
                                onClick: ()=>setIsMobileOpen(false),
                                className: "w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-muted rounded-lg transition-colors border border-border",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                        size: 16,
                                        className: "text-emerald-600"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                                        lineNumber: 141,
                                        columnNumber: 25
                                    }, this),
                                    "Backup / Restore Vault"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 136,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "h-px bg-border my-1"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 145,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$ThemeToggle$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 147,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-[10px] text-center text-slate-300",
                                children: "v 1.0.0"
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/Sidebar.tsx",
                                lineNumber: 148,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/layout/Sidebar.tsx",
                        lineNumber: 125,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 75,
                columnNumber: 13
            }, this),
            isMobileOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm",
                onClick: ()=>setIsMobileOpen(false)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/Sidebar.tsx",
                lineNumber: 156,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true);
}
_s(Sidebar, "kdymSWvonc8Xy62qPpiRvIvzmlE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$contexts$2f$ProfileContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProfile"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/layout/LayoutShell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LayoutShell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
/**
 * Main Layout Shell
 * 
 * Why this exists:
 * Wraps all application routes with the persistent navigation sidebar and responsive main content area.
 * 
 * Tricky logic:
 * - The `md:pl-64` sidebar offset is placed on an outer layout wrapper div rather than `<main>`.
 *   This ensures that responsive padding utilities on `<main>` (e.g., `lg:p-10`) do not override
 *   the 256px sidebar allowance at viewport breakpoints >= 1024px and 1280px (Finding 8).
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/layout/Sidebar.tsx [app-client] (ecmascript)");
'use client';
;
;
function LayoutShell({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex min-h-screen bg-background transition-colors duration-300",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$layout$2f$Sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {}, void 0, false, {
                fileName: "[project]/src/components/layout/LayoutShell.tsx",
                lineNumber: 20,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex-1 flex flex-col min-w-0 md:pl-64",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                    className: "flex-1 w-full overflow-x-hidden p-4 sm:p-6 lg:p-10",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "max-w-7xl mx-auto",
                        children: children
                    }, void 0, false, {
                        fileName: "[project]/src/components/layout/LayoutShell.tsx",
                        lineNumber: 23,
                        columnNumber: 21
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/layout/LayoutShell.tsx",
                    lineNumber: 22,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/layout/LayoutShell.tsx",
                lineNumber: 21,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/layout/LayoutShell.tsx",
        lineNumber: 19,
        columnNumber: 9
    }, this);
}
_c = LayoutShell;
var _c;
__turbopack_context__.k.register(_c, "LayoutShell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/onboarding/components/OnboardingTour.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OnboardingTour
]);
'use client';
function OnboardingTour() {
    return null;
}
_c = OnboardingTour;
var _c;
__turbopack_context__.k.register(_c, "OnboardingTour");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/onboarding/context/OnboardingContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OnboardingProvider",
    ()=>OnboardingProvider,
    "useOnboarding",
    ()=>useOnboarding
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
const OnboardingContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function OnboardingProvider({ children }) {
    _s();
    const [run, setRun] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const startTour = ()=>setRun(true);
    const stopTour = ()=>setRun(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(OnboardingContext.Provider, {
        value: {
            run,
            startTour,
            stopTour
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/features/onboarding/context/OnboardingContext.tsx",
        lineNumber: 20,
        columnNumber: 9
    }, this);
}
_s(OnboardingProvider, "TQayB/HTFjl1hL9uqs0l53lNyeE=");
_c = OnboardingProvider;
function useOnboarding() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(OnboardingContext);
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
}
_s1(useOnboarding, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "OnboardingProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/registry/widgetRegistry.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "getDefaultLayout",
    ()=>getDefaultLayout,
    "getWidgetById",
    ()=>getWidgetById
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
// Registry of all available widgets
const widgetRegistry = [
    // --- Stats ---
    {
        id: 'stat-networth',
        name: 'Total Net Worth',
        description: 'Your current total net worth summary',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/dashboard/widgets/StatNetWorthWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 1,
            h: 1
        },
        isRequired: true,
        category: 'stats'
    },
    {
        id: 'stat-assets',
        name: 'Total Assets',
        description: 'Summary of all your assets',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/assets/widgets/StatAssetsWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 1,
            h: 1
        },
        isRequired: false,
        category: 'stats'
    },
    {
        id: 'stat-liabilities',
        name: 'Total Liabilities',
        description: 'Summary of all your debts',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/liabilities/widgets/StatLiabilitiesWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 1,
            h: 1
        },
        isRequired: false,
        category: 'stats'
    },
    // --- Charts ---
    {
        id: 'chart-networth',
        name: 'Net Worth History',
        description: 'Historical trend of your net worth over time',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/dashboard/widgets/NetWorthChartWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 2,
            h: 2
        },
        minSize: {
            w: 2,
            h: 2
        },
        isRequired: true,
        category: 'charts'
    },
    {
        id: 'chart-allocation',
        name: 'Asset Allocation',
        description: 'Pie chart showing asset distribution',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/dashboard/widgets/AllocationChartWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 2,
            h: 1
        },
        minSize: {
            w: 1,
            h: 1
        },
        isRequired: false,
        category: 'charts'
    },
    // --- Insights ---
    {
        id: 'growth-engine',
        name: 'Growth Engine',
        description: 'Portfolio analysis and growth metrics',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/assets/widgets/GrowthEngineWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 2,
            h: 1
        },
        isRequired: false,
        category: 'insights'
    },
    {
        id: 'wisdom',
        name: 'Wisdom Board',
        description: 'AI Mentors and Philosophy',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/mentors/widgets/WisdomWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 1,
            h: 2
        },
        isRequired: false,
        category: 'insights'
    },
    // --- Tools ---
    {
        id: 'freedom-date',
        name: 'Freedom Date',
        description: 'Projected debt-free date',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/liabilities/widgets/FreedomDateWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 1,
            h: 1
        },
        isRequired: false,
        category: 'tools'
    },
    {
        id: 'travel-power',
        name: 'Travel Power',
        description: 'Net worth in travel terms',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/goals/widgets/TravelPowerWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 1,
            h: 1
        },
        isRequired: false,
        category: 'tools'
    },
    {
        id: 'momentum',
        name: 'Wealth Momentum',
        description: 'Financial velocity score',
        component: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["lazy"])(()=>__turbopack_context__.A("[project]/src/features/cashflow/widgets/MomentumWidget.tsx [app-client] (ecmascript, async loader)")),
        defaultSize: {
            w: 1,
            h: 1
        },
        isRequired: false,
        category: 'tools'
    }
];
const getWidgetById = (id)=>widgetRegistry.find((w)=>w.id === id);
const getDefaultLayout = ()=>{
    return {
        version: 1,
        hiddenWidgets: [],
        layouts: {
            lg: [
                {
                    i: 'stat-networth',
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-assets',
                    x: 1,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-liabilities',
                    x: 2,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'momentum',
                    x: 3,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'chart-networth',
                    x: 0,
                    y: 2,
                    w: 3,
                    h: 3
                },
                {
                    i: 'wisdom',
                    x: 3,
                    y: 2,
                    w: 1,
                    h: 3
                },
                {
                    i: 'freedom-date',
                    x: 0,
                    y: 5,
                    w: 1,
                    h: 2
                },
                {
                    i: 'travel-power',
                    x: 1,
                    y: 5,
                    w: 1,
                    h: 2
                },
                {
                    i: 'chart-allocation',
                    x: 2,
                    y: 5,
                    w: 2,
                    h: 2
                },
                {
                    i: 'growth-engine',
                    x: 0,
                    y: 7,
                    w: 4,
                    h: 2
                }
            ],
            md: [
                {
                    i: 'stat-networth',
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-assets',
                    x: 1,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-liabilities',
                    x: 2,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'chart-networth',
                    x: 0,
                    y: 2,
                    w: 2,
                    h: 3
                },
                {
                    i: 'wisdom',
                    x: 2,
                    y: 2,
                    w: 1,
                    h: 3
                },
                {
                    i: 'momentum',
                    x: 0,
                    y: 5,
                    w: 1,
                    h: 2
                },
                {
                    i: 'freedom-date',
                    x: 1,
                    y: 5,
                    w: 1,
                    h: 2
                },
                {
                    i: 'travel-power',
                    x: 2,
                    y: 5,
                    w: 1,
                    h: 2
                },
                {
                    i: 'chart-allocation',
                    x: 0,
                    y: 7,
                    w: 2,
                    h: 2
                },
                {
                    i: 'growth-engine',
                    x: 0,
                    y: 9,
                    w: 3,
                    h: 2
                }
            ],
            sm: [
                {
                    i: 'stat-networth',
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-assets',
                    x: 1,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-liabilities',
                    x: 0,
                    y: 2,
                    w: 1,
                    h: 2
                },
                {
                    i: 'momentum',
                    x: 1,
                    y: 2,
                    w: 1,
                    h: 2
                },
                {
                    i: 'chart-networth',
                    x: 0,
                    y: 4,
                    w: 2,
                    h: 3
                },
                {
                    i: 'freedom-date',
                    x: 0,
                    y: 7,
                    w: 1,
                    h: 2
                },
                {
                    i: 'travel-power',
                    x: 1,
                    y: 7,
                    w: 1,
                    h: 2
                },
                {
                    i: 'wisdom',
                    x: 0,
                    y: 9,
                    w: 2,
                    h: 2
                },
                {
                    i: 'chart-allocation',
                    x: 0,
                    y: 11,
                    w: 2,
                    h: 2
                },
                {
                    i: 'growth-engine',
                    x: 0,
                    y: 13,
                    w: 2,
                    h: 2
                }
            ],
            xs: [
                {
                    i: 'stat-networth',
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'chart-networth',
                    x: 0,
                    y: 2,
                    w: 1,
                    h: 3
                },
                {
                    i: 'wisdom',
                    x: 0,
                    y: 5,
                    w: 1,
                    h: 2
                },
                {
                    i: 'freedom-date',
                    x: 0,
                    y: 7,
                    w: 1,
                    h: 2
                },
                {
                    i: 'travel-power',
                    x: 0,
                    y: 9,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-assets',
                    x: 0,
                    y: 11,
                    w: 1,
                    h: 1
                },
                {
                    i: 'stat-liabilities',
                    x: 0,
                    y: 12,
                    w: 1,
                    h: 1
                },
                {
                    i: 'momentum',
                    x: 0,
                    y: 13,
                    w: 1,
                    h: 1
                },
                {
                    i: 'chart-allocation',
                    x: 0,
                    y: 14,
                    w: 1,
                    h: 2
                },
                {
                    i: 'growth-engine',
                    x: 0,
                    y: 16,
                    w: 1,
                    h: 2
                }
            ],
            xxs: [
                {
                    i: 'stat-networth',
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 2
                },
                {
                    i: 'chart-networth',
                    x: 0,
                    y: 2,
                    w: 1,
                    h: 3
                },
                {
                    i: 'wisdom',
                    x: 0,
                    y: 5,
                    w: 1,
                    h: 2
                },
                {
                    i: 'freedom-date',
                    x: 0,
                    y: 7,
                    w: 1,
                    h: 2
                },
                {
                    i: 'travel-power',
                    x: 0,
                    y: 9,
                    w: 1,
                    h: 2
                },
                {
                    i: 'stat-assets',
                    x: 0,
                    y: 11,
                    w: 1,
                    h: 1
                },
                {
                    i: 'stat-liabilities',
                    x: 0,
                    y: 12,
                    w: 1,
                    h: 1
                },
                {
                    i: 'momentum',
                    x: 0,
                    y: 13,
                    w: 1,
                    h: 1
                },
                {
                    i: 'chart-allocation',
                    x: 0,
                    y: 14,
                    w: 1,
                    h: 2
                },
                {
                    i: 'growth-engine',
                    x: 0,
                    y: 16,
                    w: 1,
                    h: 2
                }
            ]
        }
    };
};
const __TURBOPACK__default__export__ = widgetRegistry;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/dashboard/context/DashboardContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DashboardProvider",
    ()=>DashboardProvider,
    "useDashboard",
    ()=>useDashboard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$registry$2f$widgetRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/registry/widgetRegistry.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
const DashboardContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function DashboardProvider({ children }) {
    _s();
    // --- Layout State ---
    const [isEditMode, setIsEditMode] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [layout, setLayout] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$registry$2f$widgetRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDefaultLayout"])());
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DashboardProvider.useEffect": ()=>{
            // Ensure consistent hydration - only load from storage on client mount
            const saved = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["loadDashboardLayout"])();
            if (saved) {
                setLayout(saved);
            }
        }
    }["DashboardProvider.useEffect"], []);
    const updateLayout = (newLayout)=>{
        setLayout((prev)=>{
            const updated = typeof newLayout === 'function' ? newLayout(prev) : newLayout;
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveDashboardLayout"])(updated);
            return updated;
        });
    };
    const hideWidget = (id)=>{
        const newLayout = {
            ...layout,
            hiddenWidgets: [
                ...layout.hiddenWidgets,
                id
            ]
        };
        updateLayout(newLayout);
    };
    const showWidget = (id)=>{
        const newLayout = {
            ...layout,
            hiddenWidgets: layout.hiddenWidgets.filter((wId)=>wId !== id)
        };
        updateLayout(newLayout);
    };
    const resetLayout = ()=>{
        const def = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$registry$2f$widgetRegistry$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getDefaultLayout"])();
        updateLayout(def);
        // Force reload from registry just in case
        window.location.reload();
    };
    // --- Settings Modal State ---
    const [isSettingsOpen, setIsSettingsOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const openSettings = ()=>setIsSettingsOpen(true);
    const closeSettings = ()=>setIsSettingsOpen(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DashboardContext.Provider, {
        value: {
            isEditMode,
            setIsEditMode,
            layout,
            updateLayout,
            hideWidget,
            showWidget,
            resetLayout,
            openSettings,
            closeSettings,
            isSettingsOpen
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/features/dashboard/context/DashboardContext.tsx",
        lineNumber: 77,
        columnNumber: 9
    }, this);
}
_s(DashboardProvider, "KJq5pNY5DlTqTKZAMvJDZGOU/tA=");
_c = DashboardProvider;
const useDashboard = ()=>{
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(DashboardContext);
    if (!context) throw new Error('useDashboard must be used within DashboardProvider');
    return context;
};
_s1(useDashboard, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "DashboardProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/demo/demoFactory.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateDemoProfile",
    ()=>generateDemoProfile
]);
// Helper to map UI investment type to internal assetClass
function mapInvestmentTypeToAssetClass(type) {
    switch(type){
        case 'Stock':
            return 'stock';
        case 'ETF':
            return 'etf';
        case 'Index Fund':
            return 'index_fund';
        case 'Mutual Fund':
            return 'mutual_fund';
        case 'Bond':
            return 'bond';
        case 'Real Estate':
            return 'real_estate';
        default:
            return 'other';
    }
}
const MOCK_PRICES = {
    'VTI': 293,
    'TSLA': 358,
    'AAPL': 189,
    'VOO': 502,
    'BTC': 42500,
    'ETH': 2350,
    'SCHD': 78,
    'QQQ': 408,
    'BND': 72,
    'VT': 105,
    'MSFT': 420,
    'NVDA': 950,
    'AMZN': 185,
    'MOCK': 100 // Fallback
};
const MOCK_YIELDS = {
    'SCHD': 3.4,
    'VT': 2.0,
    'VTI': 1.5,
    'VOO': 1.4,
    'BND': 3.0,
    'MSFT': 0.7,
    'AAPL': 0.5,
    'NVDA': 0.05,
    'AMZN': 0,
    'BTC': 0,
    'ETH': 0
};
function generateDemoProfile(cfg) {
    const now = new Date().toISOString();
    // Generate Assets
    const assets = cfg.assets.map((a, i)=>{
        const isLiquid = a.type === 'cash';
        let investment = undefined;
        if (a.investmentType) {
            const ticker = a.ticker || 'MOCK';
            // Use realistic price if available, otherwise assume $100
            const price = MOCK_PRICES[ticker] || 100;
            // Calculate shares to match the total value (approx)
            const shares = a.value / price;
            // Cost basis is assumed to be lower (gains)
            const costBasisPerShare = price * 0.8; // 20% gain built in
            investment = {
                ticker: ticker,
                shares: parseFloat(shares.toFixed(4)),
                costBasis: parseFloat((shares * costBasisPerShare).toFixed(2)),
                assetClass: mapInvestmentTypeToAssetClass(a.investmentType),
                currentPrice: price,
                dividendYield: MOCK_YIELDS[ticker] || 0,
                sector: 'Diversified',
                lastPriceUpdate: now
            };
        }
        return {
            id: `${cfg.id}-a-${i}`,
            user_id: cfg.id,
            name: a.name,
            type: a.type,
            value: a.value,
            currency: 'USD',
            is_liquid: isLiquid,
            last_updated: now,
            investment_details: investment
        };
    });
    // Generate Liabilities
    const liabilities = cfg.liabilities.map((l, i)=>({
            id: `${cfg.id}-l-${i}`,
            user_id: 'demo',
            name: l.name,
            type: l.type,
            balance: l.balance,
            interest_rate: l.interest,
            minimum_payment: l.minPayment || Math.round(l.balance * 0.03),
            is_good_debt: l.type === 'mortgage' || l.type === 'student_loan',
            currency: 'USD',
            last_updated: now
        }));
    // Generate Recurring
    const recurring = [
        {
            id: `${cfg.id}-r-inc`,
            name: 'Primary Income',
            type: 'income',
            amount: cfg.income,
            frequency: 'monthly',
            category: 'Salary',
            start_date: '2024-01-01',
            is_active: true
        },
        {
            id: `${cfg.id}-r-exp`,
            name: 'Living Expenses',
            type: 'expense',
            amount: cfg.expenses,
            frequency: 'monthly',
            category: 'General',
            start_date: '2024-01-01',
            is_active: true
        }
    ];
    // Generate Goals (or defaults if missing)
    const goals = (cfg.goals || []).map((g, i)=>({
            id: `${cfg.id}-g-${i}`,
            name: g.name,
            target_amount: g.target,
            current_amount: g.current,
            start_amount: g.current * 0.5,
            category: g.category,
            deadline: g.deadline || '2026-01-01',
            created_at: now
        }));
    return {
        assets,
        liabilities,
        recurring,
        goals
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/demo/demoConfigs.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BUILDING_FOUNDATIONS_CONFIG",
    ()=>BUILDING_FOUNDATIONS_CONFIG,
    "FAMILY_CONFIG",
    ()=>FAMILY_CONFIG,
    "GETTING_STARTED_CONFIG",
    ()=>GETTING_STARTED_CONFIG,
    "GROWING_WEALTH_CONFIG",
    ()=>GROWING_WEALTH_CONFIG,
    "STABILIZING_CONFIG",
    ()=>STABILIZING_CONFIG
]);
const GETTING_STARTED_CONFIG = {
    id: 'start',
    label: 'Getting Started',
    description: 'Early career or student.',
    baseCash: 0,
    income: 3200,
    expenses: 2900,
    assets: [
        {
            name: 'Checking Account',
            type: 'cash',
            value: 800
        },
        {
            name: 'Savings Stash',
            type: 'cash',
            value: 1200
        },
        {
            name: 'Used Sedan',
            type: 'other',
            value: 5500
        }
    ],
    liabilities: [
        {
            name: 'Student Loans',
            type: 'student_loan',
            balance: 18000,
            interest: 5.5,
            minPayment: 150
        },
        {
            name: 'Credit Card',
            type: 'credit_card',
            balance: 2100,
            interest: 24.99,
            minPayment: 75
        }
    ],
    goals: [
        {
            name: 'Emergency Fund $2k',
            target: 2000,
            current: 1200,
            category: 'savings'
        },
        {
            name: 'Pay Off Credit Card',
            target: 0,
            current: 2100,
            category: 'debt_payoff'
        }
    ]
};
const STABILIZING_CONFIG = {
    id: 'stab',
    label: 'Stabilizing',
    description: 'Focus on debt & savings.',
    baseCash: 0,
    income: 4500,
    expenses: 3900,
    assets: [
        {
            name: 'High Yield Savings',
            type: 'cash',
            value: 6000
        },
        {
            name: 'Checking',
            type: 'cash',
            value: 1500
        },
        {
            name: 'Car',
            type: 'other',
            value: 11000
        }
    ],
    liabilities: [
        {
            name: 'Auto Loan',
            type: 'auto_loan',
            balance: 8500,
            interest: 6.2,
            minPayment: 280
        },
        {
            name: 'Credit Card',
            type: 'credit_card',
            balance: 800,
            interest: 19.9,
            minPayment: 40
        }
    ],
    goals: [
        {
            name: '3-Month Emergency Fund',
            target: 12000,
            current: 6000,
            category: 'savings'
        },
        {
            name: 'Start Investing',
            target: 5000,
            current: 0,
            category: 'investment'
        }
    ]
};
const BUILDING_FOUNDATIONS_CONFIG = {
    id: 'build',
    label: 'Building Foundations',
    description: 'Consistent investing.',
    baseCash: 0,
    income: 5800,
    expenses: 4200,
    assets: [
        {
            name: 'Emergency Fund',
            type: 'cash',
            value: 15000
        },
        {
            name: 'Vanguard Total Market',
            type: 'investment',
            value: 16000,
            investmentType: 'Index Fund',
            ticker: 'VTI'
        },
        {
            name: 'Apple Stock',
            type: 'investment',
            value: 2000,
            investmentType: 'Stock',
            ticker: 'AAPL'
        },
        {
            name: 'Tech Growth Stock',
            type: 'investment',
            value: 5000,
            investmentType: 'Stock',
            ticker: 'QQQ'
        },
        {
            name: 'Government Bonds',
            type: 'investment',
            value: 5000,
            investmentType: 'Bond',
            ticker: 'BND'
        }
    ],
    liabilities: [
        {
            name: 'Student Loan',
            type: 'student_loan',
            balance: 6500,
            interest: 4.2,
            minPayment: 120
        }
    ],
    goals: [
        {
            name: 'Net Worth $100k',
            target: 100000,
            current: 43000,
            category: 'net_worth'
        }
    ]
};
const FAMILY_CONFIG = {
    id: 'fam',
    label: 'Working Family',
    description: 'Home & dependents.',
    baseCash: 0,
    income: 8500,
    expenses: 7200,
    assets: [
        {
            name: 'Primary Residence',
            type: 'real_estate',
            value: 420000
        },
        {
            name: '401k / Retirement',
            type: 'retirement',
            value: 82000,
            investmentType: 'Mutual Fund'
        },
        {
            name: 'Stock Portfolio',
            type: 'investment',
            value: 3000,
            investmentType: 'Stock',
            ticker: 'AMZN'
        },
        {
            name: 'Family Savings',
            type: 'cash',
            value: 18000
        },
        {
            name: 'Minivan',
            type: 'other',
            value: 24000
        }
    ],
    liabilities: [
        {
            name: 'Mortgage',
            type: 'mortgage',
            balance: 340000,
            interest: 5.8,
            minPayment: 2100
        },
        {
            name: 'Car Loan',
            type: 'auto_loan',
            balance: 14000,
            interest: 5.9,
            minPayment: 380
        }
    ],
    goals: [
        {
            name: 'College Fund',
            target: 50000,
            current: 5000,
            category: 'savings'
        },
        {
            name: 'Pay Off Car',
            target: 0,
            current: 14000,
            category: 'debt_payoff'
        }
    ]
};
const GROWING_WEALTH_CONFIG = {
    id: 'grow',
    label: 'Growing Wealth',
    description: 'Optimization & scale.',
    baseCash: 0,
    income: 14000,
    expenses: 6500,
    assets: [
        {
            name: 'Investment Property',
            type: 'real_estate',
            value: 580000
        },
        {
            name: 'Global ETF Portfolio',
            type: 'investment',
            value: 200000,
            investmentType: 'ETF',
            ticker: 'VT'
        },
        {
            name: 'Dividend Stocks',
            type: 'investment',
            value: 100000,
            investmentType: 'Stock',
            ticker: 'SCHD'
        },
        {
            name: 'Microsoft',
            type: 'investment',
            value: 35000,
            investmentType: 'Stock',
            ticker: 'MSFT'
        },
        {
            name: 'Nvidia',
            type: 'investment',
            value: 25000,
            investmentType: 'Stock',
            ticker: 'NVDA'
        },
        {
            name: 'Crypto Holdings',
            type: 'crypto',
            value: 15000,
            investmentType: 'Stock',
            ticker: 'BTC'
        },
        {
            name: 'Cash Reserves',
            type: 'cash',
            value: 50000
        }
    ],
    liabilities: [
        {
            name: 'Rental Mortgage',
            type: 'mortgage',
            balance: 320000,
            interest: 4.5,
            minPayment: 1800
        },
        {
            name: 'Primary Mortgage',
            type: 'mortgage',
            balance: 0,
            interest: 0,
            minPayment: 0
        } // Paid off example
    ],
    goals: [
        {
            name: 'Financial Freedom',
            target: 2000000,
            current: 1005000,
            category: 'net_worth'
        }
    ]
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/demo/demoProfiles.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ASPIRATIONAL_DATA",
    ()=>ASPIRATIONAL_DATA,
    "BUILDING_FOUNDATIONS_DATA",
    ()=>BUILDING_FOUNDATIONS_DATA,
    "FAMILY_DATA",
    ()=>FAMILY_DATA,
    "GETTING_STARTED_DATA",
    ()=>GETTING_STARTED_DATA,
    "GROWING_WEALTH_DATA",
    ()=>GROWING_WEALTH_DATA,
    "STABILIZING_DATA",
    ()=>STABILIZING_DATA,
    "STARTER_DATA",
    ()=>STARTER_DATA
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/demo/demoFactory.ts [app-client] (ecmascript)");
// Demo Profiles - Re-exported for usage (Force Update)
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoConfigs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/demo/demoConfigs.ts [app-client] (ecmascript)");
;
;
// Generate base data
const p1 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateDemoProfile"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoConfigs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GETTING_STARTED_CONFIG"]);
const p2 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateDemoProfile"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoConfigs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STABILIZING_CONFIG"]);
const p3 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateDemoProfile"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoConfigs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BUILDING_FOUNDATIONS_CONFIG"]);
const p4 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateDemoProfile"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoConfigs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_CONFIG"]);
const p5 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoFactory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["generateDemoProfile"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoConfigs$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GROWING_WEALTH_CONFIG"]);
function hydrateProfile(gen) {
    return {
        assets: gen.assets,
        liabilities: gen.liabilities,
        recurring: gen.recurring,
        goals: gen.goals,
        history: [],
        cashflow: [] // Generated dynamically in demoMode
    };
}
const GETTING_STARTED_DATA = hydrateProfile(p1);
const STABILIZING_DATA = hydrateProfile(p2);
const BUILDING_FOUNDATIONS_DATA = hydrateProfile(p3);
const FAMILY_DATA = hydrateProfile(p4);
const GROWING_WEALTH_DATA = hydrateProfile(p5);
const STARTER_DATA = GETTING_STARTED_DATA;
const ASPIRATIONAL_DATA = GROWING_WEALTH_DATA; // Aliasing old name to new equivalent
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils/currencyScale.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CURRENCY_MULTIPLIER",
    ()=>CURRENCY_MULTIPLIER,
    "scaleAmount",
    ()=>scaleAmount
]);
const CURRENCY_MULTIPLIER = {
    USD: 1,
    AUD: 1.5,
    PHP: 55
};
function scaleAmount(amount, currency) {
    return Math.round(amount * (CURRENCY_MULTIPLIER[currency] ?? 1));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/demo/demoMode.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "convertDemoToReal",
    ()=>convertDemoToReal,
    "enableDemoMode",
    ()=>enableDemoMode,
    "enableDemoModeFromData",
    ()=>enableDemoModeFromData,
    "exitDemoMode",
    ()=>exitDemoMode,
    "isDemoMode",
    ()=>isDemoMode,
    "resetApp",
    ()=>resetApp
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/local_driver.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/utils/supabase/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoProfiles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/demo/demoProfiles.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/sampleData.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils/currencyScale.ts [app-client] (ecmascript)");
;
;
;
;
;
const DEMO_MODE_KEY = 'clearworth_demo_mode'; // v2
function isDemoMode() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}
function getProfileData(type) {
    switch(type){
        case 'getting_started':
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoProfiles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GETTING_STARTED_DATA"];
        case 'stabilizing':
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoProfiles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STABILIZING_DATA"];
        case 'building':
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoProfiles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BUILDING_FOUNDATIONS_DATA"];
        case 'family':
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoProfiles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["FAMILY_DATA"];
        case 'growing':
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoProfiles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GROWING_WEALTH_DATA"];
        default:
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoProfiles$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["GETTING_STARTED_DATA"];
    }
}
function getProfileLabel(type) {
    switch(type){
        case 'getting_started':
            return 'Getting Started';
        case 'stabilizing':
            return 'Stabilizing';
        case 'building':
            return 'Building Foundations';
        case 'family':
            return 'Working Family';
        case 'growing':
            return 'Growing Wealth';
        default:
            return 'Sample Data';
    }
}
function generateHistory(baseAssets, baseLiabilities, currency) {
    const history = [];
    const today = new Date();
    let curAssets = baseAssets;
    let curLiabilities = baseLiabilities;
    // Generate 24 months back
    for(let i = 0; i < 24; i++){
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const dateStr = d.toISOString().split('T')[0];
        // Reverse growth simulation
        // Previous month was likely smaller (so we divide by 1+growth)
        // Assets grew ~0.8% typically
        curAssets = curAssets / (1 + (0.005 + Math.random() * 0.005));
        // Liabilities were likely HIGHER (so we add payments)
        curLiabilities = curLiabilities + ((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(500, currency) + Math.random() * (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(200, currency));
        history.push({
            id: crypto.randomUUID(),
            date: dateStr,
            totalAssets: Math.round(curAssets),
            totalLiabilities: Math.round(curLiabilities),
            netWorth: Math.round(curAssets - curLiabilities)
        });
    }
    return history.reverse(); // Return chronological
}
function generateCashFlow(profile, currency) {
    const entries = [];
    const today = new Date();
    // Calculate base monthly from recurring
    const baseIncome = profile.recurring.filter((r)=>r.type === 'income').reduce((sum, r)=>sum + r.amount, 0);
    const baseExpense = profile.recurring.filter((r)=>r.type === 'expense').reduce((sum, r)=>sum + r.amount, 0);
    // Generate 12 months
    for(let i = 0; i < 12; i++){
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
        // Add variety
        const income = Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(baseIncome, currency) + (Math.random() * (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(200, currency) - (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(100, currency)));
        const expenses = Math.round((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(baseExpense, currency) + (Math.random() * (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(400, currency) - (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(100, currency)));
        entries.push({
            id: `cf-${i}`,
            month: monthStr,
            income,
            expenses
        });
    }
    return entries;
}
function generateCashFlowFromRecurring(recurring, currency) {
    const entries = [];
    const today = new Date();
    const baseIncome = recurring.filter((r)=>r.type === 'income').reduce((sum, r)=>sum + r.amount, 0);
    const baseExpense = recurring.filter((r)=>r.type === 'expense').reduce((sum, r)=>sum + r.amount, 0);
    // Generate 12 months
    for(let i = 0; i < 12; i++){
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = d.toISOString().slice(0, 7);
        // Less variance for templates as they are specific
        const income = Math.round(baseIncome);
        const expenses = Math.round(baseExpense);
        entries.push({
            id: `cf-${i}`,
            month: monthStr,
            income,
            expenses
        });
    }
    return entries;
}
function enableDemoMode(profileType = 'getting_started', currency = 'USD') {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Set flag
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem('clearworth_initialized', 'true');
    const baseData = getProfileData(profileType);
    localStorage.setItem('clearworth_demo_profile_label', getProfileLabel(profileType));
    // Scale Logic Helper
    const scaleAsset = (a)=>({
            ...a,
            value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(a.value, currency),
            currency: currency
        });
    const scaleLiability = (l)=>({
            ...l,
            balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(l.balance, currency),
            minimum_payment: l.minimum_payment ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(l.minimum_payment, currency) : 0,
            currency: currency
        });
    const scaleGoal = (g)=>({
            ...g,
            target_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(g.target_amount, currency),
            current_amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(g.current_amount, currency),
            start_amount: g.start_amount ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(g.start_amount, currency) : 0
        });
    const scaleRecurring = (r)=>({
            ...r,
            amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(r.amount, currency)
        });
    // 1. Scale Assets & Liabs
    const assets = baseData.assets.map(scaleAsset);
    const liabilities = baseData.liabilities.map(scaleLiability);
    const goals = baseData.goals.map(scaleGoal);
    const recurring = baseData.recurring.map(scaleRecurring);
    // 2. Generate History based on these new totals
    const totalAssets = assets.reduce((sum, a)=>sum + a.value, 0);
    const totalLiabs = liabilities.reduce((sum, l)=>sum + l.balance, 0);
    const history = generateHistory(totalAssets, totalLiabs, currency);
    const cashflow = generateCashFlow(baseData, currency); // Pass base data, function handles scaling inside
    // Save
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveAssets"])(assets);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveLiabilities"])(liabilities);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveGoals"])(goals);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveNetWorthHistory"])(history);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveRecurringTransactions"])(recurring);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveCashFlow"])(cashflow);
    // Load Extras (Mentors, Quotes) - No scaling needed for text, but settings might need it
    localStorage.setItem('custom_mentors', JSON.stringify(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_MENTORS"]));
    localStorage.setItem('saved_quotes', JSON.stringify(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_QUOTES"]));
    // Scale Payment Setting
    const freedomSettings = {
        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_FREEDOM_SETTINGS"],
        extraMonthlyPayment: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2f$currencyScale$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scaleAmount"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_FREEDOM_SETTINGS"].extraMonthlyPayment, currency)
    };
    localStorage.setItem('clearworth_freedom_settings', JSON.stringify(freedomSettings));
    localStorage.setItem('clearworth_price_cache', JSON.stringify(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_PRICE_CACHE"]));
    // Initialize Last Check-In to NOW to prevent immediate popup
    const currentSettings = JSON.parse(localStorage.getItem('clearworth_settings') || '{}');
    const newSettings = {
        baseCurrency: 'USD',
        theme: 'system',
        checkInFrequency: 'monthly',
        ...currentSettings,
        lastCheckIn: new Date().toISOString()
    };
    localStorage.setItem('clearworth_settings', JSON.stringify(newSettings));
    // Force reload
    window.location.reload();
}
function enableDemoModeFromData(data) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Set flag
    localStorage.setItem(DEMO_MODE_KEY, 'true');
    localStorage.setItem('clearworth_initialized', 'true');
    localStorage.setItem('clearworth_demo_profile_label', data.profile.full_name || 'Template');
    localStorage.setItem('clearworth_demo_origin_id', data.profile.id); // Save Origin ID for badges
    const currency = data.profile.currency_code;
    // Override User ID to 'local_user' for all items to ensure they are editable in Guest Mode
    // 1. Assets
    const assets = data.assets.map((a)=>({
            ...a,
            user_id: 'local_user'
        }));
    // 2. Liabilities
    const liabilities = data.liabilities.map((l)=>({
            ...l,
            user_id: 'local_user'
        }));
    // 3. Goals
    const goals = data.goals.map((g)=>({
            ...g,
            user_id: 'local_user'
        }));
    // 4. Recurring Transactions
    const recurring = data.recurring.map((r)=>({
            ...r,
            user_id: 'local_user'
        }));
    // 5. Generate History based on these totals
    const totalAssets = assets.reduce((sum, a)=>sum + a.value, 0);
    const totalLiabs = liabilities.reduce((sum, l)=>sum + l.balance, 0);
    const history = generateHistory(totalAssets, totalLiabs, currency);
    const cashflow = generateCashFlowFromRecurring(recurring, currency); // This needs checking if it expects user_id
    // Save
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveAssets"])(assets);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveLiabilities"])(liabilities);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveGoals"])(goals);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveNetWorthHistory"])(history);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveRecurringTransactions"])(recurring);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveCashFlow"])(cashflow);
    // Load Extras
    localStorage.setItem('custom_mentors', JSON.stringify(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_MENTORS"]));
    localStorage.setItem('saved_quotes', JSON.stringify(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_QUOTES"]));
    // Freedom Settings default
    const freedomSettings = {
        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_FREEDOM_SETTINGS"]
    };
    localStorage.setItem('clearworth_freedom_settings', JSON.stringify(freedomSettings));
    localStorage.setItem('clearworth_price_cache', JSON.stringify(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$sampleData$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SAMPLE_PRICE_CACHE"]));
    // Settings
    const currentSettings = JSON.parse(localStorage.getItem('clearworth_settings') || '{}');
    const newSettings = {
        baseCurrency: currency,
        theme: 'system',
        checkInFrequency: 'monthly',
        ...currentSettings,
        lastCheckIn: new Date().toISOString()
    };
    localStorage.setItem('clearworth_settings', JSON.stringify(newSettings));
    // Force logout (clear session) so ProfileContext falls back to LocalStorage
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$utils$2f$supabase$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createClient"])().auth.signOut().then(()=>{
        // Force reload WITHOUT params to enter Guest Mode (Local Storage)
        window.location.href = '/';
    });
}
function exitDemoMode() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.setItem('clearworth_initialized', 'true');
    // We do NOT clear data here usually, so user can "keep" it if they want? 
    // Actually standard behavior is usually wipe.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAllData"])();
    window.location.reload();
}
function resetApp() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem('clearworth_initialized');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAllData"])();
    window.location.reload();
}
function convertDemoToReal(keepHistory = false) {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // 1. Remove the demo flag - this makes the data "real" (Guest Mode)
    localStorage.removeItem(DEMO_MODE_KEY);
    // 2. Set a flag to indicate we want to migrate this data upon Login
    localStorage.setItem('clearworth_migration_requested', 'true');
    // 3. Keep History?
    if (!keepHistory) {
        // If we don't want history, we wipe it.
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveNetWorthHistory"])([]);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$local_driver$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["saveCashFlow"])([]);
    }
    // 4. Reload to local vault dashboard with saved demo data
    window.location.href = '/';
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/layout/DemoBanner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DemoBanner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoMode$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/demo/demoMode.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/rotate-ccw.js [app-client] (ecmascript) <export default as RotateCcw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
/**
 * Why this file exists:
 * Displays a non-intrusive status banner when the user is previewing a sample profile
 * or benchmark data in OpenNetWorth, providing one-click options to reset or keep.
 *
 * Tricky logic:
 * - In local-first mode, "Keep Data" simply converts the sample profile into the user's
 *   active on-device vault without prompting for remote SaaS account creation.
 *
 * TODO items:
 * - Support saving multiple local profiles/vaults with a fast local switcher.
 */ 'use client';
;
;
;
function DemoBanner() {
    _s();
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [label, setLabel] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DemoBanner.useEffect": ()=>{
            setVisible((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoMode$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isDemoMode"])());
            const savedLabel = localStorage.getItem('opennetworth_demo_profile_label') || localStorage.getItem('clearworth_demo_profile_label') || 'Sample Data';
            setLabel(savedLabel);
        }
    }["DemoBanner.useEffect"], []);
    if (!visible) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-4 py-2.5",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-semibold",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                            size: 15,
                            className: "text-amber-600 dark:text-amber-400 shrink-0"
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/DemoBanner.tsx",
                            lineNumber: 38,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: [
                                "Sample Data Mode: Viewing ",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: label
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/DemoBanner.tsx",
                                    lineNumber: 39,
                                    columnNumber: 53
                                }, this),
                                "."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/layout/DemoBanner.tsx",
                            lineNumber: 39,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layout/DemoBanner.tsx",
                    lineNumber: 37,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-2 shrink-0",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>{
                                if (confirm('Adopt this sample data as your permanent local vault?')) {
                                    __turbopack_context__.A("[project]/src/features/demo/demoMode.ts [app-client] (ecmascript, async loader)").then((m)=>m.convertDemoToReal(true));
                                }
                            },
                            className: "text-xs font-bold bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-slate-800 px-3 py-1 rounded-full transition-colors shadow-sm",
                            children: "Keep as My Vault"
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/DemoBanner.tsx",
                            lineNumber: 42,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$demo$2f$demoMode$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["exitDemoMode"],
                            className: "text-xs font-bold bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-200 px-3 py-1 rounded-full transition-colors flex items-center gap-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rotate$2d$ccw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RotateCcw$3e$__["RotateCcw"], {
                                    size: 12
                                }, void 0, false, {
                                    fileName: "[project]/src/components/layout/DemoBanner.tsx",
                                    lineNumber: 56,
                                    columnNumber: 25
                                }, this),
                                "Exit Sample Data"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/layout/DemoBanner.tsx",
                            lineNumber: 52,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layout/DemoBanner.tsx",
                    lineNumber: 41,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/layout/DemoBanner.tsx",
            lineNumber: 36,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/layout/DemoBanner.tsx",
        lineNumber: 35,
        columnNumber: 9
    }, this);
}
_s(DemoBanner, "Wnbl4hze7KcYJiN+ryblXnhuph4=");
_c = DemoBanner;
var _c;
__turbopack_context__.k.register(_c, "DemoBanner");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/providers/QueryProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>QueryProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function QueryProvider({ children }) {
    _s();
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QueryProvider.useState": ()=>new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        gcTime: 10 * 60 * 1000,
                        retry: 1,
                        refetchOnWindowFocus: false
                    }
                }
            })
    }["QueryProvider.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/components/providers/QueryProvider.tsx",
        lineNumber: 19,
        columnNumber: 9
    }, this);
}
_s(QueryProvider, "dpfJIlNSdP5zLBY7NPam9f66NlM=");
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/features/privacy/data:a3804d [app-client] (ecmascript) <text/javascript>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "revokeSupportAccess",
    ()=>$$RSC_SERVER_ACTION_1
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
/* __next_internal_action_entry_do_not_use__ [{"007123cbfe976ef498ef0c9da55adf05db71028a6e":"revokeSupportAccess"},"src/features/privacy/actions.ts",""] */ "use turbopack no side effects";
;
const $$RSC_SERVER_ACTION_1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("007123cbfe976ef498ef0c9da55adf05db71028a6e", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "revokeSupportAccess");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
 //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYWN0aW9ucy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcic7XHJcblxyXG5pbXBvcnQgeyBjcmVhdGVTZXJ2ZXJDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3NyJztcclxuaW1wb3J0IHsgY29va2llcyB9IGZyb20gJ25leHQvaGVhZGVycyc7XHJcbmltcG9ydCB7IHJldmFsaWRhdGVQYXRoIH0gZnJvbSAnbmV4dC9jYWNoZSc7XHJcblxyXG4vKipcclxuICogR3JhbnRzIHRlbXBvcmFyeSBhY2Nlc3MgdG8gQWRtaW5zIHRvIHZpZXcgdXNlciBkYXRhLlxyXG4gKiBAcGFyYW0gZHVyYXRpb25Ib3VycyBIb3cgbG9uZyB0aGUgYWNjZXNzIHNob3VsZCBsYXN0LiBEZWZhdWx0IDI0aC5cclxuICogQHBhcmFtIHJlYXNvbiBPcHRpb25hbCByZWFzb24gZm9yIGF1ZGl0IGxvZ3MuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ3JhbnRTdXBwb3J0QWNjZXNzKGR1cmF0aW9uSG91cnM6IG51bWJlciA9IDI0LCByZWFzb246IHN0cmluZyA9ICdVc2VyIFN1cHBvcnQgUmVxdWVzdCcpIHtcclxuICAgIGNvbnN0IGNvb2tpZVN0b3JlID0gYXdhaXQgY29va2llcygpO1xyXG5cclxuICAgIC8vIE1hbnVhbCBDbGllbnQgQ3JlYXRpb24gKHNpbmNlIHdlIGFyZSBpbiBhIHB1cmUgYWN0aW9uIGZpbGUpXHJcbiAgICAvLyBJbiBhIHJlYWwgYXBwLCB1c2UgYSBzaGFyZWQgYGNyZWF0ZUNsaWVudGAgdXRpbGl0eVxyXG4gICAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVTZXJ2ZXJDbGllbnQoXHJcbiAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMISxcclxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9BTk9OX0tFWSEsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBjb29raWVzOiB7XHJcbiAgICAgICAgICAgICAgICBnZXRBbGwoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvb2tpZVN0b3JlLmdldEFsbCgpO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIHNldEFsbChjb29raWVzVG9TZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb29raWVzVG9TZXQuZm9yRWFjaCgoeyBuYW1lLCB2YWx1ZSwgb3B0aW9ucyB9KSA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29va2llU3RvcmUuc2V0KG5hbWUsIHZhbHVlLCBvcHRpb25zKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBgc2V0QWxsYCBtZXRob2Qgd2FzIGNhbGxlZCBmcm9tIGEgU2VydmVyIENvbXBvbmVudC5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBjYW4gYmUgaWdub3JlZCBpZiB5b3UgaGF2ZSBtaWRkbGV3YXJlIHJlZnJlc2hpbmdcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXNlciBzZXNzaW9ucy5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XHJcbiAgICBpZiAoIXVzZXIpIHRocm93IG5ldyBFcnJvcignVW5hdXRob3JpemVkJyk7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGV4cGlyeVxyXG4gICAgY29uc3QgZXhwaXJlc0F0ID0gbmV3IERhdGUoKTtcclxuICAgIGV4cGlyZXNBdC5zZXRIb3VycyhleHBpcmVzQXQuZ2V0SG91cnMoKSArIGR1cmF0aW9uSG91cnMpO1xyXG5cclxuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlLmZyb20oJ2FkbWluX2FjY2Vzc19ncmFudHMnKS5pbnNlcnQoe1xyXG4gICAgICAgIHVzZXJfaWQ6IHVzZXIuaWQsXHJcbiAgICAgICAgcmVhc29uLFxyXG4gICAgICAgIGV4cGlyZXNfYXQ6IGV4cGlyZXNBdC50b0lTT1N0cmluZygpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignR3JhbnQgRXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdyYW50IGFjY2VzcycpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldmFsaWRhdGVQYXRoKCcvJyk7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBleHBpcmVzQXQ6IGV4cGlyZXNBdC50b0lTT1N0cmluZygpIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXZva2VzIGFueSBhY3RpdmUgc3VwcG9ydCBhY2Nlc3MgaW1tZWRpYXRlbHkuXHJcbiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmV2b2tlU3VwcG9ydEFjY2VzcygpIHtcclxuICAgIGNvbnN0IGNvb2tpZVN0b3JlID0gYXdhaXQgY29va2llcygpO1xyXG4gICAgY29uc3Qgc3VwYWJhc2UgPSBjcmVhdGVTZXJ2ZXJDbGllbnQoXHJcbiAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMISxcclxuICAgICAgICBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9BTk9OX0tFWSEsXHJcbiAgICAgICAgeyBjb29raWVzOiB7IGdldEFsbDogKCkgPT4gY29va2llU3RvcmUuZ2V0QWxsKCksIHNldEFsbDogKCkgPT4geyB9IH0gfVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB7IGRhdGE6IHsgdXNlciB9IH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIoKTtcclxuICAgIGlmICghdXNlcikgdGhyb3cgbmV3IEVycm9yKCdVbmF1dGhvcml6ZWQnKTtcclxuXHJcbiAgICAvLyBTb2Z0IERlbGV0ZSAvIEV4cGlyZSBpbW1lZGlhdGVseVxyXG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcclxuICAgICAgICAuZnJvbSgnYWRtaW5fYWNjZXNzX2dyYW50cycpXHJcbiAgICAgICAgLnVwZGF0ZSh7IGV4cGlyZXNfYXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSB9KSAvLyBTZXQgdG8gTk9XIHRvIGV4cGlyZVxyXG4gICAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXIuaWQpXHJcbiAgICAgICAgLmd0KCdleHBpcmVzX2F0JywgbmV3IERhdGUoKS50b0lTT1N0cmluZygpKTsgLy8gT25seSBhY3RpdmUgb25lc1xyXG5cclxuICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Jldm9rZSBFcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gcmV2b2tlIGFjY2VzcycpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldmFsaWRhdGVQYXRoKCcvJyk7XHJcbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XHJcbn1cclxuXHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgdGhlIGN1cnJlbnQgdXNlciBoYXMgZ3JhbnRlZCBhY3RpdmUgc3VwcG9ydCBhY2Nlc3NcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRTdXBwb3J0U3RhdHVzKCkge1xyXG4gICAgLy8gV2h5IHRoaXMgZXhpc3RzOlxyXG4gICAgLy8gSW4gT3Blbk5ldFdvcnRoIGxvY2FsLWZpcnN0IG1vZGUsIHRoZXJlIGlzIG5vIHJlbW90ZSBhZG1pbiBvciBzdXBwb3J0IGFjY2Vzcy5cclxuICAgIC8vIElmIFN1cGFiYXNlIGNyZWRlbnRpYWxzIGFyZSBtaXNzaW5nLCB3ZSBpbW1lZGlhdGVseSByZXR1cm4gaW5hY3RpdmUgc3RhdHVzLlxyXG4gICAgY29uc3Qgc3VwYWJhc2VVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkw7XHJcbiAgICBjb25zdCBzdXBhYmFzZUtleSA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZO1xyXG4gICAgaWYgKCFzdXBhYmFzZVVybCB8fCAhc3VwYWJhc2VLZXkpIHtcclxuICAgICAgICByZXR1cm4geyBhY3RpdmU6IGZhbHNlIH07XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBjb29raWVTdG9yZSA9IGF3YWl0IGNvb2tpZXMoKTtcclxuICAgICAgICBjb25zdCBzdXBhYmFzZSA9IGNyZWF0ZVNlcnZlckNsaWVudChcclxuICAgICAgICAgICAgc3VwYWJhc2VVcmwsXHJcbiAgICAgICAgICAgIHN1cGFiYXNlS2V5LFxyXG4gICAgICAgICAgICB7IGNvb2tpZXM6IHsgZ2V0QWxsOiAoKSA9PiBjb29raWVTdG9yZS5nZXRBbGwoKSwgc2V0QWxsOiAoKSA9PiB7IH0gfSB9XHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgY29uc3QgeyBkYXRhOiB7IHVzZXIgfSB9ID0gYXdhaXQgc3VwYWJhc2UuYXV0aC5nZXRVc2VyKCk7XHJcbiAgICAgICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IGFjdGl2ZTogZmFsc2UgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHsgZGF0YSB9ID0gYXdhaXQgc3VwYWJhc2VcclxuICAgICAgICAgICAgLmZyb20oJ2FkbWluX2FjY2Vzc19ncmFudHMnKVxyXG4gICAgICAgICAgICAuc2VsZWN0KCdleHBpcmVzX2F0JylcclxuICAgICAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlci5pZClcclxuICAgICAgICAgICAgLmd0KCdleHBpcmVzX2F0JywgbmV3IERhdGUoKS50b0lTT1N0cmluZygpKSAvLyBPbmx5IGZ1dHVyZSBleHBpcnlcclxuICAgICAgICAgICAgLm9yZGVyKCdleHBpcmVzX2F0JywgeyBhc2NlbmRpbmc6IGZhbHNlIH0pXHJcbiAgICAgICAgICAgIC5saW1pdCgxKVxyXG4gICAgICAgICAgICAuc2luZ2xlKCk7XHJcblxyXG4gICAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IGFjdGl2ZTogdHJ1ZSwgZXhwaXJlc0F0OiBkYXRhLmV4cGlyZXNfYXQgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IGFjdGl2ZTogZmFsc2UgfTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAgIHJldHVybiB7IGFjdGl2ZTogZmFsc2UgfTtcclxuICAgIH1cclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6InVTQWdFc0IsZ01BQUEifQ==
}),
"[project]/src/components/layout/GlobalPrivacyBanner.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>GlobalPrivacyBanner
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield-alert.js [app-client] (ecmascript) <export default as ShieldAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$privacy$2f$data$3a$a3804d__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/src/features/privacy/data:a3804d [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function GlobalPrivacyBanner({ active }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(active);
    if (!visible) return null;
    const handleRevokeQuick = async ()=>{
        if (!confirm('Revoke Support Access immediately?')) return;
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$privacy$2f$data$3a$a3804d__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["revokeSupportAccess"])();
        setVisible(false);
        router.refresh();
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "bg-orange-600 text-white px-4 py-3 shadow-md relative z-50",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "max-w-7xl mx-auto flex items-center justify-between",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__["ShieldAlert"], {
                            className: "text-white animate-pulse",
                            size: 20
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
                            lineNumber: 29,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-sm font-bold",
                            children: "⚠️ Support Access Active. ClearWorth Admins can view your data."
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
                            lineNumber: 30,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
                    lineNumber: 28,
                    columnNumber: 17
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center gap-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: handleRevokeQuick,
                            className: "text-xs bg-white text-orange-700 px-3 py-1 rounded-full font-bold hover:bg-orange-50",
                            children: "Revoke"
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
                            lineNumber: 35,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setVisible(false),
                            className: "text-white/80 hover:text-white",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                size: 18
                            }, void 0, false, {
                                fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
                                lineNumber: 42,
                                columnNumber: 25
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
                            lineNumber: 41,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
                    lineNumber: 34,
                    columnNumber: 17
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
            lineNumber: 27,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/layout/GlobalPrivacyBanner.tsx",
        lineNumber: 26,
        columnNumber: 9
    }, this);
}
_s(GlobalPrivacyBanner, "jvpJf0yVa5YT+CI5rtO7adkNeT4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = GlobalPrivacyBanner;
var _c;
__turbopack_context__.k.register(_c, "GlobalPrivacyBanner");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_d903043f._.js.map