import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { extractAuthPayload } from "../_shared/jwt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const updateUserSchema = z.object({
  userId: z.string().regex(uuidRegex, { message: "Format userId tidak valid" }),
  action: z.enum(["generate_otp", "activate", "deactivate", "delete"], {
    errorMap: () => ({ message: "Action tidak valid" })
  }),
  otp: z.string().regex(/^\d{6}$/).optional(),
  otpExpiry: z.string().datetime().optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const payload = await extractAuthPayload(req);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error.errors[0]?.message || "Input tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, action, otp, otpExpiry } = validationResult.data;

    if (action === "generate_otp" && (!otp || !otpExpiry)) {
      return new Response(
        JSON.stringify({ error: "Action generate_otp membutuhkan otp dan otpExpiry" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requester is an admin using verified user ID from JWT
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", payload.sub)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Akses ditolak - bukan admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target user exists
    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "User target tidak ditemukan" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      if (targetUser.id === payload.sub) {
        return new Response(
          JSON.stringify({ error: "Tidak dapat menghapus akun sendiri" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("user_roles").delete().eq("user_id", userId);

      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Gagal menghapus user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "User berhasil dihapus" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case "generate_otp":
        updateData.otp = otp;
        updateData.otp_expiry = otpExpiry;
        break;
      case "activate":
        updateData.verified = true;
        break;
      case "deactivate":
        updateData.verified = false;
        break;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Gagal mengupdate user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: `User berhasil di-${action}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in admin-update-user:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
