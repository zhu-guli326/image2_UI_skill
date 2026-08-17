import fs from "node:fs";
import path from "node:path";
import { runHarnessGuard as runBaseHarnessGuard } from "./ui_harness_guard.mjs";
import { runAssetPlanGuard } from "./ui_asset_plan_guard.mjs";
import { runReferenceAssetGuard } from "./ui_reference_asset_guard.mjs";
import { runRecreateImage2PolicyGuard } from "./ui_recreate_image2_policy_guard.mjs";
import { runVisualRoleGuard } from "./ui_visual_role_guard.mjs";
import { runFreeformLayoutGuard } from "./ui_freeform_layout_guard.mjs";
import { runScreenSafeAreaGuard } from "./ui_screen_safe_area_guard.mjs";

export function runHarnessGuard(options = {}) {
  const base = runBaseHarnessGuard(options);
  const targetPath = path.resolve(options.target);
  if (!fs.existsSync(targetPath)) return base;

  const stat = fs.statSync(targetPath);
  const rootDir = stat.isDirectory() ? targetPath : path.dirname(targetPath);
  const files = stat.isDirectory() ? listFiles(rootDir) : [targetPath];
  const assetFindings = runAssetPlanGuard({
    rootDir,
    files,
    workflowMode: options.workflowMode,
    originalReference: options.originalReference,
  });
  const referenceFindings = runReferenceAssetGuard({
    files,
    workflowMode: options.workflowMode,
    originalReference: options.originalReference,
  });
  const image2PolicyFindings = runRecreateImage2PolicyGuard({
    rootDir,
    workflowMode: options.workflowMode,
  });
  const visualRoleFindings = runVisualRoleGuard({
    rootDir,
    workflowMode: options.workflowMode,
  });
  const freeformLayoutFindings = runFreeformLayoutGuard({
    rootDir,
    workflowMode: options.workflowMode,
  });
  const screenSafeAreaFindings = runScreenSafeAreaGuard({
    rootDir,
    workflowMode: options.workflowMode,
  });
  const findings = [
    ...(base.findings || []),
    ...assetFindings,
    ...referenceFindings,
    ...image2PolicyFindings,
    ...visualRoleFindings,
    ...freeformLayoutFindings,
    ...screenSafeAreaFindings,
  ];
  const fail = findings.filter((item) => item.level === "fail").length;
  const warn = findings.filter((item) => item.level === "warn").length;
  const info = findings.filter((item) => item.level === "info").length;

  return {
    ...base,
    ok: fail === 0,
    status: fail ? "fail" : warn ? "pass-with-warnings" : "pass",
    counts: { fail, warn, info },
    findings,
  };
}

function listFiles(rootDir) {
  const ignored = new Set([".git", "node_modules", ".next", "dist", "build", ".turbo", ".image2-ui"]);
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}
