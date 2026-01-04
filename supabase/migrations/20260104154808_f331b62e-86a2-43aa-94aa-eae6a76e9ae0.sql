-- Allow admins to read all users
CREATE POLICY "Admins can view all users"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update users (for OTP and verified status)
CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    AND user_roles.role = 'admin'
  )
);