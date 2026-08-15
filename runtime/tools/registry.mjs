const DEFAULT_TOOL = Object.freeze({
  version: "1",
  access: "read",
  concurrencyKey: null,
  timeoutMs: 120_000,
});

export class ToolRegistry {
  #tools = new Map();

  constructor(tools = []) {
    for (const tool of tools) this.register(tool);
  }

  register(tool) {
    assertTool(tool);
    if (this.#tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.#tools.set(tool.name, { ...DEFAULT_TOOL, ...tool });
    return this;
  }

  replace(name, tool) {
    if (tool?.name !== name) throw new Error("Replacement tool name mismatch");
    assertTool(tool);
    this.#tools.set(name, { ...DEFAULT_TOOL, ...tool });
    return this;
  }

  has(name) {
    return this.#tools.has(name);
  }

  get(name) {
    const tool = this.#tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool;
  }

  list() {
    return [...this.#tools.values()].map(({ name, version, access, concurrencyKey, timeoutMs }) => ({
      name,
      version,
      access,
      concurrencyKey,
      timeoutMs,
    }));
  }

  names() {
    return [...this.#tools.keys()];
  }

  async probe(name, ctx = {}) {
    const tool = this.get(name);
    const toolContext = { name, version: tool.version };
    return typeof tool.probe === "function"
      ? tool.probe({ ...ctx, tool: toolContext })
      : { available: true };
  }

  async invoke(name, input = {}, ctx = {}) {
    const tool = this.get(name);
    return tool.invoke(input, {
      ...ctx,
      timeoutMs: ctx.timeoutMs ?? tool.timeoutMs,
      tool: { name, version: tool.version },
    });
  }
}

function assertTool(tool) {
  if (!tool?.name || typeof tool.invoke !== "function") throw new TypeError("Tool requires name and invoke()");
  if (!["read", "write"].includes(tool.access || DEFAULT_TOOL.access)) throw new TypeError("Tool access must be read or write");
  if (!Number.isInteger(tool.timeoutMs ?? DEFAULT_TOOL.timeoutMs) || (tool.timeoutMs ?? DEFAULT_TOOL.timeoutMs) < 1) throw new TypeError("Tool timeoutMs must be a positive integer");
}

export const createToolRegistry = (tools = []) => new ToolRegistry(tools);

export default ToolRegistry;
