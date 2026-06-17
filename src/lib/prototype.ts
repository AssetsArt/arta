import type { Prototype, Screen, TemplateVars } from "./types";

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

// Compose the final HTML for one screen: expand its body, expand the layout,
// then drop the body into the layout's {{slot}}.
export function resolveScreenHtml(proto: Prototype, screen: Screen): string {
  const components = proto.components || {};
  const vars: TemplateVars = { ...(proto.vars || {}), ...(screen.vars || {}) };
  const body = expand(screen.html ?? "", components, vars);

  const layoutTpl = screen.layout === false || screen.layout === "none" ? "{{slot}}" : screen.layout ?? proto.layout ?? "{{slot}}";

  const shell = expand(layoutTpl, components, vars);
  return shell.replace(/\{\{\s*slot\s*\}\}/g, body);
}
