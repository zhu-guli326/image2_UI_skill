import assert from "node:assert/strict";
import test from "node:test";
import { createState } from "../runtime/state-store.mjs";
import { nextStageFor, transition } from "../runtime/machine.mjs";

const fixture = (x = {}) => createState({
  runId: "machine",
  target: ".",
  prompt: "test",
  status: "running",
  stage: "verify",
  limits: { maxIterations: 2 },
  ...x,
});

test("Runtime machine bounds Verify/Fix", () => {
  const fix = transition(fixture(), { type: "STAGE_SUCCEEDED", result: { mustFix: [{ rule: "x", message: "x" }] } });
  assert.equal(fix.stage, "fix");
  assert.equal(fix.iteration, 0);
  assert.equal(transition(fixture({ stage: "fix" }), { type: "STAGE_SUCCEEDED", result: {} }).iteration, 1);
  assert.equal(transition(fixture({ iteration: 2 }), { type: "STAGE_SUCCEEDED", result: { mustFix: [{ rule: "x", message: "x" }] } }).status, "blocked");
});

test("workflow modes choose different stage graphs", () => {
  const recreate = fixture({
    stage: "preflight",
    task: { intent: "recreate", target: ".", prompt: "recreate", reference: "reference.png" },
    policy: { requireEffectImage: false },
  });
  assert.equal(nextStageFor(recreate), "analyze-reference");
  assert.equal(transition({ ...recreate, stage: "analyze-reference" }, { type: "STAGE_SUCCEEDED", result: {} }).stage, "decompose");

  const redesign = fixture({
    stage: "preflight",
    task: { intent: "redesign", target: ".", prompt: "redesign", reference: "reference.png" },
    policy: { requireEffectImage: true },
  });
  assert.equal(nextStageFor(redesign), "analyze-reference");
  assert.equal(transition({ ...redesign, stage: "analyze-reference" }, { type: "STAGE_SUCCEEDED", result: {} }).stage, "generate-effect");

  const create = fixture({
    stage: "preflight",
    task: { intent: "create", target: ".", prompt: "create", reference: null },
    policy: { requireEffectImage: true },
  });
  assert.equal(nextStageFor(create), "generate-effect");
  assert.equal(transition(create, { type: "STAGE_SUCCEEDED", result: {} }).stage, "generate-effect");
});

test("legacy intents remain readable but route through canonical workflow behavior", () => {
  const legacyRecreate = fixture({
    stage: "analyze-reference",
    task: { intent: "reference-recreation", target: ".", prompt: "legacy recreate", reference: "reference.png" },
    policy: { requireEffectImage: false },
  });
  assert.equal(nextStageFor(legacyRecreate), "decompose");

  const legacyRedesign = fixture({
    stage: "analyze-reference",
    task: { intent: "optimize", target: ".", prompt: "legacy redesign", reference: "reference.png" },
    policy: { requireEffectImage: true },
  });
  assert.equal(nextStageFor(legacyRedesign), "generate-effect");
});

test("Effect review routes deterministically", () => {
  const review = fixture({
    stage: "review-effect",
    task: { intent: "redesign", target: ".", prompt: "review", reference: "reference.png" },
    policy: { requireEffectImage: true },
  });
  assert.equal(transition(review, { type: "STAGE_SUCCEEDED", result: { decision: "approved" } }).stage, "decompose");
  const rejected = transition(review, { type: "STAGE_SUCCEEDED", result: { status: "rejected" } });
  assert.equal(rejected.stage, "generate-effect");
  assert.equal(rejected.effectRevision, 1);
});
