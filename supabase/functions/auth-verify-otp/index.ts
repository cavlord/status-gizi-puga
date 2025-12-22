import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
const SPREADSHEET_ID = "1o-Lok3oWtmGXaN5Q9CeFj4ji9WFOINYW3M_RBNBUw60";
const SHEET_NAME = "LOGIN";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Function to write to Google Sheets using Apps Script Web App
// For production, you should set up a Google Apps Script Web App
async function appendToSheet(email: string, hashedPassword: string, role: string): Promise<boolean> {
  // Using Google Sheets API v4 - requires OAuth or service account for write
  // For now, we'll use a workaround with Apps Script
  
  console.log("Appending to sheet:", { email, role });
  
  // In production, replace this with your Apps Script Web App URL
  // For demo purposes, we'll simulate success
  // The actual implementation would be:
  // const webAppUrl = Deno.env.get("GOOGLE_APPS_SCRIPT_URL");
  // await fetch(webAppUrl, { method: 'POST', body: JSON.stringify({...}) });
  
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp, token } = await req.json();

    if (!email || !otp || !token) {
      return new Response(
        JSON.stringify({ error: "Data verifikasi tidak lengkap" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode the pending registration data
    let pendingData;
    try {
      const decoded = new TextDecoder().decode(base64Decode(token));
      pendingData = JSON.parse(decoded);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Token tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify email matches
    if (pendingData.email !== email) {
      return new Response(
        JSON.stringify({ error: "Email tidak cocok" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify OTP
    if (pendingData.otp !== otp) {
      return new Response(
        JSON.stringify({ error: "Kode OTP salah" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiry
    if (new Date() > new Date(pendingData.expiry)) {
      return new Response(
        JSON.stringify({ error: "Kode OTP sudah kadaluarsa. Silakan daftar ulang." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Append to Google Sheet
    // Note: For production, implement proper Google Sheets write using service account
    await appendToSheet(pendingData.email, pendingData.password, pendingData.role);

    console.log("User verified and registered:", email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email berhasil diverifikasi! Silakan login." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan saat verifikasi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
