# Fix: bigint parse error on NIK "76.9", 1 batch gagal

## What was asked
Import showed "11593 berhasil, 1 batch gagal. Error: invalid input syntax for type bigint: '76.9'".

## Root cause
The `nik` column in the DB was manually altered to `bigint` (outside migrations). Google Sheets returns large integers in decimal notation (`"76.9"`, `"1.65321E+15"`) when cells are formatted as numbers. The raw string is passed directly to Postgres which rejects `"76.9"` as an invalid bigint.

## Fix
Added `cleanNumericString()` in `import-from-sheets/index.ts`:
- Scientific notation (`1.65321E+15`) → `Math.round(Number(...))` → full integer string
- Decimal notation (`76.9`) → truncate at decimal point → `"76"`
- Plain integers pass through unchanged

Applied only to the `nik` field in `toDbRecord()` since that's the bigint column.

## Deployed
- `import-from-sheets` redeployed
- `get-child-records` redeployed (already had ORDER BY fix from previous session)
