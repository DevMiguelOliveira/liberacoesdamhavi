-- Execute this script in your Supabase SQL Editor to fix the "Access Denied" error.
-- This script finds all users in auth.users that do not have a corresponding record in public.admins
-- and inserts them automatically.

INSERT INTO public.admins (user_id, login, nome)
SELECT 
    id, 
    split_part(email, '@', 1), -- Use part of email before @ as login
    coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) -- Use full_name or email part as name
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.admins)
ON CONFLICT (user_id) DO NOTHING;

-- Verify the result
SELECT * FROM public.admins;
