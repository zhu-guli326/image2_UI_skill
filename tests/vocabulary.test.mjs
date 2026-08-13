import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { vocabularyById, vocabularyCategories, vocabularyEntries } from "../vocabulary-data.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentCategories = vocabularyCategories.filter((category) => !["all", "favorites"].includes(category.id));

test("illustrated vocabulary entries stay complete and internally linked", () => {
  assert.equal(vocabularyEntries.length, 24);
  assert.equal(new Set(vocabularyEntries.map((entry) => entry.id)).size, vocabularyEntries.length);
  assert.equal(Object.keys(vocabularyById).length, vocabularyEntries.length);

  for (const category of contentCategories) {
    const entries = vocabularyEntries.filter((entry) => entry.category === category.id);
    assert.equal(entries.length, Number(category.countLabel), `${category.id} count`);
  }

  for (const entry of vocabularyEntries) {
    for (const field of ["name", "en", "ask", "definition", "role", "prompt", "confusedWith", "source"]) {
      assert.ok(entry[field], `${entry.id} missing ${field}`);
    }
    for (const field of ["tags", "anatomy", "variants", "states", "useWhen", "avoidWhen", "codeUI", "image2", "related"]) {
      assert.ok(Array.isArray(entry[field]) && entry[field].length > 0, `${entry.id} missing ${field}`);
    }

    const imagePath = path.resolve(repoRoot, entry.example.src.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(imagePath), `${entry.id} missing image ${entry.example.src}`);
    assert.ok(entry.example.alt && entry.example.caption, `${entry.id} image needs alt text and a caption`);
    assert.ok(entry.related.every((id) => vocabularyById[id]), `${entry.id} has an unknown related term`);
  }
});
