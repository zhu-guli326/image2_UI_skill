import assert from "node:assert/strict";
import test from "node:test";
import { buildCodexArgs, createLegacyToolRegistry } from "../runtime/tools/legacy-cli.mjs";
import { ToolRegistry } from "../runtime/tools/registry.mjs";

test("ToolRegistry provides stable metadata and rejects duplicate names", async () => {
  let context;
  const registry = new ToolRegistry().register({
    name: "test.echo",
    version: "7",
    timeoutMs: 42,
    async invoke(input, ctx) {
      context = ctx;
      return { ok: true, data: input };
    },
  });

  assert.deepEqual(await registry.invoke("test.echo", { value: 1 }), { ok: true, data: { value: 1 } });
  assert.deepEqual(context.tool, { name: "test.echo", version: "7" });
  assert.equal(context.timeoutMs, 42);
  assert.deepEqual(await registry.probe("test.echo"), { available: true });
  assert.throws(() => registry.register({ name: "test.echo", invoke() {} }), /already registered/);
});

test("legacy Agent arguments support non-Git output directories", () => {
  const args = buildCodexArgs({ target: "output", prompt: "build", access: "write" }, "test-model");
  assert.ok(args.includes("--skip-git-repo-check"));
  assert.deepEqual(args.slice(args.indexOf("--ask-for-approval"), args.indexOf("--ask-for-approval") + 2), ["--ask-for-approval", "never"]);
  assert.ok(args.includes("workspace-write"));
  assert.ok(args.includes("test-model"));
});

test("missing legacy Agent commands are classified as recoverable capabilities", async () => {
  const tools = createLegacyToolRegistry({ agentCommand: "definitely-not-a-real-image2-ui-command" });
  await assert.rejects(
    tools.invoke("agent.execute", { target: process.cwd(), prompt: "test", access: "write" }),
    (error) => error.code === "capability-unavailable" && error.blocked === true,
  );
});
