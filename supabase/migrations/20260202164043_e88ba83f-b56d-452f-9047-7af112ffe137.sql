-- Create a public view that excludes sensitive fields (password_hash, otp, otp_expiry)
-- This view should be used for any client-side queries
CREATE VIEW public.users_public
WITH (security_invoker = on) AS
  SELECT 
    id, 
    email, 
    verified, 
    created_at, 
    updated_at
  FROM public.users;

-- Drop the existing RESTRICTIVE admin policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- Create PERMISSIVE policies instead (RESTRICTIVE requires ALL policies to pass)
-- Service role full access (keep as is, but make permissive)
DROP POLICY IF EXISTS "Service role full access users" ON public.users;

CREATE POLICY "Service role full access"
ON public.users
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Deny direct access to users table for regular users
-- Only service_role should access the base table directly
-- This protects password_hash, otp, otp_expiry from exposure
CREATE POLICY "No direct public access"
ON public.users
AS PERMISSIVE
FOR SELECT
TO anon, authenticated
USING (false);