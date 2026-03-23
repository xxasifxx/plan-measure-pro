import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller identity using getUser()
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role } = await req.json();
    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "email and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already invited
    const { data: existing } = await adminClient
      .from("invitations")
      .select("id, accepted_at")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing && existing.accepted_at) {
      return new Response(
        JSON.stringify({ error: "User already accepted an invitation" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upsert invitation
    let token: string;
    if (existing) {
      const { data: updated, error: updateErr } = await adminClient
        .from("invitations")
        .update({ role, invited_by: callerId })
        .eq("id", existing.id)
        .select("token")
        .single();
      if (updateErr) throw updateErr;
      token = updated.token;
    } else {
      const { data: inserted, error: insertErr } = await adminClient
        .from("invitations")
        .insert({
          email: email.toLowerCase(),
          role,
          invited_by: callerId,
        })
        .select("token")
        .single();
      if (insertErr) throw insertErr;
      token = inserted.token;
    }

    // Send invite email via Supabase Auth Admin API
    // Use Referer or Origin to determine the app URL; never fall back to supabaseUrl
    const referer = req.headers.get("referer") || "";
    const origin = req.headers.get("origin") || "";
    // Extract origin from referer if available (e.g. "https://app.com/admin" → "https://app.com")
    let siteUrl = origin;
    if (!siteUrl && referer) {
      try { siteUrl = new URL(referer).origin; } catch { siteUrl = ""; }
    }
    // Hardcoded fallback to the published app URL — never use supabaseUrl
    if (!siteUrl || siteUrl.includes("supabase")) {
      siteUrl = "https://draw-quantify-dash.lovable.app";
    }
    const redirectTo = `${siteUrl}/auth?invitation=${token}`;

    const { error: inviteErr } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { invited_role: role },
      });

    if (inviteErr && !inviteErr.message?.includes("already been registered")) {
      console.error("Invite error:", inviteErr);
    }

    return new Response(
      JSON.stringify({ success: true, token }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("invite-user error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
