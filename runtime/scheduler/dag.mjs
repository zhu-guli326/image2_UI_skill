import { AGENT_ROLES, SCHEDULER_PHASES, phaseIndex, rolesForTier } from "./roles.mjs";

export function buildDagPlan({ tier = "medium", mode = "parallel", maxParallel = 2, throughPhase = "release" } = {}) {
  if (!["parallel", "sequential"].includes(mode)) throw new Error("Scheduler mode must be parallel or sequential");
  if (!Number.isInteger(maxParallel) || maxParallel < 1) throw new Error("maxParallel must be a positive integer");
  const maxPhase = phaseIndex(throughPhase);
  const selected = rolesForTier(tier).filter((role) => phaseIndex(AGENT_ROLES[role].phase) <= maxPhase);
  assertDag(selected);

  const completed = new Set();
  const phases = [];
  for (const phase of SCHEDULER_PHASES.slice(0, maxPhase + 1)) {
    const roles = selected.filter((role) => AGENT_ROLES[role].phase === phase);
    if (!roles.length) continue;
    const pending = new Set(roles);
    const batches = [];
    while (pending.size) {
      const ready = [...pending].filter((role) => effectiveDeps(role, selected).every((dep) => completed.has(dep)));
      if (!ready.length) throw new Error(`DAG cannot make progress in phase ${phase}: ${[...pending].join(", ")}`);
      const width = mode === "sequential" ? 1 : maxParallel;
      const batch = ready.slice(0, width);
      for (const role of batch) {
        pending.delete(role);
        completed.add(role);
      }
      batches.push(batch);
    }
    phases.push({ phase, roles, batches });
  }

  return {
    tier,
    mode,
    maxParallel,
    throughPhase,
    roles: selected,
    phases,
    batches: phases.flatMap((phase) => phase.batches.map((roles) => ({ phase: phase.phase, roles }))),
  };
}

export function effectiveDeps(role, selectedRoles) {
  const selected = new Set(selectedRoles);
  return (AGENT_ROLES[role]?.deps || []).filter((dep) => selected.has(dep));
}

export function readyRoles({ selectedRoles, statuses, throughPhase = "release" } = {}) {
  const maxPhase = phaseIndex(throughPhase);
  return selectedRoles.filter((role) => {
    if (phaseIndex(AGENT_ROLES[role].phase) > maxPhase) return false;
    if (["complete", "running"].includes(statuses?.[role])) return false;
    return effectiveDeps(role, selectedRoles).every((dep) => statuses?.[dep] === "complete");
  });
}

export function assertDag(selectedRoles) {
  const selected = new Set(selectedRoles);
  for (const role of selected) {
    if (!AGENT_ROLES[role]) throw new Error(`Unknown role in DAG: ${role}`);
    for (const dep of effectiveDeps(role, selectedRoles)) {
      if (!selected.has(dep)) throw new Error(`Role ${role} depends on missing role ${dep}`);
      if (phaseIndex(AGENT_ROLES[dep].phase) > phaseIndex(AGENT_ROLES[role].phase)) {
        throw new Error(`Role ${role} depends on later-phase role ${dep}`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  const visit = (role) => {
    if (visited.has(role)) return;
    if (visiting.has(role)) throw new Error(`DAG cycle detected at ${role}`);
    visiting.add(role);
    for (const dep of effectiveDeps(role, selectedRoles)) visit(dep);
    visiting.delete(role);
    visited.add(role);
  };
  for (const role of selected) visit(role);
  return true;
}
