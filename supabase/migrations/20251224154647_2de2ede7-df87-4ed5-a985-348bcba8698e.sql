-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can view records" ON public.child_records;
DROP POLICY IF EXISTS "Service role full access" ON public.child_records;

-- Create permissive policies
CREATE POLICY "Anyone can view records"
ON public.child_records
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage all records"
ON public.child_records
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);