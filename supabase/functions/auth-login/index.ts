import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { signJwt } from "../_shared/jwt.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting config: max 5 attempts per 15-minute window
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

async function checkRateLimit(supabase: any, key: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("rate_limits")
    .select("attempts, first_attempt_at")
    .eq("key", key)
    .gte("first_attempt_at", windowStart)
    .maybeSingle();

  if (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true };
  }

  if (!data) return { allowed: true };

  if (data.attempts >= RATE_LIMIT_MAX) {
    const firstAttempt = new Date(data.first_attempt_at).getTime();
    const windowEnd = firstAttempt + RATE_LIMIT_WINDOW_MS;
    const retryAfterSeconds = Math.ceil((windowEnd - Date.now()) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
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
    await supabase
      .from("rate_limits")
      .update({ attempts: existing.attempts + 1, last_attempt_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("rate_limits")
      .insert({ key, attempts: 1, first_attempt_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() });
  }
}

async function clearAttempts(supabase: any, key: string): Promise<void> {
  await supabase.from("rate_limits").delete().eq("key", key);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email dan password wajib diisi" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimitKey = `login:${email.toLowerCase()}`;
    const rateCheck = await checkRateLimit(supabase, rateLimitKey);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Terlalu banyak percobaan login. Coba lagi dalam ${rateCheck.retryAfterSeconds} detik.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, password_hash, verified, email_verified')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      return new Response(JSON.stringify({ error: "Gagal mengakses data. Silakan coba lagi." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user) {
      await recordAttempt(supabase, rateLimitKey);
      return new Response(JSON.stringify({ error: "Email atau password salah" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user.email_verified) {
      return new Response(
        JSON.stringify({ error: "Email belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user.verified) {
      return new Response(
        JSON.stringify({ error: "Akun Anda belum disetujui oleh admin. Silakan hubungi admin untuk aktivasi." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValidPassword = compareSync(password, user.password_hash);

    if (!isValidPassword) {
      await recordAttempt(supabase, rateLimitKey);
      return new Response(JSON.stringify({ error: "Email atau password salah" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await clearAttempts(supabase, rateLimitKey);

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = userRole?.role || 'user';

    // Generate JWT token
    const token = await signJwt(
      { sub: user.id, email: user.email, role },
      SUPABASE_SERVICE_ROLE_KEY,
      24 * 60 * 60 // 24 hours
    );

    console.log("User logged in successfully:", email);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role,
          verified: user.verified,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Terjadi kesalahan saat login" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
