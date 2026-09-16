(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/features/accounting/components/ReportsTraceabilityView.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ReportsTraceabilityView",
    ()=>ReportsTraceabilityView
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PieChart$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-pie.js [app-client] (ecmascript) <export default as PieChart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/dollar-sign.js [app-client] (ecmascript) <export default as DollarSign>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/external-link.js [app-client] (ecmascript) <export default as ExternalLink>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/globe.js [app-client] (ecmascript) <export default as Globe>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-up-right.js [app-client] (ecmascript) <export default as ArrowUpRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-down-right.js [app-client] (ecmascript) <export default as ArrowDownRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/scale.js [app-client] (ecmascript) <export default as Scale>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
/**
 * Milestone 1 Reports, Ownership Allocation & Evidence Traceability View
 * 
 * Why this component exists:
 * Fulfills Milestone 1 Slice 1D requirements:
 * - Clear separation of Accrual Income/Expenses from Actual Cash Flow Statement.
 * - Ownership Allocation (M1-FLOW-07, T7): Visualizes individual % shares vs household de-duplicated 100% net worth.
 * - Non-Cash Asset Valuation (M1-FLOW-06, T6): Records dated asset adjustments against Unrealized Valuation Reserve.
 * - Multi-Currency Consolidated Net Worth (M1-CALC-03, T8): Displays conversion completeness status and missing rate warnings.
 * - Drill-down Ledger & Evidence Provenance (M1-EVID-01, M1-EVID-02): Traces any displayed account total to its underlying
 *   chronological postings with running balances and structured evidence links.
 * 
 * Tricky logic:
 * - Liquid cash calculations strictly isolate cash/checking/savings accounts from accrual revenue/expense accounts.
 * - Household scope de-duplicates jointly held assets so that 50/50 shared properties are never counted twice (no 200% distortion).
 * - Multi-currency net worth displays a strict "Incomplete" alert when exchange rates are missing; never assumes a 1:1 fallback.
 * 
 * TODO: Integrate direct PDF viewer side-by-side with the evidence bbox drawer in Milestone 2.
 */ 'use client';
;
;
;
const ReportsTraceabilityView = ({ onNavigateToAccounts, entities, selectedEntityId })=>{
    _s();
    // Scope State
    const getLocalIsoDate = ()=>{
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };
    const [scopeType, setScopeType] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('individual');
    const [asOfDate, setAsOfDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(getLocalIsoDate);
    const [startDate, setStartDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [endDate, setEndDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [reportingCurrency, setReportingCurrency] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('AUD');
    // Report Results
    const [scopeReport, setScopeReport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [consolidatedReport, setConsolidatedReport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [cashFlowReport, setCashFlowReport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [accrualReport, setAccrualReport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [accounts, setAccounts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Drilldown State
    const [selectedAccountId, setSelectedAccountId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [drilldownReport, setDrilldownReport] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedEvidence, setSelectedEvidence] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Modals
    const [isValuationModalOpen, setIsValuationModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isOwnershipModalOpen, setIsOwnershipModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isRateModalOpen, setIsRateModalOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Form inputs: Valuation
    const [valAccountId, setValAccountId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [valAmount, setValAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [valDate, setValDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(getLocalIsoDate);
    const [valSource, setValSource] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('Professional Appraisal');
    const [valDocHash, setValDocHash] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // Form inputs: Ownership
    const [ownAccountId, setOwnAccountId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [ownAllocations, setOwnAllocations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // Form inputs: Rate
    const [rateFrom, setRateFrom] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('USD');
    const [rateTo, setRateTo] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('AUD');
    const [rateValue, setRateValue] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('1.52');
    const [rateDate, setRateDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(getLocalIsoDate);
    const [rateSource, setRateSource] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('RBA Official');
    // Status / Feedback
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [errorMsg, setErrorMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [successMsg, setSuccessMsg] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [activeSubTab, setActiveSubTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('net_worth');
    // Initial Load
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ReportsTraceabilityView.useEffect": ()=>{
            loadEntitiesAndAccounts();
        }
    }["ReportsTraceabilityView.useEffect"], []);
    // Reload reports when entity or scope changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ReportsTraceabilityView.useEffect": ()=>{
            if (selectedEntityId) {
                refreshAllReports();
            }
        }
    }["ReportsTraceabilityView.useEffect"], [
        selectedEntityId,
        scopeType,
        asOfDate,
        startDate,
        endDate,
        reportingCurrency
    ]);
    // Reload drilldown when selectedAccountId changes
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ReportsTraceabilityView.useEffect": ()=>{
            if (selectedAccountId) {
                loadDrilldown(selectedAccountId);
            }
        }
    }["ReportsTraceabilityView.useEffect"], [
        selectedAccountId
    ]);
    const loadEntitiesAndAccounts = async ()=>{
        setLoading(true);
        try {
            const res = await fetch('/api/accounting');
            const data = await res.json();
            if (data.success) {
                setAccounts(data.accounts || []);
            }
        } catch (err) {
            setErrorMsg('Failed to load initial accounting metadata.');
        } finally{
            setLoading(false);
        }
    };
    const refreshAllReports = async ()=>{
        if (!selectedEntityId) return;
        setLoading(true);
        setErrorMsg(null);
        try {
            // 1. Fetch Scope Net Worth
            const scopeParams = new URLSearchParams({
                view: 'reports',
                report_type: 'scope_net_worth',
                scope_id: selectedEntityId,
                scope_type: scopeType
            });
            if (asOfDate) scopeParams.append('as_of_date', asOfDate);
            const scopeRes = await fetch(`/api/accounting?${scopeParams.toString()}`);
            const scopeData = await scopeRes.json();
            if (scopeData.success) {
                setScopeReport(scopeData.report);
            }
            // 2. Fetch Consolidated Net Worth
            const consParams = new URLSearchParams({
                view: 'reports',
                report_type: 'consolidated_net_worth',
                entity_id: selectedEntityId,
                scope_type: scopeType,
                reporting_currency: reportingCurrency
            });
            if (asOfDate) consParams.append('as_of_date', asOfDate);
            const consRes = await fetch(`/api/accounting?${consParams.toString()}`);
            const consData = await consRes.json();
            if (consData.success) {
                setConsolidatedReport(consData.report);
            }
            // 3. Fetch Actual Cash Flow Statement
            const cfParams = new URLSearchParams({
                view: 'reports',
                report_type: 'cash_flow',
                entity_id: selectedEntityId
            });
            if (startDate) cfParams.append('start_date', startDate);
            if (endDate) cfParams.append('end_date', endDate);
            const cfRes = await fetch(`/api/accounting?${cfParams.toString()}`);
            const cfData = await cfRes.json();
            if (cfData.success) {
                setCashFlowReport(cfData.report);
            }
            // 4. Fetch Accrual Income & Expense
            const accParams = new URLSearchParams({
                entity_id: selectedEntityId
            });
            if (startDate) accParams.append('start_date', startDate);
            if (endDate) accParams.append('end_date', endDate);
            const accRes = await fetch(`/api/accounting?${accParams.toString()}`);
            const accData = await accRes.json();
            if (accData.success) {
                setAccrualReport(accData.period_income_expenses);
            }
            if (selectedAccountId) {
                await loadDrilldown(selectedAccountId);
            }
        } catch (err) {
            setErrorMsg('Failed to refresh financial reports.');
        } finally{
            setLoading(false);
        }
    };
    const loadDrilldown = async (accId)=>{
        try {
            const params = new URLSearchParams({
                view: 'drilldown',
                account_id: accId
            });
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            const res = await fetch(`/api/accounting?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setDrilldownReport(data.drilldown);
            }
        } catch  {
            setErrorMsg('Failed to load ledger drilldown.');
        }
    };
    // Form handlers
    const handleRecordValuation = async (e)=>{
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);
        const targetAccount = accounts.find((a)=>a.id === valAccountId);
        if (!targetAccount) {
            setErrorMsg('Please select a valid asset account to revalue.');
            return;
        }
        const cents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["parseToCents"])(valAmount, targetAccount.currency);
        if (cents <= 0) {
            setErrorMsg('Valuation amount must be positive.');
            return;
        }
        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'record_valuation',
                    payload: {
                        asset_account_id: valAccountId,
                        new_valuation_cents: cents,
                        valuation_date: valDate,
                        source: valSource,
                        evidence_refs: valDocHash ? [
                            {
                                document_id: `doc-${Date.now()}`,
                                content_hash: valDocHash,
                                page: 1,
                                bounding_box: {
                                    x: 0.1,
                                    y: 0.1,
                                    width: 0.8,
                                    height: 0.3
                                }
                            }
                        ] : undefined
                    }
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setErrorMsg(data.error || 'Failed to record asset valuation adjustment.');
                return;
            }
            setSuccessMsg('Asset valuation adjustment recorded successfully against Valuation Reserve equity.');
            setIsValuationModalOpen(false);
            setValAmount('');
            setValDocHash('');
            refreshAllReports();
            if (selectedAccountId === valAccountId) {
                loadDrilldown(valAccountId);
            }
        } catch (err) {
            setErrorMsg(err.message || 'Error recording valuation.');
        }
    };
    const handleSetExchangeRate = async (e)=>{
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);
        const numRate = parseFloat(rateValue);
        if (isNaN(numRate) || numRate <= 0) {
            setErrorMsg('Exchange rate must be a strictly positive number.');
            return;
        }
        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'set_exchange_rate',
                    rate: {
                        from_currency: rateFrom.toUpperCase(),
                        to_currency: rateTo.toUpperCase(),
                        rate: numRate,
                        effective_date: rateDate,
                        source: rateSource
                    }
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setErrorMsg(data.error || 'Failed to save exchange rate.');
                return;
            }
            setSuccessMsg(`Exchange rate ${rateFrom}/${rateTo} updated to ${numRate}.`);
            setIsRateModalOpen(false);
            refreshAllReports();
        } catch (err) {
            setErrorMsg(err.message || 'Error updating exchange rate.');
        }
    };
    const handleOpenOwnershipModal = async (accountId)=>{
        setOwnAccountId(accountId);
        setErrorMsg(null);
        try {
            const res = await fetch(`/api/accounting?view=ownership&account_id=${accountId}`);
            const data = await res.json();
            if (data.success) {
                if (data.ownership && data.ownership.length > 0) {
                    setOwnAllocations(data.ownership.map((o)=>({
                            entity_id: o.entity_id,
                            ownership_percentage: o.ownership_percentage
                        })));
                } else {
                    // Default to 100% for selected entity
                    setOwnAllocations([
                        {
                            entity_id: selectedEntityId,
                            ownership_percentage: 100
                        }
                    ]);
                }
                setIsOwnershipModalOpen(true);
            }
        } catch  {
            setErrorMsg('Failed to fetch account ownership.');
        }
    };
    const handleSaveOwnership = async (e)=>{
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);
        const sum = ownAllocations.reduce((acc, curr)=>acc + curr.ownership_percentage, 0);
        if (sum <= 0 || sum > 100) {
            setErrorMsg(`Total ownership allocation must be between 1% and 100%. Current sum: ${sum}%`);
            return;
        }
        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'set_ownership',
                    account_id: ownAccountId,
                    allocations: ownAllocations
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                setErrorMsg(data.error || 'Failed to save ownership allocation.');
                return;
            }
            setSuccessMsg('Account ownership allocation updated.');
            setIsOwnershipModalOpen(false);
            refreshAllReports();
        } catch (err) {
            setErrorMsg(err.message || 'Error saving ownership.');
        }
    };
    if (!loading && entities.length === 0) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-8 shadow-sm space-y-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__["Scale"], {
                        className: "w-7 h-7"
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 403,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                    lineNumber: 402,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-1.5",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                            className: "text-base font-bold text-slate-900 dark:text-slate-100",
                            children: "Welcome to Reports & Evidence Traceability"
                        }, void 0, false, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 406,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed",
                            children: "To view net worth breakdowns, cash flow statements, and ledger drill-downs, please set up your sovereign entity and initial accounts in Account Management first."
                        }, void 0, false, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 409,
                            columnNumber: 21
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                    lineNumber: 405,
                    columnNumber: 17
                }, ("TURBOPACK compile-time value", void 0)),
                onNavigateToAccounts && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "pt-2",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: onNavigateToAccounts,
                        className: "inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Go to Accounts & Balances"
                        }, void 0, false, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 421,
                            columnNumber: 29
                        }, ("TURBOPACK compile-time value", void 0))
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 416,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                    lineNumber: 415,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
            lineNumber: 401,
            columnNumber: 13
        }, ("TURBOPACK compile-time value", void 0));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1",
                                        children: "Accounting Scope"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 436,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: scopeType,
                                        onChange: (e)=>setScopeType(e.target.value),
                                        className: "text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "individual",
                                                children: "Individual Entity (Ownership Share %)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 444,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "household",
                                                children: "Household Unit (100% De-duplicated)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 445,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 439,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 435,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1",
                                        children: "As Of Valuation Date"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 451,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        type: "date",
                                        value: asOfDate,
                                        onChange: (e)=>setAsOfDate(e.target.value),
                                        className: "text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 454,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 450,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1",
                                        children: "Period Start / End"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 464,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-1.5",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "date",
                                                value: startDate,
                                                onChange: (e)=>setStartDate(e.target.value),
                                                placeholder: "Start",
                                                className: "text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 468,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-slate-400 text-xs",
                                                children: "to"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 475,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "date",
                                                value: endDate,
                                                onChange: (e)=>setEndDate(e.target.value),
                                                placeholder: "End",
                                                className: "text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-2 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 476,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 467,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 463,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 433,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setIsValuationModalOpen(true),
                                className: "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__["Scale"], {
                                        className: "w-3.5 h-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 493,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Revalue Asset"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 494,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 489,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setIsRateModalOpen(true),
                                className: "flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                                        className: "w-3.5 h-3.5"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 500,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        children: "Exchange Rates"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 501,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 496,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: refreshAllReports,
                                disabled: loading,
                                className: "p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition",
                                title: "Refresh All Reports",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                    className: `w-4 h-4 ${loading ? 'animate-spin' : ''}`
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 509,
                                    columnNumber: 25
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 503,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 488,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 432,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            errorMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                        className: "w-4 h-4 flex-shrink-0"
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 517,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: errorMsg
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 518,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 516,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            successMsg && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                        className: "w-4 h-4 flex-shrink-0"
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 523,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: successMsg
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 524,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 522,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs font-semibold",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveSubTab('net_worth'),
                        className: `pb-3 border-b-2 flex items-center gap-1.5 transition ${activeSubTab === 'net_worth' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$pie$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PieChart$3e$__["PieChart"], {
                                className: "w-4 h-4"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 534,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Scope Net Worth & Ownership"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 535,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 530,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveSubTab('cash_vs_accrual'),
                        className: `pb-3 border-b-2 flex items-center gap-1.5 transition ${activeSubTab === 'cash_vs_accrual' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                className: "w-4 h-4"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 541,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Cash Flow vs Accrual Performance"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 542,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 537,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveSubTab('drilldown'),
                        className: `pb-3 border-b-2 flex items-center gap-1.5 transition ${activeSubTab === 'drilldown' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                className: "w-4 h-4"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 548,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Ledger Drill-Down & Evidence Links"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 549,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 544,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 529,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            activeSubTab === 'net_worth' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                                                className: "w-4 h-4 text-indigo-600 dark:text-indigo-400"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 560,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-xs font-bold text-slate-900 dark:text-slate-100",
                                                children: [
                                                    "Consolidated Net Worth (",
                                                    reportingCurrency,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 561,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            consolidatedReport?.is_complete ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
                                                children: "100% Exchange Rates Available"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 565,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
                                                children: "Incomplete Valuation (Missing Rates)"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 569,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 559,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-slate-500 dark:text-slate-400 mt-1",
                                        children: "Strict currency conversion (M1-CALC-03, T8). No fallback to 1:1 parity without explicit rates."
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 574,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    consolidatedReport && !consolidatedReport.is_complete && consolidatedReport.missing_rates.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-2 text-[11px] text-amber-700 dark:text-amber-400 font-medium",
                                        children: [
                                            "Missing dated exchange rates: ",
                                            consolidatedReport.missing_rates.join(', ')
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 578,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 558,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: reportingCurrency,
                                        onChange: (e)=>setReportingCurrency(e.target.value),
                                        className: "text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "AUD",
                                                children: "Reporting: AUD"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 590,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "USD",
                                                children: "Reporting: USD"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 591,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "EUR",
                                                children: "Reporting: EUR"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 592,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "GBP",
                                                children: "Reporting: GBP"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 593,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 585,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-right",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-lg font-extrabold text-slate-900 dark:text-slate-100",
                                                children: consolidatedReport?.formatted_consolidated_total || 'Conversion Incomplete'
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 597,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-[10px] text-slate-400",
                                                children: [
                                                    "as of ",
                                                    asOfDate
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 600,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 596,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 584,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 557,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-1 md:grid-cols-3 gap-4",
                        children: scopeReport && scopeReport.net_worth_cents_by_currency && Object.keys(scopeReport.net_worth_cents_by_currency).map((curr)=>{
                            const nw = scopeReport.formatted_net_worth_by_currency[curr];
                            const assets = scopeReport.total_assets_cents_by_currency[curr] || 0;
                            const liab = scopeReport.total_liabilities_cents_by_currency[curr] || 0;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between items-center text-xs font-bold text-slate-500",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: [
                                                    "Net Worth (",
                                                    curr,
                                                    ")"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 616,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]",
                                                children: scopeType
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 617,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 615,
                                        columnNumber: 37
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-2xl font-extrabold text-slate-900 dark:text-slate-100",
                                        children: nw
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 621,
                                        columnNumber: 37
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-emerald-600 dark:text-emerald-400 font-medium",
                                                children: [
                                                    "Assets: ",
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                        amount_cents: assets,
                                                        currency: curr
                                                    })
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 625,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "text-rose-600 dark:text-rose-400 font-medium",
                                                children: [
                                                    "Liab: ",
                                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                        amount_cents: liab,
                                                        currency: curr
                                                    })
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 628,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 624,
                                        columnNumber: 37
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, curr, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 614,
                                columnNumber: 33
                            }, ("TURBOPACK compile-time value", void 0));
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 608,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                            children: "Scoped Balance Sheet Accounts"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 641,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-[11px] text-slate-500",
                                            children: scopeType === 'household' ? 'Household scope: Joint accounts de-duplicated once at 100% (eliminating 200% duplicate counting).' : 'Individual scope: Balance reflects entity percentage share allocation.'
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 644,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 640,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 639,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "w-full text-xs text-left",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "bg-slate-50 dark:bg-slate-800/70 text-slate-500 uppercase tracking-wider font-semibold",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-4 py-3",
                                                        children: "Account"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 656,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-4 py-3",
                                                        children: "Type / Category"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 657,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-4 py-3 text-center",
                                                        children: "Ownership %"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 658,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-4 py-3 text-right",
                                                        children: "Full Balance"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 659,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-4 py-3 text-right",
                                                        children: "Scoped Balance"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 660,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-4 py-3 text-center",
                                                        children: "Actions"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 661,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 655,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 654,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "divide-y divide-slate-100 dark:divide-slate-800",
                                            children: [
                                                scopeReport?.items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-3 font-semibold text-slate-900 dark:text-slate-100",
                                                                children: [
                                                                    item.account_name,
                                                                    item.is_joint && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300",
                                                                        children: "Joint"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                        lineNumber: 670,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 667,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-3 capitalize text-slate-500",
                                                                children: [
                                                                    item.account_type,
                                                                    " · ",
                                                                    item.sub_type
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 675,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-3 text-center font-bold",
                                                                children: scopeType === 'household' ? '100% (Unified)' : `${item.ownership_share_percentage}%`
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 678,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-3 text-right text-slate-500",
                                                                children: item.formatted_full_balance || (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                    amount_cents: item.gross_balance_cents,
                                                                    currency: item.currency
                                                                })
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 681,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-3 text-right font-extrabold text-slate-900 dark:text-slate-100",
                                                                children: item.formatted_attributed_balance
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 684,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-4 py-3 text-center",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center justify-center gap-1.5",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>{
                                                                                setSelectedAccountId(item.account_id);
                                                                                setActiveSubTab('drilldown');
                                                                            },
                                                                            className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300",
                                                                            title: "Drill down to Ledger",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"], {
                                                                                className: "w-3.5 h-3.5"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                                lineNumber: 697,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 689,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                            onClick: ()=>handleOpenOwnershipModal(item.account_id),
                                                                            className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300",
                                                                            title: "Edit Ownership Allocation",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                                                                className: "w-3.5 h-3.5"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                                lineNumber: 704,
                                                                                columnNumber: 57
                                                                            }, ("TURBOPACK compile-time value", void 0))
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 699,
                                                                            columnNumber: 53
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 688,
                                                                    columnNumber: 49
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 687,
                                                                columnNumber: 45
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, item.account_id, true, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 666,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0))),
                                                (!scopeReport || scopeReport.items.length === 0) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        colSpan: 6,
                                                        className: "px-4 py-8 text-center text-slate-400",
                                                        children: "No accounts recorded for this scope."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 712,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 711,
                                                    columnNumber: 41
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 664,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 653,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 652,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 638,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 555,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            activeSubTab === 'cash_vs_accrual' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$dollar$2d$sign$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__DollarSign$3e$__["DollarSign"], {
                                        className: "w-5 h-5 text-emerald-600"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 730,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                                children: "Actual Liquid Cash Flow Statement"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 732,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[11px] text-slate-500",
                                                children: "Strictly movements in cash, checking, and savings accounts."
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 735,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 731,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 729,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            cashFlowReport ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4 text-xs",
                                children: [
                                    Object.keys(cashFlowReport.starting_cash_cents_by_currency).map((curr)=>{
                                        /**
                                     * Why this section exists:
                                     * Assessor Finding 4: Cash Flow Statement must report all 3 standard activity categories
                                     * (operating, financing, investing) and prominently expose ledger reconciliation status.
                                     * An unreconciled statement must never be presented as verified.
                                     * 
                                     * Tricky logic:
                                     * - Inflows are additions to liquid cash (+), outflows are reductions (-).
                                     * - Expense refunds increase liquid cash (operating inflow).
                                     * - Income reversals decrease liquid cash (operating outflow).
                                     * - Statement ending cash is compared against independent balance-sheet liquid accounts.
                                     *   Any divergence is highlighted with a red badge showing the exact discrepancy.
                                     * 
                                     * TODO: Add one-click discrepancy diagnostic drawer in Milestone 2.
                                     */ const startVal = cashFlowReport.starting_cash_cents_by_currency[curr] || 0;
                                        const opIn = cashFlowReport.operating_inflows_cents_by_currency[curr] || 0;
                                        const opOut = cashFlowReport.operating_outflows_cents_by_currency[curr] || 0;
                                        const netOp = cashFlowReport.net_operating_cents_by_currency?.[curr] ?? opIn - opOut;
                                        const finIn = cashFlowReport.financing_inflows_cents_by_currency?.[curr] || 0;
                                        const finOut = cashFlowReport.financing_outflows_cents_by_currency[curr] || 0;
                                        const netFin = cashFlowReport.net_financing_cents_by_currency?.[curr] ?? finIn - finOut;
                                        const invIn = cashFlowReport.investing_inflows_cents_by_currency?.[curr] || 0;
                                        const invOut = cashFlowReport.investing_outflows_cents_by_currency?.[curr] || 0;
                                        const netInv = cashFlowReport.net_investing_cents_by_currency?.[curr] ?? invIn - invOut;
                                        const netChange = cashFlowReport.net_cash_change_cents_by_currency[curr] || 0;
                                        const endVal = cashFlowReport.ending_cash_cents_by_currency[curr] || 0;
                                        const ledgerClose = cashFlowReport.ledger_closing_cash_cents_by_currency?.[curr] ?? endVal;
                                        const isReconciled = cashFlowReport.is_reconciled_by_currency?.[curr] ?? endVal === ledgerClose;
                                        const discrepancy = cashFlowReport.reconciliation_discrepancy_cents_by_currency?.[curr] || 0;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-3 border border-slate-200/70 dark:border-slate-700/60",
                                            children: [
                                                isReconciled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                            className: "w-4 h-4 flex-shrink-0 text-emerald-600"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 783,
                                                            columnNumber: 53
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "RECONCILED — Cash movements verified against independent ledger balance"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 784,
                                                            columnNumber: 53
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 782,
                                                    columnNumber: 49
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] space-y-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-1.5 font-extrabold text-xs",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                                                    className: "w-4 h-4 flex-shrink-0 text-rose-600"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 789,
                                                                    columnNumber: 57
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: [
                                                                        "UNRECONCILED DISCREPANCY: ",
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                            amount_cents: discrepancy,
                                                                            currency: curr
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 790,
                                                                    columnNumber: 57
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 788,
                                                            columnNumber: 53
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-[10px] text-rose-600 dark:text-rose-400",
                                                            children: [
                                                                "Independent ledger liquid closing cash (",
                                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                    amount_cents: ledgerClose,
                                                                    currency: curr
                                                                }),
                                                                ") does not match statement ending cash (",
                                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                    amount_cents: endVal,
                                                                    currency: curr
                                                                }),
                                                                "). Do not present as verified."
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 792,
                                                            columnNumber: 53
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 787,
                                                    columnNumber: 49
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Currency: ",
                                                                curr
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 799,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Starting Cash: ",
                                                                (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                    amount_cents: startVal,
                                                                    currency: curr
                                                                })
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 800,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 798,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-1 pt-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-[10px] uppercase font-bold text-slate-400",
                                                            children: "Operating Activities"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 805,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-slate-600 dark:text-slate-400 pl-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex items-center gap-1",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownRight$3e$__["ArrowDownRight"], {
                                                                            className: "w-3.5 h-3.5 text-emerald-600"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 808,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Operating Inflows (Revenue, Refunds, Receipts)"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 807,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium text-emerald-600",
                                                                    children: [
                                                                        "+",
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                            amount_cents: opIn,
                                                                            currency: curr
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 811,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 806,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-slate-600 dark:text-slate-400 pl-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex items-center gap-1",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpRight$3e$__["ArrowUpRight"], {
                                                                            className: "w-3.5 h-3.5 text-rose-600"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 817,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Operating Outflows (Expenses, Income Reversals)"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 816,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium text-rose-600",
                                                                    children: [
                                                                        "-",
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                            amount_cents: opOut,
                                                                            currency: curr
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 820,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 815,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 pl-2 pt-0.5",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: "Net Operating Cash Flow"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 825,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: netOp >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                        amount_cents: netOp,
                                                                        currency: curr
                                                                    })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 826,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 824,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 804,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-[10px] uppercase font-bold text-slate-400",
                                                            children: "Financing Activities"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 834,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-slate-600 dark:text-slate-400 pl-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex items-center gap-1",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownRight$3e$__["ArrowDownRight"], {
                                                                            className: "w-3.5 h-3.5 text-blue-600"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 837,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Financing Inflows (Loan Drawdowns & Capital Borrowings)"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 836,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium text-blue-600",
                                                                    children: [
                                                                        "+",
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                            amount_cents: finIn,
                                                                            currency: curr
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 840,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 835,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-slate-600 dark:text-slate-400 pl-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex items-center gap-1",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpRight$3e$__["ArrowUpRight"], {
                                                                            className: "w-3.5 h-3.5 text-amber-600"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 846,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Financing Outflows (Loan & Card Principal Repayments)"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 845,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium text-amber-600",
                                                                    children: [
                                                                        "-",
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                            amount_cents: finOut,
                                                                            currency: curr
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 849,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 844,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 pl-2 pt-0.5",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: "Net Financing Cash Flow"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 854,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: netFin >= 0 ? 'text-emerald-600' : 'text-amber-600',
                                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                        amount_cents: netFin,
                                                                        currency: curr
                                                                    })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 855,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 853,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 833,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "text-[10px] uppercase font-bold text-slate-400",
                                                            children: "Investing Activities"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 863,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-slate-600 dark:text-slate-400 pl-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex items-center gap-1",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownRight$3e$__["ArrowDownRight"], {
                                                                            className: "w-3.5 h-3.5 text-indigo-600"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 866,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Investing Inflows (Asset Disposals & Liquidations)"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 865,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium text-indigo-600",
                                                                    children: [
                                                                        "+",
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                            amount_cents: invIn,
                                                                            currency: curr
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 869,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 864,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-slate-600 dark:text-slate-400 pl-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "flex items-center gap-1",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpRight$3e$__["ArrowUpRight"], {
                                                                            className: "w-3.5 h-3.5 text-purple-600"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 875,
                                                                            columnNumber: 57
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        "Investing Outflows (Asset Acquisitions & Capex)"
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 874,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "font-medium text-purple-600",
                                                                    children: [
                                                                        "-",
                                                                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                            amount_cents: invOut,
                                                                            currency: curr
                                                                        })
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 878,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 873,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 pl-2 pt-0.5",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: "Net Investing Cash Flow"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 883,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: netInv >= 0 ? 'text-emerald-600' : 'text-purple-600',
                                                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                        amount_cents: netInv,
                                                                        currency: curr
                                                                    })
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 884,
                                                                    columnNumber: 53
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 882,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 862,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between font-bold pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "Net Cash Change"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 892,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: netChange >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                amount_cents: netChange,
                                                                currency: curr
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 893,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 891,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between font-extrabold text-sm pt-1 text-slate-900 dark:text-slate-100",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "Ending Liquid Cash"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 899,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                amount_cents: endVal,
                                                                currency: curr
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 900,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 898,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between text-xs pt-1 text-slate-500 dark:text-slate-400",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "Ledger Liquid Closing Cash"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 904,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-mono",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                amount_cents: ledgerClose,
                                                                currency: curr
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 905,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 903,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, curr, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 779,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0));
                                    }),
                                    Object.keys(cashFlowReport.starting_cash_cents_by_currency).length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "text-center py-6 text-slate-400",
                                        children: "No cash movements recorded in this date range."
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 912,
                                        columnNumber: 37
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 742,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center py-8 text-slate-400 text-xs",
                                children: "Select an entity and period to calculate actual cash flow."
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 918,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 728,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                        className: "w-5 h-5 text-indigo-600"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 927,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                                children: "Accrual Income & Expense Statement"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 929,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[11px] text-slate-500",
                                                children: "Performance accounting: Revenue earned & expenses incurred regardless of settlement."
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 932,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 928,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 926,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            accrualReport ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-4 text-xs",
                                children: [
                                    Object.keys(accrualReport.total_income_cents_by_currency || {}).map((curr)=>{
                                        const inc = accrualReport.total_income_cents_by_currency[curr] || 0;
                                        const exp = accrualReport.total_expenses_cents_by_currency[curr] || 0;
                                        const sav = accrualReport.net_savings_cents_by_currency[curr] || 0;
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-2 border border-slate-200/70 dark:border-slate-700/60",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-200 dark:border-slate-700 flex justify-between",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Currency: ",
                                                                curr
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 948,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] uppercase font-bold text-indigo-600",
                                                            children: "Accrual Performance"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 949,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 947,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between text-slate-600 dark:text-slate-400",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "Total Operating Income"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 953,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-medium text-emerald-600",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                amount_cents: inc,
                                                                currency: curr
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 954,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 952,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between text-slate-600 dark:text-slate-400",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "Total Incurred Expenses"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 960,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "font-medium text-rose-600",
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                amount_cents: exp,
                                                                currency: curr
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 961,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 959,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex justify-between font-extrabold text-sm pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: "Net Savings (Accrual)"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 967,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: sav >= 0 ? 'text-emerald-600' : 'text-rose-600',
                                                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["formatMoney"])({
                                                                amount_cents: sav,
                                                                currency: curr
                                                            })
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                            lineNumber: 968,
                                                            columnNumber: 49
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 966,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, curr, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 946,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0));
                                    }),
                                    accrualReport.breakdown_by_category && accrualReport.breakdown_by_category.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pt-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2",
                                                children: "Category Breakdown"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 978,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-1 max-h-48 overflow-y-auto pr-1",
                                                children: accrualReport.breakdown_by_category.map((cat)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-slate-700 dark:text-slate-300",
                                                                children: cat.category_name
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 984,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "font-semibold text-slate-900 dark:text-slate-100",
                                                                children: cat.formatted_total
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 985,
                                                                columnNumber: 53
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, cat.category_name, true, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 983,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0)))
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 981,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 977,
                                        columnNumber: 37
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 939,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center py-8 text-slate-400 text-xs",
                                children: "Select an entity to view accrual income & expense breakdown."
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 993,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 925,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 726,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            activeSubTab === 'drilldown' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                        children: "Chronological Ledger Traceability (M1-EVID-01, M1-EVID-02)"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1006,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-[11px] text-slate-500",
                                        children: "Every displayed balance is traceable to individual journal postings with running balances and evidence citations."
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1009,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 1005,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                        className: "text-xs font-semibold text-slate-600 dark:text-slate-400",
                                        children: "Account:"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1016,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: selectedAccountId,
                                        onChange: (e)=>setSelectedAccountId(e.target.value),
                                        className: "text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "-- Select an account --"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1022,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            accounts.map((acc)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: acc.id,
                                                    children: [
                                                        acc.name,
                                                        " (",
                                                        acc.type,
                                                        " · ",
                                                        acc.currency,
                                                        ")"
                                                    ]
                                                }, acc.id, true, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1024,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1017,
                                        columnNumber: 29
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 1015,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 1004,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    drilldownReport ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid grid-cols-2 sm:grid-cols-4 gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-[10px] font-bold text-slate-500 uppercase",
                                                children: "Account"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1037,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs font-bold text-slate-900 dark:text-slate-100 truncate",
                                                children: drilldownReport.account_name
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1038,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1036,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-[10px] font-bold text-slate-500 uppercase",
                                                children: "Normal Balance"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1043,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs font-bold text-slate-900 dark:text-slate-100 capitalize",
                                                children: drilldownReport.account_type === 'asset' || drilldownReport.account_type === 'expense' ? 'Debit Normal' : 'Credit Normal'
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1044,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1042,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-[10px] font-bold text-slate-500 uppercase",
                                                children: "Opening Balance"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1049,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs font-bold text-slate-900 dark:text-slate-100",
                                                children: drilldownReport.formatted_opening_balance
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1050,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1048,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-[10px] font-bold text-slate-500 uppercase",
                                                children: "Closing Balance"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1055,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "text-xs font-bold text-indigo-600 dark:text-indigo-400",
                                                children: drilldownReport.formatted_closing_balance
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1056,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1054,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 1035,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                                    className: "w-full text-xs text-left",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                            className: "bg-slate-50 dark:bg-slate-800/70 text-slate-500 uppercase tracking-wider font-semibold",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-3 py-2.5",
                                                        children: "Date"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1067,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-3 py-2.5",
                                                        children: "Description / Payee"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1068,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-3 py-2.5",
                                                        children: "Origin"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1069,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-3 py-2.5 text-right",
                                                        children: "Debit / Credit"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1070,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-3 py-2.5 text-right",
                                                        children: "Running Balance"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1071,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                        className: "px-3 py-2.5 text-center",
                                                        children: "Evidence"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1072,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1066,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1065,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                            className: "divide-y divide-slate-100 dark:divide-slate-800",
                                            children: [
                                                drilldownReport.entries.map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                        className: "hover:bg-slate-50 dark:hover:bg-slate-800/40",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-3 py-2.5 font-medium whitespace-nowrap text-slate-600 dark:text-slate-300",
                                                                children: entry.date
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 1078,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-3 py-2.5",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "font-semibold text-slate-900 dark:text-slate-100",
                                                                        children: entry.description
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                        lineNumber: 1082,
                                                                        columnNumber: 53
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    entry.payee_or_payer && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "text-[10px] text-slate-500",
                                                                        children: entry.payee_or_payer
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                        lineNumber: 1086,
                                                                        columnNumber: 57
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 1081,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-3 py-2.5 capitalize text-slate-500 whitespace-nowrap",
                                                                children: entry.origin
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 1091,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-3 py-2.5 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap",
                                                                children: entry.formatted_amount
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 1094,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-3 py-2.5 text-right font-extrabold text-indigo-600 dark:text-indigo-400 whitespace-nowrap",
                                                                children: entry.formatted_running_balance
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 1097,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                                className: "px-3 py-2.5 text-center whitespace-nowrap",
                                                                children: entry.evidence_refs && entry.evidence_refs.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>setSelectedEvidence(entry.evidence_refs),
                                                                    className: "inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold hover:bg-indigo-100 transition",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                                                            className: "w-3 h-3"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 1106,
                                                                            columnNumber: 61
                                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            children: "Evidence"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                            lineNumber: 1107,
                                                                            columnNumber: 61
                                                                        }, ("TURBOPACK compile-time value", void 0))
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 1102,
                                                                    columnNumber: 57
                                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: "text-slate-400 text-[10px]",
                                                                    children: "None"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                    lineNumber: 1110,
                                                                    columnNumber: 57
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 1100,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, entry.posting_id, true, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1077,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))),
                                                drilldownReport.entries.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        colSpan: 6,
                                                        className: "px-3 py-8 text-center text-slate-400",
                                                        children: "No journal entries found for this account and date range."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1117,
                                                        columnNumber: 49
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1116,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1075,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1064,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 1063,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 1033,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center py-12 text-slate-400 text-xs",
                        children: "Select an account from the dropdown to inspect its chronological ledger postings and running balance."
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                        lineNumber: 1127,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 1003,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            selectedEvidence && selectedEvidence.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4 max-h-[80vh] flex flex-col",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                            className: "w-4 h-4 text-indigo-600"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1140,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                            children: "Structured Evidence Metadata"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1141,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1139,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setSelectedEvidence(null),
                                    className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1149,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1145,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1138,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-4 overflow-y-auto pr-2",
                            children: [
                                selectedEvidence.map((ev, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold uppercase text-slate-400 block",
                                                        children: [
                                                            "Citation #",
                                                            idx + 1
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1157,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    ev.document_id && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("a", {
                                                        href: `/api/documents/raw?id=${ev.document_id}`,
                                                        target: "_blank",
                                                        rel: "noopener noreferrer",
                                                        className: "text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$external$2d$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ExternalLink$3e$__["ExternalLink"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                                lineNumber: 1160,
                                                                columnNumber: 49
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "View Original"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1159,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1156,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold uppercase text-slate-400 block",
                                                        children: "Document ID"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1166,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-mono text-slate-800 dark:text-slate-200 break-all text-xs",
                                                        children: ev.document_id || 'N/A'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1167,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1165,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold uppercase text-slate-400 block",
                                                        children: "Content Hash (SHA-256)"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1172,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-mono text-slate-800 dark:text-slate-200 break-all text-xs",
                                                        children: ev.content_hash || 'N/A'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1173,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1171,
                                                columnNumber: 37
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            ev.page_number !== undefined && ev.page_number !== null && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold uppercase text-slate-400 block",
                                                        children: "Page Citation"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1179,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-semibold text-slate-800 dark:text-slate-200 text-xs",
                                                        children: [
                                                            "Page ",
                                                            ev.page_number
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1180,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1178,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            ev.cell_reference && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold uppercase text-slate-400 block",
                                                        children: "Location"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1187,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-semibold text-slate-800 dark:text-slate-200 text-xs",
                                                        children: ev.cell_reference
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1188,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1186,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            ev.bounding_box && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[10px] font-bold uppercase text-slate-400 block",
                                                        children: "Bounding Box Coordinates"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1195,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "font-mono text-[11px] text-slate-600 dark:text-slate-400",
                                                        children: JSON.stringify(ev.bounding_box)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1196,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                lineNumber: 1194,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, idx, true, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1155,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-[11px] text-slate-500",
                                    children: "This metadata links the transaction ledger directly to the verified source document snippets."
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1203,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1153,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-end pt-2",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setSelectedEvidence(null),
                                className: "px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition",
                                children: "Close"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                lineNumber: 1209,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        }, void 0, false, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1208,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                    lineNumber: 1137,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 1136,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            isValuationModalOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleRecordValuation,
                    className: "bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$scale$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Scale$3e$__["Scale"], {
                                            className: "w-5 h-5 text-indigo-600"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1226,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                            children: "Record Dated Asset Valuation (T6)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1227,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1225,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setIsValuationModalOpen(false),
                                    className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1236,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1231,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1224,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-slate-500 dark:text-slate-400",
                            children: [
                                "Revaluing non-cash assets (e.g. real estate, vehicles) updates carrying values against the",
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                    children: " Unrealized Valuation Reserve"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1242,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                " equity account. Liquid cash and operating revenues remain zero delta."
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1240,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-3 text-xs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Asset Account"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1247,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: valAccountId,
                                            onChange: (e)=>setValAccountId(e.target.value),
                                            required: true,
                                            className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "-- Choose an asset account --"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1256,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                accounts.filter((a)=>a.type === 'asset' && ![
                                                        'cash',
                                                        'checking',
                                                        'savings'
                                                    ].includes(a.sub_type)).map((a)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: a.id,
                                                        children: [
                                                            a.name,
                                                            " (",
                                                            a.sub_type,
                                                            " · ",
                                                            a.currency,
                                                            ")"
                                                        ]
                                                    }, a.id, true, {
                                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                        lineNumber: 1258,
                                                        columnNumber: 41
                                                    }, ("TURBOPACK compile-time value", void 0)))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1250,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1246,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "New Valuation Amount (in Asset Currency)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1266,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "number",
                                            step: "0.01",
                                            value: valAmount,
                                            onChange: (e)=>setValAmount(e.target.value),
                                            placeholder: "e.g. 850000.00",
                                            required: true,
                                            className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1269,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1265,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Valuation Date"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1281,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "date",
                                            value: valDate,
                                            onChange: (e)=>setValDate(e.target.value),
                                            required: true,
                                            className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1284,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1280,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Valuation Source / Notes"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1294,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: valSource,
                                            onChange: (e)=>setValSource(e.target.value),
                                            placeholder: "e.g. CoreLogic Appraisal Report, Valuer-General",
                                            className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1297,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1293,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Evidence Document SHA-256 Hash (Optional)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1307,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: valDocHash,
                                            onChange: (e)=>setValDocHash(e.target.value),
                                            placeholder: "e.g. 4a2f8b...",
                                            className: "w-full font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1310,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1306,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1245,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setIsValuationModalOpen(false),
                                    className: "px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1321,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition",
                                    children: "Commit Valuation Adjustment"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1328,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1320,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                    lineNumber: 1223,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 1222,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            isOwnershipModalOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSaveOwnership,
                    className: "bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                            className: "w-5 h-5 text-indigo-600"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1345,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                            children: "Set Ownership Allocations (T7)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1346,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1344,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setIsOwnershipModalOpen(false),
                                    className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1355,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1350,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1343,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-slate-500 dark:text-slate-400",
                            children: "Configure percentage ownership for each entity. The sum of shares must be ≤ 100%. Household scope automatically rolls these up at 100% without double-counting."
                        }, void 0, false, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1359,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-3 text-xs",
                            children: entities.map((ent)=>{
                                const currentAlloc = ownAllocations.find((a)=>a.entity_id === ent.id);
                                const currentPct = currentAlloc ? currentAlloc.ownership_percentage : 0;
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "font-semibold text-slate-800 dark:text-slate-200",
                                                    children: ent.name
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1371,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-[10px] text-slate-400 capitalize",
                                                    children: ent.type
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1374,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1370,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex items-center gap-1.5",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    min: "0",
                                                    max: "100",
                                                    step: "0.1",
                                                    value: currentPct,
                                                    onChange: (e)=>{
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const updated = ownAllocations.filter((a)=>a.entity_id !== ent.id);
                                                        if (val > 0) {
                                                            updated.push({
                                                                entity_id: ent.id,
                                                                ownership_percentage: val
                                                            });
                                                        }
                                                        setOwnAllocations(updated);
                                                    },
                                                    className: "w-20 text-right bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1377,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "font-bold text-slate-500",
                                                    children: "%"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1393,
                                                    columnNumber: 45
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1376,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, ent.id, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1369,
                                    columnNumber: 37
                                }, ("TURBOPACK compile-time value", void 0));
                            })
                        }, void 0, false, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1364,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-semibold text-slate-600 dark:text-slate-400",
                                    children: [
                                        "Total Ownership: ",
                                        ownAllocations.reduce((acc, c)=>acc + c.ownership_percentage, 0),
                                        "%"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1401,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setIsOwnershipModalOpen(false),
                                            className: "px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1405,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            className: "px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition",
                                            children: "Save Allocations"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1412,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1404,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1400,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                    lineNumber: 1342,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 1341,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            isRateModalOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                    onSubmit: handleSetExchangeRate,
                    className: "bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                                            className: "w-5 h-5 text-emerald-600"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1430,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "text-sm font-bold text-slate-900 dark:text-slate-100",
                                            children: "Set Currency Exchange Rate (T8)"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1431,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1429,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setIsRateModalOpen(false),
                                    className: "p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                        lineNumber: 1440,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1435,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1428,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-3 text-xs",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                                    children: "From Currency"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1447,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    maxLength: 3,
                                                    value: rateFrom,
                                                    onChange: (e)=>setRateFrom(e.target.value.toUpperCase()),
                                                    required: true,
                                                    className: "w-full uppercase font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1450,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1446,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                                    children: "To Currency"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1460,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "text",
                                                    maxLength: 3,
                                                    value: rateTo,
                                                    onChange: (e)=>setRateTo(e.target.value.toUpperCase()),
                                                    required: true,
                                                    className: "w-full uppercase font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                                    lineNumber: 1463,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1459,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1445,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: [
                                                "Conversion Rate (1 ",
                                                rateFrom,
                                                " = ? ",
                                                rateTo,
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1475,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "number",
                                            step: "0.0001",
                                            value: rateValue,
                                            onChange: (e)=>setRateValue(e.target.value),
                                            placeholder: "e.g. 1.5240",
                                            required: true,
                                            className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1478,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1474,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Effective Date"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1490,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "date",
                                            value: rateDate,
                                            onChange: (e)=>setRateDate(e.target.value),
                                            required: true,
                                            className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1493,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1489,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Rate Source"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1503,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: rateSource,
                                            onChange: (e)=>setRateSource(e.target.value),
                                            placeholder: "e.g. Reserve Bank of Australia, ECB",
                                            className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                            lineNumber: 1506,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1502,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1444,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "button",
                                    onClick: ()=>setIsRateModalOpen(false),
                                    className: "px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-200 transition",
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1517,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    type: "submit",
                                    className: "px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition",
                                    children: "Save Exchange Rate"
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                                    lineNumber: 1524,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                            lineNumber: 1516,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                    lineNumber: 1427,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
                lineNumber: 1426,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/features/accounting/components/ReportsTraceabilityView.tsx",
        lineNumber: 430,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_s(ReportsTraceabilityView, "cFPnY1uMEFdAP8Fh/32liMOs9Fg=");
_c = ReportsTraceabilityView;
var _c;
__turbopack_context__.k.register(_c, "ReportsTraceabilityView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_features_accounting_components_ReportsTraceabilityView_tsx_ad22eb7a._.js.map