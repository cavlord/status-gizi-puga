import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, hashedPassword } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Create new token with updated OTP
    const pendingData = base64Encode(JSON.stringify({
      email,
      password: hashedPassword,
      otp,
      expiry: otpExpiry,
      role: 'user'
    }));

    // Send OTP email using fetch
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Posyandu Dashboard <onboarding@resend.dev>",
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
      const error = await response.text();
      console.error("Resend API error:", error);
      throw new Error("Gagal mengirim email verifikasi");
    }

    console.log("New OTP sent to:", email);

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
