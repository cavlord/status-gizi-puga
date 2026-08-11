# Fix: duplicate key on insert, migration history out of sync

## What was asked
Import showed "11300 berhasil, 4 batch gagal. Error: duplicate key value violates unique constraint child_records_nik_tanggal_unique" — the delete-all before insert was silently failing.

## Root causes
1. `.delete().gte('id', 0)` is unreliable as a "delete all" in PostgREST — it ran but apparently didn't complete before the inserts started, OR partial inserts from a previous run left rows that conflicted.
2. `supabase/config.toml` had wrong `project_id` (`ystpkgdmhraxpyaumoug`) — corrected to `qdzuttcptvrtiftjmcbr`.
3. Remote migration history table was completely empty (never populated) — all local migrations showed as unapplied, causing `db push` to fail trying to re-apply existing schema.

## What was changed
- New migration `20260722080000_truncate_child_records_rpc.sql` — creates `public.truncate_child_records()` SECURITY DEFINER function that runs `TRUNCATE TABLE child_records RESTART IDENTITY`
- `import-from-sheets/index.ts` — replaced `.delete().gte('id', 0)` with `supabase.rpc('truncate_child_records')` for reliable full table clear before re-insert
- Ran `supabase migration repair --status applied` for all 12 existing migrations to fix history table
- Applied new migration via `supabase migration up --linked`
- Redeployed `import-from-sheets` function

## Non-obvious decisions
- TRUNCATE is safer than DELETE here: it acquires an ACCESS EXCLUSIVE lock ensuring all rows are gone before the transaction commits, while DELETE can be interleaved with concurrent inserts in theory.
- SECURITY DEFINER allows the function to bypass RLS and truncate even if RLS policies would otherwise block DELETE.
- REVOKE + GRANT ensures only service_role (used by Edge Functions) can call this, not anon/authenticated.
