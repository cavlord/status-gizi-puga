import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is using the service role key (server-to-server only)
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authHeader || !serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email dan OTP wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_SMTP_PASS")!;
    const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SMTP_USER")!;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1e293b; margin: 0;">Reset Password</h2>
          <p style="color: #64748b; font-size: 14px;">GiziXDihatiKampar</p>
        </div>
        <p style="color: #334155; font-size: 14px;">Berikut adalah kode OTP untuk mereset password Anda:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a; background: #f1f5f9; padding: 16px 32px; border-radius: 8px; border: 2px dashed #cbd5e1;">${otp}</span>
        </div>
        <p style="color: #ef4444; font-size: 13px; text-align: center; font-weight: 600;">Kode ini berlaku selama 5 menit.</p>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
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
        subject: "Kode OTP Reset Password - GiziXDihatiKampar",
        htmlContent,
      }),
    });

    const responseText = await apiResponse.text();
    console.log("Brevo API response status:", apiResponse.status, "body:", responseText);

    if (!apiResponse.ok) {
      console.error("Brevo API error:", responseText);
      throw new Error(`Brevo API error: ${apiResponse.status} - ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "OTP berhasil dikirim" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send OTP error:", error.message || error);
    return new Response(
      JSON.stringify({ error: "Gagal mengirim email OTP: " + (error.message || "Unknown error") }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
