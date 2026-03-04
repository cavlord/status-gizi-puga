
-- 1. Enable RLS on child_records
ALTER TABLE public.child_records ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT (read-only via anon/authenticated roles won't work since edge functions use service_role anyway)
-- Block all direct public access; edge functions use service_role which bypasses RLS
CREATE POLICY "No direct public access to child_records"
ON public.child_records
FOR ALL
USING (false)
WITH CHECK (false);

-- 2. Create rate_limits table for tracking auth attempts
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  attempts integer NOT NULL DEFAULT 1,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_key ON public.rate_limits (key);
CREATE INDEX idx_rate_limits_last_attempt ON public.rate_limits (last_attempt_at);

-- Enable RLS - only service role should access this
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Block all direct access; only service_role (edge functions) can use this
CREATE POLICY "No direct public access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false)
WITH CHECK (false);
