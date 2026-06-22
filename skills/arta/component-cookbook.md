# App component cookbook

Ready-to-adapt building blocks for **app & marketplace** screens — the structural
companion to [`design-systems.md`](design-systems.md). The design system is the *dress*
(colour, type, voice); this is the *shape and the parts*. Picking a named component is
faster and more varied than re-deriving one, and it stops every screen collapsing into the
same hero → 3 cards → CTA template.

Inspired by Hallmark's component cookbook (MIT, github.com/Nutlope/hallmark), re-cut for
app UI — its catalogue is landing-page-shaped (marketing heroes, footers); these are the
parts real apps are built from.

## How to use

1. **Pick the screen shape first** (see SKILL.md § "Vary the screen shape"), then assemble
   it from the parts below. A *browse* screen = top bar + filter row + card grid + rail; a
   *detail* screen = side rail + page header + content + aside; a *settings* screen =
   master–detail split.
2. **Vary across screens.** Don't put the same nav + the same card on all six screens — the
   Variety axis of the self-critique scores *structural* distance, not colour.
3. **Adapt, don't paste.** Every snippet styles with **Tailwind utilities + design tokens**
   (`bg-[var(--color-surface)]`, `text-[var(--color-ink)]`) — never raw hex — so it inherits
   whichever kit you set. Swap copy/icons for the real product; keep the structure.
4. **These are slop-free by construction** — token-driven, lucide icons (no emoji), active
   states via background tint (never a side-stripe), cards capped at `rounded-2xl`, no
   nested cards, `transition-colors` (never `transition-all`). `arta_design_review` returns
   them clean; keep them that way as you edit.

Tokens assumed (from the chosen kit): `--color-bg · --color-surface · --color-ink ·
--color-muted · --color-line · --color-accent · --color-accent-ink`, `--font-display ·
--font-body`, `--radius-md`, plus the `.hs-rail` / `.hs-cover` primitives in BASE_CSS.

---

## 1 · Navigation

### N1 · Side rail (app default)
Use for: a desktop app with 4–9 destinations. Active state = **filled tint + accent icon**,
never a left stripe.

```html
<nav class="flex h-full w-56 flex-col gap-1 border-r border-[var(--color-line)] bg-[var(--color-surface)] p-3">
  <a class="mb-3 flex items-center gap-2 px-2 text-[var(--color-ink)] font-[var(--font-display)] text-lg font-semibold">
    <i data-lucide="orbit" class="h-5 w-5 text-[var(--color-accent)]"></i> Helix
  </a>
  <a data-to="overview" data-nav class="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-accent)]/10 px-3 py-2 text-sm font-medium text-[var(--color-ink)]">
    <i data-lucide="layout-dashboard" class="h-4 w-4 text-[var(--color-accent)]"></i> Overview
  </a>
  <a data-to="runs" data-nav class="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-ink)]/5 hover:text-[var(--color-ink)]">
    <i data-lucide="play" class="h-4 w-4"></i> Runs
  </a>
  <a data-to="settings" data-nav class="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-ink)]/5 hover:text-[var(--color-ink)]">
    <i data-lucide="settings" class="h-4 w-4"></i> Settings
  </a>
</nav>
```
> `data-nav` gives the active row its state automatically when it matches the current
> screen — so one shared rail fits every screen (put it in `prototype.layout`).

### N2 · Top bar (content / marketing)
Use for: a site, a content app, a marketplace landing. Wordmark · sections · one action.

```html
<header class="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-bg)] px-6 py-4">
  <a class="flex items-center gap-2 font-[var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
    <i data-lucide="shapes" class="h-5 w-5 text-[var(--color-accent)]"></i> Atlas
  </a>
  <nav class="hidden items-center gap-7 text-sm text-[var(--color-muted)] md:flex">
    <a data-to="browse" class="transition-colors hover:text-[var(--color-ink)]">Browse</a>
    <a data-to="pricing" class="transition-colors hover:text-[var(--color-ink)]">Pricing</a>
    <a data-to="docs" class="transition-colors hover:text-[var(--color-ink)]">Docs</a>
  </nav>
  <button class="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-ink)] transition-colors hover:opacity-90">Get started</button>
</header>
```

### N3 · Bottom tab bar (mobile)
Use for: `ios`/`android` frames. Pad for the home indicator; active tab = accent label+icon.

```html
<nav class="fixed inset-x-0 bottom-0 flex items-stretch justify-around border-t border-[var(--color-line)] bg-[var(--color-surface)] pb-[28px] pt-2">
  <a data-to="home" class="flex flex-1 flex-col items-center gap-1 text-[var(--color-accent)]">
    <i data-lucide="house" class="h-5 w-5"></i><span class="text-[11px] font-medium">Home</span>
  </a>
  <a data-to="search" class="flex flex-1 flex-col items-center gap-1 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
    <i data-lucide="search" class="h-5 w-5"></i><span class="text-[11px]">Search</span>
  </a>
  <a data-to="profile" class="flex flex-1 flex-col items-center gap-1 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
    <i data-lucide="user" class="h-5 w-5"></i><span class="text-[11px]">You</span>
  </a>
</nav>
```

### N4 · Command-K trigger
Use for: a power-user app. A pill that *reads* like a shortcut (no fake search bar drama).

```html
<button class="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">
  <i data-lucide="search" class="h-4 w-4"></i> Search
  <kbd class="ml-6 rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[11px] font-medium">⌘K</kbd>
</button>
```

---

## 2 · Page header (app)

Title + supporting line + primary action, with an optional filter/segment row below. This is
the app equivalent of a hero — not a centred marketing splash.

```html
<header class="flex flex-col gap-4 border-b border-[var(--color-line)] pb-5">
  <div class="flex items-end justify-between gap-4">
    <div>
      <h1 class="display text-2xl font-semibold text-[var(--color-ink)]">Runs</h1>
      <p class="mt-1 text-sm text-[var(--color-muted)]">Every agent invocation, newest first.</p>
    </div>
    <button class="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-ink)] transition-colors hover:opacity-90">
      <i data-lucide="plus" class="h-4 w-4"></i> New run
    </button>
  </div>
</header>
```

---

## 3 · Data display

### D1 · Stat tile (bento)
Use for: a dashboard. Compose tiles of **varying size** in a grid — not one uniform row.

```html
<div class="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
  <div class="flex items-center justify-between">
    <span class="text-sm text-[var(--color-muted)]">Runs today</span>
    <i data-lucide="activity" class="h-4 w-4 text-[var(--color-accent)]"></i>
  </div>
  <div class="mt-2 font-[var(--font-display)] text-4xl font-semibold text-[var(--color-ink)]">1,284</div>
  <div class="mt-1 text-xs text-[var(--color-muted)]">+12% vs yesterday</div>
</div>
```
> A bare giant number is a tell — always pair it with a label that says what it means.

### D2 · Data table
Use for: data-dense screens. A **real table** beats faking rows as cards. Rows use a divider,
not per-row borders (which would read as stacked cards).

```html
<div class="overflow-hidden rounded-2xl border border-[var(--color-line)]">
  <table class="w-full text-sm">
    <thead class="bg-[var(--color-surface)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
      <tr><th class="px-4 py-3 font-medium">Run</th><th class="px-4 py-3 font-medium">Model</th><th class="px-4 py-3 font-medium">Status</th><th class="px-4 py-3 text-right font-medium">Cost</th></tr>
    </thead>
    <tbody class="divide-y divide-[var(--color-line)]">
      <tr class="transition-colors hover:bg-[var(--color-ink)]/[0.03]">
        <td class="px-4 py-3 text-[var(--color-ink)]">support-triage</td>
        <td class="px-4 py-3 text-[var(--color-muted)]">claude-opus-4</td>
        <td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"><i data-lucide="check" class="h-3 w-3"></i> done</span></td>
        <td class="px-4 py-3 text-right tabular-nums text-[var(--color-ink)]">$0.04</td>
      </tr>
    </tbody>
  </table>
</div>
```

### D3 · Browse card (marketplace)
Use for: a catalog/listing grid. Real cover image via `.hs-cover` + `<img>`; single card,
never nested. Cap radius at `rounded-2xl`.

```html
<a data-to="product" class="group block overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] transition-colors hover:border-[var(--color-accent)]/40">
  <div class="hs-cover aspect-[4/3]">
    <img src="https://picsum.photos/seed/atlas-kit/600/450" alt="" class="h-full w-full object-cover" />
  </div>
  <div class="p-4">
    <div class="flex items-center justify-between">
      <h3 class="font-medium text-[var(--color-ink)]">Northwind UI Kit</h3>
      <span class="text-sm font-semibold text-[var(--color-ink)]">$48</span>
    </div>
    <p class="mt-1 text-sm text-[var(--color-muted)]">320 components · Figma + code</p>
  </div>
</a>
```

---

## 4 · Inputs & forms

### F1 · Text field (all states)
Ship every interactive state: default · focus · error · disabled, with a **reserved helper
slot** so an error doesn't shove the layout. Border-width stays 1px across states (colour /
ring changes carry the state); focus is an `outline`, not a width change.

```html
<label class="block">
  <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink)]">Workspace name</span>
  <input type="text" placeholder="northwind"
    class="w-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] transition-colors focus:border-[var(--color-accent)] focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-55" />
  <span class="mt-1 block min-h-[1rem] text-xs text-[var(--color-muted)]">Lowercase, no spaces.</span>
</label>
```
> Error variant: swap the helper text to `text-red-600` and the border to `border-red-500`;
> keep the 1px width. Buttons on the same form share the input's height (≥44px tap target).

### F2 · Segmented control / filter row
Use for: switching a view or filtering a list. Selected = filled tint, not an outline ghost.

```html
<div class="inline-flex rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1 text-sm">
  <button class="rounded-[calc(var(--radius-md)-2px)] bg-[var(--color-accent)] px-3 py-1.5 font-medium text-[var(--color-accent-ink)]">All</button>
  <button class="rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">Active</button>
  <button class="rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]">Archived</button>
</div>
```

---

## 5 · States & feedback

### S1 · Empty state
Use for: zero-data, first-run, no-results. **Centre it** (no dead band), lucide glyph in a
tinted disc (never a gray box), one clear action.

```html
<div class="flex flex-col items-center justify-center gap-4 py-20 text-center">
  <span class="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
    <i data-lucide="inbox" class="h-6 w-6 text-[var(--color-accent)]"></i>
  </span>
  <div>
    <h2 class="display text-lg font-semibold text-[var(--color-ink)]">No runs yet</h2>
    <p class="mt-1 max-w-xs text-sm text-[var(--color-muted)]">Your agent runs will show up here once you kick one off.</p>
  </div>
  <button class="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-ink)] transition-colors hover:opacity-90">Start a run</button>
</div>
```

### S2 · Status badge
Use for: row/state labels. Tint the badge with its **semantic token** (define `status-done`,
`status-failed`, … in the kit) so it's consistent across screens.

```html
<span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
  <i data-lucide="clock" class="h-3 w-3"></i> Pending
</span>
```

### S3 · Inline alert
Use for: a contextual message. Full subtle tint + icon — **not** a thick coloured side-stripe.

```html
<div class="flex items-start gap-3 rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-[var(--color-ink)]">
  <i data-lucide="triangle-alert" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600"></i>
  <p>Anthropic is rate-limited — Helix re-routed this run to OpenAI at the same cap.</p>
</div>
```

### S4 · Stepper (wizard spine)
Use for: a stepped flow (checkout, onboarding). Current step filled, done steps checked.

```html
<ol class="flex items-center gap-3 text-sm">
  <li class="flex items-center gap-2 text-[var(--color-ink)]"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-ink)]"><i data-lucide="check" class="h-3 w-3"></i></span> Cart</li>
  <span class="h-px w-8 bg-[var(--color-line)]"></span>
  <li class="flex items-center gap-2 font-medium text-[var(--color-ink)]"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-semibold text-[var(--color-accent-ink)]">2</span> Shipping</li>
  <span class="h-px w-8 bg-[var(--color-line)]"></span>
  <li class="flex items-center gap-2 text-[var(--color-muted)]"><span class="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-line)] text-xs">3</span> Confirm</li>
</ol>
```

---

These are starting points, not the only right answer — the strongest screen is the one whose
shape and parts fit *this* product. Run `arta_design_review` after you adapt them, and check
the screenshot: the cookbook keeps you off the slop attractors, taste does the rest.
