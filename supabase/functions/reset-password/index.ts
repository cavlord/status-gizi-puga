import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return new Response(JSON.stringify({ error: "Email, OTP, dan password baru wajib diisi" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: "Password minimal 8 karakter" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: user } = await supabase
      .from("users")
      .select("id, otp, otp_expiry")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!user) {
      return new Response(JSON.stringify({ error: "Email tidak ditemukan" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user.otp || !user.otp_expiry) {
      return new Response(JSON.stringify({ error: "Tidak ada permintaan reset password aktif" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(user.otp_expiry) < new Date()) {
      // Clear expired OTP
      await supabase.from("users").update({ otp: null, otp_expiry: null }).eq("id", user.id);
      return new Response(JSON.stringify({ error: "Kode OTP sudah kedaluwarsa. Silakan minta kode baru." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user.otp !== otp) {
      return new Response(JSON.stringify({ error: "Kode OTP salah" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash new password and update, clear OTP
    const passwordHash = hashSync(newPassword);
    await supabase
      .from("users")
      .update({ password_hash: passwordHash, otp: null, otp_expiry: null })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ success: true, message: "Password berhasil direset" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Reset password error:", error);
    return new Response(JSON.stringify({ error: "Terjadi kesalahan" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
