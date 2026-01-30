-- MASTER FIX SCRIPT
-- Run this in Supabase SQL Editor to ensure everything is set up correctly.

-- 1. Ensure 'observacoes' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'liberacoes' AND column_name = 'observacoes') THEN
        ALTER TABLE public.liberacoes ADD COLUMN observacoes text null;
    END IF;
END $$;

-- 2. Ensure RLS policies exist and are correct
-- First, enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liberacoes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly (avoids duplicates/errors)
DROP POLICY IF EXISTS "Admins can view all liberacoes" ON public.liberacoes;
DROP POLICY IF EXISTS "Admins can insert liberacoes" ON public.liberacoes;
DROP POLICY IF EXISTS "Admins can update liberacoes" ON public.liberacoes;
DROP POLICY IF EXISTS "Admins can delete liberacoes" ON public.liberacoes;

-- Create Policies
CREATE POLICY "Admins can view all liberacoes" ON public.liberacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert liberacoes" ON public.liberacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update liberacoes" ON public.liberacoes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete liberacoes" ON public.liberacoes FOR DELETE TO authenticated USING (true);

-- 3. Backfill Admins (Fix "Access Denied")
INSERT INTO public.admins (user_id, login, nome)
SELECT 
    id, 
    split_part(email, '@', 1),
    coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.admins)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Verify results
SELECT count(*) as total_admins FROM public.admins;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'liberacoes';
