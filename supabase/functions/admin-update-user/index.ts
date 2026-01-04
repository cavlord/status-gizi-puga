import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminEmail, userId, action, otp, otpExpiry, verified } = await req.json();

    if (!adminEmail || !userId || !action) {
      return new Response(
        JSON.stringify({ error: "Parameter tidak lengkap" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Admin ${adminEmail} attempting to ${action} user ${userId}`);

    // Verify the requester is an admin
    const { data: adminUser, error: adminUserError } = await supabase
      .from("users")
      .select("id")
      .eq("email", adminEmail)
      .maybeSingle();

    if (adminUserError || !adminUser) {
      console.error("Admin user not found:", adminUserError);
      return new Response(
        JSON.stringify({ error: "Admin tidak ditemukan" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User is not admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Akses ditolak - bukan admin" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: any = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case "generate_otp":
        updateData.otp = otp;
        updateData.otp_expiry = otpExpiry;
        break;
      case "activate":
        updateData.verified = true;
        break;
      case "deactivate":
        updateData.verified = false;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Action tidak valid" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log("Updating user with data:", updateData);

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user:", updateError);
      return new Response(
        JSON.stringify({ error: "Gagal mengupdate user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${userId} updated successfully with action: ${action}`);

    return new Response(
      JSON.stringify({ success: true, message: `User berhasil di-${action}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in admin-update-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});