# ADR 001: Trusted Financial Document Workflow Architecture & Component Reuse

**Status**: Proposed / Initial Review  
**Date**: 2026-09-13  
**Deciders**: OpenNetWorth Engineering  
**Consulted**: OpenTax-AU Reference Project (`D:\AntiGravityProjects\opentax-au`)

---

## 1. Context and Problem Statement

OpenNetWorth aims to provide a sovereign, local-first personal ERP workflow for ordinary people:
$$\text{Import} \longrightarrow \text{Extract} \longrightarrow \text{Validate} \longrightarrow \text{Match} \longrightarrow \text{Review} \longrightarrow \text{Record} \longrightarrow \text{Explain}$$

Users struggle with collecting disparate documents (bank CSVs, XLSX spreadsheets, property management statements, receipts, invoices, mortgage notices), manually keying in numbers, cross-checking spreadsheets, and maintaining agreement across accounts.

We need an architecture that:
1. Reuses battle-tested extraction and validation components from the reference project **OpenTax-AU** (`D:\AntiGravityProjects\opentax-au`).
2. Adopts UX lessons from **Wealthfolio** (repeat-import column mappings, preview before recording, understandable duplicate matching, shared health findings).
3. Strictly upholds all **Milestone 0 Safety Guarantees**:
   - Zero test leakage into live vaults (`M1-SAFE-01`: in-memory `:memory:` isolation).
   - Authoritative, atomic, commit-first SQLite storage (`M1-SAFE-04`).
   - Retaining user inputs and displaying actionable error banners on failure.
   - Preserving existing safety backups (`data/safety_backup_pre_isolation/`).
4. Avoids the anti-pattern of copying an entire tax engine or embedding Australian statutory tax assumptions into a neutral international personal finance tool.

---

## 2. Audit of Existing Systems

### A. OpenNetWorth Baseline & Guarantees
- **Storage**: Embedded SQLite (`data/opennetworth.sqlite`) accessed via `getDb()` in `src/infrastructure/sqlite/db.ts`.
- **Test Isolation**: Verified in-memory SQLite isolation under Vitest (`setTestDb(createTestDb())`). Live database files are never opened by tests.
- **Save Integrity**: Scoped saves (`persistScopedRecord`) commit to SQLite before updating caches, returning authoritative persisted records.
- **Existing Collections**: `assets`, `liabilities`, `goals`, `recurring_transactions`, `net_worth_history`, `cash_flow_history`, `settings`, `profiles`.

### B. OpenTax-AU Reference Audit (`D:\AntiGravityProjects\opentax-au`)
- **License**: MIT (`Francis Ricafort`). Suitable for adaptation and reuse.
- **Document Routing**: `UniversalTaxDocumentRouter` in `opentax_au/parser/router.py` dispatches files across specialized parsers.
- **Parsing Components**:
  - `BankStatementParser`: Extracts date, description, amount, balance from bank PDF statements.
  - `RentalDocumentParser` & `rental_matrix.py`: Extracts gross rental income, agent commissions, repairs, and net payout.
  - `InvoiceParser` & `ReceiptParser`: Extracts supplier, date, line items, tax, total.
  - `ocr.py`: Page rendering and OCR fallback when native text is missing.
  - `vision_receipt.py` & `vision_income.py`: Local LLM vision extraction via Ollama/LM Studio endpoints.
- **Background Jobs**: `PreparationWorker` in `opentax_au/preparation_jobs.py` provides SQLite-backed durable job state (`queued`, `processing`, `completed`, `attention`) with lease times and attempt counts.
- **Divergent Behavior & Tax Bias**:
  - OpenTax-AU directly labels fields with Australian Tax Return items (e.g. ATO D1-D15, Gross rent, GST).
  - OpenTax-AU models use standard IEEE-754 `float` in several structures.
  - Ingestion currently models one proposed event per document. OpenNetWorth requires one document to yield *multiple* financial events (e.g. rental statement yielding income, repairs expense, management fee expense, and bank payout).

---

## 3. Architecture Decisions

### Decision 1: Authoritative OpenNetWorth Storage Boundary
- **Extraction is Untrusted Input**: Document extraction produces **Proposals**, never accepted financial records.
- **The Ledger Owns Financial Truth**: Only the OpenNetWorth SQLite database and deterministic calculation services record confirmed financial reality.
- **Separation of Concerns**:
  ```
  [Raw Document Bytes + SHA-256]
                │
                ▼
  [Extraction Attempt & Version]
                │
                ▼
  [Extracted Fields & Positions]
                │
                ▼
  [Proposed Financial Events] ─── (Review Interface / User Approval)
                │                                    │
                │ Approved                           ▼
                └─────────────────────────► [Authoritative SQLite Ledger]
                                            - Accounts
                                            - Balanced Journal Entries
                                            - Audit & Evidence Links
  ```

### Decision 2: Proposed Extraction Adapter (Narrow Adapter Pattern)
Rather than copying the Python tax application into OpenNetWorth or creating a competing database:
1. **Tier 1 (Direct Native Parsers in TypeScript)**:
   - **Bank CSVs**: High-speed TypeScript parser with remembered column mappings, date formats, and delimiter detection.
   - **XLSX Spreadsheets**: Direct cell/row parser referencing exact sheet, row, and cell addresses without executing formulas or macros.
2. **Tier 2 (Document Extraction Adapter for Complex PDFs & Images)**:
   - A narrow adapter service interface (`IDocumentExtractionAdapter`) that accepts document bytes and returns a standardized **Neutral Data Contract** (`ExtractedDocumentProposal`).
   - Reuses OpenTax-AU’s specialized parsing algorithms (rental statement matrix, invoice parsing, receipt heuristics) through an explicit adapter contract.
   - For scanned receipts and single-page invoices, routes to local vision models (LM Studio on port 1234 or Ollama on port 11434) using strict structured JSON schemas.

### Decision 3: Neutral Financial Fact & Calculation Contract
All extracted and approved records use the **Neutral Data Contract**:
- `entity_id`: Explicit owner (Person, Legal Entity, or Household reporting group).
- `account_id`: Explicit financial account (Asset, Liability, Equity, Income, Expense).
- `date`: Effective date (`YYYY-MM-DD`).
- `original_currency`: 3-letter ISO code (e.g. `USD`, `AUD`, `EUR`). Never assumed from `$` or locale.
- `amount_cents`: Exact signed 64-bit integer representing minor currency units (cents). **No floating-point money**.
- `event_type`: `income`, `expense`, `transfer`, `repayment`, `valuation`.
- `evidence_ref`: `{ document_id, content_hash, page, cell_ref, bbox, extraction_version }`.
- `status`: `provisional` vs `confirmed`.

### Decision 4: Background Job Ownership
- OpenNetWorth owns background job durability in its local SQLite database (`document_inbox` table).
- States: `queued` $\to$ `processing` $\to$ `ready_for_review` | `partially_extracted` | `failed`.
- Restart recovery: Unfinished jobs re-queue cleanly upon application startup. Expired processing leases are reclaimed without duplicating work.

### Decision 5: Context Supplied to the Local Assistant
- The contextual assistant consumes:
  - The same financial facts as UI screens.
  - Scoped context: selected entity, selected account, selected document, confirmed totals, and health findings.
  - Refreshed before each turn to avoid acting on stale facts.
- The assistant operates under **strict tool boundaries**:
  - Read-only tools (`get_account_balance`, `get_net_worth`, `explain_transaction`, `list_unresolved_findings`).
  - Proposal-only tools (`propose_transaction_category`, `propose_match`).
  - Zero arbitrary SQL, zero shell access, zero self-approval.

### Decision 6: LangGraph Evaluation Boundary
- LangGraph is **not** introduced for basic CRUD, calculations, or financial persistence.
- In accordance with the Addendum (Slice 1G), LangGraph will be prototyped and evaluated in isolation for complex multi-step document extraction flows with interrupt/resume and human review.
- The authoritative accounting services and persistence remain strictly independent of LangGraph.

### Decision 7: Non-Destructive Persistence Migration
- Legacy Milestone 0 records (`assets`, `liabilities`, `goals`, `recurring`, `history`, `cashFlow`) are preserved.
- New document workflow tables (`document_files`, `document_jobs`, `document_proposals`, `m1_accounts`, `m1_journal_entries`) are introduced non-destructively alongside legacy tables.
- Legacy assets and liabilities map to accounts with dated opening balances without fabricating fictitious transaction histories.

---

## 4. Consequences & Guarantees

- **Safety Guarantee**: In-memory database isolation (`M1-SAFE-01`) is preserved across all existing and new test suites.
- **Traceability**: Every displayed financial total can be drilled down to its contributing accepted records and source document references (`M1-EVID-02`).
- **Offline & Private**: Fully operational with zero internet access, zero cloud telemetry, and local model inference only.
- **Mathematical Exactness**: Eliminates floating-point rounding errors via integer cents.
