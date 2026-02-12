import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Input validation schema
const updateUserSchema = z.object({
  adminEmail: z.string()
    .email({ message: "Format email admin tidak valid" })
    .max(255, { message: "Email terlalu panjang" }),
  userId: z.string()
    .regex(uuidRegex, { message: "Format userId tidak valid" }),
  action: z.enum(["generate_otp", "activate", "deactivate", "delete"], {
    errorMap: () => ({ message: "Action tidak valid. Gunakan: generate_otp, activate, deactivate, atau delete" })
  }),
  otp: z.string()
    .regex(/^\d{6}$/, { message: "OTP harus berupa 6 digit angka" })
    .optional(),
  otpExpiry: z.string()
    .datetime({ message: "Format otpExpiry tidak valid" })
    .optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = updateUserSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0]?.message || "Input tidak valid";
      return new Response(
        JSON.stringify({ error: firstError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { adminEmail, userId, action, otp, otpExpiry } = validationResult.data;

    // Additional validation: generate_otp action requires otp and otpExpiry
    if (action === "generate_otp" && (!otp || !otpExpiry)) {
      return new Response(
        JSON.stringify({ error: "Action generate_otp membutuhkan otp dan otpExpiry" }),
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
      .eq("email", adminEmail.toLowerCase())
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

    // Verify target user exists
    const { data: targetUser, error: targetUserError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (targetUserError || !targetUser) {
      return new Response(
        JSON.stringify({ error: "User target tidak ditemukan" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle delete action separately
    if (action === "delete") {
      // Prevent admin from deleting themselves
      if (targetUser.id === adminUser.id) {
        return new Response(
          JSON.stringify({ error: "Tidak dapat menghapus akun sendiri" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete user roles first (foreign key)
      await supabase.from("user_roles").delete().eq("user_id", userId);

      // Delete user
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (deleteError) {
        console.error("Error deleting user:", deleteError);
        return new Response(
          JSON.stringify({ error: "Gagal menghapus user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`User ${userId} deleted successfully by admin ${adminEmail}`);
      return new Response(
        JSON.stringify({ success: true, message: "User berhasil dihapus" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let updateData: Record<string, unknown> = {
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
    }

    console.log("Updating user with action:", action);

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
      JSON.stringify({ error: "Terjadi kesalahan internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
