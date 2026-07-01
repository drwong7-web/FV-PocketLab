/**
 * Client IA local — Google Gemini. La clé API utilisateur est stockée
 * en clair dans le localStorage de l'appareil.
 */
import JSZip from "jszip";

const KEY_STORAGE = "fv:ai-key:v2";
const MODEL_STORAGE = "fv:ai-model:v1";
const DEFAULT_MODEL = "gemini-2.5-pro";

export function getAIModel(): string {
  try { return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL; } catch { return DEFAULT_MODEL; }
}
export function setAIModel(model: string) {
  try { localStorage.setItem(MODEL_STORAGE, model || DEFAULT_MODEL); } catch { /* */ }
}

export function getAIKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) || ""; } catch { return ""; }
}
export function hasAIKey(): boolean {
  return !!getAIKey();
}

/** Persiste la clé IA en clair. Signature async pour compat avec les appels existants. */
export async function setAIKey(key: string): Promise<void> {
  const trimmed = key.trim();
  try {
    if (!trimmed) localStorage.removeItem(KEY_STORAGE);
    else localStorage.setItem(KEY_STORAGE, trimmed);
  } catch { /* */ }
}

export class AIKeyMissingError extends Error {
  constructor() { super("Clé IA manquante — configurez-la dans Paramètres."); this.name = "AIKeyMissingError"; }
}

// ---------- Base64 helper (used by DOCX extractor) ----------
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- Gemini call ----------
interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}
interface GeminiContent { role?: string; parts: GeminiPart[] }

async function callGemini(opts: {
  systemInstruction?: string;
  contents: GeminiContent[];
  jsonMode?: boolean;
}): Promise<string> {
  const key = getAIKey();
  if (!key) throw new AIKeyMissingError();
  const model = getAIModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body: Record<string, unknown> = {
    contents: opts.contents,
    generationConfig: opts.jsonMode ? { responseMimeType: "application/json" } : {},
  };
  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 401 || res.status === 403) throw new Error("Clé IA invalide ou refusée.");
    if (res.status === 429) throw new Error("Quota IA dépassé — réessayez plus tard.");
    throw new Error(`Erreur IA ${res.status} : ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.map((p: GeminiPart) => p.text ?? "").join("") ?? "";
}

function safeJsonParse<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned) as T;
}

// ---------- Detect sprint markers ----------
const MARKERS_SYSTEM = `Tu es un expert en analyse vidéo de sprint athlétique. On te fournit une image extraite d'une vidéo de sprint linéaire, filmée de côté (caméra perpendiculaire à la course). Sur le sol/la piste, des repères physiques (cônes, plots, lignes, marques au sol) sont placés à des distances connues depuis la ligne de départ.

Pour CHAQUE distance demandée, identifie le repère correspondant dans l'image et donne sa coordonnée x normalisée (0 = bord gauche, 1 = bord droit). Si un repère n'est pas clairement visible, omets-le. Donne une confiance entre 0 et 1 pour chaque détection.

Réponds UNIQUEMENT en JSON valide au format suivant, sans markdown ni texte additionnel :
{"markers":[{"distance":<number>,"xNorm":<0-1>,"confidence":<0-1>}],"notes":"<bref commentaire optionnel>"}`;

export interface DetectedMarker { distance: number; xNorm: number; confidence: number }

export async function detectSprintMarkers(opts: {
  imageBase64: string;
  distances: number[];
  mimeType?: string;
}): Promise<{ markers: DetectedMarker[]; notes?: string }> {
  const mime = opts.mimeType || "image/jpeg";
  const cleanB64 = opts.imageBase64.startsWith("data:")
    ? opts.imageBase64.substring(opts.imageBase64.indexOf(",") + 1)
    : opts.imageBase64;
  const userText = `Distances attendues (en mètres, depuis la ligne de départ) : ${opts.distances.join(", ")}.
Repère chaque distance visible dans l'image et renvoie sa position x normalisée.`;
  const raw = await callGemini({
    systemInstruction: MARKERS_SYSTEM,
    jsonMode: true,
    contents: [{
      role: "user",
      parts: [
        { text: userText },
        { inlineData: { mimeType: mime, data: cleanB64 } },
      ],
    }],
  });
  let parsed: { markers?: DetectedMarker[]; notes?: string };
  try { parsed = safeJsonParse(raw); }
  catch { throw new Error("Réponse IA non parsable."); }
  const markers = (parsed.markers ?? [])
    .filter((m) => typeof m.distance === "number" && typeof m.xNorm === "number")
    .map((m) => ({
      distance: m.distance,
      xNorm: Math.min(1, Math.max(0, m.xNorm)),
      confidence: typeof m.confidence === "number" ? Math.min(1, Math.max(0, m.confidence)) : 0.5,
    }));
  return { markers, notes: parsed.notes };
}

// ---------- Parse athletes list ----------
const ATHLETES_SYSTEM = `Tu extrais une liste d'athlètes/joueurs depuis un document (PDF, texte ou image).
Pour chaque athlète présent dans le document, extrait :
- firstName (prénom, obligatoire)
- lastName (nom de famille, obligatoire)
- mass (masse corporelle en kg, nombre, optionnel)
- height (taille en cm, nombre, optionnel — convertir depuis m si nécessaire)
- position (poste/role, texte court, optionnel)
- birthDate (date au format ISO YYYY-MM-DD, optionnel)

Ignore en-têtes, totaux, moyennes, légendes. Si une colonne est ambiguë, omets-la.
Réponds UNIQUEMENT en JSON strict : {"athletes":[{...}, ...]} — aucun markdown.`;

export interface ParsedAthlete {
  firstName: string;
  lastName: string;
  mass?: number;
  height?: number;
  position?: string;
  birthDate?: string;
}

async function extractDocxText(b64Str: string): Promise<string> {
  const bytes = unb64(b64Str.startsWith("data:") ? b64Str.substring(b64Str.indexOf(",") + 1) : b64Str);
  const zip = await JSZip.loadAsync(bytes);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("DOCX invalide : word/document.xml introuvable");
  const xml = await docFile.async("string");
  return xml
    .replace(/<w:tab[^>]*\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<w:tc[^>]*>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function parseAthletesFile(file: File): Promise<ParsedAthlete[]> {
  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isDocx = mime.includes("officedocument.wordprocessingml") || name.endsWith(".docx") || name.endsWith(".doc");

  const fileToB64 = (f: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      resolve(s.substring(s.indexOf(",") + 1));
    };
    r.onerror = reject;
    r.readAsDataURL(f);
  });

  let parts: GeminiPart[];
  if (isImage) {
    const data = await fileToB64(file);
    parts = [
      { text: "Extrais la liste complète des athlètes de cette image." },
      { inlineData: { mimeType: mime || "image/jpeg", data } },
    ];
  } else if (isPdf) {
    const data = await fileToB64(file);
    parts = [
      { text: "Extrais la liste complète des athlètes de ce PDF." },
      { inlineData: { mimeType: "application/pdf", data } },
    ];
  } else if (isDocx) {
    const data = await fileToB64(file);
    const text = await extractDocxText(data);
    parts = [{ text: `Extrais la liste complète des athlètes du document Word suivant :\n\n${text}` }];
  } else {
    throw new Error(`Type de fichier non supporté : ${mime || name}`);
  }

  const raw = await callGemini({
    systemInstruction: ATHLETES_SYSTEM,
    jsonMode: true,
    contents: [{ role: "user", parts }],
  });
  let parsed: { athletes?: Array<Record<string, unknown>> };
  try { parsed = safeJsonParse(raw); }
  catch { throw new Error("Réponse IA non parsable."); }
  const athletes: ParsedAthlete[] = [];
  for (const a of parsed.athletes ?? []) {
    const firstName = String(a.firstName ?? a.first_name ?? a.prenom ?? "").trim();
    const lastName = String(a.lastName ?? a.last_name ?? a.nom ?? "").trim();
    if (!firstName || !lastName) continue;
    const massNum = Number(a.mass ?? a.weight ?? a.poids);
    const heightNum = Number(a.height ?? a.taille);
    athletes.push({
      firstName, lastName,
      mass: Number.isFinite(massNum) && massNum > 0 ? massNum : undefined,
      height: Number.isFinite(heightNum) && heightNum > 0 ? heightNum : undefined,
      position: a.position ? String(a.position).trim() : undefined,
      birthDate: a.birthDate ? String(a.birthDate).trim() : undefined,
    });
  }
  return athletes;
}
