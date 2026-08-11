# Project Coding Rules (Non-Obvious Only)

- Use `safeStorage` from `@/lib/storage` — never `localStorage`/`sessionStorage` directly (Safari ITP workaround).
- Use `cn()` from `@/lib/utils` for all conditional className merging.
- `ChildRecord` keys use mixed-case with spaces (`'BB/U'`, `'Tgl Lahir'`, `'status tahun'`) — do not rename or snake_case them; they are the canonical frontend shape.
- `DataContext` query key is `['sheetData', user?.email]` — when invalidating, use that exact key or all `sheetData` queries will be missed.
- All Edge Functions have `verify_jwt = false`; authentication is done manually in each function via `extractAuthPayload()` from `supabase/functions/_shared/jwt.ts`.
- New Edge Functions should use direct `https://deno.land/...` / `https://esm.sh/...` URLs — there is no `deno.json` import map in this project.
- Edge Function `import-from-sheets` must call `supabase.rpc('truncate_child_records')` before inserting — never upsert with `onConflict` on `child_records` (nullable bigint columns break the unique constraint matching).
- `child_records` bigint columns (`nik`, `bb_lahir`, `berat`, `lila`, `zs_bb_u`, `zs_tb_u`, `zs_bb_tb`, `jml_vit_a`) receive decimal strings from Google Sheets — sanitize with `toIntString()` before insert.
- Error and UI text is in **Indonesian (Bahasa Indonesia)** — keep all user-facing strings in Indonesian.
- `@typescript-eslint/no-unused-vars` is off — dead variables will not cause lint errors.
- All pages are lazy-loaded via `React.lazy` — keep page components as default exports.
- `queryClient` is exported from `src/App.tsx` (not from a separate file) — import it from there if needed outside React.
- Auth-endpoint calls (`auth-login`, `auth-register`, etc.) pass `VITE_SUPABASE_PUBLISHABLE_KEY` as Bearer token; all other protected endpoints pass the user's JWT from `posyandu_token`.
- Deploy Edge Functions with `npx supabase functions deploy <name>` (Docker not required). Apply migrations with `npx supabase migration up --linked --yes`.
