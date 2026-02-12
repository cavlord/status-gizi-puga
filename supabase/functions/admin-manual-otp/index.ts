import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { adminEmail, targetEmail } = await req.json();

    if (!adminEmail || !targetEmail) {
      return new Response(
        JSON.stringify({ error: "Admin email dan target email wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin status server-side
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, verified')
      .eq('email', adminEmail)
      .maybeSingle();

    if (adminError || !adminUser || !adminUser.verified) {
      return new Response(
        JSON.stringify({ error: "Admin tidak valid" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Akses ditolak. Hanya admin yang dapat membuat OTP." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check target user
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, email, verified')
      .eq('email', targetEmail)
      .maybeSingle();

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "Email tidak ditemukan. User harus mendaftar terlebih dahulu." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetUser.verified) {
      return new Response(
        JSON.stringify({ error: "Email sudah terverifikasi", alreadyVerified: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('users')
      .update({
        otp,
        otp_expiry: otpExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Gagal menyimpan OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, otp }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Admin manual OTP error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
