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
2. If they use the local viewer launcher, tell them to refresh it too:
   `cd <harness-studio clone> && git pull && bun install && bun run build`.
3. Briefly report the resulting plugin version (from `/plugin` or `.claude-plugin/plugin.json`) so they know it moved.

Don't redesign anything in update mode — just update and confirm.

## Otherwise — design "$ARGUMENTS" in the harness

1. **Make sure the viewer is running.** If you can't tell, remind the user once:
   run `harness` in this project (serves http://localhost:4317, watching
   `./.harness/`). Don't block on it — start building; the canvas updates show up
   when they open the viewer.
2. **Use the `harness-studio` skill** and run its prototype-based loop:
   Prototype + Spec → Data model → Flow → Plan. Write to `.harness/` with the
   `harness_*` MCP tools (`harness_set_screen`, `harness_set_component`,
   `harness_patch_state`, `harness_set_phase`, …), editing one piece at a time.
3. **Close the loop:** after meaningful changes, check `harness_get_view` (what the
   dev is looking at, plus any errors), `harness_get_screenshot` (see your own
   render), and `harness_get_feedback` (notes the dev left). React to what you find.

If `$ARGUMENTS` is empty, ask the user what they want to design, then proceed.
