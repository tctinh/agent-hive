import * as fs from 'fs';
import * as path from 'path';
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
        },
        omoSlim: {
          ...DEFAULT_HIVE_CONFIG.omoSlim,
          ...stored.omoSlim,
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
      omoSlim: updates.omoSlim ? {
        ...current.omoSlim,
        ...updates.omoSlim,
      } : current.omoSlim,
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
   * Check if OMO-Slim delegation is enabled.
   */
  isOmoSlimEnabled(): boolean {
    return this.get().omoSlim?.enabled ?? false;
  }

  /**
   * Enable or disable OMO-Slim delegation.
   */
  setOmoSlim(enabled: boolean): HiveConfig {
    return this.set({ omoSlim: { enabled } });
  }
}
