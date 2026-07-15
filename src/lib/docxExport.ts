import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
  BorderStyle, WidthType, ShadingType, ImageRun, AlignmentType,
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

const BLUE = "1F7CC7";
const GREEN = "84CC16";
const GREY = "CCCCCC";
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: GREY };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const bordersNone = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function row(cells: string[], header = false, widths?: number[]): TableRow {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders,
      width: widths ? { size: widths[i], type: WidthType.DXA } : undefined,
      shading: header ? { fill: GREEN, type: ShadingType.CLEAR } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: header })] })],
    })),
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: BLUE, size: 28 })],
  });
}

function fitQualityKey(r2: number): TKey {
  if (r2 >= 0.95) return "fitQualityGood";
  if (r2 >= 0.85) return "fitQualityModerate";
  return "fitQualityWeak";
}

const localeFor = (lang?: Lang) => (lang === "fr" ? "fr-FR" : lang === "ar" ? "ar" : "en-US");

export async function generateDOCX(test: ExportTest): Promise<Blob> {
  const t: T = test.t ?? ((k) => k as string);
  const lang = test.lang;
  const reco = test.type === "jump"
    ? getJumpRecommendations((test.results as JumpResults).profile, (test.results as JumpResults).FVimbalance, lang)
    : getSprintRecommendations(test.results as SprintResults, lang);

  const athleteName = `${test.athlete.first_name} ${test.athlete.last_name}`.trim().toUpperCase();
  const title = test.type === "jump" ? t("reportTitleJump") : t("reportTitleSprint");
  const dateStr = new Date(test.test_date).toLocaleDateString(localeFor(lang));

  const children: (Paragraph | Table)[] = [];

  // ===== HEADER: logo (left) | title (center) | date (right) =====
  const headerCells: TableCell[] = [];
  headerCells.push(new TableCell({
    borders: bordersNone,
    width: { size: 2400, type: WidthType.DXA },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: test.logoPng && test.logoPng.byteLength > 0
        ? [new ImageRun({
            type: "png",
            data: test.logoPng,
            transformation: { width: 70, height: 70 },
            altText: { title: "Logo", description: "Logo", name: "logo" },
          })]
        : [new TextRun("")],
    })],
  }));
  headerCells.push(new TableCell({
    borders: bordersNone,
    width: { size: 5000, type: WidthType.DXA },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true, color: BLUE, size: 32 })],
    })],
  }));
  headerCells.push(new TableCell({
    borders: bordersNone,
    width: { size: 1600, type: WidthType.DXA },
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: dateStr, italics: true, size: 22 })],
    })],
  }));
  children.push(new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: [2400, 5000, 1600],
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [new TableRow({ children: headerCells })],
  }));

  // ===== ATHLETE BLOCK =====
  children.push(new Paragraph({
    spacing: { before: 240, after: 0 },
    children: [new TextRun({ text: `${t("nameLabel")}: ${athleteName}`, bold: true, size: 26 })],
  }));
  children.push(new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: `${t("sportLabel")}: ${test.athlete.sport ?? "—"} ·`, italics: true })],
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `${t("massLabelUp")}: ${test.athlete.body_mass ?? "—"} kg`, italics: true })],
  }));

  if (test.type === "jump") {
    const r = test.results as JumpResults;
    const raw = test.raw_data as { bodyMass?: number; pushOffDistance?: number; trials?: { load: number; jumpHeight: number }[] };

    // Test conditions
    children.push(sectionHeading(t("testConditions")));
    children.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun(`${t("bodyMass")}: ${raw.bodyMass ?? "—"} kg ·`)] }));
    children.push(new Paragraph({ children: [new TextRun(`${t("pushOff")}: ${raw.pushOffDistance ?? "—"} m`)] }));

    // Trials
    children.push(sectionHeading(t("trials")));
    const wTrials = [800, 2100, 2200, 2000, 1900];
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: wTrials,
      rows: [
        row([t("colNum"), t("loadsKg"), t("jumpHeightCm"), t("forceNkg"), t("velocityMs")], true, wTrials),
        ...r.points.map((p, i) => row([
          String(i + 1),
          (p.load ?? 0).toFixed(1),
          ((raw.trials?.[i]?.jumpHeight ?? 0) * 100).toFixed(1),
          p.force.toFixed(2),
          p.velocity.toFixed(2),
        ], false, wTrials)),
      ],
    }));

    // Main indicators
    children.push(sectionHeading(t("mainIndicators")));
    const wInd = [3000, 3000, 3000];
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: wInd,
      rows: [
        row([t("tblIndicator"), t("tblValue"), t("tblUnit")], true, wInd),
        row(["F0", r.F0.toFixed(2), "N/kg"], false, wInd),
        row(["V0", r.V0.toFixed(2), "m/s"], false, wInd),
        row(["Pmax", r.Pmax.toFixed(1), "W/kg"], false, wInd),
        row([t("fvSlope"), r.slopeFV.toFixed(2), "(N/kg)/(m/s)"], false, wInd),
        row([t("optimalSlope"), r.FVoptimal.toFixed(2), "(N/kg)/(m/s)"], false, wInd),
        row(["FVimb", r.FVimbalance.toFixed(1), "%"], false, wInd),
        row([t("hMax"), (r.hMax * 100).toFixed(1), "cm"], false, wInd),
        row([t("profileLabel"), r.profile.replace("_", " "), ""], false, wInd),
      ],
    }));

    // R² line
    children.push(new Paragraph({
      spacing: { before: 200 },
      children: [
        new TextRun({ text: `R² = ${r.r2.toFixed(3)}   `, bold: true, color: BLUE }),
        new TextRun({ text: t(fitQualityKey(r.r2)) }),
      ],
    }));
  } else {
    const r = test.results as SprintResults;
    const raw = test.raw_data as { bodyMass?: number; height?: number; splits?: { distance: number; time: number }[]; windSpeed?: number };

    children.push(sectionHeading(t("testConditions")));
    children.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun(`${t("bodyMass")}: ${raw.bodyMass ?? "—"} kg ·`)] }));
    children.push(new Paragraph({ spacing: { after: 0 }, children: [new TextRun(`${t("heightM")}: ${raw.height ?? "—"} m ·`)] }));
    children.push(new Paragraph({ children: [new TextRun(`${t("wind")}: ${raw.windSpeed ?? 0} m/s`)] }));

    children.push(sectionHeading(t("splits")));
    const wSp = [3000, 3000, 3000];
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: wSp,
      rows: [
        row([t("colDistanceM"), t("colMeasuredS"), t("colModelS")], true, wSp),
        ...r.splits.map((s) => row([
          s.distance.toFixed(1),
          s.time.toFixed(3),
          ((s.distance / s.predicted) * s.time).toFixed(3),
        ], false, wSp)),
      ],
    }));

    children.push(sectionHeading(t("mainIndicators")));
    const wInd = [3000, 3000, 3000];
    children.push(new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: wInd,
      rows: [
        row([t("tblIndicator"), t("tblValue"), t("tblUnit")], true, wInd),
        row(["F0 horiz.", r.F0.toFixed(2), "N/kg"], false, wInd),
        row(["V0 / Vmax", r.Vmax.toFixed(2), "m/s"], false, wInd),
        row(["Pmax", r.Pmax.toFixed(1), "W/kg"], false, wInd),
        row([t("fvSlope"), r.slopeFV.toFixed(2), "(N/kg)/(m/s)"], false, wInd),
        row(["RFmax", r.RFmax.toFixed(1), "%"], false, wInd),
        row(["DRF", r.DRF.toFixed(2), "%/m·s⁻¹"], false, wInd),
        row(["Tau", r.tau.toFixed(3), "s"], false, wInd),
      ],
    }));
  }

  // FV Curve
  if (test.chartPng && test.chartPng.byteLength > 0) {
    children.push(new Paragraph({ children: [new TextRun("")], pageBreakBefore: true }));
    children.push(sectionHeading(t("fvCurveSection")));
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

  // Interpretation
  children.push(new Paragraph({
    spacing: { before: 320, after: 120 },
    children: [
      new TextRun({ text: `${t("interpretationPrefix")} `, bold: true, color: BLUE, size: 28 }),
      new TextRun({ text: reco.title, bold: true, size: 28 }),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 200 }, children: [new TextRun(reco.description)] }));
  const wRec = [4500, 2500, 2000];
  children.push(new Table({
    width: { size: 9000, type: WidthType.DXA },
    columnWidths: wRec,
    rows: [
      row([t("colExercise"), t("colSetsReps"), t("colIntensity")], true, wRec),
      ...reco.exercises.map((e) => row([e.name, e.sets, e.intensity], false, wRec)),
    ],
  }));

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
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
