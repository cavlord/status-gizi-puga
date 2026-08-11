# Project Coding Rules (Non-Obvious Only)

- Use `safeStorage` from `@/lib/storage` — never `localStorage`/`sessionStorage` directly (Safari ITP workaround).
- Use `cn()` from `@/lib/utils` for all conditional className merging.
- `ChildRecord` keys use mixed-case with spaces (`'BB/U'`, `'Tgl Lahir'`) — do not rename or snake_case them; they are the canonical frontend shape.
- `DataContext` query key is `['sheetData', user?.email]` — when invalidating, use that exact key or all `sheetData` queries will be missed.
- All Edge Functions have `verify_jwt = false`; authentication is done manually in each function via `extractAuthPayload()` from `supabase/functions/_shared/jwt.ts`.
- New Edge Functions should import dependencies using the bare specifiers in `supabase/functions/deno.json`, not full `https://deno.land/...` URLs.
- Error and UI text is in **Indonesian (Bahasa Indonesia)** — keep all user-facing strings in Indonesian.
- `@typescript-eslint/no-unused-vars` is off — dead variables will not cause lint errors.
- All pages are lazy-loaded via `React.lazy` — keep page components as default exports.
- `queryClient` is exported from `src/App.tsx` (not from a separate file) — import it from there if needed outside React.
