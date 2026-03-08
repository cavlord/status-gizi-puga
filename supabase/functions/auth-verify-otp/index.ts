import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Data verifikasi tidak lengkap" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, otp, otp_expiry, email_verified, verified')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchError || !user) {
      return new Response(
        JSON.stringify({ error: "Email tidak ditemukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.email_verified) {
      return new Response(
        JSON.stringify({ error: "Email sudah terverifikasi. Silakan tunggu persetujuan admin." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry FIRST to avoid unnecessary bcrypt compare
    if (new Date() > new Date(user.otp_expiry)) {
      return new Response(
        JSON.stringify({ error: "Kode OTP sudah kadaluarsa. Silakan kirim ulang." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!compareSync(otp, user.otp)) {
      return new Response(
        JSON.stringify({ error: "Kode OTP salah" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only mark email as verified, NOT admin-approved
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        email_verified: true, 
        otp: null, 
        otp_expiry: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Gagal memverifikasi email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add default role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ user_id: user.id, role: 'user' });

    if (roleError) {
      console.log("Role insert info:", roleError.message);
    }

    console.log("Email verified for:", normalizedEmail, "- awaiting admin approval");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email berhasil diverifikasi! Menunggu persetujuan admin untuk akses dashboard." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan saat verifikasi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
