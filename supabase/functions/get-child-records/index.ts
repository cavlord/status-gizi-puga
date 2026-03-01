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
  // dateStr is YYYY-MM-DD from postgres date type
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

    // Fetch child_records joined with anak via nik
    const selectQuery = `
      id, nik, usia_saat_ukur, tgl_pengukuran, bulan_pengukuran,
      berat_badan, tinggi_badan, cara_ukur, lila,
      status_bbu, zscore_bbu, status_tbu, zscore_tbu,
      status_bbtb, zscore_bbtb, naik_bb, pmt_diterima_kg,
      jml_vit_a, kpsp, kia, detail, status_desa,
      anak!pengukuran_gizi_nik_fkey (
        nama, jenis_kelamin, tgl_lahir, bb_lahir, tb_lahir,
        nama_ortu, provinsi, kab_kota, kecamatan, puskesmas,
        desa_kelurahan, posyandu, rt, rw, alamat, status
      )
    `;

    // Transform a joined record into a flat object with proper date formats
    const transformRecord = (r: any) => {
      const anak = r.anak || {};
      return {
        nik: r.nik || "",
        nama: anak.nama || "",
        jenis_kelamin: anak.jenis_kelamin || "",
        tgl_lahir: formatDateDDMMYYYY(anak.tgl_lahir),
        bb_lahir: anak.bb_lahir != null ? String(anak.bb_lahir) : "",
        tb_lahir: anak.tb_lahir != null ? String(anak.tb_lahir) : "",
        nama_ortu: anak.nama_ortu || "",
        provinsi: anak.provinsi || "",
        kab_kota: anak.kab_kota || "",
        kecamatan: anak.kecamatan || "",
        puskesmas: anak.puskesmas || "",
        desa_kelurahan: anak.desa_kelurahan || "",
        posyandu: anak.posyandu || "",
        rt: anak.rt || "",
        rw: anak.rw || "",
        alamat: anak.alamat || "",
        status_anak: anak.status || "",
        usia_saat_ukur: r.usia_saat_ukur || "",
        tgl_pengukuran: formatDateDDMMYYYY(r.tgl_pengukuran),
        bulan_pengukuran: getMonthName(r.bulan_pengukuran),
        berat_badan: r.berat_badan != null ? String(r.berat_badan) : "",
        tinggi_badan: r.tinggi_badan != null ? String(r.tinggi_badan) : "",
        cara_ukur: r.cara_ukur || "",
        lila: r.lila != null ? String(r.lila) : "",
        status_bbu: r.status_bbu || "",
        zscore_bbu: r.zscore_bbu != null ? String(r.zscore_bbu) : "",
        status_tbu: r.status_tbu || "",
        zscore_tbu: r.zscore_tbu != null ? String(r.zscore_tbu) : "",
        status_bbtb: r.status_bbtb || "",
        zscore_bbtb: r.zscore_bbtb != null ? String(r.zscore_bbtb) : "",
        naik_bb: r.naik_bb || "",
        pmt_diterima_kg: r.pmt_diterima_kg != null ? String(r.pmt_diterima_kg) : "",
        jml_vit_a: r.jml_vit_a != null ? String(r.jml_vit_a) : "",
        kpsp: r.kpsp || "",
        kia: r.kia || "",
        detail: r.detail || "",
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
      const batchSize = 5000;
      const batches = Math.ceil(totalCount / batchSize);

      const batchPromises = [];
      for (let i = 0; i < batches; i++) {
        const batchOffset = i * batchSize;
        batchPromises.push(
          supabase
            .from("child_records")
            .select(selectQuery)
            .range(batchOffset, batchOffset + batchSize - 1)
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
