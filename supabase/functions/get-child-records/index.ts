import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const requestSchema = z.object({
  email: z.string()
    .email({ message: "Format email tidak valid" })
    .max(255, { message: "Email terlalu panjang" }),
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(10000).optional().default(5000),
  fetchAll: z.boolean().optional().default(false),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
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
      const firstError = validationResult.error.errors[0]?.message || "Input tidak valid";
      return new Response(
        JSON.stringify({ error: firstError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, offset, limit, fetchAll } = validationResult.data;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user exists and is verified
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, verified')
      .eq('email', email.toLowerCase())
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

    // If fetchAll is true, get total count first then fetch all in parallel batches
    if (fetchAll) {
      const { count, error: countError } = await supabase
        .from('child_records')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error("Error getting count:", countError);
        return new Response(
          JSON.stringify({ error: "Gagal menghitung data", data: [] }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const totalCount = count || 0;
      const batchSize = 5000;
      const batches = Math.ceil(totalCount / batchSize);
      
      // Fetch all batches in parallel
      const batchPromises = [];
      for (let i = 0; i < batches; i++) {
        const batchOffset = i * batchSize;
        batchPromises.push(
          supabase
            .from('child_records')
            .select('*')
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
          allRecords.push(...result.data);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: allRecords,
          count: allRecords.length,
          total: totalCount,
          hasMore: false
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Standard paginated fetch
    const { data: records, error: recordsError } = await supabase
      .from('child_records')
      .select('*')
      .range(offset, offset + limit - 1);

    if (recordsError) {
      console.error("Error fetching child records:", recordsError);
      return new Response(
        JSON.stringify({ error: "Gagal mengambil data", data: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: records || [],
        count: records?.length || 0,
        offset,
        limit,
        hasMore: (records?.length || 0) === limit
      }),
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
