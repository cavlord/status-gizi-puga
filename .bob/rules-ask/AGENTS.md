# Project Documentation Context (Non-Obvious Only)

- The `child_records` DB schema in `supabase/migrations/` says all columns are `TEXT` and `id` is UUID — the live DB was manually altered: `id` is now `integer` (serial) and several columns are `bigint`. The types.ts file reflects the live schema accurately.
- `src/lib/googleSheets.ts` is misleadingly named — it does **not** call Google Sheets API directly. It calls the Supabase Edge Function `get-child-records` which reads from the DB. Only `import-from-sheets` Edge Function talks to Google Sheets API.
- The `mapDbToRecord` function in `src/lib/googleSheets.ts` maps snake_case DB column names (from `get-child-records`) back to the mixed-case `ChildRecord` shape used throughout the frontend.
- `supabase/config.toml` had the wrong project ref (`ystpkgdmhraxpyaumoug`) for a long time — the correct ref is `qdzuttcptvrtiftjmcbr` and is now fixed.
- All `child_records` access is RLS-blocked for direct clients (`USING (false)`). All reads/writes go through Edge Functions with `service_role` key.
- `VillageNutritionalStatus` component uses `yearData` for the village distribution pie and `monthData` (most recent month only) for the nutritional status pie — these are two separate filtered datasets passed from Dashboard.
- The import system does a **full table replace** on every run (truncate + insert), not an incremental sync.
