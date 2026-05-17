import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import JSZip from "npm:jszip@3.10.1";

interface Body {
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
}

const SYSTEM = `Tu extrais une liste d'athlètes/joueurs depuis un document (PDF, texte ou image).
Pour chaque athlète présent dans le document, extrait :
- firstName (prénom, obligatoire)
- lastName (nom de famille, obligatoire)
- mass (masse corporelle en kg, nombre, optionnel)
- height (taille en cm, nombre, optionnel — convertir depuis m si nécessaire)
- position (poste/role, texte court, optionnel)
- birthDate (date au format ISO YYYY-MM-DD, optionnel)

Ignore en-têtes, totaux, moyennes, légendes. Si une colonne est ambiguë, omets-la.
Réponds UNIQUEMENT en JSON strict : {"athletes":[{...}, ...]} — aucun markdown.`;

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.startsWith("data:") ? b64.substring(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function extractDocxText(b64: string): Promise<string> {
  const bytes = b64ToBytes(b64);
  const zip = await JSZip.loadAsync(bytes);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("DOCX invalide : word/document.xml introuvable");
  const xml = await docFile.async("string");
  // Convert paragraphs to newlines, tabs for cell separators, strip remaining tags
  const text = xml
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<w:tc[^>]*>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const fileBase64 = body.fileBase64;
    const mimeType = (body.mimeType || "").toLowerCase();
    const fileName = (body.fileName || "").toLowerCase();

    if (!fileBase64) {
      return new Response(JSON.stringify({ error: "fileBase64 requis" }), {
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

    // Determine kind
    const isImage = mimeType.startsWith("image/");
    const isPdf = mimeType === "application/pdf" || fileName.endsWith(".pdf");
    const isDocx =
      mimeType.includes("officedocument.wordprocessingml") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc");

    let userContent: unknown;

    if (isImage) {
      const dataUrl = `data:${mimeType || "image/jpeg"};base64,${fileBase64.startsWith("data:") ? fileBase64.substring(fileBase64.indexOf(",") + 1) : fileBase64}`;
      userContent = [
        { type: "text", text: "Extrais la liste complète des athlètes de cette image." },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    } else if (isPdf) {
      const clean = fileBase64.startsWith("data:") ? fileBase64.substring(fileBase64.indexOf(",") + 1) : fileBase64;
      const dataUrl = `data:application/pdf;base64,${clean}`;
      userContent = [
        { type: "text", text: "Extrais la liste complète des athlètes de ce PDF." },
        { type: "image_url", image_url: { url: dataUrl } },
      ];
    } else if (isDocx) {
      const text = await extractDocxText(fileBase64);
      userContent = `Extrais la liste complète des athlètes du document Word suivant :\n\n${text}`;
    } else {
      return new Response(
        JSON.stringify({ error: `Type de fichier non supporté : ${mimeType || fileName}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
          { role: "user", content: userContent },
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

    let parsed: { athletes?: Array<Record<string, unknown>> } = {};
    try {
      const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Réponse IA non parsable", raw: content }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const athletes = (parsed.athletes ?? [])
      .map((a) => {
        const firstName = String(a.firstName ?? a.first_name ?? a.prenom ?? "").trim();
        const lastName = String(a.lastName ?? a.last_name ?? a.nom ?? "").trim();
        if (!firstName || !lastName) return null;
        const massNum = Number(a.mass ?? a.weight ?? a.poids);
        const heightNum = Number(a.height ?? a.taille);
        return {
          firstName,
          lastName,
          mass: Number.isFinite(massNum) && massNum > 0 ? massNum : undefined,
          height: Number.isFinite(heightNum) && heightNum > 0 ? heightNum : undefined,
          position: a.position ? String(a.position).trim() : undefined,
          birthDate: a.birthDate ? String(a.birthDate).trim() : undefined,
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ athletes }), {
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
