import * as fs from 'fs';
import * as path from 'path';
import stripJsonComments from 'strip-json-comments';
import { HiveConfig, DEFAULT_HIVE_CONFIG } from '../types.js';

/**
 * ConfigService manages user config at ~/.config/opencode/agent_hive.json
 * 
 * This is USER config (not project-scoped):
 * - VSCode extension reads/writes this
 * - OpenCode plugin reads this to enable features
 * - Agent does NOT have tools to access this
 */
export class ConfigService {
  private configPath: string;

  constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const configDir = path.join(homeDir, '.config', 'opencode');
    this.configPath = path.join(configDir, 'agent_hive.json');
  }

  /**
   * Get config path
   */
  getPath(): string {
    return this.configPath;
  }

  /**
   * Get the full config, merged with defaults.
   */
  get(): HiveConfig {
    try {
      if (!fs.existsSync(this.configPath)) {
        return { ...DEFAULT_HIVE_CONFIG };
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const stored = JSON.parse(raw) as Partial<HiveConfig>;

      // Deep merge with defaults
      return {
        ...DEFAULT_HIVE_CONFIG,
        ...stored,
        agents: {
          ...DEFAULT_HIVE_CONFIG.agents,
          ...stored.agents,
          // Deep merge hive-master agent config
          'hive-master': {
            ...DEFAULT_HIVE_CONFIG.agents?.['hive-master'],
            ...stored.agents?.['hive-master'],
          },
          // Deep merge architect-planner agent config
          'architect-planner': {
            ...DEFAULT_HIVE_CONFIG.agents?.['architect-planner'],
            ...stored.agents?.['architect-planner'],
          },
          // Deep merge swarm-orchestrator agent config
          'swarm-orchestrator': {
            ...DEFAULT_HIVE_CONFIG.agents?.['swarm-orchestrator'],
            ...stored.agents?.['swarm-orchestrator'],
          },
          // Deep merge scout-researcher agent config
          'scout-researcher': {
            ...DEFAULT_HIVE_CONFIG.agents?.['scout-researcher'],
            ...stored.agents?.['scout-researcher'],
          },
          // Deep merge forager-worker agent config
          'forager-worker': {
            ...DEFAULT_HIVE_CONFIG.agents?.['forager-worker'],
            ...stored.agents?.['forager-worker'],
          },
          // Deep merge hygienic-reviewer agent config
          'hygienic-reviewer': {
            ...DEFAULT_HIVE_CONFIG.agents?.['hygienic-reviewer'],
            ...stored.agents?.['hygienic-reviewer'],
          },
        },
      };
    } catch {
      return { ...DEFAULT_HIVE_CONFIG };
    }
  }

  /**
   * Update config (partial merge).
   */
  set(updates: Partial<HiveConfig>): HiveConfig {
    const current = this.get();
    
    const merged: HiveConfig = {
      ...current,
      ...updates,
      agents: updates.agents ? {
        ...current.agents,
        ...updates.agents,
      } : current.agents,
    };

    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2));
    return merged;
  }

  /**
   * Check if config file exists.
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Initialize config with defaults if it doesn't exist.
   */
  init(): HiveConfig {
    if (!this.exists()) {
      return this.set(DEFAULT_HIVE_CONFIG);
    }
    return this.get();
  }

  /**
   * Register Hive agents in OpenCode's opencode.json.
   * This is required because OpenCode doesn't support dynamic agent registration via plugin hooks.
   * Agents are written to ~/.config/opencode/opencode.json under the 'agent' key.
   */
  registerAgentsInOpenCode(agents: Record<string, {
    model?: string;
    temperature?: number;
    description: string;
    prompt: string;
    hidden?: boolean;
    permission?: Record<string, string>;
  }>): void {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const opencodePath = path.join(homeDir, '.config', 'opencode', 'opencode.json');
    
    try {
      if (!fs.existsSync(opencodePath)) {
        // No opencode.json, skip registration
        return;
      }

      const raw = fs.readFileSync(opencodePath, 'utf-8');
      
      const config = JSON.parse(stripJsonComments(raw));
      
      // Initialize agent section if not exists
      if (!config.agent) {
        config.agent = {};
      }

       // Initialize agent section (no legacy cleanup)

      // Merge in our agents (don't overwrite user customizations)
      for (const [name, agentConfig] of Object.entries(agents)) {
        if (!config.agent[name]) {
          config.agent[name] = agentConfig;
        } else {
          // Preserve user's model/temperature overrides, but update prompt and description
          config.agent[name] = {
            ...agentConfig,
            model: config.agent[name].model || agentConfig.model,
            temperature: config.agent[name].temperature ?? agentConfig.temperature,
          };
        }
      }

      fs.writeFileSync(opencodePath, JSON.stringify(config, null, 2));
    } catch (err) {
      // Silent fail - don't break plugin if we can't write
      console.error('[Hive] Failed to register agents in opencode.json:', err);
    }
  }

  /**
   * Get agent-specific model config
   */
  getAgentConfig(
    agent: 'hive-master' | 'architect-planner' | 'swarm-orchestrator' | 'scout-researcher' | 'forager-worker' | 'hygienic-reviewer',
  ): { model?: string; temperature?: number; skills?: string[]; autoLoadSkills?: string[]; variant?: string } {
    const config = this.get();
    const agentConfig = config.agents?.[agent] ?? {};
    const defaultAutoLoadSkills = DEFAULT_HIVE_CONFIG.agents?.[agent]?.autoLoadSkills ?? [];
    const userAutoLoadSkills = agentConfig.autoLoadSkills ?? [];
    const isPlannerAgent = agent === 'hive-master' || agent === 'architect-planner';
    const effectiveUserAutoLoadSkills = isPlannerAgent
      ? userAutoLoadSkills
      : userAutoLoadSkills.filter((skill) => skill !== 'onboarding');
    const effectiveDefaultAutoLoadSkills = isPlannerAgent
      ? defaultAutoLoadSkills
      : defaultAutoLoadSkills.filter((skill) => skill !== 'onboarding');
    const combinedAutoLoadSkills = [...effectiveDefaultAutoLoadSkills, ...effectiveUserAutoLoadSkills];
    const uniqueAutoLoadSkills = Array.from(new Set(combinedAutoLoadSkills));
    const disabledSkills = config.disableSkills ?? [];
    const effectiveAutoLoadSkills = uniqueAutoLoadSkills.filter(
      (skill) => !disabledSkills.includes(skill),
    );

    return {
      ...agentConfig,
      autoLoadSkills: effectiveAutoLoadSkills,
    };
  }

  /**
   * Check if OMO-Slim delegation is enabled via user config.
   */
  isOmoSlimEnabled(): boolean {
    const config = this.get();
    return config.omoSlimEnabled === true;
  }

  /**
   * Get list of globally disabled skills.
   */
  getDisabledSkills(): string[] {
    const config = this.get();
    return config.disableSkills ?? [];
  }

  /**
   * Get list of globally disabled MCPs.
   */
  getDisabledMcps(): string[] {
    const config = this.get();
    return config.disableMcps ?? [];
  }
}
