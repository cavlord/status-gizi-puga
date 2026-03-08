import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      <p style="color: #334155; font-size: 14px;">Berikut adalah kode OTP baru untuk memverifikasi email Anda:</p>
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
      subject: "Kode Verifikasi Baru - GiziXDihatiKampar",
      htmlContent,
    }),
  });

  if (!apiResponse.ok) {
    const responseText = await apiResponse.text();
    console.error("Brevo API error:", responseText);
    throw new Error("Gagal mengirim email verifikasi");
  }

  console.log("Resend OTP sent via Brevo to:", email);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, verified')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchError || !user) {
      return new Response(
        JSON.stringify({ error: "Email tidak ditemukan. Silakan daftar terlebih dahulu." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (user.verified) {
      return new Response(
        JSON.stringify({ error: "Email sudah terverifikasi. Silakan login." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('users')
      .update({
        otp,
        otp_expiry: otpExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Gagal memperbarui OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await sendOTPEmailBrevo(normalizedEmail, otp);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Kode verifikasi baru telah dikirim"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Resend OTP error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Gagal mengirim kode verifikasi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
