# Harness Studio

A live design canvas you leave running while an AI coding agent (Claude Code)
designs an app **into your screen** — wireframes, data model, flow, and plan —
instead of replying with a wall of text. It's `superpowers:brainstorming`, but as
a picture you can click.

Three layers, one loop:

| Layer | What it is |
|---|---|
| **App (the screen)** | A React + Vite + Tailwind + shadcn viewer that renders four tabs — **Prototype + Spec · Data model · Flow · Plan** — from one state file. The prototype is **freeform**: the AI writes real HTML + a shared CSS design system into each screen (rendered in an isolated browser frame), wired up with a handful of attributes. |
| **Canvas** | A single file, `.harness/state.json`. The AI writes it with its normal tools; the app watches it and live-reloads with a cyan flash. |
| **Skill + MCP** | A Claude Code skill drives the design phases; an MCP server lets the agent *see* what it built and what you're looking at, and read your feedback. |

```
  AI writes .harness/state.json  ──▶  viewer repaints (you see it)
            ▲                                    │
            │                                    ▼
   harness_get_feedback (MCP)  ◀──  you click the prototype, leave a note
```

## Quick start — use it in your own project

Two pieces: the **plugin** (the skill + MCP that Claude Code uses — install once,
works in every project) and the **viewer** (a small web app you leave running).

**1. Install the plugin (like any skill):**

```text
/plugin marketplace add AssetsArt/harness-studio
/plugin install harness-studio@harness-studio
```

Now the `harness-studio` skill and its MCP tools are available in any project. The
MCP reads/writes the *current project's* `.harness/` folder.

**2. Run the viewer in your project:**

```bash
# one-time: clone + install, then link the `harness` launcher globally
git clone https://github.com/AssetsArt/harness-studio && cd harness-studio
bun install && bun link

# then, from ANY project you're designing:
cd ~/my-app
harness                 # serves the viewer on :4317, watching ./.harness
```

`harness` seeds a starter `.harness/` if there isn't one, and points the viewer at
*your* project. (No clone? `bunx github:AssetsArt/harness-studio` runs the same
launcher.)

**3. Design:** tell Claude Code *"design this in the harness"* — the skill drives
the phases, the MCP writes to `./.harness/`, and your viewer repaints live.

Try the viewer by hand: click screens in the **Prototype** sidebar, press **Add to
cart** and watch the header badge persist across screens, switch device frames
(Web / Desktop / iOS / Android), **Comment** on an element, follow the **Changes**
feed, collapse the **Spec** rail, or hit **Edit state** to paste new state.

## Develop the tool itself

```bash
bun install
bun run dev          # viewer on http://localhost:4317, watching this repo's .harness
bun run build        # typecheck + build viewer + bundle the MCP (mcp/server.bundle.mjs)
```

A seed project (**Aurora Store**) is included so there's something to look at
immediately. The MCP bundle (`mcp/server.bundle.mjs`) is what the plugin ships;
rerun `bun run build:mcp` after editing `mcp/server.mjs`.

### Freeform prototype model

Each prototype screen is real HTML rendered in a sandboxed `<iframe>`, sharing a
CSS `designSystem`. Interactivity is wired with a tiny attribute vocabulary — no
framework, no backend:

| Attribute | Effect |
|---|---|
| `data-to="screenId"` | click navigates to another screen |
| `data-inc` / `data-dec="cart"` | bump a numeric mock-store key by ±1 |
| `data-set="key=value;k2=2"` | set store keys on click |
| `data-bind="cart"` | element text shows the live store value |
| `data-show="cart"` / `data-show="step==2"` | show element only when truthy/equal |

The mock `store` (declared in `prototype.store`) persists across navigation, so a
cart filled on one screen is still full on the next. The AI reads it back through
`harness_get_view`.

### Shared layout & components

Screens don't repeat markup. A `prototype.layout` shell wraps every screen body,
and `prototype.components` holds reusable fragments — so a header lives in one
place and every screen uses it. Change it once, every screen updates; nothing
gets missed.

- `prototype.layout` — `"{{>header}}{{slot}}{{>footer}}"` (`{{slot}}` = screen body)
- `prototype.components` — `{ "header": "…", "footer": "…" }`, included via `{{>name}}`
- `prototype.vars` / `screen.vars` — `{{name}}` variables for per-screen tweaks
- `data-nav="screenId"` — the matching link gets `.is-active` automatically, so one
  shared header serves every screen without a per-screen copy

Each screen's `html` is then just the part that differs; set `"layout": false` on a
screen to render standalone.

### Device frames

The same HTML can be previewed in different shells via `prototype.frame` (or a
per-screen `frame`): **`web`** (browser window, default), **`desktop`** (native
app window), **`ios`** and **`android`** (phone frames with status bar, notch /
punch-hole, and home indicator). The phone frames render the page at ~390px so
your responsive CSS applies. A frame switcher in the Prototype sidebar lets you
flip any screen between frames to preview — the AI's declared frame is the
default and wins whenever it changes.

## How the AI plugs in

Installing the plugin registers an MCP server (a self-contained bundle, no extra
install) that operates on the current project's `.harness/`, exposing:

- `harness_get_state` / `harness_set_state` / `harness_patch_state` — read & write the structured canvas + prototype manifest
- `harness_get_screen` / `harness_set_screen` — read/write one screen body (one file)
- `harness_get_component` / `harness_set_component` — read/write one shared fragment
- `harness_get_design_system` / `harness_set_design_system` — the shared CSS
- `harness_set_phase` / `harness_set_frame` — advance the stepper / set the device frame
- `harness_get_screenshot` — a PNG of how a screen actually renders (the pixels the dev sees)
- `harness_get_view` — the dev's active tab, prototype screen, store, and any prototype errors
- `harness_get_feedback` — notes the dev left, including the element they clicked to comment on

…and a skill (`skills/harness-studio/`) that tells the agent how to run the
prototype-based design loop. Ask Claude Code to "design this in the harness" and it
builds the canvas one phase at a time, reacting to your clicks.

The agent can also just `Write` files under `.harness/` — the watcher catches them
either way. The MCP tools add validation, manifest upkeep, screenshots, and the
feedback channel back from the viewer.

## Layout

```
.claude-plugin/
  plugin.json                 # plugin manifest (install target)
  marketplace.json            # marketplace listing → /plugin marketplace add AssetsArt/harness-studio
skills/harness-studio/        # the design-loop skill (bundled in the plugin)
.mcp.json                     # MCP server config (points at the bundle via ${CLAUDE_PLUGIN_ROOT})
mcp/server.mjs                # MCP server source — the agent's eyes & hands on the canvas
mcp/server.bundle.mjs         # self-contained bundle the plugin ships (no dep install)
bin/harness.mjs               # viewer launcher — `harness` in any project
vite/harness-watch.ts         # Vite plugin: assembles split files, watch → WebSocket push, endpoints
src/                          # the viewer (React + Tailwind + shadcn-style + lucide)

.harness/                     # the canvas (per project)
  state.json                  #   meta/spec/plan/dataModel/flow + prototype MANIFEST (no HTML)
  prototype/design-system.css #   shared CSS
  prototype/components/*.html #   shared fragments ({{>name}})
  prototype/screens/*.html    #   each screen body
```

### Why the canvas is split into files

A single `state.json` holding every screen's HTML would balloon as the prototype
grows — and an implementing agent would burn context reading and rewriting the
whole blob to change one button. So the prototype is split: `state.json` keeps a
small manifest, and each screen / component / the design system lives in its own
file. The agent edits **one file at a time** (via `harness_set_screen` etc.), and
the dev server re-assembles them into a single state object for the viewer. Inline
values in `state.json` still work and win over files, for quick lo-fi screens.

## Stack

Bun · React 19 · Vite 6 · Tailwind CSS v4 · shadcn-style components · lucide-react ·
TypeScript · `@modelcontextprotocol/sdk`. Fonts: Geist / Geist Mono.
