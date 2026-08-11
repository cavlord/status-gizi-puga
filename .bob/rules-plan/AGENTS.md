# Project Architecture Rules (Non-Obvious Only)

- Auth is entirely custom — no Supabase Auth. JWTs are signed with `JWT_SECRET` env var in Edge Functions and verified manually via Web Crypto API (`supabase/functions/_shared/jwt.ts`). There is no refresh token mechanism; tokens expire after 24 hours.
- `child_records` has a unique constraint `child_records_nik_tanggal_unique` on `(nik, tanggal_pengukuran)`, but because `tanggal_pengukuran` is nullable and PostgreSQL treats `NULL != NULL`, any upsert using `onConflict` will fail for null-date rows. The import strategy must always be truncate + insert, never upsert.
- `DataContext` is deliberately `staleTime: 0` + `refetchOnMount: true` — data is always re-fetched on mount. This is intentional to show fresh import results without manual refresh.
- The `LoadingScreen` has a 15-second hard timeout to prevent infinite loading on mobile. Resolving it early requires both `isAuthenticated` and `!dataLoading` to be true simultaneously.
- `countByVillage`, `getNutritionalStatusByMonth`, `getPosyanduData` all deduplicate by `record.Nama` (child name) using Sets — they count unique children, not measurement rows. This is intentional (a child measured multiple times counts once).
- `filterUnderFiveYears` parses `'Usia Saat Ukur'` string with a regex — records with no "Tahun" (babies < 1 year, e.g. `"8 Bulan - 5 Hari"`) are **included** (age < 1 yr is always < 5 yrs). Only records explicitly showing `≥ 5 Tahun` are excluded.
- `Tanggal Pengukuran` in `ChildRecord` is always `DD/MM/YYYY` format (converted by `get-child-records` Edge Function). Date parsing in Dashboard.tsx splits on `/` and reads `[0]=day, [1]=month, [2]=year`.
- The Supabase project was set up with a new project (`qdzuttcptvrtiftjmcbr`) replacing an older one — migration history table on remote was empty. Always run `npx supabase migration repair --status applied <id>` before `migration up` if the remote history table is out of sync.
