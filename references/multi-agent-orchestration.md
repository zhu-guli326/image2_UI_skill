# Multi-Agent Orchestration

This reference defines how `image-to-ui-skill` can be reused by another Codex session or agent host with multi-agent support.

## Capability Detection

Before delegating, the lead agent should detect:

1. Whether subagent or multi-agent tools are available.
2. Whether the current host allows parallel execution.
3. Whether agents share a workspace or use isolated worktrees.
4. Whether image generation and browser verification are available to specialist agents.

Do not assume every user has the same agent tools. The skill remains usable in a single-agent environment.

## Lead Agent

The lead agent owns user intent, repository discovery, task decomposition, shared artifact paths, merge decisions, final validation, and the delivery report.

Give coding agents disjoint write scopes. Use analysis-only roles before implementation when scopes cannot be isolated.

## Specialist Roles

### visual-analyst

Input:

- Reference images, videos, existing screenshots, and user constraints.

Output:

- `artifacts/ui-audit.md`
- `artifacts/code-ui-inventory.md`
- `artifacts/image2-assets.md`
- `artifacts/visual-risks.md`

Identify readable UI text, controls, status glyphs, layout chrome, product imagery, and decorative imagery separately.

### asset-engineer

Input:

- `artifacts/image2-assets.md`
- Project asset conventions.

Output:

- `artifacts/asset-manifest.json`
- `artifacts/image2-prompts.md`
- Generated or verified image files under the project asset directory.
- `artifacts/asset-provenance.md`

Do not generate UI text, logos, status bars, buttons, or tiny functional icons inside bitmap assets.

### ui-architect

Input:

- `artifacts/ui-audit.md`
- `artifacts/code-ui-inventory.md`
- Existing repository conventions.

Output:

- `artifacts/ui-architecture.md`
- Route and feature boundaries.
- Component API notes.
- Design token and i18n plan.
- Test surface map.

Prefer existing project patterns over introducing a new framework or state library.

### backend-contract

Input:

- UI inventory and architecture.
- Existing API clients, schemas, or backend documentation when available.

Output:

- `artifacts/backend-contract.md`
- Request and response schemas.
- Error envelope and status-code rules.
- Permission and authentication assumptions.
- Mock or fixture data boundaries.

If no backend exists, define a stable mock contract without pretending that a real API has been integrated. Keep network, caching, retries, and cancellation assumptions explicit.

### state-machine

Input:

- UI architecture.
- Backend contract.
- User flows and device or form requirements.

Output:

- `artifacts/state-machine.md`
- State diagrams or transition tables.
- Event names and side effects.
- Loading, empty, error, offline, disabled, retry, optimistic-update, and rollback behavior.

Do not reduce asynchronous business behavior to a single boolean when multiple states affect user actions or data integrity.

### ui-implementer

Input:

- Architecture artifact.
- Backend contract.
- State machine.
- Asset manifest.
- Existing project conventions.

Output:

- Production-shaped source code.
- Component, feature, hook, locale, token, and test files within the assigned write scope.
- `artifacts/implementation-notes.md`

Include loading, empty, error, disabled, and responsive states when the feature has asynchronous or variable data.

### accessibility

Input:

- Implemented source.
- User flows and state machine.
- Reference screenshots when visual comparison affects semantics.

Output:

- `artifacts/accessibility-report.md`
- Keyboard and focus findings.
- Accessible-name and ARIA findings.
- Contrast, reduced-motion, touch-target, and screen-reader findings.

Do not treat visual similarity as a reason to remove semantic labels, focus indicators, zoom support, or keyboard access.

### qa-auditor

Input:

- Implemented source.
- Reference images.
- Architecture, backend, state, asset, and accessibility artifacts.

Output:

- `artifacts/qa-report.md`
- Browser screenshots and visual comparison artifacts.
- Test and audit results.
- A prioritized fix queue.

Distinguish blocking failures from acceptable visual differences. Do not silently edit implementation files unless explicitly assigned that scope.

### release

Input:

- All artifacts and test reports.
- Git status and project metadata.

Output:

- `artifacts/release-report.md`
- Final validation summary.
- Changed-file summary.
- Execution mode and agent list.
- Known risks and deferred work.
- Commit or pull-request handoff details.

The release agent must not claim production readiness when required checks were skipped. It must report unavailable tools, unrun tests, and unresolved warnings.

## Handoff Contract

Every specialist handoff should use:

```markdown
## Agent Handoff
- Role:
- Status: ready | needs-input | blocked | complete
- Scope:
- Files created:
- Files changed:
- Decisions:
- Open questions:
- Validation run:
- Next agent:
```

Use stable artifact paths so another agent can continue without reconstructing hidden context.

## Recommended Execution Graph

```text
visual-analyst ----\
asset-engineer -----+--> ui-architect ----\
backend-contract ---+                     +--> ui-implementer --> accessibility --\
state-machine ------/                     /                         qa-auditor ----+--> release
```

`visual-analyst` and `asset-engineer` may run in parallel after repository discovery. `ui-architect`, `backend-contract`, and `state-machine` may run in parallel after the initial UI inventory, but the state machine should consume the backend contract when business behavior depends on APIs. `ui-implementer` starts after the contracts are available. `accessibility` and `qa-auditor` run after implementation. `release` runs last.

## Single-Agent Fallback

When multi-agent tools are unavailable:

1. Create the same artifact directory.
2. Perform the roles in graph order, sequentially.
3. Keep the same handoff headings.
4. Do not claim parallel execution.
5. Report `execution_mode: single-agent-sequential`.

When multi-agent tools are available, report `execution_mode: multi-agent` and list the roles that actually ran.

## Reuse By Other Users

Another user can install the skill into their Codex skills directory and invoke it with:

```text
Use $image-to-ui-skill to turn this reference into a production-shaped clickable demo.
```

The skill must not depend on private paths, private credentials, a particular machine, or an undeclared agent host. Project-specific credentials and image channels must come from the active project instructions or environment.
