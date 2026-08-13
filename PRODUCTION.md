# Production Guide

This repository is a Codex skill plus a small CLI toolkit. Production readiness
means the skill can be installed, audited, tested, and reused without relying on
hidden session state.

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

The npm package intentionally contains the Skill, scripts, references, and
README hero only. The full demo media archive and case-study videos live in the
separate [`ui_case`](https://github.com/zhu-guli326/ui_case) repository and are
published at <https://zhu-guli326.github.io/ui_case/>.

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

## Multi-Agent Execution

Use the orchestrator when the host provides `codex exec` or a compatible agent
CLI:

```bash
image2-ui orchestrate ./my-output \
  --task "Turn the reference into a production-shaped clickable demo" \
  --reference ./reference.png
```

The workflow runs discovery, architecture, implementation, verification, and
release phases. Independent roles run in parallel within a phase; dependent
roles wait for their required handoff artifacts. Run `--mode sequential` when
agents cannot safely share a workspace. Use `--dry-run --json` to inspect the
DAG without starting agents.

Each run writes isolated logs and handoffs under
`<project>/.image2-ui/agents/<run-id>/`. Agents never commit or push. The lead
agent remains responsible for scope, merge decisions, and final validation.

The workflow includes a dedicated analysis-only `code-reviewer` phase between
implementation and QA. It produces `code-review-report.md` with severity,
file/line references, regression risks, and missing-test findings. QA waits for
the review and accessibility reports before producing the final fix queue.

## Motion Quality

Every generated demo should provide deliberate content entrance, control
feedback, and a final `prefers-reduced-motion` override. Motion must not be
required to understand or operate the interface.

For a generated demo:

```bash
image2-ui validate <demo-dir> --reference <reference-image>
image2-ui loop <demo-dir> --reference <reference-image> --build "<build-command>"
```

`validate` must have zero `fail` findings. Warnings should either be fixed or
recorded as explicit design tradeoffs in the delivery notes.

## Image2 Channel Policy

Use `scripts/image2_asset.py` when a task needs repeatable image generation.
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
- CLI and fixture tests pass with `npm test`.
- A representative output is checked with `image2-ui validate` when validation behavior changes.
- `npm run doctor` reports at least one available image channel, or the release
  notes state that image generation is intentionally unavailable in CI.
- `scripts/image2-ui` and `scripts/image2_asset.py` are executable.
- README, `SKILL.md`, and relevant `references/` files describe the same channel
  names and validation commands.
- Generated loop artifacts are not committed.
- The package has an explicit license and release metadata; publishing is done
  through the manual GitHub Actions release workflow after a dry run.
