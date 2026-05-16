import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  imageBase64?: string;
  distances?: number[];
  mimeType?: string;
}

const SYSTEM = `Tu es un expert en analyse vidéo de sprint athlétique. On te fournit une image extraite d'une vidéo de sprint linéaire, filmée de côté (caméra perpendiculaire à la course). Sur le sol/la piste, des repères physiques (cônes, plots, lignes, marques au sol) sont placés à des distances connues depuis la ligne de départ.

Pour CHAQUE distance demandée, identifie le repère correspondant dans l'image et donne sa coordonnée x normalisée (0 = bord gauche, 1 = bord droit). Si un repère n'est pas clairement visible, omets-le. Donne une confiance entre 0 et 1 pour chaque détection.

Réponds UNIQUEMENT en JSON valide au format suivant, sans markdown ni texte additionnel :
{"markers":[{"distance":<number>,"xNorm":<0-1>,"confidence":<0-1>}],"notes":"<bref commentaire optionnel>"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const imageBase64 = body.imageBase64;
    const distances = Array.isArray(body.distances) ? body.distances : [];
    const mimeType = body.mimeType || "image/jpeg";

    if (!imageBase64 || distances.length === 0) {
      return new Response(JSON.stringify({ error: "imageBase64 et distances requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY manquant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip data URL prefix if present
    const cleanB64 = imageBase64.startsWith("data:")
      ? imageBase64.substring(imageBase64.indexOf(",") + 1)
      : imageBase64;
    const dataUrl = `data:${mimeType};base64,${cleanB64}`;

    const userText = `Distances attendues (en mètres, depuis la ligne de départ) : ${distances.join(", ")}.
Repère chaque distance visible dans l'image et renvoie sa position x normalisée.`;

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(
        JSON.stringify({ error: "Gateway error", status: upstream.status, details: errText }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const json = await upstream.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";

    let parsed: { markers?: Array<{ distance: number; xNorm: number; confidence?: number }>; notes?: string } = {};
    try {
      // Strip optional code fences
      const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Réponse IA non parsable", raw: content }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const markers = (parsed.markers ?? [])
      .filter((m) => typeof m.distance === "number" && typeof m.xNorm === "number")
      .map((m) => ({
        distance: m.distance,
        xNorm: Math.min(1, Math.max(0, m.xNorm)),
        confidence: typeof m.confidence === "number" ? Math.min(1, Math.max(0, m.confidence)) : 0.5,
      }));

    return new Response(JSON.stringify({ markers, notes: parsed.notes }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
