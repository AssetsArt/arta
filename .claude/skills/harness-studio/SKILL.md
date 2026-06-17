---
name: harness-studio
description: Use during the DESIGN phase of building a new app/feature, instead of dumping a wall of text. Drives Claude Code to build a shared, live design canvas (.harness/state.json) that the dev watches in the Harness Studio viewer — spec, prototype, data model, flow, plan — iterating from the dev's clicks and feedback. Trigger when the user wants to "design", "wireframe", "prototype", "sketch the data model/flow", "plan a feature visually", or says "open the harness / let's design this in the studio".
---

# Harness Studio — prototype-based design loop

You are designing **with a picture, not a wall of text.** The dev has the Harness
Studio viewer open (`bun run dev`). Everything you write to `.harness/state.json`
appears on their screen instantly with a cyan flash. You see what they're looking
at and read their feedback through the MCP server. Design is one tight loop.

## The loop

```
  you write state.json  ──▶  viewer repaints (the dev sees it)
          ▲                              │
          │                              ▼
  harness_get_feedback  ◀──  dev clicks the prototype, leaves a note
```

Never describe a screen in prose when you could render it. Show, ask, adjust.

## Tools (MCP server: harness-studio)

- `harness_get_state` — read the canvas before editing. Always start here.
- `harness_get_view` — see what the dev is looking at right now (active tab +
  prototype screen). Check this before changing a screen so you edit what they see.
- `harness_set_state` — write the whole canvas. Use for the first build or a full rewrite.
- `harness_patch_state` — merge one top-level section (`spec`, `dataModel`,
  `flow`, `plan`, or the prototype manifest). Your workhorse for the structured tabs.
- `harness_set_phase` — advance the stepper: `prototype → data → flow → plan`.
- `harness_get_feedback` — drain notes the dev left in the viewer. Check it after
  every meaningful change and act on what you find. Notes may include an `element`
  (tag/text/selector) when the dev clicked a specific element to comment on it —
  use it to target the exact thing they mean.
- `harness_get_screenshot` — get a PNG of how a screen actually renders (the same
  pixels the dev sees). Use it to **check your own work visually**, not just from
  the HTML — after building or changing a screen, look at it.
- `harness_get_view` also returns `errors`: console/runtime errors from the
  prototype. If something you wrote is broken, you'll see it here — fix it without
  waiting for the dev.

Granular prototype edits — **touch one piece, not the whole design** (this is how
you keep big prototypes cheap to edit):

- `harness_get_screen` / `harness_set_screen` — read/write ONE screen body. `set`
  writes `prototype/screens/<id>.html` and upserts its manifest entry (title/url/frame).
- `harness_get_component` / `harness_set_component` — read/write ONE shared fragment.
- `harness_get_design_system` / `harness_set_design_system` — the shared CSS.
- `harness_set_frame` — set the device frame (prototype default or per screen).

## Storage layout (.harness/)

The canvas is split so each piece stays small:

```
.harness/state.json                     meta/spec/plan/dataModel/flow + prototype MANIFEST (no HTML)
.harness/prototype/design-system.css    shared CSS
.harness/prototype/components/<name>.html   shared fragments ({{>name}})
.harness/prototype/screens/<id>.html        each screen body
```

`harness_get_state` returns the small manifest (screen ids/titles/frames, not the
markup) — so reading the design stays cheap as it grows. Pull actual HTML only when
you need it via `harness_get_screen` / `harness_get_component`. To edit a screen,
call `harness_set_screen` (one file); to change something shared, edit the component
or design system (one file) — never rewrite every screen. The dev server re-assembles
the files into one state for the viewer automatically.

You can also `Write` files directly (`.harness/prototype/screens/<id>.html`,
`.harness/state.json`) — the watcher picks any of them up. The MCP tools add
validation, manifest upkeep, and the feedback channel, so prefer them.

## Phase order (prototype-based)

The phases are deliberately **Prototype + Spec → Data → Flow → Plan**. Start from
something clickable, not from a document.

1. **Prototype + Spec** — sketch the key screens as a wireframe the dev can click
   through, with the spec (goal, users, stories, scope, constraints) in the rail
   beside it. Get the shape of the product right here first.
2. **Data model** — entities, fields (mark `pk`/`fk`/`required`), relationships.
3. **Flow** — screens → APIs → entities, with read/write edges.
4. **Plan** — stack + milestones with task status. This falls out of the above.

Move the phase with `harness_set_phase` as each is settled. Don't race ahead — let
the dev react at each step.

## How to work

1. `harness_get_state` and `harness_get_view` to ground yourself.
2. Make the smallest change that answers the current question. Patch one section.
3. Tell the dev in one line what changed and what you want them to react to
   ("Click *Add walk-in* — does that field set feel right?").
4. `harness_get_feedback`; fold their notes in; repeat.
5. When a phase is solid, `harness_set_phase` to the next.

## state.json shape (reference)

```jsonc
{
  "meta": { "name": "AppName", "phase": "prototype" },     // phase ∈ prototype|data|flow|plan
  "spec": {
    "goal": "one sentence",
    "users": ["..."],
    "userStories": ["As a …, I want … so that …"],
    "scope": { "in": ["..."], "out": ["..."] },
    "constraints": ["..."]
  },
  "prototype": {
    "start": "screenId",
    "frame": "web",                         // device frame: web | desktop | ios | android (screens can override)
    "store": { "cart": 0 },                 // initial mock-store values
    "designSystem": ":root{--brand:#e8482b} .btn{...}",  // CSS shared by every freeform screen
    "vars": { "brand": "Aurora" },          // default template variables ({{brand}})
    "layout": "{{>header}}{{slot}}{{>footer}}",          // shell wrapping every screen body
    "components": {                          // reusable HTML fragments, referenced as {{>name}}
      "header": "<header>… <a data-to='home' data-nav='home'>Shop</a> …</header>",
      "footer": "<footer>© {{brand}}</footer>"
    },
    "screens": [
      // Freeform screen: html is just the BODY — the layout adds header/footer.
      { "id": "home", "title": "Home", "url": "shop.demo", "html": "<section>…</section>", "vars": {} },
      // Constrained screen: the wireframe component vocabulary
      { "id": "lofi", "title": "Lo-fi", "components": [ /* see vocab */ ] }
    ]
  },
  "dataModel": {
    "entities": [
      { "name": "Entity", "fields": [
        { "name": "id", "type": "uuid", "pk": true },
        { "name": "otherId", "type": "uuid", "fk": "Entity", "required": true }
      ] }
    ],
    "relationships": [ { "from": "A", "to": "B", "type": "N:1", "label": "for" } ]
  },
  "flow": {
    "nodes": [ { "id": "s_x", "kind": "screen", "label": "X" } ],   // kind ∈ screen|api|entity
    "edges": [ { "from": "s_x", "to": "a_y", "label": "do", "op": "write" } ]  // op ∈ read|write
  },
  "plan": {
    "stack": ["React", "Node"],
    "milestones": [ { "name": "M1", "tasks": [ { "title": "…", "status": "doing" } ] } ]
  }
}
```

### Freeform screens (preferred for hi-fi)

Put a real design into the device: write `html` for the screen and share a
`designSystem` (CSS) across all screens. Each freeform screen renders in an
isolated browser frame, so use full HTML/CSS — your own classes, `body`,
fonts, grid, the lot. A tiny runtime wires interactivity through plain
attributes — **these are the only "wires" you get**:

- `data-to="screenId"` — click navigates to that screen (the only routing).
- `data-inc="cart"` / `data-dec="cart"` — bump a numeric store key by ±1
  (comma-separate multiple keys).
- `data-set="key=value;other=2"` — set store keys on click (numbers auto-parse).
- `data-bind="cart"` — element's text shows the live store value.
- `data-show="cart"` or `data-show="step==2"` — show the element only when truthy
  / equal; hidden otherwise.

The store is a flat object of mock values (declare defaults in `prototype.store`).
It persists across screen navigation, so a cart count set on the home screen is
still there on the cart screen. Build the design system once, compose screens
from it, and lean on these attributes for the clickable behaviour — no real
backend, just believable mock state. You can read the current store via
`harness_get_view`.

**Pick the device frame** with `prototype.frame` (or per-screen `frame`):
`web` (browser, default), `desktop` (native app window), `ios` or `android`
(phone). The phone frames render the page at ~390px wide, so write responsive CSS
and your `@media` rules will kick in. Choose the frame that matches what you're
actually building — a mobile app spec should preview in `ios`/`android`, not a
browser.

Example button: `<button class="btn" data-inc="cart">Add to cart</button>` and a
header badge `<span data-bind="cart">0</span>`.

### Share a layout & components — DO NOT repeat markup

Put anything that appears on more than one screen (header, footer, nav, cards)
into **`prototype.components`** and a **`prototype.layout`**, then make each
screen's `html` only the part that's actually different. This is the rule, not a
nicety: when the dev says "change the header", you edit **one** component and
every screen updates — no hunting through screens, nothing missed.

- `prototype.layout` — the page shell. `{{slot}}` is where the screen body goes;
  `{{>name}}` pulls in a component. e.g. `"{{>header}}{{slot}}{{>footer}}"`.
- `prototype.components` — `{ "header": "<header>…</header>", ... }`. Components
  can include other components and use variables.
- `{{name}}` variables resolve from `screen.vars` then `prototype.vars` — use
  them for the "change just one spot per screen" cases (titles, labels).
- **Active nav comes for free:** put `data-nav="screenId"` on a link and the
  current screen's link gets an `.is-active` class automatically. So one shared
  header works for every screen — never fork the header just to flip which tab
  looks active.
- A screen can opt out with `"layout": false` (renders its own full html) — use
  this only for genuinely standalone pages (a landing splash, an auth screen).

Workflow: build the design system + layout + components first, then add screens
as thin bodies. When iterating, prefer `harness_patch_state` with just
`{ "prototype": { … } }`, editing the shared piece — not every screen.

### Prototype component vocabulary (lo-fi alternative)

Each screen is a flat list of components. A `to` on a `nav` item or `button`
makes it navigate to that screen id when the dev clicks it — that's what makes
the prototype clickable.

- `{ "type": "nav", "items": [{ "label": "Board", "to": "board" }] }`
- `{ "type": "heading", "text": "…" }`
- `{ "type": "text", "text": "…" }`
- `{ "type": "input", "label": "…", "placeholder": "…" }`
- `{ "type": "select", "label": "…", "options": ["…"] }`
- `{ "type": "button", "text": "…", "to": "screenId", "variant": "primary" }`
- `{ "type": "row", "children": [ … ] }`  — horizontal group
- `{ "type": "card", "children": [ … ] }`
- `{ "type": "table", "columns": ["…"], "rows": [["…"]] }`
- `{ "type": "list", "items": ["…"] }`
- `{ "type": "badge", "text": "…" }`
- `{ "type": "image", "label": "what goes here", "h": 120 }`  — placeholder
- `{ "type": "divider" }`

## Rules

- Keep `meta` valid at all times (it must always have `name` and `phase`); the
  viewer shows a waiting/error state otherwise.
- Patch, don't clobber: use `harness_patch_state` so untouched sections survive.
- One change, one question. The viewer is a conversation, not a deliverable.
- Read feedback before assuming you're done. The dev's clicks are the spec.
