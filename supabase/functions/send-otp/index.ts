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
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email dan OTP wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BREVO_SMTP_USER = Deno.env.get("BREVO_SMTP_USER")!;
    const BREVO_SMTP_PASS = Deno.env.get("BREVO_SMTP_PASS")!;

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

    // Try Brevo HTTP API first (xsmtpsib key works as API key)
    const apiResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_SMTP_PASS,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "GiziXDihatiKampar", email: BREVO_SMTP_USER },
        to: [{ email }],
        subject: "Kode OTP Reset Password",
        htmlContent,
      }),
    });

    const responseText = await apiResponse.text();
    console.log("Brevo API response status:", apiResponse.status, "body:", responseText);

    if (!apiResponse.ok) {
      // Fallback: try raw SMTP
      console.log("API failed, trying raw SMTP...");
      
      const conn = await Deno.connect({ hostname: "smtp-relay.brevo.com", port: 587 });
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      async function readResp(c: Deno.Conn): Promise<string> {
        const buf = new Uint8Array(4096);
        const n = await c.read(buf);
        return decoder.decode(buf.subarray(0, n || 0)).trim();
      }

      async function sendCmd(c: Deno.Conn, cmd: string): Promise<string> {
        await c.write(encoder.encode(cmd + "\r\n"));
        return readResp(c);
      }

      // Greeting
      await readResp(conn);
      const ehlo = await sendCmd(conn, "EHLO client");

      if (ehlo.includes("STARTTLS")) {
        await sendCmd(conn, "STARTTLS");
        const tls = await Deno.startTls(conn, { hostname: "smtp-relay.brevo.com" });

        await sendCmd(tls, "EHLO client");
        await sendCmd(tls, "AUTH LOGIN");
        await sendCmd(tls, btoa(BREVO_SMTP_USER));
        const authResp = await sendCmd(tls, btoa(BREVO_SMTP_PASS));

        if (!authResp.startsWith("235")) {
          tls.close();
          throw new Error(`SMTP AUTH failed: ${authResp}`);
        }

        await sendCmd(tls, `MAIL FROM:<${BREVO_SMTP_USER}>`);
        await sendCmd(tls, `RCPT TO:<${email}>`);
        await sendCmd(tls, "DATA");

        const msg = [
          `From: GiziXDihatiKampar <${BREVO_SMTP_USER}>`,
          `To: ${email}`,
          `Subject: Kode OTP Reset Password`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          htmlContent,
          ``,
          `.`,
        ].join("\r\n");

        const dataResp = await sendCmd(tls, msg);
        console.log("SMTP DATA response:", dataResp);
        await sendCmd(tls, "QUIT");
        tls.close();

        if (!dataResp.startsWith("250")) {
          throw new Error(`SMTP send failed: ${dataResp}`);
        }
      } else {
        conn.close();
        throw new Error("STARTTLS not supported");
      }
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
