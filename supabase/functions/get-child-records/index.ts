import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  email: z.string().email().max(255),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(10000).optional().default(5000),
  fetchAll: z.boolean().optional().default(false),
});

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatDateDDMMYYYY(dateStr: string | null): string {
  if (!dateStr) return "";
  // Handle M/D/YYYY format (from Excel/DB)
  const slashParts = dateStr.split("/");
  if (slashParts.length === 3) {
    const month = slashParts[0].padStart(2, "0");
    const day = slashParts[1].padStart(2, "0");
    const year = slashParts[2];
    return `${day}/${month}/${year}`;
  }
  // Handle YYYY-MM-DD format
  const dashParts = dateStr.split("-");
  if (dashParts.length === 3) {
    return `${dashParts[2]}/${dashParts[1]}/${dashParts[0]}`;
  }
  return dateStr;
}

function getMonthName(dateStr: string | null): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    return MONTH_NAMES[monthIndex] || "";
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error.errors[0]?.message || "Input tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, offset, limit, fetchAll } = validationResult.data;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, verified")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "User tidak ditemukan", data: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user.verified) {
      return new Response(
        JSON.stringify({ error: "User belum terverifikasi", data: [] }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query langsung dari 1 tabel child_records — tanpa join
    const selectQuery = `*`;

    // Transform flat record dengan format tanggal yang benar
    const transformRecord = (r: any) => {
      return {
        nik: r.nik || "",
        nama: r.nama || "",
        jenis_kelamin: r.jk || "",
        tgl_lahir: formatDateDDMMYYYY(r.tgl_lahir),
        bb_lahir: r.bb_lahir != null ? String(r.bb_lahir) : "",
        tb_lahir: r.tb_lahir != null ? String(r.tb_lahir) : "",
        nama_ortu: r.nama_ortu || "",
        provinsi: r.prov || "",
        kab_kota: r.kab_kota || "",
        kecamatan: r.kec || "",
        puskesmas: r.puskesmas || "",
        desa_kelurahan: r.desa_kel || "",
        posyandu: r.posyandu || "",
        rt: r.rt || "",
        rw: r.rw || "",
        alamat: r.alamat || "",
        status_anak: r.status || "",
        usia_saat_ukur: r.usia_saat_ukur || "",
        tgl_pengukuran: r.tanggal_pengukuran || "",
        bulan_pengukuran: r.bulan_pengukuran || "",
        berat_badan: r.berat != null ? String(r.berat) : "",
        tinggi_badan: r.tinggi != null ? String(r.tinggi) : "",
        cara_ukur: r.cara_ukur || "",
        lila: r.lila != null ? String(r.lila) : "",
        status_bbu: r.bb_u || "",
        zscore_bbu: r.zs_bb_u != null ? String(r.zs_bb_u) : "",
        status_tbu: r.tb_u || "",
        zscore_tbu: r.zs_tb_u != null ? String(r.zs_tb_u) : "",
        status_bbtb: r.bb_tb || "",
        zscore_bbtb: r.zs_bb_tb != null ? String(r.zs_bb_tb) : "",
        naik_bb: r.naik_berat_badan || "",
        pmt_diterima_kg: r.pmt_diterima != null ? String(r.pmt_diterima) : "",
        jml_vit_a: r.jml_vit_a != null ? String(r.jml_vit_a) : "",
        kpsp: r.kpsp || "",
        kia: r.kia || "",
        detail: r.detail_status || "",
        status_desa: r.status_desa || "",
      };
    };

    if (fetchAll) {
      const { count, error: countError } = await supabase
        .from("child_records")
        .select("*", { count: "exact", head: true });

      if (countError) {
        return new Response(
          JSON.stringify({ error: "Gagal menghitung data", data: [] }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalCount = count || 0;
      const batchSize = 1000;
      const batches = Math.ceil(totalCount / batchSize);

      const batchPromises = [];
      for (let i = 0; i < batches; i++) {
        const batchOffset = i * batchSize;
        batchPromises.push(
          supabase
            .from("child_records")
            .select(selectQuery)
            .range(batchOffset, batchOffset + batchSize - 1)
            .limit(batchSize)
        );
      }

      const results = await Promise.all(batchPromises);
      const allRecords: any[] = [];

      for (const result of results) {
        if (result.error) {
          console.error("Error fetching batch:", result.error);
          continue;
        }
        if (result.data) {
          allRecords.push(...result.data.map(transformRecord));
        }
      }

      return new Response(
        JSON.stringify({ success: true, data: allRecords, count: allRecords.length, total: totalCount, hasMore: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Standard paginated fetch
    const { data: records, error: recordsError } = await supabase
      .from("child_records")
      .select(selectQuery)
      .range(offset, offset + limit - 1);

    if (recordsError) {
      console.error("Error fetching child records:", recordsError);
      return new Response(
        JSON.stringify({ error: "Gagal mengambil data", data: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transformed = (records || []).map(transformRecord);

    return new Response(
      JSON.stringify({ success: true, data: transformed, count: transformed.length, offset, limit, hasMore: transformed.length === limit }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in get-child-records:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal", data: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
