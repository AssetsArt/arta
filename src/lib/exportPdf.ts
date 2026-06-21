import { jsPDF } from "jspdf";
import type { Prototype, Screen, FrameKind } from "./types";
import { resolveScreenHtml, designSheet, FONT_LINK } from "./prototype";
import { BASE_CSS, HEAD_LIBS, captureFullPng } from "../components/proto/FreeformDevice";

// Export every freeform screen's FULL-length screenshot as one PDF (a page per screen),
// opened in a new tab for the dev to save. Each screen is rendered offscreen at its device
// width and captured with the same captureFullPng the live loop uses — so what lands in the
// PDF is exactly the full screen the dev reviews, scroll and all.

// Width each device frame renders the screen at (matches DeviceFrame), so the export
// captures the SAME layout the dev sees. Heights are only the initial layout viewport —
// captureFullPng unclamps past them to the real content length.
const FRAME_W: Record<FrameKind, number> = { ios: 384, android: 392, ipad: 810, web: 1280, desktop: 1280 };
const FRAME_H: Record<FrameKind, number> = { ios: 820, android: 820, ipad: 1080, web: 820, desktop: 820 };

// A minimal in-frame init for the export iframe: render lucide icons and reflect the mock
// store into data-bind/data-show — but WITHOUT the live runtime's parent postMessage wiring
// (nav / error / annotate), which would otherwise leak into the viewer from a hidden frame.
const EXPORT_INIT = `<script>
(function(){
  function icons(){ try{ window.lucide && window.lucide.createIcons && window.lucide.createIcons(); }catch(_){} }
  function render(){ var s=window.__STORE__||{};
    document.querySelectorAll('[data-bind]').forEach(function(el){ var k=el.getAttribute('data-bind'); if(s[k]!=null) el.textContent=s[k]; });
    document.querySelectorAll('[data-show]').forEach(function(el){ var c=el.getAttribute('data-show'),v; if(c.indexOf('==')>-1){var p=c.split('==');v=String(s[p[0].trim()])===p[1].trim();}else{var x=s[c.trim()];v=!!x&&x!=='0'&&x!==0;} el.style.display=v?'':'none'; });
  }
  function boot(){ render(); icons(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', function(){ icons(); setTimeout(icons, 250); });
})();
</script>`;

function srcDocFor(proto: Prototype, screen: Screen): string {
  const sheet = `${BASE_CSS}\n${designSheet(proto)}\n${screen.css ?? ""}`;
  const html = resolveScreenHtml(proto, screen);
  const boot = `<script>window.__STORE__=${JSON.stringify(proto.store ?? {})}</script>`;
  return `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>${sheet}</style>${boot}${EXPORT_INIT}${HEAD_LIBS}</head><body>${html}</body></html>`;
}

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
    iframe.srcdoc = srcDocFor(proto, screen);
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

// Capture the full-length screenshot of every freeform screen and open them as a single
// PDF (one page per screen) in a new tab, where the dev saves it. Lo-fi component screens
// (no html) are skipped. Returns the number of pages exported.
export async function exportPrototypePdf(
  proto: Prototype,
  onProgress?: (p: ExportProgress) => void,
): Promise<number> {
  const screens = (proto.screens || []).filter((s) => typeof s.html === "string" && s.html.trim().length > 0);
  if (!screens.length) throw new Error("No freeform screens to export — this exports hi-fi (HTML) screens.");

  // Open the destination tab NOW — synchronously, while we're still inside the click
  // gesture. Opening it AFTER the async render below counts as a non-user popup and gets
  // blocked (the export then silently does nothing). We fill this tab with the finished PDF,
  // or fall back to a direct download if the popup was blocked anyway.
  const win = window.open("", "_blank");
  if (win?.document?.body) {
    win.document.title = "Exporting…";
    const msg = win.document.createElement("div");
    msg.textContent = "Generating PDF…"; // static text — set via textContent, no markup injection
    msg.setAttribute("style", "display:grid;place-items:center;height:100vh;font-family:system-ui,sans-serif;color:#71717a");
    win.document.body.style.margin = "0";
    win.document.body.appendChild(msg);
  }

  try {
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

    const url = String(pdf!.output("bloburl"));
    if (win) {
      win.location.href = url; // show the PDF in the tab we already opened in-gesture (not blocked)
    } else {
      // Popup blocked despite the in-gesture open — download the file straight to Downloads.
      const a = document.createElement("a");
      a.href = url;
      a.download = "arta-prototype.pdf";
      a.click();
    }
    return pages.length;
  } catch (e) {
    if (win) win.close(); // don't leave the "Generating…" placeholder tab hanging
    throw e;
  }
}
