# Fix: Import still broken after code changes

## What was asked
User said nothing changed — import still showing 0 records upserted, 117 batch gagal. Previous code fixes had not been deployed.

## Root causes found
1. **Wrong project ref** — `supabase/config.toml` had `project_id = "ystpkgdmhraxpyaumoug"` which is not an active project. Real ref is `qdzuttcptvrtiftjmcbr` (from `VITE_SUPABASE_PROJECT_ID` in `.env`).
2. **Edge Functions never deployed** — All prior code edits only changed local files. Supabase Edge Functions run in the cloud and need explicit `supabase functions deploy` to take effect.
3. **Duplicate code in import-from-sheets** — The file had been externally modified to contain two full copies of the function (534 lines). Fixed by rewriting the file clean (196 lines).

## What was changed
- `supabase/config.toml` — corrected `project_id` to `qdzuttcptvrtiftjmcbr`
- Ran `npx supabase link --project-ref qdzuttcptvrtiftjmcbr`
- Deployed `import-from-sheets` and `get-child-records` to Supabase

## Key fixes now live
- `import-from-sheets`: delete-all + batch insert instead of broken upsert with nullable onConflict
- `get-child-records`: `.order("id")` on all paged queries to prevent overlapping/missing rows
