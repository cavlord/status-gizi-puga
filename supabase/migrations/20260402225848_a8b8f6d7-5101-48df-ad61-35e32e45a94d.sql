
-- Remove duplicates, keeping the one with the highest id
DELETE FROM public.child_records a
USING public.child_records b
WHERE a.nik = b.nik 
  AND a.tanggal_pengukuran = b.tanggal_pengukuran
  AND a.id < b.id;

-- Add unique constraint
ALTER TABLE public.child_records 
ADD CONSTRAINT child_records_nik_tanggal_unique UNIQUE (nik, tanggal_pengukuran);
