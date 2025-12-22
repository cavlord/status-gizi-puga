import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
const RECAPTCHA_SECRET_KEY = Deno.env.get("RECAPTCHA_SECRET_KEY");
const SPREADSHEET_ID = "1o-Lok3oWtmGXaN5Q9CeFj4ji9WFOINYW3M_RBNBUw60";
const SHEET_NAME = "LOGIN";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash function matching the register function
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "posyandu_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify reCAPTCHA
async function verifyCaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    console.log("reCAPTCHA verification result:", data);
    return data.success === true;
  } catch (error) {
    console.error("reCAPTCHA verification error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, captchaToken } = await req.json();

    // Validate input
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email dan password wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!captchaToken) {
      return new Response(
        JSON.stringify({ error: "Silakan selesaikan verifikasi CAPTCHA" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify CAPTCHA
    const captchaValid = await verifyCaptcha(captchaToken);
    if (!captchaValid) {
      return new Response(
        JSON.stringify({ error: "Verifikasi CAPTCHA gagal. Silakan coba lagi." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash the input password
    const hashedPassword = await hashPassword(password);

    // Fetch user data from Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E?key=${GOOGLE_SHEETS_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Google Sheets API error:", await response.text());
      return new Response(
        JSON.stringify({ error: "Gagal mengakses data. Silakan coba lagi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("Fetched user data, rows:", data.values?.length || 0);

    if (!data.values || data.values.length <= 1) {
      return new Response(
        JSON.stringify({ error: "Email atau password salah" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user (skip header row)
    // Expected columns: email, password, role, otp_expiry, verified
    let foundUser = null;
    for (let i = 1; i < data.values.length; i++) {
      const row = data.values[i];
      if (row && row[0] === email) {
        foundUser = {
          email: row[0],
          password: row[1],
          role: row[2] || 'user',
          verified: row[4] === 'yes'
        };
        break;
      }
    }

    if (!foundUser) {
      return new Response(
        JSON.stringify({ error: "Email atau password salah" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if verified
    if (!foundUser.verified) {
      return new Response(
        JSON.stringify({ error: "Email belum diverifikasi. Silakan verifikasi email Anda terlebih dahulu." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password
    if (foundUser.password !== hashedPassword) {
      return new Response(
        JSON.stringify({ error: "Email atau password salah" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User logged in successfully:", email);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          email: foundUser.email,
          role: foundUser.role,
          verified: foundUser.verified
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Login error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Terjadi kesalahan saat login" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
