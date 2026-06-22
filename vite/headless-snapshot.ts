import fs from "node:fs";
import path from "node:path";

// Snapshot a screen by driving a REAL headless Chrome over the dev server's /__arta/render
// route — pixel-identical to the dev's browser (it IS Chrome), with none of the DOM-re-render
// drift that makes a DOM→canvas serializer (modern-screenshot) need case-by-case patches
// (fonts, backdrop-filter, …). We REUSE the browser the dev already has installed; nothing is
// downloaded. If no Chrome is found (or it fails), the caller keeps the client-side shot.

// Common install locations for a Chromium-family browser, per platform.
function findChrome(): string | null {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (env && fs.existsSync(env)) return env;
  const byPlatform: Record<string, string[]> = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    ],
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/snap/bin/chromium",
      "/usr/bin/microsoft-edge",
    ],
  };
  const list = byPlatform[process.platform] || byPlatform.linux;
  return list.find((p) => fs.existsSync(p)) || null;
}

// Device viewport per frame — matches the PDF export + the live DeviceFrame widths, so the
// headless render lays out exactly like the dev's preview.
const FRAME_DIMS: Record<string, { width: number; height: number }> = {
  ios: { width: 384, height: 820 },
  android: { width: 392, height: 820 },
  ipad: { width: 810, height: 1080 },
  web: { width: 1280, height: 820 },
  desktop: { width: 1280, height: 820 },
};
export const frameDims = (frame: string) => FRAME_DIMS[frame] || FRAME_DIMS.web;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Reuse ONE browser across captures (launching Chrome per shot is slow). Lazily started.
let browserPromise: Promise<unknown> | null = null;
let pptr: { launch: (o: unknown) => Promise<unknown> } | null = null;

async function getBrowser(): Promise<any | null> {
  if (browserPromise) {
    try {
      const b: any = await browserPromise;
      if (b && b.connected !== false) return b;
    } catch {
      /* relaunch below */
    }
    browserPromise = null;
  }
  const executablePath = findChrome();
  if (!executablePath) return null;
  if (!pptr) {
    try {
      pptr = ((await import("puppeteer-core")) as any).default;
    } catch {
      return null; // puppeteer-core not installed
    }
  }
  browserPromise = pptr!.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--hide-scrollbars", "--force-color-profile=srgb", "--disable-gpu"],
  });
  try {
    return await browserPromise;
  } catch {
    browserPromise = null;
    return null;
  }
}

// Injected into the page as a STRING (so this Node module needs no DOM types): expand inner
// scroll regions + re-root viewport-anchored bars to the full document, so a fullPage shot
// captures the WHOLE content — the same algorithm as the live full capture. No restore needed
// (the page is thrown away after the shot).
const UNCLAMP_IN_PAGE = `(function(){
  var root=document.documentElement, scrollers=[], fixedBars=[];
  root.querySelectorAll('*').forEach(function(el){
    var cs=window.getComputedStyle(el);
    if((cs.overflowY==='auto'||cs.overflowY==='scroll') && el.scrollHeight>el.clientHeight+4) scrollers.push(el);
    if(cs.position==='fixed') fixedBars.push(el);
  });
  var set=function(el,s){ for(var k in s) el.style[k]=s[k]; };
  var U={flex:'none',height:'auto',maxHeight:'none',minHeight:'0',bottom:'auto'};
  set(document.body,U);
  scrollers.forEach(function(sc){ var n=sc; while(n&&n!==root){ set(n,U); n=n.parentElement; } });
  set(root,Object.assign({position:'relative'},U));
  fixedBars.forEach(function(el){ set(el,{position:'absolute'}); });
})()`;

export interface ChromeShot {
  ok: boolean;
  engine: "chrome" | null;
  reason?: string;
}

// Render `screen` (via baseUrl/__arta/render) in headless Chrome and write its snapshot(s) to
// snapDir: `<id>.png` (viewport-height) and, when `full`, `<id>.full.png` (whole content).
export async function snapshotWithChrome(opts: {
  baseUrl: string;
  project: string;
  screen: string;
  frame: string;
  snapDir: string;
  full: boolean;
}): Promise<ChromeShot> {
  const browser = await getBrowser();
  if (!browser) return { ok: false, engine: null, reason: "no Chrome found" };
  const { width, height } = frameDims(opts.frame);
  const id = opts.screen.replace(/[^a-z0-9_-]/gi, "");
  let page: any;
  try {
    page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    const url = `${opts.baseUrl}/__arta/render?project=${encodeURIComponent(opts.project)}&screen=${encodeURIComponent(opts.screen)}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });
    try { await page.evaluate("document.fonts ? document.fonts.ready : null"); } catch { /* ignore */ }
    await delay(500); // let the CDN Tailwind compile + lucide render
    fs.mkdirSync(opts.snapDir, { recursive: true });
    // Viewport-height shot (the framed-equivalent, content only).
    fs.writeFileSync(path.join(opts.snapDir, id + ".png"), await page.screenshot({ type: "png" }));
    if (opts.full) {
      await page.evaluate(UNCLAMP_IN_PAGE);
      await delay(60); // reflow
      fs.writeFileSync(path.join(opts.snapDir, id + ".full.png"), await page.screenshot({ type: "png", fullPage: true }));
    }
    return { ok: true, engine: "chrome" };
  } catch (e) {
    return { ok: false, engine: null, reason: String((e as Error)?.message || e) };
  } finally {
    if (page) { try { await page.close(); } catch { /* ignore */ } }
  }
}
