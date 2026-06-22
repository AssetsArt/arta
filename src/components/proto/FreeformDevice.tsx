import { useCallback, useEffect, useMemo, useRef } from "react";
import { domToPng } from "modern-screenshot";
import type { StoreState } from "../../lib/types";
import { reportSnapshot } from "../../lib/useArta";
import { FONT_LINK } from "../../lib/prototype";
import { BASE_CSS, HEAD_LIBS } from "../../lib/screenDoc";

export interface AnnotateTarget {
  tag: string;
  text: string;
  selector: string;
}

interface Props {
  screenId: string;
  /** All screen ids in the prototype — injected so the frame can resolve a stray
   *  `<a href="screenId">` to a real nav instead of letting it reload the viewer. */
  screenIds: string[];
  title: string;
  html: string;
  css: string | undefined;
  designSystem: string | undefined;
  store: StoreState;
  storeVersion: number;
  /** The device-frame outer node to snapshot (bezel + chrome + content). When set, the
   *  snapshot captures the whole framed device — what the dev sees — instead of just the
   *  iframe body. Falls back to the iframe body if absent. */
  captureNodeRef?: React.RefObject<HTMLElement | null>;
  annotate: boolean;
  go: (to?: string) => void;
  onStore: (next: StoreState) => void;
  onError: (message: string) => void;
  onAnnotate: (target: AnnotateTarget) => void;
}

// Tiny runtime injected into each screen's iframe. It wires:
//   • navigation  — [data-to="screenId"] → tell the parent to change screen
//   • mock store  — [data-inc]/[data-dec]/[data-set] mutate, [data-bind]/[data-show] reflect
//   • annotate    — when the dev turns on comment mode, a click reports the element
//                   to the parent instead of acting (so feedback can point at it)
//   • errors      — window errors + console.error are forwarded up so the agent sees them
const RUNTIME = `
(function(){
  var store = window.__STORE__ || {};
  var screenId = window.__SCREEN__;
  var SCREENS = window.__SCREENS__ || [];
  var annotate = false;
  function up(msg){ parent.postMessage(Object.assign({ source:'arta-frame' }, msg), '*'); }
  function num(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function safeSel(s){ try { return document.querySelector(s); } catch(_){ return null; } }
  // The prototype navigates via data-to, never a real href. This frame is a srcdoc
  // iframe, so a relative href resolves against the VIEWER origin — clicking it would
  // load the whole Arta app INTO the frame (a viewer nested in itself). Warn once per
  // bad href so arta_get_view surfaces it and the agent switches to data-to.
  var _hrefWarned = {};
  function warnHref(h){
    if(_hrefWarned[h]) return; _hrefWarned[h] = 1;
    up({ type:'error', message: 'a link used href="' + h + '" to navigate — use data-to="screenId" instead; in the prototype an href reloads the viewer into itself.' });
  }
  // Render any <i data-lucide="name"> placeholders into SVGs (lucide loads from
  // the CDN injected in <head>). Idempotent — safe to call repeatedly. After it
  // runs, any <i data-lucide> still in the DOM had an UNKNOWN icon name (a typo /
  // hallucinated name like "chevron-up-down" vs "chevrons-up-down") and renders
  // BLANK. lucide only console.warns that, which is easy to miss — so surface each
  // bad name once as an error, so arta_get_view shows it and the agent can fix it.
  var _iconWarned = {};
  function icons(){
    var ready = !!(window.lucide && window.lucide.createIcons);
    if(ready){ try { window.lucide.createIcons(); } catch(_){} }
    if(!ready) return; // lucide not loaded yet — this re-runs on 'load'
    try {
      var names = [];
      document.querySelectorAll('i[data-lucide]').forEach(function(el){
        var n = el.getAttribute('data-lucide');
        if(n && !_iconWarned[n]){ _iconWarned[n] = 1; names.push(n); }
      });
      if(names.length) up({ type:'error', message: 'lucide icon name(s) not found, rendering blank: ' + names.join(', ') + ' — check exact names at lucide.dev/icons' });
    } catch(_){}
  }
  window.addEventListener('load', icons);
  window.addEventListener('error', function(e){ up({ type:'error', message: e.message + (e.filename ? (' @ ' + e.filename + ':' + e.lineno) : '') }); });
  window.addEventListener('unhandledrejection', function(e){ up({ type:'error', message: 'unhandled rejection: ' + ((e.reason && e.reason.message) || e.reason) }); });
  var _err = console.error; console.error = function(){ try { up({ type:'error', message: Array.prototype.map.call(arguments, String).join(' ') }); } catch(_){} _err.apply(console, arguments); };

  function markNav(){
    if(!screenId) return;
    document.querySelectorAll('[data-nav]').forEach(function(el){
      if(el.getAttribute('data-nav') === screenId) el.classList.add('is-active');
      else el.classList.remove('is-active');
    });
  }
  function render(){
    document.querySelectorAll('[data-bind]').forEach(function(el){
      var k = el.getAttribute('data-bind');
      el.textContent = (store[k] !== undefined && store[k] !== null) ? store[k] : '';
    });
    document.querySelectorAll('[data-show]').forEach(function(el){
      var c = el.getAttribute('data-show'), vis;
      if(c.indexOf('==') > -1){ var p = c.split('=='); vis = String(store[p[0].trim()]) === p[1].trim(); }
      else { var v = store[c.trim()]; vis = !!v && v !== '0' && v !== 0; }
      el.style.display = vis ? '' : 'none';
    });
  }
  function mutate(el){
    var changed = false;
    var set = el.getAttribute('data-set');
    if(set){ set.split(';').forEach(function(pair){
      var i = pair.indexOf('='); if(i < 0) return;
      var k = pair.slice(0,i).trim(), v = pair.slice(i+1).trim();
      store[k] = (v !== '' && !isNaN(+v)) ? +v : v; changed = true;
    }); }
    var inc = el.getAttribute('data-inc');
    if(inc){ inc.split(',').forEach(function(k){ k = k.trim(); store[k] = num(store[k]) + 1; }); changed = true; }
    var dec = el.getAttribute('data-dec');
    if(dec){ dec.split(',').forEach(function(k){ k = k.trim(); store[k] = Math.max(0, num(store[k]) - 1); }); changed = true; }
    if(changed){ render(); up({ type:'store', store: store }); }
  }
  function describe(el){
    var sel = el.tagName.toLowerCase();
    if(el.id) sel += '#' + el.id;
    else if(el.className && typeof el.className === 'string') { var c0 = el.className.trim().split(/\\s+/)[0]; if(c0) sel += '.' + c0; }
    return { tag: el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 80), selector: sel };
  }
  function init(){
    // Annotate clicks run in the capture phase so they pre-empt nav/mutate.
    document.addEventListener('click', function(e){
      if(!annotate) return;
      e.preventDefault(); e.stopPropagation();
      up({ type:'annotate', target: describe(e.target) });
    }, true);
    document.addEventListener('click', function(e){
      if(annotate) return;
      // Intercept raw <a href> nav before anything else (see warnHref). A bare data-*
      // anchor is handled below; only plain hrefs reach here.
      var a = e.target.closest('a[href]');
      if(a && !a.hasAttribute('data-to') && !a.hasAttribute('data-set') && !a.hasAttribute('data-inc') && !a.hasAttribute('data-dec')){
        var href = a.getAttribute('href') || '';
        if(href.charAt(0) === '#'){ if(href === '#' || !safeSel(href)) e.preventDefault(); return; }
        e.preventDefault();
        warnHref(href);
        // If the href names a real screen (e.g. href="/customer-status"), do that nav
        // so the agent's mistake still lands on the right screen; otherwise it's a safe
        // no-op (the destructive frame-reload is already prevented).
        var seg = href.replace(/[?#].*$/, '').replace(/^[a-z]+:\\/\\/[^/]+/i, '').replace(/^[./]+/, '').replace(/\\/+$/, '').replace(/\\.html?$/i, '');
        var id = seg.split('/').pop();
        if(id && SCREENS.indexOf(id) > -1) up({ type:'nav', to: id });
        return;
      }
      var t = e.target.closest('[data-to],[data-set],[data-inc],[data-dec]');
      if(!t) return;
      e.preventDefault();
      if(t.hasAttribute('data-set') || t.hasAttribute('data-inc') || t.hasAttribute('data-dec')) mutate(t);
      var to = t.getAttribute('data-to');
      if(to) up({ type:'nav', to: to });
    });
    document.addEventListener('submit', function(e){ e.preventDefault(); });
    window.addEventListener('message', function(e){
      var d = e.data;
      if(!d || d.source !== 'arta-parent') return;
      if(d.type === 'annotate'){ annotate = !!d.on; document.body.classList.toggle('arta-annotate', annotate); }
    });
    markNav();
    render();
    icons();
  }
  // Error capture is live immediately (this script is in <head>, before body
  // parses), so errors thrown by the screen's own markup are caught too. DOM
  // wiring waits until the body exists.
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
`;

// BASE_CSS + HEAD_LIBS live in ../../lib/screenDoc (Node-safe, shared with the PDF export and
// the dev server's headless-Chrome snapshot, so every render path paints identically).

// Snapshot the framed device — the SAME viewport the dev sees (bezel + chrome + content).
export async function captureFramedPng(node: HTMLElement): Promise<string> {
  return domToPng(node, { scale: 2, height: Math.min(node.scrollHeight, 2400) });
}

// modern-screenshot can't render `backdrop-filter: blur()` (frosted glass) — a
// `bg-white/90 backdrop-blur` bar (a sticky header, a bottom CTA, a tabbar) comes out as a
// translucent GHOST smearing the content behind it. For the shot, drop the blur and make the
// (usually translucent) background opaque, so the bar reads as the clean solid bar the dev
// effectively sees. Returns a restore fn. Applied to both the framed and full captures (and
// the PDF export, via captureFullPng), then reverted so the live view is untouched.
function neutralizeBackdropBlur(doc: Document): () => void {
  const win = doc.defaultView;
  if (!win) return () => {};
  const saved: Array<[HTMLElement, Record<string, string>]> = [];
  doc.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const cs = win.getComputedStyle(el);
    const bf = cs.backdropFilter || (cs as unknown as Record<string, string>).webkitBackdropFilter || "";
    if (!bf || bf === "none") return;
    const prev: Record<string, string> = {
      backdropFilter: el.style.backdropFilter,
      webkitBackdropFilter: (el.style as unknown as Record<string, string>).webkitBackdropFilter,
      backgroundColor: el.style.backgroundColor,
    };
    (el.style as unknown as Record<string, string>).backdropFilter = "none";
    (el.style as unknown as Record<string, string>).webkitBackdropFilter = "none";
    const m = cs.backgroundColor.match(/^rgba?\(([^)]+)\)/); // drop the alpha → a solid bar, not a ghost
    if (m) {
      const p = m[1].split(",").map((s) => s.trim());
      if (p.length >= 3) el.style.backgroundColor = `rgb(${p[0]}, ${p[1]}, ${p[2]})`;
    }
    saved.push([el, prev]);
  });
  return () => {
    for (const [el, prev] of saved) for (const k of Object.keys(prev)) (el.style as unknown as Record<string, string>)[k] = prev[k];
  };
}

// Snapshot the WHOLE screen at content length, in one tall image. A modern app screen
// scrolls inside an INNER overflow region (a fixed-height shell of header + scroll-body +
// tabbar), so the DOCUMENT itself doesn't scroll and documentElement.scrollHeight only
// reports the viewport — which made `full` fall back to the framed shot. So find every real
// scroll region, unclamp it (+ its ancestor chain) to natural height, AND re-root viewport-
// anchored bars (a screen's own `absolute/fixed bottom-0` tabbar) to the full document — else
// the bar lands mid-image and its translucent fill whites out the content behind it. Capture,
// then restore the inline styles byte-for-byte. Returns null when nothing scrolls (the framed
// shot already shows everything) — unless `always` is set (the PDF export wants every screen's
// full content regardless). Shared by the live loop and the PDF export so both stay in sync.
export async function captureFullPng(doc: Document, opts: { always?: boolean } = {}): Promise<string | null> {
  const root = doc.documentElement;
  const win = doc.defaultView;
  if (!win) return null;
  // One walk: find real scroll regions (overflowing auto/scroll) AND viewport-anchored
  // bars (position:fixed) — both need handling for a faithful full-length shot.
  const scrollers: HTMLElement[] = [];
  const fixedBars: HTMLElement[] = [];
  root.querySelectorAll<HTMLElement>("*").forEach((el) => {
    const cs = win.getComputedStyle(el);
    if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 4) scrollers.push(el);
    if (cs.position === "fixed") fixedBars.push(el);
  });
  const docScrolls = root.scrollHeight > root.clientHeight + 8;
  if (!scrollers.length && !docScrolls && !opts.always) return null; // fits — framed shot is complete

  // Drop frosted-glass (backdrop-filter) so bars render solid, not as a translucent smear.
  const restoreBlur = neutralizeBackdropBlur(doc);
  // Build temporary style overrides per element (a Map dedups, so a node reached twice —
  // e.g. <body> via two scrollers — is saved once and restores cleanly), then apply,
  // capture, and restore byte-for-byte.
  const want = new Map<HTMLElement, Record<string, string>>();
  const set = (el: HTMLElement | null, styles: Record<string, string>) => {
    if (el) want.set(el, Object.assign(want.get(el) || {}, styles));
  };
  // (a) Unclamp scroll regions + their ancestor chains to natural height so the whole
  // content lays out (height:auto beats a fixed/flex/max-height; bottom:auto frees an
  // inset-0 fill). Overflow is left ALONE so horizontal rails keep their peek.
  const UNCLAMP: Record<string, string> = { flex: "none", height: "auto", maxHeight: "none", minHeight: "0", bottom: "auto" };
  set(doc.body, UNCLAMP);
  scrollers.forEach((sc) => { let n: HTMLElement | null = sc; while (n && n !== root) { set(n, UNCLAMP); n = n.parentElement; } });
  // (b) Make the root a FULL-HEIGHT containing block and re-root viewport-anchored bars to it.
  set(root, Object.assign({ position: "relative" }, UNCLAMP));
  fixedBars.forEach((el) => set(el, { position: "absolute" }));

  const saved: Array<[HTMLElement, Record<string, string>]> = [];
  for (const [el, styles] of want) {
    const prev: Record<string, string> = {};
    for (const k of Object.keys(styles)) { prev[k] = (el.style as unknown as Record<string, string>)[k]; (el.style as unknown as Record<string, string>)[k] = styles[k]; }
    saved.push([el, prev]);
  }
  const fullH = Math.max(root.scrollHeight, doc.body?.scrollHeight || 0); // reading it forces the reflow
  const bg = win.getComputedStyle(doc.body).backgroundColor || "#fff";
  try {
    return await domToPng(root, { scale: 2, height: Math.min(fullH, 12000), backgroundColor: bg });
  } finally {
    for (const [el, prev] of saved) for (const k of Object.keys(prev)) (el.style as unknown as Record<string, string>)[k] = prev[k];
    restoreBlur();
  }
}

export function FreeformDevice({
  screenId,
  screenIds,
  title,
  html,
  css,
  designSystem,
  store,
  storeVersion,
  captureNodeRef,
  annotate,
  go,
  onStore,
  onError,
  onAnnotate,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // A capture mutates the iframe DOM (unclamping scroll regions for the full shot), so
  // a second capture must not start while one is in flight — guard re-entry.
  const capturingRef = useRef(false);
  const storeRef = useRef<StoreState>(store);
  storeRef.current = store;
  const screenIdsRef = useRef(screenIds);
  screenIdsRef.current = screenIds;
  // Stable dep so the iframe only rebuilds when the screen LIST actually changes,
  // not on every render (screenIds is a fresh array each time).
  const screensKey = screenIds.join("");

  // Keep callbacks in refs so the single message listener never re-subscribes.
  const cbs = useRef({ go, onStore, onError, onAnnotate });
  cbs.current = { go, onStore, onError, onAnnotate };

  const srcDoc = useMemo(() => {
    const sheet = `${BASE_CSS}\n${designSystem ?? ""}\n${css ?? ""}`;
    const boot = `<script>window.__STORE__=${JSON.stringify(storeRef.current)};window.__SCREEN__=${JSON.stringify(screenId)};window.__SCREENS__=${JSON.stringify(screenIdsRef.current)}</script>`;
    // boot + runtime go in <head> so error capture is armed before the body
    // (and any screen-authored <script>) runs.
    return `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>${sheet}</style>${boot}<script>${RUNTIME}</script>${HEAD_LIBS}</head><body>${html}</body></html>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId, html, css, designSystem, storeVersion, screensKey]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "arta-frame") return;
      if (d.type === "nav" && typeof d.to === "string") cbs.current.go(d.to);
      else if (d.type === "store" && d.store) cbs.current.onStore(d.store as StoreState);
      else if (d.type === "error" && d.message) cbs.current.onError(String(d.message));
      else if (d.type === "annotate" && d.target) cbs.current.onAnnotate(d.target as AnnotateTarget);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Push annotate mode into the frame whenever it toggles.
  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ source: "arta-parent", type: "annotate", on: annotate }, "*");
  }, [annotate, srcDoc]);

  // Capture the rendered screen → snapshot the agent can fetch. Runs after load
  // and (debounced) after store changes, so the picture stays current.
  //
  // modern-screenshot serialises the DOM into an SVG <foreignObject> and lets the
  // REAL browser engine paint it (fonts/flex/grid/shadow/gradient/transform all
  // resolve exactly as on screen) — unlike html2canvas, which reimplemented CSS in
  // JS and drifted from the live render. The screen lives in a same-origin iframe,
  // so we capture its own <html> in its own context for a faithful picture.
  const capture = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    if (capturingRef.current) return; // a capture is in flight; it mutates the shared DOM
    // Prefer the device-frame outer node (bezel + status bar + home indicator + content)
    // so the snapshot is the SAME framed device the dev sees — not a bare content card.
    // modern-screenshot clones the same-origin iframe's content into it, and embeds the
    // @font-face from the PARENT document (the viewer loads all five families, see
    // index.html), so the fonts paint right. Falls back to the iframe body if the device
    // node isn't wired up.
    const node = captureNodeRef?.current ?? doc.body;
    if (!node) return;
    capturingRef.current = true;
    // NON-DESTRUCTIVE live capture: the framed shot only, and WITHOUT mutating the visible
    // iframe. The old path neutralized backdrop-blur AND unclamped inner scroll regions /
    // re-rooted fixed bars in place (then reverted) to also save a full-length client shot —
    // but that apply→capture→revert ran on the LIVE iframe, so the screen visibly reflowed
    // and FLICKERED on every navigation (every screen with an inner scroll region). The
    // faithful full-length + frosted-correct shots now come from the headless-Chrome engine
    // (arta_get_screenshot's default), rendered OFF-SCREEN — no flicker, better fidelity.
    // captureFramedPng clones the node to render, so capturing it as-is touches nothing on
    // screen. (captureFullPng / neutralizeBackdropBlur stay — the PDF export still uses them
    // off-screen, where mutation is invisible.)
    const shoot = async () => {
      try { reportSnapshot(screenId, await captureFramedPng(node)); }
      catch { /* keep prior framed shot */ }
      finally { capturingRef.current = false; }
    };
    // Wait for web fonts before capturing — otherwise the snapshot can freeze a system
    // fallback (e.g. Fraunces → Georgia/Times). Both the iframe's fonts (the content) and
    // the parent's (the embedded @font-face the capture relies on, + the chrome text) must
    // be ready; `fonts.ready` resolves immediately if already loaded. Shoot on settle so
    // it can't hang.
    const waits = [doc.fonts?.ready, node.ownerDocument?.fonts?.ready].filter(
      (p): p is Promise<FontFaceSet> => typeof (p as Promise<unknown>)?.then === "function"
    );
    if (waits.length) Promise.all(waits).then(shoot, shoot);
    else shoot();
  }, [screenId, captureNodeRef]);

  useEffect(() => {
    const t = window.setTimeout(capture, 700);
    return () => window.clearTimeout(t);
  }, [store, capture]);

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      onLoad={() => window.setTimeout(capture, 450)}
      sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
      className="h-full w-full border-0 bg-white"
    />
  );
}
