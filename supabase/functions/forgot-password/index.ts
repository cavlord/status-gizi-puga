import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

async function checkRateLimit(supabase: any, key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("rate_limits")
    .select("attempts, first_attempt_at")
    .eq("key", key)
    .gte("first_attempt_at", windowStart)
    .maybeSingle();

  if (!data) return { allowed: true };
  if (data.attempts >= RATE_LIMIT_MAX) {
    const windowEnd = new Date(data.first_attempt_at).getTime() + RATE_LIMIT_WINDOW_MS;
    return { allowed: false, retryAfterSeconds: Math.max(Math.ceil((windowEnd - Date.now()) / 1000), 1) };
  }
  return { allowed: true };
}

async function recordAttempt(supabase: any, key: string): Promise<void> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  await supabase.from("rate_limits").delete().eq("key", key).lt("first_attempt_at", windowStart);
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, attempts")
    .eq("key", key)
    .gte("first_attempt_at", windowStart)
    .maybeSingle();

  if (existing) {
    await supabase.from("rate_limits").update({ attempts: existing.attempts + 1, last_attempt_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("rate_limits").insert({ key, attempts: 1, first_attempt_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email wajib diisi" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Rate limit
    const rateLimitKey = `forgot:${email.toLowerCase()}`;
    const rateCheck = await checkRateLimit(supabase, rateLimitKey);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Terlalu banyak percobaan. Coba lagi dalam ${rateCheck.retryAfterSeconds} detik.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user exists
    const { data: user } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!user) {
      await recordAttempt(supabase, rateLimitKey);
      return new Response(
        JSON.stringify({ error: "Akun dengan email tersebut tidak ditemukan." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store OTP in users table
    await supabase
      .from("users")
      .update({ otp, otp_expiry: otpExpiry })
      .eq("id", user.id);

    // Send OTP via send-otp function
    const sendOtpResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ email: user.email, otp }),
    });

    if (!sendOtpResponse.ok) {
      console.error("Failed to send OTP email");
      return new Response(
        JSON.stringify({ error: "Gagal mengirim email OTP. Silakan coba lagi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordAttempt(supabase, rateLimitKey);

    return new Response(
      JSON.stringify({ success: true, message: "Kode OTP telah dikirim ke email Anda." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return new Response(JSON.stringify({ error: "Terjadi kesalahan" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
