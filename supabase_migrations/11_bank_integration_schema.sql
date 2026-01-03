-- 11_bank_integration_schema.sql

-- 1. Create 'linked_items' table
-- Stores the high-level connection to a bank (e.g. "Chase Login via Plaid")
CREATE TABLE IF NOT EXISTS public.linked_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('plaid', 'basiq', 'brankas')),
    item_id TEXT NOT NULL, -- Provider's ID for this connection
    access_token TEXT NOT NULL, -- CAUTION: Application must encrypt this before insertion if not using Vault
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'error_relogin_required'
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, provider, item_id)
);

-- 2. Create 'bank_accounts' table
-- Individual accounts within a connection (e.g. "Checking", "Savings")
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    linked_item_id UUID REFERENCES public.linked_items(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Denormalized for easier RLS
    name TEXT NOT NULL,
    mask TEXT, -- e.g. "4921"
    type TEXT NOT NULL, -- 'checking', 'savings', 'credit', 'loan', 'investment'
    current_balance NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create 'bank_transactions' table
-- Raw transactions synced from the provider
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL, -- Denormalized for easier RLS
    external_id TEXT NOT NULL, -- Provider's transaction ID
    amount NUMERIC NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    merchant_name TEXT,
    category TEXT, -- Raw category from provider
    normalized_category TEXT, -- Our internal category map
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT DEFAULT 'posted', -- 'pending', 'posted'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(account_id, external_id)
);

-- 4. Enable RLS
ALTER TABLE public.linked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- LINKED ITEMS
CREATE POLICY "Users can manage own linked items" ON public.linked_items
    FOR ALL USING (auth.uid() = user_id);

-- BANK ACCOUNTS
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts
    FOR SELECT USING (auth.uid() = user_id);

-- BANK TRANSACTIONS
CREATE POLICY "Users can view own transactions" ON public.bank_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- NOTE: The Sync Engine (Edge Function) will use the SERVICE_ROLE key, bypassing RLS.
-- This ensures the backend can always write, but users can only read/delete their own data.
