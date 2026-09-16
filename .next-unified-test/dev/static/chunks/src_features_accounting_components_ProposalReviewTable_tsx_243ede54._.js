(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/features/accounting/components/ProposalReviewTable.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ProposalReviewTable",
    ()=>ProposalReviewTable
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pen-line.js [app-client] (ecmascript) <export default as Edit3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/link-2.js [app-client] (ecmascript) <export default as Link2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/domain/accounting/types.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$accounting$2f$components$2f$LinkTransactionModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/features/accounting/components/LinkTransactionModal.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
/**
 * Milestone 1 Proposal Review Table Component (Slice 1E)
 * 
 * Why this component exists:
 * Provides the interactive review and verification interface for extracted CSV proposals.
 * Allows users to review duplicate flags, correct counterpart categories, inspect source-row
 * evidence, and execute atomic double-entry approvals into the authoritative accounting ledger.
 * 
 * Tricky logic:
 * - Unresolved error rows cannot be selected for approval: Protects the ledger from invalid dates
 *   or missing amounts. Zero guesswork.
 * - Category override: Users can change the counterpart category per row before approving;
 *   the selected category is sent to `approveProposals`.
 * - Safe reimport: Already approved rows display an "Approved" badge and are excluded from duplicate posting.
 * 
 * TODO: Add keyboard navigation (arrow keys + spacebar to toggle approval) for high-speed power review.
 */ 'use client';
;
;
;
;
const ProposalReviewTable = ({ documentId, onBack, accounts, entities = [], onApprovalComplete })=>{
    _s();
    const [proposals, setProposals] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [document, setDocument] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [isSubmitting, setIsSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [successMessage, setSuccessMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Filter status: 'all' | 'unreviewed' | 'approved' | 'linked' | 'issues'
    const [statusFilter, setStatusFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('all');
    // Selection set for approval
    const [selectedIds, setSelectedIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(new Set());
    // Per-row category overrides: proposalId -> category
    const [categoryOverrides, setCategoryOverrides] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    // Payment confirmation map for invoice expense proposals (Slice 1F)
    const [paymentConfirmedMap, setPaymentConfirmedMap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    // Explicit duplicate confirmation map (Slice 1F Fix D)
    const [duplicateConfirmedMap, setDuplicateConfirmedMap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    // Target liquid account for this document
    const [targetAccountId, setTargetAccountId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    // Linking Modal State (Slice 1G)
    const [linkingProposal, setLinkingProposal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Edit Modal State (Slice 1F Fix 2)
    // Why this exists: Enables users to correct extracted supplier, date, amount, currency,
    // category, and payment account before committing to the double-entry ledger.
    const [editingProposal, setEditingProposal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editSupplier, setEditSupplier] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [editDescription, setEditDescription] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [editDate, setEditDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [editAmount, setEditAmount] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [editCurrency, setEditCurrency] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('AUD');
    const [editCategory, setEditCategory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('office_supplies');
    const [editAccountId, setEditAccountId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [editError, setEditError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [editSubmitting, setEditSubmitting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /**
     * Initializes the edit modal with current proposal values.
     */ const startEditing = (proposal)=>{
        setEditingProposal(proposal);
        setEditSupplier(proposal.counterparty || proposal.description || '');
        setEditDescription(proposal.description || '');
        setEditDate(proposal.event_date);
        const scale = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][proposal.original_currency] ?? 2;
        const absMajor = (Math.abs(proposal.amount_cents) / Math.pow(10, scale)).toFixed(scale);
        setEditAmount(absMajor);
        setEditCurrency(proposal.original_currency || 'AUD');
        setEditCategory(proposal.suggested_category || 'office_supplies');
        setEditAccountId(proposal.account_id || targetAccountId || accounts[0]?.id || '');
        setEditError(null);
    };
    /**
     * Validates and submits edited proposal fields via PATCH /api/documents/proposals.
     * Tricky logic:
     * - Multiplies amount by 10^scale based on the selected currency so minor units are exact integers.
     * - Preserves sign (expense vs income).
     * - Ensures account currency matches proposal currency before sending to backend.
     * - Backend rejects review_status === 'approved' to protect double-entry invariants.
     * 
     * TODO: Support partial field updates with history logging in Slice 1G.
     */ const handleSaveEdit = async ()=>{
        if (!editingProposal) return;
        setEditError(null);
        setEditSubmitting(true);
        try {
            // Validate date format and validity
            if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
                throw new Error('Date must be in YYYY-MM-DD format.');
            }
            const parsedDate = new Date(editDate);
            if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().substring(0, 10) !== editDate) {
                throw new Error('Please enter a valid calendar date.');
            }
            // Validate amount
            const parsedAmount = parseFloat(editAmount);
            if (isNaN(parsedAmount) || parsedAmount < 0) {
                throw new Error('Amount must be a positive number.');
            }
            const scale = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"][editCurrency] ?? 2;
            const amountCents = Math.round(parsedAmount * Math.pow(10, scale));
            const finalSignedCents = editingProposal.event_type === 'income' ? amountCents : -amountCents;
            // Validate account currency match
            if (editAccountId) {
                const acc = accounts.find((a)=>a.id === editAccountId);
                if (acc && acc.currency.toUpperCase() !== editCurrency.toUpperCase()) {
                    throw new Error(`Selected payment account currency (${acc.currency}) does not match proposal currency (${editCurrency}).`);
                }
            }
            const res = await fetch('/api/documents/proposals', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    proposal_id: editingProposal.id,
                    event_date: editDate,
                    counterparty: editSupplier,
                    description: editDescription,
                    amount_cents: finalSignedCents,
                    original_currency: editCurrency,
                    account_id: editAccountId || undefined,
                    suggested_category: editCategory
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update proposal.');
            }
            // Update proposals in state
            setProposals((prev)=>prev.map((p)=>p.id === data.proposal.id ? data.proposal : p));
            // Fix 1: Synchronize the approval target with the saved account.
            // Why this exists: If the user corrects payment account from Account A to Account B,
            // the approval target must switch to Account B to avoid account-mismatch validation errors upon approval.
            if (data.proposal.account_id) {
                setTargetAccountId(data.proposal.account_id);
            }
            // Fix 2: Synchronize category overrides so approval and table use the latest saved edit.
            // Why this exists: If the user previously selected a category in the table dropdown (e.g. Groceries),
            // and subsequently edits and saves a new category (e.g. Utilities), the override map must be updated
            // to ensure approval uses the latest saved edit rather than stale table state.
            if (data.proposal.suggested_category) {
                setCategoryOverrides((prev)=>({
                        ...prev,
                        [data.proposal.id]: data.proposal.suggested_category
                    }));
            }
            setSuccessMessage(`Updated proposal successfully.`);
            setEditingProposal(null);
        } catch (err) {
            setEditError(err.message || 'An error occurred while saving corrections.');
        } finally{
            setEditSubmitting(false);
        }
    };
    // Fetch document metadata and proposals
    const loadProposals = async ()=>{
        setIsLoading(true);
        setError(null);
        try {
            // 1. Fetch document list to find metadata
            const docRes = await fetch('/api/documents');
            const docData = await docRes.json();
            if (docData.success && Array.isArray(docData.documents)) {
                const found = docData.documents.find((d)=>d.id === documentId);
                if (found) setDocument(found);
            }
            // 2. Fetch proposals for document
            const propRes = await fetch(`/api/documents/proposals?document_id=${documentId}`);
            const propData = await propRes.json();
            if (propData.success && Array.isArray(propData.proposals)) {
                setProposals(propData.proposals);
                // Set initial target account from first proposal
                if (propData.proposals.length > 0 && propData.proposals[0].account_id) {
                    setTargetAccountId(propData.proposals[0].account_id);
                }
                // Initialize default selection: select all valid unreviewed proposals
                const validUnreviewed = new Set();
                for (const p of propData.proposals){
                    const hasError = p.validation_findings.some((f)=>f.severity === 'error');
                    const hasDuplicate = p.validation_findings.some((f)=>f.code === 'POSSIBLE_DUPLICATE_EXISTING' || f.code === 'SUSPECTED_DUPLICATE_INTERNAL');
                    if (!hasError && !hasDuplicate && (p.review_status === 'unreviewed' || p.review_status === 'modified')) {
                        validUnreviewed.add(p.id);
                    }
                }
                setSelectedIds(validUnreviewed);
            } else {
                throw new Error(propData.error || 'Failed to load proposals.');
            }
        } catch (err) {
            setError(err.message || 'Failed to fetch proposals.');
        } finally{
            setIsLoading(false);
        }
    };
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "ProposalReviewTable.useEffect": ()=>{
            loadProposals();
        }
    }["ProposalReviewTable.useEffect"], [
        documentId
    ]);
    // Summary metrics
    const metrics = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ProposalReviewTable.useMemo[metrics]": ()=>{
            let unreviewed = 0;
            let approved = 0;
            let linked = 0;
            let withIssues = 0;
            for (const p of proposals){
                if (p.review_status === 'approved') approved++;
                else if (p.review_status === 'linked' || p.linked_transaction_id) linked++;
                else if (p.review_status === 'unreviewed' || p.review_status === 'modified') unreviewed++;
                const hasWarningOrError = p.validation_findings.length > 0;
                if (hasWarningOrError) withIssues++;
            }
            return {
                total: proposals.length,
                unreviewed,
                approved,
                linked,
                withIssues
            };
        }
    }["ProposalReviewTable.useMemo[metrics]"], [
        proposals
    ]);
    // Filtered proposals for display
    const filteredProposals = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "ProposalReviewTable.useMemo[filteredProposals]": ()=>{
            return proposals.filter({
                "ProposalReviewTable.useMemo[filteredProposals]": (p)=>{
                    if (statusFilter === 'unreviewed') return p.review_status === 'unreviewed' || p.review_status === 'modified';
                    if (statusFilter === 'approved') return p.review_status === 'approved';
                    if (statusFilter === 'linked') return p.review_status === 'linked' || Boolean(p.linked_transaction_id);
                    if (statusFilter === 'issues') return p.validation_findings.length > 0;
                    return true;
                }
            }["ProposalReviewTable.useMemo[filteredProposals]"]);
        }
    }["ProposalReviewTable.useMemo[filteredProposals]"], [
        proposals,
        statusFilter
    ]);
    // Toggle single proposal selection
    const toggleSelect = (id, hasError, isApprovedOrLinked)=>{
        if (hasError || isApprovedOrLinked) return; // Cannot select errors, already approved, or linked
        setSelectedIds((prev)=>{
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };
    // Toggle select all valid unreviewed
    const toggleSelectAll = ()=>{
        const validUnreviewed = proposals.filter((p)=>{
            const hasError = p.validation_findings.some((f)=>f.severity === 'error');
            return !hasError && (p.review_status === 'unreviewed' || p.review_status === 'modified');
        });
        const allSelected = validUnreviewed.every((p)=>selectedIds.has(p.id));
        if (allSelected) {
            // Deselect all
            setSelectedIds(new Set());
        } else {
            // Select all valid
            setSelectedIds(new Set(validUnreviewed.map((p)=>p.id)));
        }
    };
    // Execute atomic batch approval
    const handleBatchApprove = async ()=>{
        if (selectedIds.size === 0) return;
        if (!targetAccountId) {
            setError('Please select a target bank account for posting.');
            return;
        }
        // Fix 3: Validate payment confirmation BEFORE setting isSubmitting=true.
        // Why this exists: If payment confirmation is missing for any invoice proposal,
        // returning early before setting isSubmitting ensures the approve button is not stuck
        // in "Committing Transactions...", allowing the user to check "Paid" and retry immediately without reloading.
        const isPdfDoc = document?.mime_type === 'application/pdf';
        if (isPdfDoc) {
            const unconfirmed = proposals.filter((p)=>selectedIds.has(p.id) && !paymentConfirmedMap[p.id]);
            if (unconfirmed.length > 0) {
                setError('Please explicitly confirm payment for all selected invoice proposals before approving.');
                return;
            }
        }
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);
        const itemsToApprove = proposals.filter((p)=>selectedIds.has(p.id)).map((p)=>({
                proposal_id: p.id,
                category: categoryOverrides[p.id] || p.suggested_category || 'office_supplies',
                description: p.description,
                counterparty: p.counterparty || p.description,
                payment_confirmed: paymentConfirmedMap[p.id] ?? !isPdfDoc,
                duplicate_confirmed: duplicateConfirmedMap[p.id] ?? false
            }));
        try {
            const res = await fetch('/api/documents/proposals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    document_id: documentId,
                    target_account_id: targetAccountId,
                    items: itemsToApprove
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Batch approval failed.');
            }
            setSuccessMessage(`Successfully approved and posted ${data.approved_count} transaction(s) into the double-entry ledger.`);
            setSelectedIds(new Set());
            await loadProposals();
            if (onApprovalComplete) {
                onApprovalComplete();
            }
        } catch (err) {
            setError(err.message || 'An error occurred during batch approval.');
        } finally{
            setIsSubmitting(false);
        }
    };
    // Truncate SHA-256 for display
    const truncateHash = (hash)=>{
        if (!hash) return '';
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: onBack,
                                        className: "p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition",
                                        title: "Back to Document Inbox",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                            className: "w-5 h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 407,
                                            columnNumber: 29
                                        }, ("TURBOPACK compile-time value", void 0))
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 402,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-2",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                        className: "text-lg font-bold text-slate-900 dark:text-slate-100",
                                                        children: document?.filename || 'Document Review'
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                        lineNumber: 411,
                                                        columnNumber: 33
                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
                                                        children: [
                                                            "SHA-256: ",
                                                            truncateHash(document?.content_hash)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                        lineNumber: 414,
                                                        columnNumber: 33
                                                    }, ("TURBOPACK compile-time value", void 0))
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 410,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-slate-500 dark:text-slate-400 mt-0.5",
                                                children: "Review column extractions, duplicate flags, and confirm atomic ledger entries."
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 418,
                                                columnNumber: 29
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 409,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 401,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-xs",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium text-slate-600 dark:text-slate-400",
                                        children: "Target Bank Account:"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 426,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: targetAccountId,
                                        onChange: (e)=>setTargetAccountId(e.target.value),
                                        className: "px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 outline-none",
                                        children: accounts.filter((a)=>a.type === 'asset').map((acc)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: acc.id,
                                                children: [
                                                    acc.name,
                                                    " (",
                                                    acc.currency,
                                                    ")"
                                                ]
                                            }, acc.id, true, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 433,
                                                columnNumber: 33
                                            }, ("TURBOPACK compile-time value", void 0)))
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 427,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 425,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 400,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-slate-500 dark:text-slate-400 block text-[11px]",
                                        children: "Total Extracted"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 444,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-base font-bold text-slate-900 dark:text-slate-100",
                                        children: [
                                            metrics.total,
                                            " rows"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 445,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 443,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-amber-700 dark:text-amber-400 block text-[11px]",
                                        children: "Unreviewed"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 448,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-base font-bold text-amber-700 dark:text-amber-400",
                                        children: [
                                            metrics.unreviewed,
                                            " pending"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 449,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 447,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-emerald-700 dark:text-emerald-400 block text-[11px]",
                                        children: "Posted to Ledger"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 452,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-base font-bold text-emerald-700 dark:text-emerald-400",
                                        children: [
                                            metrics.approved,
                                            " approved"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 453,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 451,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-blue-50 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/40",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-blue-700 dark:text-blue-400 block text-[11px]",
                                        children: "Linked as Evidence"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 456,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-base font-bold text-blue-700 dark:text-blue-400",
                                        children: [
                                            metrics.linked,
                                            " linked"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 457,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 455,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-rose-700 dark:text-rose-400 block text-[11px]",
                                        children: "Issues & Duplicates"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 460,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-base font-bold text-rose-700 dark:text-rose-400",
                                        children: [
                                            metrics.withIssues,
                                            " flagged"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 461,
                                        columnNumber: 25
                                    }, ("TURBOPACK compile-time value", void 0))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 459,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 442,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                lineNumber: 399,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                        className: "w-5 h-5 flex-shrink-0 text-rose-600"
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 469,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-bold block",
                                children: "Approval Failed"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 471,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: error
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 472,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 470,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                lineNumber: 468,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            successMessage && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-start gap-3 text-emerald-700 dark:text-emerald-300 text-xs",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                        className: "w-5 h-5 flex-shrink-0 text-emerald-600"
                    }, void 0, false, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 479,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-bold block",
                                children: "Success"
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 481,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: successMessage
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 482,
                                columnNumber: 25
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 480,
                        columnNumber: 21
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                lineNumber: 478,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setStatusFilter('all'),
                                className: `px-3 py-1.5 rounded-lg transition ${statusFilter === 'all' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`,
                                children: [
                                    "All (",
                                    metrics.total,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 491,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setStatusFilter('unreviewed'),
                                className: `px-3 py-1.5 rounded-lg transition ${statusFilter === 'unreviewed' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`,
                                children: [
                                    "Pending (",
                                    metrics.unreviewed,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 497,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setStatusFilter('approved'),
                                className: `px-3 py-1.5 rounded-lg transition ${statusFilter === 'approved' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`,
                                children: [
                                    "Posted (",
                                    metrics.approved,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 503,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setStatusFilter('linked'),
                                className: `px-3 py-1.5 rounded-lg transition ${statusFilter === 'linked' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`,
                                children: [
                                    "Linked (",
                                    metrics.linked,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 509,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setStatusFilter('issues'),
                                className: `px-3 py-1.5 rounded-lg transition ${statusFilter === 'issues' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`,
                                children: [
                                    "Issues (",
                                    metrics.withIssues,
                                    ")"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 515,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 490,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: toggleSelectAll,
                                className: "text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 px-2 py-1",
                                children: proposals.filter((p)=>p.review_status === 'unreviewed' && !p.validation_findings.some((f)=>f.severity === 'error')).every((p)=>selectedIds.has(p.id)) ? 'Deselect All' : 'Select All Valid'
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 525,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleBatchApprove,
                                disabled: selectedIds.size === 0 || isSubmitting,
                                className: "flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition shadow-sm",
                                children: isSubmitting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Committing Transactions..."
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 540,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                            className: "w-4 h-4"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 543,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                "Approve Selected (",
                                                selectedIds.size,
                                                ")"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 544,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 534,
                                columnNumber: 21
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 524,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                lineNumber: 488,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm",
                children: isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-12 text-center text-xs text-slate-400",
                    children: "Loading extracted proposals..."
                }, void 0, false, {
                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                    lineNumber: 554,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0)) : filteredProposals.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "p-12 text-center text-xs text-slate-500",
                    children: "No proposals found matching the selected filter."
                }, void 0, false, {
                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                    lineNumber: 558,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "overflow-x-auto",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                        className: "w-full text-left text-xs border-collapse",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                className: "bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-4 w-10 text-center",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                type: "checkbox",
                                                onChange: toggleSelectAll,
                                                checked: filteredProposals.some((p)=>selectedIds.has(p.id)) && filteredProposals.filter((p)=>p.review_status === 'unreviewed' && !p.validation_findings.some((f)=>f.severity === 'error')).every((p)=>selectedIds.has(p.id)),
                                                className: "rounded border-slate-300 text-indigo-600"
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 567,
                                                columnNumber: 41
                                            }, ("TURBOPACK compile-time value", void 0))
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 566,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3",
                                            children: "Date"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 577,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3",
                                            children: "Description / Payee"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 578,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3 text-right",
                                            children: "Inflow / Outflow"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 579,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3",
                                            children: "Counterpart Category"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 580,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        document?.mime_type === 'application/pdf' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3",
                                            children: "Payment Confirmed"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 582,
                                            columnNumber: 41
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3",
                                            children: "Flags & Status"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 584,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3",
                                            children: "Evidence Source"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 585,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                            className: "py-3 px-3 text-center",
                                            children: "Actions"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 586,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 565,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0))
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 564,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0)),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                className: "divide-y divide-slate-200 dark:divide-slate-800",
                                children: filteredProposals.map((proposal)=>{
                                    const hasError = proposal.validation_findings.some((f)=>f.severity === 'error');
                                    const isMissingDate = proposal.validation_findings.some((f)=>f.code === 'MISSING_DATE');
                                    const isMissingAmount = proposal.validation_findings.some((f)=>f.code === 'MISSING_AMOUNT');
                                    const internalDup = proposal.validation_findings.find((f)=>f.code === 'SUSPECTED_DUPLICATE_INTERNAL');
                                    const externalDup = proposal.validation_findings.find((f)=>f.code === 'POSSIBLE_DUPLICATE_EXISTING');
                                    const isApproved = proposal.review_status === 'approved';
                                    const isLinked = proposal.review_status === 'linked' || Boolean(proposal.linked_transaction_id);
                                    const isSettled = isApproved || isLinked;
                                    const isSelected = selectedIds.has(proposal.id);
                                    const isIncome = proposal.event_type === 'income';
                                    const currentCategory = categoryOverrides[proposal.id] || proposal.suggested_category || 'living_expense';
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: `transition ${hasError ? 'bg-rose-50/40 dark:bg-rose-950/20' : isApproved ? 'bg-slate-50/50 dark:bg-slate-800/30' : isLinked ? 'bg-blue-50/40 dark:bg-blue-950/20' : isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}`,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-4 text-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "checkbox",
                                                    disabled: hasError || isSettled,
                                                    checked: isSelected,
                                                    onChange: ()=>toggleSelect(proposal.id, hasError, isSettled),
                                                    className: "rounded border-slate-300 text-indigo-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 611,
                                                    columnNumber: 49
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 610,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-3 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap",
                                                children: isMissingDate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20",
                                                    children: "Unknown"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 623,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0)) : proposal.event_date === '1970-01-01' || !proposal.event_date ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-amber-500 font-semibold text-[10px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded uppercase tracking-wider",
                                                    children: "Needs Review"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 625,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0)) : proposal.event_date
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 621,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-3 text-slate-900 dark:text-slate-100 font-medium max-w-[240px] truncate",
                                                children: proposal.description
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 632,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: `py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${isMissingAmount ? 'text-slate-900 dark:text-slate-100' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`,
                                                children: isMissingAmount ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-wider border border-rose-500/20",
                                                    children: "Unknown"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 639,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                    children: [
                                                        isIncome ? '+' : '-',
                                                        "$",
                                                        Math.abs(proposal.amount_cents / 100).toFixed(2)
                                                    ]
                                                }, void 0, true)
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 637,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-3",
                                                children: isSettled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "capitalize text-slate-600 dark:text-slate-400",
                                                    children: currentCategory.replace(/_/g, ' ')
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 648,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: currentCategory,
                                                    onChange: (e)=>{
                                                        const cat = e.target.value;
                                                        setCategoryOverrides((prev)=>({
                                                                ...prev,
                                                                [proposal.id]: cat
                                                            }));
                                                    },
                                                    disabled: hasError,
                                                    className: "px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none capitalize text-slate-800 dark:text-slate-200",
                                                    children: isIncome ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "salary",
                                                                children: "Salary / Wage"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 663,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "business_income",
                                                                children: "Business Income"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 664,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "investment_income",
                                                                children: "Investment / Dividend"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 665,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "other_income",
                                                                children: "Other Income"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 666,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "living_expense",
                                                                children: "Living Expense"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 670,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "office_supplies",
                                                                children: "Office Supplies"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 671,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "groceries",
                                                                children: "Groceries"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 672,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "utilities",
                                                                children: "Utilities"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 673,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "rent_expense",
                                                                children: "Rent"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 674,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "transportation",
                                                                children: "Transportation"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 675,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "entertainment",
                                                                children: "Entertainment"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 676,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "healthcare",
                                                                children: "Healthcare"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 677,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "interest_expense",
                                                                children: "Interest / Finance"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 678,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: "insurance",
                                                                children: "Insurance"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 679,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 652,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 646,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            document?.mime_type === 'application/pdf' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-3",
                                                children: isLinked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 691,
                                                            columnNumber: 61
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        "Evidence Linked"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 690,
                                                    columnNumber: 57
                                                }, ("TURBOPACK compile-time value", void 0)) : isApproved ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 696,
                                                            columnNumber: 61
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        "Confirmed"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 695,
                                                    columnNumber: 57
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "inline-flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                            type: "checkbox",
                                                            checked: paymentConfirmedMap[proposal.id] ?? false,
                                                            onChange: (e)=>{
                                                                const checked = e.target.checked;
                                                                setPaymentConfirmedMap((prev)=>({
                                                                        ...prev,
                                                                        [proposal.id]: checked
                                                                    }));
                                                            },
                                                            className: "rounded border-slate-300 text-indigo-600 cursor-pointer"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 701,
                                                            columnNumber: 61
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[11px]",
                                                            children: "Paid"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 710,
                                                            columnNumber: 61
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 700,
                                                    columnNumber: 57
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 688,
                                                columnNumber: 49
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-3",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-wrap items-center gap-1.5",
                                                    children: isLinked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-semibold text-[10px]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 721,
                                                                columnNumber: 61
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "Linked to existing transaction"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                        lineNumber: 720,
                                                        columnNumber: 57
                                                    }, ("TURBOPACK compile-time value", void 0)) : isApproved ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 726,
                                                                columnNumber: 61
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            "Posted"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                        lineNumber: 725,
                                                        columnNumber: 57
                                                    }, ("TURBOPACK compile-time value", void 0)) : hasError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-semibold text-[10px]",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                                className: "w-3 h-3"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 731,
                                                                columnNumber: 61
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            proposal.validation_findings[0]?.message
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                        lineNumber: 730,
                                                        columnNumber: 57
                                                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px]",
                                                                children: "Unreviewed"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 736,
                                                                columnNumber: 61
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            internalDup && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                title: internalDup.message,
                                                                className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium text-[10px]",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                                                        className: "w-2.5 h-2.5"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                        lineNumber: 744,
                                                                        columnNumber: 69
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    "File Duplicate"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 740,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            externalDup && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                title: externalDup.message,
                                                                className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-medium text-[10px]",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                                                        className: "w-2.5 h-2.5"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                        lineNumber: 753,
                                                                        columnNumber: 69
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    "Ledger Match"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 749,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0)),
                                                            (internalDup || externalDup) && !isSettled && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                                className: "inline-flex items-center gap-1 ml-1 cursor-pointer",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                                        type: "checkbox",
                                                                        checked: duplicateConfirmedMap[proposal.id] ?? false,
                                                                        onChange: (e)=>{
                                                                            const checked = e.target.checked;
                                                                            setDuplicateConfirmedMap((prev)=>({
                                                                                    ...prev,
                                                                                    [proposal.id]: checked
                                                                                }));
                                                                        },
                                                                        className: "rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                        lineNumber: 759,
                                                                        columnNumber: 69
                                                                    }, ("TURBOPACK compile-time value", void 0)),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        className: "text-[10px] font-bold text-amber-700 dark:text-amber-400",
                                                                        children: "Confirm Separate"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                        lineNumber: 768,
                                                                        columnNumber: 69
                                                                    }, ("TURBOPACK compile-time value", void 0))
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                lineNumber: 758,
                                                                columnNumber: 65
                                                            }, ("TURBOPACK compile-time value", void 0))
                                                        ]
                                                    }, void 0, true)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 718,
                                                    columnNumber: 49
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 717,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    title: proposal.evidence.source_snippet || '',
                                                    className: "cursor-help hover:text-indigo-600 dark:hover:text-indigo-400",
                                                    children: proposal.evidence.cell_reference
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 778,
                                                    columnNumber: 49
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 777,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0)),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                className: "py-3 px-3 text-center whitespace-nowrap",
                                                children: isLinked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 text-[11px] font-semibold",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"], {
                                                            className: "w-3.5 h-3.5"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 790,
                                                            columnNumber: 57
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        "Linked"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 789,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0)) : isApproved ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-slate-400 dark:text-slate-600 text-[11px] italic",
                                                    children: "Locked"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 794,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-center justify-center gap-1.5",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>startEditing(proposal),
                                                            className: "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 rounded-lg transition",
                                                            title: "Edit proposal fields",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit3$3e$__["Edit3"], {
                                                                    className: "w-3.5 h-3.5"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                    lineNumber: 803,
                                                                    columnNumber: 61
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: "Edit"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                    lineNumber: 804,
                                                                    columnNumber: 61
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 797,
                                                            columnNumber: 57
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        document?.mime_type === 'application/pdf' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            type: "button",
                                                            onClick: ()=>setLinkingProposal(proposal),
                                                            className: "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 rounded-lg transition",
                                                            title: "Link this receipt/invoice as supporting evidence to an existing bank transaction",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"], {
                                                                    className: "w-3.5 h-3.5"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                    lineNumber: 815,
                                                                    columnNumber: 65
                                                                }, ("TURBOPACK compile-time value", void 0)),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: "Link"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                                    lineNumber: 816,
                                                                    columnNumber: 65
                                                                }, ("TURBOPACK compile-time value", void 0))
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 809,
                                                            columnNumber: 61
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 796,
                                                    columnNumber: 53
                                                }, ("TURBOPACK compile-time value", void 0))
                                            }, void 0, false, {
                                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                lineNumber: 787,
                                                columnNumber: 45
                                            }, ("TURBOPACK compile-time value", void 0))
                                        ]
                                    }, proposal.id, true, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 605,
                                        columnNumber: 41
                                    }, ("TURBOPACK compile-time value", void 0));
                                })
                            }, void 0, false, {
                                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                lineNumber: 589,
                                columnNumber: 29
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                        lineNumber: 563,
                        columnNumber: 25
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                    lineNumber: 562,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                lineNumber: 552,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0)),
            editingProposal && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit3$3e$__["Edit3"], {
                                            className: "w-5 h-5 text-indigo-600 dark:text-indigo-400"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 837,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-bold text-sm text-slate-900 dark:text-slate-100",
                                            children: "Edit Proposal Details"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 838,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 836,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                    onClick: ()=>setEditingProposal(null),
                                    className: "p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                        className: "w-5 h-5"
                                    }, void 0, false, {
                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                        lineNumber: 846,
                                        columnNumber: 33
                                    }, ("TURBOPACK compile-time value", void 0))
                                }, void 0, false, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 842,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                            lineNumber: 835,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                            onSubmit: (e)=>{
                                e.preventDefault();
                                handleSaveEdit();
                            },
                            className: "p-5 space-y-4 text-xs",
                            children: [
                                editError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 flex items-start gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                            className: "w-4 h-4 flex-shrink-0 mt-0.5"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 853,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: editError
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 854,
                                            columnNumber: 37
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 852,
                                    columnNumber: 33
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Supplier / Counterparty"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 860,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "text",
                                            value: editSupplier,
                                            onChange: (e)=>setEditSupplier(e.target.value),
                                            className: "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500",
                                            placeholder: "e.g. Holloway Office Equipment",
                                            required: true
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 863,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 859,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                                    children: "Date (YYYY-MM-DD)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 876,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "date",
                                                    value: editDate,
                                                    onChange: (e)=>setEditDate(e.target.value),
                                                    className: "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500",
                                                    required: true
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 879,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 875,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                                    children: "Amount"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 890,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                    type: "number",
                                                    step: "any",
                                                    value: editAmount,
                                                    onChange: (e)=>setEditAmount(e.target.value),
                                                    className: "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500",
                                                    placeholder: "0.00",
                                                    required: true
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 893,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 889,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 873,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "grid grid-cols-2 gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                                    children: "Currency"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 908,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: editCurrency,
                                                    onChange: (e)=>setEditCurrency(e.target.value),
                                                    className: "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500",
                                                    children: Object.keys(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$domain$2f$accounting$2f$types$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CURRENCY_DECIMALS"]).map((curr)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: curr,
                                                            children: curr
                                                        }, curr, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 917,
                                                            columnNumber: 45
                                                        }, ("TURBOPACK compile-time value", void 0)))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 911,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 907,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                    className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                                    children: "Category"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 924,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                    value: editCategory,
                                                    onChange: (e)=>setEditCategory(e.target.value),
                                                    className: "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl capitalize text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "office_supplies",
                                                            children: "Office Supplies"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 932,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "living_expense",
                                                            children: "Living Expense"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 933,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "groceries",
                                                            children: "Groceries"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 934,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "utilities",
                                                            children: "Utilities"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 935,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "rent_expense",
                                                            children: "Rent"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 936,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "transportation",
                                                            children: "Transportation"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 937,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "entertainment",
                                                            children: "Entertainment"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 938,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "healthcare",
                                                            children: "Healthcare"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 939,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "interest_expense",
                                                            children: "Interest / Finance"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 940,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "insurance",
                                                            children: "Insurance"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 941,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "salary",
                                                            children: "Salary / Wage"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 942,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "business_income",
                                                            children: "Business Income"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 943,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "investment_income",
                                                            children: "Investment / Dividend"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 944,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0)),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                            value: "other_income",
                                                            children: "Other Income"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                            lineNumber: 945,
                                                            columnNumber: 41
                                                        }, ("TURBOPACK compile-time value", void 0))
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 927,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 923,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 905,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                            className: "block font-semibold text-slate-700 dark:text-slate-300 mb-1",
                                            children: "Payment Account"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 952,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: editAccountId,
                                            onChange: (e)=>setEditAccountId(e.target.value),
                                            className: "w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "(None / Keep Current)"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                    lineNumber: 960,
                                                    columnNumber: 37
                                                }, ("TURBOPACK compile-time value", void 0)),
                                                accounts.map((acc)=>{
                                                    const entityName = entities.find((e)=>e.id === acc.entity_id)?.name || 'Unknown Entity';
                                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: acc.id,
                                                        children: [
                                                            entityName,
                                                            " - ",
                                                            acc.name,
                                                            " (",
                                                            acc.currency,
                                                            ")"
                                                        ]
                                                    }, acc.id, true, {
                                                        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                                        lineNumber: 964,
                                                        columnNumber: 45
                                                    }, ("TURBOPACK compile-time value", void 0));
                                                })
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 955,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 951,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "button",
                                            onClick: ()=>setEditingProposal(null),
                                            className: "px-4 py-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition",
                                            children: "Cancel"
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 973,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0)),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            type: "submit",
                                            disabled: editSubmitting,
                                            className: "px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition shadow-sm",
                                            children: editSubmitting ? 'Saving Corrections...' : 'Save Corrections'
                                        }, void 0, false, {
                                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                            lineNumber: 980,
                                            columnNumber: 33
                                        }, ("TURBOPACK compile-time value", void 0))
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                                    lineNumber: 972,
                                    columnNumber: 29
                                }, ("TURBOPACK compile-time value", void 0))
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                            lineNumber: 850,
                            columnNumber: 25
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                    lineNumber: 834,
                    columnNumber: 21
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                lineNumber: 833,
                columnNumber: 17
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$features$2f$accounting$2f$components$2f$LinkTransactionModal$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LinkTransactionModal"], {
                isOpen: linkingProposal !== null,
                onClose: ()=>setLinkingProposal(null),
                proposal: linkingProposal,
                onLinked: ()=>{
                    loadProposals();
                    onApprovalComplete?.();
                }
            }, void 0, false, {
                fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
                lineNumber: 994,
                columnNumber: 13
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/src/features/accounting/components/ProposalReviewTable.tsx",
        lineNumber: 397,
        columnNumber: 9
    }, ("TURBOPACK compile-time value", void 0));
};
_s(ProposalReviewTable, "OIy8pa2SRu9QDTndZFLIk2PmA/M=");
_c = ProposalReviewTable;
var _c;
__turbopack_context__.k.register(_c, "ProposalReviewTable");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_features_accounting_components_ProposalReviewTable_tsx_243ede54._.js.map