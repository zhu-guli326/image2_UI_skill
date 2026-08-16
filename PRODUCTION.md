# Production Guide

This repository is a UI Agent Skill plus a durable Harness Runtime and supporting CLI toolkit. Production readiness means the workflow can be installed, audited, tested, resumed, and reused without relying on hidden session state.

## Requirements

- Node.js 20 or newer.
- Python 3.10 or newer.
- Optional: Playwright for browser render checks.
- Optional: a project `image2` command on `PATH`, or `IMAGE2_COMMAND`.
- Optional fallback credentials through `OPENAI_API_KEY`,
  `YOUTOKEN_IMAGE_API_KEY`, `OPENROUTER_ICU_API_KEY`, or
  `~/.codex/youtoken-image.env`.

## Install For Local Development

```bash
npm test
node scripts/image2-ui --help
python3 scripts/image2_asset.py doctor
```

To expose the CLI globally from a checkout:

```bash
npm link
image2-ui doctor
```

The npm package intentionally contains the Skill, Runtime, schemas, scripts,
references, and README hero. The full demo media archive and case-study videos
live in the separate [`ui_case`](https://github.com/zhu-guli326/ui_case)
repository and are published at <https://zhu-guli326.github.io/ui_case/>.

## Quality Gates

Run these before shipping a change:

```bash
npm test
npm run doctor
npm run pack:check
```

The Skill repository does not bundle the gallery demos. Use `image2-ui validate`
against the demo directory produced by the current task. The maintained case
gallery and its own site contract live in the separate `ui_case` repository.

## Three Workflow Modes

Every implementation run resolves to one canonical workflow mode:

### Recreate

```text
reference -> analyze -> decompose -> implement -> verify(reference) -> fix loop
```

The original reference is the implementation and verification source of truth.
A complete Effect Image is skipped by default.

```bash
image2-ui run ./my-output \
  --mode recreate \
  --task "Recreate this UI faithfully" \
  --reference ./reference.png
```

### Redesign

```text
reference -> analyze -> generate effect -> review -> decompose -> implement -> verify(effect) -> fix loop
```

The reference supplies visual language and constraints. The inspected or
approved Effect Image becomes the primary implementation and verification source
of truth.

```bash
image2-ui run ./my-output \
  --mode redesign \
  --task "Redesign this reference for my product" \
  --reference ./reference.png
```

### Create

```text
description -> generate effect -> review -> decompose -> implement -> verify(effect) -> fix loop
```

Create does not require a reference and skips the reference-analysis stage.

```bash
image2-ui run ./my-output \
  --mode create \
  --task "Create a premium mobile finance dashboard"
```

With `--reference` and no explicit mode, Runtime defaults to `recreate`. Without
`--reference`, Runtime defaults to `create`. `redesign` must be selected
explicitly.

Add `--require-effect-review` only when Redesign/Create need an explicit human
checkpoint. Resume that checkpoint with `--decision approved` or
`--decision rejected`.

## UI Harness Runtime

The Runtime is the authoritative top-level lifecycle for durable UI execution:

```bash
image2-ui inspect ./my-output --latest --json
image2-ui resume ./my-output --latest
```

Runtime snapshots live under `<project>/.image2-ui/runs/<run-id>/`. `state.json`
stores the current durable state; `events.jsonl` records the ordered event trail.
Unresolved Must Fix findings become `blocked` after the iteration budget. An
interrupted workspace mutation is reconciled by verification before another
write-capable Agent may run.

New Runtime runs persist the canonical modes `recreate`, `redesign`, and
`create`. The loader continues to understand legacy persisted aliases such as
`reference-recreation` and `optimize` for backward compatibility.

### Runtime State Machine

The Runtime state machine is mode-aware rather than one universal linear flow:

```text
Recreate:
init -> preflight -> analyze-reference -> decompose -> implement -> verify -> fix* -> finalize

Redesign:
init -> preflight -> analyze-reference -> generate-effect -> review-effect -> decompose -> implement -> verify -> fix* -> finalize

Create:
init -> preflight -> generate-effect -> review-effect -> decompose -> implement -> verify -> fix* -> finalize
```

`fix*` is bounded by the configured iteration budget. Effect review rejection
returns to `generate-effect`; an explicit approval policy may pause a run in
`waiting-input`.

## Multi-Agent Execution

Use `orchestrate` only when a task genuinely benefits from specialist roles:

```bash
image2-ui orchestrate ./my-output \
  --task "Turn the reference into a production-shaped clickable demo" \
  --reference ./reference.png
```

The current orchestrator maintains a DAG of roles and handoff artifacts under
`<project>/.image2-ui/agents/<run-id>/`. Independent roles may run in parallel;
dependent roles wait for their prerequisites. Use `--mode sequential` when
agents cannot safely share a workspace. Use `--dry-run --json` to inspect the
DAG without starting agents.

The architectural direction is explicit: **Runtime owns the run lifecycle; the
Agent DAG is a scheduler beneath Runtime.** Until that consolidation is complete,
`orchestrate` remains a compatibility execution surface and must not redefine
the canonical Recreate/Redesign/Create workflow contract.

Agents never commit or push. The lead agent remains responsible for scope, merge
decisions, and final validation.

### Legacy Orchestrator State

The standalone orchestrator currently persists its own compatibility state in
each `run.json`. Workflow states are `created`, `planned`, `running`, `complete`,
`failed`, and `blocked`; role states are `pending`, `running`, `complete`,
`failed`, and `blocked`.

```bash
image2-ui state ./my-output/.image2-ui/agents/<run-id>/run.json
image2-ui state ./my-output/.image2-ui/agents/<run-id>/run.json --json
```

The state command replays persisted snapshots and exits with status `2` when a
state alias, transition, or history entry is invalid.

The production DAG includes a dedicated analysis-only `code-reviewer` between
implementation and QA. QA waits for code review and accessibility reports before
producing the final fix queue.

## Verification Policy

Verification follows the active workflow source of truth:

- Recreate: compare implementation against the original reference.
- Redesign: compare implementation primarily against the Effect Image; preserve
  the original reference as secondary style/direction context.
- Create: compare implementation against the Effect Image.

For a generated demo:

```bash
image2-ui validate <demo-dir> --reference <workflow-source-of-truth>
image2-ui loop <demo-dir> --reference <workflow-source-of-truth> --build "<build-command>"
```

`validate` must have zero `fail` findings. Warnings should either be fixed or
recorded as explicit design tradeoffs in the delivery notes.

## Motion Quality

Every generated demo should provide deliberate content entrance, control
feedback, and a final `prefers-reduced-motion` override. Motion must not be
required to understand or operate the interface.

## Image2 Channel Policy

Use `scripts/image2_asset.py` when a task needs repeatable image generation.
Effect Image generation is required by default for Redesign/Create and skipped
by default for Recreate. Recreate may still use image2 for missing or rebuilt
bitmap implementation assets.

The wrapper tries channels in this order:

1. `native-image2 source=project-image2` through `IMAGE2_COMMAND` or `image2`
   on `PATH`.
2. `native-image2 source=openai-imagegen-cli` through the local imagegen CLI
   when fallback credentials are available.

Examples:

```bash
python3 scripts/image2_asset.py generate \
  --prompt "A clean product hero image, no text, no logo, no UI glyphs" \
  --output public/generated/hero.png \
  --size 1536x1024

python3 scripts/image2_asset.py edit \
  --image reference.png \
  --prompt "Keep the product silhouette, remove text, no UI controls" \
  --output public/generated/product-cutout.png \
  --prefer image2
```

After a successful non-dry run, the wrapper writes a provenance JSON file next
to the output image unless `--provenance` is provided.

## Release Checklist

- `npm test` passes.
- Recreate, Redesign, and Create routing tests pass.
- CLI and fixture tests pass with `npm test`.
- A representative output is checked with `image2-ui validate` when validation
  behavior changes.
- `npm run doctor` reports at least one available image channel, or release notes
  state that image generation is intentionally unavailable in CI.
- `npm run pack:check` includes `runtime/` and `schemas/`.
- `scripts/image2-ui` and `scripts/image2_asset.py` are executable.
- README, `SKILL.md`, `PRODUCTION.md`, and relevant `references/` describe the
  same three workflow modes and Effect Image policy.
- Generated loop artifacts are not committed.
- The package has an explicit license and release metadata; publishing is done
  through the manual GitHub Actions release workflow after a dry run.