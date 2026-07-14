import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
  BorderStyle, WidthType, ShadingType, ImageRun, AlignmentType, Header,
} from "docx";
import type { JumpResults, SprintResults } from "./fvCalculations";
import { getJumpRecommendations, getSprintRecommendations } from "./fvCalculations";
import type { Lang, TKey } from "./settings";

type T = (k: TKey) => string;

interface ExportTest {
  type: "jump" | "sprint";
  test_date: string;
  results: JumpResults | SprintResults;
  raw_data: Record<string, unknown>;
  athlete: { first_name: string; last_name: string; sport: string | null; body_mass: number | null };
  chartPng?: Uint8Array;
  logoPng?: Uint8Array;
  t?: T;
  lang?: Lang;
}

const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

function row(cells: string[], header = false, widths?: number[]): TableRow {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders,
      width: widths ? { size: widths[i], type: WidthType.DXA } : undefined,
      shading: header ? { fill: "84CC16", type: ShadingType.CLEAR } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: header })] })],
    })),
  });
}

const localeFor = (lang?: Lang) => (lang === "fr" ? "fr-FR" : lang === "ar" ? "ar" : "en-US");

export async function generateDOCX(test: ExportTest): Promise<Blob> {
  const t: T = test.t ?? ((k) => k as string);
  const lang = test.lang;
  const reco = test.type === "jump"
    ? getJumpRecommendations((test.results as JumpResults).profile, (test.results as JumpResults).FVimbalance, lang)
    : getSprintRecommendations(test.results as SprintResults, lang);

  const athleteName = `${test.athlete.first_name} ${test.athlete.last_name}`.trim();

  const children: (Paragraph | Table)[] = [];

  // Logo at top of body (Header would be repeated; keep as first paragraph)
  if (test.logoPng && test.logoPng.byteLength > 0) {
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new ImageRun({
        type: "png",
        data: test.logoPng,
        transformation: { width: 70, height: 70 },
        altText: { title: "Logo", description: "Logo", name: "logo" },
      })],
    }));
  }

  children.push(
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: test.type === "jump" ? t("fvJumpLabel") : t("fvSprintLabel"), bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: athleteName, bold: true, size: 28 })] }),
    new Paragraph({ children: [new TextRun({ text: [test.athlete.sport, new Date(test.test_date).toLocaleDateString(localeFor(lang)), test.athlete.body_mass ? `${test.athlete.body_mass} kg` : ""].filter(Boolean).join(" · "), italics: true, color: "666666" })] }),
    new Paragraph({ children: [new TextRun(" ")] }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t("mainIndicators"))] }),
  );

  if (test.type === "jump") {
    const r = test.results as JumpResults;
    const raw = test.raw_data as { bodyMass?: number; pushOffDistance?: number; trials?: { load: number; jumpHeight: number }[] };
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [3000, 3000, 3000],
      rows: [
        row([t("interpretation"), t("measured"), ""], true, [3000, 3000, 3000]),
        row(["F0", r.F0.toFixed(2), "N/kg"], false, [3000, 3000, 3000]),
        row(["V0", r.V0.toFixed(2), "m/s"], false, [3000, 3000, 3000]),
        row(["Pmax", r.Pmax.toFixed(1), "W/kg"], false, [3000, 3000, 3000]),
        row([t("fvSlope"), r.slopeFV.toFixed(2), "(N/kg)/(m/s)"], false, [3000, 3000, 3000]),
        row([t("optimalSlope"), r.FVoptimal.toFixed(2), "(N/kg)/(m/s)"], false, [3000, 3000, 3000]),
        row(["FVimb", r.FVimbalance.toFixed(1), "%"], false, [3000, 3000, 3000]),
        row(["R²", r.r2.toFixed(3), ""], false, [3000, 3000, 3000]),
        row([t("hMax"), (r.hMax * 100).toFixed(1), "cm"], false, [3000, 3000, 3000]),
        row([t("profileLabel"), r.profile.replace("_", " "), ""], false, [3000, 3000, 3000]),
      ],
    }));
    children.push(new Paragraph({ children: [new TextRun(" ")] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t("testConditions"))] }));
    children.push(new Paragraph({ children: [new TextRun(`${t("bodyMass")} : ${raw.bodyMass ?? "—"} kg · ${t("pushOff")} : ${raw.pushOffDistance ?? "—"} m`)] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t("trials"))] }));
    const w = [1200, 2200, 2200, 1700, 1700];
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: w,
      rows: [
        row([t("colNum"), t("addLoadKg"), t("colHeightCm"), t("colForceRel"), t("colVelocityMs")], true, w),
        ...r.points.map((p, i) => row([
          String(i + 1),
          (p.load ?? 0).toFixed(1),
          ((raw.trials?.[i]?.jumpHeight ?? 0) * 100).toFixed(1),
          p.force.toFixed(2),
          p.velocity.toFixed(2),
        ], false, w)),
      ],
    }));
  } else {
    const r = test.results as SprintResults;
    const raw = test.raw_data as { bodyMass?: number; height?: number; splits?: { distance: number; time: number }[]; windSpeed?: number };
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [3000, 3000, 3000],
      rows: [
        row([t("interpretation"), t("measured"), ""], true, [3000, 3000, 3000]),
        row(["F0 horiz.", r.F0.toFixed(2), "N/kg"], false, [3000, 3000, 3000]),
        row(["V0 / Vmax", r.Vmax.toFixed(2), "m/s"], false, [3000, 3000, 3000]),
        row(["Pmax", r.Pmax.toFixed(1), "W/kg"], false, [3000, 3000, 3000]),
        row([t("fvSlope"), r.slopeFV.toFixed(2), "(N/kg)/(m/s)"], false, [3000, 3000, 3000]),
        row(["RFmax", r.RFmax.toFixed(1), "%"], false, [3000, 3000, 3000]),
        row(["DRF", r.DRF.toFixed(2), "%/m·s⁻¹"], false, [3000, 3000, 3000]),
        row(["Tau", r.tau.toFixed(3), "s"], false, [3000, 3000, 3000]),
      ],
    }));
    children.push(new Paragraph({ children: [new TextRun(" ")] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t("testConditions"))] }));
    children.push(new Paragraph({ children: [new TextRun(`${t("bodyMass")} : ${raw.bodyMass ?? "—"} kg · ${t("heightM")} : ${raw.height ?? "—"} m · ${t("wind")} : ${raw.windSpeed ?? 0} m/s`)] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t("splits"))] }));
    const w = [3000, 3000, 3000];
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: w,
      rows: [
        row([t("colDistanceM"), t("colMeasuredS"), t("colModelS")], true, w),
        ...r.splits.map((s) => row([
          s.distance.toFixed(1),
          s.time.toFixed(3),
          ((s.distance / s.predicted) * s.time).toFixed(3),
        ], false, w)),
      ],
    }));
  }

  if (test.chartPng && test.chartPng.byteLength > 0) {
    children.push(new Paragraph({ children: [new TextRun(" ")] }));
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t("fvCurveSection"))] }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: "png",
        data: test.chartPng,
        transformation: { width: 520, height: 300 },
        altText: { title: "F-V", description: t("fvCurveSection"), name: "fv-chart" },
      })],
    }));
  }

  children.push(new Paragraph({ children: [new TextRun(" ")] }));
  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(reco.title)] }));
  children.push(new Paragraph({ children: [new TextRun(reco.description)] }));
  const w = [4500, 2500, 2000];
  children.push(new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: w,
    rows: [
      row([t("colExercise"), t("colSetsReps"), t("colIntensity")], true, w),
      ...reco.exercises.map((e) => row([e.name, e.sets, e.intensity], false, w)),
    ],
  }));

  const headerChildren: Paragraph[] = [];
  if (test.logoPng && test.logoPng.byteLength > 0) {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new ImageRun({
        type: "png",
        data: test.logoPng,
        transformation: { width: 50, height: 50 },
        altText: { title: "Logo", description: "Logo", name: "logo-header" },
      })],
    }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      headers: headerChildren.length > 0 ? { default: new Header({ children: headerChildren }) } : undefined,
      children,
    }],
  });

  return await Packer.toBlob(doc);
}

export function fileNameFor(athlete: { first_name: string; last_name: string }, isoDate: string, ext: "pdf" | "docx") {
  const safe = `${athlete.first_name}_${athlete.last_name}`.replace(/\s+/g, "_").replace(/[^\w\-]/g, "");
  const d = isoDate.slice(0, 10);
  return `${safe}_${d}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const DB_NAME = "fv-exports";
const STORE = "files";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "name" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveLocalExport(name: string, blob: Blob) {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ name, blob, savedAt: new Date().toISOString() });
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* */ }
}
