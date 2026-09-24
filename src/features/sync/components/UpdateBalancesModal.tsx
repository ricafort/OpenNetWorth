/**
 * Fast Balance Updates Modal
 * 
 * Why this file exists:
 * Allows users to paste spreadsheets, bank tables, or CSV summaries directly into OpenNetWorth,
 * review proposed account balances with live delta calculations, map or create accounts inline,
 * and atomically commit dated balance observations.
 * 
 * Tricky logic:
 * - Deterministic parsing: Invokes `/api/accounting/balances/parse-table` to extract rows without AI overhead.
 * - Balance kind semantic tagging: Distinguishes true valuation balances (current, statement, portfolio)
 *   from non-valuation lines (credit limits, redraw, buying power) so users clearly see which numbers
 *   affect their net worth.
 * - Atomic batch commit: Sends all confirmed observations in a single transaction via `POST /api/accounting/balances`.
 * - Event notification: Dispatches `opennetworth_balances_updated` DOM event so all dashboard widgets
 *   and freshness cards re-render with the latest figures without a full page reload.
 * 
 * TODO: Integrate Delivery 2 Local LLM fallback for freeform, unstructured web text.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    FileSpreadsheet,
    FileText,
    UploadCloud,
    Scale,
    Plus,
    Check,
    AlertCircle,
    AlertTriangle,
    Trash2,
    Building,
    Calendar,
    ArrowUpRight,
    HelpCircle,
    Sparkles,
    ShieldCheck,
    ExternalLink,
    RefreshCw
} from 'lucide-react';
import {
    BalanceKind,
    CurrencyCode,
    CURRENCY_DECIMALS,
    ReconciliationComparison,
    StatementCoverageSummary,
    StatementReviewState
} from '@/lib/domain/accounting/types';
import { isValidCalendarDate } from '@/lib/domain/calendarDate';
import { getSavedLocalAiConfig } from '@/components/ui/LocalAiSettingsModal';

interface UpdateBalancesModalProps {
    isOpen: boolean;
    onClose: (summary?: any) => void;
    initialMode?: 'paste' | 'statement' | 'manual';
    initialDocumentId?: string;
    initialAccountId?: string;
    initialEntityId?: string;
}

interface ProposalItem {
    id: string;
    raw_account_name: string;
    account_id: string | null;
    account_name: string;
    account_mask?: string | null;
    amount_cents: number | null;
    currency: CurrencyCode;
    balance_kind: BalanceKind;
    effective_date: string;
    previous_amount_cents?: number | null;
    expected_balance_revision?: number;
    raw_label?: string;
    unresolved_fields?: string[];
    source_line?: string;
    source_excerpt?: string | null;
    is_component_of_total?: boolean;
    parent_observation_id?: string | null;
    has_newer_observation?: boolean;
    existing_balance_cents?: number | null;
    existing_balance_date?: string | null;
    entity_id?: string | null;
    entity_name?: string | null;
    tracking_mode?: 'balance' | 'transactions';
    reconciliation?: ReconciliationComparison;
    is_reconciling?: boolean;
    confirmed_by_user?: boolean;
    is_user_modified?: boolean;
    /**
     * Dedicated explicit flag for supporting-detail classification overrides.
     * 
     * Why this exists:
     * Fulfills Delivery 2A Narrow Closing Corrections (Item 1):
     * Decouples deliberate classification corrections from generic confirmations and unrelated edits.
     */
    explicit_classification_correction?: boolean;
    /**
     * Delivery 2B: Retained statement document link in m1_documents.
     */
    document_id?: string | null;
    /**
     * Delivery 2B: 1-indexed page number in statement PDF where the balance was sourced.
     */
    page_number?: number | null;
    /**
     * Delivery 2B: Tracks whether this proposal has already been committed to the vault.
     */
    is_saved?: boolean;
    /**
     * Remediation Requirement A3 & Batch A Closing Correction 3:
     * Explanatory message when an extracted statement account holder contradicts candidate account owners.
     */
    owner_conflict_message?: string | null;
}

/**
 * Simple deterministic 32-bit FNV-1a string hash for client-side batch and source reference generation.
 * 
 * Why this exists:
 * Guarantees that pasting the same table produces identical `source_batch_id` and `source_reference`
 * identifiers, allowing the server-side idempotency deduplication in `recordBalanceObservation`
 * to detect repeated submissions without creating duplicate observation entries or inflating revision counts.
 */
function simpleHash(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

interface ExistingAccount {
    id: string;
    name: string;
    entity_id: string;
    type: string;
    sub_type: string;
    currency: string;
    tracking_mode: string;
    balance_cents?: number | null;
    balance_revision?: number;
    is_unknown?: boolean;
}

interface Entity {
    id: string;
    name: string;
    currency: string;
}

export default function UpdateBalancesModal({
    isOpen,
    onClose,
    initialMode,
    initialDocumentId,
    initialAccountId,
    initialEntityId
}: UpdateBalancesModalProps) {
    const [activeTab, setActiveTab] = useState<'paste' | 'statement' | 'manual'>(initialMode || 'paste');
    const [rawText, setRawText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [extractionMethod, setExtractionMethod] = useState<'deterministic_table' | 'local_llm'>('deterministic_table');
    const [modelUsed, setModelUsed] = useState<string | null>(null);

    // Delivery 2B: Statement PDF State
    const [activeDocumentId, setActiveDocumentId] = useState<string | null>(initialDocumentId || null);
    const [activeStatementFilename, setActiveStatementFilename] = useState<string | null>(null);
    const [coverageSummary, setCoverageSummary] = useState<StatementCoverageSummary | null>(null);
    const [isUploadingStatement, setIsUploadingStatement] = useState<boolean>(false);
    const [statementUploadError, setStatementUploadError] = useState<string | null>(null);
    const [alreadySavedNotice, setAlreadySavedNotice] = useState<boolean>(false);
    const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

    // Tab-isolated proposal states to prevent cross-tab contamination
    // Why this exists:
    // Fulfills Independent Assessment Finding 4: Tab switching (PDF -> pasted text) must never overwrite PDF review.
    // Statement PDF reviews and pasted text table proposals are stored in dedicated state variables so that
    // pasting or editing in one tab cannot clobber the other tab's review in memory or SQLite.
    //
    // Tricky logic:
    // Active `proposals` is a derived reference based on `activeTab`. Mutations via `setProposals` update
    // the appropriate state based on `activeTab`. Autosync to /api/documents/statements strictly observes
    // `statementProposals` and `activeDocumentId`, completely decoupling it from the paste tab.
    //
    // TODO: In Milestone 2, allow multi-file concurrent statement reviews.
    const [statementProposals, setStatementProposals] = useState<ProposalItem[]>([]);
    const [pastedProposals, setPastedProposals] = useState<ProposalItem[]>([]);
    const [partialSaveNotice, setPartialSaveNotice] = useState<string | null>(null);
    const [autosyncStatus, setAutosyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [autosyncError, setAutosyncError] = useState<string | null>(null);

    // Authoritative document version map to preserve optimistic concurrency version state per document
    // Why this exists:
    // Regression 1 Fix: Autosave after reopening an existing review must adopt the authoritative server review version
    // on load/resume, rather than resetting to 0. Keeping versions tracked in a map keyed by document_id ensures
    // version state is strictly bound to the correct document across reopens and tab switches.
    //
    // Tricky logic:
    // 1. Initialized from data.review.version (or 1) during loadExistingStatementReview and upload resume.
    // 2. Incremented right before in-flight PUT autosync.
    // 3. Adopts server version if rejected as stale (HTTP 409) or updated successfully.
    // 4. autosyncDebounceSeqRef manages local timer sequence to ignore superseded async callbacks.
    //
    // TODO: In Milestone 2, persist version vector in indexedDB for offline resilience.
    const documentVersionMapRef = useRef<Map<string, number>>(new Map());
    const autosyncDebounceSeqRef = useRef<number>(0);

    const proposals = activeTab === 'statement' ? statementProposals : pastedProposals;
    const setProposals = (updaterOrValue: React.SetStateAction<ProposalItem[]>) => {
        if (activeTab === 'statement') {
            setStatementProposals(updaterOrValue);
        } else {
            setPastedProposals(updaterOrValue);
        }
    };

    // Helper to broadcast asynchronous updates (like reconciliation) to whichever tab holds the proposal
    const updateProposalAcrossTabs = (updater: (list: ProposalItem[]) => ProposalItem[]) => {
        setStatementProposals(updater);
        setPastedProposals(updater);
    };

    const [accounts, setAccounts] = useState<ExistingAccount[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);

    // Manual Fast Entry State: mapping of account_id -> { amountStr, kind, date }
    const [manualEntries, setManualEntries] = useState<Record<string, { amount: string; kind: BalanceKind; date: string }>>(() => {
        if (initialAccountId && initialMode === 'manual') {
            return {
                [initialAccountId]: { amount: '', kind: 'current_balance', date: new Date().toISOString().split('T')[0] }
            };
        }
        return {};
    });

    // Scoped Manual Fallback State (Batch C1 Requirement 5)
    // Retains document_id from unsupported statement uploads so users can enter balances manually
    // without re-uploading, while ensuring manual source_type remains strictly truthful.
    const [fallbackDocumentId, setFallbackDocumentId] = useState<string | null>(null);
    const [fallbackFilename, setFallbackFilename] = useState<string | null>(null);

    // Inline Account Creation Modal State
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    const [pendingProposalId, setPendingProposalId] = useState<string | null>(null);
    const [newAccountName, setNewAccountName] = useState('');
    const [newAccountEntityId, setNewAccountEntityId] = useState('');
    const [newAccountType, setNewAccountType] = useState<'asset' | 'liability'>('asset');
    const [newAccountSubType, setNewAccountSubType] = useState('superannuation');
    const [newAccountCurrency, setNewAccountCurrency] = useState<CurrencyCode>('AUD');
    const [newAccountTrackingMode, setNewAccountTrackingMode] = useState<'balance' | 'transactions'>('balance');

    // Derived state for inline account creation currency locking:
    // Why this exists:
    // If a proposal has an explicit source currency (e.g. pasted 'AUD 100') or the user has confirmed it,
    // creating an account from it MUST match that currency to prevent silent currency rewriting.
    // Tricky logic:
    // If the currency is unresolved (e.g. ambiguous '$' that defaulted to AUD), the currency selector in the
    // account creation modal must NOT be locked, allowing the user to select USD/CAD/etc. directly.
    // TODO: Remember the user's preferred reporting currency for newly created entities.
    const pendingProp = pendingProposalId ? proposals.find(p => p.id === pendingProposalId) : null;
    const isPendingCurrencyLocked = pendingProp ? (!pendingProp.unresolved_fields?.includes('currency') || pendingProp.confirmed_by_user) : false;

    // Fetch active accounts and entities on mount or open
    const loadAccountsAndEntities = async () => {
        try {
            const res = await fetch('/api/accounting');
            if (res.ok) {
                const data = await res.json();
                if (data.accounts) setAccounts(data.accounts);
                if (data.entities) {
                    setEntities(data.entities);
                    if (data.entities.length > 0 && !newAccountEntityId) {
                        setNewAccountEntityId(data.entities[0].id);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load accounts for balance update modal', err);
        }
    };

    // Delivery 2B: Resume existing review session on reload or navigation
    const loadExistingStatementReview = async (docId: string) => {
        try {
            const res = await fetch(`/api/documents/statements?document_id=${encodeURIComponent(docId)}`);
            const data = await res.json();
            if (res.ok && data.success && data.review) {
                const serverVersion = typeof data.review.version === 'number' ? data.review.version : 1;
                documentVersionMapRef.current.set(data.review.document_id, serverVersion);
                setActiveDocumentId(data.review.document_id);
                setActiveStatementFilename(data.document?.filename || 'statement.pdf');
                setCoverageSummary(data.review.coverage_summary || null);
                setAlreadySavedNotice(data.review.status === 'saved');
                const mapped = (data.review.proposals || []).map((p: any, idx: number) => ({
                    id: p.id || `prop-${Date.now()}-${idx}`,
                    raw_account_name: p.raw_account_name || p.account_name,
                    account_id: p.account_id || null,
                    account_name: p.account_name || p.raw_account_name,
                    account_mask: p.account_mask || null,
                    owner_conflict_message: p.owner_conflict_message || null,
                    entity_id: p.entity_id || null,
                    entity_name: p.entity_name || null,
                    amount_cents: p.amount_cents ?? null,
                    currency: p.currency,
                    balance_kind: p.balance_kind || 'current_balance',
                    effective_date: p.effective_date,
                    previous_amount_cents: p.existing_balance_cents ?? null,
                    expected_balance_revision: p.expected_balance_revision || 1,
                    raw_label: p.raw_label,
                    unresolved_fields: p.unresolved_fields || [],
                    source_line: p.source_excerpt || p.source_line || '',
                    source_excerpt: p.source_excerpt || null,
                    is_component_of_total: Boolean(p.is_component_of_total),
                    parent_observation_id: p.parent_observation_id || null,
                    has_newer_observation: Boolean(p.has_newer_observation),
                    existing_balance_cents: p.existing_balance_cents ?? null,
                    existing_balance_date: p.existing_balance_date ?? null,
                    tracking_mode: p.tracking_mode || 'balance',
                    reconciliation: p.reconciliation,
                    confirmed_by_user: Boolean(p.confirmed_by_user),
                    is_user_modified: Boolean(p.is_user_modified),
                    explicit_classification_correction: Boolean(p.explicit_classification_correction),
                    is_saved: Boolean(p.is_saved),
                    document_id: data.review.document_id,
                    page_number: typeof p.page_number === 'number' ? p.page_number : null
                }));
                setStatementProposals(mapped);
            }
        } catch (err) {
            console.error('Failed to load existing statement review', err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadAccountsAndEntities();
            if (initialMode) setActiveTab(initialMode);
            if (initialDocumentId) {
                setActiveDocumentId(initialDocumentId);
                loadExistingStatementReview(initialDocumentId);
            }
            if (initialAccountId && initialMode === 'manual') {
                setManualEntries(prev => ({
                    ...prev,
                    [initialAccountId]: prev[initialAccountId] || { amount: '', kind: 'current_balance', date: new Date().toISOString().split('T')[0] }
                }));
            }
        }
    }, [isOpen, initialMode, initialDocumentId, initialAccountId]);

    useEffect(() => {
        if (isOpen) {
            if (initialMode) {
                setActiveTab(initialMode);
            }
            if (initialAccountId && initialMode === 'manual') {
                setManualEntries(prev => {
                    if (!prev[initialAccountId]) {
                        return {
                            ...prev,
                            [initialAccountId]: { amount: '', kind: 'current_balance', date: new Date().toISOString().split('T')[0] }
                        };
                    }
                    return prev;
                });
                
                // Use a short timeout to ensure the DOM is rendered before focusing
                setTimeout(() => {
                    const input = document.getElementById(`account-input-${initialAccountId}`);
                    if (input) {
                        input.focus();
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 50);
            }
        }
    }, [isOpen, initialMode, initialAccountId]);

    // Delivery 2B: Autosync in-flight proposal edits to m1_statement_reviews
    // Why this exists:
    // Automatically persists user adjustments to statement reviews so browser refresh does not discard work.
    //
    // Tricky logic:
    // 1. Strictly bound to [statementProposals, activeDocumentId] - never triggers on paste tab changes.
    // 2. Increments autosyncVersionRef to reject out-of-order delayed network responses.
    // 3. Exposes visual error and status state so users are never misled if SQLite persistence fails.
    //
    // TODO: Add offline localStorage cache fallback if network fails completely.
    const autosyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (!activeDocumentId || statementProposals.length === 0) return;

        const hasUnsaved = statementProposals.some(p => !p.is_saved);
        if (!hasUnsaved) return;

        if (autosyncTimeoutRef.current) {
            clearTimeout(autosyncTimeoutRef.current);
        }

        autosyncTimeoutRef.current = setTimeout(async () => {
            const currentSeq = ++autosyncDebounceSeqRef.current;
            const docId = activeDocumentId;
            const currentBaseVersion = documentVersionMapRef.current.get(docId) ?? 1;
            const nextVersion = currentBaseVersion + 1;
            // Optimistically bump local version
            documentVersionMapRef.current.set(docId, nextVersion);

            setAutosyncStatus('saving');
            setAutosyncError(null);

            try {
                const res = await fetch('/api/documents/statements', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        document_id: docId,
                        proposals: statementProposals,
                        version: nextVersion
                    })
                });

                if (currentSeq !== autosyncDebounceSeqRef.current) return;

                const resData = await res.json().catch(() => ({}));

                if (!res.ok) {
                    // Stale update or HTTP error
                    if (res.status === 409 || resData.stale) {
                        if (typeof resData.current_version === 'number') {
                            documentVersionMapRef.current.set(docId, resData.current_version);
                        }
                        setAutosyncStatus('error');
                        setAutosyncError(resData.error || 'Server rejected stale update. Please refresh.');
                        return;
                    }
                    throw new Error(resData.error || `HTTP ${res.status}`);
                }

                // Adopt server's authoritative version from review response
                if (resData.review && typeof resData.review.version === 'number') {
                    documentVersionMapRef.current.set(docId, resData.review.version);
                }

                setAutosyncStatus('saved');
            } catch (err: any) {
                if (currentSeq !== autosyncDebounceSeqRef.current) return;
                console.error('Autosync statement review failed', err);
                setAutosyncStatus('error');
                setAutosyncError(err.message || 'Failed to autosave statement review');
            }
        }, 500);

        return () => {
            if (autosyncTimeoutRef.current) clearTimeout(autosyncTimeoutRef.current);
        };
    }, [statementProposals, activeDocumentId]);

    // Delivery 2B: Upload Statement PDF
    const handleStatementUpload = async (file: File) => {
        if (!file) return;
        setIsUploadingStatement(true);
        setStatementUploadError(null);
        setAlreadySavedNotice(false);
        setFallbackDocumentId(null);
        setFallbackFilename(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (initialEntityId && initialEntityId !== 'all') {
                formData.append('entity_id', initialEntityId);
            }

            const res = await fetch('/api/documents/statements', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                if (data.document_id) {
                    setFallbackDocumentId(data.document_id);
                    setFallbackFilename(file.name);
                }
                throw new Error(data.error || 'Failed to parse statement PDF');
            }

            setActiveDocumentId(data.document.id);
            const serverVersion = (data.review && typeof data.review.version === 'number') ? data.review.version : 1;
            documentVersionMapRef.current.set(data.document.id, serverVersion);
            setActiveStatementFilename(data.document.filename);
            setCoverageSummary(data.coverage_summary || null);
            setAlreadySavedNotice(Boolean(data.already_saved));

            const mappedProposals: ProposalItem[] = (data.proposals || []).map((p: any, idx: number) => ({
                id: p.id || `prop-${Date.now()}-${idx}`,
                raw_account_name: p.raw_account_name || p.account_name,
                account_id: p.account_id || null,
                account_name: p.account_name || p.raw_account_name,
                account_mask: p.account_mask || null,
                owner_conflict_message: p.owner_conflict_message || null,
                entity_id: p.entity_id || null,
                entity_name: p.entity_name || null,
                amount_cents: p.amount_cents ?? null,
                currency: p.currency,
                balance_kind: p.balance_kind || 'current_balance',
                effective_date: p.effective_date,
                previous_amount_cents: p.existing_balance_cents ?? null,
                expected_balance_revision: p.expected_balance_revision || 1,
                raw_label: p.raw_label,
                unresolved_fields: p.unresolved_fields || [],
                source_line: p.source_excerpt || p.source_line || '',
                source_excerpt: p.source_excerpt || null,
                is_component_of_total: Boolean(p.is_component_of_total),
                parent_observation_id: p.parent_observation_id || null,
                has_newer_observation: Boolean(p.has_newer_observation),
                existing_balance_cents: p.existing_balance_cents ?? null,
                existing_balance_date: p.existing_balance_date ?? null,
                tracking_mode: p.tracking_mode || 'balance',
                reconciliation: p.reconciliation,
                confirmed_by_user: Boolean(p.confirmed_by_user),
                is_user_modified: false,
                is_saved: Boolean(p.is_saved),
                document_id: data.document.id,
                page_number: typeof p.page_number === 'number' ? p.page_number : null
            }));

            setStatementProposals(mappedProposals);
        } catch (err: any) {
            setStatementUploadError(err.message || 'Error processing statement PDF');
        } finally {
            setIsUploadingStatement(false);
        }
    };

    // Find balances from pasted text (deterministic table parser or local AI)
    const handleParse = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        setParseError(null);

        try {
            const localConfig = getSavedLocalAiConfig();
            const res = await fetch('/api/accounting/balances/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: rawText,
                    defaultCurrency: 'AUD',
                    defaultDate: new Date().toISOString().split('T')[0],
                    strategy: 'auto',
                    localConfig,
                    entityId: initialEntityId
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to extract balances from text');
            }

            if (!data.proposals || data.proposals.length === 0) {
                setParseError('No balance proposals could be extracted. Check that the statement contains recognizable account names and amounts.');
                return;
            }

            setExtractionMethod(data.extraction_method || 'deterministic_table');
            setModelUsed(data.model_used || null);

            const mappedProposals: ProposalItem[] = data.proposals.map((p: any, idx: number) => ({
                id: p.id || `prop-${Date.now()}-${idx}`,
                raw_account_name: p.raw_account_name || p.account_name,
                account_id: p.account_id || null,
                account_name: p.account_name || p.raw_account_name,
                entity_id: p.entity_id || null,
                entity_name: p.entity_name || null,
                amount_cents: p.amount_cents ?? null,
                currency: p.currency,
                balance_kind: p.balance_kind || 'current_balance',
                effective_date: p.effective_date,
                previous_amount_cents: p.existing_balance_cents ?? null,
                expected_balance_revision: p.expected_balance_revision || 1,
                raw_label: p.raw_label,
                unresolved_fields: p.unresolved_fields || [],
                source_line: p.source_excerpt || p.source_line || '',
                source_excerpt: p.source_excerpt || null,
                is_component_of_total: Boolean(p.is_component_of_total),
                parent_observation_id: p.parent_observation_id || null,
                has_newer_observation: Boolean(p.has_newer_observation),
                existing_balance_cents: p.existing_balance_cents ?? null,
                existing_balance_date: p.existing_balance_date ?? null,
                tracking_mode: p.tracking_mode || 'balance',
                reconciliation: p.reconciliation,
                confirmed_by_user: false,
                is_user_modified: false
            }));

            setPastedProposals(mappedProposals);
        } catch (err: any) {
            setParseError(err.message || 'Error extracting balance text');
        } finally {
            setIsParsing(false);
        }
    };

    // Track in-flight reconciliation request versions per proposal id to prevent race conditions
    // Why this exists:
    // Fulfills Delivery 2A Final Focused Corrections (Issue 2):
    // If a user types or edits an amount multiple times in rapid succession (e.g. AUD 2,000 then AUD 3,000),
    // network latency could cause the earlier request (AUD 2,000) to resolve AFTER the later request (AUD 3,000).
    // Storing a strictly increasing request version ensures that out-of-order, stale responses are discarded,
    // keeping the final displayed difference strictly consistent with the latest user input.
    // 
    // Tricky logic:
    // We check both the request version AND verify that the proposal's current state still matches the exact inputs
    // (account_id, amount_cents, currency, balance_kind, effective_date) sent in the request.
    // Old comparison is hidden while recalculating, and cleared on invalid inputs or errors.
    // 
    // TODO: Add debounce delay if users paste or edit very rapidly across hundreds of rows.
    const reconciliationVersionsRef = useRef<Map<string, number>>(new Map());

    const refreshReconciliation = async (prop: ProposalItem, reqVersion: number) => {
        // Validate inputs: if account is missing, amount is missing, date is missing/invalid, or not transaction-tracked, clear comparison
        // Why this exists:
        // Fulfills Delivery 2A Narrow Closing Corrections (Item 2):
        // Does not calculate using an implicit "today" when date is blank.
        // Hides the comparison until valid inputs (including valid calendar date) are available.
        const hasValidDate = Boolean(prop.effective_date && typeof prop.effective_date === 'string' && isValidCalendarDate(prop.effective_date.trim()));
        if (!prop.account_id || prop.amount_cents === null || !hasValidDate) {
            updateProposalAcrossTabs(current => current.map(p => p.id === prop.id ? {
                ...p,
                reconciliation: undefined,
                is_reconciling: false
            } : p));
            return;
        }

        const targetAcc = accounts.find(a => a.id === prop.account_id);
        if (targetAcc?.tracking_mode !== 'transactions' && prop.tracking_mode !== 'transactions') {
            updateProposalAcrossTabs(current => current.map(p => p.id === prop.id ? {
                ...p,
                reconciliation: undefined,
                is_reconciling: false
            } : p));
            return;
        }

        try {
            const res = await fetch('/api/accounting/balances/reconcile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: prop.account_id,
                    amount_cents: prop.amount_cents,
                    currency: prop.currency,
                    balance_kind: prop.balance_kind,
                    effective_date: prop.effective_date.trim()
                })
            });

            // Version check: if a newer request for this row was dispatched while in flight, discard this response
            const latestVersion = reconciliationVersionsRef.current.get(prop.id);
            if (latestVersion !== reqVersion) {
                return;
            }

            if (res.ok) {
                const data = await res.json();
                if (data.reconciliation) {
                    updateProposalAcrossTabs(current => current.map(p => {
                        if (p.id !== prop.id) return p;
                        // Extra safety check: verify the current row's inputs still match the request inputs
                        if (
                            p.account_id !== prop.account_id ||
                            p.amount_cents !== prop.amount_cents ||
                            p.currency !== prop.currency ||
                            p.balance_kind !== prop.balance_kind ||
                            p.effective_date !== prop.effective_date
                        ) {
                            return { ...p, is_reconciling: false };
                        }
                        return {
                            ...p,
                            reconciliation: data.reconciliation,
                            is_reconciling: false
                        };
                    }));
                    return;
                }
            }

            // Failed response (including HTTP 400 for invalid dates) or missing reconciliation data: clear comparison
            updateProposalAcrossTabs(current => current.map(p => p.id === prop.id ? {
                ...p,
                reconciliation: undefined,
                is_reconciling: false
            } : p));
        } catch (err) {
            console.error('Failed to refresh reconciliation comparison:', err);
            // On network failure or error, clear reconciliation and stop loading indicator
            const latestVersion = reconciliationVersionsRef.current.get(prop.id);
            if (latestVersion === reqVersion) {
                updateProposalAcrossTabs(current => current.map(p => p.id === prop.id ? {
                    ...p,
                    reconciliation: undefined,
                    is_reconciling: false
                } : p));
            }
        }
    };

    // Update proposal field and refresh reconciliation when accounting attributes change (Finding 5 & Delivery 2A Final Issue 2)
    const updateProposal = (id: string, updates: Partial<ProposalItem>) => {
        setProposals(prev => {
            const currentProp = prev.find(p => p.id === id);
            if (!currentProp) return prev;

            const isAccountingAttributeChanged = (
                updates.account_id !== undefined ||
                updates.effective_date !== undefined ||
                updates.amount_cents !== undefined ||
                updates.balance_kind !== undefined ||
                updates.currency !== undefined
            );

            // Did the user deliberately change supporting detail classification?
            // Why this exists:
            // Fulfills Delivery 2A Narrow Closing Corrections (Item 1):
            // Only deliberate changes to is_component_of_total set explicit_classification_correction: true.
            // Generic confirmations (Confirm Row), account selection, amount, date, or currency changes
            // must NOT authorize that override.
            const isClassificationExplicitlyChanged = updates.is_component_of_total !== undefined &&
                updates.is_component_of_total !== currentProp.is_component_of_total;

            let updated: ProposalItem = {
                ...currentProp,
                ...updates,
                is_user_modified: true,
                explicit_classification_correction: updates.explicit_classification_correction !== undefined
                    ? updates.explicit_classification_correction
                    : (isClassificationExplicitlyChanged ? true : currentProp.explicit_classification_correction)
            };

            if (isAccountingAttributeChanged) {
                const targetAccountId = updated.account_id;
                const targetAmountCents = updated.amount_cents;
                const targetAcc = targetAccountId ? accounts.find(a => a.id === targetAccountId) : null;
                const isTracked = targetAcc?.tracking_mode === 'transactions' || updated.tracking_mode === 'transactions';
                const hasValidDate = Boolean(updated.effective_date && typeof updated.effective_date === 'string' && isValidCalendarDate(updated.effective_date.trim()));
                const hasValidInputs = Boolean(targetAccountId) && targetAmountCents !== null && isTracked && hasValidDate;

                if (!hasValidInputs) {
                    // Inputs invalid, detached, untracked, or missing/invalid date: immediately clear comparison
                    updated.reconciliation = undefined;
                    updated.is_reconciling = false;
                } else {
                    // Valid transaction-tracked account with valid date: hide old comparison while recalculating
                    updated.reconciliation = undefined;
                    updated.is_reconciling = true;

                    // Increment version and dispatch request
                    const nextVersion = (reconciliationVersionsRef.current.get(id) || 0) + 1;
                    reconciliationVersionsRef.current.set(id, nextVersion);
                    refreshReconciliation(updated, nextVersion);
                }
            }

            return prev.map(p => p.id === id ? updated : p);
        });
    };

    // Remove proposal row
    const removeProposal = (id: string) => {
        reconciliationVersionsRef.current.delete(id);
        setProposals(prev => prev.filter(p => p.id !== id));
    };

    // Handle explicit currency correction on a proposal row
    // Why this exists:
    // When parsing pasted balances, currency symbols like '$' are ambiguous (could be AUD, USD, CAD, etc.).
    // Users must be able to correct the currency directly on the review row without having to re-edit raw text.
    // Tricky logic:
    // 1. Rescale amount_cents if switching between zero-decimal currencies (JPY) and two-decimal currencies (AUD/USD).
    // 2. If the row was previously mapped to an account with a conflicting currency, detach the account to prevent
    //    silent cross-currency contamination and clear the reconciliation comparison.
    // 3. Clear 'currency' from unresolved_fields and reset confirmed_by_user = false to require re-confirmation.
    // 4. Hide old reconciliation comparison while recalculating, or clear it if detached.
    // TODO: Support user-defined default currency preferences per institution/source.
    const handleProposalCurrencyChange = (id: string, newCurrency: CurrencyCode) => {
        setProposals(prev => prev.map(p => {
            if (p.id !== id) return p;

            let newAmountCents: number | null = null;
            if (p.amount_cents !== null) {
                const oldDec = (p.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[p.currency] : 2;
                const newDec = (newCurrency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[newCurrency] : 2;
                const rawUnits = oldDec === 0 ? p.amount_cents : p.amount_cents / Math.pow(10, oldDec);
                newAmountCents = newDec === 0 ? Math.round(rawUnits) : Math.round(rawUnits * Math.pow(10, newDec));
            }

            // Check if current matched account conflicts with the new currency
            const currentAccount = p.account_id ? accounts.find(a => a.id === p.account_id) : null;
            const accountStillValid = currentAccount ? currentAccount.currency === newCurrency : false;
            const effectiveAccountId = accountStillValid ? p.account_id : null;

            const isTracked = currentAccount?.tracking_mode === 'transactions' || p.tracking_mode === 'transactions';
            const hasValidDate = Boolean(p.effective_date && typeof p.effective_date === 'string' && isValidCalendarDate(p.effective_date.trim()));
            const hasValidInputs = Boolean(effectiveAccountId) && newAmountCents !== null && isTracked && hasValidDate;

            const updated: ProposalItem = {
                ...p,
                currency: newCurrency,
                amount_cents: newAmountCents,
                account_id: effectiveAccountId,
                account_name: accountStillValid ? p.account_name : p.raw_account_name,
                expected_balance_revision: accountStillValid ? p.expected_balance_revision : 1,
                previous_amount_cents: accountStillValid ? p.previous_amount_cents : null,
                unresolved_fields: p.unresolved_fields?.filter(f => f !== 'currency'),
                confirmed_by_user: false,
                is_user_modified: true,
                reconciliation: undefined, // Clear old comparison immediately!
                is_reconciling: hasValidInputs
            };

            if (hasValidInputs) {
                const nextVersion = (reconciliationVersionsRef.current.get(id) || 0) + 1;
                reconciliationVersionsRef.current.set(id, nextVersion);
                refreshReconciliation(updated, nextVersion);
            }

            return updated;
        }));
    };

    // Inline Account Creation Submission
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAccountName.trim() || !newAccountEntityId) return;

        // Guard against silent currency rewriting:
        // When creating an account for a proposal, the account currency must match the observation currency,
        // UNLESS the proposal currency was an unconfirmed/ambiguous guess that the user is now explicitly resolving.
        const pendingProp = pendingProposalId ? proposals.find(p => p.id === pendingProposalId) : null;
        const isPendingCurrencyLocked = pendingProp ? (!pendingProp.unresolved_fields?.includes('currency') || pendingProp.confirmed_by_user) : false;

        if (pendingProp && newAccountCurrency !== pendingProp.currency && isPendingCurrencyLocked) {
            alert(`Cannot create account in ${newAccountCurrency} for an observation locked to ${pendingProp.currency}. Observation currency cannot be rewritten silently.`);
            return;
        }

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_account',
                    account: {
                        entity_id: newAccountEntityId,
                        name: newAccountName.trim(),
                        type: newAccountType,
                        sub_type: newAccountSubType,
                        currency: newAccountCurrency,
                        tracking_mode: newAccountTrackingMode
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const createdAcc = data.account;
                await loadAccountsAndEntities();

                // If created from a proposal row, assign it immediately and sync currency
                if (pendingProposalId && createdAcc) {
                    const oldProp = proposals.find(p => p.id === pendingProposalId);
                    let targetAmountCents: number | null = oldProp?.amount_cents ?? null;
                    if (oldProp && oldProp.amount_cents !== null && oldProp.currency !== createdAcc.currency) {
                        const oldDec = (oldProp.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[oldProp.currency] : 2;
                        const newDec = (createdAcc.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[createdAcc.currency] : 2;
                        const rawUnits = oldDec === 0 ? oldProp.amount_cents : oldProp.amount_cents / Math.pow(10, oldDec);
                        targetAmountCents = newDec === 0 ? Math.round(rawUnits) : Math.round(rawUnits * Math.pow(10, newDec));
                    }

                    updateProposal(pendingProposalId, {
                        account_id: createdAcc.id,
                        account_name: createdAcc.name,
                        currency: createdAcc.currency,
                        amount_cents: targetAmountCents,
                        unresolved_fields: oldProp?.unresolved_fields?.filter(f => f !== 'currency' && f !== 'owner'),
                        owner_conflict_message: null,
                        confirmed_by_user: false
                    });
                }

                setIsCreateAccountOpen(false);
                setNewAccountName('');
                setPendingProposalId(null);
            }
        } catch (err) {
            console.error('Error creating account inline:', err);
        }
    };

    // Save All Confirmed Balances
    // Why this exists:
    // Fulfills Independent Assessment Finding 4: Partial saves leave remaining items visibly pending.
    // If only a subset of statement proposals are mapped and saved, the saved items are marked [Saved]
    // while the remaining unmapped or pending proposals stay visibly pending in the modal rather than
    // disappearing or being falsely marked saved.
    //
    // Tricky logic:
    // 1. In statement tab, filters out already saved proposals (!p.is_saved).
    // 2. Includes proposal_id on each observation payload so the server can track exactly which items to tag.
    // 3. Closes modal ONLY when all statement items are saved. On partial saves, keeps modal open and displays partialSaveNotice.
    // 4. In paste tab, commits batch and clears only pasted state.
    //
    // TODO: Support selective checkbox selection for bulk partial saves in future releases.
    const handleSaveBatch = async () => {
        setIsSaving(true);
        setPartialSaveNotice(null);

        // Delivery 2B Correction 2: Immediately cancel pending debounced autosave timer
        // and increment version ref so any in-flight autosave is ignored on return.
        if (autosyncTimeoutRef.current) {
            clearTimeout(autosyncTimeoutRef.current);
            autosyncTimeoutRef.current = null;
        }
        autosyncDebounceSeqRef.current++;

        try {
            let itemsToSave: any[] = [];

            if (activeTab === 'statement') {
                const eligibleProposals = statementProposals.filter(p => !p.is_saved);

                // Check if any matched proposal has unconfirmed review findings
                const unconfirmedFindings = eligibleProposals.filter(
                    p => p.account_id !== null && p.unresolved_fields && p.unresolved_fields.length > 0 && !p.confirmed_by_user
                );
                if (unconfirmedFindings.length > 0) {
                    alert(
                        `Please confirm or resolve the review findings on ${unconfirmedFindings.length} account row(s) before saving (e.g. verify ambiguous currency, date, or component relationship). Click "Confirm Row" on flagged items to approve.`
                    );
                    setIsSaving(false);
                    return;
                }

                const missingAmounts = eligibleProposals.filter(p => p.account_id !== null && p.amount_cents === null);
                if (missingAmounts.length > 0) {
                    alert(`Please enter a valid statement amount for ${missingAmounts.length} matched row(s) before saving.`);
                    setIsSaving(false);
                    return;
                }

                const matchedItems = eligibleProposals.filter(p => p.account_id !== null && p.amount_cents !== null);
                if (matchedItems.length === 0) {
                    alert('No new or unmapped balance updates to save.');
                    setIsSaving(false);
                    return;
                }

                itemsToSave = matchedItems.map((p, idx) => ({
                    proposal_id: p.id,
                    account_id: p.account_id!,
                    amount_cents: p.amount_cents!,
                    currency: p.currency,
                    balance_kind: p.balance_kind,
                    effective_date: p.effective_date,
                    source_type: 'document' as const,
                    source_batch_id: null,
                    source_reference: activeStatementFilename || 'statement.pdf',
                    source_excerpt: p.source_excerpt || null,
                    document_id: p.document_id || activeDocumentId || null,
                    page_number: typeof p.page_number === 'number' ? p.page_number : null,
                    is_user_modified: Boolean(p.is_user_modified),
                    explicit_classification_correction: Boolean(p.explicit_classification_correction),
                    explicit_correction: Boolean(p.explicit_classification_correction),
                    is_component_of_total: Boolean(p.is_component_of_total),
                    parent_observation_id: p.parent_observation_id || null,
                    expected_balance_revision: p.expected_balance_revision,
                    raw_label: p.raw_label,
                    unresolved_fields: p.unresolved_fields,
                    confirmed_by_user: p.confirmed_by_user
                }));
            } else if (activeTab === 'paste') {
                const unconfirmedFindings = pastedProposals.filter(
                    p => p.account_id !== null && p.unresolved_fields && p.unresolved_fields.length > 0 && !p.confirmed_by_user
                );
                if (unconfirmedFindings.length > 0) {
                    alert(
                        `Please confirm or resolve the review findings on ${unconfirmedFindings.length} account row(s) before saving (e.g. verify ambiguous currency, date, or component relationship). Click "Confirm Row" on flagged items to approve.`
                    );
                    setIsSaving(false);
                    return;
                }

                const missingAmounts = pastedProposals.filter(p => p.account_id !== null && p.amount_cents === null);
                if (missingAmounts.length > 0) {
                    alert(`Please enter a valid statement amount for ${missingAmounts.length} matched row(s) before saving.`);
                    setIsSaving(false);
                    return;
                }

                const matchedItems = pastedProposals.filter(p => p.account_id !== null && p.amount_cents !== null);
                if (matchedItems.length === 0) {
                    alert('No accounts matched or values entered to save.');
                    setIsSaving(false);
                    return;
                }

                const batchId = `batch-${simpleHash(rawText.trim())}`;
                itemsToSave = matchedItems.map((p, idx) => ({
                    proposal_id: p.id,
                    account_id: p.account_id!,
                    amount_cents: p.amount_cents!,
                    currency: p.currency,
                    balance_kind: p.balance_kind,
                    effective_date: p.effective_date,
                    source_type: 'table_paste' as const,
                    source_batch_id: batchId,
                    source_reference: `row-${idx}-${simpleHash(p.source_excerpt || p.source_line || p.raw_account_name)}`,
                    source_excerpt: p.source_excerpt || null,
                    is_user_modified: Boolean(p.is_user_modified),
                    explicit_classification_correction: Boolean(p.explicit_classification_correction),
                    explicit_correction: Boolean(p.explicit_classification_correction),
                    is_component_of_total: Boolean(p.is_component_of_total),
                    parent_observation_id: p.parent_observation_id || null,
                    expected_balance_revision: p.expected_balance_revision,
                    raw_label: p.raw_label,
                    unresolved_fields: p.unresolved_fields,
                    confirmed_by_user: p.confirmed_by_user
                }));
            } else {
                // Manual entries
                const today = new Date().toISOString().split('T')[0];
                itemsToSave = Object.entries(manualEntries)
                    .filter(([_, entry]) => entry.amount.trim().length > 0 && !isNaN(parseFloat(entry.amount)))
                    .map(([accId, entry]) => {
                        const targetAcc = accounts.find(a => a.id === accId);
                        const curr = (targetAcc?.currency || 'AUD') as CurrencyCode;
                        const dec = (curr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[curr] : 2;
                        const fac = Math.pow(10, dec);
                        const cents = dec === 0 ? Math.round(parseFloat(entry.amount)) : Math.round(parseFloat(entry.amount) * fac);

                        return {
                            account_id: accId,
                            amount_cents: cents,
                            currency: curr,
                            balance_kind: entry.kind || 'current_balance',
                            effective_date: entry.date || today,
                            source_type: 'manual' as const,
                            document_id: fallbackDocumentId || undefined,
                            expected_balance_revision: targetAcc?.balance_revision || 1
                        };
                    });
            }

            if (itemsToSave.length === 0) {
                alert('No accounts matched or values entered to save.');
                setIsSaving(false);
                return;
            }

            const res = await fetch('/api/accounting/balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: itemsToSave,
                    batch: activeTab === 'paste' ? {
                        id: `batch-${simpleHash(rawText.trim())}`,
                        raw_text: rawText.trim(),
                        extraction_method: extractionMethod,
                        model_identifier: modelUsed || null,
                        created_at: new Date().toISOString()
                    } : undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to save balance observations');
            }

            // Broadcast refresh event for dashboard and widgets
            window.dispatchEvent(new Event('opennetworth_balances_updated'));

            // Refresh accounts list to reflect newly recorded balances
            await loadAccountsAndEntities();

            // Sourced saved observations & affected accounts (Batch C1 Requirement 4)
            const savedItems: Array<{ account_id: string, id: string }> = Array.isArray(data.items) ? data.items : [];
            const actualCount: number = typeof data.count === 'number' ? data.count : savedItems.length;
            const affectedAccountIds: string[] = Array.from(new Set(savedItems.map((it: any) => it.account_id).filter(Boolean)));

            if (activeTab === 'statement') {
                const savedIds = new Set(itemsToSave.map(item => item.proposal_id));
                const updatedStatementProposals = statementProposals.map(p => savedIds.has(p.id) ? { ...p, is_saved: true } : p);
                setStatementProposals(updatedStatementProposals);

                const remainingPending = updatedStatementProposals.filter(p => !p.is_saved);

                if (remainingPending.length === 0) {
                    setSaveSuccess(true);
                    setTimeout(() => {
                        setSaveSuccess(false);
                        setStatementProposals([]);
                        setActiveDocumentId(null);
                        onClose({
                            type: 'pdf_statement',
                            balancesUpdated: actualCount,
                            message: `${actualCount} balance(s) updated`,
                            accountId: affectedAccountIds.length === 1 ? affectedAccountIds[0] : undefined,
                            accountIds: affectedAccountIds,
                            observationId: savedItems.length === 1 ? savedItems[0].id : undefined
                        });
                    }, 600);
                } else {
                    setPartialSaveNotice(`Saved ${actualCount} balance observation(s). ${remainingPending.length} item(s) remain pending review.`);
                }
            } else if (activeTab === 'paste') {
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setPastedProposals([]);
                    setRawText('');
                    onClose({
                        type: 'pdf_statement',
                        balancesUpdated: actualCount,
                        message: `${actualCount} balance(s) updated`,
                        accountId: affectedAccountIds.length === 1 ? affectedAccountIds[0] : undefined,
                        accountIds: affectedAccountIds,
                        observationId: savedItems.length === 1 ? savedItems[0].id : undefined
                    });
                }, 600);
            } else {
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setManualEntries({});
                    setFallbackDocumentId(null);
                    setFallbackFilename(null);
                    onClose({
                        type: 'pdf_statement',
                        balancesUpdated: actualCount,
                        message: `${actualCount} balance(s) updated`,
                        accountId: affectedAccountIds.length === 1 ? affectedAccountIds[0] : undefined,
                        accountIds: affectedAccountIds,
                        observationId: savedItems.length === 1 ? savedItems[0].id : undefined
                    });
                }, 600);
            }
        } catch (err: any) {
            alert(`Save error: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // Helper to format currency display respecting scale (JPY = 0, AUD = 2)
    const formatCents = (cents: number, currency: string) => {
        const curr = (currency || 'AUD').toUpperCase() as CurrencyCode;
        const decimals = (curr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[curr] : 2;
        const factor = Math.pow(10, decimals);
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: curr,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(cents / factor);
    };

    const isValuationKind = (kind: BalanceKind) => {
        const nonVal = ['credit_limit', 'available_credit', 'available_redraw', 'buying_power', 'projected_future_value', 'unresolved'];
        return !nonVal.includes(kind);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-card text-card-foreground rounded-3xl w-full max-w-5xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600/10 text-blue-600 rounded-2xl">
                            <Scale size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                                Fast Balance Updates
                                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <ShieldCheck size={11} /> 100% On-Device
                                </span>
                                {activeTab === 'statement' && activeDocumentId && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                        autosyncStatus === 'saving'
                                            ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                            : autosyncStatus === 'error'
                                            ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                            : autosyncStatus === 'saved'
                                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                            : 'bg-muted text-muted-foreground border-border'
                                    }`}>
                                        {autosyncStatus === 'saving' && <RefreshCw size={10} className="animate-spin" />}
                                        {autosyncStatus === 'saving' && 'Autosaving...'}
                                        {autosyncStatus === 'error' && <AlertTriangle size={10} />}
                                        {autosyncStatus === 'error' && 'Autosave Failed'}
                                        {autosyncStatus === 'saved' && <Check size={10} />}
                                        {autosyncStatus === 'saved' && 'Review Autosaved'}
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Quickly refresh your Super, Trading, and Bank running totals without third-party cloud data leaks.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setFallbackDocumentId(null);
                            setFallbackFilename(null);
                            onClose();
                        }}
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tab Switcher */}
                <div className="px-6 pt-4 border-b border-border flex gap-4 bg-muted/10">
                    <button
                        onClick={() => {
                            setFallbackDocumentId(null);
                            setFallbackFilename(null);
                            setActiveTab('paste');
                        }}
                        className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'paste'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileSpreadsheet size={16} />
                        Paste Table / CSV
                    </button>
                    <button
                        onClick={() => {
                            setFallbackDocumentId(null);
                            setFallbackFilename(null);
                            setActiveTab('statement');
                        }}
                        className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'statement'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <FileText size={16} />
                        Statement PDF
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'manual'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Scale size={16} />
                        Manual Fast Entry
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Statement PDF Upload Dropzone (when in statement tab and no proposals yet) */}
                    {activeTab === 'statement' && proposals.length === 0 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">
                                    Upload bank or investment statement (PDF):
                                </label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Upload PDF statements from CBA, Macquarie, Hostplus, or any financial institution. Sourced balances and page citations will be extracted locally.
                                </p>
                            </div>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                                onDragLeave={() => setIsDraggingFile(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDraggingFile(false);
                                    const file = e.dataTransfer.files?.[0];
                                    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
                                        handleStatementUpload(file);
                                    } else if (file) {
                                        setStatementUploadError('Please select a valid PDF file.');
                                    }
                                }}
                                className={`border-2 border-dashed rounded-3xl p-10 text-center transition-colors ${
                                    isDraggingFile
                                        ? 'border-blue-500 bg-blue-500/5'
                                        : 'border-border hover:border-muted-foreground/50 bg-muted/10'
                                }`}
                            >
                                <input
                                    type="file"
                                    id="statement-pdf-input"
                                    accept="application/pdf"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleStatementUpload(file);
                                    }}
                                    className="hidden"
                                />
                                {isUploadingStatement ? (
                                    <div className="flex flex-col items-center justify-center space-y-3 py-6">
                                        <RefreshCw size={32} className="animate-spin text-blue-600" />
                                        <p className="text-sm font-bold text-foreground">Reading statement pages & extracting balances...</p>
                                        <p className="text-xs text-muted-foreground">Evaluating page coverage and preserving document context locally.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                            <UploadCloud size={28} />
                                        </div>
                                        <div>
                                            <label
                                                htmlFor="statement-pdf-input"
                                                className="text-sm font-bold text-blue-600 hover:text-blue-500 cursor-pointer underline"
                                            >
                                                Click to select a statement PDF
                                            </label>
                                            <span className="text-sm text-foreground"> or drag and drop here</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground max-w-md">
                                            Supports credit cards, mortgages, superannuation, and bank accounts. Selectable-text PDFs are processed locally with 100% on-device privacy.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {statementUploadError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                        <div>
                                            <span className="font-bold">Extraction Error: </span>
                                            {statementUploadError}
                                        </div>
                                        {fallbackDocumentId && (
                                            <div className="mt-2 pt-2 border-t border-red-500/20 flex items-center justify-between">
                                                <span className="text-[11px] text-muted-foreground">
                                                    Document retained ({fallbackFilename || 'PDF'}). You can record balances manually with this document retained as evidence.
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTab('manual')}
                                                    className="px-2.5 py-1 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg transition-colors shrink-0"
                                                >
                                                    Enter manually with document
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'paste' && proposals.length === 0 ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-foreground mb-1">
                                    Paste your account summaries or spreadsheets:
                                </label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Copy rows directly from online banking, spreadsheets (CSV/TSV), or PDF text:
                                </p>
                                <textarea
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    rows={8}
                                    placeholder={`Everyday Checking, "$1,234.56", 2026-09-18, Current\nAustralianSuper, "$150,000.00", 2026-09-18, Portfolio Value\nPlatinum Credit Card, "-$450.00", 2026-09-18, Statement Balance\nHome Loan Redraw, "$25,000.00", 2026-09-18, Available Redraw`}
                                    className="w-full font-mono text-xs p-4 rounded-2xl bg-muted/40 border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-y"
                                />
                            </div>

                            {parseError && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {parseError}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    onClick={handleParse}
                                    disabled={isParsing || !rawText.trim()}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {isParsing ? 'Finding balances...' : 'Find balances'}
                                </button>
                            </div>
                        </div>
                    ) : (activeTab === 'paste' || activeTab === 'statement') && proposals.length > 0 ? (
                        <div className="space-y-4">
                            {/* Coverage Disclosures & Statement Evidence Banners */}
                            {coverageSummary && (coverageSummary.coverage_level === 'partial' || coverageSummary.unreadable_pages > 0) && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <span className="font-bold">Partial Extraction Disclosed: </span>
                                        {coverageSummary.disclosures && coverageSummary.disclosures.length > 0 ? coverageSummary.disclosures.join('; ') : `Read ${coverageSummary.readable_pages} of ${coverageSummary.total_pages} pages.`}
                                        <span className="block mt-0.5 text-[11px] opacity-80">
                                            Unreadable pages contain scanned or image-only content. Sourced balances below are from readable text.
                                        </span>
                                    </div>
                                </div>
                            )}

                            {alreadySavedNotice && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-400">
                                    <Check size={16} className="mt-0.5 shrink-0" />
                                    <div>
                                        <span className="font-bold">Previously Saved Statement: </span>
                                        Balances from this statement were previously committed. Resuming review session; new modifications will update records without duplicates.
                                    </div>
                                </div>
                            )}

                            {activeStatementFilename && (
                                <div className="flex items-center justify-between p-2.5 bg-muted/30 border border-border rounded-xl text-xs">
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-blue-500" />
                                        <span className="font-semibold text-foreground">{activeStatementFilename}</span>
                                        {activeDocumentId && (
                                            <a
                                                href={`/api/documents/raw?id=${encodeURIComponent(activeDocumentId)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 ml-2"
                                            >
                                                <ExternalLink size={10} /> View Retained PDF
                                            </a>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setActiveDocumentId(null);
                                            setActiveStatementFilename(null);
                                            setProposals([]);
                                            setCoverageSummary(null);
                                            setAlreadySavedNotice(false);
                                        }}
                                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                                    >
                                        Upload another statement
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-foreground">Review & Confirm Balances</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Review account matches, balance kinds, and check the delta before saving.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setProposals([]);
                                        if (activeTab === 'statement') {
                                            setActiveDocumentId(null);
                                            setActiveStatementFilename(null);
                                            setCoverageSummary(null);
                                        }
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground underline"
                                >
                                    {activeTab === 'statement' ? 'Upload Different Statement' : 'Paste Different Text'}
                                </button>
                            </div>

                            {partialSaveNotice && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        <span>{partialSaveNotice}</span>
                                    </div>
                                    <button
                                        onClick={() => setPartialSaveNotice(null)}
                                        className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}

                            {autosyncStatus === 'error' && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                                        <span>Autosave failed: {autosyncError || 'Could not persist review state to SQLite.'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Review Table */}
                            <div className="border border-border rounded-2xl overflow-hidden bg-muted/10">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold text-[11px] tracking-wider">
                                                    <tr>
                                                        <th className="p-3 w-1/3">Account to update</th>
                                                        <th className="p-3">Balance meaning & Impact</th>
                                                        <th className="p-3 w-32">Statement date</th>
                                                        <th className="p-3 text-right w-44">Statement balance</th>
                                                        <th className="p-3 text-right w-36">Ledger / Variance</th>
                                                        <th className="p-3 text-center w-14">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {proposals.map((prop) => {
                                                        const isVal = isValuationKind(prop.balance_kind);
                                                        const prev = prop.previous_amount_cents;
                                                        // Honest delta calculation (F1):
                                                        // Old balance and new balance must refer to the same account and same currency.
                                                        // When currency is edited or account detached/remapped, delta is null (displayed as em dash)
                                                        // until an authoritative previous balance exists in that same account and currency.
                                                        const matchedAcc = prop.account_id ? accounts.find(a => a.id === prop.account_id) : null;
                                                        const isSameAccountAndCurrency = matchedAcc ? matchedAcc.currency === prop.currency : false;
                                                        const delta = (isSameAccountAndCurrency && prev !== null && prev !== undefined && prop.amount_cents !== null)
                                                            ? (prop.amount_cents - prev)
                                                            : null;

                                                        return (
                                                            <tr key={prop.id} className={`transition-colors ${prop.is_saved ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-muted/20'}`}>
                                                                {/* Account to update & Evidence */}
                                                                <td className="p-3 max-w-xs">
                                                                    <div className="space-y-1.5">
                                                                        {prop.is_saved && (
                                                                            <div className="flex items-center gap-1.5 pb-0.5">
                                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                                                                    <Check size={11} /> Saved to Vault
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <select
                                                                            value={prop.account_id || ''}
                                                                            disabled={prop.is_saved}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === '__CREATE_NEW__') {
                                                                                    setPendingProposalId(prop.id);
                                                                                    setNewAccountName(prop.raw_account_name);
                                                                                    setNewAccountCurrency(prop.currency);
                                                                                    setIsCreateAccountOpen(true);
                                                                                } else {
                                                                                    const matched = accounts.find(a => a.id === val);
                                                                                    if (matched && matched.currency !== prop.currency) {
                                                                                        alert(`Account "${matched.name}" is in ${matched.currency}, but this observation is in ${prop.currency}. Observation currency cannot be rewritten silently.`);
                                                                                        return;
                                                                                    }
                                                                                    updateProposal(prop.id, {
                                                                                        account_id: val || null,
                                                                                        account_name: matched?.name || prop.raw_account_name,
                                                                                        entity_id: matched?.entity_id || null,
                                                                                        currency: (matched?.currency || prop.currency) as CurrencyCode,
                                                                                        tracking_mode: (matched?.tracking_mode || 'balance') as any,
                                                                                        expected_balance_revision: matched?.balance_revision || 1,
                                                                                        previous_amount_cents: (matched && matched.balance_cents !== null && matched.balance_cents !== undefined) ? matched.balance_cents : null,
                                                                                        unresolved_fields: prop.unresolved_fields?.filter(f => f !== 'currency' && f !== 'owner'),
                                                                                        owner_conflict_message: null,
                                                                                        confirmed_by_user: false
                                                                                    });
                                                                                }
                                                                            }}
                                                                            className={`w-full bg-card text-foreground border rounded-lg px-2 py-1 text-xs font-medium outline-none ${
                                                                                !prop.account_id ? 'border-amber-500 ring-1 ring-amber-500' : 'border-border'
                                                                            } ${prop.is_saved ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                                        >
                                                                            <option value="">-- Select Account / Owner --</option>
                                                                            {entities.map(ent => {
                                                                                const entityAccounts = accounts.filter(a => a.entity_id === ent.id && (a.type === 'asset' || a.type === 'liability'));
                                                                                if (entityAccounts.length === 0) return null;
                                                                                return (
                                                                                    <optgroup key={ent.id} label={`${ent.name} (${ent.currency})`}>
                                                                                        {entityAccounts.map(acc => (
                                                                                            <option key={acc.id} value={acc.id}>
                                                                                                {acc.name} ({acc.currency} • {acc.sub_type})
                                                                                            </option>
                                                                                        ))}
                                                                                    </optgroup>
                                                                                );
                                                                            })}
                                                                            <option value="__CREATE_NEW__">+ Create New Account...</option>
                                                                        </select>

                                                                        {/* Fulfills Batch A Closing Correction 3: Render owner_conflict_message beside the affected account choice */}
                                                                        {prop.owner_conflict_message && (
                                                                            <div
                                                                                data-testid="owner-conflict-message"
                                                                                className="mt-1 flex items-start gap-1.5 p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px] leading-tight font-medium"
                                                                            >
                                                                                <AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                                                                <span>{prop.owner_conflict_message}</span>
                                                                            </div>
                                                                        )}

                                                                        {prop.raw_account_name && prop.account_name !== prop.raw_account_name && (
                                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                                                                <span>Found: <strong className="text-foreground">{prop.raw_account_name}</strong></span>
                                                                                {prop.account_mask && (
                                                                                    <span className="font-mono text-muted-foreground">({prop.account_mask})</span>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {prop.page_number && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                                    <FileText size={10} /> Page {prop.page_number}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                        {prop.tracking_mode === 'transactions' && (
                                                                            <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                                                Tracking: Transactions (Ledger is preserved; records observation)
                                                                            </span>
                                                                        )}

                                                                        {(prop.source_excerpt || prop.source_line) && (
                                                                            <div className="text-[11px] text-muted-foreground italic font-mono bg-muted/40 px-2 py-0.5 rounded line-clamp-2 border border-border/50" title={prop.source_excerpt || prop.source_line}>
                                                                                "{prop.source_excerpt || prop.source_line}"
                                                                            </div>
                                                                        )}

                                                                        {prop.unresolved_fields && prop.unresolved_fields.length > 0 && (
                                                                            <div className="flex flex-wrap items-center gap-1 pt-1">
                                                                                {prop.unresolved_fields.map((field) => (
                                                                                    <span
                                                                                        key={field}
                                                                                        className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                                                                        title={`Review finding: ${field}`}
                                                                                    >
                                                                                        <AlertCircle size={10} />
                                                                                        {field === 'owner' && 'Ambiguous Account / Multiple Owners'}
                                                                                        {field === 'currency' && 'Ambiguous Currency ($)'}
                                                                                        {field === 'effective_date' && 'Date Missing'}
                                                                                        {field === 'amount' && 'Amount Missing'}
                                                                                        {field === 'amount_sign' && 'Sign Flagged (Debt/Credit)'}
                                                                                        {field === 'amount_precision' && 'Precision Flagged'}
                                                                                        {field === 'balance_kind' && 'Unknown Balance Kind'}
                                                                                        {field === 'component_ambiguity' && 'Verify: Included in total or separate?'}
                                                                                        {!['owner', 'currency', 'effective_date', 'amount', 'amount_sign', 'amount_precision', 'balance_kind', 'component_ambiguity'].includes(field) && field}
                                                                                    </span>
                                                                                ))}
                                                                                {!prop.confirmed_by_user ? (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => updateProposal(prop.id, { confirmed_by_user: true })}
                                                                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 transition-colors"
                                                                                        title="Confirm unresolved attributes"
                                                                                    >
                                                                                        Confirm Row
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                                        <Check size={10} /> Confirmed
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Balance meaning & Impact */}
                                                                <td className="p-3">
                                                                    <div className="space-y-1">
                                                                        <select
                                                                            value={prop.balance_kind}
                                                                            disabled={prop.is_saved}
                                                                            onChange={(e) => updateProposal(prop.id, { balance_kind: e.target.value as BalanceKind })}
                                                                            className={`bg-card text-foreground border border-border rounded-lg px-2 py-1 text-xs font-medium outline-none ${
                                                                                prop.is_saved ? 'opacity-70 cursor-not-allowed' : ''
                                                                            }`}
                                                                        >
                                                                            <option value="current_balance">Current Balance</option>
                                                                            <option value="statement_closing_balance">Statement Closing</option>
                                                                            <option value="total_portfolio_value">Total Portfolio Value</option>
                                                                            <option value="securities_market_value">Securities Market Value</option>
                                                                            <option value="brokerage_cash">Brokerage Cash</option>
                                                                            <option value="outstanding_loan_principal">Loan Principal</option>
                                                                            <option value="available_balance">Available Balance (Holds)</option>
                                                                            <option value="credit_limit">Credit Limit (Non-Valuation)</option>
                                                                            <option value="available_credit">Available Credit (Non-Valuation)</option>
                                                                            <option value="available_redraw">Available Redraw (Non-Valuation)</option>
                                                                            <option value="buying_power">Buying Power (Non-Valuation)</option>
                                                                            <option value="projected_future_value">Projected Value (Non-Valuation)</option>
                                                                            <option value="unresolved">Unresolved / Other</option>
                                                                        </select>
                                                                        {!isVal && (
                                                                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                                                                * Excluded from Net Worth
                                                                            </span>
                                                                        )}
                                                                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-foreground font-medium pt-1">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={Boolean(prop.is_component_of_total)}
                                                                                disabled={prop.is_saved}
                                                                                onChange={(e) => updateProposal(prop.id, {
                                                                                    is_component_of_total: e.target.checked,
                                                                                    explicit_classification_correction: true
                                                                                })}
                                                                                className={`rounded border-border ${prop.is_saved ? 'cursor-not-allowed opacity-70' : ''}`}
                                                                            />
                                                                            <span>Supporting detail only</span>
                                                                        </label>
                                                                        {prop.is_component_of_total && (
                                                                            <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-semibold" title="Included in portfolio total: will not inflate net worth or overwrite portfolio total">
                                                                                * Included in Portfolio Total
                                                                            </span>
                                                                        )}
                                                                        {prop.has_newer_observation && (
                                                                            <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-bold" title={`Newer balance recorded on ${prop.existing_balance_date}`}>
                                                                                * Historical balance (Newer balance exists)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>

                                                                {/* Statement date */}
                                                                <td className="p-3">
                                                                    <input
                                                                        type="date"
                                                                        value={prop.effective_date}
                                                                        disabled={prop.is_saved}
                                                                        onChange={(e) => updateProposal(prop.id, {
                                                                            effective_date: e.target.value,
                                                                            unresolved_fields: prop.unresolved_fields?.filter(f => f !== 'effective_date'),
                                                                            confirmed_by_user: false
                                                                        })}
                                                                        className={`bg-card text-foreground border border-border rounded-lg px-2 py-1 text-xs font-medium outline-none ${
                                                                            prop.is_saved ? 'opacity-70 cursor-not-allowed' : ''
                                                                        }`}
                                                                    />
                                                                </td>

                                                                {/* Statement balance */}
                                                                <td className="p-3 text-right font-bold text-foreground">
                                                                    {(() => {
                                                                        const pDec = (prop.currency in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[prop.currency] : 2;
                                                                        const pFac = Math.pow(10, pDec);
                                                                        return (
                                                                            <div className="flex flex-col items-end gap-1">
                                                                                <div className="flex items-center justify-end gap-1.5">
                                                                                    <select
                                                                                        value={prop.currency}
                                                                                        disabled={prop.is_saved}
                                                                                        onChange={(e) => handleProposalCurrencyChange(prop.id, e.target.value as CurrencyCode)}
                                                                                        className={`bg-card text-foreground border border-border rounded-lg px-1.5 py-1 text-xs font-bold outline-none ${
                                                                                            prop.is_saved ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                                                                                        }`}
                                                                                        title="Correct proposal currency"
                                                                                    >
                                                                                        <option value="AUD">AUD</option>
                                                                                        <option value="USD">USD</option>
                                                                                        <option value="EUR">EUR</option>
                                                                                        <option value="GBP">GBP</option>
                                                                                        <option value="CAD">CAD</option>
                                                                                        <option value="NZD">NZD</option>
                                                                                        <option value="JPY">JPY</option>
                                                                                        <option value="CHF">CHF</option>
                                                                                        <option value="SGD">SGD</option>
                                                                                        <option value="HKD">HKD</option>
                                                                                    </select>
                                                                                    <input
                                                                                        type="number"
                                                                                        disabled={prop.is_saved}
                                                                                        step={pDec === 0 ? "1" : (1 / pFac).toString()}
                                                                                        placeholder="Enter amount"
                                                                                        value={prop.amount_cents === null ? '' : (pDec === 0 ? prop.amount_cents.toString() : (prop.amount_cents / pFac).toFixed(pDec))}
                                                                                        onChange={(e) => {
                                                                                            const textVal = e.target.value.trim();
                                                                                            if (textVal === '') {
                                                                                                updateProposal(prop.id, {
                                                                                                    amount_cents: null,
                                                                                                    unresolved_fields: Array.from(new Set([...(prop.unresolved_fields || []), 'amount'])),
                                                                                                    confirmed_by_user: false
                                                                                                });
                                                                                            } else {
                                                                                                const val = parseFloat(textVal);
                                                                                                if (!isNaN(val)) {
                                                                                                    updateProposal(prop.id, {
                                                                                                        amount_cents: pDec === 0 ? Math.round(val) : Math.round(val * pFac),
                                                                                                        unresolved_fields: prop.unresolved_fields?.filter(f => f !== 'amount_precision' && f !== 'amount_sign' && f !== 'amount'),
                                                                                                        confirmed_by_user: false
                                                                                                    });
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        className={`w-28 text-right bg-card text-foreground border rounded-lg px-2 py-1 text-xs font-bold outline-none ${
                                                                                            prop.amount_cents === null ? 'border-amber-500 ring-1 ring-amber-500' : 'border-border'
                                                                                        } ${prop.is_saved ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                                {prop.amount_cents === null && (
                                                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                                                                        Amount missing
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </td>

                                                                {/* Ledger / Variance */}
                                                                <td className="p-3 text-right">
                                                                    {(() => {
                                                                        const isTracked = (prop.tracking_mode === 'transactions' || Boolean(prop.reconciliation));
                                                                        const hasValidDate = Boolean(prop.effective_date && typeof prop.effective_date === 'string' && isValidCalendarDate(prop.effective_date.trim()));

                                                                        if (prop.is_reconciling) {
                                                                            return (
                                                                                <div className="space-y-0.5">
                                                                                    <div className="text-[10px] text-muted-foreground font-medium">
                                                                                        Ledger: <span className="animate-pulse">calculating...</span>
                                                                                    </div>
                                                                                    <div className="text-xs font-bold text-muted-foreground italic animate-pulse">
                                                                                        Calculating...
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }

                                                                        if (isTracked) {
                                                                            // Transaction-tracked account:
                                                                            // Missing/invalid date: keep comparison hidden, no numerical comparison remains or reappears
                                                                            // Why this exists:
                                                                            // Fulfills Delivery 2A Narrow Closing Corrections (Item 2):
                                                                            // When date is cleared or invalid, all numerical comparison figures are strictly hidden.
                                                                            // 
                                                                            // Tricky logic:
                                                                            // Neither Ledger balance nor diff badge nor previous delta may be displayed if date is blank/invalid.
                                                                            // 
                                                                            // TODO: In Milestone 2, provide quick date-picker suggestions for unparsed dates.
                                                                            if (!hasValidDate) {
                                                                                return <span className="text-[10px] text-muted-foreground italic">—</span>;
                                                                            }

                                                                            if (prop.reconciliation) {
                                                                                return (
                                                                                    <div className="space-y-0.5">
                                                                                        <div className="text-[10px] text-muted-foreground font-medium">
                                                                                            Ledger: {formatCents(prop.reconciliation.recorded_ledger_cents, prop.currency)}
                                                                                        </div>
                                                                                        {prop.amount_cents !== null && (
                                                                                            <div className="text-xs font-bold">
                                                                                                {(() => {
                                                                                                    if (!prop.reconciliation.is_comparable) {
                                                                                                        return (
                                                                                                            <span
                                                                                                                className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                                                                                                title={prop.reconciliation.notes || 'Reported balance kind is not directly comparable with ledger'}
                                                                                                            >
                                                                                                                Non-comparable
                                                                                                            </span>
                                                                                                        );
                                                                                                    }
                                                                                                    const diff = prop.reconciliation.diff_cents;
                                                                                                    return (
                                                                                                        <span className={`px-1.5 py-0.5 rounded-full ${
                                                                                                            diff > 0
                                                                                                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                                                                                                                : diff < 0
                                                                                                                ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                                                                                                : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                                                                        }`}>
                                                                                                            {diff === 0 ? 'Matched' : `Diff: ${diff > 0 ? '+' : ''}${formatCents(diff, prop.currency)}`}
                                                                                                        </span>
                                                                                                    );
                                                                                                })()}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return <span className="text-[10px] text-muted-foreground italic">—</span>;
                                                                        }

                                                                        // Balance-mode accounts: delta against previous balance
                                                                        return delta !== null ? (
                                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                                                                delta > 0
                                                                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                                                    : delta < 0
                                                                                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                                                                    : 'bg-muted text-muted-foreground'
                                                                            }`}>
                                                                                {delta > 0 ? '+' : ''}{formatCents(delta, prop.currency)}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-muted-foreground italic">—</span>
                                                                        );
                                                                    })()}
                                                                </td>

                                                                {/* Action */}
                                                                <td className="p-3 text-center">
                                                                    <button
                                                                        onClick={() => removeProposal(prop.id)}
                                                                        disabled={prop.is_saved}
                                                                        className={`p-1 rounded transition-colors ${
                                                                            prop.is_saved
                                                                                ? 'text-muted-foreground/30 cursor-not-allowed'
                                                                                : 'text-muted-foreground hover:text-red-500'
                                                                        }`}
                                                                        title={prop.is_saved ? "Observation already saved to vault" : "Remove row"}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                        /* Manual Fast Entry Tab */
                        <div className="space-y-4">
                            {fallbackDocumentId && (
                                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                        <span>
                                            Supporting document attached: <strong className="font-mono">{fallbackFilename || 'statement.pdf'}</strong> (Entry will be recorded as manual with document evidence)
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFallbackDocumentId(null);
                                            setFallbackFilename(null);
                                        }}
                                        className="text-xs font-bold text-muted-foreground hover:text-red-500 underline ml-2"
                                    >
                                        Remove document
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-foreground">Active Tracked Accounts</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Enter current balances directly for your accounts. Blank fields will be left untouched.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setPendingProposalId(null);
                                        setIsCreateAccountOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                    <Plus size={14} />
                                    Add Account
                                </button>
                            </div>

                            <div className="border border-border rounded-2xl overflow-hidden bg-muted/10">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-bold">
                                        <tr>
                                            <th className="p-3">Account Name</th>
                                            <th className="p-3">Tracking</th>
                                            <th className="p-3 text-right">Last Recorded</th>
                                            <th className="p-3 text-right">New Balance</th>
                                            <th className="p-3 text-right">Delta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {accounts.filter(a => a.type === 'asset' || a.type === 'liability').map((acc) => {
                                            const entry = manualEntries[acc.id] || { amount: '', kind: 'current_balance', date: new Date().toISOString().split('T')[0] };
                                            const newAmount = parseFloat(entry.amount);
                                            const hasNewVal = !isNaN(newAmount) && entry.amount.trim().length > 0;
                                            const accCurr = (acc.currency || 'AUD') as CurrencyCode;
                                            const accDec = (accCurr in CURRENCY_DECIMALS) ? CURRENCY_DECIMALS[accCurr] : 2;
                                            const accFac = Math.pow(10, accDec);
                                            const newCents = hasNewVal ? (accDec === 0 ? Math.round(newAmount) : Math.round(newAmount * accFac)) : 0;
                                            // Truthful prior balance check (F2):
                                            // Treat both null and undefined (or is_unknown) as unknown balances requiring initial balance.
                                            // Preserve genuine recorded zero balances (acc.balance_cents === 0) as known zeros.
                                            const hasKnownPriorBalance = acc.balance_cents !== null && acc.balance_cents !== undefined && !acc.is_unknown;
                                            const deltaCents = (hasNewVal && hasKnownPriorBalance)
                                                ? newCents - acc.balance_cents!
                                                : null;

                                            return (
                                                <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="p-3">
                                                        <p className="font-bold text-foreground">{acc.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{acc.sub_type} ({acc.currency})</p>
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            acc.tracking_mode === 'balance'
                                                                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                        }`}>
                                                            {acc.tracking_mode === 'balance' ? 'Balance Only' : 'Transactions'}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-medium text-muted-foreground">
                                                        {hasKnownPriorBalance ? (
                                                            formatCents(acc.balance_cents!, acc.currency)
                                                        ) : (
                                                            <span className="text-amber-600 dark:text-amber-400 font-bold italic text-xs">
                                                                Needs balance
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <input
                                                            id={`account-input-${acc.id}`}
                                                            type="number"
                                                            step={accDec === 0 ? "1" : (1 / accFac).toString()}
                                                            placeholder="Leave blank to skip"
                                                            value={entry.amount}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setManualEntries(prev => ({
                                                                    ...prev,
                                                                    [acc.id]: {
                                                                        ...entry,
                                                                        amount: val
                                                                    }
                                                                }));
                                                            }}
                                                            className="w-32 text-right bg-card text-foreground border border-border rounded-lg px-2.5 py-1 text-xs font-bold outline-none focus:border-blue-500"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        {deltaCents !== null ? (
                                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                                                deltaCents > 0
                                                                    ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                                    : deltaCents < 0
                                                                    ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}>
                                                                {deltaCents > 0 ? '+' : ''}{formatCents(deltaCents, acc.currency)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[10px]">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border flex items-center justify-between bg-muted/20">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <HelpCircle size={14} />
                        Balance updates create immutable, dated observations without overwriting transaction history.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveBatch}
                            disabled={isSaving || saveSuccess || (activeTab === 'paste' && proposals.length === 0)}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {saveSuccess ? (
                                <>
                                    <Check size={16} /> Saved!
                                </>
                            ) : isSaving ? (
                                'Saving Balances...'
                            ) : (
                                'Save balance updates'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Inline Account Creation Sub-Modal */}
            {isCreateAccountOpen && (
                <div className="fixed inset-0 bg-slate-950/80 z-[110] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
                    <div className="bg-card text-card-foreground rounded-3xl w-full max-w-md border border-border p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                                <Plus size={18} className="text-blue-600" />
                                Create New Account
                            </h4>
                            <button
                                onClick={() => setIsCreateAccountOpen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAccount} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">Account Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newAccountName}
                                    onChange={(e) => setNewAccountName(e.target.value)}
                                    placeholder="e.g. AustralianSuper, CommBank Smart Access"
                                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-muted-foreground mb-1">Owner Entity</label>
                                <select
                                    value={newAccountEntityId}
                                    onChange={(e) => setNewAccountEntityId(e.target.value)}
                                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                >
                                    {entities.map(ent => (
                                        <option key={ent.id} value={ent.id}>
                                            {ent.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">Type</label>
                                    <select
                                        value={newAccountType}
                                        onChange={(e) => setNewAccountType(e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                    >
                                        <option value="asset">Asset</option>
                                        <option value="liability">Liability</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">Sub-Type</label>
                                    <select
                                        value={newAccountSubType}
                                        onChange={(e) => setNewAccountSubType(e.target.value)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                    >
                                        {newAccountType === 'asset' ? (
                                            <>
                                                <option value="superannuation">Superannuation / Pension</option>
                                                <option value="checking">Checking / Everyday</option>
                                                <option value="savings">Savings Account</option>
                                                <option value="brokerage">Trading / Brokerage</option>
                                                <option value="real_estate">Real Estate</option>
                                                <option value="crypto">Cryptocurrency</option>
                                                <option value="other">Other Asset</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="credit_card">Credit Card</option>
                                                <option value="mortgage">Mortgage / Home Loan</option>
                                                <option value="personal_loan">Personal Loan</option>
                                                <option value="other">Other Liability</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">
                                        Currency {isPendingCurrencyLocked && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">(Locked to source)</span>}
                                    </label>
                                    <select
                                        value={newAccountCurrency}
                                        disabled={isPendingCurrencyLocked}
                                        onChange={(e) => setNewAccountCurrency(e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none disabled:opacity-60"
                                    >
                                        <option value="AUD">AUD ($)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                        <option value="CAD">CAD ($)</option>
                                        <option value="NZD">NZD ($)</option>
                                        <option value="JPY">JPY (¥)</option>
                                        <option value="CHF">CHF (CHF)</option>
                                        <option value="SGD">SGD ($)</option>
                                        <option value="HKD">HKD ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground mb-1">Tracking Mode</label>
                                    <select
                                        value={newAccountTrackingMode}
                                        onChange={(e) => setNewAccountTrackingMode(e.target.value as any)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-medium outline-none"
                                    >
                                        <option value="balance">Balance Only (Fast)</option>
                                        <option value="transactions">Full Transactions</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateAccountOpen(false)}
                                    className="px-3 py-1.5 text-xs font-bold border border-border rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
