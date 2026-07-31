#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoRoot = path.join(repoRoot, "demo");
const auditScript = path.join(repoRoot, "scripts", "ui_output_audit.mjs");
const jsonMode = process.argv.includes("--json");
const noBrowser = process.argv.includes("--no-browser");
const baseline = JSON.parse(fs.readFileSync(path.join(repoRoot, "quality-baseline.json"), "utf8"));
const demos = fs.readdirSync(demoRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
  .map((entry) => entry.name)
  .sort();

function prepareBuild(name) {
  const demoPath = path.join(demoRoot, name);
  const packagePath = path.join(demoPath, "package.json");
  if (!fs.existsSync(packagePath)) return null;
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  if (!packageJson.scripts?.build) return null;

  if (!fs.existsSync(path.join(demoPath, "node_modules"))) {
    const install = spawnSync("npm", [fs.existsSync(path.join(demoPath, "package-lock.json")) ? "ci" : "install"], {
      cwd: demoPath,
      encoding: "utf8",
      stdio: jsonMode ? "pipe" : "inherit",
    });
    if (install.status !== 0) return { ok: false, message: `Dependency install failed with status ${install.status}` };
  }

  const build = spawnSync("npm", ["run", "build"], {
    cwd: demoPath,
    encoding: "utf8",
    stdio: jsonMode ? "pipe" : "inherit",
  });
  return build.status === 0
    ? { ok: true }
    : { ok: false, message: `Build failed with status ${build.status}` };
}

const reports = demos.map((name) => {
  const build = prepareBuild(name);
  if (build && !build.ok) {
    return {
      name,
      status: "error",
      counts: { fail: 1, warn: 0, info: 0 },
      findings: [{ level: "fail", rule: "demo-build", message: build.message }],
      exitCode: 2,
    };
  }
  const args = [auditScript, path.join(demoRoot, name), "--json"];
  if (noBrowser) args.push("--no-browser");
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (error) {
    report = {
      status: "error",
      counts: { fail: 1, warn: 0, info: 0 },
      findings: [{ level: "fail", rule: "audit-process", message: error.message }],
    };
  }
  return { name, ...report, exitCode: result.status };
});

const summary = reports.reduce((total, report) => {
  for (const level of ["fail", "warn", "info"]) total[level] += report.counts?.[level] || 0;
  return total;
}, { fail: 0, warn: 0, info: 0 });

const output = { status: summary.fail === 0 ? "pass" : "fail", demos: reports, summary, baseline: baseline.rules };
if (jsonMode) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`Image2 UI demo audit: ${output.status}`);
  console.log(`Demos: ${demos.length}; ${summary.fail} fail, ${summary.warn} warn, ${summary.info} info`);
  for (const report of reports) {
    console.log(`- ${report.name}: ${report.status} (${report.counts.fail} fail, ${report.counts.warn} warn, ${report.counts.info} info)`);
    for (const finding of report.findings || []) {
      if (finding.level !== "info") console.log(`  [${finding.level}] ${finding.rule}: ${finding.message}`);
    }
  }
  console.log(`Baseline: ${Object.keys(baseline.rules).length} documented warning rule(s)`);
}
process.exit(summary.fail === 0 ? 0 : 2);
