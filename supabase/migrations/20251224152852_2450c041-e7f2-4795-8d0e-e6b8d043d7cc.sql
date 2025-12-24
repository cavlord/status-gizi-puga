-- Remove the policy that exposes password_hash and otp to users
-- Since all user operations go through Edge Functions with service role,
-- direct user access to the users table is unnecessary

DROP POLICY IF EXISTS "Users can view own data" ON public.users;