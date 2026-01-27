import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ConfigService } from "./configService";
import { DEFAULT_HIVE_CONFIG } from "../types";

let originalHome: string | undefined;
let tempHome: string;

const makeTempHome = () => fs.mkdtempSync(path.join(os.tmpdir(), "hive-home-"));

beforeEach(() => {
  originalHome = process.env.HOME;
  tempHome = makeTempHome();
  process.env.HOME = tempHome;
});

afterEach(() => {
  if (originalHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = originalHome;
  }
  fs.rmSync(tempHome, { recursive: true, force: true });
});

describe("ConfigService defaults", () => {
  it("returns DEFAULT_HIVE_CONFIG when config is missing", () => {
    const service = new ConfigService();
    const config = service.get();

    expect(config).toEqual(DEFAULT_HIVE_CONFIG);
    expect(Object.keys(config.agents ?? {}).sort()).toEqual([
      "architect-planner",
      "forager-worker",
      "hive-master",
      "hygienic-reviewer",
      "scout-researcher",
      "swarm-orchestrator",
    ]);
    expect(config.agents?.["architect-planner"]?.model).toBe(
      "github-copilot/gpt-5.2-codex",
    );
    expect(config.agents?.["hive-master"]?.model).toBe(
      "github-copilot/claude-opus-4.5",
    );
    expect(config.agents?.["swarm-orchestrator"]?.model).toBe(
      "github-copilot/claude-opus-4.5",
    );
  });

  it("returns 'task' as default delegateMode", () => {
    const service = new ConfigService();
    expect(service.getDelegateMode()).toBe('task');
  });

  it("returns 'unified' as default agentMode", () => {
    const service = new ConfigService();
    expect(service.get().agentMode).toBe('unified');
  });

  it("deep-merges agent overrides with defaults", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          agents: {
            "hive-master": { temperature: 0.8 },
          },
        },
        null,
        2,
      ),
    );

    const config = service.get();
    expect(config.agents?.["hive-master"]?.temperature).toBe(0.8);
    expect(config.agents?.["hive-master"]?.model).toBe(
      "github-copilot/claude-opus-4.5",
    );

    const agentConfig = service.getAgentConfig("hive-master");
    expect(agentConfig.temperature).toBe(0.8);
    expect(agentConfig.model).toBe("github-copilot/claude-opus-4.5");
  });

  it("deep-merges variant field from user config", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          agents: {
            "forager-worker": { variant: "high" },
            "scout-researcher": { variant: "low", temperature: 0.2 },
          },
        },
        null,
        2,
      ),
    );

    const config = service.get();
    // variant should be merged from user config
    expect(config.agents?.["forager-worker"]?.variant).toBe("high");
    expect(config.agents?.["scout-researcher"]?.variant).toBe("low");
    // other defaults should still be present
    expect(config.agents?.["forager-worker"]?.model).toBe(
      "github-copilot/gpt-5.2-codex",
    );
    expect(config.agents?.["scout-researcher"]?.temperature).toBe(0.2);

    // getAgentConfig should also return variant
    const foragerConfig = service.getAgentConfig("forager-worker");
    expect(foragerConfig.variant).toBe("high");
    expect(foragerConfig.model).toBe("github-copilot/gpt-5.2-codex");

    const scoutConfig = service.getAgentConfig("scout-researcher");
    expect(scoutConfig.variant).toBe("low");
    expect(scoutConfig.temperature).toBe(0.2);
  });

  it("merges autoLoadSkills defaults and overrides", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          agents: {
            "forager-worker": {
              autoLoadSkills: ["custom-skill", "verification-before-completion"],
            },
          },
        },
        null,
        2,
      ),
    );

    const config = service.getAgentConfig("forager-worker");
    expect(config.autoLoadSkills).toEqual([
      "test-driven-development",
      "verification-before-completion",
      "custom-skill",
    ]);
  });

  it("removes autoLoadSkills via disableSkills", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          disableSkills: ["parallel-exploration", "custom-skill"],
          agents: {
            "hive-master": {
              autoLoadSkills: ["custom-skill"],
            },
          },
        },
        null,
        2,
      ),
    );

    const config = service.getAgentConfig("hive-master");
    expect(config.autoLoadSkills).toEqual([]);
  });

  it("defaults have no variant set", () => {
    const service = new ConfigService();
    const config = service.get();

    // Default config should not have variant set for any agent
    for (const agentKey of Object.keys(config.agents ?? {})) {
      const agent = config.agents?.[agentKey as keyof typeof config.agents];
      expect(agent?.variant).toBeUndefined();
    }
  });
});

describe("ConfigService disabled skills/mcps", () => {
  it("returns empty arrays when not configured", () => {
    const service = new ConfigService();
    expect(service.getDisabledSkills()).toEqual([]);
    expect(service.getDisabledMcps()).toEqual([]);
  });

  it("returns configured disabled skills", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        disableSkills: ["brainstorming", "writing-plans"],
      }),
    );

    expect(service.getDisabledSkills()).toEqual(["brainstorming", "writing-plans"]);
  });

  it("returns configured disabled MCPs", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        disableMcps: ["websearch", "ast_grep"],
      }),
    );

    expect(service.getDisabledMcps()).toEqual(["websearch", "ast_grep"]);
  });
});
