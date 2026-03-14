import * as fs from 'fs';
import * as path from 'path';
import {
  BUILT_IN_AGENT_NAMES,
  CUSTOM_AGENT_BASES,
  CUSTOM_AGENT_RESERVED_NAMES,
  DEFAULT_HIVE_CONFIG,
} from '../types.js';
import type {
  AgentModelConfig,
  BuiltInAgentName,
  CustomAgentBase,
  HiveConfig,
  ResolvedCustomAgentConfig,
} from '../types.js';
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
  private projectConfigPath?: string;
  private cachedConfig: HiveConfig | null = null;
  private cachedCustomAgentConfigs: Record<string, ResolvedCustomAgentConfig> | null = null;
  private activeReadSourceType: 'project' | 'global' = 'global';
  private activeReadPath: string;
  private lastFallbackWarning: {
    message: string;
    sourceType: 'project';
    sourcePath: string;
    fallbackType: 'global';
    fallbackPath: string;
    reason: 'parse_error' | 'validation_error' | 'read_error';
  } | null = null;

  constructor(projectRoot?: string) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const configDir = path.join(homeDir, '.config', 'opencode');
    this.configPath = path.join(configDir, 'agent_hive.json');
    this.activeReadPath = this.configPath;
    if (projectRoot) {
      this.projectConfigPath = path.join(projectRoot, '.opencode', 'agent_hive.json');
    }
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

    if (this.projectConfigPath && fs.existsSync(this.projectConfigPath)) {
      const projectStored = this.readStoredConfig(this.projectConfigPath);
      if (projectStored.ok) {
        this.activeReadSourceType = 'project';
        this.activeReadPath = this.projectConfigPath;
        this.lastFallbackWarning = null;
        this.cachedConfig = this.mergeWithDefaults(projectStored.value);
        return this.cachedConfig;
      }

      const fallbackReason = 'reason' in projectStored ? projectStored.reason : 'read_error';
      this.lastFallbackWarning = {
        message: `Failed to read project config at ${this.projectConfigPath}; using global config at ${this.configPath}`,
        sourceType: 'project',
        sourcePath: this.projectConfigPath,
        fallbackType: 'global',
        fallbackPath: this.configPath,
        reason: fallbackReason,
      };
    } else {
      this.lastFallbackWarning = null;
    }

    try {
      if (!fs.existsSync(this.configPath)) {
        this.activeReadSourceType = 'global';
        this.activeReadPath = this.configPath;
        this.cachedConfig = { ...DEFAULT_HIVE_CONFIG };
        this.cachedCustomAgentConfigs = null;
        return this.cachedConfig;
      }
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const stored = JSON.parse(raw) as Partial<HiveConfig>;
      const storedCustomAgents = this.isObjectRecord(stored.customAgents)
        ? stored.customAgents
        : {};

      const mergedBuiltInAgents = BUILT_IN_AGENT_NAMES.reduce<NonNullable<HiveConfig['agents']>>(
        (acc, agentName) => {
          acc[agentName] = {
            ...DEFAULT_HIVE_CONFIG.agents?.[agentName],
            ...stored.agents?.[agentName],
          };
          return acc;
        },
        {},
      );
      this.activeReadSourceType = 'global';
      this.activeReadPath = this.configPath;
      const merged = this.mergeWithDefaults(stored);
      this.cachedConfig = merged;
      this.cachedCustomAgentConfigs = null;
      return this.cachedConfig;
    } catch {
      this.activeReadSourceType = 'global';
      this.activeReadPath = this.configPath;
      this.cachedConfig = { ...DEFAULT_HIVE_CONFIG };
      this.cachedCustomAgentConfigs = null;
      return this.cachedConfig;
    }
  }

  getActiveReadSourceType(): 'project' | 'global' {
    return this.activeReadSourceType;
  }

  getActiveReadPath(): string {
    return this.activeReadPath;
  }

  getLastFallbackWarning(): {
    message: string;
    sourceType: 'project';
    sourcePath: string;
    fallbackType: 'global';
    fallbackPath: string;
    reason: 'parse_error' | 'validation_error' | 'read_error';
  } | null {
    return this.lastFallbackWarning;
  }

  /**
   * Update config (partial merge).
   */
  set(updates: Partial<HiveConfig>): HiveConfig {
    this.cachedConfig = null; // invalidate cache on write
    this.cachedCustomAgentConfigs = null;
    const current = this.get();
    
    const merged: HiveConfig = {
      ...current,
      ...updates,
      agents: updates.agents ? {
        ...current.agents,
        ...updates.agents,
      } : current.agents,
      customAgents: updates.customAgents
        ? {
            ...current.customAgents,
            ...updates.customAgents,
          }
        : current.customAgents,
    };

    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(this.configPath, JSON.stringify(merged, null, 2));
    this.cachedConfig = merged;
    this.cachedCustomAgentConfigs = null;
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
  getAgentConfig(agent: string): AgentModelConfig | ResolvedCustomAgentConfig {
    const config = this.get();

    if (this.isBuiltInAgent(agent)) {
      const agentConfig = config.agents?.[agent] ?? {};
      const defaultAutoLoadSkills = DEFAULT_HIVE_CONFIG.agents?.[agent]?.autoLoadSkills ?? [];
      const effectiveAutoLoadSkills = this.resolveAutoLoadSkills(
        defaultAutoLoadSkills,
        agentConfig.autoLoadSkills ?? [],
        this.isPlannerAgent(agent),
      );

      return {
        ...agentConfig,
        autoLoadSkills: effectiveAutoLoadSkills,
      };
    }

    const customAgents = this.getCustomAgentConfigs();
    return customAgents[agent] ?? {};
  }

  getCustomAgentConfigs(): Record<string, ResolvedCustomAgentConfig> {
    if (this.cachedCustomAgentConfigs !== null) {
      return this.cachedCustomAgentConfigs;
    }

    const config = this.get();
    const customAgents = this.isObjectRecord(config.customAgents)
      ? config.customAgents
      : {};
    const resolved: Record<string, ResolvedCustomAgentConfig> = {};

    for (const [agentName, declaration] of Object.entries(customAgents)) {
      if (this.isReservedCustomAgentName(agentName)) {
        console.warn(`[hive:config] Skipping custom agent \"${agentName}\": reserved name`);
        continue;
      }

      if (!this.isObjectRecord(declaration)) {
        console.warn(
          `[hive:config] Skipping custom agent \"${agentName}\": invalid declaration (expected object)`,
        );
        continue;
      }

      const baseAgent = declaration['baseAgent'];

      if (typeof baseAgent !== 'string' || !this.isSupportedCustomAgentBase(baseAgent)) {
        console.warn(
          `[hive:config] Skipping custom agent \"${agentName}\": unsupported baseAgent \"${String(baseAgent)}\"`,
        );
        continue;
      }

      const autoLoadSkillsValue = declaration['autoLoadSkills'];
      const additionalAutoLoadSkills = Array.isArray(autoLoadSkillsValue)
        ? autoLoadSkillsValue.filter((skill): skill is string => typeof skill === 'string')
        : [];
      const baseAgentConfig = this.getAgentConfig(baseAgent) as AgentModelConfig;
      const effectiveAutoLoadSkills = this.resolveAutoLoadSkills(
        baseAgentConfig.autoLoadSkills ?? [],
        additionalAutoLoadSkills,
        this.isPlannerAgent(baseAgent),
      );

      const descriptionValue = declaration['description'];
      const description = typeof descriptionValue === 'string'
        ? descriptionValue.trim()
        : '';
      if (!description) {
        console.warn(
          `[hive:config] Skipping custom agent "${agentName}": description must be a non-empty string`,
        );
        continue;
      }

      const modelValue = declaration['model'];
      const temperatureValue = declaration['temperature'];
      const variantValue = declaration['variant'];
      const model = typeof modelValue === 'string'
        ? modelValue.trim() || baseAgentConfig.model
        : baseAgentConfig.model;
      const variant = typeof variantValue === 'string'
        ? variantValue.trim() || baseAgentConfig.variant
        : baseAgentConfig.variant;

      resolved[agentName] = {
        baseAgent,
        description,
        model,
        temperature: typeof temperatureValue === 'number'
          ? temperatureValue
          : baseAgentConfig.temperature,
        variant,
        autoLoadSkills: effectiveAutoLoadSkills,
      };
    }

    this.cachedCustomAgentConfigs = resolved;
    return this.cachedCustomAgentConfigs;
  }

  hasConfiguredAgent(agent: string): boolean {
    if (this.isBuiltInAgent(agent)) {
      return true;
    }

    const customAgents = this.getCustomAgentConfigs();
    return customAgents[agent] !== undefined;
  }

  private isBuiltInAgent(agent: string): agent is BuiltInAgentName {
    return (BUILT_IN_AGENT_NAMES as readonly string[]).includes(agent);
  }

  private isReservedCustomAgentName(agent: string): boolean {
    return (CUSTOM_AGENT_RESERVED_NAMES as readonly string[]).includes(agent);
  }

  private isSupportedCustomAgentBase(baseAgent: string): baseAgent is CustomAgentBase {
    return (CUSTOM_AGENT_BASES as readonly string[]).includes(baseAgent);
  }

  private isPlannerAgent(agent: BuiltInAgentName | CustomAgentBase): boolean {
    return agent === 'hive-master' || agent === 'architect-planner';
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private resolveAutoLoadSkills(
    baseAutoLoadSkills: string[],
    additionalAutoLoadSkills: string[],
    isPlannerAgent: boolean,
  ): string[] {
    const effectiveAdditionalSkills = isPlannerAgent
      ? additionalAutoLoadSkills
      : additionalAutoLoadSkills.filter((skill) => skill !== 'onboarding');
    const combinedAutoLoadSkills = [...baseAutoLoadSkills, ...effectiveAdditionalSkills];
    const uniqueAutoLoadSkills = Array.from(new Set(combinedAutoLoadSkills));
    const disabledSkills = this.getDisabledSkills();
    return uniqueAutoLoadSkills.filter((skill) => !disabledSkills.includes(skill));
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

  private readStoredConfig(configPath: string):
    | { ok: true; value: Partial<HiveConfig> }
    | { ok: false; reason: 'parse_error' | 'validation_error' | 'read_error' } {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, reason: 'validation_error' };
      }
      return { ok: true, value: parsed as Partial<HiveConfig> };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { ok: false, reason: 'parse_error' };
      }
      return { ok: false, reason: 'read_error' };
    }
  }

  private mergeWithDefaults(stored: Partial<HiveConfig>): HiveConfig {
    const storedCustomAgents = this.isObjectRecord(stored.customAgents)
      ? stored.customAgents
      : {};

    const mergedBuiltInAgents = BUILT_IN_AGENT_NAMES.reduce<NonNullable<HiveConfig['agents']>>(
      (acc, agentName) => {
        acc[agentName] = {
          ...DEFAULT_HIVE_CONFIG.agents?.[agentName],
          ...stored.agents?.[agentName],
        };
        return acc;
      },
      {},
    );

    return {
      ...DEFAULT_HIVE_CONFIG,
      ...stored,
      agents: {
        ...DEFAULT_HIVE_CONFIG.agents,
        ...stored.agents,
        ...mergedBuiltInAgents,
      },
      customAgents: {
        ...DEFAULT_HIVE_CONFIG.customAgents,
        ...storedCustomAgents,
      },
    };
  }

}
