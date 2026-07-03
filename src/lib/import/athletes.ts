/**
 * Import local d'une liste d'athlètes depuis un PDF, un DOCX ou une image.
 * Aucune API distante : pdfjs-dist (PDF), JSZip (DOCX) et tesseract.js (OCR)
 * s'exécutent 100 % dans le navigateur.
 *
 * Stratégie : reconstruire les LIGNES de tableau (cellules) plutôt que du texte
 * brut, détecter l'en-tête pour mapper chaque colonne à un champ, et gérer les
 * cellules multi-lignes (ex. « FATIMA ZAHRA »).
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

type Field = "lastName" | "firstName" | "mass" | "height" | "birthDate" | "bib" | "position";
type Row = string[]; // cellules d'une ligne de tableau

// ---------- Extraction : PDF ----------
async function extractPdfRows(file: File): Promise<Row[]> {
  const pdfjs = await import("pdfjs-dist");
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const rows: Row[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    type Item = { x: number; y: number; s: string; h: number };
    const items: Item[] = [];
    for (const it of content.items as Array<{ str: string; transform: number[]; height?: number }>) {
      const s = (it.str || "").trim();
      if (!s) continue;
      items.push({ x: it.transform[4], y: it.transform[5], s, h: it.height || 10 });
    }
    if (!items.length) continue;
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    // Regroupe par bande y (tolérance ~ demi-hauteur ligne)
    const bands: Item[][] = [];
    const tol = 4;
    for (const it of items) {
      const b = bands[bands.length - 1];
      if (b && Math.abs(b[0].y - it.y) <= tol) b.push(it);
      else bands.push([it]);
    }
    for (const band of bands) {
      band.sort((a, b) => a.x - b.x);
      // Regroupe en cellules quand l'écart x est important
      const cells: string[] = [];
      let cur = band[0].s;
      let prev = band[0];
      for (let k = 1; k < band.length; k++) {
        const cur2 = band[k];
        const gap = cur2.x - (prev.x + prev.s.length * (prev.h * 0.5));
        if (gap > 12) {
          cells.push(cur.trim());
          cur = cur2.s;
        } else {
          cur += " " + cur2.s;
        }
        prev = cur2;
      }
      cells.push(cur.trim());
      rows.push(cells.filter((c) => c.length));
    }
  }
  return rows;
}

// ---------- Extraction : DOCX ----------
async function extractDocxRows(file: File): Promise<Row[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = await JSZip.loadAsync(buf);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("DOCX invalide : word/document.xml introuvable");
  const xml = await docFile.async("string");
  const rows: Row[] = [];

  // 1) Tableaux : parser explicitement <w:tr>/<w:tc>
  const trRe = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
  const tcRe = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
  const pRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  const tRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  const decode = (s: string) =>
    s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
     .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const cellText = (tcInner: string): string => {
    const paras: string[] = [];
    let mp: RegExpExecArray | null;
    pRe.lastIndex = 0;
    while ((mp = pRe.exec(tcInner)) !== null) {
      let piece = "";
      let mt: RegExpExecArray | null;
      const inner = mp[1];
      const localTRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      while ((mt = localTRe.exec(inner)) !== null) piece += mt[1];
      const line = decode(piece).replace(/\s+/g, " ").trim();
      if (line) paras.push(line);
    }
    return paras.join(" ");
  };

  let mtr: RegExpExecArray | null;
  const seenTables = new Set<number>();
  while ((mtr = trRe.exec(xml)) !== null) {
    seenTables.add(mtr.index);
    const cells: string[] = [];
    let mtc: RegExpExecArray | null;
    tcRe.lastIndex = 0;
    while ((mtc = tcRe.exec(mtr[1])) !== null) {
      cells.push(cellText(mtc[1]));
    }
    if (cells.some((c) => c.length)) rows.push(cells);
  }

  // 2) Fallback : si aucun tableau détecté, chaque paragraphe = une ligne mono-cellule
  if (rows.length === 0) {
    let mp: RegExpExecArray | null;
    pRe.lastIndex = 0;
    while ((mp = pRe.exec(xml)) !== null) {
      let piece = "";
      let mt: RegExpExecArray | null;
      const localTRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
      while ((mt = localTRe.exec(mp[1])) !== null) piece += mt[1];
      const line = decode(piece).replace(/\s+/g, " ").trim();
      if (line) rows.push([line]);
    }
  }
  // Aussi: tRe utilisé pour éviter lint « unused »
  void tRe;
  return rows;
}

// ---------- Extraction : Image (OCR) ----------
async function extractImageRows(file: File): Promise<Row[]> {
  const { recognize } = await import("tesseract.js");
  const url = URL.createObjectURL(file);
  try {
    const res = await recognize(url, "fra+eng");
    // Utilise les lignes détectées par Tesseract (data.lines) avec bbox des mots
    type TWord = { text: string; bbox: { x0: number; x1: number; y0: number; y1: number } };
    type TLine = { words: TWord[]; bbox: { y0: number; y1: number } };
    const data = res.data as unknown as { lines?: TLine[]; text?: string };
    const rows: Row[] = [];
    if (data.lines && data.lines.length) {
      // Estimer un seuil de gap sur toute la page
      const allGaps: number[] = [];
      for (const ln of data.lines) {
        const ws = ln.words.filter((w) => w.text.trim());
        for (let k = 1; k < ws.length; k++) {
          allGaps.push(ws[k].bbox.x0 - ws[k - 1].bbox.x1);
        }
      }
      const median = (arr: number[]) => {
        if (!arr.length) return 0;
        const a = [...arr].sort((x, y) => x - y);
        return a[Math.floor(a.length / 2)];
      };
      const gapThreshold = Math.max(20, median(allGaps) * 3);
      for (const ln of data.lines) {
        const ws = ln.words.filter((w) => w.text.trim());
        if (!ws.length) continue;
        const cells: string[] = [];
        let cur = ws[0].text;
        for (let k = 1; k < ws.length; k++) {
          const gap = ws[k].bbox.x0 - ws[k - 1].bbox.x1;
          if (gap > gapThreshold) { cells.push(cur.trim()); cur = ws[k].text; }
          else cur += " " + ws[k].text;
        }
        cells.push(cur.trim());
        rows.push(cells.filter(Boolean));
      }
    } else if (data.text) {
      for (const line of data.text.split(/\r?\n/)) {
        const cells = line.split(/\s{2,}|\t+/).map((s) => s.trim()).filter(Boolean);
        if (cells.length) rows.push(cells);
      }
    }
    return rows;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- Extraction : texte brut ----------
function extractPlainRows(text: string): Row[] {
  const rows: Row[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(/\t+|\s{2,}|[;|]+|,\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length) rows.push(parts);
  }
  return rows;
}

// ---------- Détection & normalisation ----------
const HEADER_MAP: Array<{ field: Field; re: RegExp }> = [
  { field: "lastName",  re: /^(nom|last\s*name|surname|family)$/i },
  { field: "firstName", re: /^(pr[eé]nom|first\s*name|given)$/i },
  { field: "birthDate", re: /^(date(\s*de)?(\s*naissance)?|naissance|birth(\s*date)?|dob|ddn)$/i },
  { field: "height",    re: /^(taille|height|stature|cm)$/i },
  { field: "mass",      re: /^(poids|weight|masse|kg)$/i },
  { field: "bib",       re: /^(n[°ºo\.]?|#|num[eé]ro|dossard)$/i },
  { field: "position",  re: /^(poste|position|role|r[oô]le)$/i },
];
const TITLE_RE = /(liste\s+nominative|saison\s+sportive|équipe|equipe|club|effectif)/i;
const DATE_RE = /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/;
const BIB_RE = /^\.?\s*\d{1,3}\s*\.?$/;

function headerFieldFor(cell: string): Field | null {
  const c = cell.replace(/\s+/g, " ").trim();
  if (!c) return null;
  for (const { field, re } of HEADER_MAP) if (re.test(c)) return field;
  return null;
}

function detectHeader(rows: Row[]): { index: number; map: Record<number, Field> } | null {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    const map: Record<number, Field> = {};
    let hits = 0;
    for (let j = 0; j < row.length; j++) {
      const f = headerFieldFor(row[j]);
      if (f) { map[j] = f; hits++; }
    }
    if (hits >= 2) return { index: i, map };
  }
  return null;
}

function mergeMultilineHeader(rows: Row[]): Row[] {
  // Ex : ["Date de", "Naissance"] sur 2 lignes consécutives dans la même colonne.
  // Peu utile ici car nos extracteurs gèrent déjà les <w:p> internes, on garde une passe simple.
  return rows;
}

function normalizeDate(raw: string): string | undefined {
  const m = raw.match(DATE_RE);
  if (!m) return undefined;
  const s = m[1];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[\/.\-]/).map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  let [d, mo, y] = parts;
  if (y < 100) y += y < 30 ? 2000 : 1900;
  // Format FR par défaut (JJ/MM/AAAA) ; on inverse seulement si incohérent
  if (mo > 12 && d <= 12) [d, mo] = [mo, d];
  if (mo > 12 || d > 31) return undefined;
  return `${y.toString().padStart(4, "0")}-${mo.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function parseNumber(raw: string): number | undefined {
  const m = raw.match(/([0-9]+(?:[.,][0-9]+)?)/);
  if (!m) return undefined;
  const v = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(v) ? v : undefined;
}
function parseHeight(raw: string): number | undefined {
  const v = parseNumber(raw);
  if (v === undefined) return undefined;
  if (v >= 1.2 && v <= 2.4) return Math.round(v * 100);
  if (v >= 100 && v <= 230) return Math.round(v);
  return undefined;
}
function parseMass(raw: string): number | undefined {
  const v = parseNumber(raw);
  if (v === undefined) return undefined;
  if (v >= 25 && v <= 200) return v;
  return undefined;
}

function cleanName(s: string): string {
  return s.replace(/[.,;|]+/g, " ").replace(/\s+/g, " ").trim();
}

function isContinuationRow(row: Row, headerMap: Record<number, Field> | null): boolean {
  // Ligne « suite » d'une ligne précédente : pas de dossard/date, seulement des mots (majuscules probablement)
  const joined = row.join(" ").trim();
  if (!joined) return false;
  if (DATE_RE.test(joined)) return false;
  // Aucune colonne ne ressemble à un dossard clair (.5. ou 5)
  const hasBib = row.some((c) => BIB_RE.test(c.trim()));
  if (hasBib) return false;
  // Aucune valeur numérique standalone plausible (taille/poids)
  const numCells = row.filter((c) => /^\s*\d+([.,]\d+)?\s*(kg|cm|m)?\s*$/i.test(c));
  if (numCells.length >= 2) return false;
  // Que des lettres/espaces → probablement suite de nom/prénom
  const alphaOnly = row.every((c) => /^[A-Za-zÀ-ÿ' \-]+$/.test(c));
  void headerMap;
  return alphaOnly;
}

function isHeaderOrTitle(row: Row): boolean {
  const joined = row.join(" ").trim();
  if (!joined) return true;
  if (TITLE_RE.test(joined)) return true;
  // Ligne entièrement composée de mots d'en-tête
  const words = joined.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const headerHits = words.filter((w) => headerFieldFor(w) !== null).length;
  return headerHits >= Math.max(2, Math.ceil(words.length * 0.6));
}

// ---------- Assemblage ----------
function buildAthletes(rows: Row[]): ParsedAthlete[] {
  rows = mergeMultilineHeader(rows);
  const header = detectHeader(rows);
  const startIdx = header ? header.index + 1 : 0;
  const map = header?.map ?? null;

  const dataRows: Row[] = [];
  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (isHeaderOrTitle(row)) continue;
    if (dataRows.length > 0 && isContinuationRow(row, map)) {
      // Fusion cellule à cellule sur la ligne précédente
      const prev = dataRows[dataRows.length - 1];
      const merged: Row = [];
      const len = Math.max(prev.length, row.length);
      for (let j = 0; j < len; j++) {
        const a = (prev[j] || "").trim();
        const b = (row[j] || "").trim();
        merged.push([a, b].filter(Boolean).join(" ").trim());
      }
      dataRows[dataRows.length - 1] = merged;
      continue;
    }
    dataRows.push(row);
  }

  const out: ParsedAthlete[] = [];
  const seen = new Set<string>();
  for (const row of dataRows) {
    const athlete = map ? parseWithMap(row, map) : parseHeuristic(row);
    if (!athlete) continue;
    const key = `${athlete.lastName.toLowerCase()}|${athlete.firstName.toLowerCase()}|${athlete.birthDate ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(athlete);
  }
  return out;
}

function parseWithMap(row: Row, map: Record<number, Field>): ParsedAthlete | null {
  const get = (field: Field): string => {
    for (const [idxStr, f] of Object.entries(map)) {
      if (f === field) {
        const idx = parseInt(idxStr, 10);
        return (row[idx] || "").trim();
      }
    }
    return "";
  };
  const lastName = cleanName(get("lastName"));
  const firstName = cleanName(get("firstName"));
  if (!lastName || !firstName) return null;
  const heightRaw = get("height");
  const massRaw = get("mass");
  const dateRaw = get("birthDate");
  const posRaw = get("position");
  return {
    lastName,
    firstName,
    height: heightRaw ? parseHeight(heightRaw) : undefined,
    mass: massRaw ? parseMass(massRaw) : undefined,
    birthDate: dateRaw ? normalizeDate(dateRaw) : undefined,
    position: posRaw || undefined,
  };
}

function parseHeuristic(row: Row): ParsedAthlete | null {
  // Fallback : reconstruire à partir des cellules brutes
  const flat = row.join(" \t ");
  const birthDate = normalizeDate(flat);
  const cells = row.map((c) => c.trim()).filter((c) => c && !BIB_RE.test(c));
  const nameCells: string[] = [];
  let mass: number | undefined, height: number | undefined;
  for (const c of cells) {
    if (DATE_RE.test(c)) continue;
    const asNumOnly = /^[0-9]+(?:[.,][0-9]+)?\s*(kg|cm|m)?$/i.test(c);
    if (asNumOnly) {
      // Décider taille vs masse selon la plage
      const h = parseHeight(c);
      if (h && height === undefined) { height = h; continue; }
      const m = parseMass(c);
      if (m && mass === undefined) { mass = m; continue; }
      continue;
    }
    nameCells.push(c);
  }
  if (nameCells.length < 2) return null;
  const lastName = cleanName(nameCells[0]);
  const firstName = cleanName(nameCells.slice(1).join(" "));
  if (!lastName || !firstName) return null;
  return { lastName, firstName, mass, height, birthDate };
}

// ---------- Entrée publique ----------
export async function parseAthletesFile(file: File): Promise<ParsedAthlete[]> {
  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  let rows: Row[] = [];
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|bmp|gif)$/.test(name)) {
    rows = await extractImageRows(file);
  } else if (mime === "application/pdf" || name.endsWith(".pdf")) {
    rows = await extractPdfRows(file);
  } else if (
    mime.includes("officedocument.wordprocessingml") ||
    name.endsWith(".docx") || name.endsWith(".doc")
  ) {
    rows = await extractDocxRows(file);
  } else if (mime.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv")) {
    rows = extractPlainRows(await file.text());
  } else {
    throw new Error(`Type de fichier non supporté : ${mime || name}`);
  }
  return buildAthletes(rows);
}
