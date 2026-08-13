import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("every library case has a video preview as the primary mode", () => {
  const script = fs.readFileSync(path.join(repoRoot, "library.js"), "utf8");
  const caseBlocks = [...script.matchAll(/\{\n    id: "([^"]+)"[\s\S]*?\n  \}/g)].map((match) => ({
    id: match[1],
    source: match[0],
  }));

  assert.equal(caseBlocks.length, 23);
  for (const block of caseBlocks) {
    const video = block.source.match(/video:\s*"([^"]+)"/)?.[1];
    assert.ok(video, `${block.id} should have a video preview`);
    assert.ok(fs.existsSync(path.join(repoRoot, video.replace(/^\.\//, "").replace(/\?.*/, ""))), video);
  }

  assert.doesNotMatch(script, /defaultPreviewMode:\s*"image"/);
  assert.match(script, /const openMode = guide\.defaultPreviewMode \|\| mediaMode/);
  assert.match(script, /mode === "auto" \? \(guide\.defaultPreviewMode \|\| \(guide\.video \? "video" : \(guide\.liveDemo \? "live" : "image"\)\)\)/);
});
