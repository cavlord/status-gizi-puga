# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack
React 18 + TypeScript (strict: false) + Vite (SWC) + Tailwind CSS + shadcn/ui + TanStack Query v5. Backend is Supabase Edge Functions (Deno). No test framework is configured.

## Commands
```
npm run dev       # dev server on port 8080 (host "::" — binds all interfaces)
npm run build     # production build
npm run lint      # eslint
```
There is no test command — no testing framework is set up.

## Deploying Edge Functions
```
npx supabase functions deploy <function-name>
npx supabase migration up --linked --yes   # apply new migrations
```
Project ref: `qdzuttcptvrtiftjmcbr` (linked). Docker not required for deploy.

## Path Alias
`@/` maps to `./src/`. Always use `@/` for imports within `src/`, never relative paths across directories.

## Auth Architecture (non-standard)
Auth is **custom JWT**, not Supabase's built-in auth. The frontend calls custom Edge Functions (`auth-login`, `auth-register`, `auth-verify-otp`, `auth-resend-otp`). Tokens are signed with `JWT_SECRET` env var (Edge Function side) and stored via `safeStorage` from `@/lib/storage` — never use `localStorage` directly.

- Auth state lives in `AuthContext` (`src/contexts/AuthContext.tsx`). Session is stored under keys `posyandu_auth` and `posyandu_token`.
- `isAuthenticated` requires both `user` AND `token` to be set simultaneously.
- All Edge Functions have `verify_jwt = false` in `supabase/config.toml` — JWT is verified manually using `extractAuthPayload()` from `supabase/functions/_shared/jwt.ts`.
- Auth-endpoint calls use `VITE_SUPABASE_PUBLISHABLE_KEY` as the Authorization Bearer (not the user's JWT). Protected endpoints use the user's JWT.

## Data Flow
`DataContext` (`src/contexts/DataContext.tsx`) fetches all child records via Edge Function `get-child-records`. Query key is `['sheetData', user?.email]` — cache is invalidated on logout. Data is only fetched when `isAuthenticated && !!user?.email`.

The `ChildRecord` interface (in `src/lib/googleSheets.ts`) uses mixed-case keys with spaces (e.g., `'BB/U'`, `'Tgl Lahir'`, `'status tahun'`) — this is the canonical shape used throughout the frontend even though the backend uses snake_case columns.

## DB Schema Gotchas
- `child_records.nik`, `bb_lahir`, `berat`, `lila`, `zs_bb_u`, `zs_tb_u`, `zs_bb_tb`, `jml_vit_a` are **bigint** in the live DB (despite migration saying TEXT — the schema was manually altered). Google Sheets returns these as `"76.9"` or `"1.65E+15"` — use `toIntString()` in `import-from-sheets` before insert.
- `child_records.id` is `integer` (serial), not UUID — the migration says UUID but it was manually changed.
- `child_records_nik_tanggal_unique` constraint on `(nik, tanggal_pengukuran)` exists, but PostgreSQL's `NULL != NULL` means rows where `tanggal_pengukuran` is null are not matched. Import uses `truncate_child_records()` RPC + fresh insert to avoid this.
- All direct public access to `child_records` is blocked by RLS (`USING (false)`). Only `service_role` (used by Edge Functions) can read/write.

## Import Strategy
`import-from-sheets` does a **full replace**: calls `supabase.rpc('truncate_child_records')` (SECURITY DEFINER function that runs `TRUNCATE ... RESTART IDENTITY`), then batch-inserts all records. Never use `upsert` with `onConflict` on this table.

## Storage
Always use `safeStorage` from `@/lib/storage` (not raw `localStorage`). It falls back to `sessionStorage` then in-memory for Safari ITP / private browsing.

## Supabase Client
`supabase` client from `@/integrations/supabase/client.ts` is auto-generated — do not edit it directly. Import it as `import { supabase } from "@/integrations/supabase/client"`.

## Edge Functions
- Located in `supabase/functions/<name>/index.ts`
- Shared utilities: `supabase/functions/_shared/` (JWT sign/verify)
- No `deno.json` import map — functions use direct `https://deno.land/...` and `https://esm.sh/...` import URLs
- `JWT_SECRET` env var is required in all functions that call `extractAuthPayload()`

## Validation
Form validation uses Zod schemas from `@/lib/validation`. Password requirements: min 12 chars, upper+lower+digit+special. Error messages are in **Indonesian (Bahasa Indonesia)**.

## Styling
- `cn()` from `@/lib/utils` must be used for conditional class merging (wraps `clsx` + `tailwind-merge`).
- Dark mode via `class` strategy (toggled by `ThemeContext`).
- Do not import Radix directly — use the wrapped components from `src/components/ui/`.

## TypeScript
`strict: false` and `noImplicitAny: false` — type annotations are optional but preferred for interfaces. `@typescript-eslint/no-unused-vars` is turned off.

## App Loading
The app shows `LoadingScreen` for up to 15 seconds (hard timeout) while data loads after login. Shortcutting this timer requires resolving both auth and data states.

## All Pages Are Lazy-Loaded
All page components in `src/pages/` are loaded via `React.lazy` — keep page components as default exports.

## queryClient Location
`queryClient` is exported from `src/App.tsx` (not from a separate file) — import it from there if needed outside React.

## User-Facing Language
All UI strings and error messages must be in **Indonesian (Bahasa Indonesia)**.
