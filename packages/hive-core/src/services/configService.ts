import * as fs from 'fs';
import * as path from 'path';
import { HiveConfig, DEFAULT_HIVE_CONFIG } from '../types.js';
import type { SandboxConfig } from './dockerSandboxService.js';

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
  private cachedConfig: HiveConfig | null = null;

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
    if (this.cachedConfig !== null) {
      return this.cachedConfig;
    }
    try {
      if (!fs.existsSync(this.configPath)) {
        this.cachedConfig = { ...DEFAULT_HIVE_CONFIG };
        return this.cachedConfig;
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const stored = JSON.parse(raw) as Partial<HiveConfig>;

      // Deep merge with defaults
      const merged: HiveConfig = {
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
      this.cachedConfig = merged;
      return this.cachedConfig;
    } catch {
      this.cachedConfig = { ...DEFAULT_HIVE_CONFIG };
      return this.cachedConfig;
    }
  }

  /**
   * Update config (partial merge).
   */
  set(updates: Partial<HiveConfig>): HiveConfig {
    this.cachedConfig = null; // invalidate cache on write
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
    this.cachedConfig = merged;
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

  /**
   * Get sandbox configuration for worker isolation.
   * Returns { mode: 'none' | 'docker', image?: string, persistent?: boolean }
   */
  getSandboxConfig(): SandboxConfig {
    const config = this.get();
    const mode = config.sandbox ?? 'none';
    const image = config.dockerImage;
    const persistent = config.persistentContainers ?? (mode === 'docker');

    return { mode, ...(image && { image }), persistent };
  }

  /**
   * Get hook execution cadence for a specific hook.
   * Returns the configured cadence or 1 (every turn) if not set.
   * Validates cadence values and defaults to 1 for invalid values.
   * 
   * @param hookName - The OpenCode hook name (e.g., 'experimental.chat.system.transform')
   * @param options - Optional configuration
   * @param options.safetyCritical - If true, enforces cadence=1 regardless of config
   * @returns Validated cadence value (always >= 1)
   */
  getHookCadence(hookName: string, options?: { safetyCritical?: boolean }): number {
    const config = this.get();
    const configuredCadence = config.hook_cadence?.[hookName];

    // Safety-critical hooks must always fire (cadence=1)
    if (options?.safetyCritical && configuredCadence && configuredCadence > 1) {
      console.warn(
        `[hive:cadence] Ignoring cadence > 1 for safety-critical hook: ${hookName}`
      );
      return 1;
    }

    // Validate and clamp cadence
    if (configuredCadence === undefined || configuredCadence === null) {
      return 1;
    }
    if (configuredCadence <= 0 || !Number.isInteger(configuredCadence)) {
      console.warn(
        `[hive:cadence] Invalid cadence ${configuredCadence} for ${hookName}, using 1`
      );
      return 1;
    }

    return configuredCadence;
  }

}
