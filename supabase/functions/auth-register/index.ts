import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { hashSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Posyandu Dashboard <onboarding@resend.dev>",
      to: [email],
      subject: "Kode Verifikasi Registrasi - Posyandu Dashboard",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);">
            <div style="padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0 0 10px 0; font-size: 28px; font-weight: 600;">Posyandu Dashboard</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Kode Verifikasi Email</p>
            </div>
            <div style="background: white; padding: 40px 30px; text-align: center;">
              <p style="color: #4a5568; font-size: 16px; margin: 0 0 30px 0; line-height: 1.6;">
                Terima kasih telah mendaftar! Gunakan kode berikut untuk memverifikasi email Anda:
              </p>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; display: inline-block;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: white;">${otp}</span>
              </div>
              <p style="color: #718096; font-size: 14px; margin: 30px 0 0 0; line-height: 1.6;">
                Kode ini akan kadaluarsa dalam <strong>10 menit</strong>.<br>
                Jika Anda tidak melakukan registrasi, abaikan email ini.
              </p>
            </div>
            <div style="padding: 20px 30px; text-align: center; background: #f8fafc;">
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                © 2024 Posyandu Dashboard. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Resend API error:", error);
    throw new Error("Gagal mengirim email verifikasi");
  }

  console.log("OTP Email sent successfully");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email dan password wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Format email tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password minimal 8 karakter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists and is verified
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, verified')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error("Database check error:", checkError);
      return new Response(
        JSON.stringify({ error: "Gagal memeriksa email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingUser && existingUser.verified) {
      return new Response(
        JSON.stringify({ error: "Email sudah terdaftar. Silakan login." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash password using bcrypt (sync version for Edge Functions)
    const hashedPassword = hashSync(password);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Insert or update user in database
    if (existingUser) {
      // Update existing unverified user
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
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Gagal memperbarui data registrasi" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Insert new user
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
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Gagal menyimpan data registrasi" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Encode registration data for verification step (backward compatible)
    const pendingData = base64Encode(JSON.stringify({
      email,
      expiry: otpExpiry,
      role: 'user'
    }));

    // Try to send OTP email
    try {
      await sendOTPEmail(email, otp);
      console.log("OTP email sent successfully to:", email);
    } catch (emailError) {
      console.log("Email sending failed:", emailError);
      // Don't expose OTP - email must work for production
    }

    console.log("Registration initiated for:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Kode verifikasi telah dikirim ke email Anda",
        token: pendingData
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
