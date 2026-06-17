#!/usr/bin/env node
// Harness Studio viewer launcher.
// Run this from any project: it starts the viewer (Vite) pointed at THAT
// project's .harness/ folder, seeding a starter canvas if there isn't one yet.
//
//   cd my-project && harness            # watch ./.harness
//   harness --project ../other-app      # watch a different project
//   harness --port 5000
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const projectDir = path.resolve(opt("--project", process.cwd()));
const port = opt("--port", "4317");
const harnessDir = path.join(projectDir, ".harness");

// Seed a minimal canvas so the viewer has something to render on first run.
const stateFile = path.join(harnessDir, "state.json");
if (!fs.existsSync(stateFile)) {
  fs.mkdirSync(path.join(harnessDir, "prototype", "screens"), { recursive: true });
  fs.mkdirSync(path.join(harnessDir, "prototype", "components"), { recursive: true });
  const starter = {
    meta: { name: "Untitled", phase: "prototype" },
    spec: { goal: "", users: [], userStories: [], scope: { in: [], out: [] }, constraints: [] },
    prototype: {
      start: "home",
      frame: "web",
      store: {},
      layout: "{{slot}}",
      screens: [{ id: "home", title: "Home", url: "app.local" }],
    },
  };
  fs.writeFileSync(stateFile, JSON.stringify(starter, null, 2) + "\n");
  fs.writeFileSync(
    path.join(harnessDir, "prototype", "screens", "home.html"),
    "<div style=\"display:grid;place-items:center;min-height:60vh;font-family:system-ui;color:#71717a\">Ask Claude Code to design here — it writes into .harness/</div>\n"
  );
  console.log(`[harness] seeded a starter canvas at ${harnessDir}`);
}

console.log(`[harness] viewer → http://localhost:${port}`);
console.log(`[harness] watching ${harnessDir}`);

const viteBin = path.join(pkgRoot, "node_modules", ".bin", "vite");
const child = spawn(viteBin, ["--port", String(port)], {
  cwd: pkgRoot,
  env: { ...process.env, HARNESS_DIR: harnessDir },
  stdio: "inherit",
});
child.on("error", (e) => {
  console.error("[harness] failed to start the viewer.");
  console.error("[harness] run `bun install` (or `npm install`) inside the harness-studio folder first.");
  console.error(String(e));
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 0));
