-- Migration: Allow Profiles without Auth Users (For Templates)
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verify it's gone by checking constraints if you want, or just proceed.
-- This allows us to insert rows with random UUIDs that don't match an auth.uid()
