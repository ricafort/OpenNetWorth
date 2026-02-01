-- ClearWorth Complete Database Setup
-- Run this in the Supabase SQL Editor to set up the entire database from scratch.

-- 1. Create tables

-- Users profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  privacy_mode BOOLEAN DEFAULT TRUE,
  
  -- Admin / Demo Features
  is_template BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user', -- 'admin' | 'user'
  template_name TEXT,       -- e.g., "UK Starter"
  country_code TEXT,        -- e.g., 'GB'
  currency_code TEXT DEFAULT 'USD',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Assets
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'cash', 'investment', 'real_estate', 'retirement', 'other'
  value NUMERIC NOT NULL DEFAULT 0,
  is_liquid BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'USD', -- Added to support demo data currencies
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Liabilities
CREATE TABLE IF NOT EXISTS public.liabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'mortgage', 'student_loan', 'auto_loan', 'credit_card', 'other'
  balance NUMERIC NOT NULL DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  is_good_debt BOOLEAN DEFAULT FALSE,
  currency TEXT DEFAULT 'USD', -- Added to support demo data currencies
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Net Worth History (Snapshots)
CREATE TABLE IF NOT EXISTS public.net_worth_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  total_assets NUMERIC NOT NULL,
  total_liabilities NUMERIC NOT NULL,
  net_worth NUMERIC NOT NULL,
  UNIQUE(user_id, date)
);

-- Mentor Interactions
CREATE TABLE IF NOT EXISTS public.mentor_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  mentor_id TEXT NOT NULL,
  message TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'mentor'
  mode TEXT NOT NULL, -- 'learn' or 'reflect'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Custom Mentors
CREATE TABLE IF NOT EXISTS public.custom_mentors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  archetype TEXT NOT NULL,
  description TEXT NOT NULL,
  personality_prompt TEXT NOT NULL,
  icon_name TEXT DEFAULT 'User',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_mentors ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- --- PROFILES ---
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Limit Admin Access to specific users (Replace 'admin' logic if you want a specific email check, 
-- but normally you update the row to 'admin' manually first)
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL 
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Public can view templates" ON public.profiles FOR SELECT USING (is_template = TRUE);

-- --- ASSETS ---
CREATE POLICY "Users can view own assets" ON public.assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assets" ON public.assets FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage template assets" ON public.assets FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = public.assets.user_id 
    AND is_template = TRUE
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- --- LIABILITIES ---
CREATE POLICY "Users can view own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own liabilities" ON public.liabilities FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage template liabilities" ON public.liabilities FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = public.liabilities.user_id 
    AND is_template = TRUE
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- --- NET WORTH HISTORY ---
CREATE POLICY "Users can view own history" ON public.net_worth_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own history" ON public.net_worth_history FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage template history" ON public.net_worth_history FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = public.net_worth_history.user_id 
    AND is_template = TRUE
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- --- MENTOR INTERACTIONS ---
CREATE POLICY "Users can manage own interactions" ON public.mentor_interactions FOR ALL USING (auth.uid() = user_id);

-- --- CUSTOM MENTORS ---
CREATE POLICY "Users can manage own custom mentors" ON public.custom_mentors FOR ALL USING (auth.uid() = user_id);

-- 4. Triggers for Proflie Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to prevent duplicates on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
