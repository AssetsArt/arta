#!/usr/bin/env node
// Validates the plugin package shape so a broken layout can't reach `main`
// (where the marketplace installs from). Pure Node, no deps.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ok = [];

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  } catch (e) {
    errors.push(`${rel}: ${e.message}`);
    return null;
  }
}
function exists(rel, minBytes = 0) {
  try {
    const s = fs.statSync(path.join(root, rel));
    if (s.size < minBytes) {
      errors.push(`${rel}: too small (${s.size}B < ${minBytes}B)`);
      return false;
    }
    return true;
  } catch {
    errors.push(`${rel}: missing`);
    return false;
  }
}

// plugin.json
const plugin = readJson(".claude-plugin/plugin.json");
if (plugin) {
  if (!/^[a-z0-9-]+$/.test(plugin.name || "")) errors.push("plugin.json: name must be kebab-case");
  else ok.push(`plugin "${plugin.name}" v${plugin.version || "(git-sha)"}`);
}

// marketplace.json
const mkt = readJson(".claude-plugin/marketplace.json");
if (mkt) {
  if (!mkt.owner || typeof mkt.owner !== "object") errors.push("marketplace.json: top-level `owner` object is required");
  if (!Array.isArray(mkt.plugins) || mkt.plugins.length === 0) errors.push("marketplace.json: plugins[] empty");
  else {
    for (const p of mkt.plugins) {
      if (!p.name) errors.push("marketplace.json: a plugin has no name");
      if (!p.source || !p.source.url) errors.push(`marketplace.json: ${p.name} missing source.url`);
    }
    ok.push(`marketplace lists ${mkt.plugins.length} plugin(s)`);
  }
}

// skill
const skillRel = "skills/harness-studio/SKILL.md";
if (exists(skillRel, 200)) {
  const md = fs.readFileSync(path.join(root, skillRel), "utf8");
  if (!md.startsWith("---")) errors.push(`${skillRel}: missing YAML frontmatter`);
  else if (!/\nname:/.test(md) || !/\ndescription:/.test(md)) errors.push(`${skillRel}: frontmatter needs name + description`);
  else ok.push("skill SKILL.md has valid frontmatter");
}

// mcp config + bundle
const mcp = readJson(".mcp.json");
if (mcp) {
  const srv = mcp.mcpServers && mcp.mcpServers["harness-studio"];
  if (!srv) errors.push('.mcp.json: missing mcpServers["harness-studio"]');
  else {
    const argStr = (srv.args || []).join(" ");
    if (!/server\.bundle\.mjs/.test(argStr)) errors.push(".mcp.json: should point at mcp/server.bundle.mjs");
    else ok.push("MCP config points at the bundle");
  }
}
exists("mcp/server.bundle.mjs", 100_000) && ok.push("MCP bundle present");

// commands
exists("commands/hns.md", 100) && ok.push("/hns command present");

console.log("✓ " + ok.join("\n✓ "));
if (errors.length) {
  console.error("\n✗ " + errors.join("\n✗ "));
  console.error(`\nplugin validation FAILED (${errors.length})`);
  process.exit(1);
}
console.log("\nplugin validation PASSED");
