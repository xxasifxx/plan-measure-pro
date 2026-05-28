// Sends an FCM/APNs push to all device tokens for a user via the FCM HTTP v1 API.
// Disabled unless FCM_SERVER_KEY is configured. Called from internal DB triggers
// or directly by edge functions when a notification is created.
import "https://deno.land/x/[email protected]/load.ts";
import { createClient } from "https://esm.sh/@supabase/[email protected]";
import { z } from "https://esm.sh/[email protected]";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BodySchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  data: z.record(z.string()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!FCM_SERVER_KEY) {
    return new Response(
      JSON.stringify({ ok: false, skipped: true, reason: "FCM_SERVER_KEY not configured" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { user_id, title, body, data } = parsed.data;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: tokens, error } = await admin
    .from("device_tokens")
    .select("token, platform")
    .eq("user_id", user_id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  const errors: string[] = [];
  for (const t of tokens) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: t.token,
          notification: { title, body, sound: "default" },
          data: data ?? {},
          priority: "high",
        }),
      });
      if (res.ok) sent++;
      else errors.push(`${res.status} ${await res.text()}`);
    } catch (e) {
      errors.push(String(e));
    }
  }

  return new Response(JSON.stringify({ ok: true, sent, errors }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
