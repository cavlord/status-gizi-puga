
-- 1. Fix child_records: deny direct SELECT, only service role can access
DROP POLICY IF EXISTS "Authenticated users can view records" ON public.child_records;

CREATE POLICY "No direct public read access"
ON public.child_records
FOR SELECT
USING (false);

-- 2. Fix users_public view: recreate with security_invoker
DROP VIEW IF EXISTS public.users_public;

CREATE VIEW public.users_public
WITH (security_invoker = on) AS
SELECT id, email, verified, created_at, updated_at
FROM public.users;
