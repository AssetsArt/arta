---
name: release
description: Use when releasing / shipping a new version of Arta (this repo) — triggers on "release", "ship it", "publish the plugin", "cut a new version", "ปล่อยเวอร์ชันใหม่", "release arta". Runs preflight (build + validate), commits and pushes to main, waits for CI to auto-bump the version and refresh the MCP bundle, confirms the new version landed on origin, then reports the exact update steps for users. Maintainer tool — it does NOT ship inside the plugin.
---

# Release Arta

Ship the current changes on `main` and **confirm** the new version is actually live for
users. Releasing this project = **push to `main`**; CI (`.github/workflows/pack.yml`)
does the version bump, MCP-bundle refresh, and validation. This skill drives that end to
end and verifies it, so a release can't silently fail to reach anyone.

## How releasing works here (read first)

- Users install/update through the Claude Code plugin marketplace. `/plugin update` only
  re-installs when the **version changes** — an unchanged version is treated as
  up-to-date and skipped. So every release MUST move the version.
- **You do NOT bump the version by hand.** On every push to `main`, CI runs
  `scripts/bump-version.mjs`, which bumps the patch version in
  `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`, refreshes
  `mcp/server.bundle.mjs`, and pushes a `ci: bump version + refresh MCP bundle [skip ci]`
  commit. The `[skip ci]` stops it from looping.
- Because of that commit, **origin ends up one commit ahead of your local** after every
  release. Always `git pull --rebase` before pushing again.
- The shipped pieces are: the skill (`skills/arta/`), commands (`commands/`),
  the MCP bundle (`mcp/server.bundle.mjs`), `.mcp.json`, and the manifests
  (`.claude-plugin/`). The viewer source ships too (it runs from the installed plugin).

## Checklist

Create a TodoWrite item per step and do them in order. Stop and report if any step fails.

1. **Confirm repo & branch.** Must be the arta repo on `main`
   (`git rev-parse --abbrev-ref HEAD`). If you're not on `main`, stop and ask — don't
   release from a feature branch.
2. **Preflight — every check must pass before anything is pushed:**
   - `bun install` if `node_modules` is missing.
   - `bun run build` — typecheck + viewer build + MCP bundle (`build:mcp`). This may
     refresh `mcp/server.bundle.mjs`; that's expected and gets committed below.
   - `node scripts/validate-plugin.mjs` — must print `plugin validation PASSED`.
   - Fix any failure and re-run before continuing. **Never release a red build.**
3. **Show what's being released.** `git status` then `git diff --stat` (and read the
   real `git diff` for anything non-trivial). Summarize the change in a line or two and
   get the maintainer's OK to ship — pushing to `main` is outward-facing, so confirm
   first.
4. **Commit.** `git add -A` (check only intended files are staged), then commit with a
   clear message describing the change. Do **not** edit the version — CI owns it. End the
   message with:
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
   If there's nothing to commit (re-releasing already-committed work), skip to step 5.
5. **Push to `main`.** `git push`. If it's rejected as non-fast-forward (a previous CI
   `[skip ci]` commit moved origin), run `git pull --rebase` then `git push`.
6. **Wait for CI.** Get the run for your push
   (`gh run list --workflow=pack.yml --limit 1`) and `gh run watch <id> --exit-status`.
   If it fails, read `gh run view <id> --log-failed`, fix, and release again.
7. **Confirm the bump landed.** `git fetch origin main`, then:
   - `git log origin/main --oneline -2` — there should be a fresh
     `ci: bump version + refresh MCP bundle [skip ci]` commit.
   - `git show origin/main:.claude-plugin/plugin.json | grep version` — the version must
     be **higher** than before the release. Note the new version.
8. **Sync local.** `git pull --rebase` so local matches origin (which now includes the CI
   commit).
9. **Report the release.** Tell the maintainer the new version and the exact steps a user
   takes to get it:
   ```text
   /plugin marketplace update arta
   /plugin update arta@arta
   ```
   then **restart Claude Code** — the skill, commands, and MCP server load at session
   start, so an in-session update keeps serving the old ones. Stubborn-cache fallback:
   `rm -rf ~/.claude/plugins/cache/arta` → `/plugin install arta@arta`
   → restart.

## Rules

- **Never hand-edit the version.** `scripts/bump-version.mjs` (run by CI) is the single
  source of truth; a manual bump just causes an extra CI bump on top — pointless.
- **"Pushed" ≠ "released."** A release isn't done until CI is green AND you've confirmed
  the new version on origin (step 7). Verify it reached the manifests.
- Keep the commit scoped to the real change. Version and bundle churn are CI's job; don't
  pad the diff.
- If `bun run build` or the validator fails, fix it first — a broken push breaks `main`
  for everyone installing from it.
