// Edge function: AI photo tagging — suggests pay item for an uploaded annotation photo.
// Calls Lovable AI Gateway (google/gemini-2.5-flash) with the image + project pay-item list.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { photoId } = await req.json();
    if (!photoId) return json({ error: "photoId required" }, 400);

    const { data: photo, error: photoErr } = await supabase
      .from("annotation_photos")
      .select("id, storage_path, project_id")
      .eq("id", photoId)
      .single();
    if (photoErr || !photo) return json({ error: "Photo not found" }, 404);

    const { data: payItems } = await supabase
      .from("pay_items")
      .select("id, item_code, name, unit")
      .eq("project_id", photo.project_id);

    if (!payItems?.length) return json({ error: "No pay items" }, 400);

    // Signed URL for the model
    const { data: signed } = await supabase.storage
      .from("annotation-photos")
      .createSignedUrl(photo.storage_path, 600);
    if (!signed?.signedUrl) return json({ error: "Cannot read photo" }, 500);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const itemList = payItems.map((p) => `${p.item_code} | ${p.name} (${p.unit})`).join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an NJTA construction inspector. Identify which contract pay item this field photo most likely documents. Respond using the suggest_pay_item tool.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Pay items available:\n${itemList}\n\nPick the best match for this photo.` },
              { type: "image_url", image_url: { url: signed.signedUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_pay_item",
            description: "Return the most likely pay item for the photo.",
            parameters: {
              type: "object",
              properties: {
                item_code: { type: "string", description: "Item code such as 104-0001" },
                confidence: { type: "number", description: "0-1" },
                rationale: { type: "string" },
              },
              required: ["item_code", "confidence", "rationale"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_pay_item" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) return json({ error: "Rate limit, try again shortly." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI gateway error" }, 500);
    }

    const aiJson = await aiResp.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "No suggestion" }, 500);
    const parsed = JSON.parse(args);

    const matched = payItems.find((p) => p.item_code === parsed.item_code) ?? null;

    await supabase.from("annotation_photos").update({
      ai_suggested_pay_item_id: matched?.id ?? null,
      ai_confidence: parsed.confidence,
      ai_rationale: parsed.rationale,
    }).eq("id", photoId);

    return json({
      pay_item_id: matched?.id ?? null,
      item_code: parsed.item_code,
      confidence: parsed.confidence,
      rationale: parsed.rationale,
    });
  } catch (e) {
    console.error("tag-photo error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
