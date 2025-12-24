import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Whitelist of allowed spreadsheet IDs (add your spreadsheet ID here)
const ALLOWED_SPREADSHEET_IDS = [
  "1CxMzBQ6b4gg1Cw5D5fz_b-8m2P7lZv-pB2e8vYS2s-s", // Example ID - update with actual production spreadsheet
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, sheetName, email } = await req.json();

    if (!spreadsheetId || !sheetName) {
      return new Response(
        JSON.stringify({ error: "spreadsheetId and sheetName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate spreadsheet ID is in whitelist
    if (!ALLOWED_SPREADSHEET_IDS.includes(spreadsheetId)) {
      console.error("Unauthorized spreadsheet access attempt:", spreadsheetId);
      return new Response(
        JSON.stringify({ error: "Unauthorized spreadsheet access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is authenticated
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Check if user exists and is verified
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, verified')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user) {
      console.error("User lookup failed:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user.verified) {
      return new Response(
        JSON.stringify({ error: "Account not verified" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GOOGLE_SHEETS_API_KEY) {
      console.error("GOOGLE_SHEETS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}?key=${GOOGLE_SHEETS_API_KEY}`;
    
    console.log("Fetching Google Sheets data for sheet:", sheetName);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Sheets API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch data from Google Sheets" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    console.log("Successfully fetched", data.values?.length || 0, "rows");

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Google Sheets proxy error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to fetch sheet data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
