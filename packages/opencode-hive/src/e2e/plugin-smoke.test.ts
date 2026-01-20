import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import type { PluginInput } from "@opencode-ai/plugin";
import { createOpencodeClient } from "@opencode-ai/sdk";
import plugin from "../index";

const OPENCODE_CLIENT = createOpencodeClient({ baseUrl: "http://localhost:1" });

type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

const EXPECTED_TOOLS = [
  "hive_feature_create",
  "hive_feature_list",
  "hive_feature_complete",
  "hive_plan_write",
  "hive_plan_read",
  "hive_plan_approve",
  "hive_tasks_sync",
  "hive_task_create",
  "hive_task_update",
  "hive_exec_start",
  "hive_exec_complete",
  "hive_exec_abort",
  "hive_worker_status",
  "hive_merge",
  "hive_worktree_list",
  "hive_context_write",
  "hive_status",
  "hive_skill",
] as const;

const TEST_ROOT_BASE = "/tmp/hive-e2e-plugin";

function createStubShell(): PluginInput["$"] {
  let shell: PluginInput["$"];

  const fn = ((..._args: unknown[]) => {
    throw new Error("shell not available in this test");
  }) as unknown as PluginInput["$"];

  shell = Object.assign(fn, {
    braces(pattern: string) {
      return [pattern];
    },
    escape(input: string) {
      return input;
    },
    env() {
      return shell;
    },
    cwd() {
      return shell;
    },
    nothrow() {
      return shell;
    },
    throws() {
      return shell;
    },
  });

  return shell;
}

function createToolContext(sessionID: string): ToolContext {
  return {
    sessionID,
    messageID: "msg_test",
    agent: "test",
    abort: new AbortController().signal,
  };
}

function createProject(worktree: string): PluginInput["project"] {
  return {
    id: "test",
    worktree,
    time: { created: Date.now() },
  };
}

describe("e2e: opencode-hive plugin (in-process)", () => {
  let testRoot: string;

  beforeEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, "project-"));
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
  });

  it("registers expected tools and basic workflow works", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);

    expect(hooks.tool).toBeDefined();

    for (const toolName of EXPECTED_TOOLS) {
      expect(hooks.tool?.[toolName]).toBeDefined();
      expect(typeof hooks.tool?.[toolName].execute).toBe("function");
    }

    const sessionID = "sess_plugin_smoke";
    const toolContext = createToolContext(sessionID);

    const createOutput = await hooks.tool!.hive_feature_create.execute(
      { name: "smoke-feature" },
      toolContext
    );
    expect(createOutput).toContain('Feature "smoke-feature" created');

    const plan = `# Smoke Feature

## Discovery

**Q: Is this a test?**
A: Yes

## Overview

Test

## Tasks

### 1. First Task
Do it
`;
    const planOutput = await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "smoke-feature" },
      toolContext
    );
    expect(planOutput).toContain("Plan written");

    const approveOutput = await hooks.tool!.hive_plan_approve.execute({ feature: "smoke-feature" }, toolContext);
    expect(approveOutput).toContain("Plan approved");

    const syncOutput = await hooks.tool!.hive_tasks_sync.execute({ feature: "smoke-feature" }, toolContext);
    expect(syncOutput).toContain("Tasks synced");

    const taskFolder = path.join(
      testRoot,
      ".hive",
      "features",
      "smoke-feature",
      "tasks",
      "01-first-task"
    );

    expect(fs.existsSync(taskFolder)).toBe(true);

    // Session is tracked on the feature metadata
    const featureJsonPath = path.join(
      testRoot,
      ".hive",
      "features",
      "smoke-feature",
      "feature.json"
    );

    const featureJson = JSON.parse(fs.readFileSync(featureJsonPath, "utf-8")) as {
      sessionId?: string;
    };

    expect(featureJson.sessionId).toBe(sessionID);
  });

  it("system prompt hook injects Hive instructions", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);

    await hooks.tool!.hive_feature_create.execute({ name: "active" }, createToolContext("sess"));

    const output = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.({}, output);

    const joined = output.system.join("\n");
    expect(joined).toContain("## Hive - Feature Development System");
    expect(joined).toContain("hive_feature_create");
  });
});
