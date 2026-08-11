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

## Path Alias
`@/` maps to `./src/`. Always use `@/` for imports within `src/`, never relative paths across directories.

## Auth Architecture (non-standard)
Auth is **custom JWT**, not Supabase's built-in auth. The frontend calls custom Edge Functions (`auth-login`, `auth-register`, `auth-verify-otp`, `auth-resend-otp`). Tokens are signed with `JWT_SECRET` env var (Edge Function side) and stored via `safeStorage` from `@/lib/storage` — never use `localStorage` directly.

- Auth state lives in `AuthContext` (`src/contexts/AuthContext.tsx`). Session is stored under keys `posyandu_auth` and `posyandu_token`.
- `isAuthenticated` requires both `user` AND `token` to be set simultaneously.
- All Edge Functions have `verify_jwt = false` in `supabase/config.toml` — JWT is verified manually using `extractAuthPayload()` from `supabase/functions/_shared/jwt.ts`.

## Data Flow
`DataContext` (`src/contexts/DataContext.tsx`) fetches all child records via Edge Function `get-child-records`. Query key is `['sheetData', user?.email]` — cache is invalidated on logout. Data is only fetched when `isAuthenticated && !!user?.email`.

The `ChildRecord` interface (in `src/lib/googleSheets.ts`) uses mixed-case keys with spaces (e.g., `'BB/U'`, `'Tgl Lahir'`, `'status tahun'`) — this is the canonical shape used throughout the frontend even though the backend uses snake_case columns.

## Storage
Always use `safeStorage` from `@/lib/storage` (not raw `localStorage`). It falls back to `sessionStorage` then in-memory for Safari ITP / private browsing.

## Supabase Client
`supabase` client from `@/integrations/supabase/client.ts` is auto-generated — do not edit it directly. Import it as `import { supabase } from "@/integrations/supabase/client"`.

## Edge Functions
- Located in `supabase/functions/<name>/index.ts`
- Shared utilities: `supabase/functions/_shared/` (cors headers, JWT sign/verify)
- Import map defined in `supabase/functions/deno.json` — use bare specifiers from there (`bcrypt`, `zod`, `@supabase/supabase-js`) instead of full URLs inside functions
- Functions that existed before `deno.json` (e.g., `auth-login`) still use direct `https://deno.land/...` imports — new functions should use the import map

## Validation
Form validation uses Zod schemas from `@/lib/validation`. Password requirements: min 12 chars, upper+lower+digit+special. Error messages are in Indonesian (Bahasa Indonesia).

## Styling
- `cn()` from `@/lib/utils` must be used for conditional class merging (wraps `clsx` + `tailwind-merge`).
- Custom Tailwind tokens: `font-sans` (Inter), `font-heading` (Poppins), `font-mono` (JetBrains Mono). Use semantic color tokens (`success`, `warning`, `info`) defined in `tailwind.config.ts` — they map to CSS variables.
- Dark mode via `class` strategy (toggled by `ThemeContext`).

## TypeScript
`strict: false` and `noImplicitAny: false` — type annotations are optional but preferred for interfaces. `@typescript-eslint/no-unused-vars` is turned off.

## UI Components
All UI primitives are in `src/components/ui/` (shadcn/ui). Do not import Radix directly — use the wrapped components from `src/components/ui/`.

## App Loading
The app shows `LoadingScreen` for up to 15 seconds (hard timeout) while data loads after login. Shortcutting this timer requires resolving both auth and data states.
