import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encode string to base64
function base64Encode(str: string): string {
  return btoa(str);
}

// Read response line from SMTP server
async function readLine(reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder): Promise<string> {
  let result = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
    if (result.includes("\r\n")) break;
  }
  return result.trim();
}

// Simple SMTP send using Deno TCP
async function sendSmtpEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const BREVO_SMTP_USER = Deno.env.get("BREVO_SMTP_USER")!;
  const BREVO_SMTP_PASS = Deno.env.get("BREVO_SMTP_PASS")!;
  const hostname = "smtp-relay.brevo.com";
  const port = 587;

  // Connect via TCP
  const conn = await Deno.connect({ hostname, port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Helper to send command and read response
  async function sendCmd(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0)).trim();
  }

  async function readResponse(): Promise<string> {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return decoder.decode(buf.subarray(0, n || 0)).trim();
  }

  try {
    // Read greeting
    await readResponse();

    // EHLO
    const ehloResp = await sendCmd(`EHLO relay`);
    
    // Check if STARTTLS is available
    if (ehloResp.includes("STARTTLS")) {
      await sendCmd("STARTTLS");
      
      // Upgrade to TLS
      const tlsConn = await Deno.startTls(conn, { hostname });

      // Helper for TLS connection
      async function sendTlsCmd(cmd: string): Promise<string> {
        await tlsConn.write(encoder.encode(cmd + "\r\n"));
        const buf = new Uint8Array(4096);
        const n = await tlsConn.read(buf);
        return decoder.decode(buf.subarray(0, n || 0)).trim();
      }

      // Re-EHLO after STARTTLS
      await sendTlsCmd(`EHLO relay`);

      // AUTH LOGIN
      await sendTlsCmd("AUTH LOGIN");
      await sendTlsCmd(base64Encode(BREVO_SMTP_USER));
      const authResp = await sendTlsCmd(base64Encode(BREVO_SMTP_PASS));
      
      if (!authResp.startsWith("235")) {
        throw new Error(`SMTP AUTH failed: ${authResp}`);
      }

      // MAIL FROM
      await sendTlsCmd(`MAIL FROM:<noreply@gizixdihatikampar.com>`);
      
      // RCPT TO
      await sendTlsCmd(`RCPT TO:<${to}>`);

      // DATA
      await sendTlsCmd("DATA");

      const boundary = `boundary_${Date.now()}`;
      const message = [
        `From: GiziXDihatiKampar <noreply@gizixdihatikampar.com>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        htmlBody,
        ``,
        `.`,
      ].join("\r\n");

      const dataResp = await sendTlsCmd(message);

      // QUIT
      await sendTlsCmd("QUIT");
      tlsConn.close();
    }
  } catch (error) {
    try { conn.close(); } catch {}
    throw error;
  }
}

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

    await sendSmtpEmail(email, "Kode OTP Reset Password", htmlContent);

    return new Response(
      JSON.stringify({ success: true, message: "OTP berhasil dikirim" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return new Response(
      JSON.stringify({ error: "Gagal mengirim email OTP" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
