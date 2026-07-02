/**
 * Import local d'une liste d'athlètes depuis un PDF, un DOCX ou une image.
 * Aucune API distante : pdfjs-dist (PDF), JSZip (DOCX) et tesseract.js (OCR)
 * s'exécutent 100 % dans le navigateur.
 */
import JSZip from "jszip";

export interface ParsedAthlete {
  firstName: string;
  lastName: string;
  mass?: number;
  height?: number;
  position?: string;
  birthDate?: string;
}

// ---------- Extraction texte ----------
async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker via CDN (compatible Vite, pas besoin de bundler le worker).
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Regroupe par ligne via l'ordonnée transform[5]
    const byY = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as Array<{ str: string; transform: number[] }>) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y)!.push({ x, s: item.str });
    }
    const ys = [...byY.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const line = byY.get(y)!.sort((a, b) => a.x - b.x).map((t) => t.s).join(" ").replace(/\s+/g, " ").trim();
      if (line) out.push(line);
    }
  }
  return out.join("\n");
}

async function extractDocxText(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
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

async function extractImageText(file: File): Promise<string> {
  const { recognize } = await import("tesseract.js");
  const url = URL.createObjectURL(file);
  try {
    const res = await recognize(url, "fra+eng");
    return res.data.text || "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- Parseur heuristique ----------
const HEADER_WORDS = /^(nom|prenom|prénom|name|first|last|poids|weight|masse|kg|taille|height|cm|position|poste|role|rôle|date|naissance|birth|dob|n[°º]|num[eé]ro|equipe|équipe|team|club|total|moyenne|average|liste|joueurs?|athlètes?)$/i;
const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/;

function normalizeDate(raw: string): string | undefined {
  const m = raw.match(DATE_RE);
  if (!m) return undefined;
  const s = m[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[\/.\-]/).map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  let [d, mo, y] = parts;
  if (y < 100) y += y < 30 ? 2000 : 1900;
  if (d > 31 && mo <= 31) { [d, mo] = [mo, d]; }
  return `${y.toString().padStart(4, "0")}-${mo.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function looksLikeName(tok: string): boolean {
  if (tok.length < 2) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(tok)) return false;
  if (HEADER_WORDS.test(tok)) return false;
  return /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]*$/.test(tok);
}

function parseLine(line: string): ParsedAthlete | null {
  const clean = line.replace(/[|;]+/g, "\t").replace(/\s{2,}/g, "\t").trim();
  if (!clean) return null;

  const birthDate = normalizeDate(clean);
  const withoutDate = birthDate ? clean.replace(DATE_RE, " ").trim() : clean;

  const tokens = withoutDate.split(/[\s\t,]+/).filter(Boolean);
  if (tokens.length < 2) return null;

  // Détection masse / taille (kg / cm ou colonnes numériques)
  let mass: number | undefined;
  let height: number | undefined;
  const remaining: string[] = [];
  for (const raw of tokens) {
    const kg = raw.match(/^([0-9]+(?:[.,][0-9]+)?)\s*kg$/i);
    const cm = raw.match(/^([0-9]+(?:[.,][0-9]+)?)\s*cm$/i);
    const m = raw.match(/^([0-9]+(?:[.,][0-9]+)?)\s*m$/i);
    const numOnly = raw.match(/^([0-9]+(?:[.,][0-9]+)?)$/);
    if (kg) { mass = parseFloat(kg[1].replace(",", ".")); continue; }
    if (cm) { height = parseFloat(cm[1].replace(",", ".")); continue; }
    if (m) {
      const v = parseFloat(m[1].replace(",", "."));
      if (v > 1.2 && v < 2.4) { height = v * 100; continue; }
    }
    if (numOnly) {
      const v = parseFloat(numOnly[1].replace(",", "."));
      if (mass === undefined && v >= 30 && v <= 160) { mass = v; continue; }
      if (height === undefined && v >= 100 && v <= 230) { height = v; continue; }
      if (height === undefined && v >= 1.2 && v <= 2.4) { height = v * 100; continue; }
      // sinon dossard/numéro : on jette
      continue;
    }
    remaining.push(raw);
  }

  const nameTokens = remaining.filter(looksLikeName);
  if (nameTokens.length < 2) return null;

  // Un token entièrement en MAJUSCULES est probablement le nom de famille
  const upper = nameTokens.filter((t) => t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t));
  let firstName = "", lastName = "";
  if (upper.length >= 1 && upper.length < nameTokens.length) {
    lastName = upper.join(" ");
    firstName = nameTokens.filter((t) => !upper.includes(t)).join(" ");
  } else {
    firstName = nameTokens[0];
    lastName = nameTokens.slice(1, 3).join(" ");
  }
  firstName = firstName.trim();
  lastName = lastName.trim();
  if (!firstName || !lastName) return null;

  // Position : token restant hors nom, non numérique, non header
  const positionTokens = remaining.filter(
    (t) => !nameTokens.includes(t) && !HEADER_WORDS.test(t) && !/^\d/.test(t),
  );
  const position = positionTokens.length > 0 ? positionTokens.join(" ") : undefined;

  return { firstName, lastName, mass, height, position, birthDate };
}

function parseAthleteText(text: string): ParsedAthlete[] {
  const seen = new Set<string>();
  const out: ParsedAthlete[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Ignore lignes ne contenant que des mots d'en-tête
    const wordsOnly = line.split(/[\s\t,;|]+/).filter(Boolean);
    if (wordsOnly.length > 0 && wordsOnly.every((w) => HEADER_WORDS.test(w))) continue;
    const parsed = parseLine(line);
    if (!parsed) continue;
    const key = `${parsed.firstName.toLowerCase()}|${parsed.lastName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed);
  }
  return out;
}

// ---------- Entrée publique ----------
export async function parseAthletesFile(file: File): Promise<ParsedAthlete[]> {
  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  let text = "";
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/.test(name)) {
    text = await extractImageText(file);
  } else if (mime === "application/pdf" || name.endsWith(".pdf")) {
    text = await extractPdfText(file);
  } else if (
    mime.includes("officedocument.wordprocessingml") ||
    name.endsWith(".docx") || name.endsWith(".doc")
  ) {
    text = await extractDocxText(file);
  } else if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv")) {
    text = await file.text();
  } else {
    throw new Error(`Type de fichier non supporté : ${mime || name}`);
  }
  return parseAthleteText(text);
}
