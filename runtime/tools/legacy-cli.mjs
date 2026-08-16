import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ToolRegistry } from "./registry.mjs";

const defaultRoot = path.resolve(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "..");

export function runProcess(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timer;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
      stdio: ["ignore", "pipe", "pipe"],
      signal: options.signal,
    });

    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => finish(error));
    child.on("close", (code) => {
      if ((options.allow || [0]).includes(code)) {
        finish(null, { stdout, stderr, exitCode: code });
        return;
      }
      const error = new Error(`Command exited ${code}: ${stderr.slice(-1000)}`);
      error.code = "legacy-cli-failed";
      error.exitCode = code;
      error.stdout = stdout;
      error.stderr = stderr;
      finish(error);
    });
    if (options.timeoutMs) {
      timer = setTimeout(() => {
        child.kill();
        const error = new Error(`Command timed out after ${options.timeoutMs}ms`);
        error.code = "tool-timeout";
        error.retryable = true;
        finish(error);
      }, options.timeoutMs);
    }

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        error.command ??= command;
        reject(error);
      } else {
        resolve(result);
      }
    }
  });
}

function scriptTool(root, file, name, build, allow = [0]) {
  return {
    name,
    async invoke(input = {}, ctx = {}) {
      const args = build(input);
      if (name === "ui.validate") {
        if (input.reference && !args.includes("--reference")) args.push("--reference", input.reference);
        if (input.workflowMode && !args.includes("--workflow-mode")) args.push("--workflow-mode", input.workflowMode);
        if (input.originalReference && !args.includes("--original-reference")) args.push("--original-reference", input.originalReference);
      }
      const result = await runProcess(process.execPath, [path.join(root, "scripts", file), ...args], {
        cwd: root,
        signal: ctx.signal,
        timeoutMs: ctx.timeoutMs,
        allow,
      });
      let data;
      try { data = JSON.parse(result.stdout); } catch { data = result; }
      return { ok: true, data, diagnostics: { exitCode: result.exitCode, stderr: result.stderr } };
    },
  };
}

export function createLegacyToolRegistry(options = {}) {
  const root = path.resolve(options.repoRoot || defaultRoot);
  const tools = new ToolRegistry();
  const agentCommand = options.agentCommand || process.env.IMAGE2_AGENT_COMMAND || "codex";
  const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

  tools.register(scriptTool(root, "doctor.mjs", "env.doctor", () => [], [0, 1]));
  tools.register(scriptTool(
    root,
    "ui_output_audit.mjs",
    "ui.validate",
    (input) => [input.target, "--json", ...(input.noBrowser ? ["--no-browser"] : [])],
    [0, 2],
  ));
  tools.register({
    name: "ui.build",
    access: "write",
    async invoke(input, ctx) {
      if (!input.command) return { ok: true, data: { skipped: true } };
      const command = process.platform === "win32" ? "cmd.exe" : "sh";
      const args = process.platform === "win32" ? ["/c", input.command] : ["-lc", input.command];
      return { ok: true, data: await runProcess(command, args, { cwd: input.target, signal: ctx.signal, timeoutMs: ctx.timeoutMs }) };
    },
  });
  tools.register({
    name: "agent.execute",
    access: "write",
    concurrencyKey: "workspace-write",
    timeoutMs: 900_000,
    async probe() {
      return { available: await commandExists(agentCommand), command: agentCommand };
    },
    async invoke(input, ctx) {
      const args = buildCodexArgs(input, options.model);
      try {
        return { ok: true, data: await runProcess(agentCommand, args, { cwd: input.target, signal: ctx.signal, timeoutMs: ctx.timeoutMs }) };
      } catch (error) {
        throw classifyCapabilityError(error, "Codex CLI is unavailable");
      }
    },
  });
  tools.register({
    name: "image.generate",
    access: "write",
    concurrencyKey: "image-generation",
    timeoutMs: 600_000,
    async probe(ctx = {}) {
      try {
        const result = await runProcess(python, [path.join(root, "scripts", "image2_asset.py"), "doctor"], {
          cwd: root,
          signal: ctx.signal,
          timeoutMs: Math.min(ctx.timeoutMs || 30_000, 30_000),
        });
        const report = JSON.parse(result.stdout || "{}");
        return { available: report.status === "ready", report };
      } catch (error) {
        return { available: false, reason: classifyCapabilityError(error, "Image generation channel is unavailable").message };
      }
    },
    async invoke(input, ctx) {
      const output = path.join(
        input.target,
        ".image2-ui",
        "runs",
        input.runId,
        "artifacts",
        `effect-image-${input.effectRevision || 0}.png`,
      );
      const reference = input.task?.reference;
      const actionArgs = reference ? ["edit", "--image", reference] : ["generate"];
      try {
        const data = await runProcess(
          python,
          [path.join(root, "scripts", "image2_asset.py"), ...actionArgs, "--prompt", input.prompt, "--output", output],
          { cwd: input.target, signal: ctx.signal, timeoutMs: ctx.timeoutMs },
        );
        return {
          ok: true,
          data: { ...data, output },
          artifacts: [{ kind: "effect-image", path: output, producer: "image.generate", operationId: ctx.operation?.operationId || null }],
        };
      } catch (error) {
        if (error.exitCode === 3 || error.code === "ENOENT") throw classifyCapabilityError(error, "Image generation channel is unavailable");
        throw error;
      }
    },
  });
  return tools;
}

async function commandExists(command) {
  if (path.isAbsolute(command) || command.includes(path.sep)) {
    try { await fs.access(command); return true; } catch { return false; }
  }
  try {
    await runProcess(process.platform === "win32" ? "where.exe" : "which", [command], { timeoutMs: 5_000 });
    return true;
  } catch {
    return false;
  }
}

function classifyCapabilityError(error, message) {
  if (error.code === "ENOENT" || error.exitCode === 3) {
    error.code = "capability-unavailable";
    error.message = `${message}: ${error.command || "command not found"}`;
    error.blocked = true;
    error.retryable = true;
  }
  return error;
}

export default createLegacyToolRegistry;

export function buildCodexArgs(input, model = null) {
  const args = [
    "exec",
    "--ephemeral",
    "--json",
    "--skip-git-repo-check",
    "--sandbox",
    input.access === "read" ? "read-only" : "workspace-write",
    "--ask-for-approval",
    "never",
    "-C",
    input.target,
  ];
  if (model) args.push("--model", model);
  if (input.outputFile) args.push("-o", input.outputFile);
  args.push(input.prompt);
  return args;
}
