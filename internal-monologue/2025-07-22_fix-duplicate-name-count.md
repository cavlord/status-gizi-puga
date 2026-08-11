# Fix: 2 missing records in monthly chart counts

## What was asked
424 records in July Google Sheet but only 422 shown in dashboard chart tooltip.

## Root cause
All counting functions (`getNutritionalStatusByMonth`, `getPosyanduData`, `countByVillage`, `VillageNutritionalStatus` village pie, `getLatestRecords`) deduped by `record.Nama` (child name). Two children shared a name with another child in the same month → counted as one → 2 missing.

## Fix
Changed all deduplication keys from `record.Nama` to `record.NIK?.trim() || record.Nama` in:
- `src/lib/googleSheets.ts` — `getNutritionalStatusByMonth`, `getPosyanduData`, `countByVillage`
- `src/pages/Dashboard.tsx` — `getLatestRecords`
- `src/components/VillageNutritionalStatus.tsx` — village pie chart count

NIK is the unique child identifier. Fallback to name handles any records with missing NIK.
