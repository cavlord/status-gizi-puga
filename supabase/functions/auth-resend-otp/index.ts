import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Posyandu Dashboard <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate 6-digit OTP using cryptographically secure random numbers
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Generate 6-digit OTP (100000-999999)
  const otp = (array[0] % 900000) + 100000;
  return otp.toString();
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

    // Check user exists and is not verified
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, verified')
      .eq('email', email)
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

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Update user with new OTP
    const { error: updateError } = await supabase
      .from('users')
      .update({
        otp,
        otp_expiry: otpExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Gagal memperbarui OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create token for backward compatibility
    const pendingData = base64Encode(JSON.stringify({
      email,
      expiry: otpExpiry,
      role: 'user'
    }));

    // Try to send OTP email
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM_EMAIL,
          to: [email],
          subject: "Kode Verifikasi Baru - Posyandu Dashboard",
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
                  <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Kode Verifikasi Baru</p>
                </div>
                <div style="background: white; padding: 40px 30px; text-align: center;">
                  <p style="color: #4a5568; font-size: 16px; margin: 0 0 30px 0; line-height: 1.6;">
                    Berikut adalah kode verifikasi baru Anda:
                  </p>
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 25px; display: inline-block;">
                    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: white;">${otp}</span>
                  </div>
                  <p style="color: #718096; font-size: 14px; margin: 30px 0 0 0; line-height: 1.6;">
                    Kode ini akan kadaluarsa dalam <strong>10 menit</strong>.
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
        console.log("Email sending failed");
        // Don't expose OTP - email must work for production
      } else {
        console.log("New OTP sent to:", email);
      }
    } catch (emailError) {
      console.log("Email sending failed:", emailError);
      // Don't expose OTP - email must work for production
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Kode verifikasi baru telah dikirim",
        token: pendingData
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
