---
description: Harness Studio — design in the live canvas, or `update` to pull the latest version
argument-hint: <what to design> | update
---

The user ran `/hns` with arguments: **$ARGUMENTS**

Route on the arguments:

## If the argument is `update` (or begins with "update")

Update Harness Studio to the latest version:

1. Refresh the marketplace and update the plugin:
   - `/plugin marketplace update harness-studio`
   - then `/plugin update harness-studio@harness-studio` (or open `/plugin` → Manage → Update).
2. **The viewer ships inside the plugin, so this updates it too** — there's nothing
   separate to pull. Tell the user to close any running viewer; the next
   `harness_start_viewer` (e.g. on their next `/hns`) launches the new version and
   reinstalls deps if they changed. (Only contributors running a local *clone* need
   `git pull && bun install`.)
3. Briefly report the resulting plugin version (from `/plugin` or `.claude-plugin/plugin.json`) so they know it moved.

Don't redesign anything in update mode — just update and confirm.

## Otherwise — design "$ARGUMENTS" in the harness

**Use the `harness-studio` skill** and follow its flow. Brainstorm before you build.

1. **Brainstorm first — don't build yet.** Ground yourself (`harness_get_state` /
   `harness_get_view`, skim the project), then ask the dev questions **one at a
   time** — purpose, users, scope, constraints (multiple-choice when you can) —
   propose 2–3 approaches with a recommendation, and present a short direction.
   **Do not write the spec or build the prototype until the dev approves the
   direction.** When a question is easier shown than told, sketch a quick **lo-fi**
   screen on the canvas and ask. (This is the `superpowers:brainstorming` flow, with
   the viewer as your visual companion.)
2. **Open the viewer** with the `harness_start_viewer` MCP tool — it launches the
   viewer **from the installed plugin** (always the current version, no stale
   `bunx` cache) on http://localhost:7317, watching this project's `./.harness/`.
   It's idempotent (safe to call every run); tell the user the URL it returns. First
   run installs the viewer's deps, so it may take a few seconds to come up. (If the
   tool isn't available, fall back: have them run `bunx github:AssetsArt/harness-studio`
   in this project.)
3. **Once the direction is approved, run the prototype-based loop:**
   Prototype + Spec → Data model → Flow → Plan. `harness_set_phase` to `prototype`,
   then write to `.harness/` with the `harness_*` MCP tools (`harness_set_screen`,
   `harness_set_component`, `harness_patch_state`, …), editing one piece at a time.
4. **Close the loop:** after meaningful changes, check `harness_get_view` (what the
   dev is looking at, plus any errors), `harness_get_screenshot` (see your own
   render), and `harness_get_feedback` (notes the dev left). React to what you find.

5. **When the design is approved, implement with subagents.** Don't hand-code the
   whole thing in one context — use `superpowers:subagent-driven-development`. The
   **Plan** Kanban is the task list (one implementer subagent per card), and the
   `.harness/` artifacts (spec, prototype HTML, dataModel, api) are the source of
   truth each subagent reads. Move cards with `harness_set_task` as they land so the
   dev watches progress on the board.

If `$ARGUMENTS` is empty, ask the user what they want to design, then brainstorm it.
