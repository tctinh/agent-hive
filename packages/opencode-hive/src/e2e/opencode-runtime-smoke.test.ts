import { describe, it, expect } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { createServer } from "net";
import {
  createOpencodeClient,
  createOpencodeServer,
  type Config as OpencodeConfig,
} from "@opencode-ai/sdk";

const EXPECTED_TOOLS = [
  "hive_feature_create",
  "hive_plan_write",
  "hive_plan_read",
  "hive_tasks_sync",
  "hive_exec_start",
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
      logLevel: "ERROR",
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
      directory: projectDir,
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
