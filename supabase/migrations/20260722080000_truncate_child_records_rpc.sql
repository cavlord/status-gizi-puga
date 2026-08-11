-- RPC for truncating child_records table, callable from Edge Functions with service role.
-- TRUNCATE is faster and more reliable than DELETE for clearing all rows,
-- and resets the id sequence so IDs stay tidy after a full re-import.
CREATE OR REPLACE FUNCTION public.truncate_child_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  TRUNCATE TABLE public.child_records RESTART IDENTITY;
END;
$$;

-- Only service role can call this (no public access)
REVOKE ALL ON FUNCTION public.truncate_child_records() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.truncate_child_records() TO service_role;
