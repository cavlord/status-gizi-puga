# Fix: dashboard showing fewer records than uploaded

## What was asked
424 records uploaded for July but only 422 shown on dashboard. Same issue for other months.

## Root cause
`filterUnderFiveYears` in `src/lib/googleSheets.ts` used regex `(\d+)\s*[Tt]ahun` and returned `false` when no match was found. Babies under 1 year have age strings like `"8 Bulan - 5 Hari"` — no "Tahun" — so they were dropped entirely, even though age < 1 year is always < 5 years.

## Fix
Changed `if (!yearMatch) return false` → `if (!yearMatch) return true`. Records without a year component pass through as valid under-5 records.

## File changed
`src/lib/googleSheets.ts` — `filterUnderFiveYears()`
