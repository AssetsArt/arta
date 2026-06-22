import type { Prototype, Screen } from "./types";
import { resolveScreenHtml, designSheet } from "./prototype";
import { BASE_CSS, HEAD_LIBS } from "./screenDoc";

// Build ONE self-contained, clickable preview of the WHOLE prototype — no Arta editor
// chrome. Every screen body is embedded as data; a single <iframe> renders the active
// screen (its srcdoc rebuilt on navigation), so each screen is the SAME isolated, full-
// height document the live editor / PDF / headless capture use (faithful render, no
// dead-band, per-screen CSS isolated). `data-to` clicks switch the screen; the mock store
// (data-inc/dec/set/bind/show) persists in the parent across navigations. The result is
// served live at /preview AND downloadable as a shareable file — both from this one builder.
//
// Node-safe: imports only from ./prototype, ./screenDoc, ./types (no React / DOM libs).

const FRAMES: Record<string, { w: number; h: number; device: boolean }> = {
  ios: { w: 390, h: 844, device: true },
  android: { w: 392, h: 844, device: true },
  ipad: { w: 810, h: 1080, device: true },
  web: { w: 1280, h: 800, device: false },
  desktop: { w: 1280, h: 800, device: false },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The runtime injected INTO each screen's iframe: wire data-to navigation (→ tell the parent
// to switch screens), the mock store (mutate on data-inc/dec/set, reflect on data-bind/
// data-show), data-nav active state, and lucide icons. A trimmed sibling of the editor's
// in-frame runtime (no annotate / error-forwarding — a preview is for viewing).
const IFRAME_RUNTIME = `
(function(){
  var store = window.__STORE__ || {};
  var screenId = window.__SCREEN__;
  var SCREENS = window.__SCREENS__ || [];
  function up(msg){ parent.postMessage(Object.assign({ source:'arta-frame' }, msg), '*'); }
  function num(v){ var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function safeSel(s){ try { return document.querySelector(s); } catch(_){ return null; } }
  function icons(){ try { window.lucide && window.lucide.createIcons && window.lucide.createIcons(); } catch(_){} }
  window.addEventListener('load', function(){ icons(); setTimeout(icons, 200); });
  function markNav(){
    if(!screenId) return;
    document.querySelectorAll('[data-nav]').forEach(function(el){
      el.classList.toggle('is-active', el.getAttribute('data-nav') === screenId);
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
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href]');
    if(a && !a.hasAttribute('data-to') && !a.hasAttribute('data-set') && !a.hasAttribute('data-inc') && !a.hasAttribute('data-dec')){
      var href = a.getAttribute('href') || '';
      if(href.charAt(0) === '#'){ if(href === '#' || !safeSel(href)) e.preventDefault(); return; }
      e.preventDefault();
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
  markNav(); render(); icons();
})();
`;

// Chrome for the preview shell: a FULL-PAGE airy stage with the device lifted in the centre —
// no permanent menu. A floating pill (top-left) opens a slide-out screen navigator, the same
// pattern as the prototype tab's floating toolbars + Screens rail. Mirrors the viewer's
// light/airy tokens (lib/theme LIGHTC): bg #f7f8f8, white surfaces, #ececec hairlines, #1f2328
// ink, and the emerald accent (accent #10b981 icon, ring #e6e7e7) on the active screen.
const PREVIEW_CSS = `
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:#f7f8f8;color:#1f2328;font-family:'Geist','Noto Sans Thai',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
/* Full-page stage — the device fills the viewport, centred, edge to edge. */
.pv-stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;overflow:auto}
/* The device is a real white screen, lifted off the light canvas with a soft shadow (not a hard
   dark one) — the way Figma/Linear float a device preview. The hairline border defines the bezel. */
.pv-device{background:#fff;overflow:hidden;flex:0 0 auto;max-width:100%;box-shadow:0 1px 2px rgba(15,17,21,.04),0 18px 48px -16px rgba(15,17,21,.18)}
.pv-device--phone{border-radius:44px;border:1px solid #ececec}
.pv-device--flat{border-radius:0;border:0}
#pv{display:block;border:0;width:100%;height:100%;background:#fff}
/* Floating icon toggle — liquid glass circle; hides itself while the panel is open. */
.pv-fab{position:fixed;left:18px;bottom:18px;z-index:30;display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.38);box-shadow:0 8px 32px rgba(0,0,0,.22),0 2px 8px rgba(0,0,0,.14),inset 0 1.5px 0 rgba(255,255,255,.7),inset 0 -1px 0 rgba(0,0,0,.1);-webkit-backdrop-filter:blur(28px) saturate(220%);backdrop-filter:blur(28px) saturate(220%);cursor:pointer;color:#fff;transition:background .15s,border-color .15s,opacity .2s,transform .22s cubic-bezier(.22,1,.36,1)}
.pv-fab:hover{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.52)}
.pv-fab svg{filter:drop-shadow(0 1px 3px rgba(0,0,0,.35))}
.pv-open .pv-fab{opacity:0;pointer-events:none;transform:translateY(6px)}
/* Scrim — click anywhere outside the panel to dismiss; barely dims the canvas. */
.pv-scrim{position:fixed;inset:0;z-index:35;background:rgba(15,17,21,.06);opacity:0;pointer-events:none;transition:opacity .2s}
.pv-open .pv-scrim{opacity:1;pointer-events:auto}
/* Slide-out navigator — the screen list, styled like the prototype tab's Screens rail. */
.pv-side{position:fixed;top:0;left:0;bottom:0;z-index:40;width:256px;display:flex;flex-direction:column;background:#fff;border-right:1px solid #ececec;box-shadow:0 8px 40px -12px rgba(15,17,21,.18);transform:translateX(-100%);transition:transform .24s cubic-bezier(.22,1,.36,1)}
.pv-open .pv-side{transform:translateX(0)}
.pv-side-top{display:flex;align-items:center;gap:8px;padding:16px 14px 12px}
.pv-side-top .pv-dot{width:7px;height:7px;border-radius:50%;background:#10b981;flex:0 0 auto}
.pv-name{font-size:13.5px;font-weight:600;color:#1f2328;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pv-close{margin-left:auto;display:grid;place-items:center;width:26px;height:26px;border:0;border-radius:7px;background:transparent;color:#9a9da3;cursor:pointer;transition:background .12s,color .12s}
.pv-close:hover{background:#f3f4f4;color:#1f2328}
.pv-side-label{padding:6px 16px 8px;font-family:ui-monospace,'SF Mono',Menlo,monospace;font-size:10.5px;font-weight:500;letter-spacing:.6px;text-transform:uppercase;color:#9a9da3}
.pv-list{display:flex;flex-direction:column;gap:2px;padding:0 8px 14px;overflow-y:auto}
.pv-screen{display:flex;align-items:center;gap:9px;width:100%;text-align:left;font:inherit;font-size:13px;font-weight:500;color:#5e6168;background:transparent;border:0;border-radius:7px;padding:8px 10px;cursor:pointer;transition:background .12s,color .12s}
.pv-screen:hover{color:#1f2328;background:#f7f8f8}
.pv-screen .pv-ico{display:grid;place-items:center;color:#9a9da3;flex:0 0 auto}
.pv-screen-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pv-screen.is-active{color:#1f2328;background:#fff;box-shadow:inset 0 0 0 1px #e6e7e7}
.pv-screen.is-active .pv-ico{color:#10b981}
.pv-empty{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#5e6168;font-size:14px}
`;

function safeData(value: unknown): string {
  // JSON.stringify escapes quotes/newlines; also break any </script so an embedded screen
  // body (or HEAD_LIBS, which contains </script>) can't close the parent <script> tag.
  return JSON.stringify(value).replace(/<\/(script)/gi, "<\\/$1");
}

export function buildPrototypePreview(proto: Prototype, opts: { name?: string } = {}): string {
  const screens = (proto.screens || []).filter((s): s is Screen => !!s && !!s.id);
  const name = opts.name || "Prototype";
  if (!screens.length) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} — preview</title><style>${PREVIEW_CSS}</style></head><body><div class="pv-empty">No screens to preview yet.</div></body></html>`;
  }
  const start = proto.start && screens.some((s) => s.id === proto.start) ? proto.start : screens[0].id;

  const screensMap: Record<string, string> = {};
  const cssMap: Record<string, string> = {};
  const metaMap: Record<string, { frame: string; title: string }> = {};
  for (const s of screens) {
    try { screensMap[s.id] = resolveScreenHtml(proto, s); } catch { screensMap[s.id] = ""; }
    cssMap[s.id] = typeof s.css === "string" ? s.css : "";
    metaMap[s.id] = { frame: s.frame || proto.frame || "web", title: s.title || s.id };
  }
  const sheet = designSheet(proto);

  // Inline SVGs (no lucide in the shell — that only loads inside each screen's iframe). Stroke
  // uses currentColor so CSS drives the colour (faint by default, emerald on the active screen).
  const ICON_PANEL = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg>`;
  const ICON_WINDOW = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20"/></svg>`;
  const ICON_X = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;

  const tabs = screens
    .map(
      (s) =>
        `<button class="pv-screen" data-goto="${esc(s.id)}"><span class="pv-ico">${ICON_WINDOW}</span><span class="pv-screen-label">${esc(s.title || s.id)}</span></button>`
    )
    .join("");

  // The parent shell: render the active screen into one iframe (srcdoc rebuilt on nav), hold
  // the store, relay nav/store from the iframe, and keep the URL hash in sync for deep-links.
  const PARENT = `
(function(){
  var SHEET = ${safeData(sheet)};
  var BASE = ${safeData(BASE_CSS)};
  var HEAD = ${safeData(HEAD_LIBS)};
  var RT = ${safeData(IFRAME_RUNTIME)};
  var SCREENS = ${safeData(screensMap)};
  var CSS = ${safeData(cssMap)};
  var META = ${safeData(metaMap)};
  var FRAMES = ${safeData(FRAMES)};
  var START = ${safeData(start)};
  var IDS = Object.keys(SCREENS);
  var store = ${safeData(proto.store || {})};
  var current = null;

  function buildDoc(id){
    var inject = '<scr'+'ipt>window.__STORE__='+JSON.stringify(store)+';window.__SCREEN__='+JSON.stringify(id)+';window.__SCREENS__='+JSON.stringify(IDS)+';</scr'+'ipt>';
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<style>'+BASE+'\\n'+SHEET+'\\n'+(CSS[id]||'')+'</style>'+HEAD+inject+'<scr'+'ipt>'+RT+'</scr'+'ipt>'
      + '</head><body>'+(SCREENS[id]||'')+'</body></html>';
  }
  function applyFrame(id){
    var f = (META[id]||{}).frame || 'web';
    var dim = FRAMES[f] || FRAMES.web;
    var dev = document.getElementById('pv-device');
    var ifr = document.getElementById('pv');
    dev.className = 'pv-device ' + (dim.device ? 'pv-device--phone' : 'pv-device--flat');
    var availW = window.innerWidth, availH = window.innerHeight;
    if(!dim.device){
      // Flat (web/desktop): truly full-screen, no scaling — the iframe IS the viewport.
      dev.style.width = availW + 'px'; dev.style.height = availH + 'px';
      ifr.style.width = availW + 'px'; ifr.style.height = availH + 'px';
      ifr.style.transform = 'none'; ifr.style.transformOrigin = 'top left';
    } else {
      // Phone/tablet: scale to fit while preserving the device aspect ratio.
      var scale = Math.min(1, availW / dim.w, availH / dim.h);
      var w = Math.round(dim.w * scale), h = Math.round(dim.h * scale);
      dev.style.width = w + 'px'; dev.style.height = h + 'px';
      ifr.style.width = dim.w + 'px'; ifr.style.height = dim.h + 'px';
      ifr.style.transform = 'scale(' + scale + ')'; ifr.style.transformOrigin = 'top left';
    }
  }
  function markActive(id){
    document.querySelectorAll('.pv-screen').forEach(function(b){ b.classList.toggle('is-active', b.getAttribute('data-goto') === id); });
  }
  function openSide(){ document.body.classList.add('pv-open'); }
  function closeSide(){ document.body.classList.remove('pv-open'); }
  function show(id){
    if(!SCREENS[id]) id = START;
    current = id;
    applyFrame(id);
    document.getElementById('pv').srcdoc = buildDoc(id);
    if(location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    markActive(id);
  }
  window.addEventListener('message', function(e){
    var d = e.data; if(!d || d.source !== 'arta-frame') return;
    if(d.type === 'nav' && d.to){ show(d.to); }
    else if(d.type === 'store'){ store = d.store || store; }
  });
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-goto]'); if(!b) return;
    show(b.getAttribute('data-goto'));
  });
  document.getElementById('pv-fab').addEventListener('click', openSide);
  document.getElementById('pv-close').addEventListener('click', closeSide);
  document.getElementById('pv-scrim').addEventListener('click', closeSide);
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeSide(); });
  window.addEventListener('resize', function(){ if(current) applyFrame(current); });
  window.addEventListener('hashchange', function(){ var id = location.hash.slice(1); if(id && SCREENS[id] && id !== current) show(id); });
  show(location.hash.slice(1) || START);
})();
`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} — preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${PREVIEW_CSS}</style>
</head><body>
<div class="pv-stage"><div class="pv-device" id="pv-device"><iframe id="pv" title="prototype"></iframe></div></div>
<button class="pv-fab" id="pv-fab" title="Screens" aria-label="Screens">${ICON_PANEL}</button>
<div class="pv-scrim" id="pv-scrim"></div>
<aside class="pv-side" id="pv-side" aria-label="Screens">
<div class="pv-side-top"><span class="pv-dot"></span><span class="pv-name">${esc(name)}</span><button class="pv-close" id="pv-close" title="Close" aria-label="Close">${ICON_X}</button></div>
<div class="pv-side-label">Screens</div>
<div class="pv-list">${tabs}</div>
</aside>
<script>${PARENT}</script>
</body></html>`;
}
