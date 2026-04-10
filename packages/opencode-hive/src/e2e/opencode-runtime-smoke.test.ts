import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from 'node:child_process';
import { createServer } from "net";
import * as http from 'http';
import {
  createOpencodeClient,
  createOpencodeServer,
  type Config as OpencodeConfig,
} from "@opencode-ai/sdk";
import plugin from "../index";
import { buildCompactionPrompt } from "../utils/compaction-prompt.js";
import type { PluginInput } from "@opencode-ai/plugin";

const EXPECTED_TOOLS = [
  "hive_feature_create",
  "hive_plan_write",
  "hive_plan_read",
  "hive_tasks_sync",
  "hive_worktree_start",
  "hive_worktree_create",
] as const;

const RUNTIME_PROVIDER_ID = 'runtime-stub';
const RUNTIME_MODEL_ID = 'runtime-stub-model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error
    ? error.name === 'AbortError'
    : isRecord(error) && error.name === 'AbortError';
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

function hasOpencodeRuntime(): boolean {
  const result = spawnSync('opencode', ['--version'], {
    stdio: 'ignore',
  });

  return !result.error && result.status === 0;
}

function pickHivePluginEntry(): string {
  const distEntry = path.resolve(import.meta.dir, "..", "..", "dist", "index.js");
  if (fs.existsSync(distEntry)) return distEntry;

  const tsEntry = path.resolve(import.meta.dir, "..", "index.ts");
  if (fs.existsSync(tsEntry)) return tsEntry;

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

type ChatCompletionRequestMessage = {
  role?: unknown;
  tool_call_id?: unknown;
  content?: unknown;
  tool_calls?: unknown;
};

type ChatCompletionRequestBody = {
  model?: unknown;
  tools?: unknown;
  messages?: unknown;
};

type StubProviderServer = {
  baseUrl: string;
  close: () => Promise<void>;
  getRequestCount: () => number;
  getRequests: () => ChatCompletionRequestBody[];
};

function jsonResponse(body: unknown): string {
  return JSON.stringify(body);
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function startStubProviderServer(): Promise<StubProviderServer> {
  const port = await getFreePort();
  let requestCount = 0;
  const requests: ChatCompletionRequestBody[] = [];

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(404).end();
      return;
    }

    if (req.method === 'GET' && req.url === '/v1/models') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(jsonResponse({
        object: 'list',
        data: [{ id: RUNTIME_MODEL_ID, object: 'model' }],
      }));
      return;
    }

    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      requestCount += 1;
      const body = (await readJsonBody(req)) as ChatCompletionRequestBody;
      requests.push(body);
      const messages = Array.isArray((body as { messages?: unknown })?.messages)
        ? ((body as { messages: unknown[] }).messages as ChatCompletionRequestMessage[])
        : [];
      const hasToolResult = messages.some((message) => message.role === 'tool' && typeof message.tool_call_id === 'string');

      res.writeHead(200, { 'content-type': 'application/json' });

      if (!hasToolResult) {
        res.end(jsonResponse({
          id: 'chatcmpl-runtime-tool',
          object: 'chat.completion',
          created: 1,
          model: RUNTIME_MODEL_ID,
          choices: [
            {
              index: 0,
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: '',
                tool_calls: [
                  {
                    id: 'call_runtime_feature_create',
                    type: 'function',
                    function: {
                      name: 'hive_feature_create',
                      arguments: JSON.stringify({ name: 'rt-feature' }),
                    },
                  },
                ],
              },
            },
          ],
        }));
        return;
      }

      res.end(jsonResponse({
        id: 'chatcmpl-runtime-final',
        object: 'chat.completion',
        created: 2,
        model: RUNTIME_MODEL_ID,
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'rt-feature created. Planning mode is active.',
            },
          },
        ],
      }));
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(jsonResponse({ error: 'not found' }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    getRequestCount: () => requestCount,
    getRequests: () => requests,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

describe("e2e: OpenCode runtime loads opencode-hive", () => {
  it.skipIf(!hasOpencodeRuntime())("exposes hive tools via /experimental/tool/ids", async () => {
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
    const previousHome = process.env.HOME;
    const previousConfigDir = process.env.OPENCODE_CONFIG_DIR;
    const previousDisableDefault = process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS;

    process.chdir(projectDir);
    process.env.HOME = tmpBase;
    process.env.OPENCODE_CONFIG_DIR = path.join(projectDir, ".opencode");
    process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS = "true";

    const providerServer = await startStubProviderServer();
    const port = await getFreePort();

    const config: OpencodeConfig = {
      plugin: [],
      provider: {
        [RUNTIME_PROVIDER_ID]: {
          npm: '@ai-sdk/openai-compatible',
          name: 'Runtime stub provider',
          options: {
            apiKey: 'runtime-stub-key',
            baseURL: providerServer.baseUrl,
          },
          models: {
            [RUNTIME_MODEL_ID]: {
              name: 'Runtime stub model',
              tool_call: true,
            },
          },
        },
      },
    };

    let server: Awaited<ReturnType<typeof createOpencodeServer>> | null = null;
    server = await createOpencodeServer({
      hostname: "127.0.0.1",
      port,
      timeout: 20000,
      config,
    });
    expect(server).not.toBeNull();

    const client = createOpencodeClient({
      baseUrl: server.url,
      responseStyle: "data",
      throwOnError: true,
    });

    const abortController = new AbortController();

    async function approvePermissions(sessionID: string) {
      try {
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
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }
        throw error;
      }
    }

    try {
      const runtimeSuccess = {
        serverStarted: true,
        toolsLoaded: false,
        promptCompleted: false,
        promptReachedProvider: false,
      };

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
      runtimeSuccess.toolsLoaded = true;

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
      const promptTimer = setTimeout(() => promptAbort.abort(), 120000);
      let promptResult: unknown;
      try {
        promptResult = await client.session.prompt({
          path: { id: sessionID },
            query: { directory: projectDir },
            signal: promptAbort.signal,
            body: {
              model: {
                providerID: RUNTIME_PROVIDER_ID,
                modelID: RUNTIME_MODEL_ID,
              },
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
      } finally {
        clearTimeout(promptTimer);
      }

      runtimeSuccess.promptCompleted = true;

      const providerRequests = providerServer.getRequests();
      expect(providerServer.getRequestCount()).toBe(1);
      expect(providerRequests).toHaveLength(1);
      expect(providerRequests[0]).toMatchObject({
        model: RUNTIME_MODEL_ID,
        tools: expect.arrayContaining([
          expect.objectContaining({
            type: 'function',
            function: expect.objectContaining({
              name: 'hive_feature_create',
            }),
          }),
        ]),
      });

      const firstRequestMessages = Array.isArray(providerRequests[0]?.messages)
        ? (providerRequests[0].messages as ChatCompletionRequestMessage[])
        : [];
      expect(firstRequestMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringMatching(/Call the tool hive_feature_create exactly once/i),
          }),
          expect.objectContaining({
            role: 'user',
            content: 'Create a Hive feature named rt-feature.',
          }),
        ]),
      );
      runtimeSuccess.promptReachedProvider = true;

      const promptParts = Array.isArray((promptResult as { parts?: unknown }).parts)
        ? (promptResult as { parts: Array<Record<string, unknown>> }).parts
        : [];
      expect(promptParts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'step-start' }),
          expect.objectContaining({ type: 'step-finish' }),
        ]),
      );

      abortController.abort();
      await permissionTask.catch(() => undefined);

      expect(runtimeSuccess).toEqual({
        serverStarted: true,
        toolsLoaded: true,
        promptCompleted: true,
        promptReachedProvider: true,
      });
    } finally {
      abortController.abort();
      await server?.close();
      await providerServer.close();
      process.chdir(previousCwd);

      if (previousConfigDir === undefined) {
        delete process.env.OPENCODE_CONFIG_DIR;
      } else {
        process.env.OPENCODE_CONFIG_DIR = previousConfigDir;
      }

      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }

      if (previousDisableDefault === undefined) {
        delete process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS;
      } else {
        process.env.OPENCODE_DISABLE_DEFAULT_PLUGINS = previousDisableDefault;
      }

      safeRm(tmpBase);
    }
  }, 150000);
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

  it("does not expose the removed projected-todo field in hive_status", async () => {
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
    const status = JSON.parse(statusRaw as string) as Record<string, unknown>;

    expect(status).not.toHaveProperty(['todo', 'Projection'].join(''));
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

  it('plugin does not expose the removed post-tool hook', async () => {
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

    const removedPostToolHook = 'tool.execute' + '.after';
    expect(hooks[removedPostToolHook as keyof typeof hooks]).toBeUndefined();
  });

});
