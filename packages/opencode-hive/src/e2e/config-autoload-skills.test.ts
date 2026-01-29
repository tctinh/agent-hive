import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import { createOpencodeClient } from "@opencode-ai/sdk";
import plugin from "../index";
import { BUILTIN_SKILLS } from "../skills/registry.generated.js";

const OPENCODE_CLIENT = createOpencodeClient({ baseUrl: "http://localhost:1" });

const TEST_ROOT_BASE = "/tmp/hive-config-autoload-skills-test";

function createProject(worktree: string) {
  return {
    id: "test",
    worktree,
    time: { created: Date.now() },
  };
}

describe("config hook autoLoadSkills injection", () => {
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

  it("injects default autoLoadSkills into agent prompt in config hook (unified mode)", async () => {
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

    // hive-master should have parallel-exploration injected by default
    const hiveMasterPrompt = opencodeConfig.agent["hive-master"]?.prompt as string;
    expect(hiveMasterPrompt).toBeDefined();
    
    const parallelExplorationSkill = BUILTIN_SKILLS.find(s => s.name === "parallel-exploration");
    expect(parallelExplorationSkill).toBeDefined();
    expect(hiveMasterPrompt).toContain(parallelExplorationSkill!.template);

    // scout-researcher should HAVE parallel-exploration injected by default (per DEFAULT_HIVE_CONFIG)
    const scoutPrompt = opencodeConfig.agent["scout-researcher"]?.prompt as string;
    expect(scoutPrompt).toBeDefined();
    expect(scoutPrompt).toContain(parallelExplorationSkill!.template);

    // forager-worker should have test-driven-development and verification-before-completion by default
    const foragerPrompt = opencodeConfig.agent["forager-worker"]?.prompt as string;
    expect(foragerPrompt).toBeDefined();
    const tddSkill = BUILTIN_SKILLS.find(s => s.name === "test-driven-development");
    const verificationSkill = BUILTIN_SKILLS.find(s => s.name === "verification-before-completion");
    expect(tddSkill).toBeDefined();
    expect(verificationSkill).toBeDefined();
    expect(foragerPrompt).toContain(tddSkill!.template);
    expect(foragerPrompt).toContain(verificationSkill!.template);
    // forager should NOT have parallel-exploration
    expect(foragerPrompt).not.toContain(parallelExplorationSkill!.template);
  });

  it("injects user-configured autoLoadSkills into agent prompt in config hook", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "unified",
        agents: {
          // Add brainstorming (not a default for forager) on top of defaults
          "forager-worker": {
            autoLoadSkills: ["brainstorming"],
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

    // forager-worker should have brainstorming (user-configured) AND default skills
    const foragerPrompt = opencodeConfig.agent["forager-worker"]?.prompt as string;
    expect(foragerPrompt).toBeDefined();
    
    const brainstormingSkill = BUILTIN_SKILLS.find(s => s.name === "brainstorming");
    const tddSkill = BUILTIN_SKILLS.find(s => s.name === "test-driven-development");
    const verificationSkill = BUILTIN_SKILLS.find(s => s.name === "verification-before-completion");
    expect(brainstormingSkill).toBeDefined();
    expect(tddSkill).toBeDefined();
    expect(verificationSkill).toBeDefined();
    // User-configured skill should be present
    expect(foragerPrompt).toContain(brainstormingSkill!.template);
    // Default skills should also still be present
    expect(foragerPrompt).toContain(tddSkill!.template);
    expect(foragerPrompt).toContain(verificationSkill!.template);
  });

  it("respects disableSkills when injecting autoLoadSkills", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "unified",
        disableSkills: ["parallel-exploration"],
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

    // hive-master should NOT have parallel-exploration (it's disabled globally)
    const hiveMasterPrompt = opencodeConfig.agent["hive-master"]?.prompt as string;
    expect(hiveMasterPrompt).toBeDefined();
    
    const parallelExplorationSkill = BUILTIN_SKILLS.find(s => s.name === "parallel-exploration");
    expect(parallelExplorationSkill).toBeDefined();
    expect(hiveMasterPrompt).not.toContain(parallelExplorationSkill!.template);
  });

  it("warns on unknown skill ID but continues without error", async () => {
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "unified",
        agents: {
          "hive-master": {
            autoLoadSkills: ["nonexistent-skill"],
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

    // Should not throw, just warn
    const hooks = await plugin(ctx);
    const opencodeConfig: any = { agent: {} };
    await hooks.config!(opencodeConfig);

    // hive-master should still be defined
    expect(opencodeConfig.agent["hive-master"]).toBeDefined();
  });

  it("injects autoLoadSkills for all agents in dedicated mode", async () => {
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

    // architect-planner should have parallel-exploration injected by default
    const architectPrompt = opencodeConfig.agent["architect-planner"]?.prompt as string;
    expect(architectPrompt).toBeDefined();
    
    const parallelExplorationSkill = BUILTIN_SKILLS.find(s => s.name === "parallel-exploration");
    expect(parallelExplorationSkill).toBeDefined();
    expect(architectPrompt).toContain(parallelExplorationSkill!.template);

    // swarm-orchestrator should NOT have parallel-exploration (default is empty autoLoadSkills)
    const swarmPrompt = opencodeConfig.agent["swarm-orchestrator"]?.prompt as string;
    expect(swarmPrompt).toBeDefined();
    expect(swarmPrompt).not.toContain(parallelExplorationSkill!.template);
  });

  it("ensures skills are in prompt, not requiring system.transform input", async () => {
    // This test validates that skills are injected via config hook (into prompt field)
    // rather than relying on system.transform which may not have agent info at runtime
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "unified",
        agents: {
          "hive-master": {
            autoLoadSkills: ["brainstorming"],
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

    // The skill should be in the agent's prompt field directly
    const hiveMasterPrompt = opencodeConfig.agent["hive-master"]?.prompt as string;
    expect(hiveMasterPrompt).toBeDefined();
    
    const brainstormingSkill = BUILTIN_SKILLS.find(s => s.name === "brainstorming");
    expect(brainstormingSkill).toBeDefined();
    expect(hiveMasterPrompt).toContain(brainstormingSkill!.template);

    // Also verify default skill (parallel-exploration) is present
    const parallelExplorationSkill = BUILTIN_SKILLS.find(s => s.name === "parallel-exploration");
    expect(parallelExplorationSkill).toBeDefined();
    expect(hiveMasterPrompt).toContain(parallelExplorationSkill!.template);
  });

  it("system.transform does NOT inject skills (legacy path removed)", async () => {
    // This test verifies that the legacy autoLoadSkills injection in system.transform
    // has been completely removed. Skills should ONLY be injected via config hook.
    const configPath = path.join(testRoot, ".config", "opencode", "agent_hive.json");
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        agentMode: "unified",
        agents: {
          "hive-master": {
            autoLoadSkills: ["brainstorming", "parallel-exploration"],
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

    // Get skill templates to check
    const brainstormingSkill = BUILTIN_SKILLS.find(s => s.name === "brainstorming");
    const parallelExplorationSkill = BUILTIN_SKILLS.find(s => s.name === "parallel-exploration");
    expect(brainstormingSkill).toBeDefined();
    expect(parallelExplorationSkill).toBeDefined();

    // Call system.transform WITH agent specified
    const outputWithAgent = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.({ agent: "hive-master" }, outputWithAgent);
    const joinedWithAgent = outputWithAgent.system.join("\n");

    // Skills should NOT be in system.transform output (legacy path removed)
    expect(joinedWithAgent).not.toContain(brainstormingSkill!.template);
    expect(joinedWithAgent).not.toContain(parallelExplorationSkill!.template);

    // HIVE_SYSTEM_PROMPT should still be there
    expect(joinedWithAgent).toContain("## Hive - Feature Development System");

    // Call system.transform WITHOUT agent (simulates runtime scenario)
    const outputWithoutAgent = { system: [] as string[] };
    await hooks["experimental.chat.system.transform"]?.({}, outputWithoutAgent);
    const joinedWithoutAgent = outputWithoutAgent.system.join("\n");

    // Skills should also NOT be in system.transform output when agent is missing
    expect(joinedWithoutAgent).not.toContain(brainstormingSkill!.template);
    expect(joinedWithoutAgent).not.toContain(parallelExplorationSkill!.template);

    // HIVE_SYSTEM_PROMPT should still be there
    expect(joinedWithoutAgent).toContain("## Hive - Feature Development System");

    // Verify skills ARE in the config hook prompt (the correct path)
    const opencodeConfig: any = { agent: {} };
    await hooks.config!(opencodeConfig);
    const hiveMasterPrompt = opencodeConfig.agent["hive-master"]?.prompt as string;
    expect(hiveMasterPrompt).toContain(brainstormingSkill!.template);
    expect(hiveMasterPrompt).toContain(parallelExplorationSkill!.template);
  });
});
