import { jsPDF } from "jspdf";
import type { Prototype, Screen, FrameKind } from "./types";
import { buildScreenDoc } from "./screenDoc";
import { captureFullPng } from "../components/proto/FreeformDevice";

// Export every freeform screen's FULL-length screenshot as one PDF (a page per screen).
// Each screen is rendered offscreen at its device width with the SAME buildScreenDoc the live
// iframe + headless snapshot use, and captured with the same captureFullPng the live loop uses
// — so what lands in the PDF is exactly the full screen the dev reviews, scroll and all.

// Width each device frame renders the screen at (matches DeviceFrame), so the export
// captures the SAME layout the dev sees. Heights are only the initial layout viewport —
// captureFullPng unclamps past them to the real content length.
const FRAME_W: Record<FrameKind, number> = { ios: 384, android: 392, ipad: 810, web: 1280, desktop: 1280 };
const FRAME_H: Record<FrameKind, number> = { ios: 820, android: 820, ipad: 1080, web: 820, desktop: 820 };

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Render one screen offscreen at its device width and capture the FULL content as a PNG.
async function renderScreenFull(proto: Prototype, screen: Screen): Promise<string | null> {
  const frame: FrameKind = screen.frame || proto.frame || "web";
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin");
  Object.assign(iframe.style, {
    position: "fixed", left: "-100000px", top: "0", border: "0", background: "#fff",
    width: `${FRAME_W[frame] ?? 1180}px`, height: `${FRAME_H[frame] ?? 820}px`,
  });
  document.body.appendChild(iframe);
  try {
    const loaded = new Promise<void>((res) => { iframe.onload = () => res(); });
    iframe.srcdoc = buildScreenDoc(proto, screen);
    await loaded;
    const doc = iframe.contentDocument;
    if (!doc) return null;
    // Let the CDN Tailwind compile, lucide load, and web fonts settle before the shot.
    try { await (doc.fonts?.ready ?? Promise.resolve()); } catch { /* ignore */ }
    await delay(900);
    return await captureFullPng(doc, { always: true });
  } finally {
    iframe.remove();
  }
}

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => res({ w: 768, h: 1640 });
    img.src = dataUrl;
  });
}

export interface ExportProgress {
  done: number;
  total: number;
  label: string;
}

export interface ExportResult {
  /** Object URL for the built PDF — the app shows it in a modal so the dev opens it. */
  url: string;
  /** How many pages (screens) the PDF holds. */
  pages: number;
}

// Capture the full-length screenshot of every freeform screen and assemble one PDF (a page
// per screen). It does NOT open or download anything — it returns a blob URL the app surfaces
// in a modal, so the dev opens it with a real click (no auto-opened tab to get popup-blocked,
// nothing silently dropped). Lo-fi component screens (no html) are skipped.
export async function exportPrototypePdf(
  proto: Prototype,
  onProgress?: (p: ExportProgress) => void,
): Promise<ExportResult> {
  const screens = (proto.screens || []).filter((s) => typeof s.html === "string" && s.html.trim().length > 0);
  if (!screens.length) throw new Error("No freeform screens to export — this exports hi-fi (HTML) screens.");

  const pages: Array<{ dataUrl: string; w: number; h: number }> = [];
  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    onProgress?.({ done: i, total: screens.length, label: s.title || s.id });
    const dataUrl = await renderScreenFull(proto, s);
    if (!dataUrl) continue;
    pages.push({ dataUrl, ...(await imageSize(dataUrl)) });
  }
  if (!pages.length) throw new Error("Nothing captured.");
  onProgress?.({ done: screens.length, total: screens.length, label: "Building PDF…" });

  // One page per screenshot, page sized to the image. The capture is @2x, so the logical
  // page is half its pixels (keeps the PDF dimensions sane while the image stays crisp).
  let pdf: jsPDF | null = null;
  for (const p of pages) {
    const w = Math.max(1, Math.round(p.w / 2));
    const h = Math.max(1, Math.round(p.h / 2));
    if (!pdf) pdf = new jsPDF({ unit: "px", format: [w, h], orientation: w >= h ? "landscape" : "portrait" });
    else pdf.addPage([w, h], w >= h ? "landscape" : "portrait");
    pdf.addImage(p.dataUrl, "PNG", 0, 0, w, h);
  }
  return { url: String(pdf!.output("bloburl")), pages: pages.length };
}
