import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FVChart } from "@/components/FVChart";
import {
  Download, ChevronLeft, Activity, Zap, Gauge, FileText, FileType, Save,
  BookOpen, ChevronDown,
} from "lucide-react";
import {
  type JumpResults, type SprintResults,
  getJumpRecommendations, getSprintRecommendations,
  getSprintInterpretation,
  airDensity, frontalArea, simulateSplitTime,
} from "@/lib/fvCalculations";
import {
  ResponsiveContainer,
  LineChart,
  Line as RLine,
  XAxis as RXAxis,
  YAxis as RYAxis,
  CartesianGrid as RCartesianGrid,
  Tooltip as RTooltip,
  ReferenceDot,
  Scatter,
  ScatterChart,
} from "recharts";
import { getJumpTarget, getSprintTarget, getSportTargets } from "@/lib/sportTargets";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { generateDOCX, downloadBlob, fileNameFor, saveLocalExport } from "@/lib/docxExport";
import fvLogo from "@/assets/fv-logo.png";
import type { Lang, TKey } from "@/lib/settings";
import { clearExportDirectory, getExportDirectoryLabel, isDirectoryPickerSupported, isInIframe, pickExportDirectory, saveBlobToTarget } from "@/lib/exportTarget";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Folder } from "lucide-react";
import {
  getLocalTest, getLocalTests, markLocalTestSaved, saveLocalTest, setTestDraft,
} from "@/lib/localHistory";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";
import { canExportReport, canSaveTest } from "@/lib/freeLimits";
import { isFreeLimitError } from "@/lib/plan";
import { notifyFreeLimit } from "@/lib/upgradePrompt";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getPlayer, getTeam } from "@/lib/storage";
import { dataUrlImageKind } from "@/lib/imagePick";

interface TestRecord {
  id: string;
  type: "jump" | "sprint";
  test_date: string;
  results: JumpResults | SprintResults;
  raw_data: Record<string, unknown>;
  athlete_id: string;
  athletes: { first_name: string; last_name: string; sport: string | null; body_mass: number | null } | null;
}

type AthleteSnapshot = NonNullable<TestRecord["athletes"]>;

function resolveAthleteSnapshot(snapshot: AthleteSnapshot | null, athleteId: string): AthleteSnapshot {
  const player = getPlayer(athleteId);
  const team = player ? getTeam(player.teamId) : null;
  return {
    first_name: snapshot?.first_name || player?.firstName || "",
    last_name: snapshot?.last_name || player?.lastName || "",
    sport: snapshot?.sport ?? team?.sport ?? null,
    body_mass: snapshot?.body_mass ?? player?.mass ?? null,
  };
}

function resolveReportMedia(athleteId: string): { logoDataUrl?: string; photoDataUrl?: string } {
  const player = getPlayer(athleteId);
  const team = player ? getTeam(player.teamId) : null;
  return { logoDataUrl: team?.logoDataUrl, photoDataUrl: player?.photoDataUrl };
}

type Tfn = (k: TKey) => string;

async function generateStructuredPDF(
  test: TestRecord,
  chartDataUrl: string | undefined,
  t: Tfn,
  lang: Lang,
  logoDataUrl?: string,
  photoDataUrl?: string,
): Promise<Blob> {
  const localeFor = (l: Lang) => (l === "fr" ? "fr-FR" : l === "ar" ? "ar" : "en-US");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const BLUE: [number, number, number] = [31, 124, 199];
  const GREEN: [number, number, number] = [132, 204, 22];
  const GREY_LINE: [number, number, number] = [210, 210, 210];

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) { pdf.addPage(); y = margin; }
  };

  // ===== HEADER: logo (left) + title (blue, centered) + date (right) =====
  if (logoDataUrl) {
    try {
      const kind = dataUrlImageKind(logoDataUrl);
      pdf.addImage(logoDataUrl, kind === "jpeg" ? "JPEG" : "PNG", margin, y, 24, 24);
    } catch { /* */ }
  }
  const title = test.type === "jump" ? t("reportTitleJump") : t("reportTitleSprint");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...BLUE);
  pdf.text(title, pageW / 2, y + 15, { align: "center" });

  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor(60, 60, 60);
  const dateStr = new Date(test.test_date).toLocaleDateString(localeFor(lang));
  pdf.text(dateStr, pageW - margin, y + 8, { align: "right" });
  pdf.setTextColor(0, 0, 0);
  y += 30;

  // ===== ATHLETE BLOCK =====
  const athleteName = test.athletes
    ? `${test.athletes.first_name} ${test.athletes.last_name}`.trim().toUpperCase()
    : t("unknownAthlete");
  const athleteTop = y;
  if (photoDataUrl) {
    try {
      const kind = dataUrlImageKind(photoDataUrl);
      pdf.addImage(photoDataUrl, kind === "jpeg" ? "JPEG" : "PNG", pageW - margin - 22, athleteTop - 2, 22, 22);
    } catch { /* */ }
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(`${t("nameLabel")}: ${athleteName}`, margin, y);
  y += 6;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(10);
  pdf.text(`${t("sportLabel")}: ${test.athletes?.sport ?? "—"} ·`, margin, y);
  y += 5;
  pdf.text(`${t("massLabelUp")}: ${test.athletes?.body_mass ?? "—"} kg`, margin, y);
  y += 8;
  if (photoDataUrl) y = Math.max(y, athleteTop - 2 + 22 + 4);
  pdf.setFont("helvetica", "normal");

  const sectionTitle = (title: string) => {
    ensureSpace(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...BLUE);
    pdf.text(title, margin, y);
    y += 6;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "normal");
  };

  const drawTable = (headers: string[], rows: string[][]) => {
    const colW = (pageW - margin * 2) / headers.length;
    const rowH = 7;
    ensureSpace(rowH);
    pdf.setFillColor(...GREEN);
    pdf.rect(margin, y, pageW - margin * 2, rowH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    headers.forEach((h, i) => pdf.text(h, margin + i * colW + 2, y + 5));
    y += rowH;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(...GREY_LINE);
    pdf.setLineWidth(0.1);
    rows.forEach((r) => {
      ensureSpace(rowH);
      r.forEach((cell, i) => pdf.text(cell, margin + i * colW + 2, y + 5));
      pdf.line(margin, y + rowH, pageW - margin, y + rowH);
      y += rowH;
    });
    y += 4;
  };

  const drawParagraph = (text: string, size = 10) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, pageW - margin * 2);
    lines.forEach((ln: string) => {
      ensureSpace(size * 0.5);
      pdf.text(ln, margin, y);
      y += size * 0.5;
    });
    y += 2;
  };

  const fitQualityKey = (r2: number): TKey =>
    r2 >= 0.95 ? "fitQualityGood" : r2 >= 0.85 ? "fitQualityModerate" : "fitQualityWeak";

  if (test.type === "jump") {
    const r = test.results as JumpResults;
    const raw = test.raw_data as { bodyMass?: number; pushOffDistance?: number; trials?: { load: number; jumpHeight: number }[] };

    sectionTitle(t("testConditions"));
    drawParagraph(`${t("bodyMass")}: ${raw.bodyMass ?? "—"} kg ·`);
    drawParagraph(`${t("pushOff")}: ${raw.pushOffDistance ?? "—"} m`);

    sectionTitle(t("trials"));
    drawTable(
      [t("colNum"), t("loadsKg"), t("jumpHeightCm"), t("forceNkg"), t("velocityMs")],
      r.points.map((p, i) => [
        String(i + 1),
        (p.load ?? 0).toFixed(1),
        ((raw.trials?.[i]?.jumpHeight ?? 0) * 100).toFixed(1),
        p.force.toFixed(2),
        p.velocity.toFixed(2),
      ]),
    );

    sectionTitle(t("mainIndicators"));
    drawTable(
      [t("tblIndicator"), t("tblValue"), t("tblUnit")],
      [
        ["F0", r.F0.toFixed(2), "N/kg"],
        ["V0", r.V0.toFixed(2), "m/s"],
        ["Pmax", r.Pmax.toFixed(1), "W/kg"],
        [t("fvSlope"), r.slopeFV.toFixed(2), "(N/kg)/(m/s)"],
        [t("optimalSlope"), r.FVoptimal.toFixed(2), "(N/kg)/(m/s)"],
        ["FVimb", r.FVimbalance.toFixed(1), "%"],
        [t("hMax"), (r.hMax * 100).toFixed(1), "cm"],
        [t("profileLabel"), r.profile.replace("_", " "), ""],
      ],
    );

    // R² line
    ensureSpace(8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(...BLUE);
    const r2Text = `R² = ${r.r2.toFixed(3)}`;
    pdf.text(r2Text, margin, y);
    const r2Width = pdf.getTextWidth(r2Text);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(t(fitQualityKey(r.r2)), margin + r2Width + 4, y);
    y += 8;
  } else {
    const r = test.results as SprintResults;
    const raw = test.raw_data as { bodyMass?: number; height?: number; splits?: { distance: number; time: number }[]; windSpeed?: number };

    sectionTitle(t("testConditions"));
    drawParagraph(`${t("bodyMass")}: ${raw.bodyMass ?? "—"} kg ·`);
    drawParagraph(`${t("heightM")}: ${raw.height ?? "—"} m ·`);
    drawParagraph(`${t("wind")}: ${raw.windSpeed ?? 0} m/s`);

    sectionTitle(t("splits"));
    drawTable(
      [t("colDistanceM"), t("colMeasuredS"), t("colModelS")],
      r.splits.map((s) => [s.distance.toFixed(1), s.time.toFixed(3), ((s.distance / s.predicted) * s.time).toFixed(3)]),
    );

    sectionTitle(t("mainIndicators"));
    drawTable(
      [t("tblIndicator"), t("tblValue"), t("tblUnit")],
      [
        ["F0 horiz.", r.F0.toFixed(2), "N/kg"],
        ["V0 / Vmax", r.Vmax.toFixed(2), "m/s"],
        ["Pmax", r.Pmax.toFixed(1), "W/kg"],
        [t("fvSlope"), r.slopeFV.toFixed(2), "(N/kg)/(m/s)"],
        ["RFmax", r.RFmax.toFixed(1), "%"],
        ["DRF", r.DRF.toFixed(2), "%/m·s⁻¹"],
        ["Tau", r.tau.toFixed(3), "s"],
      ],
    );
  }

  // FV curve on new page
  if (chartDataUrl) {
    try {
      pdf.addPage();
      y = margin;
      sectionTitle(t("fvCurveSection"));
      const props = pdf.getImageProperties(chartDataUrl);
      const imgW = pageW - margin * 2;
      const imgH = (props.height * imgW) / props.width;
      pdf.addImage(chartDataUrl, "PNG", margin, y, imgW, imgH);
      y += imgH + 6;
    } catch { /* */ }
  }

  // Interpretation
  const reco = test.type === "jump"
    ? getJumpRecommendations((test.results as JumpResults).profile, (test.results as JumpResults).FVimbalance, lang)
    : getSprintRecommendations(test.results as SprintResults, lang);

  ensureSpace(10);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...BLUE);
  const prefix = `${t("interpretationPrefix")} `;
  pdf.text(prefix, margin, y);
  const prefixWidth = pdf.getTextWidth(prefix);
  pdf.setTextColor(0, 0, 0);
  pdf.text(reco.title, margin + prefixWidth, y);
  y += 7;

  drawParagraph(reco.description);
  drawTable(
    [t("colExercise"), t("colSetsReps"), t("colIntensity")],
    reco.exercises.map((e) => [e.name, e.sets, e.intensity]),
  );

  return pdf.output("blob");
}



export default function TestResults() {
  const { testId = "" } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useSettings();
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(undefined);
  const [test, setTest] = useState<TestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [savedInHistory, setSavedInHistory] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<"pdf" | "docx">("pdf");
  const [exportDir, setExportDir] = useState<string | null>(null);
  const pickerSupported = isDirectoryPickerSupported();
  const inIframe = isInIframe();

  const openExportDialog = (format: "pdf" | "docx") => {
    if (!canExportReport()) {
      notifyFreeLimit(t, "export");
      return;
    }
    setPendingFormat(format);
    setExportDir(getExportDirectoryLabel());
    setExportDialogOpen(true);
  };

  const handlePickFolder = async () => {
    const res = await pickExportDirectory();
    if (res.ok === true) {
      setExportDir(res.name);
      toast.success(`${t("savedTo")} ${res.name}`);
      return;
    }
    switch (res.reason) {
      case "cancelled": toast(t("pickerCancelled")); break;
      case "iframe-blocked": toast.error(t("iframeBlocked")); break;
      case "unsupported": toast.error(t("browserUnsupported")); break;
      default: toast.error(res.message || t("browserUnsupported"));
    }
  };
  const handleResetFolder = async () => {
    await clearExportDirectory();
    setExportDir(null);
  };
  const confirmExport = async () => {
    setExportDialogOpen(false);
    await doExport(pendingFormat);
  };

  useEffect(() => {
    const local = getLocalTest(testId);
    if (local) {
      const athletes = resolveAthleteSnapshot(local.athlete_snapshot, local.athlete_id);
      setTest({
        id: local.id,
        type: local.type,
        test_date: local.test_date,
        results: local.results,
        raw_data: local.raw_data,
        athlete_id: local.athlete_id,
        athletes,
      });
    }
    setLoading(false);
  }, [testId]);

  useEffect(() => {
    if (!test) return;
    setSavedInHistory(getLocalTests().some((t) => t.id === test.id));
  }, [test]);

  useEffect(() => {
    if (!test) return;
    let cancelled = false;
    const teamLogo = resolveReportMedia(test.athlete_id).logoDataUrl;
    if (teamLogo) {
      setLogoDataUrl(teamLogo);
      return;
    }
    (async () => {
      try {
        const res = await fetch(fvLogo);
        if (!res.ok) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          if (!cancelled && typeof reader.result === "string") setLogoDataUrl(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
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
    if (!canExportReport()) {
      notifyFreeLimit(t, "export");
      return;
    }
    setExporting(true);
    try {
      const athlete = test.athletes ?? { first_name: "athlete", last_name: "", sport: null, body_mass: null };
      const filename = fileNameFor(athlete, test.test_date, format);
      const chartDataUrl = await captureChartDataUrl();
      let blob: Blob;
      const photoDataUrl = resolveReportMedia(test.athlete_id).photoDataUrl;
      if (format === "pdf") blob = await generateStructuredPDF(test, chartDataUrl, t, lang, logoDataUrl, photoDataUrl);
      else {
        const chartPng = dataUrlToBytes(chartDataUrl);
        const logoPng = dataUrlToBytes(logoDataUrl);
        const photoBytes = dataUrlToBytes(photoDataUrl);
        blob = await generateDOCX({
          type: test.type, test_date: test.test_date, results: test.results, raw_data: test.raw_data,
          athlete: { first_name: athlete.first_name, last_name: athlete.last_name, sport: athlete.sport, body_mass: athlete.body_mass },
          chartPng, logoPng, photoBytes,
          logoType: logoDataUrl && dataUrlImageKind(logoDataUrl) === "jpeg" ? "jpg" : "png",
          photoType: photoDataUrl && dataUrlImageKind(photoDataUrl) === "jpeg" ? "jpg" : "png",
          t, lang,
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
    if (savedInHistory) { toast.info(t("alreadySaved")); return; }
    const alreadyStored = !!getLocalTest(test.id);
    if (!alreadyStored && !canSaveTest(test.athlete_id, test.id)) {
      notifyFreeLimit(t, "test");
      return;
    }
    try {
      if (!markLocalTestSaved(test.id)) {
        saveLocalTest({
          id: test.id,
          type: test.type, test_date: test.test_date, athlete_id: test.athlete_id,
          athlete_snapshot: test.athletes ?? { first_name: "", last_name: "", sport: null, body_mass: null },
          raw_data: test.raw_data, results: test.results, saved: true,
        });
      }
      setSavedInHistory(true);
      toast.success(t("addedToHistory"));
    } catch (err) {
      if (isFreeLimitError(err)) notifyFreeLimit(t, err.reason);
      else toast.error((err as Error).message);
    }
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">{t("loadingEllipsis")}</div>;
  if (!test) return <div className="py-12 text-center text-sm text-muted-foreground">{t("testNotFound")}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={goBackToTest} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> {t("back")}
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveToHistory} disabled={savedInHistory}>
            <Save className="h-4 w-4" /> {savedInHistory ? t("saved") : t("save")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting}>
                <Download className="h-4 w-4" /> {exporting ? t("exporting") : t("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openExportDialog("pdf")}>
                <FileType className="mr-2 h-4 w-4" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openExportDialog("docx")}>
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

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-4 w-4 text-primary" />
              {t("exportFolder")}
            </DialogTitle>
            <DialogDescription>
              {pendingFormat === "pdf" ? "PDF" : "Word (.docx)"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">{exportDir ?? t("defaultDownloads")}</span>
            </div>
            {pickerSupported ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePickFolder} className="flex-1">
                  {t("chooseFolder")}
                </Button>
                {exportDir && (
                  <Button variant="ghost" size="sm" onClick={handleResetFolder}>
                    {t("resetFolder")}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("folderNotSupported")}</p>
            )}
            {pickerSupported && inIframe && (
              <p className="text-xs text-muted-foreground">
                {t("iframeBlocked")}{" "}
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  {t("openInNewTab")}
                </a>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setExportDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={confirmExport} disabled={exporting} className="bg-gradient-primary text-primary-foreground">
              <Download className="h-4 w-4 mr-1" /> {exporting ? t("exporting") : t("export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeaderCard({ test, label }: { test: TestRecord; label: string }) {
  const photo = resolveReportMedia(test.athlete_id).photoDataUrl;
  const initials = `${test.athletes?.first_name?.[0] ?? ""}${test.athletes?.last_name?.[0] ?? ""}`;
  return (
    <Card className="overflow-hidden">
      <div className="gradient-dark p-5 text-white flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl overflow-hidden shrink-0 bg-white/10 flex items-center justify-center font-display text-xl font-bold">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-primary">{label}</p>
          <h1 className="font-display text-2xl font-bold uppercase truncate">
            {test.athletes?.first_name} {test.athletes?.last_name}
          </h1>
          <p className="mt-1 text-xs text-white/70">
            {test.athletes?.sport ?? ""} · {new Date(test.test_date).toLocaleDateString()}
          </p>
        </div>
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

function ReferencesCard({ kind }: { kind: "jump" | "sprint" }) {
  const { t } = useSettings();
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-base flex items-center gap-2">
              {t("methodRefs")}
            </CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            {kind === "jump" ? (
              <>
                <p><strong className="text-foreground">{t("methodLabel")}</strong> {t("methodJumpBody")}</p>
                <p><strong className="text-foreground">Sfv,opt :</strong> {t("methodSfvOpt")}</p>
                <p><strong className="text-foreground">{t("refsLabel")}</strong> {t("methodRefsJump")}</p>
              </>
            ) : (
              <>
                <p><strong className="text-foreground">{t("methodLabel")}</strong> {t("methodSprintBody")}</p>
                <p><strong className="text-foreground">RFmax / DRF :</strong> {t("methodRfDrf")}</p>
                <p><strong className="text-foreground">{t("refsLabel")}</strong> {t("methodRefsSprint")}</p>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function R2Explanation({ r2 }: { r2: number }) {
  const { t } = useSettings();
  const { text, color } =
    r2 >= 0.95
      ? { text: t("r2Excellent"), color: "text-success" }
      : r2 >= 0.85
      ? { text: t("r2Good"), color: "text-warning" }
      : { text: t("r2Poor"), color: "text-destructive" };
  return (
    <div className="mt-1 text-center text-xs space-y-1">
      <p className="text-muted-foreground">
        {t("r2Explanation")}
      </p>
      <p className={`font-medium ${color}`}>{text}</p>
    </div>
  );
}

function TargetSummary({ kind, sport }: { kind: "jump" | "sprint"; sport?: string | null }) {
  const { t } = useSettings();
  const target = kind === "jump" ? getJumpTarget(sport) : getSprintTarget(sport);
  const label = getSportTargets(sport)?.label;
  if (!target || !label) return null;
  return (
    <p className="mt-2 text-center text-muted-foreground text-sm">
      {t("targetPrefix")} {label} {t("jumpTargetSuffix")} : F0 ≈ {target.F0} N/kg · V0 ≈ {target.V0} m/s · Pmax ≈ {target.Pmax} W/kg
    </p>
  );
}

function JumpReport({ test, results, chartRef }: { test: TestRecord; results: JumpResults; chartRef: React.RefObject<HTMLDivElement | null> }) {
  const { t, lang } = useSettings();
  const reco = getJumpRecommendations(results.profile, results.FVimbalance, lang);
  const target = getJumpTarget(test.athletes?.sport);
  const raw = (test.raw_data ?? {}) as { trials?: { load: number; jumpHeight: number }[] };

  return (
    <>
      <HeaderCard test={test} label={t("fvJumpLabel")} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="F0" value={results.F0.toFixed(2)} unit="N/kg" color="text-force" />
        <Metric label="V0" value={results.V0.toFixed(2)} unit="m/s" color="text-velocity" />
        <Metric label="Pmax" value={results.Pmax.toFixed(1)} unit="W/kg" color="text-primary" />
        <Metric label={t("hMaxTheo")} value={(results.hMax * 100).toFixed(1)} unit="cm" />
      </div>
      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2">{t("fvProfileSamozino")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <ProfileBar imbalance={results.FVimbalance} profile={results.profile} />
          <p className="text-center text-xs text-muted-foreground">
            Sfv = {results.slopeFV.toFixed(2)} · Sfv,opt = {results.FVoptimal.toFixed(2)} · hMax,opt = {(results.hMaxOptimal * 100).toFixed(1)} cm
          </p>
          <TargetSummary kind="jump" sport={test.athletes?.sport} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display text-base">{t("trials")}</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left">{t("loadsKg")}</th>
                <th className="text-left">{t("jumpHeightCm")}</th>
                <th className="text-left">{t("forceNkg")}</th>
                <th className="text-left">{t("velocityMs")}</th>
              </tr>
            </thead>
            <tbody>
              {results.points.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5">{(p.load ?? 0).toFixed(1)}</td>
                  <td>{((raw.trials?.[i]?.jumpHeight ?? 0) * 100).toFixed(1)}</td>
                  <td>{p.force.toFixed(2)}</td>
                  <td>{p.velocity.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2">{t("fvGraph")}</CardTitle></CardHeader>
        <CardContent>
          <div ref={chartRef}>
            <FVChart
              points={results.points}
              F0={results.F0}
              V0={results.V0}
              optimalF0={target?.F0}
              optimalV0={target?.V0}
            />
          </div>

          <p className="mt-2 text-center text-muted-foreground text-sm">
            R² = {results.r2.toFixed(3)}{" "}
          </p>
          <R2Explanation r2={results.r2} />
        </CardContent>
      </Card>
      
      <RecommendationCard reco={reco} />
      <ReferencesCard kind="jump" />
    </>
  );
}

function SprintReport({ test, results, chartRef }: { test: TestRecord; results: SprintResults; chartRef: React.RefObject<HTMLDivElement | null> }) {
  const { t, lang } = useSettings();
  const reco = getSprintRecommendations(results, lang);
  const interp = getSprintInterpretation(results, lang);
  const raw = test.raw_data as {
    testDistance?: number; startType?: string; surface?: string;
    shoes?: string; shoeType?: "spikes" | "cleats" | "sprint";
    notes?: string; videoFps?: number;
    airTemperature?: number; airPressure?: number; windSpeed?: number;
    bodyMass?: number; height?: number;
  };
  const points = results.velocityProfile
    .map((v, i) => ({ velocity: v, force: results.FVprofile[i] }))
    .filter((_, i) => i % 10 === 0);
  const sportLabel = getSportTargets(test.athletes?.sport)?.label;
  const target = getSprintTarget(test.athletes?.sport);
  const optimalV0 = target?.V0;
  const optimalF0 = target?.F0;

  const series = results.series ?? [];
  const phaseColors: Record<string, string> = {
    start: "hsl(20 90% 55%)",
    acceleration: "hsl(40 90% 55%)",
    transition: "hsl(140 60% 50%)",
    max_velocity: "hsl(200 80% 55%)",
    deceleration: "hsl(0 70% 55%)",
  };
  const startLabels: Record<string, string> = {
    standing: t("standing"), three_point: t("threePoint"), blocks: t("blocks"),
  };
  const surfaceLabels: Record<string, string> = {
    track: t("track"), grass: t("grass"), synthetic: t("synthetic"), indoor: t("indoor"),
  };
  const shoeLabels: Record<string, string> = {
    spikes: t("shoeSpikes"),
    cleats: t("shoeCleats"),
    sprint: t("shoeSprint"),
  };
  const shoeKey = raw.shoeType ?? results.shoeType;
  const fwAdj = results.footwearAdjustment;

  const Pmax = results.Pmax;
  const RFpeak = results.RFpeak ?? results.RFmax;
  const MAC = results.MAC ?? results.Vmax / results.tau;
  const quality = results.qualityScore;

  return (
    <>
      <HeaderCard test={test} label={t("fvSprintLabel")} />

      <Card>
        <CardHeader><CardTitle className="font-display text-base">{t("protocolConditions")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <Info label={t("distance")} value={`${raw.testDistance ?? results.testDistance ?? "—"} m`} />
            <Info label={t("start")} value={startLabels[raw.startType ?? results.startType ?? ""] ?? "—"} />
            <Info label={t("surface")} value={surfaceLabels[raw.surface ?? results.surface ?? ""] ?? "—"} />
            <Info
              label={t("wind")}
              value={(() => {
                const w = raw.windSpeed ?? 0;
                if (Math.abs(w) < 0.05) return t("neutral");
                return `${Math.abs(w).toFixed(1)} m/s ${w > 0 ? t("propulsion") : t("resistance")}`;
              })()}
            />
            <Info label={t("temp")} value={`${raw.airTemperature ?? "—"} °C`} />
            <Info label={t("press")} value={`${raw.airPressure ?? "—"} hPa`} />
            {shoeKey && <Info label={t("shoes")} value={shoeLabels[shoeKey] ?? shoeKey} />}
            {!shoeKey && raw.shoes && <Info label={t("shoes")} value={raw.shoes} />}
            {raw.videoFps && <Info label={t("videoFps")} value={String(raw.videoFps)} />}
          </div>
          {fwAdj && Math.abs(fwAdj.factor - 1) > 0.005 && (
            <p className="mt-2 text-[11px] italic text-muted-foreground">
              {t("footwearAdjLabel")} : {((fwAdj.factor - 1) * 100 >= 0 ? "+" : "")}
              {((fwAdj.factor - 1) * 100).toFixed(1)} % {t("onMeasuredTimes")}.
            </p>
          )}
          <AeroSummary
            tempC={raw.airTemperature}
            pressureHpa={raw.airPressure}
            windMs={raw.windSpeed}
            heightM={raw.height}
            bodyMassKg={raw.bodyMass}
            Vmax={results.Vmax}
            tau={results.tau}
            testDistance={raw.testDistance ?? results.testDistance ?? 30}
          />
          {results.aeroDefaults && (
            <p className="mt-2 text-[11px] italic text-muted-foreground">
              {t("aeroDefaultsUsed")}
            </p>
          )}
        </CardContent>
      </Card>


      {quality && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center justify-between">
              <span>{t("qualityScore")}</span>
              <span className={`rounded-full px-3 py-0.5 text-sm font-bold ${
                quality.globalScore >= 80 ? "bg-success/20 text-success" :
                quality.globalScore >= 60 ? "bg-warning/20 text-warning" :
                "bg-destructive/20 text-destructive"
              }`}>{quality.globalScore}/100</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">{t("modelFit")}</p>
                <p className="font-display text-base font-bold">
                  {results.modelFitScore != null ? Math.round(results.modelFitScore * 100) : quality.modelFitScore}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">{t("splitCoherence")}</p>
                <p className="font-display text-base font-bold">{quality.splitCoherenceScore}</p>
              </div>
              <div className="rounded-md bg-muted/40 p-2">
                <p className="text-[10px] uppercase text-muted-foreground">{t("videoFps")}</p>
                <p className="font-display text-base font-bold">
                  {results.videoFps ? `${results.videoFps} (${quality.fpsScore})` : "—"}
                </p>
              </div>
            </div>
            <p className="text-sm">{quality.message}</p>
            {quality.warnings.length > 0 && (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-warning">
                {quality.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            <div className="rounded-md bg-muted/40 p-3 text-center">
              <p className="font-display text-base font-bold">R² = {results.r2.toFixed(3)}</p>
              <R2Explanation r2={results.r2} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="font-display text-base">{t("splits")}</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="text-left">{t("distance")}</th><th className="text-left">{t("measured")}</th><th className="text-left">{t("model")}</th><th className="text-left">Δ</th></tr>
            </thead>
            <tbody>
              {results.splits.map((s, i) => {
                const tModel = s.predicted > 0 ? (s.distance / s.predicted) * s.time : 0;
                return (
                  <tr key={i} className="border-t">
                    <td className="py-1.5">{s.distance} m</td>
                    <td>{s.time.toFixed(3)} s</td>
                    <td className="text-muted-foreground">{tModel.toFixed(3)} s</td>
                    <td className={Math.abs(s.distance - s.predicted) > 0.5 ? "text-warning" : "text-muted-foreground"}>
                      {(s.distance - s.predicted >= 0 ? "+" : "") + (s.distance - s.predicted).toFixed(2)} m
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

        <Metric label="F0 horiz." value={results.F0.toFixed(2)} unit="N/kg" color="text-force" />
        <Metric label="V0 / Vmax" value={results.Vmax.toFixed(2)} unit="m/s" color="text-velocity" />
        <Metric label="Pmax" value={Pmax.toFixed(1)} unit="W/kg" color="text-primary" />
        <Metric label="RFpeak" value={RFpeak.toFixed(1)} unit="%" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="DRF" value={results.DRF.toFixed(2)} unit="%/m·s⁻¹" />
        <Metric label="RFmean" value={(results.RFmean ?? 0).toFixed(1)} unit="%" />
        <Metric label="MAC" value={MAC.toFixed(2)} unit="m/s²" />
        <Metric label="τ" value={results.tau.toFixed(3)} unit="s" />
      </div>

      {series.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="font-display text-base">{t("distanceTime")}</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <RCartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <RXAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => Number(v).toFixed(1)} fontSize={10} />
                    <RYAxis fontSize={10} />
                    <RTooltip formatter={(v) => Number(v).toFixed(2)} labelFormatter={(l) => `t = ${(l as number).toFixed(2)} s`} />
                    <RLine type="monotone" dataKey="x" stroke="hsl(var(--primary))" dot={false} name="x (m)" />
                    <Scatter data={results.splits.map((s) => ({ t: s.time, x: s.distance }))} fill="hsl(var(--destructive))" />
                  </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">{t("velocityTimePhases")}</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <RCartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <RXAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => Number(v).toFixed(1)} fontSize={10} />
                    <RYAxis fontSize={10} />
                    <RTooltip formatter={(v) => `${Number(v).toFixed(2)} m/s`} labelFormatter={(l) => `t = ${(l as number).toFixed(2)} s`} />
                    <RLine type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {results.phases && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  {results.phases.map((p, i) => (
                    <span key={i} className="rounded px-2 py-0.5 font-medium text-white"
                      style={{ background: phaseColors[p.name] }}>
                      {p.label} · {(p.tEnd - p.tStart).toFixed(2)}s · {(p.dEnd - p.dStart).toFixed(1)}m
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">{t("accelTime")}</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <RCartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <RXAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => Number(v).toFixed(1)} fontSize={10} />
                    <RYAxis fontSize={10} />
                    <RTooltip formatter={(v) => `${Number(v).toFixed(2)} m/s²`} labelFormatter={(l) => `t = ${(l as number).toFixed(2)} s`} />
                    <RLine type="monotone" dataKey="a" stroke="hsl(var(--destructive))" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader><CardTitle className="font-display text-base flex items-center gap-2">{t("fvRelation")}</CardTitle></CardHeader>
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
            τ = {results.tau.toFixed(3)} s · Sfv = {(results.Sfv ?? results.slopeFV).toFixed(2)}
          </p>
          <TargetSummary kind="sprint" sport={test.athletes?.sport} />
        </CardContent>
      </Card>

      {series.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="font-display text-base">{t("powerVelocity")}</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <RCartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <RXAxis dataKey="v" type="number" domain={[0, "dataMax"]} tickFormatter={(v) => Number(v).toFixed(1)} fontSize={10} />
                    <RYAxis fontSize={10} />
                    <RTooltip formatter={(v) => `${Number(v).toFixed(2)} W/kg`} labelFormatter={(l) => `v = ${(l as number).toFixed(2)} m/s`} />
                    <RLine type="monotone" dataKey="P" stroke="hsl(var(--primary))" dot={false} />
                    <ReferenceDot x={results.V0 / 2} y={Pmax} r={4} fill="hsl(var(--destructive))" stroke="none" label={{ value: "Pmax", position: "top", fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-base">{t("rfVelocity")}</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <ScatterChart margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <RCartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <RXAxis dataKey="v" type="number" domain={[0, "dataMax"]} tickFormatter={(v) => Number(v).toFixed(1)} fontSize={10} name="v" unit=" m/s" />
                    <RYAxis dataKey="RF" type="number" fontSize={10} unit=" %" />
                    <RTooltip formatter={(v) => Number(v).toFixed(1)} />
                    <Scatter data={series.filter((_, i) => i % 5 === 0)} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                RFpeak = {RFpeak.toFixed(1)} % · DRF = {results.DRF.toFixed(2)} %/(m/s)
              </p>
            </CardContent>
          </Card>
        </>
      )}


      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            {t("interpretationLabel")} — {interp.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{interp.description}</p>
          <div className="space-y-1.5">
            {interp.recommendations.map((r, i) => (
              <div key={i} className="rounded-md bg-accent/40 p-2 text-xs">{r}</div>
            ))}
          </div>
        </CardContent>
      </Card>

      {raw.notes && (
        <Card>
          <CardHeader><CardTitle className="font-display text-base">{t("practitionerNotes")}</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{raw.notes}</p>
          </CardContent>
        </Card>

      )}

      <RecommendationCard reco={reco} />
      <ReferencesCard kind="sprint" />
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function AeroSummary({
  tempC, pressureHpa, windMs, heightM, bodyMassKg, Vmax, tau, testDistance,
}: {
  tempC?: number; pressureHpa?: number; windMs?: number;
  heightM?: number; bodyMassKg?: number;
  Vmax: number; tau: number; testDistance: number;
}) {
  const { t } = useSettings();
  if (tempC == null || pressureHpa == null || windMs == null || !heightM || !bodyMassKg) return null;
  const rho = airDensity(tempC, pressureHpa);
  const A = frontalArea(heightM, bodyMassKg);
  const k = 0.5 * rho * A * 0.9;
  const tNo = simulateSplitTime(testDistance, Vmax, tau, k, bodyMassKg, 0);
  const tWith = simulateSplitTime(testDistance, Vmax, tau, k, bodyMassKg, windMs);
  const delta = tWith - tNo;
  const illegal = Math.abs(windMs) > 2;
  return (
    <p className="mt-2 text-[11px] italic text-muted-foreground">
      {t("aeroCorrection")} : ρ = <span className="font-mono not-italic">{rho.toFixed(3)} kg/m³</span>
      {Math.abs(windMs) > 0.05 && (
        <>
          {" · "}{t("windEffect")} ({windMs > 0 ? "+" : ""}{windMs.toFixed(1)} m/s) · {testDistance} m :{" "}
          <span className="font-mono not-italic">{delta >= 0 ? "+" : ""}{delta.toFixed(3)} s</span>
        </>
      )}
      {illegal && <span className="ml-1 text-amber-500 not-italic"> · {t("illegalWindNote")}</span>}
    </p>
  );
}

function RecommendationCard({ reco }: { reco: ReturnType<typeof getJumpRecommendations> }) {
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          {reco.title}
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
