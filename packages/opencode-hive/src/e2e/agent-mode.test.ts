import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { createOpencodeClient } from "@opencode-ai/sdk";
import plugin from "../index";

const OPENCODE_CLIENT = createOpencodeClient({ baseUrl: "http://localhost:1" });

const TEST_ROOT_BASE = "/tmp/hive-agent-mode-test";

function createProject(worktree: string) {
  return {
    id: "test",
    worktree,
    time: { created: Date.now() },
  };
}

describe("agentMode gating", () => {
  let testRoot: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.HOME;
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    fs.mkdirSync(TEST_ROOT_BASE, { recursive: true });
    testRoot = fs.mkdtempSync(path.join(TEST_ROOT_BASE, "project-"));
    process.env.HOME = testRoot;
  });

  afterEach(() => {
    fs.rmSync(TEST_ROOT_BASE, { recursive: true, force: true });
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  });

  it("registers hive-master, scout, forager, and hygienic in unified mode", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "unified",
      }),
    );

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
    };

    const hooks = await plugin(ctx);
    const opencodeConfig: any = { agent: {} };
    await hooks.config!(opencodeConfig);

    expect(opencodeConfig.agent["hive-master"]).toBeDefined();
    expect(opencodeConfig.agent["architect-planner"]).toBeUndefined();
    expect(opencodeConfig.agent["swarm-orchestrator"]).toBeUndefined();
    expect(opencodeConfig.agent["scout-researcher"]).toBeDefined();
    expect(opencodeConfig.agent["forager-worker"]).toBeDefined();
    expect(opencodeConfig.agent["hive-helper"]).toBeDefined();
    expect(opencodeConfig.agent["hygienic-reviewer"]).toBeDefined();
    expect(opencodeConfig.default_agent).toBe("hive-master");
  });

  it("registers dedicated agents in dedicated mode", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "dedicated",
      }),
    );

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
    };

    const hooks = await plugin(ctx);
    const opencodeConfig: any = { agent: {} };
    await hooks.config!(opencodeConfig);

    expect(opencodeConfig.agent["hive-master"]).toBeUndefined();
    expect(opencodeConfig.agent["architect-planner"]).toBeDefined();
    expect(opencodeConfig.agent["swarm-orchestrator"]).toBeDefined();
    expect(opencodeConfig.agent["scout-researcher"]).toBeDefined();
    expect(opencodeConfig.agent["forager-worker"]).toBeDefined();
    expect(opencodeConfig.agent["hive-helper"]).toBeDefined();
    expect(opencodeConfig.agent["hygienic-reviewer"]).toBeDefined();
    expect(opencodeConfig.default_agent).toBe("architect-planner");
  });

  it("injects custom-subagent appendix into dedicated-mode primary prompts and registers custom agents", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "dedicated",
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

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
    };

    const hooks = await plugin(ctx);
    const opencodeConfig: any = { agent: {} };
    await hooks.config!(opencodeConfig);

    expect(opencodeConfig.agent["forager-ui"]).toBeDefined();
    expect(opencodeConfig.agent["reviewer-security"]).toBeDefined();

    const architectPrompt = opencodeConfig.agent["architect-planner"]?.prompt as string;
    expect(architectPrompt).toContain("## Configured Custom Subagents");
    expect(architectPrompt).toContain("forager-ui");

    const swarmPrompt = opencodeConfig.agent["swarm-orchestrator"]?.prompt as string;
    expect(swarmPrompt).toContain("## Configured Custom Subagents");
    expect(swarmPrompt).toContain("reviewer-security");

    expect(opencodeConfig.agent["hive-master"]).toBeUndefined();
  });

  it("exposes hive_network_query only to planning orchestration and review roles", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "dedicated",
      }),
    );

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
    };

    const hooks = await plugin(ctx);
    const opencodeConfig: any = { agent: {} };
    await hooks.config!(opencodeConfig);

    expect(opencodeConfig.agent["architect-planner"]?.tools?.["hive_network_query"]).toBeUndefined();
    expect(opencodeConfig.agent["swarm-orchestrator"]?.tools?.["hive_network_query"]).toBeUndefined();
    expect(opencodeConfig.agent["hygienic-reviewer"]?.tools?.["hive_network_query"]).toBeUndefined();
    expect(opencodeConfig.agent["forager-worker"]?.tools?.["hive_network_query"]).toBe(false);
    expect(opencodeConfig.agent["scout-researcher"]?.tools?.["hive_network_query"]).toBe(false);
    expect(opencodeConfig.agent["hive-helper"]?.tools?.["hive_network_query"]).toBe(false);
  });

  it("keeps hive-helper bounded to merge recovery, state clarification, and append-only manual follow-up", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "dedicated",
      }),
    );

    const ctx: any = {
      directory: testRoot,
      worktree: testRoot,
      serverUrl: new URL("http://localhost:1"),
      project: createProject(testRoot),
      client: OPENCODE_CLIENT,
    };

    const hooks = await plugin(ctx);
    const opencodeConfig: any = { agent: {} };
    await hooks.config!(opencodeConfig);

    const helper = opencodeConfig.agent["hive-helper"];
    expect(helper).toBeDefined();
    expect(helper.description).toContain("bounded hard-task operational assistant");
    expect(helper.description).toContain("merge recovery");
    expect(helper.description).toContain("state clarification");
    expect(helper.description).toContain("manual follow-up");
    expect(helper.prompt).toContain("safe append-only manual tasks");
    expect(helper.prompt).toContain("never update plan-backed task state");
    expect(helper.prompt).not.toContain("## Hive Skill:");
    expect(helper.tools?.["hive_merge"]).toBeUndefined();
    expect(helper.tools?.["hive_status"]).toBeUndefined();
    expect(helper.tools?.["hive_context_write"]).toBeUndefined();
    expect(helper.tools?.["hive_task_create"]).toBeUndefined();
    expect(helper.tools?.["hive_skill"]).toBeUndefined();
    expect(helper.tools?.["hive_task_update"]).toBe(false);
    expect(helper.tools?.["hive_plan_read"]).toBe(false);
    expect(helper.tools?.["hive_tasks_sync"]).toBe(false);
    expect(helper.tools?.["hive_worktree_start"]).toBe(false);
    expect(helper.tools?.["hive_worktree_create"]).toBe(false);
    expect(helper.tools?.["hive_worktree_commit"]).toBe(false);
    expect(helper.tools?.["hive_network_query"]).toBe(false);
    expect(helper.permission?.task).toBe("deny");
    expect(helper.permission?.delegate).toBe("deny");
  });
});
