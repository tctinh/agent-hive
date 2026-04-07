import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { createServer } from "net";
import {
  createOpencodeClient,
  createOpencodeServer,
  type Config as OpencodeConfig,
} from "@opencode-ai/sdk";
import plugin from "../index";
import { buildCompactionPrompt } from "../utils/compaction-prompt.js";
import { buildCheckpointRehydration } from "../utils/checkpoint-rehydration.js";
import type { PluginInput } from "@opencode-ai/plugin";

const EXPECTED_TOOLS = [
  "hive_feature_create",
  "hive_plan_write",
  "hive_plan_read",
  "hive_tasks_sync",
  "hive_worktree_start",
  "hive_worktree_create",
] as const;

type DefaultModel = { providerID: string; modelID: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function firstKey(record: Record<string, unknown>): string | null {
  const keys = Object.keys(record);
  return keys.length > 0 ? keys[0] : null;
}

async function getDefaultModel(client: ReturnType<typeof createOpencodeClient>): Promise<DefaultModel | null> {
  // SDK API: provider list is exposed via /config/providers
  // (not via client.provider.*)
  const raw = (await client.config.providers({
    query: { directory: process.cwd() },
  })) as unknown;

  const payload = isRecord(raw) && "data" in raw ? (raw as Record<string, unknown>).data : raw;
  if (!isRecord(payload)) return null;

  const providers = payload.providers;
  if (!Array.isArray(providers) || providers.length === 0) return null;

  const defaultMap = payload.default;
  if (!isRecord(defaultMap)) return null;

  const providerEntry = providers.find((p) => isRecord(p) && isRecord(p.models));
  if (!isRecord(providerEntry)) return null;

  const providerID = typeof providerEntry.id === "string" ? providerEntry.id : null;
  if (!providerID) return null;

  const models = providerEntry.models;
  if (!isRecord(models)) return null;

  const supportsToolCall = (modelInfo: unknown): boolean => {
    if (!isRecord(modelInfo)) return false;
    const v = modelInfo.tool_call ?? modelInfo.toolcall;
    return v === true;
  };

  const defaultModelID = typeof defaultMap[providerID] === "string" ? (defaultMap[providerID] as string) : null;

  if (defaultModelID && supportsToolCall(models[defaultModelID])) {
    return { providerID, modelID: defaultModelID };
  }

  for (const modelID of Object.keys(models)) {
    if (supportsToolCall(models[modelID])) {
      return { providerID, modelID };
    }
  }

  const fallback = defaultModelID ?? firstKey(models);
  if (!fallback) return null;
  return { providerID, modelID: fallback };
}

async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || !address) {
        server.close();
        reject(new Error("Failed to get free port"));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function safeRm(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function pickHivePluginEntry(): string {
  const tsEntry = path.resolve(import.meta.dir, "..", "index.ts");
  if (fs.existsSync(tsEntry)) return tsEntry;

  const distEntry = path.resolve(import.meta.dir, "..", "..", "dist", "index.js");
  if (fs.existsSync(distEntry)) return distEntry;

  return tsEntry;
}

function extractStringArray(raw: unknown, depth = 0): string[] {
  if (depth > 4) return [];

  if (Array.isArray(raw) && raw.every((v) => typeof v === "string")) return raw;
  if (!isRecord(raw)) return [];

  if ("data" in raw) {
    return extractStringArray(raw.data, depth + 1);
  }

  const knownArrayKeys = ["ids", "tools", "toolIds", "toolIDs"] as const;
  for (const key of knownArrayKeys) {
    const v = raw[key];
    if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  }

  const idsValue = raw.ids;
  if (isRecord(idsValue)) {
    const keys = Object.keys(idsValue);
    if (keys.length > 0 && keys.every((k) => typeof k === "string")) return keys;
  }

  return [];
}

async function waitForTools(
  idsProvider: () => Promise<string[]>,
  expected: readonly string[],
  timeoutMs: number
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  let lastIds: string[] = [];

  while (Date.now() < deadline) {
    try {
      const ids = await idsProvider();
      lastIds = ids;
      const ok = expected.every((t) => ids.includes(t));
      if (ok) return ids;
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  if (lastError) throw lastError;
  return lastIds.length ? lastIds : await idsProvider();
}

describe("e2e: OpenCode runtime loads opencode-hive", () => {
  it("exposes hive tools via /experimental/tool/ids", async () => {
    const tmpBase = "/tmp/hive-e2e-runtime";
    safeRm(tmpBase);
    fs.mkdirSync(tmpBase, { recursive: true });

    const projectDir = fs.mkdtempSync(path.join(tmpBase, "project-"));
    fs.mkdirSync(path.join(projectDir, ".opencode", "plugin"), { recursive: true });

    const hivePluginEntry = pickHivePluginEntry();

    const pluginFile = path.join(projectDir, ".opencode", "plugin", "hive.ts");
    const pluginSource = `import hive from ${JSON.stringify(hivePluginEntry)}\nexport const HivePlugin = hive\n`;
    fs.writeFileSync(pluginFile, pluginSource);

    const previousCwd = process.cwd();
    const previousConfigDir = process.env.OPENCODE_CONFIG_DIR;
    const previousDisableDefault = process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS;

    process.chdir(projectDir);
    process.env.OPENCODE_CONFIG_DIR = path.join(projectDir, ".opencode");
    process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS = "true";

    let port: number;
    try {
      port = await getFreePort();
    } catch (err) {
      console.warn("[hive] Skipping runtime e2e test: unable to bind localhost port", err);
      return;
    }

    const config: OpencodeConfig = {
      plugin: [],
    };

    let server: Awaited<ReturnType<typeof createOpencodeServer>> | null = null;
    try {
      server = await createOpencodeServer({
        hostname: "127.0.0.1",
        port,
        timeout: 20000,
        config,
      });
    } catch (err) {
      console.warn("[hive] Skipping runtime e2e test: unable to start opencode server", err);
      return;
    }
    if (!server) return;

    const client = createOpencodeClient({
      baseUrl: server.url,
      responseStyle: "data",
      throwOnError: true,
    });

    const abortController = new AbortController();

    async function approvePermissions(sessionID: string) {
      const sse = await client.event.subscribe({
        query: { directory: projectDir },
        signal: abortController.signal,
      });

      for await (const evt of sse.stream) {
        if (!evt || typeof evt !== "object") continue;
        const maybeType = (evt as { type?: unknown }).type;
        if (maybeType !== "permission.updated") continue;

        const properties = (evt as { properties?: unknown }).properties;
        if (!isRecord(properties)) continue;
        if (properties.sessionID !== sessionID) continue;

        const permissionID = typeof properties.id === "string" ? properties.id : null;
        if (!permissionID) continue;

        await client.postSessionIdPermissionsPermissionId({
          path: { id: sessionID, permissionID },
          body: { response: "once" },
          query: { directory: projectDir },
        });
      }
    }

    try {
      const ids = await waitForTools(
        async () => {
          const raw = (await client.tool.ids({ query: { directory: projectDir } })) as unknown;
          return extractStringArray(raw);
        },
        EXPECTED_TOOLS,
        15000
      );

      for (const toolName of EXPECTED_TOOLS) {
        expect(ids).toContain(toolName);
      }

      const defaultModel = await getDefaultModel(client);
      if (!defaultModel) {
        return;
      }

      const session = (await client.session.create({
        body: { title: "hive runtime e2e" },
        query: { directory: projectDir },
      })) as unknown;

      const sessionID = isRecord(session) && typeof session.id === "string" ? session.id : null;
      expect(sessionID).not.toBeNull();
      if (!sessionID) return;

      const permissionTask = approvePermissions(sessionID);

      // Prevent CI hangs: bound the prompt request time.
      const promptAbort = new AbortController();
      const promptTimer = setTimeout(() => promptAbort.abort(), 15000);
      let promptResult: unknown;
      try {
        promptResult = await client.session.prompt({
          path: { id: sessionID },
          query: { directory: projectDir },
          signal: promptAbort.signal,
          body: {
            model: defaultModel,
            system:
              "Call the tool hive_feature_create exactly once with {\"name\":\"rt-feature\"}.",
            tools: {
              hive_feature_create: true,
            },
            parts: [
              {
                type: "text",
                text: "Create a Hive feature named rt-feature.",
              },
            ],
          },
        });
      } catch (err) {
        console.warn("[hive] Skipping runtime e2e test: prompt did not complete", err);
        abortController.abort();
        await permissionTask.catch(() => undefined);
        return;
      } finally {
        clearTimeout(promptTimer);
      }

      const hasToolPart = Array.isArray((promptResult as any)?.parts)
        ? ((promptResult as any).parts as unknown[]).some(
            (p) => isRecord(p) && p.type === "tool" && p.tool === "hive_feature_create"
          )
        : false;

      if (!hasToolPart) {
        abortController.abort();
        await permissionTask.catch(() => undefined);
        return;
      }

      const featureDir = path.join(projectDir, ".hive", "features", "rt-feature");
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline && !fs.existsSync(featureDir)) {
        await new Promise((r) => setTimeout(r, 200));
      }

      abortController.abort();
      await permissionTask.catch(() => undefined);

      expect(fs.existsSync(featureDir)).toBe(true);
    } finally {
      abortController.abort();
      await server?.close();
      process.chdir(previousCwd);

      if (previousConfigDir === undefined) {
        delete process.env.OPENCODE_CONFIG_DIR;
      } else {
        process.env.OPENCODE_CONFIG_DIR = previousConfigDir;
      }

      if (previousDisableDefault === undefined) {
        delete process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS;
      } else {
        process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS = previousDisableDefault;
      }

      safeRm(tmpBase);
    }
  }, 60000);
});

const TEST_ROOT_BASE_LOOP = "/tmp/hive-e2e-loop-mitigation";

function createStubShellForLoop(): PluginInput["$"] {
  const fn = ((..._args: unknown[]) => {
    throw new Error("shell not available in this test");
  }) as unknown as PluginInput["$"];
  return Object.assign(fn, {
    braces(pattern: string) { return [pattern]; },
    escape(input: string) { return input; },
    env() { return fn; },
    cwd() { return fn; },
    nothrow() { return fn; },
    throws() { return fn; },
  });
}

describe("e2e: Forager compaction loop mitigation (in-process)", () => {
  let testRoot: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    fs.rmSync(TEST_ROOT_BASE_LOOP, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE_LOOP, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE_LOOP, "project-"));
    process.env.HOME = testRoot;
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE_LOOP, { recursive: true, force: true });
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  });

  it("forager resumes after compaction without rediscovery prompt", async () => {
    const compactionPrompt = buildCompactionPrompt();
    expect(compactionPrompt).not.toMatch(/hive_status/);
    expect(compactionPrompt).toMatch(/worker-prompt\.md|task spec|spec file/i);
    expect(compactionPrompt).toContain("Next action: resume from where you left off.");
    expect(compactionPrompt).not.toMatch(/use hive_status to check feature state/i);
  });

  it("checkpoint rehydration points back to durable task files instead of prior chat", async () => {
    const taskDir = path.join(testRoot, ".hive", "features", "runtime-feature", "tasks", "01-runtime-task");
    fs.mkdirSync(taskDir, { recursive: true });
    fs.writeFileSync(
      path.join(taskDir, "status.json"),
      JSON.stringify({
        status: "in_progress",
        origin: "plan",
        planTitle: "Runtime Task",
        summary: "Resume from durable runtime checkpoint after compaction.",
      }, null, 2),
    );
    fs.writeFileSync(path.join(taskDir, "spec.md"), "RAW_PROMPT_SHOULD_NOT_SURVIVE\nmessages: [runtime]\n");

    const replayText = buildCheckpointRehydration({
      projectRoot: testRoot,
      featureName: "runtime-feature",
      taskFolder: "01-runtime-task",
      workerPromptPath: ".hive/features/runtime-feature/tasks/01-runtime-task/worker-prompt.md",
    });

    expect(replayText).not.toBeNull();
    expect(replayText).toContain("worker-prompt.md");
    expect(replayText).toContain("status.json");
    expect(replayText).toContain("spec.md");
    expect(replayText).not.toContain("RAW_PROMPT_SHOULD_NOT_SURVIVE");
    expect(replayText).not.toContain("messages: [runtime]");
  });

  it("runtime contract excludes unsupported startup/compaction hooks", async () => {
    const { createOpencodeClient: mkClient } = await import("@opencode-ai/sdk");
    const OPENCODE_CLIENT = mkClient({ baseUrl: "http://localhost:1" }) as unknown as PluginInput["client"];

    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: { id: "test", worktree: testRoot, time: { created: Date.now() } },
      client: OPENCODE_CLIENT,
      $: createStubShellForLoop(),
    };
    const hooks = await plugin(ctx);

    expect(hooks["experimental.chat.system.transform" as keyof typeof hooks]).toBeUndefined();
    expect(hooks["experimental.session.compacting" as keyof typeof hooks]).toBeUndefined();
  });

  it("exposes OpenCode-only todoProjection in hive_status for primary-session sync", async () => {
    const { createOpencodeClient: mkClient } = await import("@opencode-ai/sdk");
    const OPENCODE_CLIENT = mkClient({ baseUrl: "http://localhost:1" }) as unknown as PluginInput["client"];

    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: { id: "test", worktree: testRoot, time: { created: Date.now() } },
      client: OPENCODE_CLIENT,
      $: createStubShellForLoop(),
    };

    const hooks = await plugin(ctx);
    const toolContext = { sessionID: "sess_todo_projection_runtime", messageID: "msg_test", agent: "hive-master", abort: new AbortController().signal };

    await hooks.tool!.hive_feature_create.execute({ name: "runtime-todo-feature" }, toolContext);

    const statusRaw = await hooks.tool!.hive_status.execute(
      { feature: "runtime-todo-feature" },
      toolContext,
    );
    const status = JSON.parse(statusRaw as string) as {
      todoProjection?: {
        managedBy?: string;
        items?: Array<{ id: string; content: string; status: string; priority: string }>;
      };
    };

    expect(status.todoProjection).toMatchObject({
      managedBy: "opencode-hive",
    });
    expect(status.todoProjection?.items).toContainEqual({
      id: "hive:runtime-todo-feature:feature",
      content: "Finish the plan for runtime-todo-feature",
      status: "pending",
      priority: "high",
    });
  });

  it("compacted forager flow reaches commit-capable step without hive_status stall", async () => {
    const { execSync } = await import("child_process");
    const { createOpencodeClient: mkClient } = await import("@opencode-ai/sdk");
    const OPENCODE_CLIENT = mkClient({ baseUrl: "http://localhost:1" }) as unknown as PluginInput["client"];

    execSync("git init", { cwd: testRoot });
    execSync('git config user.email "test@example.com"', { cwd: testRoot });
    execSync('git config user.name "Test"', { cwd: testRoot });
    fs.writeFileSync(path.join(testRoot, "README.md"), "test");
    execSync("git add README.md", { cwd: testRoot });
    execSync('git commit -m "init"', { cwd: testRoot });

    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: { id: "test", worktree: testRoot, time: { created: Date.now() } },
      client: OPENCODE_CLIENT,
      $: createStubShellForLoop(),
    };
    const hooks = await plugin(ctx);
    const toolContext = { sessionID: "sess_compaction_loop", messageID: "msg_test", agent: "forager-worker", abort: new AbortController().signal };

    await hooks.tool!.hive_feature_create.execute({ name: "compaction-test-feature" }, toolContext);

    const plan = `# Compaction Test Feature

## Discovery

**Q: Is this a test?**
A: Yes, this is a regression test for the compaction loop mitigation. Validates that after a compaction event, the Forager worker can resume its task without calling hive_status or re-reading the codebase.

## Tasks

### 1. Compaction Task
Test compaction resume flow.
`;
    await hooks.tool!.hive_plan_write.execute({ content: plan, feature: "compaction-test-feature" }, toolContext);
    await hooks.tool!.hive_plan_approve.execute({ feature: "compaction-test-feature" }, toolContext);
    await hooks.tool!.hive_tasks_sync.execute({ feature: "compaction-test-feature" }, toolContext);

    const worktreeRaw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "compaction-test-feature", task: "01-compaction-task" },
      toolContext,
    );
    const worktreeResult = JSON.parse(worktreeRaw as string) as { worktreePath?: string };
    expect(worktreeResult.worktreePath).toBeDefined();

    const worktreePath = worktreeResult.worktreePath!;
    fs.writeFileSync(path.join(worktreePath, "change.txt"), "compaction resume test\n");

    const commitRaw = await hooks.tool!.hive_worktree_commit.execute(
      {
        feature: "compaction-test-feature",
        task: "01-compaction-task",
        status: "completed",
        summary: "Compaction resume test complete. Tests pass (bun test).",
      },
      toolContext,
    );
    const commitResult = JSON.parse(commitRaw as string) as { ok: boolean; terminal: boolean; status: string };

    expect(commitResult.ok).toBe(true);
    expect(commitResult.terminal).toBe(true);
    expect(commitResult.status).toBe("completed");
  });

  it('plugin exposes tool execute after hook for task child-session binding', async () => {
    const { createOpencodeClient: mkClient } = await import('@opencode-ai/sdk');
    const OPENCODE_CLIENT = mkClient({ baseUrl: 'http://localhost:1' }) as unknown as PluginInput['client'];

    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL('http://localhost:1'),
      project: { id: 'test', worktree: testRoot, time: { created: Date.now() } },
      client: OPENCODE_CLIENT,
      $: createStubShellForLoop(),
    };

    const hooks = await plugin(ctx);

    expect(hooks['tool.execute.after']).toBeDefined();
    expect(typeof hooks['tool.execute.after']).toBe('function');
  });

});
