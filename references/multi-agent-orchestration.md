# Multi-Agent Orchestration

This reference defines the Runtime-owned Multi-Agent model for `image-to-ui-skill`.

## Control Plane Rule

There is exactly one top-level run lifecycle:

```text
User request
   ↓
Workflow mode: Recreate | Redesign | Create
   ↓
Runtime
├── State Machine
├── Runner
├── Policies
├── Event Log / Resume
├── Verify -> Fix -> Verify
└── DAG Scheduler
    ├── Role Catalog
    ├── Dependency Planner
    └── Specialist Agent Executor
```

The Scheduler is subordinate to Runtime. It may decide which DAG nodes are ready,
which can run in parallel, and which artifacts are required, but it never owns a
second workflow status, iteration budget, source-of-truth policy, or run ID.

Canonical Runtime files:

```text
<project>/.image2-ui/runs/<run-id>/state.json
<project>/.image2-ui/runs/<run-id>/events.jsonl
```

Scheduler files inside the same run:

```text
<project>/.image2-ui/runs/<run-id>/scheduler/scheduler.json
<project>/.image2-ui/runs/<run-id>/scheduler/artifacts/
<project>/.image2-ui/runs/<run-id>/scheduler/roles/<role>/final-message.md
```

New runs must not create `.image2-ui/agents/<run-id>` as a competing lifecycle.
That path is legacy-only and may still be inspected with `image2-ui state` when a
historical standalone orchestrator manifest exists.

## Entry Points

Preferred:

```bash
image2-ui run <project-dir> \
  --mode recreate \
  --task "Recreate this production UI" \
  --reference reference.png \
  --execution multi-agent \
  --max-parallel 2
```

Compatibility entry:

```bash
image2-ui orchestrate <project-dir> \
  --task "Recreate this production UI" \
  --reference reference.png \
  --workflow recreate \
  --mode parallel
```

`orchestrate` translates its arguments into Runtime Multi-Agent execution.
Historical `--mode parallel|sequential` keeps its scheduler meaning, while
`--workflow recreate|redesign|create` selects the UI workflow. Sequential mode
uses a concurrency of one.

Use `--dry-run --json` to inspect the Runtime state plus scheduler plan without
launching specialist agents.

## Capability Detection

Before Multi-Agent execution, Runtime preflight must establish that:

1. `agent.execute` is available.
2. The selected image channel is available when the active workflow requires it.
3. `ui.validate` is available.
4. The output workspace is writable when mutation is allowed.
5. Browser verification is available unless the run explicitly disables it.

Multi-Agent availability is not itself a reason to use it. Single-Agent remains
the default and is preferred when delegation does not materially improve quality
or clarity.

## Workflow Source Of Truth

Every specialist receives the same canonical workflow mode and source-of-truth
policy from Runtime:

- **Recreate:** original reference is primary.
- **Redesign:** approved/inspected Effect Image is primary; original reference is secondary direction context.
- **Create:** approved/inspected Effect Image is primary.

A specialist must not silently change Recreate into Redesign, regenerate a new
primary design source, or reinterpret the user's workflow mode.

## Default Role Graph

The current Runtime Multi-Agent default is a medium graph:

```text
visual-analyst -----\
                     +--> ui-architect --\
asset-engineer -----/                    +--> ui-implementer --> code-reviewer --> accessibility --> qa-auditor --> release
```

Effective dependencies are calculated only among active roles. The role catalog
also contains `backend-contract` and `state-machine` for complex products, but
those roles should be activated only when API contracts, permissions, async
business states, rollback, offline behavior, or similar concerns actually exist.

The scheduler validates that the active graph is acyclic and builds dependency-
safe batches. Independent ready nodes may run concurrently up to
`limits.maxParallel`.

## Runtime Stage Mapping

Runtime determines when the DAG advances.

### Implement

Multi-Agent `implement` runs the graph through the implementation phase:

```text
discovery -> architecture -> ui-implementer
```

The implementation node is the only default node expected to intentionally edit
application source. Analysis roles may write their declared scheduler artifacts
but must not silently modify product code.

### Verify

Multi-Agent `verify` advances the graph through verification:

```text
code-reviewer -> accessibility -> qa-auditor
```

`qa-auditor` must produce:

```text
qa-report.md
qa-findings.json
```

Machine-readable contract:

```json
{
  "mustFix": [
    {
      "rule": "example-rule",
      "message": "Blocking finding",
      "location": "optional file or UI region"
    }
  ],
  "shouldFix": []
}
```

Runtime normalizes these findings and merges them into the same Must Fix / Should
Fix result used by `ui.validate`. The specialist QA layer therefore contributes
to, but does not replace, the normal build/browser/asset validator.

### Fix

Runtime owns the bounded fix loop. After a successful workspace mutation in a
Multi-Agent run, scheduler nodes from the review phase onward are invalidated:

```text
code-reviewer
accessibility
qa-auditor
release
```

They must rerun against the updated workspace. Completed discovery,
architecture, and implementation handoffs are retained unless the Runtime later
introduces a stronger invalidation policy.

### Finalize

The release node runs during Runtime `finalize`. It summarizes changed files,
checks, scheduler participation, known risks, and unresolved findings. It does
not commit or push.

## Scheduler Persistence And Recovery

`scheduler.json` is subordinate durable node state. It records:

- Runtime `runId` and target.
- Workflow mode.
- Active role plan and batches.
- Node dependencies.
- Node status: `pending | running | complete | blocked | failed`.
- Attempts and timestamps.
- Required output paths.

Writes use a temporary file plus rename.

If a process stops while a scheduler node is `running`, the next scheduler
execution reconciles that node back to `pending` and retries it from the current
workspace state. Runtime still owns the top-level interruption policy and the
canonical `currentOperation` record.

Scheduler-heavy Runtime stages use the Agent timeout budget because a single
Runtime stage may execute multiple specialist nodes.

## Specialist Roles

### visual-analyst

Purpose:

- Inspect the workflow source of truth and repository.
- Name major UI regions and visual patterns.
- Split code-rendered UI from bitmap/image2 assets.
- Record fidelity risks without editing product source.

Outputs:

```text
ui-audit.md
code-ui-inventory.md
image2-assets.md
visual-risks.md
```

### asset-engineer

Purpose:

- Build or verify the image asset manifest.
- Define image2 prompts, crop strategy, local paths, alt text, and provenance.
- Keep UI text, common controls, status bars, logos, and tiny functional glyphs out of generated bitmap assets.

Outputs:

```text
asset-manifest.json
image2-prompts.md
asset-provenance.md
```

### ui-architect

Purpose:

- Define route and feature boundaries.
- Define component APIs, tokens, responsive behavior, i18n structure, and test surface.
- Prefer existing repository conventions over framework churn.

Output:

```text
ui-architecture.md
```

### backend-contract

Complex-tier purpose:

- Define request/response schemas, error envelopes, permissions, auth assumptions, caching, retries, cancellation, and mock boundaries.

Output:

```text
backend-contract.md
```

Do not pretend a real backend exists when the project only has mocks.

### state-machine

Complex-tier purpose:

- Model **the generated product's** user-flow state, not the Harness Runtime.
- Cover loading, empty, error, offline, disabled, retry, optimistic update, and rollback states.

Output:

```text
state-machine.md
```

### ui-implementer

Purpose:

- Implement the production-shaped clickable UI in the existing project.
- Respect the Runtime-selected source of truth and dependency handoffs.
- Wire real text, controls, local assets, responsive behavior, and interaction states.

Output:

```text
implementation-notes.md
```

It may edit application source but must not commit or push.

### code-reviewer

Purpose:

- Review correctness, regressions, security, maintainability, scope, standards, and missing tests.
- Report findings first and remain analysis-only.

Output:

```text
code-review-report.md
```

### accessibility

Purpose:

- Audit keyboard flow, focus, accessible names, ARIA, contrast, reduced motion, touch targets, and screen-reader semantics.

Output:

```text
accessibility-report.md
```

### qa-auditor

Purpose:

- Run appropriate build/tests/browser/asset/visual checks.
- Distinguish Must Fix from Should Fix.
- Produce both human and machine-readable evidence for Runtime verification.

Outputs:

```text
qa-report.md
qa-findings.json
```

### release

Purpose:

- Review final artifacts, git status, validation evidence, changed files, and known risks.
- Produce a release handoff without committing or pushing.

Output:

```text
release-report.md
```

## Handoff Contract

Every specialist final message must end with:

```markdown
## Agent Handoff
- Role: <role>
- Status: complete | needs-input | blocked
- Scope:
- Files created:
- Files changed:
- Decisions:
- Open questions:
- Validation run:
- Next agent:
```

Runtime Scheduler treats missing or malformed handoffs as node failure. A
`needs-input` or `blocked` handoff becomes a scheduler blocker and therefore a
Runtime blocker rather than being hidden in free-form prose.

Use stable artifact paths so another node or a resumed run can continue without
reconstructing hidden context.

## Safety And Scope

- Do not commit or push from specialist nodes.
- Do not delete unrelated files.
- Do not broaden the product scope without Runtime/user direction.
- Do not claim checks that were not run.
- Do not use multiple roles merely to simulate complexity.
- Analysis-only roles may write their declared scheduler artifacts, but should not mutate application source.
- When multiple agents share one workspace, parallelize only nodes whose declared work does not conflict.

## Single-Agent Fallback

If Multi-Agent is unavailable or unnecessary, stay in normal Runtime
`single-agent` execution. Do not simulate a multi-agent graph sequentially just
to satisfy a checklist.

The three UI workflow modes, Effect Image policy, State Machine, persistence,
Verify/Fix loop, and source-of-truth rules are identical in single- and
multi-agent execution.

## Reuse By Other Users

Another user can install the skill into their Codex skills directory and invoke
it with:

```text
Use $image-to-ui-skill to turn this reference into a production-shaped clickable demo.
```

The Skill must not depend on private paths, private credentials, a particular
machine, or an undeclared agent host. Project-specific credentials and image
channels must come from active project instructions or environment configuration.
