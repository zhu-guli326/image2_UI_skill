import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("every library case has a video preview as the primary mode", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const casesDir = path.join(repoRoot, "catalog", "cases");
  const cases = fs.readdirSync(casesDir).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(fs.readFileSync(path.join(casesDir, file), "utf8")));
  const videos = cases.map((item) => item.video).filter(Boolean);

  assert.equal(cases.length, 23);
  assert.equal(videos.length, 23);
  for (const video of videos) {
    assert.ok(fs.existsSync(path.join(repoRoot, video.replace(/^\.\//, "").replace(/\?.*/, ""))), video);
  }
  assert.doesNotMatch(script, /defaultPreviewMode:\s*"image"/);
  assert.match(script, /const openMode = guide\.defaultPreviewMode \|\| mediaMode/);
  assert.match(script, /mode === "auto" \? \(guide\.defaultPreviewMode \|\| \(guide\.video \? "video" : \(guide\.liveDemo \? "live" : "image"\)\)\)/);
});
