/**
 * Milestone 1 Daily Financial Events & Transaction Ledger View
 * 
 * Why this component exists:
 * Implements the user interface for recording daily financial activities:
 * income, expenses, transfers between accounts, credit card bill repayments,
 * and multi-leg loan repayments (M1-FLOW-02, M1-FLOW-03, M1-FLOW-04, M1-FLOW-05).
 * Displays real-time period cash flow metrics and an auditable double-entry journal ledger.
 * 
 * Tricky logic:
 * - On transaction submission failure (M1-SAFE-04): The entry modal remains open,
 *   user inputs are strictly preserved, and an actionable error banner is rendered.
 * - Double-entry transparency: Users can expand any transaction in the ledger
 *   to inspect balanced debit/credit journal postings.
 * - Auditable corrections (M1-DOM-05, T13): Users can void transactions with a mandatory
 *   justification, storing an immutable snapshot in transaction_corrections.
 * 
 * TODO: Add CSV/OFX bulk file drop zone in Slice 1G.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
    Plus,
    ArrowDownRight,
    ArrowUpRight,
    ArrowRightLeft,
    CreditCard,
    Building2,
    Calendar,
    Tag,
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    X,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    ArrowLeft,
    Ban,
    DollarSign,
    Inbox
} from 'lucide-react';
import { Account, AccountSubType, CurrencyCode, Entity, parseToCents, formatMoney, centsToInputString, CURRENCY_DECIMALS, DraftItem } from '@/lib/domain/accounting/types';

/**
 * Format entity types into user-friendly labels without losing trust/household distinctions.
 */
const getOwnerTypeLabel = (type: string) => {
    switch (type) {
        case 'person':
            return 'Personal';
        case 'household':
            return 'Household';
        case 'business':
            return 'Business';
        case 'trust':
            return 'Trust';
        default:
            return type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Owner';
    }
};

interface AccountOption extends Account {
    balance_cents: number;
    formatted_balance: string;
}

interface TransactionPosting {
    id: string;
    account_id: string;
    amount_cents: number;
    currency: string;
    memo?: string | null;
}

interface TransactionItem {
    id: string;
    date: string;
    description: string;
    payee_or_payer?: string | null;
    status: string;
    origin: string;
    revision: number;
    created_at: string;
    evidence_refs?: any[] | null;
    postings: TransactionPosting[];
}

interface CashFlowSummary {
    total_income_cents_by_currency: Record<string, number>;
    total_expenses_cents_by_currency: Record<string, number>;
    net_savings_cents_by_currency: Record<string, number>;
    formatted_income_by_currency: Record<string, string>;
    formatted_expenses_by_currency: Record<string, string>;
    formatted_net_savings_by_currency: Record<string, string>;
    breakdown_by_category: Array<{
        account_id: string;
        account_name: string;
        type: 'income' | 'expense';
        sub_type: string;
        currency: string;
        total_cents: number;
        formatted_total: string;
        transaction_count: number;
    }>;
}

export interface DailyEventsViewProps {
    entities: Entity[];
    selectedEntityId: string;
    onNavigateToDocuments?: () => void;
    initialStartDate?: string;
    initialEndDate?: string;
    initialIntent?: string;
}

export const DailyEventsView: React.FC<DailyEventsViewProps> = ({ entities, selectedEntityId, onNavigateToDocuments, initialStartDate, initialEndDate, initialIntent }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const accountId = searchParams.get('account_id') || undefined;
    const PAGE_SIZE = 50;
    const [accounts, setAccounts] = useState<AccountOption[]>([]);
    const [transactions, setTransactions] = useState<TransactionItem[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
    const [cashFlow, setCashFlow] = useState<CashFlowSummary | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Filter dates
    const getLocalIsoDate = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };

    const [startDate, setStartDate] = useState(() => {
        if (initialStartDate) return initialStartDate;
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [endDate, setEndDate] = useState(() => {
        if (initialEndDate) return initialEndDate;
        return getLocalIsoDate();
    });

    // Modal state
    type TransactionType = 'expense' | 'income' | 'transfer' | 'card_repayment' | 'loan_repayment';
    type AccountCreationEligibleType = 'checking' | 'savings' | 'credit_card' | 'loan';

    const [activeTab, setActiveTab] = useState<TransactionType>('expense');
    const [modalView, setModalView] = useState<'transaction' | 'create_account' | 'reimbursement_preview'>('transaction');
    const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
    const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

    // Dedicated Account Creation State (Clarification 1 & 4)
    const [accountCreationTarget, setAccountCreationTarget] = useState<'formAccountId' | 'formToAccountId'>('formAccountId');
    const [accountCreationEligibleTypes, setAccountCreationEligibleTypes] = useState<AccountCreationEligibleType[]>(['checking', 'savings', 'credit_card']);
    const [inlineOwnerId, setInlineOwnerId] = useState('');
    const [inlineCurrency, setInlineCurrency] = useState<CurrencyCode>('USD');
    const [inlineAccountName, setInlineAccountName] = useState('');
    const [inlineAccountType, setInlineAccountType] = useState<AccountCreationEligibleType>('checking');
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);

    // Refs for keyboard focus management
    const triggerElementRef = useRef<HTMLElement | null>(null);
    const accountNameInputRef = useRef<HTMLInputElement | null>(null);

    // Currency change notification state (Clarification 2)
    const [currencyChangeNotice, setCurrencyChangeNotice] = useState<{ prev: string; current: string } | null>(null);

    // Collapsed note toggle
    const [isNoteOpen, setIsNoteOpen] = useState(false);

    // Contextual personally paid business expense state (Clarification 3)
    const [isPersonallyPaidBusiness, setIsPersonallyPaidBusiness] = useState(false);
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
    const [draftBusinessId, setDraftBusinessId] = useState('');
    const [draftPayerEntityId, setDraftPayerEntityId] = useState('');
    const [draftPaymentAccountId, setDraftPaymentAccountId] = useState('');
    const [draftCurrency, setDraftCurrency] = useState<CurrencyCode | null>(null);
    const [draftSourceDocumentId, setDraftSourceDocumentId] = useState<string | null>(null);
    const [draftSourceTransactionId, setDraftSourceTransactionId] = useState<string | null>(null);
    const [draftExpectReimbursement, setDraftExpectReimbursement] = useState<'yes' | 'no' | 'not_sure'>('not_sure');
    const [reimbursementWorkflows, setReimbursementWorkflows] = useState<any[]>([]);
    const [reimbursementsLoading, setReimbursementsLoading] = useState(false);
    const [reimbursementsError, setReimbursementsError] = useState<string | null>(null);

    // Stable idempotency key across submission retries (M1-SAFE-05)
    const [submissionIdempotencyKey, setSubmissionIdempotencyKey] = useState<string>(() => crypto.randomUUID());

    // Void modal state
    const [voidTargetTx, setVoidTargetTx] = useState<TransactionItem | null>(null);
    const [voidReason, setVoidReason] = useState('');
    const [voidActor, setVoidActor] = useState('User');

    // Reimbursement matching state
    const [matchingReimbursementId, setMatchingReimbursementId] = useState<string | null>(null);
    const [reimbCandidatesPersonal, setReimbCandidatesPersonal] = useState<any[]>([]);
    const [reimbCandidatesBusiness, setReimbCandidatesBusiness] = useState<any[]>([]);
    const [selectedReimbPersonal, setSelectedReimbPersonal] = useState<string | 'missing' | null>(null);
    const [selectedReimbBusiness, setSelectedReimbBusiness] = useState<string | 'missing' | null>(null);
    const [reimbCandidatesLoadingPersonal, setReimbCandidatesLoadingPersonal] = useState(false);
    const [reimbCandidatesLoadingBusiness, setReimbCandidatesLoadingBusiness] = useState(false);
    const [reimbCandidatesErrorPersonal, setReimbCandidatesErrorPersonal] = useState<string | null>(null);
    const [reimbCandidatesErrorBusiness, setReimbCandidatesErrorBusiness] = useState<string | null>(null);
    const reimbCandidatesSeqRef = useRef<{ personal: number; business: number }>({ personal: 0, business: 0 });
    // Explicit account and date review for missing movements (Requirement 1 & 2)
    const [missingPersonalAccountId, setMissingPersonalAccountId] = useState<string>('');
    const [missingPersonalDate, setMissingPersonalDate] = useState<string>('');
    const [missingBusinessAccountId, setMissingBusinessAccountId] = useState<string>('');
    const [missingBusinessDate, setMissingBusinessDate] = useState<string>('');

    // Undo Business Classification state
    const [undoViewActive, setUndoViewActive] = useState<boolean>(false);
    const [undoOriginalCategory, setUndoOriginalCategory] = useState<string | null>(null);
    const [undoSelectedCategory, setUndoSelectedCategory] = useState<string>('');
    const [undoLoadingPreview, setUndoLoadingPreview] = useState<boolean>(false);
    const [undoPurchaseDate, setUndoPurchaseDate] = useState<string>('');
    const [undoPurchaseDesc, setUndoPurchaseDesc] = useState<string>('');
    const [undoExpectedPersRevision, setUndoExpectedPersRevision] = useState<number | undefined>(undefined);
    const [undoExpectedBusRevision, setUndoExpectedBusRevision] = useState<number | undefined>(undefined);

    // Undo Reimbursement Match state
    const [undoMatchViewActive, setUndoMatchViewActive] = useState<boolean>(false);
    const [undoMatchPreview, setUndoMatchPreview] = useState<any>(null);
    const [undoMatchLoading, setUndoMatchLoading] = useState<boolean>(false);
    const [undoMatchNewPersonalAccount, setUndoMatchNewPersonalAccount] = useState<string>('');
    const [undoMatchNewBusinessAccount, setUndoMatchNewBusinessAccount] = useState<string>('');

    // React to URL changes (props update)
    useEffect(() => {
        if (initialStartDate) {
            setStartDate(initialStartDate);
        } else {
            const d = new Date();
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
        }
        
        if (initialEndDate) {
            setEndDate(initialEndDate);
        } else {
            const d = new Date();
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            setEndDate(d.toISOString().split('T')[0]);
        }
    }, [initialStartDate, initialEndDate]);

    // Auto-focus account name input when entering account creation
    useEffect(() => {
        if (modalView === 'create_account') {
            accountNameInputRef.current?.focus();
        }
    }, [modalView]);

    // Why these hooks exist:
    // Resolves Assessor Finding E: Transaction Entry modal & Void Confirmation modal lacked
    // focus containment (WCAG 2.1 AA), Escape handling, and ARIA dialog semantics.
    // Tricky logic:
    // When the entry modal is in inline 'create_account' sub-view, pressing Escape returns to the
    // transaction form rather than discarding all user inputs. In standard view, Escape closes the modal.
    // Focus is trapped within active dialog boundaries and restored to trigger on close.
    // TODO: In Milestone 2, support multiple nested modal layers with focus trap stack management.
    const handleCloseRecordModal = useCallback(() => {
        if (modalView === 'create_account') {
            handleBackFromAccountCreation();
        } else {
            setIsRecordModalOpen(false);
            setEditingDraftId(null);
            setIsPersonallyPaidBusiness(false);
            setDraftSourceTransactionId(null);
            setDraftSourceDocumentId(null);
        }
    }, [modalView]);

    const recordModalRef = useFocusTrap<HTMLDivElement>({
        isOpen: isRecordModalOpen,
        onClose: handleCloseRecordModal
    });

    const handleCloseVoidModal = useCallback(() => {
        setVoidTargetTx(null);
    }, []);

    const voidModalRef = useFocusTrap<HTMLDivElement>({
        isOpen: !!voidTargetTx,
        onClose: handleCloseVoidModal
    });

    const fetchDrafts = async () => {
        try {
            const res = await fetch('/api/accounting?view=drafts');
            if (res.ok) {
                const data = await res.json();
                if (data.drafts) setDrafts(data.drafts);
            }
        } catch (e) {
            console.error('Failed to load drafts:', e);
        }
    };

    const abortControllerRef = useRef<AbortController | null>(null);
    const reimbFetchSeqRef = useRef<number>(0);

    /**
     * Fetches reimbursement workflows scoped to the active entity.
     * 
     * Why this exists:
     * Maintains real-time visibility into inter-entity reimbursements awaiting settlement.
     * 
     * Tricky logic:
     * - Uses a sequence counter `reimbFetchSeqRef` alongside `AbortController` to guarantee
     *   that slow or delayed responses from a previously selected entity can never overwrite
     *   the currently active entity's state (Requirement 4).
     * - Distinct loading, error, and empty states are strictly preserved.
     */
    const fetchReimbursementWorkflows = useCallback(async (targetEntityId?: string) => {
        const entityToFetch = targetEntityId !== undefined ? targetEntityId : selectedEntityId;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const seq = ++reimbFetchSeqRef.current;

        setReimbursementsLoading(true);
        setReimbursementsError(null);
        try {
            const query = new URLSearchParams({ view: 'reimbursements' });
            if (entityToFetch !== 'all') {
                query.set('entity_id', entityToFetch);
            }
            const res = await fetch(`/api/accounting?${query.toString()}`, { signal: controller.signal });
            if (seq !== reimbFetchSeqRef.current || controller.signal.aborted) {
                return;
            }
            if (res.ok) {
                const data = await res.json();
                if (data.workflows) {
                    setReimbursementWorkflows(data.workflows);
                }
            } else {
                setReimbursementsError('Failed to load reimbursement workflows');
            }
        } catch (e: any) {
            if (e.name === 'AbortError' || seq !== reimbFetchSeqRef.current) return;
            console.error('Failed to load reimbursement workflows:', e);
            setReimbursementsError(e.message || 'Error connecting to server');
        } finally {
            if (seq === reimbFetchSeqRef.current && !controller.signal.aborted) {
                setReimbursementsLoading(false);
            }
        }
    }, [selectedEntityId]);

    useEffect(() => {
        fetchReimbursementWorkflows(selectedEntityId);
    }, [selectedEntityId, fetchReimbursementWorkflows]);

    /**
     * Why this function exists:
     * Loads candidate bank movements for reimbursement matching with independent per-leg
     * error handling, loading states, sequence tracking (to ignore stale responses),
     * and explicit candidate selection rules.
     * 
     * Tricky logic:
     * - An HTTP error (e.g. HTTP 500) must NEVER be treated as "no candidates / payment missing".
     *   It must display an actionable error with a Retry action and block matching.
     * - Manual creation requires a deliberate user selection; it is never auto-selected.
     * - If multiple plausible matches exist, the selection is left unresolved (null) rather than
     *   guessing the first candidate.
     * - If exactly one candidate exists, it is auto-selected to minimize user effort.
     * - Prior valid selections are preserved across retries.
     * 
     * TODO: Support candidate pagination or search filter in future milestone.
     */
    const fetchReimbCandidates = useCallback(async (workflowId: string, leg: 'personal' | 'business') => {
        const seq = ++reimbCandidatesSeqRef.current[leg];
        if (leg === 'personal') {
            setReimbCandidatesLoadingPersonal(true);
            setReimbCandidatesErrorPersonal(null);
        } else {
            setReimbCandidatesLoadingBusiness(true);
            setReimbCandidatesErrorBusiness(null);
        }

        try {
            const res = await fetch(`/api/accounting?view=reimbursement_candidates&workflow_id=${encodeURIComponent(workflowId)}&leg=${leg}`);
            if (seq !== reimbCandidatesSeqRef.current[leg]) return;

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.error || `Server error (HTTP ${res.status})`;
                if (leg === 'personal') {
                    setReimbCandidatesErrorPersonal(errMsg);
                } else {
                    setReimbCandidatesErrorBusiness(errMsg);
                }
                return;
            }

            const data = await res.json().catch(() => null);
            if (seq !== reimbCandidatesSeqRef.current[leg]) return;

            if (!data || data.success === false || !Array.isArray(data.candidates)) {
                const errMsg = data?.error || 'Invalid response format from server';
                if (leg === 'personal') {
                    setReimbCandidatesErrorPersonal(errMsg);
                } else {
                    setReimbCandidatesErrorBusiness(errMsg);
                }
                return;
            }

            const cands = data.candidates;
            if (leg === 'personal') {
                setReimbCandidatesPersonal(cands);
                setSelectedReimbPersonal(prev => {
                    // Preserve existing valid selection
                    if (prev === 'missing') return 'missing';
                    if (prev && cands.some((c: any) => c.id === prev)) return prev;
                    // Auto-select ONLY when there is exactly 1 candidate
                    if (cands.length === 1) return cands[0].id;
                    // Multiple plausible matches (> 1) or no matches (0): leave unresolved (null)
                    return null;
                });
            } else {
                setReimbCandidatesBusiness(cands);
                setSelectedReimbBusiness(prev => {
                    // Preserve existing valid selection
                    if (prev === 'missing') return 'missing';
                    if (prev && cands.some((c: any) => c.id === prev)) return prev;
                    // Auto-select ONLY when there is exactly 1 candidate
                    if (cands.length === 1) return cands[0].id;
                    // Multiple plausible matches (> 1) or no matches (0): leave unresolved (null)
                    return null;
                });
            }
        } catch (e: any) {
            if (seq !== reimbCandidatesSeqRef.current[leg]) return;
            const errMsg = e.message || 'Network error fetching candidates';
            if (leg === 'personal') {
                setReimbCandidatesErrorPersonal(errMsg);
            } else {
                setReimbCandidatesErrorBusiness(errMsg);
            }
        } finally {
            if (seq === reimbCandidatesSeqRef.current[leg]) {
                if (leg === 'personal') {
                    setReimbCandidatesLoadingPersonal(false);
                } else {
                    setReimbCandidatesLoadingBusiness(false);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (matchingReimbursementId) {
            const today = getLocalIsoDate();
            setMissingPersonalDate(today);
            setMissingBusinessDate(today);

            const wf = reimbursementWorkflows.find(w => w.id === matchingReimbursementId);
            if (wf) {
                // Initialize default missing account selections
                const pAcc = accounts.find(a => a.entity_id === wf.personal_entity_id && (a.type === 'asset' || a.sub_type === 'checking' || a.sub_type === 'savings') && a.currency === wf.currency);
                if (pAcc) setMissingPersonalAccountId(pAcc.id);
                const bAcc = accounts.find(a => a.entity_id === wf.business_entity_id && (a.type === 'asset' || a.sub_type === 'checking' || a.sub_type === 'savings') && a.currency === wf.currency);
                if (bAcc) setMissingBusinessAccountId(bAcc.id);
            }
            
            fetchReimbCandidates(matchingReimbursementId, 'personal');
            fetchReimbCandidates(matchingReimbursementId, 'business');
        } else {
            setReimbCandidatesPersonal([]);
            setReimbCandidatesBusiness([]);
            setReimbCandidatesErrorPersonal(null);
            setReimbCandidatesErrorBusiness(null);
            setSelectedReimbPersonal(null);
            setSelectedReimbBusiness(null);
            setMissingPersonalAccountId('');
            setMissingBusinessAccountId('');
        }
    }, [matchingReimbursementId, reimbursementWorkflows, accounts, fetchReimbCandidates]);

    // One-time migration for legacy browser drafts (Clarification 3)
    useEffect(() => {
        const migrateAndLoadDrafts = async () => {
            try {
                const saved = localStorage.getItem('opennetworth_drafts');
                if (saved) {
                    const legacyDrafts = JSON.parse(saved);
                    if (Array.isArray(legacyDrafts) && legacyDrafts.length > 0) {
                        for (const d of legacyDrafts) {
                            await fetch('/api/accounting', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'save_draft',
                                    draft: {
                                        id: d.id || crypto.randomUUID(),
                                        entity_id: d.business_id || null,
                                        payer_entity_id: null, // preserve facts without guessing
                                        payment_account_id: null, // preserve facts without guessing
                                        currency: null,
                                        amount_cents: d.amount ? parseToCents(String(d.amount), 'USD') : null,
                                        date: d.date || null,
                                        merchant: d.payee || null,
                                        description: d.description || 'Personally paid business expense',
                                        reimbursement_intent: d.expect_reimbursement || null,
                                        status: 'draft'
                                    }
                                })
                            });
                        }
                    }
                    localStorage.removeItem('opennetworth_drafts');
                }
            } catch (err) {
                console.error('Draft migration error:', err);
            }
            await fetchDrafts();
            await fetchReimbursementWorkflows();
        };

        migrateAndLoadDrafts();
    }, []);

    const handleTabChange = (newType: TransactionType) => {
        setActiveTab(newType);
        setError(null);
        setCurrencyChangeNotice(null);
        // Ensure displayed and submitted category strictly agree (F2 prevention)
        if (newType === 'expense') {
            const validExpenseCategories: AccountSubType[] = ['groceries', 'utilities', 'living_expense', 'repairs_maintenance', 'other'];
            if (!validExpenseCategories.includes(formCategory)) {
                setFormCategory('groceries');
            }
        } else if (newType === 'income') {
            const validIncomeCategories: AccountSubType[] = ['salary', 'freelance', 'rental_income', 'dividend', 'interest_income', 'other'];
            if (!validIncomeCategories.includes(formCategory)) {
                setFormCategory('salary');
            }
        }
    };

    // Form inputs: Expense / Income
    const [formAccountId, setFormAccountId] = useState('');
    const [formCategory, setFormCategory] = useState<AccountSubType>('groceries');
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(getLocalIsoDate);
    const [formPayee, setFormPayee] = useState('');
    const [formDescription, setFormDescription] = useState('');

    // Form inputs: Transfer
    const [formToAccountId, setFormToAccountId] = useState('');

    // Form inputs: Loan Split
    const [formLoanPrincipal, setFormLoanPrincipal] = useState('');
    const [formLoanInterest, setFormLoanInterest] = useState('');
    const [formLoanFee, setFormLoanFee] = useState('');

    /**
     * Opens dedicated account creation sub-view, temporarily replacing transaction form.
     * Preserves all entered transaction fields and targets the exact field that triggered it.
     */
    const openAccountCreation = (
        targetField: 'formAccountId' | 'formToAccountId',
        eligibleTypes: AccountCreationEligibleType[] = ['checking', 'savings', 'credit_card'],
        triggerEl?: HTMLElement | null
    ) => {
        if (triggerEl) {
            triggerElementRef.current = triggerEl;
        } else if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
            triggerElementRef.current = document.activeElement;
        }
        setAccountCreationTarget(targetField);
        setAccountCreationEligibleTypes(eligibleTypes);
        setInlineAccountType(eligibleTypes[0]);
        if (selectedEntityId && selectedEntityId !== 'all') {
            setInlineOwnerId(selectedEntityId);
            const ent = entities.find(e => e.id === selectedEntityId);
            if (ent?.currency) setInlineCurrency(ent.currency as CurrencyCode);
        } else {
            setInlineOwnerId('');
            setInlineCurrency('USD');
        }
        setInlineAccountName('');
        setError(null);
        setModalView('create_account');
    };

    const handleBackFromAccountCreation = () => {
        setError(null);
        setModalView('transaction');
        setTimeout(() => {
            triggerElementRef.current?.focus();
        }, 50);
    };

    const handleAccountSelectChange = (
        newAccountId: string,
        targetField: 'formAccountId' | 'formToAccountId',
        eligibleTypes: AccountCreationEligibleType[] = ['checking', 'savings', 'credit_card'],
        triggerEl?: HTMLElement | null
    ) => {
        if (newAccountId === '__new__') {
            openAccountCreation(targetField, eligibleTypes, triggerEl);
            return;
        }
        if (targetField === 'formAccountId') {
            const currentSelectedId = isPersonallyPaidBusiness ? (draftPaymentAccountId || formAccountId) : formAccountId;
            const prevAccount = accounts.find(a => a.id === currentSelectedId);
            const newAccount = accounts.find(a => a.id === newAccountId);
            if (prevAccount && newAccount && prevAccount.currency !== newAccount.currency && formAmount.trim() !== '') {
                setCurrencyChangeNotice({
                    prev: prevAccount.currency,
                    current: newAccount.currency
                });
            } else {
                setCurrencyChangeNotice(null);
            }
            setFormAccountId(newAccountId);
            if (isPersonallyPaidBusiness && newAccount) {
                setDraftPaymentAccountId(newAccountId);
                setDraftCurrency(newAccount.currency as CurrencyCode);
                setDraftPayerEntityId(newAccount.entity_id);
            }
        } else {
            setFormToAccountId(newAccountId);
        }
    };

    const handleCreateInlineAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isCreatingAccount) return;
        setError(null);
        setIsCreatingAccount(true);
        try {
            const concreteEntityId = selectedEntityId === 'all' ? inlineOwnerId : selectedEntityId;
            if (!concreteEntityId || concreteEntityId === 'all') {
                throw new Error('Please select who owns this account.');
            }

            const isLiability = inlineAccountType === 'credit_card' || inlineAccountType === 'loan';
            const payload = {
                entity_id: concreteEntityId,
                name: inlineAccountName.trim(),
                type: isLiability ? 'liability' : 'asset',
                sub_type: inlineAccountType,
                currency: inlineCurrency
            };
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create_account', account: payload })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create account');
            
            await fetchData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
            if (accountCreationTarget === 'formToAccountId') {
                setFormToAccountId(data.account.id);
            } else {
                setFormAccountId(data.account.id);
            }
            setModalView('transaction');
            setSuccessMessage(`Account "${data.account.name}" created and selected.`);
            setTimeout(() => {
                triggerElementRef.current?.focus();
            }, 50);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsCreatingAccount(false);
        }
    };

    const handleSaveDraft = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isSubmitting) return;
        setError(null);
        setIsSubmitting(true);
        try {
            if (!draftBusinessId) {
                throw new Error('Please select which business this expense was for.');
            }
            const activePaymentAccId = draftPaymentAccountId || formAccountId;
            if (!activePaymentAccId) {
                throw new Error('Please select the personal payment account used for this expense.');
            }
            const activePaymentAcc = accounts.find(a => a.id === activePaymentAccId);
            const finalCurrency = activePaymentAcc?.currency || draftCurrency || null;

            const amtCents = formAmount ? parseToCents(formAmount, finalCurrency || 'AUD') : null;
            const payload = {
                id: editingDraftId || crypto.randomUUID(),
                entity_id: draftBusinessId,
                payer_entity_id: draftPayerEntityId || activePaymentAcc?.entity_id || null,
                payment_account_id: activePaymentAccId,
                currency: finalCurrency,
                amount_cents: amtCents,
                date: formDate || null,
                merchant: formPayee.trim() || null,
                description: formDescription.trim() || 'Personally paid business expense',
                reimbursement_intent: draftExpectReimbursement,
                source_document_id: draftSourceDocumentId !== undefined ? draftSourceDocumentId : null,
                source_transaction_id: draftSourceTransactionId !== undefined ? draftSourceTransactionId : null,
                status: 'draft'
            };
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'save_draft', draft: payload })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save draft');

            setIsRecordModalOpen(false);
            setEditingDraftId(null);
            setIsPersonallyPaidBusiness(false);
            setDraftSourceDocumentId(null);
            setDraftSourceTransactionId(null);
            setSuccessMessage('This business expense is saved as a draft. It has not changed your balances.');
            await fetchDrafts();
        } catch (err: any) {
            setError(err.message || 'Failed to save draft.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmPersonallyPaidExpense = async () => {
        if (isSubmitting) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const activePaymentAccId = draftPaymentAccountId || formAccountId;
            const activePaymentAcc = accounts.find(a => a.id === activePaymentAccId);
            const finalCurrency = activePaymentAcc?.currency || draftCurrency || null;
            const amtCents = formAmount ? parseToCents(formAmount, finalCurrency || 'AUD') : null;

            if (!activePaymentAccId || !draftBusinessId || !amtCents || !formDate || !formCategory) {
                throw new Error("Missing required fields for personally paid expense.");
            }

            const businessAccs = accounts.filter(a => a.entity_id === draftBusinessId);
            let businessExpenseAcc = businessAccs.find(a => a.type === 'expense' && a.sub_type === formCategory && a.currency === finalCurrency);
            
            if (!businessExpenseAcc) {
                const newAccPayload = {
                    entity_id: draftBusinessId,
                    name: formCategory,
                    type: 'expense',
                    sub_type: formCategory,
                    currency: finalCurrency,
                };
                const createRes = await fetch('/api/accounting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'create_account', account: newAccPayload })
                });
                if (!createRes.ok) {
                    const createData = await createRes.json().catch(() => ({}));
                    throw new Error(createData.error || `Failed to create business expense account for ${formCategory}`);
                }
                const createData = await createRes.json();
                businessExpenseAcc = createData.account;
            }

            // Why draft source identity is retained:
            // When confirming an existing draft, the draft itself is the source of truth.
            // If the draft is linked to an imported transaction (draftSourceTransactionId),
            // the domain service resolves the source transaction, performs in-place reclassification
            // without a duplicate bank charge, marks the draft posted, and sets workflow.draft_id.
            // Actions genuinely lacking an originating draft use the direct posted_transaction path.
            // Tricky logic:
            // Saving the draft before posting synchronizes edited merchant, date, and descriptions
            // with draft facts checked strictly in processPersonallyPaidBusinessExpense.
            // TODO: In Milestone 2, bundle draft save + post in a single atomic RPC endpoint.
            const isExistingDraft = Boolean(editingDraftId);
            const sourceId = editingDraftId || draftSourceTransactionId || crypto.randomUUID();
            if (!editingDraftId && !draftSourceTransactionId) {
                setEditingDraftId(sourceId);
            }

            const sourceTx = draftSourceTransactionId ? transactions.find(t => t.id === draftSourceTransactionId) : null;
            const finalDate = sourceTx?.date || formDate;

            if (isExistingDraft || !draftSourceTransactionId) {
                const draftPayload = {
                    id: sourceId,
                    entity_id: draftBusinessId,
                    payer_entity_id: activePaymentAcc?.entity_id || null,
                    payment_account_id: activePaymentAccId,
                    currency: finalCurrency,
                    amount_cents: amtCents,
                    date: finalDate,
                    merchant: formPayee.trim() || null,
                    description: formDescription.trim() || 'Personally paid business expense',
                    reimbursement_intent: 'yes',
                    source_document_id: draftSourceDocumentId || null,
                    source_transaction_id: draftSourceTransactionId || null,
                    status: 'draft'
                };
                
                const draftRes = await fetch('/api/accounting', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'save_draft', draft: draftPayload })
                });
                
                if (!draftRes.ok) {
                    const draftData = await draftRes.json().catch(() => ({}));
                    throw new Error(draftData.error || 'Failed to save draft before processing');
                }
            }

            const payload = {
                personalEntityId: activePaymentAcc?.entity_id,
                businessEntityId: draftBusinessId,
                currency: finalCurrency,
                amountCents: amtCents,
                date: finalDate,
                merchant: formPayee.trim() || null,
                description: formDescription.trim() || 'Personally paid business expense',
                sourceType: isExistingDraft ? 'draft' : (draftSourceTransactionId ? 'posted_transaction' : 'draft'),
                sourceId: sourceId,
                paymentAccountId: activePaymentAccId,
                businessExpenseAccountId: businessExpenseAcc!.id,
                evidenceDocumentId: draftSourceDocumentId || null,
                expectedRevision: sourceTx ? sourceTx.revision : undefined,
                performedBy: 'User'
            };

            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'process_personally_paid_expense', payload })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to process personally paid expense');
            }

            setIsRecordModalOpen(false);
            setEditingDraftId(null);
            setIsPersonallyPaidBusiness(false);
            setDraftSourceDocumentId(null);
            setDraftSourceTransactionId(null);
            setModalView('transaction');
            setSuccessMessage('Personally paid expense recorded successfully. Workflow created.');
            await fetchDrafts();
            await fetchReimbursementWorkflows(selectedEntityId);
            await fetchData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to process personally paid expense.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteDraft = async (draftId: string) => {
        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_draft', id: draftId })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to discard draft');
            }
            await fetchDrafts();
            setSuccessMessage('Draft discarded.');
        } catch (err: any) {
            setError(err.message);
        }
    };

    /**
     * Executes the reimbursement matching workflow.
     * 
     * Why this exists:
     * Links business payment and personal receipt to settle an outstanding reimbursement workflow.
     * 
     * Tricky logic:
     * - When candidate transactions exist on both sides, their authoritative posting dates and IDs are passed.
     *   The backend updates the transactions without writing new journal lines, leaving bank balances unchanged.
     * - When a side is missing, the user's explicit account and date selections are passed, ensuring
     *   no silent default account or duplicate movement occurs.
     */
    const handleMatchReimbursement = async () => {
        if (!matchingReimbursementId || !selectedReimbPersonal || !selectedReimbBusiness || isSubmitting) return;
        setError(null);
        setIsSubmitting(true);
        try {
            const wf = reimbursementWorkflows.find(w => w.id === matchingReimbursementId);
            if (!wf) throw new Error("Missing workflow");

            let personalTx, businessTx;
            if (selectedReimbPersonal !== 'missing') {
                personalTx = reimbCandidatesPersonal.find(c => c.id === selectedReimbPersonal);
            }
            if (selectedReimbBusiness !== 'missing') {
                businessTx = reimbCandidatesBusiness.find(c => c.id === selectedReimbBusiness);
            }

            const personalAccId = selectedReimbPersonal !== 'missing'
                ? (personalTx?.leg_account_id || accounts.find(a => a.entity_id === wf.personal_entity_id && a.type === 'asset' && a.currency === wf.currency)?.id)
                : missingPersonalAccountId;

            const businessAccId = selectedReimbBusiness !== 'missing'
                ? (businessTx?.leg_account_id || accounts.find(a => a.entity_id === wf.business_entity_id && a.type === 'asset' && a.currency === wf.currency)?.id)
                : missingBusinessAccountId;

            if (!personalAccId) throw new Error("Please select an account for the personal receipt.");
            if (!businessAccId) throw new Error("Please select an account for the business payment.");

            const persDate = selectedReimbPersonal !== 'missing' ? personalTx?.date : missingPersonalDate;
            const busDate = selectedReimbBusiness !== 'missing' ? businessTx?.date : missingBusinessDate;

            if (selectedReimbPersonal === 'missing' && !persDate) throw new Error("Please specify a date for the personal receipt.");
            if (selectedReimbBusiness === 'missing' && !busDate) throw new Error("Please specify a date for the business payment.");

            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'match_reimbursement',
                    payload: {
                        workflowId: wf.id,
                        date: busDate || persDate,
                        personalDate: persDate,
                        businessDate: busDate,
                        description: personalTx?.description || businessTx?.description || 'Reimbursement match',
                        personalReceivingAccountId: personalAccId,
                        businessBankAccountId: businessAccId,
                        personalReceivingBankTxId: selectedReimbPersonal !== 'missing' ? selectedReimbPersonal : undefined,
                        businessBankTxId: selectedReimbBusiness !== 'missing' ? selectedReimbBusiness : undefined,
                        expectedPersonalRevision: personalTx?.revision,
                        expectedBusinessRevision: businessTx?.revision,
                        createMissingPersonalReceipt: selectedReimbPersonal === 'missing',
                        createMissingBusinessPayment: selectedReimbBusiness === 'missing',
                        performedBy: 'User'
                    }
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to match reimbursement');
            }

            setMatchingReimbursementId(null);
            setSuccessMessage('Reimbursement matched successfully.');
            await fetchReimbursementWorkflows(selectedEntityId);
            await fetchData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
        } catch (err: any) {
            setError(err.message || 'Failed to match reimbursement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUndoBusinessClassificationPreview = async (wf: any) => {
        setUndoViewActive(true);
        setUndoLoadingPreview(true);
        setError(null);
        try {
            const res = await fetch(`/api/accounting?view=reimbursement_undo_preview&workflow_id=${wf.id}`);
            if (!res.ok) throw new Error('Failed to load undo preview');
            const data = await res.json();
            setUndoOriginalCategory(data.original_category_account_id || null);
            if (data.original_category_account_id) {
                setUndoSelectedCategory(data.original_category_account_id);
            } else {
                setUndoSelectedCategory('');
            }
            setUndoPurchaseDate(data.purchase_date || '');
            setUndoPurchaseDesc(data.purchase_description || '');
            setUndoExpectedPersRevision(data.expected_personal_revision);
            setUndoExpectedBusRevision(data.expected_business_revision);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUndoLoadingPreview(false);
        }
    };

    const handleUndoBusinessClassificationSubmit = async () => {
        if (!matchingReimbursementId || !undoSelectedCategory || isSubmitting) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'undo_personally_paid_expense',
                    payload: {
                        workflowId: matchingReimbursementId,
                        personalExpenseAccountId: undoSelectedCategory,
                        expectedPersonalRevision: undoExpectedPersRevision,
                        expectedBusinessRevision: undoExpectedBusRevision,
                        performedBy: 'User'
                    }
                })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to undo business classification');
            }
            setUndoViewActive(false);
            setMatchingReimbursementId(null);
            setSuccessMessage('Business classification undone.');
            await fetchReimbursementWorkflows(selectedEntityId);
            await fetchData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUndoMatchPreviewStart = async (wf: any) => {
        setUndoMatchViewActive(true);
        setUndoMatchLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/accounting?view=reimbursement_undo_match_preview&workflow_id=${wf.id}`);
            if (!res.ok) throw new Error('Failed to load undo match preview');
            const data = await res.json();
            setUndoMatchPreview(data);
            setUndoMatchNewPersonalAccount('');
            setUndoMatchNewBusinessAccount('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUndoMatchLoading(false);
        }
    };

    const handleUndoMatchSubmit = async () => {
        if (!matchingReimbursementId || !undoMatchPreview || isSubmitting) return;
        
        if (undoMatchPreview.is_personal_manual && !undoMatchNewPersonalAccount) {
            setError('Please select an account for the personal transaction.');
            return;
        }
        if (undoMatchPreview.is_business_manual && !undoMatchNewBusinessAccount) {
            setError('Please select an account for the business transaction.');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'undo_reimbursement_match',
                    payload: {
                        workflowId: matchingReimbursementId,
                        expectedPersonalRevision: undoMatchPreview.expected_personal_revision,
                        expectedBusinessRevision: undoMatchPreview.expected_business_revision,
                        expectedPersonalTxId: undoMatchPreview.expected_personal_tx_id,
                        expectedBusinessTxId: undoMatchPreview.expected_business_tx_id,
                        newPersonalAccountId: undoMatchNewPersonalAccount || undefined,
                        newBusinessAccountId: undoMatchNewBusinessAccount || undefined,
                        performedBy: 'User'
                    }
                })
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to undo reimbursement match');
            }
            setUndoMatchViewActive(false);
            setMatchingReimbursementId(null);
            setSuccessMessage('Reimbursement match undone.');
            await fetchReimbursementWorkflows(selectedEntityId);
            await fetchData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditDraft = (draft: DraftItem) => {
        setEditingDraftId(draft.id);
        setDraftBusinessId(draft.entity_id || '');
        setDraftPayerEntityId(draft.payer_entity_id || '');
        setDraftPaymentAccountId(draft.payment_account_id || '');
        setFormAccountId(draft.payment_account_id || '');
        setDraftCurrency((draft.currency as CurrencyCode) || null);
        setDraftSourceDocumentId(draft.source_document_id || null);
        setDraftSourceTransactionId(draft.source_transaction_id || null);
        setFormAmount(draft.amount_cents != null ? centsToInputString(draft.amount_cents, draft.currency) : '');
        setFormDate(draft.date || getLocalIsoDate());
        setFormPayee(draft.merchant || '');
        setFormDescription(draft.description || '');
        setDraftExpectReimbursement(draft.reimbursement_intent || 'not_sure');
        setIsPersonallyPaidBusiness(true);
        setActiveTab('expense');
        setModalView('transaction');
        setCurrencyChangeNotice(null);
        setIsRecordModalOpen(true);
    };

    const fetchData = async () => {
        if (!selectedEntityId) return;
        setIsLoading(true);
        setError(null);
        try {
            const localDate = getLocalIsoDate();
            const query = new URLSearchParams({
                include_transactions: 'true',
                as_of_date: localDate,
                start_date: startDate,
                end_date: endDate,
                limit: String(PAGE_SIZE),
                offset: '0'
            });
            if (selectedEntityId !== 'all') {
                query.set('entity_id', selectedEntityId);
            }
            if (initialIntent) {
                query.set('intent', initialIntent);
            }
            if (accountId) {
                query.set('account_id', accountId);
            }

            const res = await fetch(`/api/accounting?${query.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to load transaction data');
            }
            const data = await res.json();
            
            if (data.accounts) setAccounts(data.accounts);
            if (selectedEntityId === 'all' || !data.period_income_expenses) {
                setCashFlow(null);
            } else {
                setCashFlow(data.period_income_expenses);
            }
            setTransactions(data.transactions || []);
            setTotalCount(data.total_count ?? (data.transactions?.length || 0));
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message || 'Failed to fetch accounting records');
            setCashFlow(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (isLoadingMore || transactions.length >= totalCount) return;
        setIsLoadingMore(true);
        try {
            const localDate = getLocalIsoDate();
            const query = new URLSearchParams({
                include_transactions: 'true',
                as_of_date: localDate,
                start_date: startDate,
                end_date: endDate,
                limit: String(PAGE_SIZE),
                offset: String(transactions.length)
            });
            if (selectedEntityId !== 'all') {
                query.set('entity_id', selectedEntityId);
            }
            if (initialIntent) {
                query.set('intent', initialIntent);
            }
            if (accountId) {
                query.set('account_id', accountId);
            }
            const res = await fetch(`/api/accounting?${query.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to load more transactions');
            }
            const data = await res.json();
            if (data.transactions && data.transactions.length > 0) {
                setTransactions(prev => {
                    const existingIds = new Set(prev.map(t => t.id));
                    const newItems = data.transactions.filter((t: TransactionItem) => !existingIds.has(t.id));
                    return [...prev, ...newItems];
                });
            }
            if (data.total_count !== undefined) {
                setTotalCount(data.total_count);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load more transactions');
        } finally {
            setIsLoadingMore(false);
        }
    };

    useEffect(() => {
        // Prevent fetching with impossible dates
        if (startDate && endDate && startDate > endDate) {
            setError("Start date cannot be after end date.");
            return;
        }
        fetchData();
    }, [selectedEntityId, startDate, endDate, initialIntent, accountId]);

    const handleClearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('intent');
        params.delete('start_date');
        params.delete('end_date');
        params.delete('account_id');
        
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        const defaultStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const defaultEnd = getLocalIsoDate();
        
        setStartDate(defaultStart);
        setEndDate(defaultEnd);
        setError(null);
        
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    // Handle Transaction Submission
    const handleRecordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (isPersonallyPaidBusiness) {
            if (draftExpectReimbursement === 'yes') {
                setModalView('reimbursement_preview');
                return;
            } else {
                handleSaveDraft(e);
                return;
            }
        }

        setError(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        try {
            const selectedAccount = accounts.find(a => a.id === formAccountId);
            const selectedCurrency = (selectedAccount?.currency || 'USD') as CurrencyCode;
            const targetEntityId = selectedAccount?.entity_id || selectedEntityId;

            let action = '';
            let payload: any = {};

            if (activeTab === 'income') {
                action = 'record_income';
                payload = {
                    entity_id: targetEntityId,
                    bank_account_id: formAccountId,
                    category: formCategory,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    payer: formPayee,
                    description: formDescription.trim() || `Income - ${formPayee || formCategory}`,
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'expense') {
                action = 'record_expense';
                payload = {
                    entity_id: targetEntityId,
                    payment_account_id: formAccountId,
                    category: formCategory,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    payee: formPayee,
                    description: formDescription.trim() || `Expense - ${formPayee || formCategory}`,
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'transfer') {
                action = 'record_transfer';
                payload = {
                    from_account_id: formAccountId,
                    to_account_id: formToAccountId,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    description: formDescription.trim() || 'Internal Account Transfer',
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'card_repayment') {
                action = 'record_card_repayment';
                payload = {
                    bank_account_id: formAccountId,
                    card_account_id: formToAccountId,
                    amount_cents: parseToCents(formAmount, selectedCurrency),
                    date: formDate,
                    description: formDescription.trim() || 'Credit Card Bill Repayment',
                    idempotency_key: submissionIdempotencyKey
                };
            } else if (activeTab === 'loan_repayment') {
                action = 'record_loan_repayment';
                const principal = parseToCents(formLoanPrincipal || '0', selectedCurrency);
                const interest = parseToCents(formLoanInterest || '0', selectedCurrency);
                const fee = parseToCents(formLoanFee || '0', selectedCurrency);

                payload = {
                    bank_account_id: formAccountId,
                    loan_account_id: formToAccountId,
                    principal_cents: principal,
                    interest_cents: interest,
                    fee_cents: fee,
                    date: formDate,
                    payee: formPayee,
                    description: formDescription.trim() || 'Loan Instalment Payment',
                    idempotency_key: submissionIdempotencyKey
                };
            }

            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, payload })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to record transaction');
            }

            // Success - generate fresh idempotency key for next submission
            setSubmissionIdempotencyKey(crypto.randomUUID());
            setIsRecordModalOpen(false);
            // Reset form fields
            setFormAmount('');
            setFormLoanPrincipal('');
            setFormLoanInterest('');
            setFormLoanFee('');
            setFormPayee('');
            setFormDescription('');
            setSuccessMessage('Transaction recorded successfully and double-entry postings committed.');
            await fetchData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
        } catch (err: any) {
            console.error('Submit error:', err);
            // M1-SAFE-04: Modal remains open, inputs preserved, error displayed
            setError(err.message || 'Transaction could not be recorded.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Auditable Void
    const handleVoidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!voidTargetTx || isSubmitting) return;

        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/accounting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'correct_transaction',
                    correction: {
                        transaction_id: voidTargetTx.id,
                        expected_revision: voidTargetTx.revision,
                        operation: 'void',
                        reason: voidReason.trim(),
                        performed_by: voidActor.trim() || 'User'
                    }
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to void transaction');
            }

            setVoidTargetTx(null);
            setVoidReason('');
            setSuccessMessage(`Transaction ${voidTargetTx.description} successfully voided. Correction audit trail recorded.`);
            await fetchData();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('opennetworth_balances_updated'));
            }
        } catch (err: any) {
            console.error('Void error:', err);
            setError(err.message || 'Failed to void transaction.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const personalPaymentAccounts = accounts.filter(a => {
        const ent = entities.find(e => e.id === a.entity_id);
        const isPersonalOwner = ent?.type === 'person' || ent?.type === 'household';
        const isPaymentAccount = (a.type === 'asset' && ['checking', 'savings', 'cash'].includes(a.sub_type)) ||
                                 (a.type === 'liability' && a.sub_type === 'credit_card');
        return isPersonalOwner && isPaymentAccount;
    });

    const expensePaymentAccounts = isPersonallyPaidBusiness 
        ? personalPaymentAccounts
        : accounts.filter(a => 
            (a.type === 'asset' && ['checking', 'savings', 'cash'].includes(a.sub_type)) ||
            (a.type === 'liability' && a.sub_type === 'credit_card')
        );

    const bankAccounts = expensePaymentAccounts.filter(a => a.type === 'asset' && ['checking', 'savings', 'cash'].includes(a.sub_type));
    const liabilityAccounts = accounts.filter(a => a.type === 'liability');
    const creditCardAccounts = expensePaymentAccounts.filter(a => a.type === 'liability' && a.sub_type === 'credit_card');
    const loanAccounts = accounts.filter(a => a.type === 'liability' && a.sub_type !== 'credit_card');
    const transferDestinationAccounts = accounts.filter(a => a.type === 'asset' || a.type === 'liability');
    const hasBusiness = entities.some(e => e.type === 'business');
    const activePaymentAccountId = isPersonallyPaidBusiness ? (draftPaymentAccountId || formAccountId) : formAccountId;
    const currentPaymentAccount = accounts.find(a => a.id === activePaymentAccountId);
    const selectedEntity = entities.find(e => e.id === selectedEntityId);
    const currentCurrency = isPersonallyPaidBusiness
        ? (draftCurrency || currentPaymentAccount?.currency || null)
        : (currentPaymentAccount?.currency || selectedEntity?.currency || 'AUD');

    // D2: Start reimbursement from posted personal transaction
    const handleStartD2Flow = (tx: TransactionItem) => {
        const paymentPosting = tx.postings.find(p => {
            const a = accounts.find(acc => acc.id === p.account_id);
            return a && ((a.type === 'asset' && ['checking', 'savings', 'cash'].includes(a.sub_type)) || (a.type === 'liability' && a.sub_type === 'credit_card'));
        }) || tx.postings[0];
        
        const primaryAccount = paymentPosting ? accounts.find(a => a.id === paymentPosting.account_id) : null;
        
        setEditingDraftId(null);
        setDraftBusinessId(''); 
        setDraftPayerEntityId(primaryAccount?.entity_id || '');
        setDraftPaymentAccountId(primaryAccount?.id || '');
        setFormAccountId(primaryAccount?.id || '');
        setDraftCurrency((paymentPosting?.currency as CurrencyCode) || 'USD');
        
        let docId = null;
        if (tx.evidence_refs && Array.isArray(tx.evidence_refs) && tx.evidence_refs.length > 0) {
            for (let i = tx.evidence_refs.length - 1; i >= 0; i--) {
                const ref = tx.evidence_refs[i];
                if (typeof ref === 'string') {
                    if (ref.trim().startsWith('{')) {
                        try {
                            const parsed = JSON.parse(ref);
                            if (parsed && typeof parsed === 'object' && typeof parsed.document_id === 'string') {
                                docId = parsed.document_id;
                                break;
                            }
                        } catch (e) {}
                    }
                    if (!docId) docId = ref;
                } else if (ref && typeof ref === 'object' && typeof ref.document_id === 'string') {
                    docId = ref.document_id;
                    break;
                }
            }
        }
        setDraftSourceDocumentId(docId);
        setDraftSourceTransactionId(tx.id);
        
        setFormAmount(centsToInputString(Math.abs(paymentPosting?.amount_cents || 0), paymentPosting?.currency));
        setFormDate(tx.date);
        setFormPayee(tx.payee_or_payer || '');
        setFormDescription(tx.description || '');
        setDraftExpectReimbursement('not_sure'); 
        
        setIsPersonallyPaidBusiness(true);
        setActiveTab('expense');
        setFormCategory('other'); 
        setModalView('transaction');
        setIsRecordModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Controls Bar (Uncluttered, focused on date filtering and action) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date range:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-slate-400 text-xs">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    {(initialIntent || accountId) && (
                        <div className="flex flex-wrap items-center gap-2">
                            {initialIntent && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800/50">
                                    Filtered by Assistant Intent: {initialIntent}
                                </span>
                            )}
                            {accountId && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800/50">
                                    Filtered by Account
                                </span>
                            )}
                            <button
                                onClick={handleClearFilters}
                                className="text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                    {(!initialIntent && !accountId) && (startDate !== `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01` || endDate !== getLocalIsoDate()) && (
                        <button
                            onClick={handleClearFilters}
                            className="text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline text-left"
                        >
                            Reset dates
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Refresh transactions"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={() => {
                            setError(null);
                            setModalView('transaction');
                            setCurrencyChangeNotice(null);
                            setIsPersonallyPaidBusiness(false);
                            setDraftSourceTransactionId(null);
                            setDraftSourceDocumentId(null);
                            setFormAmount('');
                            setFormDate(getLocalIsoDate());
                            setFormPayee('');
                            setFormDescription('');
                            setFormCategory('other');
                            if (expensePaymentAccounts.length > 0 && !formAccountId) {
                                setFormAccountId(expensePaymentAccounts[0].id);
                            }
                            setIsRecordModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add transaction</span>
                    </button>
                </div>
            </div>

            {/* Banners */}
            {successMessage && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {error && !isRecordModalOpen && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Accrual Income & Expense Summary Cards */}
            {cashFlow && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Period Income</span>
                            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {Object.entries(cashFlow.formatted_income_by_currency).map(([curr, val]) => (
                                <div key={curr}>{val} <span className="text-xs font-normal text-slate-400">{curr}</span></div>
                            ))}
                            {Object.keys(cashFlow.formatted_income_by_currency).length === 0 && '$0.00'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Accrual income recognized in period</div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Period Expenses</span>
                            <ArrowUpRight className="w-4 h-4 text-rose-500" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {Object.entries(cashFlow.formatted_expenses_by_currency).map(([curr, val]) => (
                                <div key={curr}>{val} <span className="text-xs font-normal text-slate-400">{curr}</span></div>
                            ))}
                            {Object.keys(cashFlow.formatted_expenses_by_currency).length === 0 && '$0.00'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Accrual expenses recognized in period</div>
                    </div>

                    <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Income Minus Expenses</span>
                            <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {Object.entries(cashFlow.formatted_net_savings_by_currency).map(([curr, val]) => (
                                <div key={curr}>{val} <span className="text-xs font-normal text-slate-400">{curr}</span></div>
                            ))}
                            {Object.keys(cashFlow.formatted_net_savings_by_currency).length === 0 && '$0.00'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Net period earnings / retained savings</div>
                    </div>
                </div>
            )}

            {/* Transaction Ledger Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Transactions</h3>
                    </div>
                    {totalCount > 0 && (
                        <span className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-medium">
                            Showing {transactions.length} of {totalCount} transactions
                        </span>
                    )}
                </div>

                <div className="p-4">
                    <div className="flex flex-col gap-4">
                        {transactions.length === 0 ? (
                            totalCount === 0 ? (
                                <div className="text-center py-14 px-4 space-y-3 max-w-md mx-auto">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 border border-indigo-100 dark:border-indigo-900">
                                        <Inbox className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        Start with a bank statement
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Import your transactions, then review them before saving.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                        {onNavigateToDocuments && (
                                            <button
                                                type="button"
                                                onClick={onNavigateToDocuments}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                                            >
                                                Import a statement
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setError(null);
                                                setModalView('transaction');
                                                setCurrencyChangeNotice(null);
                                                setIsPersonallyPaidBusiness(false);
                                                if (expensePaymentAccounts.length > 0 && !formAccountId) {
                                                    setFormAccountId(expensePaymentAccounts[0].id);
                                                }
                                                setIsRecordModalOpen(true);
                                            }}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
                                        >
                                            Add transaction
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-14 px-4 space-y-3 max-w-md mx-auto">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                        No transactions in this date range
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Choose another date range, import a statement, or add a transaction.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                        {onNavigateToDocuments && (
                                            <button
                                                type="button"
                                                onClick={onNavigateToDocuments}
                                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg transition border border-indigo-200 dark:border-indigo-800"
                                            >
                                                Import a statement
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setError(null);
                                                setModalView('transaction');
                                                setCurrencyChangeNotice(null);
                                                setIsPersonallyPaidBusiness(false);
                                                if (expensePaymentAccounts.length > 0 && !formAccountId) {
                                                    setFormAccountId(expensePaymentAccounts[0].id);
                                                }
                                                setIsRecordModalOpen(true);
                                            }}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition"
                                        >
                                            Add transaction
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col gap-4">
                                {transactions.map(tx => {
                                    const isVoided = ['void', 'voided'].includes(tx.status);
                                    const isExpanded = expandedTxId === tx.id;
                                    
                                    // Identify payment account and primary posting
                                    const paymentPosting = tx.postings.find(p => {
                                        const a = accounts.find(acc => acc.id === p.account_id);
                                        return a && ((a.type === 'asset' && ['checking', 'savings', 'cash'].includes(a.sub_type)) || (a.type === 'liability' && a.sub_type === 'credit_card'));
                                    }) || tx.postings[0];
                                    
                                    const primaryAccount = paymentPosting ? accounts.find(a => a.id === paymentPosting.account_id) : null;
                                    const ownerEntity = entities.find(e => e.id === primaryAccount?.entity_id);
                                    
                                    // Direction relative to account balance:
                                    const isOutflow = paymentPosting ? paymentPosting.amount_cents < 0 : false;
                                    const directionSign = isOutflow ? '-' : '+';
                                    const directionColor = isOutflow ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
                                    const displayAmount = paymentPosting 
                                        ? formatMoney({ amount_cents: Math.abs(paymentPosting.amount_cents), currency: paymentPosting.currency as CurrencyCode })
                                        : (tx.postings.length > 0 ? formatMoney({ amount_cents: Math.abs(tx.postings[0].amount_cents), currency: tx.postings[0].currency as CurrencyCode }) : '-');

                                    const isTransfer = tx.postings.every(p => {
                                        const a = accounts.find(acc => acc.id === p.account_id);
                                        return a && (a.type === 'asset' || a.type === 'liability');
                                    });
                                    const isOpeningBalance = tx.postings.some(p => {
                                        const a = accounts.find(acc => acc.id === p.account_id);
                                        return a && a.type === 'equity';
                                    });
                                    const isSupportedExpense = !isTransfer && !isOpeningBalance;

                                    return (
                                    <div key={tx.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition hover:border-slate-300 dark:hover:border-slate-700">
                                        {/* Transaction Summary Row */}
                                        <div
                                            onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                                            className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 cursor-pointer bg-white dark:bg-slate-900 ${isVoided ? 'opacity-60' : ''}`}
                                        >
                                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                                                    {tx.origin === 'manual_entry' ? <Calendar className="w-4 h-4 text-slate-500" /> : <RefreshCw className="w-4 h-4 text-slate-500" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                            {tx.date}
                                                        </span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isVoided ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 line-through' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                            {isVoided ? 'void' : tx.status}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400 capitalize">({tx.origin})</span>
                                                        {ownerEntity && (
                                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 rounded">
                                                                {ownerEntity.name}
                                                            </span>
                                                        )}
                                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800/80 rounded border border-slate-200/60 dark:border-slate-700/60">
                                                            {primaryAccount?.name || 'Ledger'}
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 truncate">
                                                        {tx.description}
                                                        {tx.payee_or_payer && (
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-normal">
                                                                — {tx.payee_or_payer}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                                <div className="text-right mr-2">
                                                    <div className={`font-bold text-sm ${isVoided ? 'text-slate-400 line-through' : directionColor}`}>
                                                        {directionSign}{displayAmount}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedTxId(isExpanded ? null : tx.id);
                                                    }}
                                                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline hidden sm:inline-block"
                                                >
                                                    {isExpanded ? 'Hide details' : 'Accounting details'}
                                                </button>

                                                {!isVoided && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setVoidTargetTx(tx);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                                                        title="Void transaction"
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions for eligible personal expenses or existing workflows */}
                                        {(() => {
                                            if (isVoided) return null;
                                            const activeLinkedWf = reimbursementWorkflows.find(w => w.status !== 'cancelled' && (w.personal_transaction_id === tx.id || w.business_transaction_id === tx.id || w.personal_reimbursement_tx_id === tx.id || w.business_reimbursement_tx_id === tx.id));
                                            const cancelledLinkedWf = reimbursementWorkflows.find(w => w.status === 'cancelled' && (w.personal_transaction_id === tx.id || w.business_transaction_id === tx.id || w.personal_reimbursement_tx_id === tx.id || w.business_reimbursement_tx_id === tx.id));
                                            
                                            if (activeLinkedWf) {
                                                return (
                                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMatchingReimbursementId(activeLinkedWf.id);
                                                            }}
                                                            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                                        >
                                                            View reimbursement
                                                        </button>
                                                    </div>
                                                );
                                            } else if (isOutflow && isSupportedExpense && ownerEntity?.type !== 'business' && (primaryAccount?.type === 'asset' || primaryAccount?.type === 'liability')) {
                                                return (
                                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                                        {cancelledLinkedWf && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setMatchingReimbursementId(cancelledLinkedWf.id);
                                                                }}
                                                                className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                            >
                                                                View cancelled workflow
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartD2Flow(tx);
                                                            }}
                                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        >
                                                            This was a business expense
                                                        </button>
                                                    </div>
                                                );
                                            } else if (cancelledLinkedWf) {
                                                return (
                                                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMatchingReimbursementId(cancelledLinkedWf.id);
                                                            }}
                                                            className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                        >
                                                            View cancelled workflow
                                                        </button>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {/* Expanded Accounting Details */}
                                        {isExpanded && (
                                            <div className="px-10 pb-4 pt-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/80">
                                                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Accounting details</div>
                                                <div className="space-y-1 font-mono text-xs">
                                                    {tx.postings.map(p => {
                                                        const isDebit = p.amount_cents > 0;
                                                        const acc = accounts.find(a => a.id === p.account_id);
                                                        const accName = acc ? acc.name : p.account_id;

                                                        return (
                                                            <div key={p.id} className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50">
                                                                <span className="text-slate-700 dark:text-slate-300">
                                                                    {accName} {p.memo && <span className="text-slate-400 font-sans">({p.memo})</span>}
                                                                </span>
                                                                <span className={`font-medium ${isDebit ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                                    {isDebit ? `Debit +${formatMoney({ amount_cents: p.amount_cents, currency: p.currency as CurrencyCode })}` : `Credit -${formatMoney({ amount_cents: Math.abs(p.amount_cents), currency: p.currency as CurrencyCode })}`}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}

                                {/* Load More Pagination (Reaches all 1,003 records without gaps or duplicates) */}
                                {transactions.length < totalCount && (
                                    <div className="pt-2 flex justify-center">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={isLoadingMore}
                                            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-sm"
                                        >
                                            {isLoadingMore ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Loading more entries...</span>
                                                </>
                                            ) : (
                                                <span>Load More Transactions ({transactions.length} of {totalCount})</span>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="border-t border-slate-200 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                        {(() => {
                            const outstandingCount = reimbursementWorkflows.filter(wf => wf.status === 'awaiting_reimbursement').length;
                            return (
                                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-400">
                                    Outstanding Reimbursements {outstandingCount > 0 ? `(${outstandingCount})` : ''}
                                </h4>
                            );
                        })()}
                    </div>
                    {reimbursementsLoading ? (
                        <div className="text-sm text-indigo-600 dark:text-indigo-400 py-2">Loading outstanding reimbursements...</div>
                    ) : reimbursementsError ? (
                        <div className="text-sm text-rose-600 dark:text-rose-400 py-2">{reimbursementsError}</div>
                    ) : reimbursementWorkflows.filter(wf => wf.status === 'awaiting_reimbursement').length === 0 ? (
                        <div className="text-sm text-slate-500 dark:text-slate-400 py-2">No outstanding reimbursements at this time.</div>
                    ) : (
                        <div className="space-y-2">
                            {reimbursementWorkflows.filter(wf => wf.status === 'awaiting_reimbursement').map(wf => {
                                const bEnt = entities.find(e => e.id === wf.business_entity_id);
                                const pEnt = entities.find(e => e.id === wf.personal_entity_id);
                                const displayAmt = formatMoney({ amount_cents: wf.amount_cents, currency: (wf.currency || 'USD') as CurrencyCode });
                                return (
                                    <div key={wf.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <RefreshCw className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    Due from {bEnt?.name || 'Business'}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Personal Payer: {pEnt?.name || 'Unknown'} • Initiated on {wf.created_at.split('T')[0]}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{displayAmt}</div>
                                            <button
                                                onClick={() => setMatchingReimbursementId(wf.id)}
                                                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 bg-indigo-50 dark:bg-indigo-900/50 rounded"
                                            >
                                                Match Payment
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {drafts.length > 0 && (
                    <div className="border-t border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-500">Unresolved Drafts ({drafts.length})</h4>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-400 rounded-full">Action Required</span>
                        </div>
                        <div className="space-y-2">
                            {drafts.map(draft => {
                                const bEnt = entities.find(e => e.id === draft.entity_id);
                                const pEnt = entities.find(e => e.id === draft.payer_entity_id);
                                const pAcc = accounts.find(a => a.id === draft.payment_account_id);
                                const displayAmt = draft.amount_cents != null 
                                    ? formatMoney({ amount_cents: draft.amount_cents, currency: (draft.currency || 'USD') as CurrencyCode })
                                    : 'Amount Unspecified';

                                return (
                                    <div key={draft.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            <div>
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {draft.description || 'Personally paid business expense'}
                                                    {draft.merchant && <span className="text-xs text-slate-500 font-normal"> — {draft.merchant}</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                                                    <span>{draft.date || 'No date'}</span>
                                                    <span>•</span>
                                                    <span>Business: <strong className="text-slate-700 dark:text-slate-300">{bEnt?.name || 'Unassigned'}</strong></span>
                                                    {pEnt && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Payer: <strong className="text-slate-700 dark:text-slate-300">{pEnt.name}</strong></span>
                                                        </>
                                                    )}
                                                    {pAcc && (
                                                        <>
                                                            <span>•</span>
                                                            <span>Account: <strong className="text-slate-700 dark:text-slate-300">{pAcc.name}</strong></span>
                                                        </>
                                                    )}
                                                    <span>•</span>
                                                    <span>Reimbursement: <span className="capitalize">{draft.reimbursement_intent || 'not_sure'}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                                            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{displayAmt}</div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditDraft(draft)}
                                                    className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                                                >
                                                    Edit
                                                </button>
                                                <span className="text-slate-300 dark:text-slate-700">•</span>
                                                <button
                                                    onClick={() => handleDeleteDraft(draft.id)}
                                                    className="text-[11px] font-medium text-slate-400 hover:text-rose-500 transition uppercase tracking-wide"
                                                >
                                                    Discard
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-600 mt-3 max-w-2xl">
                            These drafts do not affect your posted balances. Cross-entity automation (Owner's Draw / Due To) will be available in a future update to resolve these correctly.
                        </p>
                    </div>
                )}
            </div>

                  {/* Record Event & Account Creation Modal */}
            {isRecordModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div
                        ref={recordModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="record-modal-title"
                        tabIndex={-1}
                        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col max-h-[90vh] focus:outline-none"
                    >
                        {modalView === 'reimbursement_preview' ? (
                            <div className="flex flex-col h-full">
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Review Personally Paid Expense</h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModalView('transaction');
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4 overflow-y-auto">
                                    {error && (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        {draftSourceTransactionId ? 
                                            "Your bank balance will not change. This purchase will be recorded as a business expense owed back to you." :
                                            "This expense will be posted directly to your personal ledger. It will immediately change your payment-account balance and create an outstanding reimbursement workflow from the business."}
                                    </p>
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm border border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Payer (Personal):</span>
                                            <span className="font-medium text-slate-900 dark:text-slate-100">{draftPayerEntityId ? entities.find(e => e.id === draftPayerEntityId)?.name : 'Personal Entity'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Business:</span>
                                            <span className="font-medium text-slate-900 dark:text-slate-100">{draftBusinessId ? entities.find(e => e.id === draftBusinessId)?.name : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Account:</span>
                                            <span className="font-medium text-slate-900 dark:text-slate-100">{formAccountId ? accounts.find(a => a.id === formAccountId)?.name : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Date:</span>
                                            <span className="font-medium text-slate-900 dark:text-slate-100">{formDate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Category:</span>
                                            <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">{formCategory?.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
                                            <span className="text-slate-500">Amount:</span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100">
                                                {formAmount} {accounts.find(a => a.id === formAccountId)?.currency || draftCurrency || 'USD'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end items-center gap-3 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setModalView('transaction')}
                                        className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                                    >
                                        Cancel & Edit
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleConfirmPersonallyPaidExpense}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                        <span>Confirm and Record</span>
                                    </button>
                                </div>
                            </div>
                        ) : modalView === 'create_account' ? (
                            /* Sub-task 1: Account Creation View (Replaces transaction form temporarily) */
                            <>
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleBackFromAccountCreation}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        <span>{activeTab === 'expense' ? 'Back to expense' : 'Back to transaction'}</span>
                                    </button>
                                    <h3 id="record-modal-title" className="font-bold text-slate-900 dark:text-slate-100 text-sm">Add an account</h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRecordModalOpen(false);
                                            setModalView('transaction');
                                        }}
                                        aria-label="Close dialog"
                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateInlineAccount} className="p-6 space-y-4 overflow-y-auto">
                                    {error && (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {/* Who owns this account? */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Who owns this account? *
                                        </label>
                                        {selectedEntityId !== 'all' ? (
                                            <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs flex items-center justify-between">
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {entities.find(e => e.id === selectedEntityId)?.name || 'Selected Owner'}
                                                </span>
                                                <span className="text-[10px] text-slate-500 uppercase font-semibold">
                                                    {getOwnerTypeLabel(entities.find(e => e.id === selectedEntityId)?.type || 'person')}
                                                </span>
                                            </div>
                                        ) : (
                                            <select
                                                required
                                                value={inlineOwnerId}
                                                onChange={e => {
                                                    setInlineOwnerId(e.target.value);
                                                    const ent = entities.find(item => item.id === e.target.value);
                                                    if (ent?.currency) setInlineCurrency(ent.currency as CurrencyCode);
                                                }}
                                                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="">-- Select Owner --</option>
                                                {entities.map(ent => (
                                                    <option key={ent.id} value={ent.id}>
                                                        {ent.name} ({getOwnerTypeLabel(ent.type)})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* Account Type (only eligible types for this context) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Account Type *
                                        </label>
                                        <div className="flex gap-2">
                                            {accountCreationEligibleTypes.map(t => (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setInlineAccountType(t)}
                                                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition ${
                                                        inlineAccountType === t
                                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400 font-semibold'
                                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {t === 'checking' ? 'Bank Checking' : t === 'savings' ? 'Savings' : t === 'credit_card' ? 'Credit Card' : 'Loan'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Account Name */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Account Name *
                                        </label>
                                        <input
                                            ref={accountNameInputRef}
                                            type="text"
                                            required
                                            value={inlineAccountName}
                                            onChange={e => setInlineAccountName(e.target.value)}
                                            placeholder="e.g. Everyday Checking"
                                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>

                                    {/* Account Currency */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Account Currency *
                                        </label>
                                        <select
                                            value={inlineCurrency}
                                            onChange={e => setInlineCurrency(e.target.value as CurrencyCode)}
                                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="USD">USD ($)</option>
                                            <option value="AUD">AUD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                            <option value="CAD">CAD ($)</option>
                                            <option value="NZD">NZD ($)</option>
                                            <option value="SGD">SGD ($)</option>
                                            <option value="JPY">JPY (¥)</option>
                                        </select>
                                        {(() => {
                                            const ownerEnt = entities.find(e => e.id === (selectedEntityId === 'all' ? inlineOwnerId : selectedEntityId));
                                            if (ownerEnt && ownerEnt.currency !== inlineCurrency) {
                                                return (
                                                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                        Account currency is {inlineCurrency}. Owner reporting currency is {ownerEnt.currency}.
                                                    </p>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>

                                    {/* Single primary action in footer, no duplicate back/cancel */}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isCreatingAccount || !inlineAccountName.trim() || (selectedEntityId === 'all' && !inlineOwnerId)}
                                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                                        >
                                            {isCreatingAccount ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                                            <span>{isCreatingAccount ? 'Saving...' : 'Add account & return'}</span>
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            /* Sub-task 2: Transaction Entry View */
                            <>
                                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50 shrink-0">
                                    <div>
                                        <h3 id="record-modal-title" className="font-bold text-slate-900 dark:text-slate-100 text-base">
                                            {activeTab === 'expense' ? 'Add expense' :
                                             activeTab === 'income' ? 'Add income' :
                                             activeTab === 'transfer' ? 'Transfer' :
                                             activeTab === 'card_repayment' ? 'Credit card payment' :
                                             'Loan payment'}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {selectedEntity ? `${selectedEntity.name} (${getOwnerTypeLabel(selectedEntity.type)})` : 'All finances'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsRecordModalOpen(false);
                                            setEditingDraftId(null);
                                            setIsPersonallyPaidBusiness(false);
                                        }}
                                        aria-label="Close dialog"
                                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Compact Transaction-Type Selector */}
                                <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30 p-1.5 text-xs font-medium gap-1 overflow-x-auto">
                                    {[
                                        { id: 'expense', label: 'Expense' },
                                        { id: 'income', label: 'Income' },
                                        { id: 'transfer', label: 'Transfer' },
                                        { id: 'card_repayment', label: 'Credit card payment' },
                                        { id: 'loan_repayment', label: 'Loan payment' }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => handleTabChange(item.id as TransactionType)}
                                            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                                                activeTab === item.id
                                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>

                                <form onSubmit={handleRecordSubmit} className="p-6 space-y-4 overflow-y-auto">
                                    {error && (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg text-xs flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    {/* Currency change notice if user switched accounts with entered amount */}
                                    {currencyChangeNotice && (
                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-lg text-xs flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                                <span>
                                                    Account currency changed from <strong>{currencyChangeNotice.prev}</strong> to <strong>{currencyChangeNotice.current}</strong>.
                                                    Please review your amount ({formAmount}) to ensure it reflects {currencyChangeNotice.current}.
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCurrencyChangeNotice(null)}
                                                className="text-amber-700 hover:text-amber-900 text-[11px] font-semibold"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    )}

                                    {/* TAB 1: EXPENSE */}
                                    {activeTab === 'expense' && (
                                        <>
                                            {/* Amount with explicit currency & Date */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Amount ({currentCurrency || 'Select account'}) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step={currentCurrency && (CURRENCY_DECIMALS as any)[currentCurrency] === 0 ? "1" : "0.01"}
                                                        required
                                                        placeholder={currentCurrency && (CURRENCY_DECIMALS as any)[currentCurrency] === 0 ? "0" : "0.00"}
                                                        value={formAmount}
                                                        onChange={(e) => setFormAmount(e.target.value)}
                                                        disabled={!!draftSourceTransactionId}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/50"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formDate}
                                                        onChange={(e) => setFormDate(e.target.value)}
                                                        disabled={!!draftSourceTransactionId}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/50"
                                                    />
                                                </div>
                                            </div>

                                            {/* Where did you spend it? */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Where did you spend it?
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Officeworks"
                                                    value={formPayee}
                                                    onChange={(e) => setFormPayee(e.target.value)}
                                                    disabled={!!draftSourceTransactionId}
                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/50"
                                                />
                                            </div>

                                            {/* Paid from */}
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                        {isPersonallyPaidBusiness ? 'Personal payment account used *' : 'Paid from *'}
                                                    </label>
                                                </div>
                                                {expensePaymentAccounts.length === 0 ? (
                                                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex items-center justify-between">
                                                        <span className="text-xs text-indigo-900 dark:text-indigo-300">No payment accounts found</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => openAccountCreation('formAccountId', ['checking', 'savings', 'credit_card'], e.currentTarget)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            <span>Add account</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={formAccountId}
                                                        onChange={(e) => handleAccountSelectChange(e.target.value, 'formAccountId', ['checking', 'savings', 'credit_card'], e.currentTarget)}
                                                        required
                                                        disabled={!!draftSourceTransactionId}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/50"
                                                    >
                                                        <option value="">Choose an account</option>
                                                        <optgroup label="Bank Accounts">
                                                            {bankAccounts.map(a => (
                                                                <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                            ))}
                                                        </optgroup>
                                                        {creditCardAccounts.length > 0 && (
                                                            <optgroup label="Credit Cards">
                                                                {creditCardAccounts.map(a => (
                                                                  <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                                ))}
                                                            </optgroup>
                                                        )}
                                                        <option value="__new__">+ Add an account…</option>
                                                    </select>
                                                )}
                                            </div>

                                            {/* Category */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Category *
                                                </label>
                                                <select
                                                    value={formCategory}
                                                    onChange={(e) => setFormCategory(e.target.value as AccountSubType)}
                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    <option value="groceries">Groceries</option>
                                                    <option value="utilities">Utilities</option>
                                                    <option value="living_expense">Living expense</option>
                                                    <option value="repairs_maintenance">Repairs & maintenance</option>
                                                    <option value="other">Other expense</option>
                                                </select>
                                            </div>

                                            {/* Collapsible Note */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsNoteOpen(!isNoteOpen)}
                                                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
                                                >
                                                    {isNoteOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    <span>{isNoteOpen ? 'Note' : 'Add a note'}</span>
                                                </button>
                                                {isNoteOpen && (
                                                    <div className="mt-2 animate-in fade-in duration-100">
                                                        <input
                                                            type="text"
                                                            placeholder="Optional notes or reference..."
                                                            value={formDescription}
                                                            onChange={(e) => setFormDescription(e.target.value)}
                                                            disabled={!!draftSourceTransactionId}
                                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/50"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Contextual Personally Paid Business Expense Option */}
                                            {(hasBusiness || editingDraftId) && (
                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                                                        <input
                                                            type="checkbox"
                                                            checked={isPersonallyPaidBusiness}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setIsPersonallyPaidBusiness(checked);
                                                                // Why: When toggled ON, immediately synchronize existing account selection to draft state
                                                                if (checked && formAccountId) {
                                                                    const acc = accounts.find(a => a.id === formAccountId);
                                                                    if (acc) {
                                                                        setDraftPaymentAccountId(acc.id);
                                                                        setDraftCurrency(acc.currency as CurrencyCode);
                                                                        setDraftPayerEntityId(acc.entity_id);
                                                                    }
                                                                }
                                                            }}
                                                            disabled={!!draftSourceTransactionId}
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                                        />
                                                        <span className={!!draftSourceTransactionId ? "opacity-50" : ""}>This was paid with personal funds for a business</span>
                                                    </label>

                                                    {isPersonallyPaidBusiness && (
                                                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
                                                            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                                                            {draftSourceTransactionId ?
                                                                "Your bank balance will not change. This purchase will be recorded as a business expense owed back to you." :
                                                                "This business expense will be recorded and a reimbursement workflow will be initiated. It will impact your balances immediately."}
                                                            </p>

                                                            {/* Which business was this for? */}
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Which business was this for? *
                                                                </label>
                                                                <select
                                                                    value={draftBusinessId}
                                                                    onChange={(e) => {
                                                                        setDraftBusinessId(e.target.value);
                                                                        // Why: Do not override draftCurrency with the business entity's reporting currency!
                                                                        // Transaction currency strictly reflects the payment account used.
                                                                    }}
                                                                    required
                                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                                >
                                                                    <option value="">-- Select Business --</option>
                                                                    {entities.filter(e => e.type === 'business').map(e => (
                                                                        <option key={e.id} value={e.id}>{e.name} ({getOwnerTypeLabel(e.type)})</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            {/* Who paid personally? */}
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Who paid personally?
                                                                </label>
                                                                <select
                                                                    value={draftPayerEntityId}
                                                                    onChange={(e) => setDraftPayerEntityId(e.target.value)}
                                                                    disabled={!!draftSourceTransactionId}
                                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:bg-slate-50 disabled:text-slate-500 dark:disabled:bg-slate-800/50"
                                                                >
                                                                    <option value="">-- Select Person (Optional) --</option>
                                                                    {entities.filter(e => e.type === 'person' || e.type === 'household').map(e => (
                                                                        <option key={e.id} value={e.id}>{e.name} ({getOwnerTypeLabel(e.type)})</option>
                                                                    ))}
                                                                </select>
                                                            </div>

                                                            {/* Will the business reimburse you? */}
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Will the business reimburse you? *
                                                                </label>
                                                                <select
                                                                    value={draftExpectReimbursement}
                                                                    onChange={(e) => setDraftExpectReimbursement(e.target.value as any)}
                                                                    required
                                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                                >
                                                                    <option value="yes">Yes, I expect reimbursement (Due from Business)</option>
                                                                    <option value="no">No, it's an owner capital contribution</option>
                                                                    <option value="not_sure">Not sure yet</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* TAB 2: INCOME */}
                                    {activeTab === 'income' && (
                                        <>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Deposit to Bank Account *
                                                </label>
                                                <select
                                                    value={formAccountId}
                                                    onChange={(e) => handleAccountSelectChange(e.target.value, 'formAccountId', ['checking', 'savings'], e.currentTarget)}
                                                    required
                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                >
                                                    <option value="">-- Select Bank Account --</option>
                                                    {bankAccounts.map(a => (
                                                        <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                    ))}
                                                    <option value="__new__">+ Add an account…</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Income Category *
                                                    </label>
                                                    <select
                                                        value={formCategory}
                                                        onChange={(e) => setFormCategory(e.target.value as AccountSubType)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="salary">Salary / Wages</option>
                                                        <option value="freelance">Freelance / Consulting</option>
                                                        <option value="rental_income">Rental Income</option>
                                                        <option value="dividend">Dividends</option>
                                                        <option value="interest_income">Interest Income</option>
                                                        <option value="other">Other Income</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Amount ({currentCurrency}) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        placeholder="0.00"
                                                        value={formAmount}
                                                        onChange={(e) => setFormAmount(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Who paid you?
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Acme Corp"
                                                        value={formPayee}
                                                        onChange={(e) => setFormPayee(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formDate}
                                                        onChange={(e) => setFormDate(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Collapsible Note */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsNoteOpen(!isNoteOpen)}
                                                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
                                                >
                                                    {isNoteOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    <span>{isNoteOpen ? 'Note' : 'Add a note'}</span>
                                                </button>
                                                {isNoteOpen && (
                                                    <div className="mt-2 animate-in fade-in duration-100">
                                                        <input
                                                            type="text"
                                                            placeholder="Optional notes or reference..."
                                                            value={formDescription}
                                                            onChange={(e) => setFormDescription(e.target.value)}
                                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* TAB 3: TRANSFER */}
                                    {activeTab === 'transfer' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        From Account *
                                                    </label>
                                                    <select
                                                        value={formAccountId}
                                                        onChange={(e) => handleAccountSelectChange(e.target.value, 'formAccountId', ['checking', 'savings'], e.currentTarget)}
                                                        required
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="">-- From Account --</option>
                                                        {transferDestinationAccounts.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                        ))}
                                                        <option value="__new__">+ Add an account…</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        To Account *
                                                    </label>
                                                    <select
                                                        value={formToAccountId}
                                                        onChange={(e) => handleAccountSelectChange(e.target.value, 'formToAccountId', ['checking', 'savings'], e.currentTarget)}
                                                        required
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="">-- To Account --</option>
                                                        {transferDestinationAccounts.filter(a => a.id !== formAccountId).map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                        ))}
                                                        <option value="__new__">+ Add an account…</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Transfer Amount ({currentCurrency}) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        placeholder="0.00"
                                                        value={formAmount}
                                                        onChange={(e) => setFormAmount(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formDate}
                                                        onChange={(e) => setFormDate(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Collapsible Note */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsNoteOpen(!isNoteOpen)}
                                                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
                                                >
                                                    {isNoteOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    <span>{isNoteOpen ? 'Note' : 'Add a note'}</span>
                                                </button>
                                                {isNoteOpen && (
                                                    <div className="mt-2 animate-in fade-in duration-100">
                                                        <input
                                                            type="text"
                                                            placeholder="Optional notes or reference..."
                                                            value={formDescription}
                                                            onChange={(e) => setFormDescription(e.target.value)}
                                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* TAB 4: CREDIT CARD PAYMENT */}
                                    {activeTab === 'card_repayment' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Source Bank Account *
                                                    </label>
                                                    <select
                                                        value={formAccountId}
                                                        onChange={(e) => handleAccountSelectChange(e.target.value, 'formAccountId', ['checking', 'savings'], e.currentTarget)}
                                                        required
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="">-- Select Bank --</option>
                                                        {bankAccounts.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                        ))}
                                                        <option value="__new__">+ Add an account…</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Credit Card to Pay *
                                                    </label>
                                                    <select
                                                        value={formToAccountId}
                                                        onChange={(e) => handleAccountSelectChange(e.target.value, 'formToAccountId', ['credit_card'], e.currentTarget)}
                                                        required
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="">-- Select Card --</option>
                                                        {creditCardAccounts.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                        ))}
                                                        <option value="__new__">+ Add an account…</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Payment Amount ({currentCurrency}) *
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        placeholder="0.00"
                                                        value={formAmount}
                                                        onChange={(e) => setFormAmount(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formDate}
                                                        onChange={(e) => setFormDate(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Collapsible Note */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsNoteOpen(!isNoteOpen)}
                                                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
                                                >
                                                    {isNoteOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    <span>{isNoteOpen ? 'Note' : 'Add a note'}</span>
                                                </button>
                                                {isNoteOpen && (
                                                    <div className="mt-2 animate-in fade-in duration-100">
                                                        <input
                                                            type="text"
                                                            placeholder="Optional notes or reference..."
                                                            value={formDescription}
                                                            onChange={(e) => setFormDescription(e.target.value)}
                                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* TAB 5: LOAN PAYMENT */}
                                    {activeTab === 'loan_repayment' && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Source Bank Account *
                                                    </label>
                                                    <select
                                                        value={formAccountId}
                                                        onChange={(e) => handleAccountSelectChange(e.target.value, 'formAccountId', ['checking', 'savings'], e.currentTarget)}
                                                        required
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="">-- Select Bank --</option>
                                                        {bankAccounts.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                        ))}
                                                        <option value="__new__">+ Add an account…</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Loan Account *
                                                    </label>
                                                    <select
                                                        value={formToAccountId}
                                                        onChange={(e) => handleAccountSelectChange(e.target.value, 'formToAccountId', ['loan'], e.currentTarget)}
                                                        required
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    >
                                                        <option value="">-- Select Loan --</option>
                                                        {loanAccounts.map(a => (
                                                            <option key={a.id} value={a.id}>{a.name} ({a.formatted_balance})</option>
                                                        ))}
                                                        <option value="__new__">+ Add an account…</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Three-Way Split */}
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-2">
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Payment Breakdown ({currentCurrency})</span>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div>
                                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                            Principal *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={formLoanPrincipal}
                                                            onChange={(e) => setFormLoanPrincipal(e.target.value)}
                                                            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                            Interest
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={formLoanInterest}
                                                            onChange={(e) => setFormLoanInterest(e.target.value)}
                                                            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                            Fee
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={formLoanFee}
                                                            onChange={(e) => setFormLoanFee(e.target.value)}
                                                            className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Lender or bank
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Chase Mortgage"
                                                        value={formPayee}
                                                        onChange={(e) => setFormPayee(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        Payment Date *
                                                    </label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={formDate}
                                                        onChange={(e) => setFormDate(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Collapsible Note */}
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsNoteOpen(!isNoteOpen)}
                                                    className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 transition"
                                                >
                                                    {isNoteOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    <span>{isNoteOpen ? 'Note' : 'Add a note'}</span>
                                                </button>
                                                {isNoteOpen && (
                                                    <div className="mt-2 animate-in fade-in duration-100">
                                                        <input
                                                            type="text"
                                                            placeholder="Optional notes or reference..."
                                                            value={formDescription}
                                                            onChange={(e) => setFormDescription(e.target.value)}
                                                            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </form>

                                {/* Modal Footer */}
                                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRecordModalOpen(false);
                                            setEditingDraftId(null);
                                            setIsPersonallyPaidBusiness(false);
                                        }}
                                        className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                                    >
                                        Cancel
                                    </button>
                                    {activeTab === 'expense' && isPersonallyPaidBusiness ? (
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleSaveDraft}
                                                disabled={isSubmitting || !formAmount || !draftBusinessId}
                                                className="px-4 py-2 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <span>Save draft</span>
                                            </button>
                                            {draftExpectReimbursement === 'yes' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setModalView('reimbursement_preview')}
                                                    disabled={isSubmitting || !formAmount || !draftBusinessId || !formAccountId}
                                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <span>Preview & Confirm</span>
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleRecordSubmit}
                                            disabled={isSubmitting || (activeTab === 'expense' && !formAccountId)}
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            <span>{activeTab === 'expense' ? 'Save expense' : 'Save transaction'}</span>
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Void Modal */}
            {voidTargetTx && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div
                        ref={voidModalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="void-modal-title"
                        tabIndex={-1}
                        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden focus:outline-none"
                    >
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-rose-50 dark:bg-rose-950/40">
                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                                <Ban className="w-5 h-5" />
                                <h3 id="void-modal-title" className="font-bold text-base">Auditable Transaction Void</h3>
                            </div>
                            <button
                                onClick={() => setVoidTargetTx(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleVoidSubmit} className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                In double-entry accounting, records are immutable. Voiding marks this transaction as void,
                                recalculates balances immediately, and preserves the full prior state in the audit trail.
                            </p>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{voidTargetTx.description}</div>
                                <div className="text-slate-500">Date: {voidTargetTx.date} · Legs: {voidTargetTx.postings.length}</div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Reason for Void *
                                </label>
                                <textarea
                                    required
                                    rows={2}
                                    placeholder="Explain why this transaction is being voided..."
                                    value={voidReason}
                                    onChange={(e) => setVoidReason(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Performed By *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={voidActor}
                                    onChange={(e) => setVoidActor(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setVoidTargetTx(null)}
                                    className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Confirm Auditable Void</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Match Reimbursement Modal */}
            {matchingReimbursementId && (() => {
                const wf = reimbursementWorkflows.find(w => w.id === matchingReimbursementId);
                const canSubmit = Boolean(
                    !reimbCandidatesLoadingPersonal &&
                    !reimbCandidatesLoadingBusiness &&
                    !reimbCandidatesErrorPersonal &&
                    !reimbCandidatesErrorBusiness &&
                    selectedReimbPersonal &&
                    selectedReimbBusiness &&
                    (selectedReimbPersonal !== 'missing' || (missingPersonalAccountId && missingPersonalDate)) &&
                    (selectedReimbBusiness !== 'missing' || (missingBusinessAccountId && missingBusinessDate))
                );

                return (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Match Reimbursement</h3>
                                    {wf && (
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            Reimbursement amount: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatMoney({ amount_cents: wf.amount_cents, currency: (wf.currency || 'USD') as CurrencyCode })}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setMatchingReimbursementId(null); setUndoViewActive(false); }}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            {undoMatchViewActive ? (
                                <div className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Undo payment match</h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            This will reopen the reimbursement as awaiting payment. Your recorded bank payments and receipts will be unlinked.
                                        </p>
                                    </div>
                                    {undoMatchLoading ? (
                                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                                            <span>Loading preview...</span>
                                        </div>
                                    ) : undoMatchPreview && (
                                        <div className="space-y-4">
                                            {undoMatchPreview.is_personal_manual && (
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        The personal receipt was manually created during settlement. Where should this {formatMoney({ amount_cents: undoMatchPreview.personal_amount, currency: (wf?.currency || 'USD') as CurrencyCode })} cash receipt be recorded instead? *
                                                    </label>
                                                    <select
                                                        value={undoMatchNewPersonalAccount}
                                                        onChange={e => setUndoMatchNewPersonalAccount(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                    >
                                                        <option value="" disabled>Select a personal account (e.g. suspense)</option>
                                                        {accounts
                                                            .filter(a => a.entity_id === wf.personal_entity_id && (a.type === 'income' || a.type === 'liability' || a.type === 'expense' || a.type === 'equity'))
                                                            .filter(a => a.id !== wf.due_from_account_id && a.id !== undoMatchPreview.personal_bank_account_id)
                                                            .map(a => (
                                                                <option key={a.id} value={a.id}>{a.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            )}
                                            {undoMatchPreview.is_business_manual && (
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                        The business payment was manually created during settlement. Where should this {formatMoney({ amount_cents: undoMatchPreview.business_amount, currency: (wf?.currency || 'USD') as CurrencyCode })} cash payment be recorded instead? *
                                                    </label>
                                                    <select
                                                        value={undoMatchNewBusinessAccount}
                                                        onChange={e => setUndoMatchNewBusinessAccount(e.target.value)}
                                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                    >
                                                        <option value="" disabled>Select a business account (e.g. suspense or expense)</option>
                                                        {accounts
                                                            .filter(a => a.entity_id === wf.business_entity_id && (a.type === 'expense' || a.type === 'asset' || a.type === 'equity' || a.type === 'liability'))
                                                            .filter(a => a.id !== wf.due_to_account_id && a.id !== undoMatchPreview.business_bank_account_id)
                                                            .map(a => (
                                                                <option key={a.id} value={a.id}>{a.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            )}
                                            {!undoMatchPreview.is_personal_manual && (
                                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Restoring imported personal receipt</div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                                        <span className="font-medium">{undoMatchPreview.personal_date}</span>: {undoMatchPreview.personal_description}
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                        Amount: <span className="font-medium text-emerald-600">{formatMoney({ amount_cents: undoMatchPreview.personal_amount, currency: (wf?.currency || 'USD') as CurrencyCode })}</span>
                                                    </div>
                                                    {undoMatchPreview.personal_original_postings?.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                            <div className="text-xs text-slate-500 mb-1">Previous treatment:</div>
                                                            {undoMatchPreview.personal_original_postings.map((p: any, i: number) => {
                                                                const acc = accounts.find(a => a.id === p.account_id);
                                                                return (
                                                                    <div key={i} className="text-xs text-slate-600 flex justify-between">
                                                                        <span>{acc?.name || 'Unknown account'}</span>
                                                                        <span className={p.amount_cents > 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatMoney({ amount_cents: Math.abs(p.amount_cents), currency: p.currency as CurrencyCode })}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {!undoMatchPreview.is_business_manual && (
                                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Restoring imported business payment</div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                                        <span className="font-medium">{undoMatchPreview.business_date}</span>: {undoMatchPreview.business_description}
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                        Amount: <span className="font-medium text-rose-600">{formatMoney({ amount_cents: undoMatchPreview.business_amount, currency: (wf?.currency || 'USD') as CurrencyCode })}</span>
                                                    </div>
                                                    {undoMatchPreview.business_original_postings?.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                                            <div className="text-xs text-slate-500 mb-1">Previous treatment:</div>
                                                            {undoMatchPreview.business_original_postings.map((p: any, i: number) => {
                                                                const acc = accounts.find(a => a.id === p.account_id);
                                                                return (
                                                                    <div key={i} className="text-xs text-slate-600 flex justify-between">
                                                                        <span>{acc?.name || 'Unknown account'}</span>
                                                                        <span className={p.amount_cents > 0 ? 'text-emerald-600' : 'text-rose-600'}>{formatMoney({ amount_cents: Math.abs(p.amount_cents), currency: p.currency as CurrencyCode })}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setUndoMatchViewActive(false)}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleUndoMatchSubmit}
                                                    disabled={isSubmitting || (undoMatchPreview.is_personal_manual && !undoMatchNewPersonalAccount) || (undoMatchPreview.is_business_manual && !undoMatchNewBusinessAccount)}
                                                    className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? 'Undoing...' : 'Confirm Undo Match'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : wf?.status === 'reimbursed' ? (
                                <div className="p-6 space-y-4">
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg">
                                        <div className="font-semibold text-sm text-emerald-800 dark:text-emerald-300">Settlement Complete</div>
                                        <div className="text-xs mt-1 text-emerald-700 dark:text-emerald-400">This reimbursement has been fully settled and linked to its corresponding bank movements. No further action is required.</div>
                                    </div>
                                    <div className="flex justify-between items-center pt-4">
                                        <button
                                            type="button"
                                            onClick={() => handleUndoMatchPreviewStart(wf)}
                                            className="text-xs font-medium text-rose-600 hover:text-rose-800 transition"
                                        >
                                            Undo payment match
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setMatchingReimbursementId(null); setUndoViewActive(false); setUndoMatchViewActive(false); }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : wf?.status === 'cancelled' ? (
                                <div className="p-6 space-y-4">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-300">Classification Cancelled</div>
                                        <div className="text-xs mt-1 text-slate-700 dark:text-slate-400">This business classification was undone. The transaction was reverted to its personal expense category.</div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="button"
                                            onClick={() => { setMatchingReimbursementId(null); setUndoViewActive(false); }}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : undoViewActive ? (
                                <div className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Undo business classification</h4>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            This action means the business classification was a mistake. 
                                            <strong>Your bank balance will not change.</strong>
                                        </p>
                                    </div>
                                    {undoLoadingPreview ? (
                                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                                            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                                            <span>Loading preview...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {undoPurchaseDesc && (
                                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Purchase Details</div>
                                                    <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                                                        <div>
                                                            <div className="text-slate-500 dark:text-slate-400">Date</div>
                                                            <div className="font-medium text-slate-900 dark:text-slate-100">{undoPurchaseDate}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-slate-500 dark:text-slate-400">Description</div>
                                                            <div className="font-medium text-slate-900 dark:text-slate-100">{undoPurchaseDesc}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Personal Expense Category *
                                                </label>
                                                <select
                                                    value={undoSelectedCategory}
                                                    onChange={e => setUndoSelectedCategory(e.target.value)}
                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                >
                                                    <option value="" disabled>Select a personal category</option>
                                                    {accounts
                                                        .filter(a => a.entity_id === wf.personal_entity_id && a.type === 'expense' && a.currency === wf.currency)
                                                        .map(a => (
                                                            <option key={a.id} value={a.id}>{a.name}</option>
                                                        ))
                                                    }
                                                </select>
                                                {!undoOriginalCategory && (
                                                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                                                        No previous category found in correction history. Please provide one.
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setUndoViewActive(false)}
                                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleUndoBusinessClassificationSubmit}
                                                    disabled={!undoSelectedCategory || isSubmitting}
                                                    className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50"
                                                >
                                                    {isSubmitting ? 'Undoing...' : 'Confirm Undo'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="p-6 space-y-6 overflow-y-auto">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Link the corresponding bank transactions for this reimbursement. Both bank movements are selected explicitly. If a movement is missing from the bank feed, you can record it with explicit account and date review.
                                </p>

                                <div className="space-y-6">
                                    {/* Personal Leg */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                            Personal Receipt (Money Received by Owner)
                                        </h4>
                                        {reimbCandidatesLoadingPersonal ? (
                                            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                                                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                                                <span>Searching for personal receipt candidate movements...</span>
                                            </div>
                                        ) : reimbCandidatesErrorPersonal ? (
                                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                                    <span>Failed to check candidate movements: {reimbCandidatesErrorPersonal}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => matchingReimbursementId && fetchReimbCandidates(matchingReimbursementId, 'personal')}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-semibold rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 transition shrink-0"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {reimbCandidatesPersonal.length > 1 && (
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                                        Multiple candidate movements found ({reimbCandidatesPersonal.length}). Please select the matching receipt.
                                                    </p>
                                                )}
                                                {reimbCandidatesPersonal.length === 0 && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        No candidate movements found in bank feed. If not yet imported, select manual entry below.
                                                    </p>
                                                )}
                                                {reimbCandidatesPersonal.map(tx => {
                                                    const acc = accounts.find(a => a.id === tx.leg_account_id);
                                                    return (
                                                        <div 
                                                            key={tx.id}
                                                            onClick={() => setSelectedReimbPersonal(tx.id)}
                                                            className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition ${selectedReimbPersonal === tx.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-sm text-slate-800 dark:text-slate-200">{tx.description}</div>
                                                                <div className="text-xs text-slate-500">{tx.date} • {acc?.name || 'Unknown'}</div>
                                                            </div>
                                                            <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                                                +{formatMoney({ amount_cents: Math.abs(tx.leg_amount_cents || tx.leg_amount || wf?.amount_cents || 0), currency: (tx.currency || wf?.currency || 'USD') as CurrencyCode })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div 
                                                    onClick={() => setSelectedReimbPersonal('missing')}
                                                    className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition ${selectedReimbPersonal === 'missing' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 border-dashed'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center">
                                                            {selectedReimbPersonal === 'missing' && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Record missing receipt manually</span>
                                                    </div>
                                                </div>

                                                {selectedReimbPersonal === 'missing' && wf && (
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-3 border border-slate-200 dark:border-slate-700 ml-2">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Receiving Personal Account *
                                                                </label>
                                                                <select
                                                                    value={missingPersonalAccountId}
                                                                    onChange={e => setMissingPersonalAccountId(e.target.value)}
                                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                                >
                                                                    {accounts
                                                                        .filter(a => a.entity_id === wf.personal_entity_id && (a.type === 'asset' || a.sub_type === 'checking' || a.sub_type === 'savings') && a.currency === wf.currency)
                                                                        .map(a => (
                                                                            <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                                                                        ))
                                                                    }
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Receipt Date *
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    required
                                                                    value={missingPersonalDate}
                                                                    onChange={e => setMissingPersonalDate(e.target.value)}
                                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Business Leg */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                            Business Payment (Money Paid by Business)
                                        </h4>
                                        {reimbCandidatesLoadingBusiness ? (
                                            <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                                                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                                                <span>Searching for business payment candidate movements...</span>
                                            </div>
                                        ) : reimbCandidatesErrorBusiness ? (
                                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                                    <span>Failed to check candidate movements: {reimbCandidatesErrorBusiness}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => matchingReimbursementId && fetchReimbCandidates(matchingReimbursementId, 'business')}
                                                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-semibold rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 transition shrink-0"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {reimbCandidatesBusiness.length > 1 && (
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                                        Multiple candidate movements found ({reimbCandidatesBusiness.length}). Please select the matching payment.
                                                    </p>
                                                )}
                                                {reimbCandidatesBusiness.length === 0 && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        No candidate movements found in bank feed. If not yet imported, select manual entry below.
                                                    </p>
                                                )}
                                                {reimbCandidatesBusiness.map(tx => {
                                                    const acc = accounts.find(a => a.id === tx.leg_account_id);
                                                    return (
                                                        <div 
                                                            key={tx.id}
                                                            onClick={() => setSelectedReimbBusiness(tx.id)}
                                                            className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition ${selectedReimbBusiness === tx.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-sm text-slate-800 dark:text-slate-200">{tx.description}</div>
                                                                <div className="text-xs text-slate-500">{tx.date} • {acc?.name || 'Unknown'}</div>
                                                            </div>
                                                            <div className="font-bold text-sm text-rose-600 dark:text-rose-400">
                                                                -{formatMoney({ amount_cents: Math.abs(tx.leg_amount_cents || tx.leg_amount || wf?.amount_cents || 0), currency: (tx.currency || wf?.currency || 'USD') as CurrencyCode })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div 
                                                    onClick={() => setSelectedReimbBusiness('missing')}
                                                    className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition ${selectedReimbBusiness === 'missing' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-500' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 border-dashed'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center">
                                                            {selectedReimbBusiness === 'missing' && <div className="w-3 h-3 bg-indigo-600 rounded-full" />}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Record missing payment manually</span>
                                                    </div>
                                                </div>

                                                {selectedReimbBusiness === 'missing' && wf && (
                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg space-y-3 border border-slate-200 dark:border-slate-700 ml-2">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Paying Business Account *
                                                                </label>
                                                                <select
                                                                    value={missingBusinessAccountId}
                                                                    onChange={e => setMissingBusinessAccountId(e.target.value)}
                                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                                >
                                                                    {accounts
                                                                        .filter(a => a.entity_id === wf.business_entity_id && (a.type === 'asset' || a.sub_type === 'checking' || a.sub_type === 'savings') && a.currency === wf.currency)
                                                                        .map(a => (
                                                                            <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                                                                        ))
                                                                    }
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Payment Date *
                                                                </label>
                                                                <input
                                                                    type="date"
                                                                    required
                                                                    value={missingBusinessDate}
                                                                    onChange={e => setMissingBusinessDate(e.target.value)}
                                                                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => handleUndoBusinessClassificationPreview(wf)}
                                    className="text-xs font-medium text-rose-600 hover:text-rose-800 transition"
                                >
                                    Undo business classification
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setMatchingReimbursementId(null); setUndoViewActive(false); }}
                                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleMatchReimbursement}
                                        disabled={!canSubmit || isSubmitting}
                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Matching...' : 'Match Reimbursement'}
                                    </button>
                                </div>
                            </div>
                            </>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
