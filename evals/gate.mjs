#!/usr/bin/env bun
// Regression gate for the harness-studio eval. ONE deterministic command:
// grades the COMMITTED artifacts (the shipping .harness/ demo + a deliberately-bad
// fixture) against evals/thresholds.json and exits non-zero on any regression.
// No LLM, no network — safe to run in CI on every push that touches the skill/MCP.
//
//   bun evals/gate.mjs                       # gate the committed targets (CI core)
//   bun evals/gate.mjs --json                # same, machine-readable
//   bun evals/gate.mjs --suite <built-dir>   # grade an LLM-built brief tree (loop arm):
//                                            #   <built-dir>/<briefId>/.harness per brief
//
// A5 (impeccable detect) is enforced only when the detector exists on this machine;
// on a CI runner without ~/.claude/skills/impeccable it is reported as skipped (–),
// never a failure — so A1-A4 are the deterministic CI floor.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grade } from "./grade.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECKS = ["A1a_tokens_defined", "A1b_tokens_used", "A2_shared", "A3_interactivity", "A4_render", "A5_design"];
const SHORT = { A1a_tokens_defined: "A1a", A1b_tokens_used: "A1b", A2_shared: "A2", A3_interactivity: "A3", A4_render: "A4", A5_design: "A5" };
const GLYPH = { pass: "✓", fail: "✗", skip: "–", off: "·" };
const TH = JSON.parse(fs.readFileSync(path.join(ROOT, "evals/thresholds.json"), "utf8"));
const BRIEFS = JSON.parse(fs.readFileSync(path.join(ROOT, "evals/briefs.json"), "utf8")).briefs;

const a5Up = (r) => r?.metrics?.designReview?.available === true;
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

// ── CI core: gate the committed targets ─────────────────────────────────────
function runGate(json) {
  const rows = [];
  const a5Skipped = new Set();
  let regressed = false;

  for (const t of TH.targets) {
    const r = grade(t.brief, path.join(ROOT, t.dir));
    const checks = r.checks || {};
    const detectorUp = a5Up(r);
    const cells = {};
    const fails = [];

    if (r.fatal) {
      regressed = true;
      rows.push({ id: t.id, kind: t.kind, score: 0, cells: {}, ok: false, fails: [`fatal: ${r.fatal}`] });
      continue;
    }

    if (t.kind === "ship") {
      for (const c of CHECKS) {
        const required = t.require?.[c] === true;
        const got = checks[c] === true;
        if (c === "A5_design" && required && !detectorUp) { cells[c] = "skip"; a5Skipped.add(t.id); continue; }
        if (!required) { cells[c] = got ? "pass" : "off"; continue; }
        cells[c] = got ? "pass" : "fail";
        if (!got) fails.push(SHORT[c]);
      }
    } else {
      // guard: must STAY failing (proves the grader still discriminates)
      for (const c of CHECKS) cells[c] = checks[c] === true ? "pass" : "fail";
      if (r.score > (t.maxScore ?? 1)) fails.push(`score ${r.score.toFixed(2)} > ${t.maxScore}`);
      for (const c of t.mustFail || []) {
        if (c === "A5_design" && !detectorUp) { cells[c] = "skip"; a5Skipped.add(t.id); continue; }
        if (checks[c] === true) fails.push(`${SHORT[c]} unexpectedly passed`);
      }
    }

    const ok = fails.length === 0;
    if (!ok) regressed = true;
    rows.push({ id: t.id, kind: t.kind, score: r.score, cells, ok, fails });
  }

  if (json) {
    console.log(JSON.stringify({ mode: "gate", ok: !regressed, a5Skipped: [...a5Skipped], rows }, null, 2));
    return !regressed;
  }

  console.log("\n  REGRESSION GATE — committed targets (deterministic, no LLM)\n");
  const head = "  " + pad("target", 14) + CHECKS.map((c) => padL(SHORT[c], 5)).join("") + "    score  verdict";
  console.log(head);
  console.log("  " + "─".repeat(head.length - 2));
  for (const r of rows) {
    const cells = CHECKS.map((c) => padL(GLYPH[r.cells[c]] || "?", 5)).join("");
    const verdict = r.ok ? "PASS" : "REGRESS";
    console.log("  " + pad(r.id, 14) + cells + "    " + padL(r.score.toFixed(2), 5) + "  " + verdict + (r.fails.length ? `  (${r.fails.join("; ")})` : ""));
  }
  console.log("\n  legend: ✓ pass   ✗ fail   – skipped (detector n/a)   · not required");
  if (a5Skipped.size) console.log(`  note: A5 (impeccable detect) skipped for ${[...a5Skipped].join(", ")} — detector not on this machine (expected in CI).`);
  console.log("\n  " + (regressed ? "GATE FAILED — a committed target regressed from baseline." : "GATE PASSED — all committed targets hold the baseline.") + "\n");
  return !regressed;
}

// ── Loop arm: grade an LLM-built brief tree (<dir>/<briefId>/.harness) ───────
function runSuite(dir, json) {
  const base = path.resolve(dir);
  const rows = [];
  for (const b of BRIEFS) {
    if (b.split === "ship") continue;
    const hdir = path.join(base, b.id, ".harness");
    if (!fs.existsSync(path.join(hdir, "state.json"))) { rows.push({ id: b.id, split: b.split, missing: true }); continue; }
    const r = grade(b.id, hdir);
    rows.push({ id: b.id, split: b.split, score: r.score, checks: r.checks, detector: a5Up(r), kit: b.designKit || null });
  }
  const built = rows.filter((x) => !x.missing);
  const mean = (a) => (a.length ? a.reduce((s, x) => s + x.score, 0) / a.length : 0);
  const train = built.filter((x) => x.split === "train");
  const held = built.filter((x) => x.split === "heldout");
  const summary = {
    built: built.length, missing: rows.length - built.length,
    meanAll: +mean(built).toFixed(3), meanTrain: +mean(train).toFixed(3), meanHeldout: +mean(held).toFixed(3),
    worst: built.length ? +Math.min(...built.map((x) => x.score)).toFixed(3) : 0,
  };
  const f = TH.suite;
  const ok = built.length > 0 && summary.meanAll >= f.meanFloor && summary.worst >= f.worstFloor && summary.meanHeldout >= f.heldoutMeanFloor;

  if (json) { console.log(JSON.stringify({ mode: "suite", dir: base, ok, floors: f, summary, rows }, null, 2)); return ok; }

  console.log(`\n  SUITE — graded build tree: ${path.relative(ROOT, base) || base}\n`);
  const head = "  " + pad("brief", 18) + pad("split", 9) + CHECKS.map((c) => padL(SHORT[c], 5)).join("") + "    score";
  console.log(head);
  console.log("  " + "─".repeat(head.length - 2));
  for (const r of rows) {
    if (r.missing) { console.log("  " + pad(r.id, 18) + pad(r.split, 9) + "  (not built)"); continue; }
    const cells = CHECKS.map((c) => padL(r.checks[c] ? "✓" : (c === "A5_design" && !r.detector ? "–" : "✗"), 5)).join("");
    console.log("  " + pad(r.id, 18) + pad(r.split, 9) + cells + "    " + padL(r.score.toFixed(2), 5));
  }
  console.log(`\n  mean ${summary.meanAll}  (train ${summary.meanTrain} · heldout ${summary.meanHeldout})   worst ${summary.worst}   built ${summary.built}/${summary.built + summary.missing}`);
  console.log(`  floors: mean ≥ ${f.meanFloor} · heldout ≥ ${f.heldoutMeanFloor} · worst ≥ ${f.worstFloor}`);
  console.log("\n  " + (ok ? "SUITE PASSED" : "SUITE BELOW FLOOR") + "\n");
  return ok;
}

// ── Parity: same skeleton, one kit each — measure worst-of-5, not the mean ───
function runParity(dir, json) {
  const base = path.resolve(dir);
  const rows = [];
  for (const b of BRIEFS) {
    if (b.split !== "parity") continue;
    const hdir = path.join(base, b.id, ".harness");
    if (!fs.existsSync(path.join(hdir, "state.json"))) { rows.push({ id: b.id, kit: b.designKit, missing: true }); continue; }
    const r = grade(b.id, hdir);
    if (r.fatal) { rows.push({ id: b.id, kit: b.designKit, fatal: r.fatal, score: 0, checks: {}, detector: false, serious: [] }); continue; }
    const a5 = r.metrics?.designReview;
    rows.push({ id: b.id, kit: b.designKit, score: r.score, checks: r.checks, detector: a5Up(r), serious: (a5?.serious || []).map((s) => s.id) });
  }
  const built = rows.filter((x) => !x.missing);
  const scores = built.map((x) => x.score);
  const worst = scores.length ? +Math.min(...scores).toFixed(3) : 0;
  const best = scores.length ? +Math.max(...scores).toFixed(3) : 0;
  const mean = scores.length ? +(scores.reduce((s, x) => s + x, 0) / scores.length).toFixed(3) : 0;
  const spread = +(best - worst).toFixed(3);
  const f = TH.suite;
  const ok = built.length > 0 && worst >= f.worstFloor;

  if (json) { console.log(JSON.stringify({ mode: "parity", dir: base, ok, worstFloor: f.worstFloor, summary: { worst, best, mean, spread, built: built.length }, rows }, null, 2)); return ok; }

  console.log(`\n  PARITY — one brief skeleton, one design language each: ${path.relative(ROOT, base) || base}\n`);
  const head = "  " + pad("kit", 11) + CHECKS.map((c) => padL(SHORT[c], 5)).join("") + "    score   A5 findings";
  console.log(head);
  console.log("  " + "─".repeat(head.length + 6));
  for (const r of rows) {
    if (r.missing) { console.log("  " + pad(r.kit || r.id, 11) + "  (not built)"); continue; }
    if (r.fatal) { console.log("  " + pad(r.kit, 11) + "  FATAL: " + r.fatal); continue; }
    const cells = CHECKS.map((c) => padL(r.checks[c] ? "✓" : (c === "A5_design" && !r.detector ? "–" : "✗"), 5)).join("");
    console.log("  " + pad(r.kit, 11) + cells + "    " + padL(r.score.toFixed(2), 5) + "   " + (r.serious.length ? r.serious.join(",") : (r.detector ? "clean" : "—")));
  }
  console.log(`\n  worst ${worst}   best ${best}   mean ${mean}   spread ${spread}   (floor: worst ≥ ${f.worstFloor})`);
  console.log("\n  " + (ok ? "PARITY OK — weakest language holds the floor." : "PARITY BELOW FLOOR — a language lags.") + "\n");
  return ok;
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const json = args.includes("--json");
const si = args.indexOf("--suite");
const pi = args.indexOf("--parity");
const ok = pi >= 0 ? runParity(args[pi + 1], json) : si >= 0 ? runSuite(args[si + 1], json) : runGate(json);
process.exit(ok ? 0 : 1);
