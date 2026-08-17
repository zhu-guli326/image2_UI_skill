import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runDesignSystemGuard } from "../scripts/ui_design_system_guard.mjs";

function fixture() { return fs.mkdtempSync(path.join(os.tmpdir(), "image2-ui-design-system-")); }
function writePlan(dir, plan) {
  fs.writeFileSync(path.join(dir, "design-system-plan.json"), JSON.stringify(plan, null, 2));
  fs.writeFileSync(path.join(dir, "visual-role-plan.json"), JSON.stringify({ version: 1, workflow: "recreate", elements: [] }, null, 2));
}
function basePlan(overrides = {}) {
  return {
    version: 1,
    workflow: "recreate",
    platformIntent: "ios",
    productClass: "device-mockup",
    selection: { primarySystem: "ios-hig", reason: "fallback-default", allowMixedSystems: false },
    tokens: { source: "hybrid", categories: ["color", "typography", "spacing", "radius"] },
    reusePolicy: {
      reuseBeforeCustomDraw: true,
      customDrawOnlyWhenMissing: true,
      sharedComponentDriftForbidden: true,
      componentFallbackOrder: ["design-system", "platform", "project-shared", "compatible-library", "custom-draw"]
    },
    iconPolicy: {
      primaryIconSystem: "sf-symbols",
      fallbackOrder: ["design-system-icons", "platform-icons", "project-icon-registry", "compatible-library", "custom-draw"],
      functionalIconsMustUseLibrary: true,
      referenceUnspecifiedDecorativeIconsForbidden: true
    },
    iosSkeleton: {
      enabled: true,
      systemChromeShared: true,
      components: ["IOSScreenRoot", "IOSSafeArea", "IOSStatusBar", "IOSHomeIndicator", "IOSBottomNav", "IOSPrimaryButton"]
    },
    components: [{
      id: "status-bar",
      semanticRole: "status-bar",
      reuseKey: "ios.system-status-bar",
      source: "platform",
      systemRef: "ios-hig",
      componentRef: "IOSStatusBar",
      lookupStatus: "matched",
      shared: true,
      instances: ["phone-a", "phone-b", "phone-c"],
      variants: ["light", "dark"]
    }],
    icons: [{
      id: "search",
      semanticRole: "search",
      functional: true,
      source: "platform",
      iconRef: "magnifyingglass",
      lookupStatus: "matched",
      referencePresence: "present"
    }],
    ...overrides
  };
}

test("valid iOS default resolves shared system chrome and SF Symbols", () => {
  const dir = fixture(); writePlan(dir, basePlan());
  assert.equal(runDesignSystemGuard({ rootDir: dir }).filter((x) => x.level === "fail").length, 0);
});

test("mobile fallback defaults to iOS instead of arbitrary Material", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ selection: { primarySystem: "material-3", reason: "fallback-default", allowMixedSystems: false } }));
  assert.ok(runDesignSystemGuard({ rootDir: dir }).some((x) => x.rule === "design-system-default-mismatch"));
});

test("iOS default requires SF Symbols semantics", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ iconPolicy: { ...basePlan().iconPolicy, primaryIconSystem: "lucide" } }));
  assert.ok(runDesignSystemGuard({ rootDir: dir }).some((x) => x.rule === "ios-icon-system-default-mismatch"));
});

test("matched standard component cannot be custom drawn", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ components: [{
    id: "primary-cta", semanticRole: "primary-button", reuseKey: "ios.primary-button", source: "custom",
    lookupStatus: "matched", shared: true, instances: ["a", "b"], customReason: "reference-specific"
  }] }));
  const findings = runDesignSystemGuard({ rootDir: dir });
  assert.ok(findings.some((x) => x.rule === "custom-draw-without-library-miss"));
  assert.ok(findings.some((x) => x.rule === "existing-component-required"));
});

test("custom standard component is allowed only after library lookup misses", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ components: [{
    id: "special-control", semanticRole: "primary-button", reuseKey: "custom.special-control", source: "custom",
    lookupStatus: "missing", shared: false, instances: ["a"], customReason: "library-missing"
  }] }));
  assert.equal(runDesignSystemGuard({ rootDir: dir }).filter((x) => x.level === "fail").length, 0);
});

test("repeated component instances must share one component family", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ components: [{
    id: "status", semanticRole: "status-bar", reuseKey: "ios.status", source: "platform", systemRef: "ios-hig",
    componentRef: "IOSStatusBar", lookupStatus: "matched", shared: false, instances: ["a", "b", "c"]
  }] }));
  assert.ok(runDesignSystemGuard({ rootDir: dir }).some((x) => x.rule === "shared-component-reuse-required"));
});

test("same reuseKey cannot drift into multiple component families", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ components: [
    { id: "status-a", semanticRole: "status-bar", reuseKey: "ios.status", source: "platform", systemRef: "ios-hig", componentRef: "IOSStatusBar", lookupStatus: "matched", shared: true, instances: ["a"] },
    { id: "status-b", semanticRole: "status-bar", reuseKey: "ios.status", source: "custom", lookupStatus: "missing", shared: true, instances: ["b"], customReason: "library-missing" }
  ] }));
  assert.ok(runDesignSystemGuard({ rootDir: dir }).some((x) => x.rule === "shared-component-drift"));
});

test("reference-absent icon is blocked instead of being decorated into the UI", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ icons: [{
    id: "cta-arrow", semanticRole: "next", functional: true, source: "platform", iconRef: "arrow.right",
    lookupStatus: "matched", referencePresence: "absent"
  }] }));
  assert.ok(runDesignSystemGuard({ rootDir: dir }).some((x) => x.rule === "reference-unrequested-icon"));
});

test("functional custom icon needs an actual library miss", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ icons: [{
    id: "search", semanticRole: "search", functional: true, source: "custom", lookupStatus: "matched",
    referencePresence: "present", customReason: "reference-specific"
  }] }));
  assert.ok(runDesignSystemGuard({ rootDir: dir }).some((x) => x.rule === "functional-icon-library-required"));
});

test("mixed design systems require an explicit reason", () => {
  const dir = fixture();
  writePlan(dir, basePlan({ selection: { primarySystem: "ios-hig", reason: "reference-detected", allowMixedSystems: true } }));
  assert.ok(runDesignSystemGuard({ rootDir: dir }).some((x) => x.rule === "mixed-design-system-without-reason"));
});
