import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FVChart } from "@/components/FVChart";
import {
  Download, ChevronLeft, Activity, Zap, Gauge, FileText, FileType, Save,
  BookOpen, CheckCircle2, AlertTriangle, ChevronDown,
} from "lucide-react";
import {
  type JumpResults, type SprintResults,
  getJumpRecommendations, getSprintRecommendations,
} from "@/lib/fvCalculations";
import { getJumpTarget, getSprintTarget, getSportTargets } from "@/lib/sportTargets";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { generateDOCX, downloadBlob, fileNameFor, saveLocalExport } from "@/lib/docxExport";
import { saveBlobToTarget } from "@/lib/exportTarget";
import {
  getLocalTest, getLocalTests, markLocalTestSaved, saveLocalTest, setTestDraft,
} from "@/lib/localHistory";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TestRecord {
  id: string;
  type: "jump" | "sprint";
  test_date: string;
  results: JumpResults | SprintResults;
  raw_data: Record<string, unknown>;
  athlete_id: string;
  athletes: { first_name: string; last_name: string; sport: string | null; body_mass: number | null } | null;
}

async function generateStructuredPDF(test: TestRecord, chartDataUrl?: string): Promise<Blob> {
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) { pdf.addPage(); y = margin; }
  };

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageW, 28, "F");
  pdf.setTextColor(132, 204, 22);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text(test.type === "jump" ? "F-V PROFILE — VERTICAL JUMP" : "F-V PROFILE — LINEAR SPRINT", margin, 12);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  const athleteName = test.athletes ? `${test.athletes.first_name} ${test.athletes.last_name}` : "Unknown athlete";
  pdf.text(athleteName, margin, 20);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  const subline = [
    test.athletes?.sport ?? "",
    new Date(test.test_date).toLocaleDateString(),
    test.athletes?.body_mass ? `${test.athletes.body_mass} kg` : "",
  ].filter(Boolean).join(" · ");
  pdf.text(subline, margin, 25);
  pdf.setTextColor(0, 0, 0);
  y = 36;

  const sectionTitle = (title: string) => {
    ensureSpace(10);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(15, 23, 42);
    pdf.text(title, margin, y);
    pdf.setDrawColor(132, 204, 22); pdf.setLineWidth(0.6);
    pdf.line(margin, y + 1.5, pageW - margin, y + 1.5);
    y += 7; pdf.setTextColor(0, 0, 0);
  };

  const drawMetricGrid = (metrics: Array<{ label: string; value: string; unit: string }>) => {
    const cols = 3;
    const colW = (pageW - margin * 2) / cols;
    const rowH = 18;
    metrics.forEach((m, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      if (col === 0 && row > 0) ensureSpace(rowH);
      const x = margin + col * colW;
      const cy = y + row * rowH;
      pdf.setDrawColor(220); pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x + 1, cy, colW - 2, rowH - 2, 2, 2, "FD");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(100);
      pdf.text(m.label.toUpperCase(), x + 3, cy + 4);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.setTextColor(15, 23, 42);
      pdf.text(m.value, x + 3, cy + 11);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(100);
      pdf.text(m.unit, x + 3, cy + 15);
    });
    const rows = Math.ceil(metrics.length / cols);
    y += rows * rowH + 2; pdf.setTextColor(0, 0, 0);
  };

  const drawTable = (headers: string[], rows: string[][]) => {
    const colW = (pageW - margin * 2) / headers.length;
    const rowH = 7;
    ensureSpace(rowH);
    pdf.setFillColor(132, 204, 22);
    pdf.rect(margin, y, pageW - margin * 2, rowH, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.setTextColor(15, 23, 42);
    headers.forEach((h, i) => pdf.text(h, margin + i * colW + 2, y + 5));
    y += rowH;
    pdf.setFont("helvetica", "normal"); pdf.setTextColor(0, 0, 0);
    rows.forEach((r, idx) => {
      ensureSpace(rowH);
      if (idx % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, y, pageW - margin * 2, rowH, "F"); }
      r.forEach((cell, i) => pdf.text(cell, margin + i * colW + 2, y + 5));
      y += rowH;
    });
    y += 2;
  };

  const drawParagraph = (text: string, size = 9) => {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, pageW - margin * 2);
    lines.forEach((ln: string) => {
      ensureSpace(size * 0.45);
      pdf.text(ln, margin, y);
      y += size * 0.45;
    });
    y += 2;
  };

  if (test.type === "jump") {
    const r = test.results as JumpResults;
    const raw = test.raw_data as { bodyMass?: number; pushOffDistance?: number; trials?: { load: number; jumpHeight: number }[] };
    sectionTitle("Main indicators");
    drawMetricGrid([
      { label: "F0", value: r.F0.toFixed(2), unit: "N/kg" },
      { label: "V0", value: r.V0.toFixed(2), unit: "m/s" },
      { label: "Pmax", value: r.Pmax.toFixed(1), unit: "W/kg" },
      { label: "F-V slope", value: r.slopeFV.toFixed(2), unit: "(N/kg)/(m/s)" },
      { label: "Optimal slope", value: r.FVoptimal.toFixed(2), unit: "(N/kg)/(m/s)" },
      { label: "FVimb", value: `${r.FVimbalance.toFixed(1)}`, unit: "% (imbalance)" },
      { label: "R²", value: r.r2.toFixed(3), unit: "fit quality" },
      { label: "h max", value: (r.hMax * 100).toFixed(1), unit: "cm (BW)" },
      { label: "Profile", value: r.profile.replace("_", " "), unit: "" },
    ]);
    sectionTitle("Test conditions");
    drawParagraph(`Body mass: ${raw.bodyMass ?? "—"} kg · Push-off (hPO): ${raw.pushOffDistance ?? "—"} m`);
    sectionTitle("Trials");
    drawTable(
      ["#", "Add. load (kg)", "Height (cm)", "F (N/kg)", "V (m/s)"],
      r.points.map((p, i) => [
        String(i + 1),
        (p.load ?? 0).toFixed(1),
        ((raw.trials?.[i]?.jumpHeight ?? 0) * 100).toFixed(1),
        p.force.toFixed(2),
        p.velocity.toFixed(2),
      ]),
    );
  } else {
    const r = test.results as SprintResults;
    const raw = test.raw_data as { bodyMass?: number; height?: number; splits?: { distance: number; time: number }[]; windSpeed?: number };
    sectionTitle("Main indicators");
    drawMetricGrid([
      { label: "F0 horiz.", value: r.F0.toFixed(2), unit: "N/kg" },
      { label: "V0 / Vmax", value: r.Vmax.toFixed(2), unit: "m/s" },
      { label: "Pmax", value: r.Pmax.toFixed(1), unit: "W/kg" },
      { label: "F-V slope", value: r.slopeFV.toFixed(2), unit: "(N/kg)/(m/s)" },
      { label: "RFmax", value: r.RFmax.toFixed(1), unit: "%" },
      { label: "DRF", value: r.DRF.toFixed(2), unit: "%/m·s⁻¹" },
      { label: "Tau", value: r.tau.toFixed(3), unit: "s" },
    ]);
    sectionTitle("Test conditions");
    drawParagraph(`Mass: ${raw.bodyMass ?? "—"} kg · Height: ${raw.height ?? "—"} m · Wind: ${raw.windSpeed ?? 0} m/s`);
    sectionTitle("Splits");
    drawTable(
      ["Distance (m)", "Measured (s)", "Model (s)"],
      r.splits.map((s) => [s.distance.toFixed(1), s.time.toFixed(3), ((s.distance / s.predicted) * s.time).toFixed(3)]),
    );
  }

  if (chartDataUrl) {
    try {
      const props = pdf.getImageProperties(chartDataUrl);
      const imgW = pageW - margin * 2;
      const imgH = (props.height * imgW) / props.width;
      ensureSpace(imgH + 8);
      sectionTitle("Force-Velocity curve");
      pdf.addImage(chartDataUrl, "PNG", margin, y, imgW, imgH);
      y += imgH + 4;
    } catch { /* */ }
  }

  const reco = test.type === "jump"
    ? getJumpRecommendations((test.results as JumpResults).profile, (test.results as JumpResults).FVimbalance)
    : getSprintRecommendations(test.results as SprintResults);
  sectionTitle(reco.title);
  drawParagraph(reco.description);
  drawTable(["Exercise", "Sets × Reps", "Intensity"], reco.exercises.map((e) => [e.name, e.sets, e.intensity]));

  const pageCount = pdf.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(150);
    pdf.text(`SprintLab FV Pro · ${athleteName} · page ${p}/${pageCount}`, margin, pageH - 6);
  }
  return pdf.output("blob");
}

export default function TestResults() {
  const { testId = "" } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [savedInHistory, setSavedInHistory] = useState(false);

  useEffect(() => {
    const local = getLocalTest(testId);
    if (local) {
      setTest({
        id: local.id,
        type: local.type,
        test_date: local.test_date,
        results: local.results,
        raw_data: local.raw_data,
        athlete_id: local.athlete_id,
        athletes: local.athlete_snapshot,
      });
    }
    setLoading(false);
  }, [testId]);

  useEffect(() => {
    if (!test) return;
    setSavedInHistory(getLocalTests().some((t) => t.id === test.id));
  }, [test]);

  const captureChartDataUrl = async (): Promise<string | undefined> => {
    if (!chartRef.current) return undefined;
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const svg = chartRef.current.querySelector("svg");
      if (svg) {
        const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

        // Resolve CSS variables (hsl(var(--...))) by computing them via a temp element,
        // then inline the resolved colors on the cloned SVG so the rasterizer can render them.
        const resolver = document.createElement("span");
        resolver.style.position = "absolute";
        resolver.style.visibility = "hidden";
        document.body.appendChild(resolver);
        const resolveColor = (value: string | null): string | null => {
          if (!value) return null;
          if (!value.includes("var(") && !value.startsWith("hsl(") && !value.startsWith("rgb(")) {
            // plain value (e.g. "#fff", "none", "currentColor") — keep as is unless currentColor
            if (value !== "currentColor") return value;
          }
          try {
            resolver.style.color = "";
            resolver.style.color = value;
            const computed = getComputedStyle(resolver).color;
            return computed || value;
          } catch {
            return value;
          }
        };

        const srcEls = Array.from(svg.querySelectorAll<SVGElement>("*"));
        const dstEls = Array.from(clonedSvg.querySelectorAll<SVGElement>("*"));
        const len = Math.min(srcEls.length, dstEls.length);
        for (let i = 0; i < len; i++) {
          const src = srcEls[i];
          const dst = dstEls[i];
          const cs = getComputedStyle(src);
          const fillAttr = src.getAttribute("fill");
          const strokeAttr = src.getAttribute("stroke");
          const fill = resolveColor(fillAttr ?? cs.fill);
          const stroke = resolveColor(strokeAttr ?? cs.stroke);
          if (fill && fill !== "none") dst.setAttribute("fill", fill);
          if (stroke && stroke !== "none") dst.setAttribute("stroke", stroke);
          // Preserve text color too
          if (src.tagName.toLowerCase() === "text") {
            const textColor = resolveColor(cs.fill) ?? "#000";
            dst.setAttribute("fill", textColor);
          }
        }
        document.body.removeChild(resolver);

        // Force a white background on the first rect (chart background) for legibility in reports.
        const firstRect = clonedSvg.querySelector("rect");
        if (firstRect) firstRect.setAttribute("fill", "#ffffff");

        const serialized = new XMLSerializer().serializeToString(clonedSvg);
        const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        try {
          const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("svg-load-failed"));
            img.src = url;
          });
          const canvas = document.createElement("canvas");
          const viewBox = clonedSvg.viewBox.baseVal;
          const sourceWidth = image.naturalWidth || viewBox.width || svg.clientWidth || 360;
          const sourceHeight = image.naturalHeight || viewBox.height || svg.clientHeight || 300;
          canvas.width = Math.round(sourceWidth * 2);
          canvas.height = Math.round(sourceHeight * 2);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL("image/png");
          }
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      const canvas = await html2canvas(chartRef.current, {
        scale: Math.min(window.devicePixelRatio || 2, 3),
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });
      return canvas.toDataURL("image/png");
    } catch { return undefined; }
  };

  const dataUrlToBytes = (dataUrl?: string): Uint8Array | undefined => {
    if (!dataUrl) return undefined;
    const b64 = dataUrl.split(",")[1] ?? "";
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch {
      return undefined;
    }
  };

  const doExport = async (format: "pdf" | "docx") => {
    if (!test) return;
    setExporting(true);
    try {
      const athlete = test.athletes ?? { first_name: "athlete", last_name: "", sport: null, body_mass: null };
      const filename = fileNameFor(athlete, test.test_date, format);
      const chartDataUrl = await captureChartDataUrl();
      let blob: Blob;
      if (format === "pdf") blob = await generateStructuredPDF(test, chartDataUrl);
      else {
        const chartPng = dataUrlToBytes(chartDataUrl);
        blob = await generateDOCX({
          type: test.type, test_date: test.test_date, results: test.results, raw_data: test.raw_data,
          athlete: { first_name: athlete.first_name, last_name: athlete.last_name, sport: athlete.sport, body_mass: athlete.body_mass },
          chartPng,
        });
      }
      const dest = await saveBlobToTarget(blob, filename);
      await saveLocalExport(filename, blob);
      toast.success(`${filename} → ${dest}`);
    } finally {
      setExporting(false);
    }
  };

  const goBackToTest = () => {
    if (!test) return;
    setTestDraft({ type: test.type, athleteId: test.athlete_id, rawData: test.raw_data, savedAt: Date.now() });
    navigate(`/app/tests/new/${test.type}?athleteId=${test.athlete_id}`);
  };

  const saveToHistory = () => {
    if (!test) return;
    if (savedInHistory) { toast.info("Already saved"); return; }
    if (!markLocalTestSaved(test.id)) {
      saveLocalTest({
        id: test.id,
        type: test.type, test_date: test.test_date, athlete_id: test.athlete_id,
        athlete_snapshot: test.athletes ?? { first_name: "", last_name: "", sport: null, body_mass: null },
        raw_data: test.raw_data, results: test.results, saved: true,
      });
    }
    setSavedInHistory(true);
    toast.success("Added to history");
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!test) return <div className="py-12 text-center text-sm text-muted-foreground">Test not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={goBackToTest} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Back to test
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveToHistory} disabled={savedInHistory}>
            <Save className="h-4 w-4" /> {savedInHistory ? "Saved" : "Save"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => doExport("pdf")}>
                <FileType className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("docx")}>
                <FileText className="mr-2 h-4 w-4" /> Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div ref={reportRef} className="space-y-4 bg-background p-1">
        {test.type === "jump"
          ? <JumpReport test={test} results={test.results as JumpResults} chartRef={chartRef} />
          : <SprintReport test={test} results={test.results as SprintResults} chartRef={chartRef} />}
      </div>
    </div>
  );
}

function HeaderCard({ test, label }: { test: TestRecord; label: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="gradient-dark p-5 text-white">
        <p className="text-xs uppercase tracking-widest text-primary">{label}</p>
        <h1 className="font-display text-2xl font-bold uppercase">
          {test.athletes?.first_name} {test.athletes?.last_name}
        </h1>
        <p className="mt-1 text-xs text-white/70">
          {test.athletes?.sport ?? ""} · {new Date(test.test_date).toLocaleDateString()}
        </p>
      </div>
    </Card>
  );
}

function Metric({ label, value, unit, color = "text-foreground" }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-display text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{unit}</p>
    </div>
  );
}

function ProfileBar({ imbalance, profile }: { imbalance: number; profile: string }) {
  const clamped = Math.max(-50, Math.min(50, imbalance));
  const position = 50 + clamped;
  const color = Math.abs(imbalance) < 5 ? "bg-success" : Math.abs(imbalance) < 10 ? "bg-warning" : "bg-destructive";
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-display font-bold text-force">FORCE</span>
        <span className="font-display font-bold uppercase">{profile.replace("_", " ")}</span>
        <span className="font-display font-bold text-velocity">VELOCITY</span>
      </div>
      <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
        <div className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-background ${color} shadow-glow`}
          style={{ left: `${position}%` }} />
      </div>
      <p className="mt-2 text-center text-muted-foreground text-sm">FVimb = {imbalance.toFixed(1)}%</p>
    </div>
  );
}

function ModelQualityCard({ r2, points, rmse, label }: { r2: number; points: number; rmse?: number; label?: string }) {
  const ok = r2 >= 0.95;
  return (
    <Card className={ok ? "border-success/30" : "border-warning/40"}>
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-warning" />}
          Qualité du modèle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">R² régression F-V</span><span className="font-mono">{r2.toFixed(3)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Points utilisés</span><span className="font-mono">{points}</span></div>
        {rmse !== undefined && (
          <div className="flex justify-between"><span className="text-muted-foreground">RMSE position</span><span className="font-mono">{rmse.toFixed(3)} m</span></div>
        )}
        <p className="pt-1 text-xs text-muted-foreground">
          {ok
            ? "Ajustement linéaire de très bonne qualité (Samozino & Morin recommandent R² ≥ 0,95)."
            : "R² inférieur à 0,95 : interpréter F0/V0/Pmax avec prudence et vérifier la qualité des essais."}
          {label ? ` · ${label}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function ReferencesCard({ kind }: { kind: "jump" | "sprint" }) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Méthode et références
            </CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            {kind === "jump" ? (
              <>
                <p><strong className="text-foreground">Méthode :</strong> sauts verticaux à charges croissantes. Pour chaque essai, F = (m+ml)·g·(h/hPO + 1) / m et V = √(g·h/2). Régression linéaire F = F0 − Sfv·V donne F0, V0, Pmax = F0·V0/4.</p>
                <p><strong className="text-foreground">Sfv,opt :</strong> pente F-V théorique qui maximise la hauteur de saut à Pmax constant (iso-puissance). FVimb = (Sfv − Sfv,opt) / Sfv,opt × 100.</p>
                <p><strong className="text-foreground">Références :</strong> Samozino et al. (2008, 2012, 2014); Jiménez-Reyes et al. (2017) pour l'individualisation par sport.</p>
              </>
            ) : (
              <>
                <p><strong className="text-foreground">Méthode :</strong> modèle exponentiel v(t) = Vmax·(1 − e^(−t/τ)) ajusté sur les splits. Force horizontale F_h = m·a + F_aero, puis régression F-V linéaire et Pmax = F0·V0/4.</p>
                <p><strong className="text-foreground">RFmax / DRF :</strong> ratio de force horizontale = F_h / √(F_h² + g²) × 100 ; DRF = pente de RF vs V (Morin & Samozino 2016).</p>
                <p><strong className="text-foreground">Références :</strong> Morin & Samozino (2016); Cross et al. (2017); Jiménez-Reyes et al. (2019).</p>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function R2Explanation({ r2 }: { r2: number }) {
  const { text, color } =
    r2 >= 0.95
      ? { text: "Excellent ajustement : F0, V0 et Pmax sont fiables.", color: "text-success" }
      : r2 >= 0.85
      ? { text: "Ajustement correct : interpréter avec une certaine prudence.", color: "text-warning" }
      : { text: "Ajustement faible : vérifier la qualité des essais avant d'exploiter F0/V0/Pmax.", color: "text-destructive" };
  return (
    <p className="mt-1 text-center text-xs text-muted-foreground">
      Le R² mesure la qualité de l'ajustement linéaire entre force et vitesse (1 = parfait).{" "}
      <span className={`font-medium ${color}`}>{text}</span>
    </p>
  );
}

function TargetSummary({ kind, sport }: { kind: "jump" | "sprint"; sport?: string | null }) {
  const target = kind === "jump" ? getJumpTarget(sport) : getSprintTarget(sport);
  const label = getSportTargets(sport)?.label;
  if (!target || !label) return null;
  return (
    <p className="mt-2 text-center text-muted-foreground text-sm">
      Cible {label} (Jiménez-Reyes) : F0 ≈ {target.F0} N/kg · V0 ≈ {target.V0} m/s · Pmax ≈ {target.Pmax} W/kg
    </p>
  );
}

function JumpReport({ test, results, chartRef }: { test: TestRecord; results: JumpResults; chartRef: React.RefObject<HTMLDivElement | null> }) {
  const reco = getJumpRecommendations(results.profile, results.FVimbalance);
  const optimalV0 = results.Pmax > 0 && results.FVoptimal < 0
    ? Math.sqrt((-4 * results.Pmax) / results.FVoptimal)
    : undefined;
  const optimalF0 = optimalV0 ? (4 * results.Pmax) / optimalV0 : undefined;
  const sportLabel = getSportTargets(test.athletes?.sport)?.label;
  const target = getJumpTarget(test.athletes?.sport);

  return (
    <>
      <HeaderCard test={test} label="F-V profile — Vertical jump" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="F0" value={results.F0.toFixed(2)} unit="N/kg" color="text-force" />
        <Metric label="V0" value={results.V0.toFixed(2)} unit="m/s" color="text-velocity" />
        <Metric label="Pmax" value={results.Pmax.toFixed(1)} unit="W/kg" color="text-primary" />
        <Metric label="hMax théo." value={(results.hMax * 100).toFixed(1)} unit="cm" />
      </div>
      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Gauge className="h-4 w-4 text-primary"/>Profil F-V (Samozino)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <ProfileBar imbalance={results.FVimbalance} profile={results.profile} />
          <p className="text-center text-xs text-muted-foreground">
            Sfv = {results.slopeFV.toFixed(2)} · Sfv,opt = {results.FVoptimal.toFixed(2)} · hMax,opt = {(results.hMaxOptimal * 100).toFixed(1)} cm
          </p>
          <TargetSummary kind="jump" sport={test.athletes?.sport} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Représentation graphique F-V</CardTitle></CardHeader>
        <CardContent>
          <div ref={chartRef}>
            <FVChart
              points={results.points}
              F0={results.F0}
              V0={results.V0}
              optimalF0={optimalF0}
              optimalV0={optimalV0}
              targetF0={target?.F0}
              targetV0={target?.V0}
              targetF0Range={target?.F0Range}
              targetV0Range={target?.V0Range}
              targetLabel={sportLabel}
              Pmax={results.Pmax}
            />
          </div>
          <p className="mt-2 text-center text-muted-foreground text-sm">
            R² = {results.r2.toFixed(3)}{" "}
          </p>
        </CardContent>
      </Card>
      <ModelQualityCard r2={results.r2} points={results.points.length} label="Régression F = F0 − Sfv·V" />
      <RecommendationCard reco={reco} />
      <ReferencesCard kind="jump" />
    </>
  );
}

function SprintReport({ test, results, chartRef }: { test: TestRecord; results: SprintResults; chartRef: React.RefObject<HTMLDivElement | null> }) {
  const reco = getSprintRecommendations(results);
  const points = results.velocityProfile
    .map((v, i) => ({ velocity: v, force: results.FVprofile[i] }))
    .filter((_, i) => i % 10 === 0);
  const sportLabel = getSportTargets(test.athletes?.sport)?.label;
  const target = getSprintTarget(test.athletes?.sport);
  const optimalV0 = target?.V0;
  const optimalF0 = target?.F0;

  return (
    <>
      <HeaderCard test={test} label="F-V profile — Linear sprint" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="F0 horiz." value={results.F0.toFixed(2)} unit="N/kg" color="text-force" />
        <Metric label="V0 / Vmax" value={results.Vmax.toFixed(2)} unit="m/s" color="text-velocity" />
        <Metric label="Pmax" value={results.Pmax.toFixed(1)} unit="W/kg" color="text-primary" />
        <Metric label="RFmax" value={results.RFmax.toFixed(1)} unit="%" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="DRF" value={results.DRF.toFixed(2)} unit="%/m·s⁻¹" />
        <Metric label="τ" value={results.tau.toFixed(3)} unit="s" />
      </div>
      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary"/>Représentation graphique F-V (horizontal)</CardTitle></CardHeader>
        <CardContent>
          <div ref={chartRef}>
            <FVChart
              points={points}
              F0={results.F0}
              V0={results.V0}
              forceLabel="F horiz. (N/kg)"
              optimalF0={optimalF0}
              optimalV0={optimalV0}
              targetF0={target?.F0}
              targetV0={target?.V0}
              targetF0Range={target?.F0Range}
              targetV0Range={target?.V0Range}
              targetLabel={sportLabel}
              Pmax={results.Pmax}
            />
          </div>
          <p className="mt-2 text-center text-muted-foreground text-sm">
            R² = {results.r2.toFixed(3)} · τ = {results.tau.toFixed(3)} s — modèle Morin & Samozino (2016)
          </p>
          <TargetSummary kind="sprint" sport={test.athletes?.sport} />
        </CardContent>
      </Card>
      <ModelQualityCard
        r2={results.r2}
        points={results.splits.length}
        rmse={results.rmse}
        label="Modèle exponentiel v(t) + régression F-V"
      />
      <Card>
        <CardHeader><CardTitle className="font-display text-base">Splits</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="text-left">Distance</th><th className="text-left">Mesuré</th><th className="text-left">Modèle</th></tr>
            </thead>
            <tbody>
              {results.splits.map((s, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5">{s.distance} m</td>
                  <td>{s.time.toFixed(2)} s</td>
                  <td className="text-muted-foreground">{(s.distance / s.predicted * s.time).toFixed(2)} s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <RecommendationCard reco={reco} />
      <ReferencesCard kind="sprint" />
    </>
  );
}

function RecommendationCard({ reco }: { reco: ReturnType<typeof getJumpRecommendations> }) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />{reco.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{reco.description}</p>
        <div className="space-y-2">
          {reco.exercises.map((ex, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-accent/15 p-2.5">
              <span className="font-medium">{ex.name}</span>
              <span className="text-xs text-muted-foreground">{ex.sets} · {ex.intensity}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
