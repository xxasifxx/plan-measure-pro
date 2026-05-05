// Parse Gantt chart image/screenshot into schedule activities via Lovable AI Gateway.
// Accepts { imageBase64: string, mimeType: string } and returns { activities: [...] }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SCHEMA = {
  name: "extract_schedule",
  description:
    "Extract a list of project schedule activities (WBS rows) from a Gantt chart image.",
  parameters: {
    type: "object",
    properties: {
      activities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            wbs_code: { type: "string", description: "WBS or activity ID, e.g. '3.1.2' or 'A1020'" },
            name: { type: "string", description: "Activity name" },
            baseline_start: { type: "string", description: "ISO date YYYY-MM-DD if visible, else empty string" },
            baseline_end: { type: "string", description: "ISO date YYYY-MM-DD if visible, else empty string" },
            percent_complete: { type: "number", description: "0–100 if a progress bar is shown, else 0" },
          },
          required: ["wbs_code", "name", "baseline_start", "baseline_end", "percent_complete"],
          additionalProperties: false,
        },
      },
    },
    required: ["activities"],
    additionalProperties: false,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a construction scheduling assistant. Extract every visible WBS row from the Gantt chart in the image. Infer dates from bar positions when an axis is visible. Use ISO dates. Return only data you can see.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all activities from this Gantt chart." },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/png"};base64,${imageBase64}` } },
            ],
          },
        ],
        tools: [{ type: "function", function: SCHEMA }],
        tool_choice: { type: "function", function: { name: "extract_schedule" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway failure" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { activities: [] };
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-schedule error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
