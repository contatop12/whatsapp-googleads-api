-- Run after creating the first user in Supabase Auth (Authentication → Users → Add user)
-- Replace <UUID_FROM_AUTH> with the actual UUID
UPDATE public.users
SET role = 'admin', name = 'Admin P12'
WHERE id = '<UUID_FROM_AUTH>';
