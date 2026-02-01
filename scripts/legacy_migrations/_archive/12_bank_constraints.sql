-- 12_bank_constraints.sql
-- Adds UNIQUE constraints to allow UPSERT operations during Bank Sync.

-- 1. Bank Accounts: Prevent duplicate accounts
-- We assume (linked_item_id, name, mask) is unique enough for MVP.
-- If Plaid sends a stable 'account_id', we should store that instead, but our schema uses internal UUIDs.
-- Ideally in Phase 2 we would have added 'external_id' to bank_accounts.
-- Let's stick to Name+Mask for now as per `syncEngine.ts` logic.

ALTER TABLE public.bank_accounts
ADD CONSTRAINT bank_accounts_item_id_name_mask_key UNIQUE (linked_item_id, name, mask);
