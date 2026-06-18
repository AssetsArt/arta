#!/usr/bin/env node
// Bumps the PATCH version across the plugin manifests.
//
// Why this exists: `/plugin update` treats an unchanged version as "already up to
// date" and SKIPS re-copying files into the install cache — so a push that doesn't
// move the version never reaches users, even though the marketplace clone pulled it.
// CI runs this on every push to main so each push ships a new version and
// `/hns update` always delivers the latest.
//
// Source of truth: .claude-plugin/plugin.json `version`. marketplace.json
// (metadata.version + every plugins[].version) is kept in lock-step. Edits are
// done as in-place string replacements so the files' formatting doesn't churn.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginPath = path.join(root, ".claude-plugin", "plugin.json");
const marketPath = path.join(root, ".claude-plugin", "marketplace.json");

const cur = JSON.parse(fs.readFileSync(pluginPath, "utf8")).version || "0.0.0";
const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(cur);
if (!m) {
  console.error(`bump-version: plugin.json version "${cur}" is not semver x.y.z`);
  process.exit(1);
}
const next = `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;

// plugin.json has exactly one "version"; marketplace.json has two (metadata + plugins[0]).
const verRe = /("version"\s*:\s*)"[^"]+"/;
const pluginOut = fs.readFileSync(pluginPath, "utf8").replace(verRe, `$1"${next}"`);
fs.writeFileSync(pluginPath, pluginOut);
JSON.parse(pluginOut); // fail loudly if the replacement broke the JSON

const marketOut = fs.readFileSync(marketPath, "utf8").replace(new RegExp(verRe, "g"), `$1"${next}"`);
fs.writeFileSync(marketPath, marketOut);
JSON.parse(marketOut);

console.log(`bump-version: ${cur} -> ${next}`);
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${next}\n`);
}
