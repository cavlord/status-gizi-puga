# Project Documentation Context (Non-Obvious Only)

- Despite the file being named `googleSheets.ts`, the actual data source is the Supabase `child_records` table via the `get-child-records` Edge Function. Google Sheets import is a separate one-way sync operation (`import-from-sheets`).
- Auth does NOT use Supabase Auth (no `supabase.auth.*` calls on the frontend). It is a fully custom JWT flow against custom Edge Functions.
- `src/integrations/supabase/types.ts` is auto-generated from the Supabase schema — it documents the actual DB column names (snake_case), which differ from the `ChildRecord` interface in `src/lib/googleSheets.ts` (mixed-case with spaces).
- The `supabase` client instance from `@/integrations/supabase/client` is used only for direct table queries in admin functions; regular data fetching bypasses it and calls Edge Functions directly via `fetch`.
- Rate limiting is implemented inside the `auth-login` Edge Function using a `rate_limits` Supabase table (5 attempts per 15-minute window).
- The loading screen has a 15-second hard cap to prevent infinite loading on mobile — it is intentional, not a bug.
