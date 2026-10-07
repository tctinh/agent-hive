import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
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
      "hive-helper",
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
    expect(config.agents?.['hive-helper']).toEqual({
      model: 'github-copilot/gpt-5.2-codex',
      temperature: 0.3,
      autoLoadSkills: [],
    });
    expect(config.customAgents).toEqual({
      'forager-example-template': {
        baseAgent: 'forager-worker',
        description: 'Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.',
        model: 'anthropic/claude-sonnet-4-20250514',
        temperature: 0.2,
        variant: 'high',
        autoLoadSkills: ['test-driven-development'],
      },
      'hygienic-example-template': {
        baseAgent: 'hygienic-reviewer',
        description: 'Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.',
        autoLoadSkills: ['code-reviewer'],
      },
    });
  });

  it("loads customAgents from config", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          customAgents: {
            "forager-ui": {
              baseAgent: "forager-worker",
              description: "Use for UI-heavy implementation tasks.",
              model: "anthropic/claude-sonnet-4-20250514",
              temperature: 0.2,
              variant: "high",
              autoLoadSkills: ["ui-focus"],
            },
          },
        },
        null,
        2,
      ),
    );

    const config = service.get();
    expect(config.customAgents?.["forager-ui"]).toEqual({
      baseAgent: "forager-worker",
      description: "Use for UI-heavy implementation tasks.",
      model: "anthropic/claude-sonnet-4-20250514",
      temperature: 0.2,
      variant: "high",
      autoLoadSkills: ["ui-focus"],
    });
  });

  it("treats non-object customAgents as empty without dropping other config", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          agentMode: "dedicated",
          customAgents: null,
          agents: {
            "forager-worker": {
              variant: "high",
            },
          },
        },
        null,
        2,
      ),
    );

    const config = service.get();
    expect(config.agentMode).toBe("dedicated");
    expect(config.customAgents).toEqual({
      'forager-example-template': {
        baseAgent: 'forager-worker',
        description: 'Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.',
        model: 'anthropic/claude-sonnet-4-20250514',
        temperature: 0.2,
        variant: 'high',
        autoLoadSkills: ['test-driven-development'],
      },
      'hygienic-example-template': {
        baseAgent: 'hygienic-reviewer',
        description: 'Example template only: rename or delete this entry before use. Do not expect planners/orchestrators to select this placeholder agent as configured.',
        autoLoadSkills: ['code-reviewer'],
      },
    });
    expect(config.agents?.["forager-worker"]?.variant).toBe("high");
  });

  it("returns 'unified' as default agentMode", () => {
    const service = new ConfigService();
    expect(service.get().agentMode).toBe('unified');
  });

  it("does not fall back to legacy project config when the new project config is invalid", () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-local-config-test-'));
    try {
      const service = new ConfigService(projectDir);
      const newProjectConfigPath = path.join(projectDir, '.hive', 'agent-hive.json');
      const legacyProjectConfigPath = path.join(projectDir, '.opencode', 'agent_hive.json');

      fs.mkdirSync(path.dirname(newProjectConfigPath), { recursive: true });
      fs.writeFileSync(newProjectConfigPath, JSON.stringify(['invalid-config-shape']));

      fs.mkdirSync(path.dirname(legacyProjectConfigPath), { recursive: true });
      fs.writeFileSync(
        legacyProjectConfigPath,
        JSON.stringify({
          agentMode: 'dedicated',
        }),
      );

      const config = service.get();

      expect(config).toEqual(DEFAULT_HIVE_CONFIG);
      expect(service.getActiveReadSourceType()).toBe('global');
      expect(service.getLastFallbackWarning()).toEqual({
        message: `Failed to read project config at ${newProjectConfigPath}; global config at ${service.getPath()} is missing; using defaults`,
        sourceType: 'project',
        sourcePath: newProjectConfigPath,
        fallbackType: 'defaults',
        reason: 'validation_error',
      });
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('init() preserves project-local config and does not write global defaults', () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-init-config-test-'));
    try {
      const service = new ConfigService(projectDir);
      const projectConfigPath = path.join(projectDir, '.hive', 'agent-hive.json');

      fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
      fs.writeFileSync(
        projectConfigPath,
        JSON.stringify({
          sandbox: 'docker',
        }),
      );

      const config = service.init();

      expect(config.sandbox).toBe('docker');
      expect(service.getActiveReadSourceType()).toBe('project');
      expect(fs.existsSync(service.getPath())).toBe(false);
    } finally {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
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

  it('keeps hive-helper autoLoadSkills empty even when user sets them', () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          agents: {
            'hive-helper': {
              autoLoadSkills: ['test-driven-development'],
            },
          },
        },
        null,
        2,
      ),
    );

    const config = service.getAgentConfig('hive-helper');
    expect(config.autoLoadSkills).toEqual([]);
  });

  it("keeps disabled names in autoLoadSkills so native skills can still shadow Hive bundles", () => {
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
    expect(config.autoLoadSkills).toEqual(["parallel-exploration", "custom-skill"]);
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

  it("scout-researcher autoLoadSkills does NOT include parallel-exploration", () => {
    // Scout should not auto-load parallel-exploration to prevent recursive delegation.
    // Scouts are leaf agents that should not spawn further scouts.
    const service = new ConfigService();
    const scoutConfig = service.getAgentConfig("scout-researcher");

    expect(scoutConfig.autoLoadSkills).not.toContain("parallel-exploration");
  });

  it("normalizes custom agents with base inheritance and overrides", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          agents: {
            "forager-worker": {
              variant: "high",
              autoLoadSkills: ["verification-before-completion", "onboarding", "ui-focus"],
            },
          },
          customAgents: {
            "forager-lite": {
              baseAgent: "forager-worker",
              description: "General forager with inherited defaults.",
            },
            "forager-ui": {
              baseAgent: "forager-worker",
              description: "Forager focused on frontend tasks.",
              autoLoadSkills: ["ui-focus"],
            },
            "reviewer-security": {
              baseAgent: "hygienic-reviewer",
              description: "Security-focused reviewer.",
              model: "anthropic/claude-sonnet-4-20250514",
              temperature: 0.1,
            },
          },
        },
        null,
        2,
      ),
    );

    const custom = service.getCustomAgentConfigs();

    expect(custom["forager-lite"]).toMatchObject({
      baseAgent: "forager-worker",
      model: "github-copilot/gpt-5.2-codex",
      temperature: 0.3,
    });

    expect(custom["forager-ui"]?.variant).toBe("high");
    expect(custom["forager-ui"]?.autoLoadSkills).toEqual([
      "test-driven-development",
      "verification-before-completion",
      "ui-focus",
    ]);

    expect(custom["reviewer-security"]?.temperature).toBe(0.1);
    expect(custom["reviewer-security"]?.model).toBe(
      "anthropic/claude-sonnet-4-20250514",
    );
  });

  it("skips reserved/invalid custom agent names for runtime lookups", () => {
    const service = new ConfigService();
    const configPath = service.getPath();
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          customAgents: {
            "forager-worker": {
              baseAgent: "forager-worker",
              description: "Reserved built-in ID.",
            },
            build: {
              baseAgent: "forager-worker",
              description: "Reserved plugin alias.",
            },
            "unsupported-base": {
              baseAgent: "hive-master",
              description: "Should be skipped at runtime.",
            },
            "forager-ui": {
              baseAgent: "forager-worker",
              description: "Valid custom agent.",
            },
          },
        },
        null,
        2,
      ),
    );

    const custom = service.getCustomAgentConfigs();
    expect(custom).not.toHaveProperty("forager-worker");
    expect(custom).not.toHaveProperty("build");
    expect(custom).not.toHaveProperty("unsupported-base");
    expect(custom).toHaveProperty("forager-ui");

    const warnedLines = warnSpy.mock.calls.map((call) => call.join(" "));
    const expectWarnedAboutReservedName = (name: string) => {
      expect(
        warnedLines.some(
          (line) => line.includes("reserved") && line.includes(`\"${name}\"`),
        ),
      ).toBe(true);
    };

    expectWarnedAboutReservedName("build");
    expect(service.hasConfiguredAgent("forager-worker")).toBe(true);
    expect(service.hasConfiguredAgent("forager-ui")).toBe(true);
    expect(service.hasConfiguredAgent("build")).toBe(false);
    expect(service.hasConfiguredAgent("unsupported-base")).toBe(false);
    expect(service.hasConfiguredAgent("missing-agent")).toBe(false);

    warnSpy.mockRestore();
  });

  it("skips non-object custom agent declarations and keeps valid ones", () => {
    const service = new ConfigService();
    const configPath = service.getPath();
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          customAgents: {
            "forager-ui": {
              baseAgent: "forager-worker",
              description: "Valid custom agent.",
            },
            "broken-null": null,
            "broken-string": "bad",
          },
        },
        null,
        2,
      ),
    );

    const custom = service.getCustomAgentConfigs();
    expect(custom).toHaveProperty("forager-ui");
    expect(custom).not.toHaveProperty("broken-null");
    expect(custom).not.toHaveProperty("broken-string");

    const warnedLines = warnSpy.mock.calls.map((call) => call.join(" "));
    expect(
      warnedLines.some(
        (line) => line.includes("invalid declaration") && line.includes("\"broken-null\""),
      ),
    ).toBe(true);
    expect(
      warnedLines.some(
        (line) => line.includes("invalid declaration") && line.includes("\"broken-string\""),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });

  it("skips custom agents with missing or whitespace description", () => {
    const service = new ConfigService();
    const configPath = service.getPath();
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          customAgents: {
            "missing-description": {
              baseAgent: "forager-worker",
            },
            "blank-description": {
              baseAgent: "forager-worker",
              description: "   ",
            },
            "forager-ui": {
              baseAgent: "forager-worker",
              description: "Use for UI-heavy implementation tasks.",
            },
          },
        },
        null,
        2,
      ),
    );

    const custom = service.getCustomAgentConfigs();
    expect(custom).toHaveProperty("forager-ui");
    expect(custom).not.toHaveProperty("missing-description");
    expect(custom).not.toHaveProperty("blank-description");

    const warnedLines = warnSpy.mock.calls.map((call) => call.join(" "));
    expect(
      warnedLines.some(
        (line) => line.includes("description must be a non-empty string") && line.includes("\"missing-description\""),
      ),
    ).toBe(true);
    expect(
      warnedLines.some(
        (line) => line.includes("description must be a non-empty string") && line.includes("\"blank-description\""),
      ),
    ).toBe(true);

    warnSpy.mockRestore();
  });

  it("treats empty custom model and variant overrides as unset", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          customAgents: {
            "forager-ui": {
              baseAgent: "forager-worker",
              description: "Use for UI-heavy implementation tasks.",
              model: "   ",
              variant: "   ",
            },
          },
        },
        null,
        2,
      ),
    );

    const custom = service.getCustomAgentConfigs();
    expect(custom["forager-ui"]?.model).toBe("github-copilot/gpt-5.2-codex");
    expect(custom["forager-ui"]?.variant).toBeUndefined();
  });

  it("caches custom agent resolution and emits warnings once per cache cycle", () => {
    const service = new ConfigService();
    const configPath = service.getPath();
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          customAgents: {
            build: {
              baseAgent: "forager-worker",
              description: "Reserved plugin alias.",
            },
            "forager-ui": {
              baseAgent: "forager-worker",
              description: "Valid custom agent.",
            },
          },
        },
        null,
        2,
      ),
    );

    service.getCustomAgentConfigs();
    service.hasConfiguredAgent("forager-ui");
    service.hasConfiguredAgent("missing-agent");
    service.getCustomAgentConfigs();

    const reservedWarnings = warnSpy.mock.calls.filter((call) =>
      call.join(" ").includes("Skipping custom agent \"build\": reserved name"),
    );
    expect(reservedWarnings.length).toBe(1);

    warnSpy.mockRestore();
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

describe("ConfigService sandbox config", () => {
  it("getSandboxConfig() returns { mode: 'none' } when not configured", () => {
    const service = new ConfigService();
    const sandboxConfig = service.getSandboxConfig();

    expect(sandboxConfig).toEqual({ mode: 'none', persistent: false });
  });

  it("getSandboxConfig() returns { mode: 'docker' } when sandbox is set to docker", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        sandbox: 'docker',
      }),
    );

    const sandboxConfig = service.getSandboxConfig();
    expect(sandboxConfig).toEqual({ mode: 'docker', persistent: true });
  });

  it("getSandboxConfig() returns { mode: 'docker', image: 'node:22-slim' } when configured with dockerImage", () => {
    const service = new ConfigService();
    const configPath = service.getPath();

    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        sandbox: 'docker',
        dockerImage: 'node:22-slim',
      }),
    );

    const sandboxConfig = service.getSandboxConfig();
    expect(sandboxConfig).toEqual({ mode: 'docker', image: 'node:22-slim', persistent: true });
  });
});

describe('ConfigService project-aware read source selection', () => {
  it('reads from project config when project config exists and is valid', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const projectConfigPath = path.join(projectRoot, '.hive', 'agent-hive.json');
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(
      projectConfigPath,
      JSON.stringify({
        sandbox: 'docker',
      }),
    );

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(
      globalConfigPath,
      JSON.stringify({
        sandbox: 'none',
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config.sandbox).toBe('docker');
    expect(service.getActiveReadSourceType()).toBe('project');
    expect(service.getActiveReadPath()).toBe(projectConfigPath);
    expect(service.getLastFallbackWarning()).toBeNull();

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('falls back to legacy project config when the new project config is missing', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const legacyProjectConfigPath = path.join(projectRoot, '.opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(legacyProjectConfigPath), { recursive: true });
    fs.writeFileSync(
      legacyProjectConfigPath,
      JSON.stringify({
        sandbox: 'docker',
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config.sandbox).toBe('docker');
    expect(service.getActiveReadSourceType()).toBe('project');
    expect(service.getActiveReadPath()).toBe(legacyProjectConfigPath);
    expect(service.getLastFallbackWarning()).toBeNull();

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('falls back to global config when project config is missing', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(
      globalConfigPath,
      JSON.stringify({
        sandbox: 'docker',
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config.sandbox).toBe('docker');
    expect(service.getActiveReadSourceType()).toBe('global');
    expect(service.getActiveReadPath()).toBe(globalConfigPath);
    expect(service.getLastFallbackWarning()).toBeNull();

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('falls back to global config and records warning metadata when project config is invalid', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const projectConfigPath = path.join(projectRoot, '.hive', 'agent-hive.json');
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(projectConfigPath, JSON.stringify(['invalid-config-shape']));

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(
      globalConfigPath,
      JSON.stringify({
        sandbox: 'docker',
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config.sandbox).toBe('docker');
    expect(service.getActiveReadSourceType()).toBe('global');
    expect(service.getActiveReadPath()).toBe(globalConfigPath);
    expect(service.getLastFallbackWarning()).toEqual({
      message: `Failed to read project config at ${projectConfigPath}; using global config at ${globalConfigPath}`,
      sourceType: 'project',
      sourcePath: projectConfigPath,
      fallbackType: 'global',
      fallbackPath: globalConfigPath,
      reason: 'validation_error',
    });

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('falls back to global config when project config has invalid object field types', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const projectConfigPath = path.join(projectRoot, '.hive', 'agent-hive.json');
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(
      projectConfigPath,
      JSON.stringify({
        sandbox: 123,
      }),
    );

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(
      globalConfigPath,
      JSON.stringify({
        sandbox: 'docker',
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config.sandbox).toBe('docker');
    expect(service.getActiveReadSourceType()).toBe('global');
    expect(service.getActiveReadPath()).toBe(globalConfigPath);
    expect(service.getLastFallbackWarning()).toEqual({
      message: `Failed to read project config at ${projectConfigPath}; using global config at ${globalConfigPath}`,
      sourceType: 'project',
      sourcePath: projectConfigPath,
      fallbackType: 'global',
      fallbackPath: globalConfigPath,
      reason: 'validation_error',
    });

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('falls back to global config when project config has invalid nested built-in agent fields', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const projectConfigPath = path.join(projectRoot, '.hive', 'agent-hive.json');
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(
      projectConfigPath,
      JSON.stringify({
        agents: {
          'forager-worker': {
            autoLoadSkills: 'bad-skill-shape',
          },
        },
      }),
    );

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(
      globalConfigPath,
      JSON.stringify({
        sandbox: 'docker',
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config.sandbox).toBe('docker');
    expect(service.getActiveReadSourceType()).toBe('global');
    expect(service.getActiveReadPath()).toBe(globalConfigPath);
    expect(service.getLastFallbackWarning()).toEqual({
      message: `Failed to read project config at ${projectConfigPath}; using global config at ${globalConfigPath}`,
      sourceType: 'project',
      sourcePath: projectConfigPath,
      fallbackType: 'global',
      fallbackPath: globalConfigPath,
      reason: 'validation_error',
    });

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('falls back to defaults and records a global warning when global config is invalid', () => {
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(
      globalConfigPath,
      JSON.stringify({
        sandbox: 123,
      }),
    );

    const service = new ConfigService();
    const config = service.get();

    expect(config).toEqual(DEFAULT_HIVE_CONFIG);
    expect(service.getActiveReadSourceType()).toBe('global');
    expect(service.getActiveReadPath()).toBe(globalConfigPath);
    expect(service.getLastFallbackWarning()).toEqual({
      message: `Failed to read global config at ${globalConfigPath}; using defaults`,
      sourceType: 'global',
      sourcePath: globalConfigPath,
      fallbackType: 'defaults',
      reason: 'validation_error',
    });
  });

  it('falls back to defaults when both project and global configs are invalid', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const projectConfigPath = path.join(projectRoot, '.hive', 'agent-hive.json');
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(
      projectConfigPath,
      JSON.stringify({
        agents: {
          'forager-worker': {
            autoLoadSkills: 'bad-skill-shape',
          },
        },
      }),
    );

    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(
      globalConfigPath,
      JSON.stringify({
        sandbox: 123,
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config).toEqual(DEFAULT_HIVE_CONFIG);
    expect(service.getActiveReadSourceType()).toBe('global');
    expect(service.getActiveReadPath()).toBe(globalConfigPath);
    expect(service.getLastFallbackWarning()).toEqual({
      message: `Failed to read project config at ${projectConfigPath}; global config at ${globalConfigPath} is also invalid; using defaults`,
      sourceType: 'project',
      sourcePath: projectConfigPath,
      fallbackType: 'defaults',
      reason: 'validation_error',
    });

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('falls back to defaults when project config is invalid and global config is missing', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-project-'));
    const projectConfigPath = path.join(projectRoot, '.hive', 'agent-hive.json');
    const globalConfigPath = path.join(tempHome, '.config', 'opencode', 'agent_hive.json');

    fs.mkdirSync(path.dirname(projectConfigPath), { recursive: true });
    fs.writeFileSync(
      projectConfigPath,
      JSON.stringify({
        agents: {
          'forager-worker': {
            autoLoadSkills: 'bad-skill-shape',
          },
        },
      }),
    );

    const service = new ConfigService(projectRoot);
    const config = service.get();

    expect(config).toEqual(DEFAULT_HIVE_CONFIG);
    expect(service.getActiveReadSourceType()).toBe('global');
    expect(service.getActiveReadPath()).toBe(globalConfigPath);
    expect(service.getLastFallbackWarning()).toEqual({
      message: `Failed to read project config at ${projectConfigPath}; global config at ${globalConfigPath} is missing; using defaults`,
      sourceType: 'project',
      sourcePath: projectConfigPath,
      fallbackType: 'defaults',
      reason: 'validation_error',
    });

    fs.rmSync(projectRoot, { recursive: true, force: true });
  });
});
