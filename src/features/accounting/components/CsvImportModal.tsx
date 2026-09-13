/**
 * Milestone 1 Bank CSV Import Modal (Slice 1E)
 * 
 * Why this component exists:
 * Provides the interactive user interface for uploading/pasting bank CSV files,
 * configuring or auto-matching reusable column mapping profiles, selecting target
 * accounts, and previewing the parsed results before creating reviewable proposals.
 * 
 * Tricky logic:
 * - Real-time header signature detection: Compares incoming headers to saved mapping profiles
 *   and automatically pre-selects the matching profile if found.
 * - Live preview: As the user selects columns or changes date format, parses the first 5 rows
 *   instantly in-browser using `parseCsvWithMapping` so the user sees exactly how the data will
 *   be interpreted before submitting.
 * - Non-destructive: Unsupported rows are flagged with error badges and never guessed.
 * 
 * TODO: Support drag-and-drop folder uploads of monthly statements in Slice 1G.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Upload,
    FileText,
    Check,
    AlertTriangle,
    Info,
    ArrowRight,
    Sparkles,
    Save
} from 'lucide-react';
import {
    computeHeaderSignature,
    parseRawCsv,
    parseCsvWithMapping
} from '@/lib/domain/document/csvParserService';
import {
    CsvAmountMode,
    CsvDateFormat,
    CsvMappingProfile
} from '@/lib/domain/document/types';
import { Account, AccountSubType } from '@/lib/domain/accounting/types';

interface CsvImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    entities: Array<{ id: string; name: string }>;
    onImportSuccess: (documentId: string) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
    isOpen,
    onClose,
    accounts,
    entities,
    onImportSuccess
}) => {
    const [step, setStep] = useState<'upload' | 'mapping'>('upload');
    const [filename, setFilename] = useState<string>('');
    const [rawContent, setRawContent] = useState<string>('');
    const [targetAccountId, setTargetAccountId] = useState<string>('');
    const [selectedEntityId, setSelectedEntityId] = useState<string>('');

    // Mapping configurations
    const [savedMappings, setSavedMappings] = useState<CsvMappingProfile[]>([]);
    const [selectedMappingId, setSelectedMappingId] = useState<string>('custom');
    const [mappingName, setMappingName] = useState<string>('My Bank CSV');
    const [saveMappingChecked, setSaveMappingChecked] = useState<boolean>(true);

    const [dateColumn, setDateColumn] = useState<string>('');
    const [dateFormat, setDateFormat] = useState<CsvDateFormat>('YYYY-MM-DD');
    const [descriptionColumn, setDescriptionColumn] = useState<string>('');
    const [amountMode, setAmountMode] = useState<CsvAmountMode>('single_amount');
    const [amountColumn, setAmountColumn] = useState<string>('');
    const [debitColumn, setDebitColumn] = useState<string>('');
    const [creditColumn, setCreditColumn] = useState<string>('');
    const [defaultCategory, setDefaultCategory] = useState<string>('living_expense');

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Filter liquid accounts (assets)
    const liquidAccounts = useMemo(() => {
        return accounts.filter(a => a.type === 'asset');
    }, [accounts]);

    // Set initial account and entity
    useEffect(() => {
        if (liquidAccounts.length > 0 && !targetAccountId) {
            setTargetAccountId(liquidAccounts[0].id);
            setSelectedEntityId(liquidAccounts[0].entity_id);
        }
    }, [liquidAccounts, targetAccountId]);

    // Fetch saved mappings on mount
    useEffect(() => {
        if (!isOpen) return;
        fetch('/api/documents/mappings')
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.mappings)) {
                    setSavedMappings(data.mappings);
                }
            })
            .catch(err => console.error('Failed to load saved mappings:', err));
    }, [isOpen]);

    // Parse headers from raw content
    const rawParsed = useMemo(() => {
        if (!rawContent) return { headers: [], rows: [], rawLines: [] };
        return parseRawCsv(rawContent);
    }, [rawContent]);

    const headers = rawParsed.headers;
    const headerSignature = useMemo(() => computeHeaderSignature(headers), [headers]);

    // Auto-detect matching profile or sensible defaults when headers change
    useEffect(() => {
        if (headers.length === 0) return;

        // 1. Try to find an exact matching saved profile
        const matched = savedMappings.find(m => m.header_signature === headerSignature);
        if (matched) {
            setSelectedMappingId(matched.id);
            setMappingName(matched.name);
            setDateColumn(matched.date_column);
            setDateFormat(matched.date_format);
            setDescriptionColumn(matched.description_column);
            setAmountMode(matched.amount_mode);
            setAmountColumn(matched.amount_column || '');
            setDebitColumn(matched.debit_column || '');
            setCreditColumn(matched.credit_column || '');
            return;
        }

        // 2. Otherwise auto-guess common column names
        setSelectedMappingId('custom');
        setMappingName(`${filename.replace(/\.csv$/i, '')} Mapping`);

        const lowerHeaders = headers.map(h => h.toLowerCase());

        // Date guess
        const dateIdx = lowerHeaders.findIndex(h => h.includes('date'));
        if (dateIdx >= 0) setDateColumn(headers[dateIdx]);

        // Description guess
        const descIdx = lowerHeaders.findIndex(h => h.includes('desc') || h.includes('narrative') || h.includes('payee') || h.includes('details') || h.includes('memo'));
        if (descIdx >= 0) setDescriptionColumn(headers[descIdx]);

        // Debit / Credit vs Single Amount guess
        const debitIdx = lowerHeaders.findIndex(h => h === 'debit' || h.includes('debit') || h.includes('withdrawal') || h.includes('out'));
        const creditIdx = lowerHeaders.findIndex(h => h === 'credit' || h.includes('credit') || h.includes('deposit') || h.includes('in'));
        const amountIdx = lowerHeaders.findIndex(h => h === 'amount' || h.includes('amount') || h.includes('total'));

        if (debitIdx >= 0 && creditIdx >= 0) {
            setAmountMode('debit_credit');
            setDebitColumn(headers[debitIdx]);
            setCreditColumn(headers[creditIdx]);
        } else if (amountIdx >= 0) {
            setAmountMode('single_amount');
            setAmountColumn(headers[amountIdx]);
        } else if (headers.length >= 3) {
            setAmountMode('single_amount');
            setAmountColumn(headers[headers.length - 1]); // Fallback to last column
        }
    }, [headers, headerSignature, savedMappings, filename]);

    // Active mapping profile for preview
    const activeMapping: CsvMappingProfile = useMemo(() => {
        return {
            id: selectedMappingId,
            name: mappingName,
            header_signature: headerSignature,
            date_column: dateColumn,
            date_format: dateFormat,
            description_column: descriptionColumn,
            amount_mode: amountMode,
            amount_column: amountColumn,
            debit_column: debitColumn,
            credit_column: creditColumn,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    }, [
        selectedMappingId,
        mappingName,
        headerSignature,
        dateColumn,
        dateFormat,
        descriptionColumn,
        amountMode,
        amountColumn,
        debitColumn,
        creditColumn
    ]);

    // Live preview of parsed rows (up to 5 rows)
    const previewResult = useMemo(() => {
        if (!rawContent || headers.length === 0 || !dateColumn || !descriptionColumn) {
            return null;
        }
        return parseCsvWithMapping(rawContent, activeMapping);
    }, [rawContent, headers, dateColumn, descriptionColumn, activeMapping]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFilename(file.name);
        setError(null);

        const reader = new FileReader();
        reader.onload = event => {
            const content = event.target?.result as string;
            setRawContent(content);
            setStep('mapping');
        };
        reader.onerror = () => {
            setError('Failed to read the selected file. Please try again.');
        };
        reader.readAsText(file);
    };

    const handleProceedToMapping = () => {
        if (!rawContent.trim()) {
            setError('Please provide CSV content to proceed.');
            return;
        }
        if (!filename.trim()) {
            setFilename('imported_statement.csv');
        }
        setError(null);
        setStep('mapping');
    };

    const handleConfirmImport = async () => {
        if (!targetAccountId) {
            setError('Please select a target liquid bank account.');
            return;
        }
        if (!dateColumn || !descriptionColumn) {
            setError('Please select both a Date and Description column.');
            return;
        }
        if (amountMode === 'single_amount' && !amountColumn) {
            setError('Please select an Amount column.');
            return;
        }
        if (amountMode === 'debit_credit' && (!debitColumn || !creditColumn)) {
            setError('Please select both Debit and Credit columns.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Optionally save mapping profile first
            if (saveMappingChecked && mappingName.trim()) {
                await fetch('/api/documents/mappings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: mappingName.trim(),
                        header_signature: headerSignature,
                        date_column: dateColumn,
                        date_format: dateFormat,
                        description_column: descriptionColumn,
                        amount_mode: amountMode,
                        amount_column: amountColumn,
                        debit_column: debitColumn,
                        credit_column: creditColumn
                    })
                });
            }

            // Ingest CSV document
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    raw_content: rawContent,
                    mapping: activeMapping,
                    target_account_id: targetAccountId,
                    default_category: defaultCategory,
                    entity_id: selectedEntityId
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to import CSV document.');
            }

            // Successfully ingested! Pass document ID back to parent
            onImportSuccess(data.document.id);
            onClose();
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during import.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Upload className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                                Import Bank CSV Statement
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Slice 1E: Preserves original file, validates rows, and generates reviewable proposals.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                        <div className="flex-1">{error}</div>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    {step === 'upload' ? (
                        <div className="space-y-5">
                            {/* Drag and Drop Zone */}
                            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full mb-3">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Click to select a Bank CSV file
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Standard RFC 4180 format (comma-separated, UTF-8)
                                </span>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>

                            {/* Or Paste CSV Content */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Or paste raw CSV text directly:
                                    </label>
                                    <span className="text-[11px] text-slate-400">
                                        Useful for copying rows from online banking
                                    </span>
                                </div>
                                <textarea
                                    value={rawContent}
                                    onChange={e => setRawContent(e.target.value)}
                                    placeholder="Date,Description,Amount&#10;2026-08-01,Salary Deposit,3500.00&#10;2026-08-02,Groceries,-124.50"
                                    rows={6}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            {/* Optional Filename if pasting */}
                            <div className="flex gap-4 items-center">
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">
                                        Document File Label:
                                    </label>
                                    <input
                                        type="text"
                                        value={filename}
                                        onChange={e => setFilename(e.target.value)}
                                        placeholder="e.g. BankStatement_Aug2026.csv"
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Step Indicator */}
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                                <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                        File: {filename}
                                    </span>
                                    <span className="text-slate-400">•</span>
                                    <span>{rawParsed.rows.length} rows found</span>
                                </div>
                                <button
                                    onClick={() => setStep('upload')}
                                    className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline"
                                >
                                    Change File
                                </button>
                            </div>

                            {/* Account & Entity Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Target Bank Account *
                                    </label>
                                    <select
                                        value={targetAccountId}
                                        onChange={e => {
                                            const accId = e.target.value;
                                            setTargetAccountId(accId);
                                            const acc = liquidAccounts.find(a => a.id === accId);
                                            if (acc) setSelectedEntityId(acc.entity_id);
                                        }}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {liquidAccounts.map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.currency})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Account whose balance will reflect these deposits & withdrawals.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                                        Default Expense Category
                                    </label>
                                    <select
                                        value={defaultCategory}
                                        onChange={e => setDefaultCategory(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="living_expense">Living Expense</option>
                                        <option value="groceries">Groceries</option>
                                        <option value="utilities">Utilities</option>
                                        <option value="rent_expense">Rent</option>
                                        <option value="transportation">Transportation</option>
                                        <option value="entertainment">Entertainment</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="interest_expense">Interest / Finance</option>
                                    </select>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Default counterpart account (can be edited per row in review).
                                    </p>
                                </div>
                            </div>

                            {/* Column Mapping Controls */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 bg-slate-50/40 dark:bg-slate-800/20">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                            Column & Date Mapping
                                        </h3>
                                    </div>

                                    {/* Saved Mapping selector */}
                                    {savedMappings.length > 0 && (
                                        <select
                                            value={selectedMappingId}
                                            onChange={e => {
                                                const mId = e.target.value;
                                                setSelectedMappingId(mId);
                                                const m = savedMappings.find(x => x.id === mId);
                                                if (m) {
                                                    setMappingName(m.name);
                                                    setDateColumn(m.date_column);
                                                    setDateFormat(m.date_format);
                                                    setDescriptionColumn(m.description_column);
                                                    setAmountMode(m.amount_mode);
                                                    setAmountColumn(m.amount_column || '');
                                                    setDebitColumn(m.debit_column || '');
                                                    setCreditColumn(m.credit_column || '');
                                                }
                                            }}
                                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
                                        >
                                            <option value="custom">Custom Configuration</option>
                                            {savedMappings.map(m => (
                                                <option key={m.id} value={m.id}>
                                                    Preset: {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Date Column */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                            Date Column *
                                        </label>
                                        <select
                                            value={dateColumn}
                                            onChange={e => setDateColumn(e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                        >
                                            <option value="">Select Column...</option>
                                            {headers.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Date Format */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                            Date Format *
                                        </label>
                                        <select
                                            value={dateFormat}
                                            onChange={e => setDateFormat(e.target.value as CsvDateFormat)}
                                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                        >
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (AU / UK)</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                                        </select>
                                    </div>

                                    {/* Description Column */}
                                    <div>
                                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                            Description / Payee *
                                        </label>
                                        <select
                                            value={descriptionColumn}
                                            onChange={e => setDescriptionColumn(e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                        >
                                            <option value="">Select Column...</option>
                                            {headers.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Amount Mode Toggle */}
                                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                                    <div className="flex items-center gap-4 mb-3">
                                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="amountMode"
                                                checked={amountMode === 'single_amount'}
                                                onChange={() => setAmountMode('single_amount')}
                                                className="text-indigo-600"
                                            />
                                            <span>Single Amount Column (+ / -)</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="amountMode"
                                                checked={amountMode === 'debit_credit'}
                                                onChange={() => setAmountMode('debit_credit')}
                                                className="text-indigo-600"
                                            />
                                            <span>Separate Debit & Credit Columns</span>
                                        </label>
                                    </div>

                                    {amountMode === 'single_amount' ? (
                                        <div className="w-full sm:w-1/2">
                                            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                                Amount Column *
                                            </label>
                                            <select
                                                value={amountColumn}
                                                onChange={e => setAmountColumn(e.target.value)}
                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                            >
                                                <option value="">Select Amount Column...</option>
                                                {headers.map(h => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                                    Debit Column (Withdrawals) *
                                                </label>
                                                <select
                                                    value={debitColumn}
                                                    onChange={e => setDebitColumn(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                                >
                                                    <option value="">Select Debit Column...</option>
                                                    {headers.map(h => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                                                    Credit Column (Deposits) *
                                                </label>
                                                <select
                                                    value={creditColumn}
                                                    onChange={e => setCreditColumn(e.target.value)}
                                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                                                >
                                                    <option value="">Select Credit Column...</option>
                                                    {headers.map(h => (
                                                        <option key={h} value={h}>{h}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Reusable Mapping Save option */}
                                <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/60">
                                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={saveMappingChecked}
                                            onChange={e => setSaveMappingChecked(e.target.checked)}
                                            className="rounded border-slate-300 text-indigo-600"
                                        />
                                        <span>Save this column mapping for future imports</span>
                                    </label>
                                    {saveMappingChecked && (
                                        <input
                                            type="text"
                                            value={mappingName}
                                            onChange={e => setMappingName(e.target.value)}
                                            placeholder="Profile Name (e.g. Chase Checking)"
                                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 outline-none w-56"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Live 5-Row Preview Table */}
                            {previewResult && (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                            Parsed Sample Preview (First 5 Rows)
                                        </h4>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                            {previewResult.valid_rows} valid, {previewResult.error_rows} errors
                                        </span>
                                    </div>
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                                <tr>
                                                    <th className="py-2 px-3">Row</th>
                                                    <th className="py-2 px-3">Date</th>
                                                    <th className="py-2 px-3">Description</th>
                                                    <th className="py-2 px-3 text-right">Amount</th>
                                                    <th className="py-2 px-3">Validation Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                                                {previewResult.rows.slice(0, 5).map((row, idx) => {
                                                    const hasError = row.validation_findings.some(f => f.severity === 'error');
                                                    const isIncome = row.amount_cents !== null && row.amount_cents > 0;
                                                    return (
                                                        <tr
                                                            key={idx}
                                                            className={hasError ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}
                                                        >
                                                            <td className="py-2 px-3 text-slate-400">{row.row_number}</td>
                                                            <td className="py-2 px-3 text-slate-700 dark:text-slate-300">
                                                                {row.date || <span className="text-rose-500 font-sans">Invalid</span>}
                                                            </td>
                                                            <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                                                {row.description}
                                                            </td>
                                                            <td className={`py-2 px-3 text-right font-semibold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                                                {row.amount_cents !== null ? (
                                                                    `${isIncome ? '+' : ''}${(row.amount_cents / 100).toFixed(2)}`
                                                                ) : (
                                                                    <span className="text-rose-500 font-sans">Invalid</span>
                                                                )}
                                                            </td>
                                                            <td className="py-2 px-3 font-sans">
                                                                {hasError ? (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-medium">
                                                                        {row.validation_findings[0]?.message}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                                                                        Ready
                                                                    </span>
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
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl"
                    >
                        Cancel
                    </button>

                    {step === 'upload' ? (
                        <button
                            onClick={handleProceedToMapping}
                            disabled={!rawContent.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition"
                        >
                            <span>Configure Mapping</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleConfirmImport}
                            disabled={isSubmitting || !dateColumn || !descriptionColumn}
                            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-sm"
                        >
                            {isSubmitting ? (
                                <span>Ingesting & Validating...</span>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Import & Review Proposals ({rawParsed.rows.length} rows)</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
