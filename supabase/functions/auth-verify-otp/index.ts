import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

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
    const { email, otp, token } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Data verifikasi tidak lengkap" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user in database
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, otp, otp_expiry, verified')
      .eq('email', email)
      .maybeSingle();

    if (fetchError || !user) {
      console.error("User fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Email tidak ditemukan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.verified) {
      return new Response(
        JSON.stringify({ error: "Email sudah terverifikasi. Silakan login." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP
    if (user.otp !== otp) {
      return new Response(
        JSON.stringify({ error: "Kode OTP salah" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date() > new Date(user.otp_expiry)) {
      return new Response(
        JSON.stringify({ error: "Kode OTP sudah kadaluarsa. Silakan daftar ulang." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark user as verified
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        verified: true, 
        otp: null, 
        otp_expiry: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Gagal memverifikasi email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add default role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'user'
      });

    if (roleError) {
      console.log("Role insert info:", roleError.message);
      // Don't fail if role already exists
    }

    console.log("User verified and registered:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email berhasil diverifikasi! Silakan login." 
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