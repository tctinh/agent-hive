import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { PluginInput } from "@opencode-ai/plugin";
import { createOpencodeClient } from "@opencode-ai/sdk";
import plugin from "../index";
import { BUILTIN_SKILLS } from "../skills/registry.generated.js";

const OPENCODE_CLIENT = createOpencodeClient({ baseUrl: "http://localhost:1" }) as unknown as PluginInput["client"];
type PluginHooks = Awaited<ReturnType<typeof plugin>>;

type ToolContext = {
  sessionID: string;
  messageID: string;
  agent: string;
  abort: AbortSignal;
};

const EXPECTED_TOOLS = [
  "hive_feature_create",
  "hive_feature_complete",
  "hive_plan_write",
  "hive_plan_read",
  "hive_plan_approve",
  "hive_tasks_sync",
  "hive_task_create",
  "hive_task_update",
  "hive_worktree_start",
  "hive_worktree_create",
  "hive_worktree_commit",
  "hive_worktree_discard",
  "hive_merge",
  "hive_context_write",
  "hive_status",
  "hive_skill",
] as const;

const TEST_ROOT_BASE = "/tmp/hive-e2e-plugin";
const FIRST_TASK = "01-first-task";

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

function readHeadBody(targetPath: string): string {
  return execSync("git log -1 --format=%B", {
    cwd: targetPath,
    encoding: "utf-8",
  }).trimEnd();
}

function createSingleTaskPlan(title: string, answer: string): string {
  return `# ${title}

## Discovery

**Q: Is this a test?**
A: ${answer}

## Tasks

### 1. First Task
Do it
`;
}

async function createHooksForTest(testRoot: string, sessionID: string): Promise<{
  hooks: PluginHooks;
  toolContext: ToolContext;
}> {
  const ctx: PluginInput = {
    directory: testRoot,
    worktree: testRoot,
    serverUrl: new URL("http://localhost:1"),
    project: createProject(testRoot),
    client: OPENCODE_CLIENT,
    $: createStubShell(),
  };

  return {
    hooks: await plugin(ctx),
    toolContext: createToolContext(sessionID),
  };
}

async function createSingleTaskWorktree(
  testRoot: string,
  sessionID: string,
  feature: string,
  title: string,
  answer: string,
): Promise<{
  hooks: PluginHooks;
  toolContext: ToolContext;
  worktreePath: string;
}> {
  const { hooks, toolContext } = await createHooksForTest(testRoot, sessionID);

  await hooks.tool!.hive_feature_create.execute({ name: feature }, toolContext);
  await hooks.tool!.hive_plan_write.execute(
    { content: createSingleTaskPlan(title, answer), feature },
    toolContext,
  );
  await hooks.tool!.hive_plan_approve.execute({ feature }, toolContext);
  await hooks.tool!.hive_tasks_sync.execute({ feature }, toolContext);

  const worktreeRaw = await hooks.tool!.hive_worktree_start.execute(
    { feature, task: FIRST_TASK },
    toolContext,
  );
  const { worktreePath } = JSON.parse(worktreeRaw as string) as {
    worktreePath: string;
  };

  return { hooks, toolContext, worktreePath };
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
    expect(fs.existsSync(path.join(testRoot, '.hive', 'features', '01_smoke-feature'))).toBe(true);

    const plan = `# Smoke Feature

## Discovery

**Q: Is this a test?**
A: Yes, this is an integration test to validate the basic workflow of feature creation, plan writing, task sync, and worktree operations work correctly end-to-end in the plugin.

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
      "01_smoke-feature",
      "tasks",
      "01-first-task"
    );

    expect(fs.existsSync(taskFolder)).toBe(true);

    // Session is tracked on the feature metadata
    const featureJsonPath = path.join(
      testRoot,
      ".hive",
      "features",
      "01_smoke-feature",
      "feature.json"
    );

    const featureJson = JSON.parse(fs.readFileSync(featureJsonPath, "utf-8")) as {
      sessionId?: string;
    };

    expect(featureJson.sessionId).toBe(sessionID);

    const statusRaw = await hooks.tool!.hive_status.execute(
      { feature: "smoke-feature" },
      toolContext
    );
    const hiveStatus = JSON.parse(statusRaw as string) as {
      tasks?: {
        list?: Array<{
          folder: string;
          dependsOn?: string[] | null;
          worktree?: { branch: string; hasChanges: boolean | null } | null;
        }>;
        runnable?: string[];
        blockedBy?: Record<string, string[]>;
      };
    };

    expect(hiveStatus.tasks?.list?.[0]?.folder).toBe("01-first-task");
    expect(hiveStatus.tasks?.list?.[0]?.dependsOn).toEqual([]);
    expect(hiveStatus.tasks?.list?.[0]?.worktree).toBeNull();
    expect(hiveStatus.tasks?.runnable).toContain("01-first-task");
    expect(hiveStatus.tasks?.blockedBy).toEqual({});

    const execStartOutput = await hooks.tool!.hive_worktree_start.execute(
      { feature: "smoke-feature", task: "01-first-task" },
      toolContext
    );
    const execStart = JSON.parse(execStartOutput as string) as {
      instructions?: string;
      backgroundTaskCall?: Record<string, unknown>;
    };
    expect(execStart.backgroundTaskCall).toBeUndefined();

    const specPath = path.join(
      testRoot,
      ".hive",
      "features",
      "01_smoke-feature",
      "tasks",
      "01-first-task",
      "spec.md"
    );
    const specContent = fs.readFileSync(specPath, "utf-8");
    expect(specContent).toContain("## Dependencies");

    const statusOutput = await hooks.tool!.hive_status.execute(
      { feature: "smoke-feature" },
      toolContext
    );
    const status = JSON.parse(statusOutput as string) as {
      tasks?: {
        list?: Array<{ folder: string }>;
      };
    };
    expect(status.tasks?.list?.[0]?.folder).toBe("01-first-task");
  });

  it("writes logical active-feature names and status fallback prefers the shared pointer", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_active_feature_pointer");

    await hooks.tool!.hive_feature_create.execute(
      { name: "zeta-feature" },
      toolContext
    );

    expect(
      fs.readFileSync(path.join(testRoot, ".hive", "active-feature"), "utf-8")
    ).toBe("zeta-feature");

    await hooks.tool!.hive_feature_create.execute(
      { name: "alpha-feature" },
      toolContext
    );

    expect(
      fs.readFileSync(path.join(testRoot, ".hive", "active-feature"), "utf-8")
    ).toBe("alpha-feature");

    const statusRaw = await hooks.tool!.hive_status.execute({}, toolContext);
    const status = JSON.parse(statusRaw as string) as {
      feature?: { name?: string };
    };

    expect(status.feature?.name).toBe("alpha-feature");

    await hooks.tool!.hive_feature_complete.execute(
      { name: "alpha-feature" },
      toolContext
    );

    const fallbackStatusRaw = await hooks.tool!.hive_status.execute({}, toolContext);
    const fallbackStatus = JSON.parse(fallbackStatusRaw as string) as {
      feature?: { name?: string };
    };

    expect(fallbackStatus.feature?.name).toBe("zeta-feature");
  });

  it("returns task tool call using @file prompt", async () => {

    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_task_mode");

    await hooks.tool!.hive_feature_create.execute(
      { name: "task-mode-feature" },
      toolContext
    );

    const plan = `# Task Mode Feature

## Discovery

**Q: Is this a test?**
A: Yes, this is an integration test to validate task mode with @file prompts. Testing that worker prompt files are correctly generated and used.

## Overview

Test

## Tasks

### 1. First Task
Do it
`;
    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "task-mode-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "task-mode-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "task-mode-feature" },
      toolContext
    );

    const execStartOutput = await hooks.tool!.hive_worktree_start.execute(
      { feature: "task-mode-feature", task: "01-first-task" },
      toolContext
    );
    const execStart = JSON.parse(execStartOutput as string) as {
      defaultAgent?: string;
      eligibleAgents?: Array<{
        name: string;
        baseAgent: string;
        description: string;
      }>;
      instructions?: string;
      taskToolCall?: {
        subagent_type?: string;
        description?: string;
        prompt?: string;
      };
    };

    const expectedPromptPath = path.posix.join(
      ".hive",
      "features",
      "01_task-mode-feature",
      "tasks",
      "01-first-task",
      "worker-prompt.md"
    );

    expect(execStart.taskToolCall).toBeDefined();
    expect(execStart.defaultAgent).toBe("forager-worker");
    expect(execStart.eligibleAgents).toEqual([
      {
        name: "forager-worker",
        baseAgent: "forager-worker",
        description: "Default implementation worker",
      },
      {
        name: "forager-example-template",
        baseAgent: "forager-worker",
        description: "Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.",
      },
    ]);
    expect(execStart.taskToolCall?.subagent_type).toBeDefined();
    expect(execStart.taskToolCall?.description).toBe("Hive: 01-first-task");
    expect(execStart.taskToolCall?.prompt).toContain(`@${expectedPromptPath}`);
    expect(execStart.instructions).toContain("task({");
    expect(execStart.instructions).toContain(
      "prompt: \"Follow instructions in @.hive/features/01_task-mode-feature/tasks/01-first-task/worker-prompt.md\""
    );
    expect(execStart.instructions).toContain(
      "Use the `@path` attachment syntax in the prompt to reference the file. Do not inline the file contents."
    );
    expect(execStart.instructions).not.toContain("Read the prompt file");
  });

  it("excludes non-execution context from worker prompt payloads", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_reserved_overview");

    await hooks.tool!.hive_feature_create.execute(
      { name: "reserved-overview-feature" },
      toolContext
    );

    const plan = `# Reserved Overview Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test validates that reserved overview context stays human-facing and is excluded from worker execution payloads.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "reserved-overview-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "reserved-overview-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "reserved-overview-feature" },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "reserved-overview-feature",
        name: "overview",
        content: "Human-facing overview that must stay out of worker execution context.",
      },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "reserved-overview-feature",
        name: "draft",
        content: "Scratchpad draft that must stay out of worker execution context.",
      },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "reserved-overview-feature",
        name: "execution-decisions",
        content: "Operational decision that must stay out of worker execution context.",
      },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "reserved-overview-feature",
        name: "decisions",
        content: "Technical decision that workers should receive.",
      },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "reserved-overview-feature",
        name: "learnings",
        content: "Durable learning that workers should receive.",
      },
      toolContext
    );

    const raw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "reserved-overview-feature", task: "01-first-task" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      worktreePath?: string;
    };

    expect(result.worktreePath).toBeDefined();

    const specPath = path.join(
      testRoot,
      ".hive",
      "features",
      "01_reserved-overview-feature",
      "tasks",
      "01-first-task",
      "spec.md"
    );
    const workerPromptPath = path.join(
      testRoot,
      ".hive",
      "features",
      "01_reserved-overview-feature",
      "tasks",
      "01-first-task",
      "worker-prompt.md"
    );

    const specContent = fs.readFileSync(specPath, "utf-8");
    const workerPromptContent = fs.readFileSync(workerPromptPath, "utf-8");

    expect(specContent).toContain("## decisions");
    expect(specContent).toContain("Technical decision that workers should receive.");
    expect(specContent).toContain("## learnings");
    expect(specContent).toContain("Durable learning that workers should receive.");
    expect(specContent).not.toContain("## overview");
    expect(specContent).not.toContain("Human-facing overview that must stay out of worker execution context.");
    expect(specContent).not.toContain("## draft");
    expect(specContent).not.toContain("Scratchpad draft that must stay out of worker execution context.");
    expect(specContent).not.toContain("## execution-decisions");
    expect(specContent).not.toContain("Operational decision that must stay out of worker execution context.");
    expect(workerPromptContent).toContain("Technical decision that workers should receive.");
    expect(workerPromptContent).toContain("Durable learning that workers should receive.");
    expect(workerPromptContent).not.toContain("Human-facing overview that must stay out of worker execution context.");
    expect(workerPromptContent).not.toContain("Scratchpad draft that must stay out of worker execution context.");
    expect(workerPromptContent).not.toContain("Operational decision that must stay out of worker execution context.");
  });

  it("returns forager-derived eligible agents for worktree execution delegation", async () => {
    const configPath = path.join(process.env.HOME || "", ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        customAgents: {
          "forager-ui": {
            baseAgent: "forager-worker",
            description: "Use for UI-heavy implementation tasks.",
            autoLoadSkills: [],
          },
          "reviewer-security": {
            baseAgent: "hygienic-reviewer",
            description: "Use for security-focused review passes.",
            autoLoadSkills: [],
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
    const toolContext = createToolContext("sess_task_mode_custom_agents");

    await hooks.tool!.hive_feature_create.execute(
      { name: "task-mode-custom-agents-feature" },
      toolContext
    );

    const plan = `# Task Mode Custom Agents Feature

## Discovery

**Q: Is this a test?**
A: Yes, this is an integration test to validate eligible forager-derived worker options and default fallback behavior in hive_worktree_start.

## Overview

Test

## Tasks

### 1. First Task
Do it
`;
    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "task-mode-custom-agents-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "task-mode-custom-agents-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "task-mode-custom-agents-feature" },
      toolContext
    );

    const execStartOutput = await hooks.tool!.hive_worktree_start.execute(
      { feature: "task-mode-custom-agents-feature", task: "01-first-task" },
      toolContext
    );
    const execStart = JSON.parse(execStartOutput as string) as {
      defaultAgent?: string;
      eligibleAgents?: Array<{
        name: string;
        baseAgent: string;
        description: string;
      }>;
      instructions?: string;
      taskToolCall?: {
        subagent_type?: string;
      };
    };

    expect(execStart.defaultAgent).toBe("forager-worker");
    expect(execStart.eligibleAgents).toEqual([
      {
        name: "forager-worker",
        baseAgent: "forager-worker",
        description: "Default implementation worker",
      },
      {
        name: "forager-example-template",
        baseAgent: "forager-worker",
        description: "Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.",
      },
      {
        name: "forager-ui",
        baseAgent: "forager-worker",
        description: "Use for UI-heavy implementation tasks.",
      },
    ]);
    expect(execStart.eligibleAgents?.find((agent) => agent.name === "reviewer-security")).toBeUndefined();
    expect(execStart.instructions).toContain("Choose one of the eligible forager-derived agents below.");
    expect(execStart.instructions).toContain("Default to `forager-worker` if no specialist is a better match.");
    expect(execStart.instructions).toContain("`taskToolCall.subagent_type` is prefilled with the default for convenience");
    expect(execStart.instructions).toContain("`forager-ui` — Use for UI-heavy implementation tasks.");
    expect(execStart.taskToolCall?.subagent_type).toBe("forager-worker");
  });

  it("returns structured JSON when hive_worktree_create is called without a feature", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_missing_feature");

    const raw = await hooks.tool!.hive_worktree_create.execute(
      { task: "01-missing-task" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      error?: string;
      hints?: string[];
    };

    expect(result.success).toBe(false);
    expect(result.terminal).toBe(true);
    expect(result.error).toContain("No feature specified");
    expect(Array.isArray(result.hints)).toBe(true);
  });

  it("returns structured JSON when hive_worktree_create task is missing", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_missing_task");

    await hooks.tool!.hive_feature_create.execute(
      { name: "missing-task-feature" },
      toolContext
    );

    const raw = await hooks.tool!.hive_worktree_create.execute(
      { feature: "missing-task-feature", task: "99-nope" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      error?: string;
      hints?: string[];
    };

    expect(result.success).toBe(false);
    expect(result.terminal).toBe(true);
    expect(result.error).toContain('Task "99-nope" not found');
    expect(Array.isArray(result.hints)).toBe(true);
  });

  it("returns structured JSON when hive_worktree_create feature is blocked", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_blocked_feature");

    await hooks.tool!.hive_feature_create.execute(
      { name: "blocked-feature" },
      toolContext
    );

    const blockedPath = path.join(
      testRoot,
      ".hive",
      "features",
      "01_blocked-feature",
      "BLOCKED"
    );
    fs.writeFileSync(blockedPath, "Need approval from Beekeeper.");

    const raw = await hooks.tool!.hive_worktree_create.execute(
      { feature: "blocked-feature", task: "01-first-task" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      error?: string;
      hints?: string[];
    };

    expect(result.success).toBe(false);
    expect(result.terminal).toBe(true);
    expect(result.error).toContain("BLOCKED by Beekeeper");
    expect(Array.isArray(result.hints)).toBe(true);
  });

  it("returns structured JSON when hive_status feature is blocked", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_blocked_status");

    await hooks.tool!.hive_feature_create.execute(
      { name: "blocked-status-feature" },
      toolContext
    );

    const plan = `# Blocked Status Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test validates that hive_status returns terminal JSON instead of plain text when a feature is blocked.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "blocked-status-feature" },
      toolContext
    );

    await hooks.tool!.hive_context_write.execute(
      {
        feature: "blocked-status-feature",
        name: "BLOCKED",
        content: "Need approval from Beekeeper.",
      },
      toolContext
    );

    const blockedPath = path.join(
      testRoot,
      ".hive",
      "features",
      "01_blocked-status-feature",
      "BLOCKED"
    );
    const blockedContextPath = path.join(
      testRoot,
      ".hive",
      "features",
      "01_blocked-status-feature",
      "context",
      "BLOCKED.md"
    );
    fs.copyFileSync(blockedContextPath, blockedPath);

    const raw = await hooks.tool!.hive_status.execute(
      { feature: "blocked-status-feature" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      blocked?: boolean;
      error?: string;
      hints?: string[];
    };

    expect(result.success).toBe(false);
    expect(result.terminal).toBe(true);
    expect(result.blocked).toBe(true);
    expect(result.error).toContain("BLOCKED by Beekeeper");
    expect(Array.isArray(result.hints)).toBe(true);
    expect(result.hints?.length).toBeGreaterThan(0);
  });

  it("returns structured terminal JSON when hive_status has no active feature", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_status_no_feature");

    const raw = await hooks.tool!.hive_status.execute({}, toolContext);

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      reason?: string;
      error?: string;
    };

    expect(result.success).toBe(false);
    expect(result.terminal).toBe(true);
    expect(result.reason).toBe("feature_required");
    expect(result.error).toContain("No feature specified");
  });

  it("returns structured terminal JSON when hive_status feature is missing", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_status_missing_feature");

    const raw = await hooks.tool!.hive_status.execute(
      { feature: "does-not-exist" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      reason?: string;
      error?: string;
      availableFeatures?: unknown[];
    };

    expect(result.success).toBe(false);
    expect(result.terminal).toBe(true);
    expect(result.reason).toBe("feature_not_found");
    expect(result.error).toContain("Feature 'does-not-exist' not found");
    expect(Array.isArray(result.availableFeatures)).toBe(true);
  });

  it("reports context handling metadata in hive_status", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_overview_status");

    await hooks.tool!.hive_feature_create.execute(
      { name: "overview-status-feature" },
      toolContext
    );

    const plan = `# Overview Status Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test validates that hive_status exposes reserved overview metadata and document-aware review counts.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "overview-status-feature" },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "overview-status-feature",
        name: "overview",
        content: "# Overview\nHuman-facing summary",
      },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "overview-status-feature",
        name: "draft",
        content: "# Draft\nScratchpad summary",
      },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "overview-status-feature",
        name: "execution-decisions",
        content: "# Execution Decisions\nOperational summary",
      },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "overview-status-feature",
        name: "learnings",
        content: "# Learnings\nDurable summary",
      },
      toolContext
    );

    fs.mkdirSync(
      path.join(testRoot, ".hive", "features", "01_overview-status-feature", "comments"),
      { recursive: true }
    );
    fs.writeFileSync(
      path.join(testRoot, ".hive", "features", "01_overview-status-feature", "comments", "plan.json"),
      JSON.stringify({
        threads: [{ id: "plan-thread", line: 1, body: "Plan review", replies: [] }],
      }, null, 2)
    );
    fs.writeFileSync(
      path.join(testRoot, ".hive", "features", "01_overview-status-feature", "comments", "overview.json"),
      JSON.stringify({
        threads: [{ id: "overview-thread", line: 2, body: "Overview review", replies: [] }],
      }, null, 2)
    );

    const raw = await hooks.tool!.hive_status.execute(
      { feature: "overview-status-feature" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      overview?: {
        exists: boolean;
        path: string;
        updatedAt?: string;
      };
      review?: {
        unresolvedTotal: number;
        byDocument: {
          plan: number;
          overview: number;
        };
      };
      context?: {
        files: Array<{
          name: string;
          role: string;
          includeInExecution: boolean;
          includeInAgentsMdSync: boolean;
        }>;
      };
    };

    expect(result.overview).toMatchObject({
      exists: true,
      path: ".hive/features/overview-status-feature/context/overview.md",
    });
    expect(typeof result.overview?.updatedAt).toBe("string");
    expect(result.review).toEqual({
      unresolvedTotal: 2,
      byDocument: {
        plan: 1,
        overview: 1,
      },
    });
    expect(result.context?.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "draft",
          role: "scratchpad",
          includeInExecution: false,
          includeInAgentsMdSync: false,
        }),
        expect.objectContaining({
          name: "execution-decisions",
          role: "operational",
          includeInExecution: false,
          includeInAgentsMdSync: false,
        }),
        expect.objectContaining({
          name: "learnings",
          role: "durable",
          includeInExecution: true,
          includeInAgentsMdSync: true,
        }),
        expect.objectContaining({
          name: "overview",
          role: "human",
          includeInExecution: false,
          includeInAgentsMdSync: false,
        }),
      ])
    );
  });

  it("keeps plan tool messaging overview-first while plan.md remains execution truth", async () => {
    const { hooks, toolContext } = await createHooksForTest(
      testRoot,
      'sess_overview_first_plan_messaging'
    );

    await hooks.tool!.hive_feature_create.execute(
      { name: 'overview-first-plan-feature' },
      toolContext
    );

    const planOutput = await hooks.tool!.hive_plan_write.execute(
      {
        content: createSingleTaskPlan(
          'Overview First Plan Feature',
          'Yes, this regression test validates that plan write and approve messaging point reviewers to context/overview.md first while keeping plan.md as execution truth.'
        ),
        feature: 'overview-first-plan-feature',
      },
      toolContext
    );

    const approveOutput = await hooks.tool!.hive_plan_approve.execute(
      { feature: 'overview-first-plan-feature' },
      toolContext
    );

    expect(planOutput).toContain('Review context/overview.md first');
    expect(planOutput).toContain('plan.md remains execution truth');
    expect(planOutput).not.toContain('plan.md is the human-facing');
    expect(approveOutput).toContain('context/overview.md is the primary human-facing surface');
    expect(approveOutput).toContain('plan.md remains execution truth');
    expect(approveOutput).not.toContain('plan.md is the primary human-facing');
  });

  it("guides planners to overview-first status messaging", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_overview_guidance");

    await hooks.tool!.hive_feature_create.execute(
      { name: "overview-guidance-feature" },
      toolContext
    );

    const plan = `# Overview Guidance Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test validates that plan messaging and hive_status guidance explicitly direct planners to maintain the reserved overview via hive_context_write.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "overview-guidance-feature" },
      toolContext
    );
    const approveOutput = await hooks.tool!.hive_plan_approve.execute(
      { feature: "overview-guidance-feature" },
      toolContext
    );
    expect(approveOutput).toContain('Plan approved');

    const statusRaw = await hooks.tool!.hive_status.execute(
      { feature: "overview-guidance-feature" },
      toolContext
    );
    const status = JSON.parse(statusRaw as string) as { nextAction?: string };
    expect(status.nextAction).toBe('Generate tasks from plan with hive_tasks_sync');

    const draftFeature = 'draft-overview-guidance-feature';
    await hooks.tool!.hive_feature_create.execute(
      { name: draftFeature },
      createToolContext('sess_overview_guidance_draft')
    );

    const draftStatusRaw = await hooks.tool!.hive_status.execute(
      { feature: draftFeature },
      toolContext
    );
    const draftStatus = JSON.parse(draftStatusRaw as string) as { nextAction?: string };

    expect(draftStatus.nextAction).toBe(
      'Write or revise plan with hive_plan_write. Refresh context/overview.md first for human review; plan.md remains execution truth and pre-task Mermaid overview diagrams are optional.'
    );
  });

  it("blocks plan approval when overview review comments remain", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_overview_approval_blocked");

    await hooks.tool!.hive_feature_create.execute(
      { name: "overview-approval-blocked-feature" },
      toolContext
    );

    const plan = `# Overview Approval Blocked Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test proves approval must report unresolved overview review comments before execution can proceed.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "overview-approval-blocked-feature" },
      toolContext
    );
    await hooks.tool!.hive_context_write.execute(
      {
        feature: "overview-approval-blocked-feature",
        name: "overview",
        content: "# Overview\n",
      },
      toolContext
    );

    fs.mkdirSync(
      path.join(testRoot, ".hive", "features", "01_overview-approval-blocked-feature", "comments"),
      { recursive: true }
    );
    fs.writeFileSync(
      path.join(testRoot, ".hive", "features", "01_overview-approval-blocked-feature", "comments", "overview.json"),
      JSON.stringify({
        threads: [{ id: "overview-thread", line: 1, body: "Need clearer overview", replies: [] }],
      }, null, 2)
    );

    const approveOutput = await hooks.tool!.hive_plan_approve.execute(
      { feature: "overview-approval-blocked-feature" },
      toolContext
    );

    expect(approveOutput).toContain("Cannot approve");
    expect(approveOutput).toContain("overview");
  });

  it("returns explicit success and non-terminal contract fields on worktree start", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_success_contract");

    await hooks.tool!.hive_feature_create.execute(
      { name: "success-contract-feature" },
      toolContext
    );

    const plan = `# Success Contract Feature

## Discovery

**Q: Is this a test?**
A: Yes, this test validates that successful hive_worktree_start responses include explicit success and terminal contract fields for machine-readable orchestration.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "success-contract-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "success-contract-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "success-contract-feature" },
      toolContext
    );

    const raw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "success-contract-feature", task: "01-first-task" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      worktreePath?: string;
      taskToolCall?: { prompt?: string };
    };

    expect(result.success).toBe(true);
    expect(result.terminal).toBe(false);
    expect(result.worktreePath).toBeDefined();
    expect(result.taskToolCall?.prompt).toContain("worker-prompt.md");
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
        customAgents: {
          "forager-ui": {
            baseAgent: "forager-worker",
            description: "Use for UI-heavy implementation tasks.",
            autoLoadSkills: [],
          },
          "reviewer-security": {
            baseAgent: "hygienic-reviewer",
            description: "Use for security-focused review passes.",
            autoLoadSkills: [],
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

    // system.transform should still inject HIVE_SYSTEM_PROMPT and status hint
    const output = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.({ agent: "hive-master" }, output);
    output.system.push("## Base Agent Prompt");

    const joined = output.system.join("\n");
    expect(joined).toContain("## Hive — Active Session");
    expect(joined).not.toContain("Use hive_status to check feature state before starting work");
    expect(joined).not.toContain("Use hive_plan_read to see plan comments");
    
    // Auto-loaded skills are now injected via config hook (prompt field), NOT system.transform
    // Verify by checking the agent's prompt field in config
    const opencodeConfig: Record<string, unknown> = { agent: {} };
    await hooks.config!(opencodeConfig);
    
    const agentConfig = (opencodeConfig.agent as Record<string, { prompt?: string }>)["hive-master"];
    expect(agentConfig).toBeDefined();
    expect(agentConfig.prompt).toBeDefined();
    
    const brainstormingSkill = BUILTIN_SKILLS.find((skill) => skill.name === "brainstorming");
    expect(brainstormingSkill).toBeDefined();
    expect(agentConfig.prompt).toContain(brainstormingSkill!.template);
    expect(agentConfig.prompt).toContain("Configured Custom Subagents");
    expect(agentConfig.prompt).toContain("`reviewer-security`");
    expect(agentConfig.prompt).toContain("default to built-in `hygienic-reviewer`");
    expect(agentConfig.prompt).toContain("Configured Custom Subagents` is a better match");
    expect(agentConfig.prompt).toContain("task({ subagent_type: \"<chosen-reviewer>\"");

    const agents = opencodeConfig.agent as Record<string, unknown>;
    expect(agents["forager-worker"]).toBeDefined();
    expect(agents["hygienic-reviewer"]).toBeDefined();
    expect(agents["forager-ui"]).toBeDefined();
    expect(agents["reviewer-security"]).toBeDefined();
    
    // Verify status hint is in system.transform (this is still there)
    expect(joined).toContain("### Current Hive Status");
  });

  it("blocks hive_worktree_create when dependencies are not done", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_dependency_block");

    await hooks.tool!.hive_feature_create.execute(
      { name: "dep-block-feature" },
      toolContext
    );

    const plan = `# Dep Block Feature

## Discovery

**Q: Is this a test?**
A: Yes, this integration test validates dependency blocking. Testing that task 2 cannot start until task 1 completes, ensuring proper dependency enforcement.

## Overview

Test

## Tasks

### 1. First Task
Do it

### 2. Second Task

**Depends on**: 1

Do it later
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "dep-block-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "dep-block-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "dep-block-feature" },
      toolContext
    );

    const execStartOutput = await hooks.tool!.hive_worktree_start.execute(
      { feature: "dep-block-feature", task: "02-second-task" },
      toolContext
    );

    const execStart = JSON.parse(execStartOutput as string) as {
      success?: boolean;
      terminal?: boolean;
      reason?: string;
      error?: string;
    };

    expect(execStart.success).toBe(false);
    expect(execStart.terminal).toBe(true);
    expect(execStart.reason).toBe("dependencies_not_done");
    expect(execStart.error).toContain("dependencies not done");
  });

  it("returns terminal JSON when blocked resume is retried from in_progress", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_invalid_blocked_retry");

    await hooks.tool!.hive_feature_create.execute(
      { name: "invalid-blocked-retry-feature" },
      toolContext
    );

    const plan = `# Invalid Blocked Retry Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test validates that retrying continueFrom:'blocked' while a task is still in_progress returns terminal guidance instead of re-entering the blocked resume flow.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "invalid-blocked-retry-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "invalid-blocked-retry-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "invalid-blocked-retry-feature" },
      toolContext
    );

    await hooks.tool!.hive_worktree_start.execute(
      { feature: "invalid-blocked-retry-feature", task: "01-first-task" },
      toolContext
    );

    const statusRaw = await hooks.tool!.hive_status.execute(
      { feature: "invalid-blocked-retry-feature" },
      toolContext
    );
    const status = JSON.parse(statusRaw as string) as {
      tasks?: {
        list?: Array<{ folder: string; status: string }>;
      };
    };

    const taskStatus = status.tasks?.list?.find(
      (task) => task.folder === "01-first-task"
    );
    expect(taskStatus?.status).toBe("in_progress");

    const invalidRetryRaw = await hooks.tool!.hive_worktree_create.execute(
      {
        feature: "invalid-blocked-retry-feature",
        task: "01-first-task",
        continueFrom: "blocked",
        decision: "Retry with the same approach.",
      },
      toolContext
    );

    const invalidRetry = JSON.parse(invalidRetryRaw as string) as {
      success?: boolean;
      terminal?: boolean;
      currentStatus?: string;
      hints?: string[];
    };

    expect(invalidRetry.success).toBe(false);
    expect(invalidRetry.terminal).toBe(true);
    expect(invalidRetry.currentStatus).toBe("in_progress");
    expect(Array.isArray(invalidRetry.hints)).toBe(true);
    expect(invalidRetry.hints?.length).toBeGreaterThan(0);
    expect(invalidRetry.hints?.some((hint) => /start|resume/i.test(hint))).toBe(true);
    expect(invalidRetry.hints?.some((hint) => /hive_status|status/i.test(hint))).toBe(true);
  });

  it("starts a pending task with hive_worktree_start without continueFrom", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_pending_start");

    await hooks.tool!.hive_feature_create.execute(
      { name: "pending-start-feature" },
      toolContext
    );

    const plan = `# Pending Start Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test validates that pending tasks can start via hive_worktree_start without a continueFrom flag.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "pending-start-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "pending-start-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "pending-start-feature" },
      toolContext
    );

    const raw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "pending-start-feature", task: "01-first-task" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      terminal?: boolean;
      worktreePath?: string;
    };

    expect(result.success).toBe(true);
    expect(result.terminal).toBe(false);
    expect(result.worktreePath).toBeDefined();
  });

  it("returns terminal JSON with advisory note when verification evidence is missing", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_commit_gate");

    await hooks.tool!.hive_feature_create.execute(
      { name: "commit-gate-feature" },
      toolContext
    );

    const plan = `# Commit Gate Feature

## Discovery

**Q: Is this a test?**
A: Yes, this test validates non-terminal completion responses when verification evidence is missing from summary.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "commit-gate-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "commit-gate-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "commit-gate-feature" },
      toolContext
    );

    await hooks.tool!.hive_worktree_start.execute(
      { feature: "commit-gate-feature", task: "01-first-task" },
      toolContext
    );

    const commitRaw = await hooks.tool!.hive_worktree_commit.execute(
      {
        feature: "commit-gate-feature",
        task: "01-first-task",
        status: "completed",
        summary: "Implemented feature changes.",
      },
      toolContext
    );

    const commitResult = JSON.parse(commitRaw as string) as {
      ok: boolean;
      terminal: boolean;
      status: string;
      taskState?: string;
      verificationNote?: string;
      nextAction?: string;
    };

    expect(commitResult.ok).toBe(true);
    expect(commitResult.terminal).toBe(true);
    expect(commitResult.status).toBe("completed");
    expect(commitResult.taskState).toBe("done");
    expect(commitResult.verificationNote).toContain("No verification evidence in summary");
    expect(commitResult.nextAction).toContain("hive_merge");
  });

  it("returns terminal JSON response when commit completes", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_commit_success");

    await hooks.tool!.hive_feature_create.execute(
      { name: "commit-success-feature" },
      toolContext
    );

    const plan = `# Commit Success Feature

## Discovery

**Q: Is this a test?**
A: Yes, this test validates terminal completion responses when commit succeeds.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "commit-success-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "commit-success-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "commit-success-feature" },
      toolContext
    );

    const worktreeRaw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "commit-success-feature", task: "01-first-task" },
      toolContext
    );
    const worktreeResult = JSON.parse(worktreeRaw as string) as {
      worktreePath?: string;
    };

    expect(worktreeResult.worktreePath).toBeDefined();
    const worktreePath = worktreeResult.worktreePath!;
    fs.writeFileSync(path.join(worktreePath, "task-note.txt"), "commit test\n");

    const commitRaw = await hooks.tool!.hive_worktree_commit.execute(
      {
        feature: "commit-success-feature",
        task: "01-first-task",
        status: "completed",
        summary: "Added task note file. Tests pass (bun test). Build succeeds (bun run build).",
      },
      toolContext
    );

    const commitResult = JSON.parse(commitRaw as string) as {
      ok: boolean;
      terminal: boolean;
      status: string;
      taskState?: string;
      commit?: { sha?: string };
      nextAction?: string;
    };

    expect(commitResult.ok).toBe(true);
    expect(commitResult.terminal).toBe(true);
    expect(commitResult.status).toBe("completed");
    expect(commitResult.taskState).toBe("done");
    expect(commitResult.commit?.sha).toBeDefined();
    expect(commitResult.nextAction).toContain("hive_merge");
  });

  it("uses custom commit message in task worktree head", async () => {
    const feature = "commit-custom-message-feature";
    const { hooks, toolContext, worktreePath } = await createSingleTaskWorktree(
      testRoot,
      "sess_commit_custom_message",
      feature,
      "Commit Custom Message Feature",
      "Yes, this test validates custom commit message passthrough from the OpenCode tool layer.",
    );

    fs.writeFileSync(path.join(worktreePath, "task-note.txt"), "commit custom message test\n");

    const customMessage = "feat(plugin): custom commit subject\n\ncustom body";
    const commitRaw = await hooks.tool!.hive_worktree_commit.execute(
      {
        feature,
        task: FIRST_TASK,
        status: "completed",
        summary: "Added task note. Tests pass (bun test).",
        message: customMessage,
      },
      toolContext
    );

    const commitResult = JSON.parse(commitRaw as string) as {
      ok: boolean;
      terminal: boolean;
      status: string;
      commit?: { message?: string };
    };

    expect(commitResult.ok).toBe(true);
    expect(commitResult.terminal).toBe(true);
    expect(commitResult.status).toBe("completed");
    expect(commitResult.commit?.message).toBe(customMessage);
    expect(readHeadBody(worktreePath)).toBe(customMessage);
  });

  it("falls back when hive_worktree_commit message is empty string", async () => {
    const feature = "commit-empty-message-feature";
    const { hooks, toolContext, worktreePath } = await createSingleTaskWorktree(
      testRoot,
      "sess_commit_empty_message",
      feature,
      "Commit Empty Message Feature",
      "Yes, this test validates empty-string message fallback in hive_worktree_commit.",
    );

    fs.writeFileSync(path.join(worktreePath, "task-note.txt"), "empty message fallback\n");

    const summary = "Added fallback check for empty message. Tests pass (bun test).";
    const expectedMessage = `hive(${FIRST_TASK}): ${summary.slice(0, 50)}`;

    const commitRaw = await hooks.tool!.hive_worktree_commit.execute(
      {
        feature,
        task: FIRST_TASK,
        status: "completed",
        summary,
        message: "",
      },
      toolContext
    );

    const commitResult = JSON.parse(commitRaw as string) as {
      ok: boolean;
      terminal: boolean;
      status: string;
      commit?: { message?: string };
    };

    expect(commitResult.ok).toBe(true);
    expect(commitResult.terminal).toBe(true);
    expect(commitResult.status).toBe("completed");
    expect(commitResult.commit?.message).toBe(expectedMessage);
    expect(readHeadBody(worktreePath)).toBe(expectedMessage);
  });

  it("returns helper-friendly merge JSON for merge strategy", async () => {
    const feature = "merge-custom-message-feature";
    const { hooks, toolContext, worktreePath } = await createSingleTaskWorktree(
      testRoot,
      "sess_merge_custom_message",
      feature,
      "Merge Custom Message Feature",
      "Yes, this test validates custom merge commit message passthrough for the merge strategy.",
    );

    fs.writeFileSync(path.join(worktreePath, "task-note.txt"), "merge custom message\n");

    const commitRaw = await hooks.tool!.hive_worktree_commit.execute(
      {
        feature,
        task: FIRST_TASK,
        status: "completed",
        summary: "Prepared merge message test. Tests pass (bun test).",
      },
      toolContext
    );
    const commitResult = JSON.parse(commitRaw as string) as {
      ok: boolean;
      taskState?: string;
    };

    expect(commitResult.ok).toBe(true);
    expect(commitResult.taskState).toBe("done");

    const customMessage = "feat(plugin): merge subject\n\nmerge body";
    const mergeRaw = await hooks.tool!.hive_merge.execute(
      {
        feature,
        task: FIRST_TASK,
        strategy: "merge",
        message: customMessage,
      },
      toolContext
    );

    const mergeResult = JSON.parse(mergeRaw as string) as {
      success: boolean;
      merged: boolean;
      strategy: string;
      sha?: string;
      filesChanged: string[];
      conflicts: string[];
      conflictState: string;
      cleanup: { worktreeRemoved: boolean; branchDeleted: boolean; pruned: boolean };
      message: string;
    };

    expect(mergeResult).toMatchObject({
      success: true,
      merged: true,
      strategy: 'merge',
      filesChanged: ['task-note.txt'],
      conflicts: [],
      conflictState: 'none',
      cleanup: {
        worktreeRemoved: false,
        branchDeleted: false,
        pruned: false,
      },
      message: 'Task "01-first-task" merged successfully using merge strategy.',
    });
    expect(typeof mergeResult.sha).toBe('string');
    expect(readHeadBody(testRoot)).toBe(customMessage);
  });

  it("rejects custom merge message for rebase strategy", async () => {
    const feature = "rebase-message-rejection-feature";
    const { hooks, toolContext, worktreePath } = await createSingleTaskWorktree(
      testRoot,
      "sess_rebase_message_rejection",
      feature,
      "Rebase Message Rejection Feature",
      "Yes, this test validates rejection when custom message is used with rebase strategy.",
    );

    fs.writeFileSync(path.join(worktreePath, "task-note.txt"), "rebase custom message rejection\n");

    const commitRaw = await hooks.tool!.hive_worktree_commit.execute(
      {
        feature,
        task: FIRST_TASK,
        status: "completed",
        summary: "Prepared rebase rejection test. Tests pass (bun test).",
      },
      toolContext
    );
    const commitResult = JSON.parse(commitRaw as string) as {
      ok: boolean;
      taskState?: string;
    };

    expect(commitResult.ok).toBe(true);
    expect(commitResult.taskState).toBe("done");

    const mergeRaw = await hooks.tool!.hive_merge.execute(
      {
        feature,
        task: FIRST_TASK,
        strategy: "rebase",
        message: "feat: custom\n\nbody",
      },
      toolContext
    );

    const mergeResult = JSON.parse(mergeRaw as string) as {
      success: boolean;
      merged: boolean;
      strategy: string;
      filesChanged: string[];
      conflicts: string[];
      conflictState: string;
      cleanup: { worktreeRemoved: boolean; branchDeleted: boolean; pruned: boolean };
      error?: string;
      message: string;
    };

    expect(mergeResult).toEqual({
      success: false,
      merged: false,
      strategy: 'rebase',
      filesChanged: [],
      conflicts: [],
      conflictState: 'none',
      cleanup: {
        worktreeRemoved: false,
        branchDeleted: false,
        pruned: false,
      },
      error: 'Custom merge message is not supported for rebase strategy',
      message: 'Merge failed: Custom merge message is not supported for rebase strategy',
    });
  });

  it("returns helper-friendly merge JSON when task is not completed", async () => {
    const feature = "merge-incomplete-task-feature";
    const { hooks, toolContext } = await createSingleTaskWorktree(
      testRoot,
      "sess_merge_incomplete_task",
      feature,
      "Merge Incomplete Task Feature",
      "Yes, this test validates the early hive_merge JSON contract for incomplete tasks.",
    );

    const mergeRaw = await hooks.tool!.hive_merge.execute(
      {
        feature,
        task: FIRST_TASK,
        strategy: "merge",
      },
      toolContext
    );

    const mergeResult = JSON.parse(mergeRaw as string) as {
      success: boolean;
      merged: boolean;
      strategy: string;
      filesChanged: string[];
      conflicts: string[];
      conflictState: string;
      cleanup: { worktreeRemoved: boolean; branchDeleted: boolean; pruned: boolean };
      error?: string;
      message: string;
    };

    expect(mergeResult).toEqual({
      success: false,
      merged: false,
      strategy: 'merge',
      filesChanged: [],
      conflicts: [],
      conflictState: 'none',
      cleanup: {
        worktreeRemoved: false,
        branchDeleted: false,
        pruned: false,
      },
      error: 'Task must be completed before merging. Use hive_worktree_commit first.',
      message: 'Merge failed: Task must be completed before merging. Use hive_worktree_commit first.',
    });
  });

  it("auto-loads parallel exploration for planner agents by default", async () => {
    // Test unified mode agents
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
    const parallelExplorationSkill = BUILTIN_SKILLS.find(
      (skill) => skill.name === "parallel-exploration",
    );
    expect(parallelExplorationSkill).toBeDefined();

    // Skills are now injected via config hook's prompt field, NOT system.transform
    // Default mode is 'unified' which includes hive-master, scout, forager, hygienic
    const opencodeConfig: Record<string, unknown> = { agent: {} };
    await hooks.config!(opencodeConfig);
    const agents = opencodeConfig.agent as Record<string, { prompt?: string }>;

    // hive-master should have parallel-exploration in prompt (unified mode)
    expect(agents["hive-master"]?.prompt).toBeDefined();
    expect(agents["hive-master"]?.prompt).toContain(
      parallelExplorationSkill!.template,
    );
    expect(agents["hive-master"]?.prompt).not.toContain(onboardingSnippet);

    // scout-researcher should NOT have parallel-exploration in prompt (unified mode)
    // (removed to prevent recursive delegation - scout cannot spawn scouts)
    expect(agents["scout-researcher"]?.prompt).toBeDefined();
    expect(agents["scout-researcher"]?.prompt).not.toContain(
      parallelExplorationSkill!.template,
    );
    expect(agents["scout-researcher"]?.prompt).not.toContain(onboardingSnippet);

    // forager-worker should NOT have parallel-exploration in prompt
    expect(agents["forager-worker"]?.prompt).toBeDefined();
    expect(agents["forager-worker"]?.prompt).not.toContain(
      parallelExplorationSkill!.template,
    );
    expect(agents["forager-worker"]?.prompt).not.toContain(onboardingSnippet);
  });

  it("includes task prompt mode", async () => {

    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_task_prompt_mode");

    await hooks.tool!.hive_feature_create.execute(
      { name: "prompt-mode-feature" },
      toolContext
    );

    const plan = `# Prompt Mode Feature

## Discovery

**Q: Is this a test?**
A: Yes, this integration test validates task prompt mode functionality. Ensures worker-prompt.md files are correctly generated with mission context.

## Tasks

### 1. First Task
Do it
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "prompt-mode-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "prompt-mode-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "prompt-mode-feature" },
      toolContext
    );

    const execStartOutput = await hooks.tool!.hive_worktree_start.execute(
      { feature: "prompt-mode-feature", task: "01-first-task" },
      toolContext
    );

    const execStart = JSON.parse(execStartOutput as string) as {
      taskPromptMode?: string;
    };

    expect(execStart.taskPromptMode).toBe("opencode-at-file");
  });

  it("hive_plan_read binds featureName to global session", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_plan_bind");

    await hooks.tool!.hive_feature_create.execute(
      { name: "plan-bind-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_write.execute(
      {
        content: createSingleTaskPlan(
          "Plan Bind Feature",
          "Yes, this regression test validates that hive_plan_read binds featureName to the global session via SessionService.bindFeature. This is essential for compaction recovery."
        ),
        feature: "plan-bind-feature",
      },
      toolContext
    );

    const workerContext = createToolContext("sess_worker_plan_bind");
    await hooks.tool!.hive_plan_read.execute(
      { feature: "plan-bind-feature" },
      workerContext
    );

    const sessionsPath = path.join(testRoot, ".hive", "sessions.json");
    expect(fs.existsSync(sessionsPath)).toBe(true);
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
    const workerSession = sessions.sessions.find(
      (s: { sessionId: string }) => s.sessionId === "sess_worker_plan_bind"
    );
    expect(workerSession).toBeDefined();
    expect(workerSession.featureName).toBe("plan-bind-feature");
  });

  it("hive_context_write binds featureName to global session", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_ctx_bind");

    await hooks.tool!.hive_feature_create.execute(
      { name: "ctx-bind-feature" },
      toolContext
    );

    const workerContext = createToolContext("sess_worker_ctx_bind");
    await hooks.tool!.hive_context_write.execute(
      { name: "notes", content: "test notes", feature: "ctx-bind-feature" },
      workerContext
    );

    const sessionsPath = path.join(testRoot, ".hive", "sessions.json");
    expect(fs.existsSync(sessionsPath)).toBe(true);
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
    const workerSession = sessions.sessions.find(
      (s: { sessionId: string }) => s.sessionId === "sess_worker_ctx_bind"
    );
    expect(workerSession).toBeDefined();
    expect(workerSession.featureName).toBe("ctx-bind-feature");
  });

  it("hive_worktree_commit binds featureName, taskFolder, and workerPromptPath to global session", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_commit_bind");

    await hooks.tool!.hive_feature_create.execute(
      { name: "commit-bind-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_write.execute(
      {
        content: createSingleTaskPlan(
          "Commit Bind Feature",
          "Yes, this regression test validates that hive_worktree_commit binds featureName, taskFolder, and workerPromptPath to the global session for compaction recovery."
        ),
        feature: "commit-bind-feature",
      },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "commit-bind-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "commit-bind-feature" },
      toolContext
    );

    const startRaw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "commit-bind-feature", task: FIRST_TASK },
      toolContext
    );
    const startResult = JSON.parse(startRaw as string);
    expect(startResult.success).toBe(true);

    const workerContext = createToolContext("sess_worker_commit_bind");
    await hooks.tool!.hive_worktree_commit.execute(
      {
        task: FIRST_TASK,
        summary: "Test commit binding. Tests pass.",
        status: "completed",
        feature: "commit-bind-feature",
      },
      workerContext
    );

    const sessionsPath = path.join(testRoot, ".hive", "sessions.json");
    expect(fs.existsSync(sessionsPath)).toBe(true);
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
    const workerSession = sessions.sessions.find(
      (s: { sessionId: string }) => s.sessionId === "sess_worker_commit_bind"
    );
    expect(workerSession).toBeDefined();
    expect(workerSession.featureName).toBe("commit-bind-feature");
    expect(workerSession.taskFolder).toBe(FIRST_TASK);
    expect(workerSession.workerPromptPath).toContain("worker-prompt.md");
  });

  it("preserves manual-task structured spec at worktree launch instead of overwriting", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_manual_spec_preservation");

    await hooks.tool!.hive_feature_create.execute(
      { name: "manual-spec-feature" },
      toolContext
    );

    const plan = `# Manual Spec Feature

## Discovery

**Q: Is this a test?**
A: Yes, this regression test validates that manual tasks with structured metadata preserve their spec.md at worktree launch instead of being overwritten with a plan-section fallback.

## Tasks

### 1. First Task

**Depends on**: none

Do the first thing.
`;

    await hooks.tool!.hive_plan_write.execute(
      { content: plan, feature: "manual-spec-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "manual-spec-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "manual-spec-feature" },
      toolContext
    );

    await hooks.tool!.hive_task_create.execute(
      {
        name: "review-fix",
        feature: "manual-spec-feature",
        description: "Fix routing issue found in review",
        goal: "Correct agent routing for swarm dispatch",
        acceptanceCriteria: ["swarm dispatches to correct agent", "existing tests pass"],
        references: ["packages/opencode-hive/src/agents/swarm.ts:107-111"],
        files: ["packages/opencode-hive/src/agents/swarm.ts"],
        reason: "Required by Hygienic review",
        source: "review",
      },
      toolContext
    );

    const specPathBefore = path.join(
      testRoot,
      ".hive",
      "features",
      "01_manual-spec-feature",
      "tasks",
      "02-review-fix",
      "spec.md"
    );
    const specBefore = fs.readFileSync(specPathBefore, "utf-8");
    expect(specBefore).toContain("Correct agent routing for swarm dispatch");
    expect(specBefore).toContain("Fix routing issue found in review");

    const raw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "manual-spec-feature", task: "02-review-fix" },
      toolContext
    );

    const result = JSON.parse(raw as string) as {
      success?: boolean;
      worktreePath?: string;
    };
    expect(result.success).toBe(true);
    expect(result.worktreePath).toBeDefined();

    const specAfter = fs.readFileSync(specPathBefore, "utf-8");
    expect(specAfter).toContain("Correct agent routing for swarm dispatch");
    expect(specAfter).toContain("Fix routing issue found in review");
    expect(specAfter).toContain("swarm dispatches to correct agent");
    expect(specAfter).not.toContain("_No plan section available._");
  });

  it("worker chat.message in task worktree binds featureName, taskFolder, and workerPromptPath before commit", async () => {
    const ctx: PluginInput = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    };

    const hooks = await plugin(ctx);
    const toolContext = createToolContext("sess_start_bind");

    await hooks.tool!.hive_feature_create.execute(
      { name: "start-bind-feature" },
      toolContext
    );
    await hooks.tool!.hive_plan_write.execute(
      {
        content: createSingleTaskPlan(
          "Start Bind Feature",
          "Yes, this regression test validates that hive_worktree_start binds featureName, taskFolder, and workerPromptPath early enough for compaction recovery before worker commit."
        ),
        feature: "start-bind-feature",
      },
      toolContext
    );
    await hooks.tool!.hive_plan_approve.execute(
      { feature: "start-bind-feature" },
      toolContext
    );
    await hooks.tool!.hive_tasks_sync.execute(
      { feature: "start-bind-feature" },
      toolContext
    );

    const startRaw = await hooks.tool!.hive_worktree_start.execute(
      { feature: "start-bind-feature", task: FIRST_TASK },
      toolContext
    );
    const startResult = JSON.parse(startRaw as string);
    expect(startResult.success).toBe(true);

    const workerHooks = await plugin({
      directory: testRoot,
      worktree: startResult.worktreePath,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(startResult.worktreePath),
      client: OPENCODE_CLIENT,
      $: createStubShell(),
    });

    await workerHooks["chat.message"]?.(
      { sessionID: "sess_worker_start_bind", agent: "forager-worker" },
      { message: {} as any, parts: [] }
    );

    const sessionsPath = path.join(testRoot, ".hive", "sessions.json");
    expect(fs.existsSync(sessionsPath)).toBe(true);
    const sessions = JSON.parse(fs.readFileSync(sessionsPath, "utf-8"));
    const workerSession = sessions.sessions.find(
      (s: { sessionId: string }) => s.sessionId === "sess_worker_start_bind"
    );
    expect(workerSession).toBeDefined();
    expect(workerSession.featureName).toBe("start-bind-feature");
    expect(workerSession.taskFolder).toBe(FIRST_TASK);
    expect(workerSession.workerPromptPath).toContain("worker-prompt.md");
  });
});
