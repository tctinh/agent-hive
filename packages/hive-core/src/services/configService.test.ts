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
});
