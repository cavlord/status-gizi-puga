# Project Architecture Rules (Non-Obvious Only)

- Auth is fully custom JWT (not Supabase Auth). Adding any feature that touches auth must use `AuthContext` and the custom Edge Functions — do not introduce `supabase.auth.*`.
- All child record data flows through a single global TanStack Query cache keyed by `['sheetData', user?.email]`. There is no per-page or per-component fetching — plan features accordingly.
- `ChildRecord` shape (mixed-case, space-delimited keys) is the frontend contract. The DB uses snake_case. The mapping layer is `mapDbToRecord()` in `src/lib/googleSheets.ts` and `transformRecord()` in the `get-child-records` Edge Function — changes to DB columns require updates in both places.
- Edge Functions all have `verify_jwt = false` — Supabase's automatic JWT verification is disabled project-wide. Any protected function must call `extractAuthPayload()` manually.
- Context provider nesting order in `App.tsx` is load-bearing: `QueryClientProvider > ThemeProvider > AuthProvider > DataProvider`. `DataProvider` depends on `AuthProvider`; changing the order breaks auth-gated data fetching.
- No test infrastructure exists. When planning features, do not assume tests can be run to verify correctness.
- Google Sheets integration is import-only (one-way Sheets → Supabase), not a live data source. The `VITE_SPREADSHEET_ID` env var drives the `import-from-sheets` function.
