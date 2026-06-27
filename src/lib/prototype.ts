import type { DesignTokens, Prototype, Screen, TemplateVars } from "./types";

// The web-font families preloaded into every freeform screen (and the design-system
// gallery), so the AI can compose brand-grade type pairings — not just one sans.
// A neutral sans + mono (Geist), an elegant display serif (Instrument Serif), a warm
// variable serif (Fraunces), and a geometric display (Space Grotesk). The Latin faces
// above are Latin-only, so Noto Sans/Serif Thai are loaded too — put them in a font-family
// fallback chain (`'Fraunces', 'Noto Serif Thai', serif`) so non-Latin text renders in a
// real designed face instead of a broken system fallback. Kept in sync across the screen
// iframe, the render harness, and the component-preview iframe via this one constant.
export const FONT_LINK =
  `<link rel="preconnect" href="https://fonts.googleapis.com">` +
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
  `<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&family=Noto+Serif+Thai:wght@400;500;600;700&display=swap" rel="stylesheet">`;

// Minimal, mustache-flavoured templating for the prototype layer so the AI can
// share a layout and components instead of repeating markup on every screen:
//
//   {{>name}}   include the shared component prototype.components[name]
//   {{slot}}    (layout only) the current screen's body
//   {{name}}    a template variable from screen.vars / prototype.vars
//
// Editing one shared component or the layout updates every screen at once — the
// whole point: change a header in one place, no per-screen drift.

const INCLUDE_RE = /\{\{>\s*([\w-]+)\s*\}\}/g;
const VAR_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;

function expand(tpl: string, components: Record<string, string>, vars: TemplateVars, depth = 0): string {
  if (depth > 12) return tpl; // guard against component cycles
  let out = tpl.replace(INCLUDE_RE, (_m, name: string) => {
    const frag = components[name];
    return frag != null ? expand(frag, components, vars, depth + 1) : "";
  });
  out = out.replace(VAR_RE, (m, key: string) => {
    if (key === "slot") return m; // reserved for the layout's body slot
    return vars[key] != null ? String(vars[key]) : "";
  });
  return out;
}

// Expand a standalone fragment (resolve {{>includes}} and {{vars}}) — used to
// preview a component in the design-system gallery the way screens render it.
export function expandFragment(proto: Prototype, html: string): string {
  return expand(html, proto.components || {}, { ...(proto.vars || {}) });
}

// Compose the final HTML for one screen: expand its body, expand the layout,
// then drop the body into the layout's {{slot}}.
export function resolveScreenHtml(proto: Prototype, screen: Screen): string {
  const components = proto.components || {};
  const vars: TemplateVars = { ...(proto.vars || {}), ...(screen.vars || {}) };
  const body = expand(screen.html ?? "", components, vars);

  // A blank layout (`""` or whitespace, at the screen OR prototype level) means "no layout",
  // same as missing. `??` alone keeps `""` (an empty string is not nullish), which wrapped
  // every screen in an empty shell with no {{slot}} — the body was dropped and the screen
  // rendered blank white (a real bug hit when a prototype shipped `layout: ""`). Coerce blanks
  // to undefined so the `??` chain falls through to the default.
  const norm = <T,>(v: T): T | undefined => (typeof v === "string" && v.trim() === "" ? undefined : v);
  const layoutTpl = screen.layout === false || screen.layout === "none" ? "{{slot}}" : norm(screen.layout) ?? norm(proto.layout) ?? "{{slot}}";

  const shell = expand(layoutTpl, components, vars);
  // Defense in depth: a layout with no {{slot}} at all (a malformed template, not just blank)
  // would still drop the whole body. If the shell can't host the screen, render the body
  // directly — a screen never silently disappears because its layout was wrong.
  if (!/\{\{\s*slot\s*\}\}/.test(shell)) return body;
  return shell.replace(/\{\{\s*slot\s*\}\}/g, body);
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// The preloaded display/text faces (Geist, Instrument Serif, Fraunces, Space Grotesk)
// are Latin-only, so a token like `'Geist', system-ui, sans-serif` leaves Thai (and any
// other non-Latin) to the generic system fallback. That fallback resolves to DIFFERENT
// faces in the live screen iframe than in a snapshot — modern-screenshot repaints the
// cloned iframe inside the viewer's PARENT document (see FreeformDevice.capture), where
// `system-ui` / `sans-serif` map to other Thai faces with different metrics. The dev and
// the agent then saw different glyph widths and long strings wrapped/overlapped only in
// the snapshot. Pinning a loaded Noto Thai face IN the chain ties non-Latin text to one
// webfont that paints identically in both contexts. Injected automatically so EVERY
// prototype gets snapshot↔live parity even when the authored token omits it (e.g. a build
// from a harness that never loaded the skill's font guidance).
function withThaiFallback(value: string): string {
  if (/Noto\s+(?:Sans|Serif)\s+Thai/i.test(value)) return value; // already pinned
  const serif = /\bserif\b/i.test(value) && !/sans-serif/i.test(value);
  const thai = serif ? "'Noto Serif Thai'" : "'Noto Sans Thai'";
  const generic = /^(?:serif|sans-serif|monospace|system-ui|ui-serif|ui-sans-serif|ui-monospace|cursive|fantasy)$/i;
  const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
  const gi = parts.findIndex((p) => generic.test(p));
  if (gi >= 0) parts.splice(gi, 0, thai);
  else parts.push(thai);
  return parts.join(", ");
}

// Compile structured design tokens into CSS custom properties (a :root block) so
// screens reference them — var(--color-primary), var(--space-4), var(--radius-lg),
// var(--shadow-md), var(--text-h1), var(--font-sans) — keeping the design system
// the single source of truth.
export function compileTokens(tokens?: DesignTokens): string {
  if (!tokens) return "";
  const lines: string[] = [];
  const add = (prefix: string, items?: { name: string; value: string }[]) =>
    (items || []).forEach((t) => {
      if (t?.name && t.value != null) lines.push(`  --${prefix}-${slug(t.name)}: ${t.value};`);
    });
  add("color", tokens.colors);
  add("space", tokens.spacing);
  add("radius", tokens.radii);
  add("shadow", tokens.shadows);
  (tokens.fonts || []).forEach((t) => {
    if (t?.name && t.value != null) lines.push(`  --font-${slug(t.name)}: ${withThaiFallback(String(t.value))};`);
  });
  (tokens.typography || []).forEach((t) => {
    if (t?.name && t.size) lines.push(`  --text-${slug(t.name)}: ${t.size};`);
  });
  return lines.length ? `:root{\n${lines.join("\n")}\n}` : "";
}

// The full stylesheet injected into every freeform screen: compiled token vars
// first (so custom CSS can reference them), then the authored designSystem CSS.
export function designSheet(proto: Prototype): string {
  return [compileTokens(proto.tokens), proto.designSystem || ""].filter(Boolean).join("\n");
}

// Recover displayable tokens from the `:root` custom properties in a stylesheet — the
// inverse of compileTokens. The Design-system tab reads structured `prototype.tokens`, but
// the AI often sets up the system as raw CSS (arta_set_design_system) with a `:root` block
// and never calls arta_set_design_tokens — which left the tab blank even though a real
// design system existed. Parsing the authored CSS's `:root` vars back into tokens makes the
// tab reflect the system whichever way it was authored. Reads ONLY `:root` blocks, so
// per-component custom properties don't leak in.
// A value is a colour if it's a hex, a colour function, or a common named colour. Anchored
// so a multi-part value (a shadow like `0 1px 2px #0003`) is NOT mistaken for a colour.
const isColorVal = (v: string) =>
  /^#[0-9a-f]{3,8}$/i.test(v) ||
  /^(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\s*\(/i.test(v) ||
  /^(transparent|currentcolor|black|white|red|green|blue|orange|purple|pink|gray|grey|yellow|teal|cyan|magenta|indigo|violet|slate|navy|gold|brown|beige|cream|coral|salmon|lime|olive|maroon|aqua|silver|crimson|tomato|turquoise|azure|ivory|khaki|plum|tan|wheat)$/i.test(v);
const isLenVal = (v: string) => /^-?[\d.]+(px|rem|em|%|vh|vw|vmin|vmax|pt|ch|ex|q|cm|mm|in|pc)$/i.test(v);
const looksShadow = (n: string, v: string) => /shadow|elevation/i.test(n) || /\binset\b/i.test(v) || /(?:[\d.][\w.%-]*\s+){2,}(?:rgb|hsl|#|oklch|color)/i.test(v);
const looksFontStack = (n: string, v: string) => /font|family|typeface/i.test(n) || v.includes(",") || /\b(serif|sans-serif|monospace|system-ui|ui-sans-serif|ui-serif|ui-monospace|cursive)\b/i.test(v);
const looksRadius = (n: string) => /radius|rounded|corner|radii/i.test(n) || /(^|[-_])r($|[-_\d])/i.test(n);

export function tokensFromCss(css?: string): DesignTokens {
  const out: DesignTokens = {};
  if (!css || !css.trim()) return out;
  // Gather custom properties from the GLOBAL root rules only — :root is canonical, but
  // agents commonly hang tokens off html/body/:host too (or a `:root,:host` list). Per-
  // component/class rules are skipped so their local vars don't leak in. `.dark{}` is the
  // dark-theme overlay (handled by darkVars), not the light palette, so exclude it here.
  const isRootSel = (sel: string) =>
    !/\.dark\b/.test(sel) &&
    sel.split(",").some((s) => {
      const t = s.trim();
      return t === ":root" || t === "html" || t === "body" || t === ":host" || /(^|[\s>~+]):root\b/.test(t);
    });
  const body = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter((m) => isRootSel(m[1]))
    .map((m) => m[2])
    .join(";");
  const seen = new Set<string>();
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)) {
    const name = m[1].trim();
    const value = m[2].trim();
    if (!value || seen.has(name)) continue;
    seen.add(name);
    // Prefix naming wins (the inverse of compileTokens); otherwise classify by the value's
    // shape so a freeform `--accent: #0a84ff` / `--mac-bg` still renders as a swatch instead
    // of leaving the tab on the bare "define tokens" placeholder (the #1 recurring report).
    if (name.startsWith("color-")) (out.colors ||= []).push({ name: name.slice(6), value });
    else if (name.startsWith("font-")) (out.fonts ||= []).push({ name: name.slice(5), value });
    else if (name.startsWith("radius-")) (out.radii ||= []).push({ name: name.slice(7), value });
    else if (name.startsWith("shadow-")) (out.shadows ||= []).push({ name: name.slice(7), value });
    else if (name.startsWith("space-") || name.startsWith("spacing-")) (out.spacing ||= []).push({ name: name.replace(/^spac(?:e|ing)-/, ""), value });
    else if (name.startsWith("text-")) (out.typography ||= []).push({ name: name.slice(5), size: value });
    else if (looksShadow(name, value)) (out.shadows ||= []).push({ name, value });
    else if (isColorVal(value)) (out.colors ||= []).push({ name, value });
    else if (looksFontStack(name, value)) (out.fonts ||= []).push({ name, value });
    else if (looksRadius(name) && isLenVal(value)) (out.radii ||= []).push({ name, value });
    else if (isLenVal(value) && /space|spacing|gap|gutter|inset|pad|margin|size/i.test(name)) (out.spacing ||= []).push({ name, value });
  }
  return out;
}

// The prototype's dark-theme token overrides: every custom property declared under a `.dark`
// rule (e.g. `.dark{--color-bg:#0b0b0c}`), keyed by the raw var name (without the `--`). The
// Design-system tab uses this to show a colour's dark value when previewing the dark theme.
// Returns {} when the system has no `.dark` block (light-only prototype).
export function darkVars(css?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!css || !css.trim()) return out;
  const body = [...css.matchAll(/\.dark\b[^{]*\{([^}]*)\}/g)].map((m) => m[1]).join(";");
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*([^;]+)/g)) {
    const name = m[1].trim();
    if (!(name in out)) out[name] = m[2].trim();
  }
  return out;
}
