import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { PluginInput } from "@opencode-ai/plugin";
import { createOpencodeClient } from "@opencode-ai/sdk";
import plugin from "../index";
import { BUILTIN_SKILLS } from "../skills/registry.generated.js";

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
  "background_task",
  "background_output",
  "background_cancel",
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
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, "project-"));
    process.env.HOME = testRoot;
    execSync("git init", { cwd: testRoot });
    execSync('git config user.email "test@example.com"', { cwd: testRoot });
    execSync('git config user.name "Test"', { cwd: testRoot });
    fs.writeFileSync(path.join(testRoot, "README.md"), "smoke test");
    execSync("git add README.md", { cwd: testRoot });
    execSync('git commit -m "init"', { cwd: testRoot });
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
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

    const execStartOutput = await hooks.tool!.hive_exec_start.execute(
      { feature: "smoke-feature", task: "01-first-task" },
      toolContext
    );
    const execStart = JSON.parse(execStartOutput as string) as {
      instructions?: string;
    };

    expect(execStart.instructions).toContain(
      "Wait for the completion notification (no polling required)."
    );
    expect(execStart.instructions).toContain(
      "Use hive_worker_status only for spot checks or diagnosing stuck tasks."
    );
    expect(execStart.instructions).toContain(
      "Use background_output only if interim output is explicitly needed, or after the completion notification arrives."
    );

    const statusOutput = await hooks.tool!.hive_worker_status.execute(
      { feature: "smoke-feature" },
      toolContext
    );
    const status = JSON.parse(statusOutput as string) as {
      hint?: string;
      summary?: { stuckWorkers?: number };
      workers?: Array<{
        activity?: {
          elapsedMs: number;
          elapsedFormatted: string;
          messageCount: number;
          lastActivityAgo: string;
          lastMessagePreview: string | null;
          maybeStuck: boolean;
        };
      }>;
    };

    expect(status.hint).toContain("Wait for the completion notification");
    expect(status.hint).toContain("spot checks");
    expect(status.workers?.length).toBeGreaterThan(0);

    const workerActivity = status.workers?.[0]?.activity;
    expect(workerActivity).toBeDefined();
    expect(typeof workerActivity?.elapsedMs).toBe("number");
    expect(typeof workerActivity?.elapsedFormatted).toBe("string");
    expect(typeof workerActivity?.messageCount).toBe("number");
    expect(typeof workerActivity?.lastActivityAgo).toBe("string");
    expect(typeof workerActivity?.maybeStuck).toBe("boolean");
    expect(
      workerActivity?.lastMessagePreview === null ||
        typeof workerActivity?.lastMessagePreview === "string"
    ).toBe(true);
    expect(typeof status.summary?.stuckWorkers).toBe("number");
  });

  it("system prompt hook injects Hive instructions", async () => {
    const configPath = path.join(process.env.HOME || "", ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agents: {
          "hive-master": {
            autoLoadSkills: ["brainstorming"],
          },
        },
      }),
    );
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
    output.system.push("## Base Agent Prompt");

    const joined = output.system.join("\n");
    expect(joined).toContain("## Hive - Feature Development System");
    expect(joined).toContain("hive_feature_create");
    
    // Verify auto-load skill injection: brainstorming skill content should be present
    const brainstormingSkill = BUILTIN_SKILLS.find((skill) => skill.name === "brainstorming");
    expect(brainstormingSkill).toBeDefined();
    expect(joined).toContain(brainstormingSkill!.template.slice(0, 50)); // Check first 50 chars of template
    
    // Verify ordering: HIVE_SYSTEM_PROMPT → autoLoad skills → status hint → base agent prompt
    const hiveSystemIndex = output.system.findIndex((entry) =>
      entry.includes("## Hive - Feature Development System"),
    );
    const brainstormingIndex = output.system.findIndex(
      (entry) => brainstormingSkill && entry.includes(brainstormingSkill.template.slice(0, 50)),
    );
    const statusHintIndex = output.system.findIndex((entry) =>
      entry.includes("### Current Hive Status"),
    );
    const agentPromptIndex = output.system.findIndex((entry) =>
      entry.includes("## Base Agent Prompt"),
    );

    expect(hiveSystemIndex).toBeGreaterThanOrEqual(0);
    expect(brainstormingIndex).toBeGreaterThan(hiveSystemIndex);
    expect(statusHintIndex).toBeGreaterThan(brainstormingIndex);
    expect(agentPromptIndex).toBeGreaterThan(statusHintIndex);
  });

  it("auto-loads onboarding only for planner agents", async () => {
    const configPath = path.join(process.env.HOME || "", ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agents: {
          "hive-master": {
            autoLoadSkills: ["onboarding"],
          },
          "architect-planner": {
            autoLoadSkills: ["onboarding"],
          },
          "forager-worker": {
            autoLoadSkills: ["onboarding", "test-driven-development"],
          },
        },
      }),
    );
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);

    const onboardingSnippet = "# Onboarding Preferences";

    const masterOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.(
      { agent: "hive-master" },
      masterOutput,
    );
    expect(masterOutput.system.join("\n")).toContain(onboardingSnippet);

    const architectOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.(
      { agent: "architect-planner" },
      architectOutput,
    );
    expect(architectOutput.system.join("\n")).toContain(onboardingSnippet);

    const foragerOutput = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.(
      { agent: "forager-worker" },
      foragerOutput,
    );
    expect(foragerOutput.system.join("\n")).not.toContain(onboardingSnippet);
  });
});
