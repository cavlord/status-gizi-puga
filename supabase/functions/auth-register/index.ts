import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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
  const { data, error } = await supabase
    .from("rate_limits")
    .select("attempts, first_attempt_at")
    .eq("key", key)
    .gte("first_attempt_at", windowStart)
    .maybeSingle();

  if (error) return { allowed: true };
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

const registerSchema = z.object({
  email: z.string()
    .email({ message: "Format email tidak valid" })
    .max(255, { message: "Email terlalu panjang (maksimal 255 karakter)" })
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, { message: "Password minimal 8 karakter" })
    .max(128, { message: "Password terlalu panjang (maksimal 128 karakter)" })
});

function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = (array[0] % 900000) + 100000;
  return otp.toString();
}

async function sendOTPEmailBrevo(email: string, otp: string): Promise<void> {
  const BREVO_API_KEY = Deno.env.get("BREVO_SMTP_PASS")!;
  const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SMTP_USER")!;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e293b; margin: 0;">Verifikasi Email</h2>
        <p style="color: #64748b; font-size: 14px;">GiziXDihatiKampar</p>
      </div>
      <p style="color: #334155; font-size: 14px;">Berikut adalah kode OTP untuk memverifikasi email Anda:</p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a; background: #f1f5f9; padding: 16px 32px; border-radius: 8px; border: 2px dashed #cbd5e1;">${otp}</span>
      </div>
      <p style="color: #ef4444; font-size: 13px; text-align: center; font-weight: 600;">Kode ini berlaku selama 5 menit.</p>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">Jika Anda tidak melakukan registrasi, abaikan email ini.</p>
    </div>
  `;

  const apiResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "GiziXDihatiKampar", email: BREVO_SENDER_EMAIL },
      to: [{ email }],
      subject: "Kode Verifikasi Registrasi - GiziXDihatiKampar",
      htmlContent,
    }),
  });

  if (!apiResponse.ok) {
    const responseText = await apiResponse.text();
    console.error("Brevo API error:", responseText);
    throw new Error(`Gagal mengirim email verifikasi`);
  }

  console.log("OTP Email sent successfully via Brevo");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || "Input tidak valid";
      return new Response(
        JSON.stringify({ error: firstError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, password } = validationResult.data;

    const rateLimitKey = `register:${email}`;
    const rateCheck = await checkRateLimit(supabase, rateLimitKey);
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: `Terlalu banyak percobaan registrasi. Coba lagi dalam ${rateCheck.retryAfterSeconds} detik.` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordAttempt(supabase, rateLimitKey);

    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email_verified, verified')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      return new Response(
        JSON.stringify({ error: "Gagal memeriksa email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingUser && existingUser.email_verified) {
      return new Response(
        JSON.stringify({ error: "Email sudah terdaftar. Silakan login atau hubungi admin untuk aktivasi." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hashedPassword = hashSync(password);
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    if (existingUser) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          otp,
          otp_expiry: otpExpiry,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Gagal memperbarui data registrasi" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: hashedPassword,
          otp,
          otp_expiry: otpExpiry,
          verified: false
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Gagal menyimpan data registrasi" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send OTP via Brevo
    await sendOTPEmailBrevo(email, otp);

    console.log("Registration initiated for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Kode verifikasi telah dikirim ke email Anda",
        email
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan saat registrasi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
