-- Create table for child health records
CREATE TABLE public.child_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nik TEXT NOT NULL,
  nama TEXT NOT NULL,
  jk TEXT,
  tgl_lahir TEXT,
  bb_lahir TEXT,
  tb_lahir TEXT,
  nama_ortu TEXT,
  prov TEXT,
  kab_kota TEXT,
  kec TEXT,
  puskesmas TEXT,
  desa_kel TEXT,
  posyandu TEXT,
  rt TEXT,
  rw TEXT,
  alamat TEXT,
  usia_saat_ukur TEXT,
  tanggal_pengukuran TEXT,
  bulan_pengukuran TEXT,
  status_bulan TEXT,
  status_tahun TEXT,
  berat TEXT,
  tinggi TEXT,
  cara_ukur TEXT,
  lila TEXT,
  bb_u TEXT,
  zs_bb_u TEXT,
  tb_u TEXT,
  zs_tb_u TEXT,
  bb_tb TEXT,
  zs_bb_tb TEXT,
  naik_berat_badan TEXT,
  pmt_diterima TEXT,
  jml_vit_a TEXT,
  kpsp TEXT,
  kia TEXT,
  detail_status TEXT,
  status_desa TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.child_records ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read all records
CREATE POLICY "Authenticated users can view records" 
ON public.child_records 
FOR SELECT 
TO authenticated
USING (true);

-- Create policy for service role full access (for imports)
CREATE POLICY "Service role full access" 
ON public.child_records 
FOR ALL 
USING (((current_setting('request.jwt.claims'::text, true))::json ->> 'role'::text) = 'service_role'::text);

-- Create index for common queries
CREATE INDEX idx_child_records_desa ON public.child_records (desa_kel);
CREATE INDEX idx_child_records_posyandu ON public.child_records (posyandu);
CREATE INDEX idx_child_records_tanggal ON public.child_records (tanggal_pengukuran);
CREATE INDEX idx_child_records_bulan ON public.child_records (bulan_pengukuran);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_child_records_updated_at
BEFORE UPDATE ON public.child_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();