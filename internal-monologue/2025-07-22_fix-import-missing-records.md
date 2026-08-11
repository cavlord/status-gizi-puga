# Fix: 424 records uploaded but only 292 shown

## What was asked
User reported importing 424 records from Google Sheets but only 292 appearing in the dashboard. Screenshot showed "Import Berhasil" toast with message: `Berhasil sinkronisasi: 0 record diperbarui/ditambahkan, 0 record dihapus. Total baris sheet: 12704, dilewati (NIK kosong: 1000, Nama kosong: 0, duplikat: 11), 117 batch gagal`.

## Root Causes Found

### Bug 1 — All 117 upsert batches failing
`import-from-sheets/index.ts` used `upsert` with `onConflict: 'nik,tanggal_pengukuran'`. PostgreSQL's `UNIQUE` constraint on nullable columns treats every NULL as distinct, so rows with `tanggal_pengukuran = NULL` cannot be matched for conflict resolution — PostgREST rejects the entire batch. With ~11,700 valid rows / 100 per batch = 117 batches all failing, 0 records were inserted.

**Fix**: Replaced `upsert` strategy with **delete-all then batch-insert**. The full sync deletes all existing rows with `.delete().gte('id', 0)`, then inserts the sheet data in batches. This is safe since import is always a complete replacement.

### Bug 2 — Only 292/424 shown in frontend
`get-child-records/index.ts` fetched all records using parallel `.range()` batches without `.order('id')`. Without a stable sort order, PostgreSQL can return different rows across pages — causing overlapping or missing records. Also had a redundant `.limit(batchSize)` after `.range()` which was dropped.

**Fix**: Added `.order("id", { ascending: true })` to every batch query in the `fetchAll` path.

### Bug 3 — Success toast shown when all batches failed
The function always returned `{ success: true }` regardless of errors. The error-path message template (`errors batch gagal`) was being returned with `success: true`, so the frontend showed it under the "Import Berhasil" green toast.

**Fix**: `success` in the response is now `!allFailed`. Also split message into three cases: all failed / partial / full success.

## Files Changed
- `supabase/functions/import-from-sheets/index.ts` — replaced upsert with delete-all + insert; fixed response success flag; improved error messages
- `supabase/functions/get-child-records/index.ts` — added `.order("id")` to parallel batch queries; removed redundant `.limit()`

## Non-obvious decisions
- Used `.delete().gte('id', 0)` to delete all rows via PostgREST (no direct TRUNCATE via JS client). This requires the service role key which is already in use.
- Removed the `fetchAllExistingRecords` helper entirely since the delete-sync step was eliminated.
