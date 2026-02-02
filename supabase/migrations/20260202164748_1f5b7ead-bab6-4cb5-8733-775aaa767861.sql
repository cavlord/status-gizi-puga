-- Fix 1: Restrict child_records to authenticated users only (CRITICAL)
-- Drop the public policy that allows anyone to view sensitive children's health data
DROP POLICY IF EXISTS "Anyone can view records" ON public.child_records;

-- Create authenticated-only policy for viewing records
CREATE POLICY "Authenticated users can view records"
ON public.child_records
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Update has_role function with proper search_path including pg_temp
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;